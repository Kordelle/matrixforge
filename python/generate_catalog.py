#!/usr/bin/env python3
"""Generate a synthetic Haworth-inspired catalog of ~30,000 enterprise SKUs.

Writes: python/data/catalog_seed.ndjson  (one JSON object per line)

Run from the python/ directory:
    python generate_catalog.py

Each SKU conforms to the CatalogItem TypedDict defined in python/data.py.
The "description" field is a rich natural-language string that gets embedded
by ChromaDB for semantic similarity search.
"""

import json
import os
import sys

OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "catalog_seed.ndjson")

# ---------------------------------------------------------------------------
# Factory metadata (mirrors python/data.py FACTORIES)
# ---------------------------------------------------------------------------
FACTORIES: dict[str, dict] = {
    "FAC_A": {"name": "Holland, MI",   "country": "United States", "spec": "Wood & Assembly"},
    "FAC_B": {"name": "Bruce, MS",     "country": "United States", "spec": "Steel & Seating"},
    "FAC_C": {"name": "Shanghai, CN",  "country": "China",         "spec": "Component Forging"},
    "FAC_D": {"name": "Monterrey, MX", "country": "Mexico",        "spec": "Metal Fabrication"},
    "FAC_E": {"name": "Warsaw, PL",    "country": "Poland",        "spec": "Precision Assembly"},
}

FACTORY_COST_MULT:   dict[str, float] = {"FAC_A": 1.00, "FAC_B": 0.88, "FAC_C": 0.65, "FAC_D": 0.78, "FAC_E": 1.08}
FACTORY_CARBON_MULT: dict[str, float] = {"FAC_A": 0.90, "FAC_B": 1.20, "FAC_C": 1.55, "FAC_D": 1.10, "FAC_E": 0.85}

FACTORY_CERTS: dict[str, list[str]] = {
    "FAC_A": ["BIFMA", "GREENGUARD Gold", "FSC", "Cradle to Cradle"],
    "FAC_B": ["BIFMA", "GREENGUARD Gold", "SCS Recycled Content"],
    "FAC_C": ["BIFMA", "ISO 9001"],
    "FAC_D": ["BIFMA", "GREENGUARD", "ISO 9001"],
    "FAC_E": ["BIFMA", "GREENGUARD Gold", "ISO 14001", "EU Ecolabel", "Cradle to Cradle"],
}

HTS_CODES: dict[str, str] = {
    "FAC_A": "9403.30.8000",  # Wood furniture, US
    "FAC_B": "9403.20.0010",  # Metal office furniture, US
    "FAC_C": "9403.20.0010",  # Metal office furniture, CN
    "FAC_D": "9403.20.0010",  # Metal office furniture, MX
    "FAC_E": "9403.30.8000",  # Precision assembly, PL
}

# ---------------------------------------------------------------------------
# Shared variation pools
# ---------------------------------------------------------------------------
PANEL_SIZES   = [(h, w) for h in (36, 42, 48, 54, 60, 72) for w in (24, 30, 36, 48)]  # 24 combos
SURFACE_WxD   = [(w, d) for w in (48, 60, 66, 72, 78, 84, 96) for d in (24, 27, 30)]  # 21 combos
NEUTRAL_FIN   = ["Stone Gray", "Warm White", "Matte Black", "Slate Blue", "Warm Sand"]
WOOD_FIN      = ["Maple", "Cherry", "Walnut", "White Oak", "Ebony"]
FABRIC_GRADES = ["A", "B", "C", "D", "E", "F"]
SEATING_BACKS = ["Standard Back", "High Back", "Mid Back"]
SEATING_ARMS  = ["No Arms", "Fixed Arms", "4D Adjustable Arms", "Loop Arms"]
SEATING_HGTS  = ["Standard Height", "Tall Height", "Short Height"]
SEATING_CAST  = ["Carpet Casters", "Hard-Floor Casters", "Glides"]
STORAGE_SIZES = ["Compact", "Standard", "Wide", "XL", "XXL"]
STORAGE_LOCKS = ["No Lock", "Keyed Lock", "Combination Lock"]
LIGHT_TEMPS   = ["2700K Warm", "3000K Soft White", "3500K Neutral", "4000K Cool", "5000K Daylight"]
LIGHT_WATTS   = ["5W", "10W", "15W", "20W"]
LOUNGE_FRAMES = ["Polished Chrome", "Matte Black", "Satin Nickel", "Warm Gold", "Bronze"]
LOUNGE_CFGS   = ["Standard", "Power USB", "Table Integrated"]
ACOUSTIC_FILL = ["Acoustic Foam Core", "Recycled Fiber Fill", "Mineral Wool", "Compressed Cotton"]
SCREEN_SIZES  = [(h, w) for h in (36, 42, 48, 60) for w in (24, 36, 48, 60)]  # 16 combos

