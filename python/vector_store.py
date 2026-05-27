"""ChromaDB catalog store + GitHub Models embedding function.

Provides:
  - GitHubModelsEF: a duck-typed ChromaDB embedding function backed by
    GitHub Models text-embedding-3-small
  - ChromaCatalogStore: manages the ChromaDB collection, background
    indexing from the NDJSON seed file, and semantic search

Usage (from main.py):
    store = ChromaCatalogStore()
    fallback = store.load_fallback(NDJSON_PATH, limit=500)
    if store.is_empty():
        asyncio.create_task(store.index_catalog_async(NDJSON_PATH))
    results = await store.semantic_search("acoustic panel low VOC", n=200)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# ChromaDB is optional at import time — installed at runtime inside the
# compute container.  Guard the import so the module can still be loaded
# in environments without it (e.g. during unit tests).
try:
    import chromadb  # type: ignore
    from chromadb import EmbeddingFunction  # type: ignore

    _CHROMA_AVAILABLE = True
except ImportError:
    _CHROMA_AVAILABLE = False
    EmbeddingFunction = object  # type: ignore

try:
    from openai import OpenAI  # type: ignore

    _OPENAI_AVAILABLE = True
except ImportError:
    _OPENAI_AVAILABLE = False


# ---------------------------------------------------------------------------
# Metadata list-field helpers (ChromaDB only stores scalar metadata values)
# ---------------------------------------------------------------------------

_LIST_FIELDS = ("certifications", "environments", "compatible_families")


def _encode_metadata(item: dict) -> dict:
    """JSON-encode list fields so they survive ChromaDB's scalar-only constraint."""
    meta = {k: v for k, v in item.items() if k != "description"}
    for field in _LIST_FIELDS:
        if field in meta and isinstance(meta[field], list):
            meta[field] = json.dumps(meta[field])
    # ChromaDB requires str/int/float/bool — cast booleans explicitly
    meta["epd_certified"] = bool(meta.get("epd_certified", False))
    return meta


def _decode_metadata(meta: dict) -> dict:
    """Reverse the JSON-encoding applied by _encode_metadata."""
    result = dict(meta)
    for field in _LIST_FIELDS:
        if field in result and isinstance(result[field], str):
            try:
                result[field] = json.loads(result[field])
            except (json.JSONDecodeError, TypeError):
                result[field] = []
    return result


# ---------------------------------------------------------------------------
# GitHub Models Embedding Function (duck-typed for ChromaDB)
# ---------------------------------------------------------------------------

class GitHubModelsEF(EmbeddingFunction):  # type: ignore[misc]
    """Embedding function backed by GitHub Models text-embedding-3-small.

    Conforms to the ChromaDB EmbeddingFunction interface:
        __call__(input: list[str]) -> list[list[float]]
    """

    MODEL = "text-embedding-3-small"
    BATCH_SIZE = 100

    def __init__(self) -> None:
        token = os.environ.get("GITHUB_TOKEN", "")
        if not token:
            logger.warning(
                "GITHUB_TOKEN not set — GitHubModelsEF will raise if called. "
                "Semantic indexing will be skipped."
            )
        if not _OPENAI_AVAILABLE:
            raise ImportError("openai package is required for GitHubModelsEF")
        self._client = OpenAI(
            base_url="https://models.inference.ai.azure.com",
            api_key=token or "no-token",
        )

    def __call__(self, input: list[str]) -> list[list[float]]:  # noqa: A002
        """Embed a list of strings in batches of BATCH_SIZE."""
        results: list[list[float]] = []
        for i in range(0, len(input), self.BATCH_SIZE):
            batch = input[i : i + self.BATCH_SIZE]
            response = self._client.embeddings.create(
                model=self.MODEL,
                input=batch,
            )
            results.extend(item.embedding for item in response.data)
        return results


# ---------------------------------------------------------------------------
# ChromaCatalogStore
# ---------------------------------------------------------------------------

COLLECTION_NAME = "matrixforge_catalog"


