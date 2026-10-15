import json
from pathlib import Path

import numpy as np

from .schemas import Environment, Point, Waypoint

CONFIG_DIR = Path(__file__).resolve().parents[2] / "configs" / "environments"


def load_environments() -> dict[str, Environment]:
    return {
        data.id: data
        for path in sorted(CONFIG_DIR.glob("*.json"))
        if (data := Environment.model_validate(json.loads(path.read_text(encoding="utf-8"))))
    }


def intersects(a: Point, b: Point, c: Point, d: Point) -> bool:
    """Closed segment intersection, including collinear overlap; gaps are absent segments."""

    def cross(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

    def on_segment(p, q, r):
        return all(min(p[i], r[i]) - 1e-9 <= q[i] <= max(p[i], r[i]) + 1e-9 for i in (0, 1))

    v = [cross(a, b, c), cross(a, b, d), cross(c, d, a), cross(c, d, b)]
    if v[0] * v[1] < -1e-12 and v[2] * v[3] < -1e-12:
        return True
    return any(
        abs(o) < 1e-9 and on_segment(p, q, r)
        for o, p, q, r in [(v[0], a, c, b), (v[1], a, d, b), (v[2], c, a, d), (v[3], c, b, d)]
    )


def route_position(route: list[Waypoint], timestamp: float, speed: float) -> Point:
    segments = []
    for i, waypoint in enumerate(route):
        next_point = np.asarray(route[(i + 1) % len(route)].position)
        point = np.asarray(waypoint.position)
        duration = float(np.linalg.norm(next_point - point) / speed)
        segments.append((point, next_point, waypoint.dwell, duration))
    period = sum(dwell + duration for _, _, dwell, duration in segments)
    if period <= 0:
        return route[0].position
    remaining = timestamp % period
    for point, next_point, dwell, duration in segments:
        if remaining <= dwell:
            return tuple(point)
        remaining -= dwell
        if remaining <= duration and duration > 0:
            return tuple(point + (next_point - point) * remaining / duration)
        remaining -= duration
    return route[0].position