COLORWAYS = [
    "Anchor", "Ash", "Birch", "Bone", "Canvas", "Carbon", "Chestnut", "Clay", "Cloud",
    "Coal", "Cobalt", "Cream", "Denim", "Dusk", "Ecru", "Flax", "Forest", "Granite",
    "Graphite", "Hazel", "Heath", "Hemp", "Heron", "Horizon", "Iron", "Ivory", "Juniper",
    "Khaki", "Linen", "Marine", "Mink", "Mist", "Mocha", "Navy", "Oat", "Obsidian",
    "Olive", "Opal", "Oxford", "Parchment", "Pewter", "Plum", "Quartz", "Raven", "Reef",
    "Sage", "Sand", "Seaglass", "Sienna", "Silver", "Slate", "Smoke", "Stone", "Storm",
    "Taupe", "Terracotta", "Tidal", "Titanium", "Truffle", "Tundra", "Umber", "Vapor",
    "Wheat", "Willow", "Winter", "Wren", "Zinc", "Dove", "Flint", "Gale", "Harbor",
    "Lark", "Marsh", "Pebble", "Spruce", "Twig", "Vellum",
]  # 78 colorways

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _cost(base: float, fac_id: str, size_mult: float = 1.0) -> float:
    raw = base * FACTORY_COST_MULT[fac_id] * size_mult
    # Deterministic micro-variation per factory (no randomness = reproducible builds)
    delta = (hash(fac_id + str(int(base * 100))) % 21 - 10) * 0.5
    return round(max(1.0, raw + delta), 2)


def _carbon(base: int, fac_id: str) -> int:
    return max(1, min(99, int(base * FACTORY_CARBON_MULT[fac_id])))


def _size_mult(h: int, w: int, ref_h: int = 36, ref_w: int = 24) -> float:
    return (h * w) / (ref_h * ref_w)


def _certs(fac_id: str) -> list[str]:
    return FACTORY_CERTS[fac_id]


def _item(
    sku: str,
    name: str,
    desc: str,
    category: str,
    subcategory: str,
    product_family: str,
    origin: str,
    cost: float,
    carbon: int,
    weight_kg: float,
    recycle_pct: float,
    epd: bool,
    warranty: int,
    end_of_life: str,
    envs: list[str],
    finish_options: int,
    compat: list[str],
    lead_override: int | None = None,
) -> dict:
    return {
        "sku": sku,
        "name": name,
        "description": desc,
        "category": category,
        "subcategory": subcategory,
        "product_family": product_family,
        "origin": origin,
        "cost": cost,
        "carbon_score": carbon,
        "weight_kg": weight_kg,
        "certifications": _certs(origin),
        "recycled_content_pct": recycle_pct,
        "epd_certified": epd,
        "lead_time_override": lead_override,
        "warranty_years": warranty,
        "end_of_life": end_of_life,
        "hts_code": HTS_CODES[origin],
        "country_of_origin": FACTORIES[origin]["country"],
        "environments": envs,
        "finish_options": finish_options,
        "compatible_families": compat,
    }


# ---------------------------------------------------------------------------
# 1. Panel Frames  — target ~1,800
# ---------------------------------------------------------------------------
PF_MATS = [
    # (code, label, base_cost, base_carbon, kg_per_sqin, recycle_pct, sources)
    ("ST-STD", "Steel Standard",     105, 42, 0.0032, 10.0, ["FAC_B", "FAC_D", "FAC_C"]),
    ("ST-HG",  "Steel Heavy-Gauge",  130, 50, 0.0048, 10.0, ["FAC_B", "FAC_D"]),
    ("ST-RC",  "Recycled Steel",     112, 28, 0.0035, 75.0, ["FAC_B", "FAC_D", "FAC_C"]),
    ("ST-PF",  "Perforated Steel",   118, 40, 0.0028, 15.0, ["FAC_B", "FAC_D"]),
    ("WD-VN",  "Wood Veneer",        135, 11, 0.0018,  5.0, ["FAC_A"]),
    ("WD-BM",  "Bamboo Composite",   148,  7, 0.0015, 20.0, ["FAC_A"]),
    ("AL-EX",  "Aluminum Extrusion", 102, 33, 0.0022, 30.0, ["FAC_C", "FAC_E"]),
    ("GL-AC",  "Glass Accent",       162, 20, 0.0025,  5.0, ["FAC_E"]),
]

def gen_panel_frames():
    counter = 1
    for mat_code, mat_label, base_cost, base_carbon, kg_sqin, recycle, sources in PF_MATS:
        fins = WOOD_FIN if "WD" in mat_code else NEUTRAL_FIN
        for (h, w) in PANEL_SIZES:
            sm = _size_mult(h, w)
            for fin in fins:
                for src in sources:
                    sku = f"PF-{mat_code}-{h}H{w}W-{src[-1]}-{counter:05d}"
                    name = f"Panel Frame · {mat_label} {h}\"H×{w}\"W {fin}"
                    wt = round(h * w * kg_sqin, 1)
                    cert_str = ", ".join(_certs(src)[:3])
                    env_str = "corporate, open-plan office, healthcare, education"
                    desc = (
                        f"Compose series structural panel frame, {mat_label.lower()} construction, "
                        f"{h}\" height × {w}\" width. Finish: {fin}. "
                        f"Manufactured at {FACTORIES[src]['name']} ({FACTORIES[src]['spec']}). "
                        f"Certifications: {cert_str}. Suitable for {env_str} workspaces. "
                        f"Unit weight approx. {wt} kg. "
                        f"{'High recycled content. ' if recycle >= 50 else ''}"
                        f"Compatible with Compose panel tiles and worksurface systems."
                    )
                    yield _item(
                        sku=sku, name=name, desc=desc,
                        category="Panel Systems", subcategory="Panel Frames",
                        product_family="Compose", origin=src,
                        cost=_cost(base_cost, src, sm), carbon=_carbon(base_carbon, src),
                        weight_kg=wt, recycle_pct=recycle,
                        epd=src in ("FAC_A", "FAC_E"), warranty=10,
                        end_of_life="Take-back program" if src in ("FAC_A", "FAC_E") else "Recyclable",
                        envs=["corporate", "healthcare", "education", "government"],
                        finish_options=len(fins), compat=["Compose Panel Tiles", "Compose Worksurfaces"],
                    )
                    counter += 1


