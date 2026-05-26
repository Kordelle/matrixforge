"""Canonical synthetic seed data — loaded in-memory at runtime.

Mirrors app/data/syntheticCatalog.ts exactly. Both files must stay in sync.
Zero proprietary internal data — 100% synthetic for development and demos.
"""

from typing import TypedDict


class Factory(TypedDict):
    id: str
    name: str
    lat: float
    lng: float
    specialty: str
    capacity: int  # 0-100 current utilization percentage


class CatalogItem(TypedDict):
    sku: str
    name: str
    origin: str  # factory id
    cost: float  # USD per unit
    carbon_score: int  # 0-100, lower is greener


class ClientCity(TypedDict):
    name: str
    lat: float
    lng: float


# ---------------------------------------------------------------------------
# Nodes Matrix
# ---------------------------------------------------------------------------
FACTORIES: list[Factory] = [
    {
        "id": "FAC_A",
        "name": "Holland, MI",
        "lat": 42.7875,
        "lng": -86.1089,
        "specialty": "Wood & Assembly",
        "capacity": 85,
    },
    {
        "id": "FAC_B",
        "name": "Bruce, MS",
        "lat": 33.9937,
        "lng": -89.3495,
        "specialty": "Steel & Seating",
        "capacity": 90,
    },
    {
        "id": "FAC_C",
        "name": "Shanghai, CN",
        "lat": 31.2304,
        "lng": 121.4737,
        "specialty": "Component Forging",
        "capacity": 40,
    },
]

# ---------------------------------------------------------------------------
# Structural BOM Matrix
# ---------------------------------------------------------------------------
CATALOG_ITEMS: list[CatalogItem] = [
    {
        "sku": "COMP-FRAME-ST",
        "name": "Compose Panel Frame (Steel)",
        "origin": "FAC_B",
        "cost": 120,
        "carbon_score": 45,
    },
    {
        "sku": "COMP-FRAME-WD",
        "name": "Compose Panel Frame (Wood)",
        "origin": "FAC_A",
        "cost": 150,
        "carbon_score": 12,
    },
    {
        "sku": "COMP-SURF-LN",
        "name": "Laminate Worksurface",
        "origin": "FAC_A",
        "cost": 80,
        "carbon_score": 18,
    },
    {
        "sku": "COMP-TEXT-DK",
        "name": "Digital Knit Textile",
        "origin": "FAC_A",
        "cost": 65,
        "carbon_score": 5,
    },
]

# ---------------------------------------------------------------------------
# Target Cities Directory (for Haversine routing)
# ---------------------------------------------------------------------------
CLIENT_CITIES: list[ClientCity] = [
    {"name": "Chicago, IL", "lat": 41.8781, "lng": -87.6298},
    {"name": "New York, NY", "lat": 40.7128, "lng": -74.0060},
    {"name": "London, UK", "lat": 51.5074, "lng": -0.1278},
]

# Lookup index for fast factory resolution by id
FACTORY_INDEX: dict[str, Factory] = {f["id"]: f for f in FACTORIES}