class ChromaCatalogStore:
    """Manages the ChromaDB vector store for the MatrixForge SKU catalog.

    Args:
        persist_dir: Directory where ChromaDB persists its index.  Relative
            paths are resolved from the current working directory.
    """

    def __init__(self, persist_dir: str = "./data/chroma_db") -> None:
        if not _CHROMA_AVAILABLE:
            raise ImportError(
                "chromadb package is required. Install it with: pip install chromadb"
            )

        self._persist_dir = persist_dir
        self._client = chromadb.PersistentClient(path=persist_dir)
        self._ef: GitHubModelsEF | None = None

        # Attempt to initialise the embedding function.
        # If GITHUB_TOKEN is absent we log a warning and skip — the store
        # will still serve in-memory fallback mode.
        try:
            self._ef = GitHubModelsEF()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Embedding function unavailable: %s", exc)

        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=self._ef,  # type: ignore[arg-type]
            metadata={"hnsw:space": "cosine"},
        )

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def is_empty(self) -> bool:
        """True if the collection has not been indexed yet."""
        return self._collection.count() == 0

    @property
    def total_skus(self) -> int:
        """Number of SKUs currently indexed in ChromaDB."""
        return self._collection.count()

    # ------------------------------------------------------------------
    # Catalog loading helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _stream_ndjson(ndjson_path: str):
        """Lazily yield parsed dicts from an NDJSON file."""
        with open(ndjson_path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    try:
                        yield json.loads(line)
                    except json.JSONDecodeError:
                        continue

    def load_fallback(self, ndjson_path: str, limit: int = 500) -> list[dict]:
        """Load the first *limit* items from NDJSON into memory (no embeddings).

        Used as an immediate-response catalog while ChromaDB indexes in the
        background.  Returns an empty list if the file doesn't exist.
        """
        if not os.path.exists(ndjson_path):
            logger.warning("NDJSON seed not found at %s — fallback is empty.", ndjson_path)
            return []
        items: list[dict] = []
        for item in self._stream_ndjson(ndjson_path):
            items.append(item)
            if len(items) >= limit:
                break
        logger.info("Loaded %d fallback items from %s", len(items), ndjson_path)
        return items

    # ------------------------------------------------------------------
    # Indexing
    # ------------------------------------------------------------------

    def index_catalog(self, ndjson_path: str, batch_size: int = 100) -> int:
        """Index the NDJSON catalog into ChromaDB.  Blocking — run in a thread.

        Returns the number of documents upserted.
        """
        if self._ef is None:
            logger.error("Cannot index: embedding function not available.")
            return 0

        if not os.path.exists(ndjson_path):
            logger.error("NDJSON seed file not found: %s", ndjson_path)
            return 0

        ids: list[str] = []
        docs: list[str] = []
        metas: list[dict] = []
        total = 0

        def _flush() -> None:
            nonlocal total
            if not ids:
                return
            self._collection.upsert(
                ids=ids[:],
                documents=docs[:],
                metadatas=metas[:],
            )
            total += len(ids)
            ids.clear()
            docs.clear()
            metas.clear()

        for item in self._stream_ndjson(ndjson_path):
            ids.append(item["sku"])
            docs.append(item.get("description", item["name"]))
            metas.append(_encode_metadata(item))
            if len(ids) >= batch_size:
                _flush()
                logger.debug("Indexed %d SKUs so far…", total)

        _flush()  # flush remainder
        logger.info("ChromaDB indexing complete — %d SKUs indexed.", total)
        return total

    async def index_catalog_async(self, ndjson_path: str, batch_size: int = 100) -> int:
        """Run index_catalog in a thread pool so it doesn't block the event loop."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self.index_catalog, ndjson_path, batch_size
        )

    # ------------------------------------------------------------------
    # Semantic search
    # ------------------------------------------------------------------

    def semantic_search(self, query: str, n: int = 200) -> list[dict]:
        """Return up to *n* catalog items ranked by semantic similarity to *query*.

        Falls back to an empty list if the collection is not yet indexed or
        the embedding function is unavailable.
        """
        if self.is_empty:
            logger.warning("semantic_search called but collection is empty.")
            return []
        if self._ef is None:
            logger.warning("semantic_search called but embedding function unavailable.")
            return []

        try:
            results = self._collection.query(
                query_texts=[query],
                n_results=min(n, self.total_skus),
                include=["metadatas", "distances"],
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("ChromaDB query error: %s", exc)
            return []

        items: list[dict] = []
        for meta in (results.get("metadatas") or [[]])[0]:
            items.append(_decode_metadata(meta))
        return items

    # ------------------------------------------------------------------
    # Stats
    # ------------------------------------------------------------------

    def stats(self) -> dict[str, Any]:
        return {
            "totalSkus": self.total_skus,
            "persistDir": self._persist_dir,
            "embeddingModel": GitHubModelsEF.MODEL if self._ef else None,
        }