# ---------------------------------------------------------------------------
# 2. Panel Tiles & Inserts  — target ~2,400
# ---------------------------------------------------------------------------
PT_TYPES = [
    # (code, label, base_cost, base_carbon, sources, color_pool, recycle_pct)
    ("FB-A",  "Fabric Grade A",         55,  9, ["FAC_A", "FAC_E"],          COLORWAYS[:20], 15.0),
    ("FB-B",  "Fabric Grade B",         48,  9, ["FAC_A", "FAC_E"],          COLORWAYS[20:40], 15.0),
    ("FB-HP", "Hi-Perf Fabric",         72, 11, ["FAC_A", "FAC_E"],          COLORWAYS[40:60],  8.0),
    ("FB-EC", "Eco-Recycled Fabric",    54,  5, ["FAC_A", "FAC_E"],          COLORWAYS[60:], 80.0),
    ("TB",    "Tackboard",              38, 15, ["FAC_A", "FAC_D"],          NEUTRAL_FIN,   10.0),
    ("WB",    "Whiteboard",             88, 20, ["FAC_E", "FAC_C"],          NEUTRAL_FIN[:3], 5.0),
    ("GL",    "Glass Insert",           95, 18, ["FAC_E", "FAC_C"],          NEUTRAL_FIN[:3], 2.0),
    ("AC",    "Acoustic Backer",        48,  6, ["FAC_A", "FAC_E"],          COLORWAYS[:15], 35.0),
    ("MB",    "Markerboard",            42, 22, ["FAC_D", "FAC_C"],          NEUTRAL_FIN[:3],  5.0),
    ("PF",    "Perforated Metal Insert",58, 32, ["FAC_B", "FAC_D", "FAC_C"], NEUTRAL_FIN,    12.0),
]

def gen_panel_tiles():
    counter = 1
    for pt_code, pt_label, base_cost, base_carbon, sources, colors, recycle in PT_TYPES:
        for (h, w) in PANEL_SIZES:
            sm = _size_mult(h, w)
            for color in colors[:8]:  # cap at 8 colors per type/size combo
                for src in sources:
                    sku = f"PT-{pt_code}-{h}H{w}W-{src[-1]}-{counter:05d}"
                    name = f"Panel Tile · {pt_label} {h}\"H×{w}\"W · {color}"
                    wt = round(h * w * 0.0008, 1)
                    cert_str = ", ".join(_certs(src)[:3])
                    desc = (
                        f"Compose series panel insert tile, {pt_label.lower()}, "
                        f"{h}\" height × {w}\" width. Colorway: {color}. "
                        f"Manufactured at {FACTORIES[src]['name']}. "
                        f"Certifications: {cert_str}. "
                        f"{'High recycled content — ideal for LEED projects. ' if recycle >= 50 else ''}"
                        f"Mounts into any Compose panel frame. Suitable for corporate, "
                        f"healthcare, and education environments."
                    )
                    yield _item(
                        sku=sku, name=name, desc=desc,
                        category="Panel Systems", subcategory="Panel Tiles & Inserts",
                        product_family="Compose", origin=src,
                        cost=_cost(base_cost, src, sm), carbon=_carbon(base_carbon, src),
                        weight_kg=wt, recycle_pct=recycle,
                        epd=src in ("FAC_A", "FAC_E"), warranty=5,
                        end_of_life="Take-back program" if src in ("FAC_A", "FAC_E") else "Recyclable",
                        envs=["corporate", "healthcare", "education"],
                        finish_options=len(colors), compat=["Compose Panel Frames"],
                    )
                    counter += 1


# ---------------------------------------------------------------------------
# 3. Worksurfaces (fixed height)  — target ~2,500
# ---------------------------------------------------------------------------
WS_TYPES = [
    # (code, label, base_cost, base_carbon, sources, fin_pool, recycle_pct)
    ("LN-STD", "Laminate Standard",     80, 18, ["FAC_A", "FAC_C", "FAC_D"], NEUTRAL_FIN,  8.0),
    ("LN-PRM", "Laminate Premium",      98, 15, ["FAC_A", "FAC_E"],          NEUTRAL_FIN, 10.0),
    ("WD-VN",  "Wood Veneer",          140, 12, ["FAC_A"],                   WOOD_FIN,     5.0),
    ("WD-BM",  "Bamboo",               155,  8, ["FAC_A"],                   WOOD_FIN,    25.0),
    ("SS",     "Solid Surface",        165, 20, ["FAC_E", "FAC_C"],          NEUTRAL_FIN,  3.0),
    ("FX",     "Fenix Matte",          185, 16, ["FAC_E"],                   NEUTRAL_FIN,  2.0),
    ("HL",     "High-Gloss",           172, 22, ["FAC_E", "FAC_C"],          NEUTRAL_FIN,  2.0),
    ("LNO",    "Linoleum",             112,  9, ["FAC_A", "FAC_E"],          COLORWAYS[:6], 40.0),
]
WS_EDGE = ["Knife Edge", "Waterfall Edge", "Beveled Edge", "Bullnose Edge"]

