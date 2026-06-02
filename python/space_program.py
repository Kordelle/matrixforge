"""Space program formula engine.

Converts a parsed project request (floors, sq_ft_per_floor, space_mix) into a
per-category BOM quantity map: {category_key: quantity}.

All formulas are deterministic and derived from industry-standard workspace
density constants — no AI involved, fully testable and reproducible.
"""
from __future__ import annotations

from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Density constants (sq ft per unit)
# ---------------------------------------------------------------------------

OPEN_WS_DENSITY_SQFT: float = 85.0        # modern open-plan workstation
ENCLOSED_OFFICE_DENSITY_SQFT: float = 150.0  # private office (incl. circulation)
CONF_SMALL_DENSITY_SQFT: float = 200.0    # 6-person meeting room
CONF_LARGE_DENSITY_SQFT: float = 400.0    # 12-person boardroom
LOUNGE_CLUSTER_DENSITY_SQFT: float = 150.0  # 3-seat lounge cluster

# 25 % of conference area is allocated to large rooms, 75 % to small rooms
CONF_LARGE_RATIO: float = 0.25

# ---------------------------------------------------------------------------
# BOM multipliers — units per workstation / office / room / cluster
# ---------------------------------------------------------------------------

OPEN_WS_BOM: dict[str, float] = {
    "panel_frame":  3.5,   # panels per open workstation
    "worksurface":  1.0,
    "task_chair":   1.0,
    "storage":      0.75,  # not every station gets a pedestal
    "power_module": 1.0,
}

ENCLOSED_OFFICE_BOM: dict[str, float] = {
    "worksurface":  1.0,
    "task_chair":   1.0,
    "storage":      1.0,
    "power_module": 1.0,
}

CONF_SMALL_BOM: dict[str, float] = {
    "conference_chair": 6.0,
    "power_module":     1.0,
}

CONF_LARGE_BOM: dict[str, float] = {
    "conference_chair": 12.0,
    "power_module":     2.0,
}

LOUNGE_BOM: dict[str, float] = {
    "lounge_chair": 3.0,
}

# ---------------------------------------------------------------------------
# Category metadata — display label + semantic query for ChromaDB
# ---------------------------------------------------------------------------

CATEGORY_META: dict[str, dict[str, str]] = {
    "panel_frame": {
        "label": "Panel Frames",
        "semantic_query": "compose panel frame modular wall system structural",
    },
    "worksurface": {
        "label": "Worksurfaces",
        "semantic_query": "laminate worksurface desk surface height adjustable work top",
    },
    "task_chair": {
        "label": "Task Seating",
        "semantic_query": "ergonomic task chair adjustable lumbar support office seating",
    },
    "storage": {
        "label": "Storage",
        "semantic_query": "mobile pedestal storage cabinet lateral file office",
    },
    "power_module": {
        "label": "Power & Technology",
        "semantic_query": "integrated power module USB cable management electrical",
    },
    "conference_chair": {
        "label": "Conference Seating",
        "semantic_query": "conference meeting room chair collaborative seating",
    },
    "lounge_chair": {
        "label": "Lounge Seating",
        "semantic_query": "lounge chair soft seating collaborative breakout",
    },
}

# ---------------------------------------------------------------------------
# Space program result dataclass
# ---------------------------------------------------------------------------


@dataclass
class SpaceProgramResult:
    total_sqft: int
    open_workstations: int
    enclosed_offices: int
    conf_rooms_small: int
    conf_rooms_large: int
    lounge_clusters: int
    bom_quantities: dict[str, int] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def calculate_space_program(
    floors: int,
    sq_ft_per_floor: int,
    open_office_pct: float,
    enclosed_office_pct: float,
    conference_pct: float,
    lounge_pct: float,
    scope_hint: str = "full_fitout",
) -> SpaceProgramResult:
    """Return BOM quantities derived from space-program parameters.

    Args:
        floors: Number of floors / levels in the project.
        sq_ft_per_floor: Usable square footage per floor.
        open_office_pct: Fraction of total area devoted to open-plan workstations.
        enclosed_office_pct: Fraction devoted to private enclosed offices.
        conference_pct: Fraction devoted to conference / meeting rooms.
        lounge_pct: Fraction devoted to lounge / collaboration areas.

    Returns:
        SpaceProgramResult with per-category integer quantities ready for BOM solve.
    """
    total_sqft = floors * sq_ft_per_floor

    # Area allocation
    open_sqft = total_sqft * open_office_pct
    enclosed_sqft = total_sqft * enclosed_office_pct
    conf_sqft = total_sqft * conference_pct
    lounge_sqft = total_sqft * lounge_pct

    # Unit counts (always at least 1 for occupied area, 0 if area is 0)
    open_ws = max(1, round(open_sqft / OPEN_WS_DENSITY_SQFT)) if open_sqft > 0 else 0
    enclosed = max(0, round(enclosed_sqft / ENCLOSED_OFFICE_DENSITY_SQFT))

    # Conference: split into small (6-pax) and large (12-pax) rooms
    conf_total_rooms = max(0, round(conf_sqft / CONF_SMALL_DENSITY_SQFT))
    conf_large = max(0, round(conf_total_rooms * CONF_LARGE_RATIO))
    conf_small = max(0, conf_total_rooms - conf_large)

    lounge_clusters = max(0, round(lounge_sqft / LOUNGE_CLUSTER_DENSITY_SQFT))

    # Accumulate BOM quantities
    qty: dict[str, float] = {}

    def _add(bom: dict[str, float], multiplier: float) -> None:
        for k, v in bom.items():
            qty[k] = qty.get(k, 0.0) + v * multiplier

    _add(OPEN_WS_BOM, open_ws)
    _add(ENCLOSED_OFFICE_BOM, enclosed)
    _add(CONF_SMALL_BOM, conf_small)
    _add(CONF_LARGE_BOM, conf_large)
    _add(LOUNGE_BOM, lounge_clusters)

    # Narrow scopes intentionally suppress supporting categories so the result
    # reads like an inference engine instead of a full-shell calculator.
    scope_hint = (scope_hint or "full_fitout").lower()
    if scope_hint == "furniture_only":
        allowed = {"task_chair", "conference_chair", "lounge_chair"}
        qty = {k: v for k, v in qty.items() if k in allowed}
    elif scope_hint == "office_shell":
        allowed = {"panel_frame", "worksurface", "storage", "power_module"}
        qty = {k: v for k, v in qty.items() if k in allowed}
    elif scope_hint == "collaboration_focus":
        allowed = {"task_chair", "conference_chair", "lounge_chair", "power_module"}
        qty = {k: v for k, v in qty.items() if k in allowed}

    # Convert to integers, drop zero quantities
    bom_int: dict[str, int] = {k: max(1, round(v)) for k, v in qty.items() if v > 0}

    return SpaceProgramResult(
        total_sqft=total_sqft,
        open_workstations=open_ws,
        enclosed_offices=enclosed,
        conf_rooms_small=conf_small,
        conf_rooms_large=conf_large,
        lounge_clusters=lounge_clusters,
        bom_quantities=bom_int,
    )
