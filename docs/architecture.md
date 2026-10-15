# Architecture

## Modules

| Module | Responsibility |
|---|---|
| `configs/environments/*.json` | Canonical floor, anchors, walls, room decoration and route waypoints |
| `environment.py` | Typed loading, geometry validation, segment intersection, route interpolation |
| `simulation.py` | Seeded range generation; observations and simulator-only labels returned separately |
| `schemas.py` | Strict Pydantic API contracts; extra fields and nonfinite inputs rejected |
| `estimators.py` | Validity/geometry checks, baseline, Huber robust solve and reliability diagnostics |
| `tracking.py` | Constant-velocity Kalman state, covariance, innovation gate, outage handling, ellipse |
| `evaluation.py` | Ground-truth error and covariance coverage; no feedback into estimation |
| `session.py` | Authoritative settings, time, frame, trust and filter state; reproducible reset |
| `benchmark.py` | Independent experiment loop and metrics/CSV/JSON export |
| `main.py` | FastAPI, per-session locks, revisions, bounded session/job stores |
| `src/useSession.ts` | Serial HTTP requests, same-session reconnect and actual-frame history |
| `src/Scene.tsx` | Procedural floor rendered from API configuration; coordinate mapping and overlays |
| `src/Controls.tsx` | Scenario, fault, anchor and target settings |
| `src/Diagnostics.tsx` | Frame diagnostics and independently calculated session-window statistics |
| `src/Benchmark.tsx`, `src/Charts.tsx` | Separate completed experiments and charts from real records |

## Truth boundary

The estimator's only observation type is `Measurement(anchor_id, anchor_position, timestamp, observed_range)`. Simulator-only `FaultLabel` contains true range, applied bias and intersected-wall IDs. These are separate lists; `solve()` receives the **same measurement list** for both methods. The tracker receives only a robust result and timestamp. Neither module imports simulation or evaluation. Evaluation runs afterward and cannot affect the current or next estimate.

The browser can inspect truth and fault labels because this is a synthetic experiment. Its signal rays visualize simulator geometry, not inferred radio paths. There is no claim that a real radio exposes these labels.

## Coordinates and geometry

Backend coordinates are `(x, y)` in metres, within `[0,width] × [0,height]`. Three.js coordinates are `(x, elevation, -y)` in metres: +X is east, +backend-Y is north, and Three.js +Y is vertical. `toScene`/`fromScene` implement the mapping; frontend tests round-trip every configured anchor and waypoint.

Walls are 2-D line segments with IDs and physical height. Doors are actual missing wall segments. The propagation generator intersects the horizontal ray with these segments. The display shows a cutaway wall height (0.55 m external / 0.85 m internal) for legibility; propagation geometry is unchanged. Room colors, beds, scanners and shelves are decorative and do not generate signal obstruction. The cart route crosses only configured door gaps; tests verify this.

The floor JSON is editable and validated at backend startup. Restart after editing it. Scene dimensions derive from that same response. Benchmarks currently use named anchor subsets specific to this floor; adapting them is required for another environment.

## Session and request behavior

- `GET /api/v1/health`: engine readiness.
- `GET /api/v1/environments`: floor definitions, presets, coordinate convention.
- `POST /api/v1/sessions`: environment and settings → initial computed frame.
- `GET /api/v1/sessions/{id}`: current authoritative frame.
- `POST /api/v1/sessions/{id}/advance`: `{expected_revision, dt}` → next frame.
- `PATCH /api/v1/sessions/{id}/controls`: `{expected_revision, ...changes}` → recomputed frame.
- `POST /api/v1/sessions/{id}/reset`: `{expected_revision}` → time zero with the session's creation settings restored.
- `DELETE /api/v1/sessions/{id}`: release local session.
- `POST /api/v1/benchmarks`: configuration → asynchronous job ID.
- `GET /api/v1/benchmarks/{id}`: status, progress and completed result.

Session mutations use a lock and monotonically increasing revision. A stale request returns 409. Requests with invalid parameters return 422; unknown sessions/environments return 404. The browser serializes requests, stops on error, and offers reconnect. It never runs concurrent advancement requests.

Control changes at the same timestamp restore the pre-frame filter and trust snapshot, then regenerate and solve once. This prevents an unchanged measurement being counted repeatedly. Route, speed and seed edits restart time with the edited settings to avoid target discontinuities. Reset restores a deep copy of the settings saved at session creation, preserves revision monotonicity, and resets RNG frame index, tracking, trust, event history and simulation time. A custom API session returns to its custom creation settings, not the browser defaults.

At most 64 sessions are retained, with one-hour idle expiry checked when creating sessions. Up to five recent benchmark jobs remain in memory. One benchmark worker runs at a time, and a request is bounded to 25,000 frames. Sessions and jobs do not survive a backend restart. Use one Uvicorn worker; there is no cross-process state synchronization.

## Frontend and operation

React/TypeScript + Vite, React Three Fiber/Three.js, Lucide icons, small SVG charts, locally bundled IBM Plex Sans/JetBrains Mono fonts. The 3-D module loads separately. No image services, CDN fonts, external APIs, database, websocket service, or credentials are used at runtime. Development uses the Vite same-origin proxy; a built demo can be served entirely by FastAPI.