def gen_worksurfaces():
    counter = 1
    for ws_code, ws_label, base_cost, base_carbon, sources, fins, recycle in WS_TYPES:
        for (width, depth) in SURFACE_WxD:
            sm = _size_mult(width, depth, ref_h=48, ref_w=24)
            for fin in fins[:4]:
                for edge in WS_EDGE[:3]:
                    for src in sources:
                        sku = f"WS-{ws_code}-{width}W{depth}D-{src[-1]}-{counter:05d}"
                        name = f"Worksurface · {ws_label} {width}\"W×{depth}\"D · {fin} · {edge}"
                        wt = round(width * depth * 0.0015, 1)
                        cert_str = ", ".join(_certs(src)[:3])
                        desc = (
                            f"{ws_label} worksurface, {width}\" wide × {depth}\" deep, "
                            f"{edge.lower()} profile. Finish: {fin}. "
                            f"Manufactured at {FACTORIES[src]['name']}. "
                            f"Certifications: {cert_str}. LEED-compatible. "
                            f"{'Bio-based or renewable material content. ' if recycle >= 20 else ''}"
                            f"Suitable for corporate, healthcare, laboratory, and education workstations. "
                            f"Compatible with Compose, height-adjustable, and freestanding base systems."
                        )
                        yield _item(
                            sku=sku, name=name, desc=desc,
                            category="Worksurfaces", subcategory="Fixed-Height Worksurfaces",
                            product_family="Compose", origin=src,
                            cost=_cost(base_cost, src, sm), carbon=_carbon(base_carbon, src),
                            weight_kg=wt, recycle_pct=recycle,
                            epd=src in ("FAC_A", "FAC_E"), warranty=10,
                            end_of_life="Take-back program" if src in ("FAC_A", "FAC_E") else "Recyclable",
                            envs=["corporate", "healthcare", "laboratory", "education"],
                            finish_options=len(fins), compat=["Compose Bases", "Height-Adjustable Frames"],
                        )
                        counter += 1


# ---------------------------------------------------------------------------
# 4. Height-Adjustable Worksurfaces  — target ~1,200
# ---------------------------------------------------------------------------
HAT_TYPES = [
    ("HA-LN",  "Height-Adj Laminate", 320, 22, ["FAC_A", "FAC_D"], NEUTRAL_FIN,  8.0),
    ("HA-WD",  "Height-Adj Wood",     420, 15, ["FAC_A"],          WOOD_FIN,     5.0),
    ("HA-SS",  "Height-Adj Solid Sfc",480, 24, ["FAC_E"],          NEUTRAL_FIN,  3.0),
    ("HA-BM",  "Height-Adj Bamboo",   395, 10, ["FAC_A"],          WOOD_FIN,    25.0),
]
HA_WIDTHS  = [48, 60, 72, 84]
HA_DEPTHS  = [24, 30]
HA_STROKES = ["Standard Stroke (4.0\"–50.6\")", "Wide Stroke (22.6\"–48.7\")"]

def gen_height_adjustable():
    counter = 1
    for ws_code, ws_label, base_cost, base_carbon, sources, fins, recycle in HAT_TYPES:
        for w in HA_WIDTHS:
            for d in HA_DEPTHS:
                sm = _size_mult(w, d, ref_h=48, ref_w=24)
                for fin in fins[:3]:
                    for stroke in HA_STROKES:
                        for src in sources:
                            sku = f"WS-{ws_code}-{w}W{d}D-{src[-1]}-{counter:05d}"
                            name = f"{ws_label} {w}\"W×{d}\"D · {fin} · {stroke[:12]}"
                            wt = round(w * d * 0.0020, 1)
                            cert_str = ", ".join(_certs(src)[:3])
                            desc = (
                                f"{ws_label} surface with electric height-adjustment, "
                                f"{w}\" wide × {d}\" deep. {stroke}. Finish: {fin}. "
                                f"Manufactured at {FACTORIES[src]['name']}. "
                                f"Certifications: {cert_str}. "
                                f"Supports sit-stand ergonomic transitions. "
                                f"Ideal for corporate, healthcare, and education environments. "
                                f"Memory presets. Anti-collision sensor. BIFMA LEVEL certified."
                            )
                            yield _item(
                                sku=sku, name=name, desc=desc,
                                category="Worksurfaces", subcategory="Height-Adjustable Worksurfaces",
                                product_family="Compose HA", origin=src,
                                cost=_cost(base_cost, src, sm), carbon=_carbon(base_carbon, src),
                                weight_kg=wt, recycle_pct=recycle,
                                epd=src in ("FAC_A", "FAC_E"), warranty=10,
                                end_of_life="Take-back program" if src in ("FAC_A", "FAC_E") else "Recyclable",
                                envs=["corporate", "healthcare", "education"],
                                finish_options=len(fins), compat=["Height-Adjustable Bases"],
                            )
                            counter += 1


# ---------------------------------------------------------------------------
# 5. Task Seating  — target ~3,500
# ---------------------------------------------------------------------------
TASK_MODELS = [
    # (code, label, base_cost, base_carbon, sources, mesh/fabric)
    ("FN",  "Fern Chair",          380, 55, ["FAC_B", "FAC_D"]),
    ("ZD",  "Zody II",             285, 48, ["FAC_B", "FAC_D", "FAC_C"]),
    ("VY",  "Very Chair",          195, 40, ["FAC_B", "FAC_D"]),
    ("CS",  "Compose Stool",       225, 28, ["FAC_A", "FAC_D"]),
    ("CN",  "Cinto Chair",         245, 44, ["FAC_B", "FAC_D"]),
    ("SQ",  "Silq Chair",          420, 38, ["FAC_B", "FAC_E"]),
]

def gen_task_seating():
    counter = 1
    for (mod_code, mod_label, base_cost, base_carbon, sources) in TASK_MODELS:
        for back in SEATING_BACKS:
            for arms in SEATING_ARMS:
                for hgt in SEATING_HGTS:
                    for grade in FABRIC_GRADES[:5]:
                        for src in sources:
                            sku = f"TS-{mod_code}-{back[:3].upper()}-{arms[:2].upper()}{src[-1]}-{counter:05d}"
                            name = f"{mod_label} · {back} · {arms} · Grade {grade}"
                            cert_str = ", ".join(_certs(src)[:3])
                            desc = (
                                f"{mod_label} ergonomic task chair, {back.lower()}, "
                                f"{arms.lower()}, {hgt.lower()} cylinder. "
                                f"Upholstered in Grade {grade} fabric. "
                                f"Manufactured at {FACTORIES[src]['name']} ({FACTORIES[src]['spec']}). "
                                f"Certifications: {cert_str}. BIFMA G1 ergonomics compliant. "
                                f"Suitable for corporate, healthcare, education, and government workspaces. "
                                f"Adjustable lumbar, seat depth, and tilt tension."
                            )
                            yield _item(
                                sku=sku, name=name, desc=desc,
                                category="Seating", subcategory="Task Seating",
                                product_family=mod_label.split()[0], origin=src,
                                cost=_cost(base_cost, src), carbon=_carbon(base_carbon, src),
                                weight_kg=round(14.5 + (base_cost - 200) * 0.01, 1),
                                recycle_pct=20.0,
                                epd=src in ("FAC_A", "FAC_E"), warranty=12,
                                end_of_life="Take-back program" if src in ("FAC_B", "FAC_E") else "Recyclable",
                                envs=["corporate", "healthcare", "education", "government"],
                                finish_options=len(FABRIC_GRADES) * 3, compat=["Task Accessories"],
                            )
                            counter += 1


# ---------------------------------------------------------------------------
# 6. Lounge & Meeting Seating  — target ~2,000
# ---------------------------------------------------------------------------
LOUNGE_MODELS = [
    ("CB",  "Cabana Lounge Chair",  520, 62, ["FAC_B", "FAC_D"]),
    ("CB2", "Cabana Settee",        785, 72, ["FAC_B"]),
    ("BR",  "Brabo Lounge Chair",   310, 45, ["FAC_B", "FAC_D"]),
    ("IP",  "Interpole Ottoman",    185, 22, ["FAC_A", "FAC_D"]),
    ("ST",  "Lounge Side Table",    145, 18, ["FAC_A", "FAC_E"]),
]
CONF_MODELS = [
    ("EX",  "Executive High-Back",  485, 58, ["FAC_B", "FAC_E"]),
    ("CF",  "Conference Chair",     285, 46, ["FAC_B", "FAC_D"]),
    ("GS",  "Guest Chair",          195, 38, ["FAC_B", "FAC_D"]),
    ("SD",  "Side Chair",           165, 35, ["FAC_B", "FAC_D"]),
    ("SK",  "Stack Chair",          128, 30, ["FAC_D", "FAC_C"]),
]

def gen_lounge_seating():
    counter = 1
    for (mod_code, mod_label, base_cost, base_carbon, sources) in LOUNGE_MODELS:
        for grade in FABRIC_GRADES[:5]:
            for frame in LOUNGE_FRAMES:
                for cfg in LOUNGE_CFGS:
                    for src in sources:
                        sku = f"LS-{mod_code}-G{grade}-{src[-1]}-{counter:05d}"
                        name = f"{mod_label} · Grade {grade} · {frame}"
                        cert_str = ", ".join(_certs(src)[:2])
                        desc = (
                            f"{mod_label}, {cfg.lower()} configuration. "
                            f"Grade {grade} upholstery, {frame.lower()} frame finish. "
                            f"Manufactured at {FACTORIES[src]['name']}. "
                            f"Certifications: {cert_str}. "
                            f"Designed for corporate lounge, hospitality, and collaborative spaces. "
                            f"{'Includes integrated USB-A/USB-C power. ' if cfg == 'Power USB' else ''}"
                            f"Commercial-grade foam seating. Stain-resistant fabric options."
                        )
                        yield _item(
                            sku=sku, name=name, desc=desc,
                            category="Seating", subcategory="Lounge & Casual Seating",
                            product_family="Lounge Collection", origin=src,
                            cost=_cost(base_cost, src), carbon=_carbon(base_carbon, src),
                            weight_kg=round(base_cost * 0.035, 1),
                            recycle_pct=15.0, epd=src in ("FAC_A", "FAC_E"), warranty=5,
                            end_of_life="Recyclable",
                            envs=["corporate", "hospitality", "healthcare", "retail"],
                            finish_options=len(LOUNGE_FRAMES), compat=["Lounge Accessories"],
                        )
                        counter += 1


def gen_conference_seating():
    counter = 1
    for (mod_code, mod_label, base_cost, base_carbon, sources) in CONF_MODELS:
        for back in SEATING_BACKS[:3]:
            for grade in FABRIC_GRADES[:5]:
                for frame in NEUTRAL_FIN[:4]:
                    for caster in SEATING_CAST:
                        for src in sources:
                            sku = f"MS-{mod_code}-{back[:2].upper()}-G{grade}{src[-1]}-{counter:05d}"
                            name = f"{mod_label} · {back} · Grade {grade} · {frame}"
                            cert_str = ", ".join(_certs(src)[:3])
                            desc = (
                                f"{mod_label}, {back.lower()}, Grade {grade} fabric, "
                                f"{frame.lower()} frame. {caster}. "
                                f"Manufactured at {FACTORIES[src]['name']}. "
                                f"Certifications: {cert_str}. "
                                f"For conference rooms, boardrooms, government, and corporate offices. "
                                f"ANSI/BIFMA X5.1 tested. Waterfall seat edge for leg circulation."
                            )
                            yield _item(
                                sku=sku, name=name, desc=desc,
                                category="Seating", subcategory="Meeting & Conference Seating",
                                product_family="Meeting Collection", origin=src,
                                cost=_cost(base_cost, src), carbon=_carbon(base_carbon, src),
                                weight_kg=round(base_cost * 0.028, 1),
                                recycle_pct=18.0, epd=src in ("FAC_E",), warranty=10,
                                end_of_life="Recyclable",
                                envs=["corporate", "government", "education", "healthcare"],
                                finish_options=len(NEUTRAL_FIN), compat=["Conference Tables"],
                            )
                            counter += 1


# ---------------------------------------------------------------------------
# 7. Storage  — target ~1,500
# ---------------------------------------------------------------------------
STOR_TYPES = [
    ("MP2",  "Mobile Pedestal 2-Drawer", 275, 48, ["FAC_B", "FAC_D", "FAC_C"]),
    ("MP3",  "Mobile Pedestal 3-Drawer", 315, 52, ["FAC_B", "FAC_D"]),
    ("LF2",  "Lateral File 2-Drawer",    345, 58, ["FAC_B", "FAC_D"]),
    ("LF4",  "Lateral File 4-Drawer",    495, 65, ["FAC_B", "FAC_D"]),
    ("OB",   "Overhead Storage Bin",     165, 25, ["FAC_A", "FAC_E"]),
    ("TW",   "Tower Cabinet",            395, 62, ["FAC_B", "FAC_D"]),
]

def gen_storage():
    counter = 1
    for (code, label, base_cost, base_carbon, sources) in STOR_TYPES:
        for size in STORAGE_SIZES[:4]:
            for fin in NEUTRAL_FIN:
                for lock in STORAGE_LOCKS:
                    for src in sources:
                        sku = f"ST-{code}-{size[:2].upper()}-{src[-1]}-{counter:05d}"
                        name = f"{label} · {size} · {fin} · {lock}"
                        wt = round(base_cost * 0.08, 1)
                        cert_str = ", ".join(_certs(src)[:3])
                        desc = (
                            f"{label}, {size.lower()} configuration. {lock}. Finish: {fin}. "
                            f"Manufactured at {FACTORIES[src]['name']} ({FACTORIES[src]['spec']}). "
                            f"Certifications: {cert_str}. "
                            f"BIFMA X5.9 tested for file storage weight loads. "
                            f"Full-extension drawers with soft-close dampener. "
                            f"Suitable for corporate, government, and healthcare file storage."
                        )
                        yield _item(
                            sku=sku, name=name, desc=desc,
                            category="Storage", subcategory=label,
                            product_family="Storage Collection", origin=src,
                            cost=_cost(base_cost, src), carbon=_carbon(base_carbon, src),
                            weight_kg=wt, recycle_pct=25.0,
                            epd=src in ("FAC_A", "FAC_E"), warranty=10,
                            end_of_life="Recyclable",
                            envs=["corporate", "government", "healthcare", "education"],
                            finish_options=len(NEUTRAL_FIN), compat=["Workstations", "Benching Systems"],
                        )
                        counter += 1


# ---------------------------------------------------------------------------
# 8. Textiles & Acoustics  — target ~4,700
# ---------------------------------------------------------------------------
TXTL_TYPES = [
    ("DK",  "Digital Knit",            65,  5, ["FAC_A"],          40.0),
    ("WV",  "Hi-Performance Woven",    58,  8, ["FAC_A", "FAC_E"],  12.0),
    ("EC",  "Eco-Certified Recycled",  54,  4, ["FAC_A", "FAC_E"],  85.0),
    ("AM",  "Antimicrobial Fabric",    68,  6, ["FAC_E"],            8.0),
    ("VL",  "Velour Tile",             48,  9, ["FAC_A"],            5.0),
    ("AF",  "Acoustic Foam Backer",    42,  7, ["FAC_A", "FAC_E"],  30.0),
    ("PU",  "Type-II Vinyl",           52, 15, ["FAC_C", "FAC_D"],   3.0),
    ("WL",  "Wool Blend",              78,  6, ["FAC_E"],            5.0),
    ("RC",  "Recycled PET Fabric",     56,  3, ["FAC_A", "FAC_E"],  95.0),
    ("LD",  "Leather-Look Vinyl",      88, 18, ["FAC_B", "FAC_D"],   0.0),
]
ROLL_WIDTHS = ["48\"", "54\"", "60\""]

def gen_textiles():
    counter = 1
    for (code, label, base_cost, base_carbon, sources, recycle) in TXTL_TYPES:
        for colorway in COLORWAYS:
            for roll_w in ROLL_WIDTHS:
                for src in sources:
                    sku = f"TX-{code}-{colorway[:3].upper()}-{roll_w[:2]}-{src[-1]}-{counter:05d}"
                    name = f"{label} · {colorway} · {roll_w} roll"
                    cert_str = ", ".join(_certs(src)[:3])
                    desc = (
                        f"{label} upholstery fabric in {colorway} colorway. "
                        f"Roll width: {roll_w}. "
                        f"Manufactured at {FACTORIES[src]['name']}. "
                        f"Certifications: {cert_str}. "
                        f"{'≥80% post-consumer recycled content. ' if recycle >= 80 else ''}"
                        f"{'Antimicrobial treatment — suitable for healthcare and high-touch surfaces. ' if code == 'AM' else ''}"
                        f"{'Acoustic NRC 0.85+ when applied to panel backer. ' if code == 'AF' else ''}"
                        f"Suitable for panel tiles, seating upholstery, and acoustic applications. "
                        f"Abrasion resistance: {25000 + (hash(colorway) % 75000)} double rubs."
                    )
                    yield _item(
                        sku=sku, name=name, desc=desc,
                        category="Textiles & Acoustics", subcategory=label,
                        product_family="Textiles", origin=src,
                        cost=_cost(base_cost, src), carbon=_carbon(base_carbon, src),
                        weight_kg=round(0.3 + recycle * 0.002, 2),
                        recycle_pct=recycle, epd=src in ("FAC_A", "FAC_E"), warranty=5,
                        end_of_life="Take-back program" if src in ("FAC_A", "FAC_E") else "Recyclable",
                        envs=["corporate", "healthcare", "education", "hospitality"],
                        finish_options=len(COLORWAYS), compat=["Panel Tiles", "Seating"],
                    )
                    counter += 1


# ---------------------------------------------------------------------------
# 9. Power & Technology  — target ~500
# ---------------------------------------------------------------------------
PWR_TYPES = [
    ("IM",  "Integrated Power Module",  88, 12, ["FAC_A", "FAC_E"]),
    ("PB",  "In-Surface Power Beam",   145, 16, ["FAC_A", "FAC_E"]),
    ("US",  "Dual-USB Power Strip",     52, 25, ["FAC_C", "FAC_D"]),
    ("MA",  "Monitor Arm Single",      125, 20, ["FAC_E", "FAC_C"]),
    ("MAD", "Monitor Arm Dual",        185, 22, ["FAC_E", "FAC_C"]),
    ("CM",  "Cable Management Tray",    38,  9, ["FAC_A", "FAC_D"]),
]
PWR_OUTLET_CFGS  = ["2AC+2USB-C", "4AC+2USB", "2AC+2USB+1HDMI", "6AC", "2AC+4USB-C+2HDMI"]
PWR_CORD_LENGTHS = ["6ft", "10ft", "15ft"]
PWR_COLORS       = ["Black", "White", "Silver"]

def gen_power():
    counter = 1
    for (code, label, base_cost, base_carbon, sources) in PWR_TYPES:
        for cfg in PWR_OUTLET_CFGS[:4]:
            for cord in PWR_CORD_LENGTHS[:2]:
                for color in PWR_COLORS[:3]:
                    for src in sources:
                        sku = f"PW-{code}-{cfg[:3].upper()}-{src[-1]}-{counter:05d}"
                        name = f"{label} · {cfg} · {cord} · {color}"
                        cert_str = ", ".join(_certs(src)[:2])
                        desc = (
                            f"{label}, {cfg} outlet configuration. Cord length: {cord}. "
                            f"Finish: {color}. Manufactured at {FACTORIES[src]['name']}. "
                            f"Certifications: {cert_str}. UL listed. "
                            f"Designed for Compose panel integration and freestanding worksurface mounting. "
                            f"Suitable for corporate, healthcare, and education technology integration."
                        )
                        yield _item(
                            sku=sku, name=name, desc=desc,
                            category="Power & Technology", subcategory=label,
                            product_family="Power Systems", origin=src,
                            cost=_cost(base_cost, src), carbon=_carbon(base_carbon, src),
                            weight_kg=round(base_cost * 0.005, 1),
                            recycle_pct=10.0, epd=False, warranty=3,
                            end_of_life="Recyclable",
                            envs=["corporate", "healthcare", "education", "government"],
                            finish_options=len(PWR_COLORS), compat=["Worksurfaces", "Panel Systems"],
                        )
                        counter += 1


# ---------------------------------------------------------------------------
# 10. Acoustic Panels & Privacy Screens  — target ~1,800
# ---------------------------------------------------------------------------
AP_TYPES = [
    ("AP-FC", "Acoustic Panel Free-Standing",     285, 12, ["FAC_A", "FAC_E"]),
    ("AP-WM", "Acoustic Wall Panel",              165,  9, ["FAC_A", "FAC_E"]),
    ("PS-DS", "Privacy Screen Desktop",           125, 18, ["FAC_A", "FAC_D"]),
    ("PS-FL", "Privacy Screen Floor-Standing",    245, 22, ["FAC_A", "FAC_D"]),
    ("CC",    "Ceiling Cloud Acoustic Baffle",    320, 14, ["FAC_A", "FAC_E"]),
]

def gen_acoustic_panels():
    counter = 1
    for (code, label, base_cost, base_carbon, sources) in AP_TYPES:
        for (h, w) in SCREEN_SIZES:
            sm = _size_mult(h, w)
            for fill in ACOUSTIC_FILL:
                for colorway in COLORWAYS[:10]:
                    for src in sources:
                        sku = f"AP-{code}-{h}H{w}W-{src[-1]}-{counter:05d}"
                        name = f"{label} · {h}\"H×{w}\"W · {colorway} · {fill[:8]}"
                        wt = round(h * w * 0.0012, 1)
                        cert_str = ", ".join(_certs(src)[:3])
                        desc = (
                            f"{label}, {h}\" height × {w}\" width. "
                            f"Core: {fill.lower()}. Fabric cover: {colorway}. "
                            f"Manufactured at {FACTORIES[src]['name']}. "
                            f"Certifications: {cert_str}. "
                            f"NRC 0.80–0.95 depending on mounting. "
                            f"Class A fire-rated. Ideal for open-plan offices, "
                            f"collaboration zones, healthcare waiting areas, and education. "
                            f"{'GREENGUARD Gold low-VOC. ' if src in ('FAC_A', 'FAC_E') else ''}"
                            f"Reduces ambient noise by 8–14 dB."
                        )
                        yield _item(
                            sku=sku, name=name, desc=desc,
                            category="Acoustics & Privacy", subcategory=label,
                            product_family="Acoustic Solutions", origin=src,
                            cost=_cost(base_cost, src, sm), carbon=_carbon(base_carbon, src),
                            weight_kg=wt, recycle_pct=60.0,
                            epd=src in ("FAC_A", "FAC_E"), warranty=10,
                            end_of_life="Take-back program" if src in ("FAC_A", "FAC_E") else "Recyclable",
                            envs=["corporate", "healthcare", "education", "hospitality"],
                            finish_options=len(COLORWAYS), compat=["Panel Systems", "Freestanding Systems"],
                        )
                        counter += 1


# ---------------------------------------------------------------------------
# 11. Lighting  — target ~600
# ---------------------------------------------------------------------------
LIGHT_TYPES = [
    ("TL",  "Task Light Arm-Mount",     125, 16, ["FAC_E", "FAC_C"]),
    ("AL",  "Ambient LED Strip",         85, 12, ["FAC_C", "FAC_D"]),
    ("SL",  "Under-Shelf Light",         62, 10, ["FAC_C", "FAC_D"]),
    ("PL",  "Overhead Panel Light",     215, 18, ["FAC_E"]),
    ("FL",  "Freestanding Floor Lamp",  295, 22, ["FAC_E", "FAC_B"]),
]
LIGHT_COLORS = ["Matte Black", "White", "Brushed Aluminum"]

def gen_lighting():
    counter = 1
    for (code, label, base_cost, base_carbon, sources) in LIGHT_TYPES:
        for temp in LIGHT_TEMPS:
            for watt in LIGHT_WATTS[:3]:
                for color in LIGHT_COLORS:
                    for src in sources:
                        sku = f"LT-{code}-{temp[:4].replace('K','k')}-{src[-1]}-{counter:05d}"
                        name = f"{label} · {temp} · {watt} · {color}"
                        cert_str = ", ".join(_certs(src)[:2])
                        desc = (
                            f"{label}, {temp} colour temperature, {watt} LED. "
                            f"Housing finish: {color}. "
                            f"Manufactured at {FACTORIES[src]['name']}. "
                            f"Certifications: {cert_str}. Energy Star rated. UL listed. "
                            f"CRI ≥ 90. Dimmer compatible. "
                            f"Suitable for corporate, healthcare, education, and hospitality. "
                            f"Designed to integrate with Compose panel systems and freestanding workstations."
                        )
                        yield _item(
                            sku=sku, name=name, desc=desc,
                            category="Lighting", subcategory=label,
                            product_family="Lighting Systems", origin=src,
                            cost=_cost(base_cost, src), carbon=_carbon(base_carbon, src),
                            weight_kg=round(base_cost * 0.006, 1),
                            recycle_pct=5.0, epd=False, warranty=5,
                            end_of_life="Recyclable",
                            envs=["corporate", "healthcare", "education", "hospitality"],
                            finish_options=len(LIGHT_COLORS), compat=["Panel Systems", "Worksurfaces"],
                        )
                        counter += 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

GENERATORS = [
    ("Panel Frames",                gen_panel_frames),
    ("Panel Tiles & Inserts",       gen_panel_tiles),
    ("Worksurfaces (Fixed)",        gen_worksurfaces),
    ("Worksurfaces (Height-Adj)",   gen_height_adjustable),
    ("Task Seating",                gen_task_seating),
    ("Lounge Seating",              gen_lounge_seating),
    ("Conference Seating",          gen_conference_seating),
    ("Storage",                     gen_storage),
    ("Textiles & Acoustics",        gen_textiles),
    ("Power & Technology",          gen_power),
    ("Acoustic Panels & Screens",   gen_acoustic_panels),
    ("Lighting",                    gen_lighting),
]


def main() -> None:
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    total = 0
    with open(OUTPUT, "w", encoding="utf-8") as fh:
        for family_name, gen_fn in GENERATORS:
            count = 0
            for item in gen_fn():
                fh.write(json.dumps(item, ensure_ascii=False) + "\n")
                count += 1
            total += count
            print(f"  {family_name:<35} {count:>6,} SKUs", flush=True)

    print(f"\n✓ Total: {total:,} SKUs written → {OUTPUT}")


if __name__ == "__main__":
    print("MatrixForge catalog generator — building enterprise SKU dataset...")
    main()
