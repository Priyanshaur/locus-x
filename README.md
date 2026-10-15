# LOCUS-X

**A synthetic laboratory for indoor localization and failure analysis.**

Built for Epoch_12 at CODE APEX 3.0. This working prototype compares conventional nonlinear least squares with robust, trust-aware range estimation and motion tracking in a procedural hospital floor. It runs locally without credentials, paid services, or an external database.

## Run locally

Tested on Windows with Python **3.13.13** and Node **24.14.0**. Use Python 3.13 and Node 22.12+ (or 24). Run commands from this directory.

First-time setup, PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
npm.cmd ci
```

Start the backend in one terminal:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.locus_x.main:app --host 127.0.0.1 --port 8000
```

Start the frontend in another terminal:

```powershell
npm.cmd run dev -- --port 5173 --strictPort
```

In the restricted Codex Windows sandbox, the default Vite configuration bundler can fail with `Cannot read directory "../..": Access is denied`. With the tested Node **24.14.0**, use the supported native configuration loader, which keeps execution inside the sandbox:

```powershell
npm.cmd run dev -- --port 5173 --strictPort --configLoader native
```

Open **http://127.0.0.1:5173**. FastAPI documentation is at **http://127.0.0.1:8000/docs**. No environment variables are required. Vite proxies `/api` to the local backend. Use `python`, not the Windows `py` launcher, if the latter cannot find your installation. `requirements.txt` pins direct dependencies; `requirements-lock.txt` records the complete tested Python environment. The npm lockfile records frontend dependencies.

On macOS/Linux use `python3 -m venv .venv`, `.venv/bin/python` in place of the Windows Python path, and `npm` in place of `npm.cmd`. That workflow is documented but has not been exercised on those operating systems.

For a single-server demo, run `npm.cmd run build`, then start/restart the backend and open **http://127.0.0.1:8000**. The backend serves `dist` when that directory exists at startup. Keep one backend worker: session storage is in memory. This is a local research tool, not a public multi-user deployment.

## Use the laboratory

1. Start the simulation. The cart follows a deterministic route with turns and dwell times.
2. Select clean LOS, moderate/high noise, wall bias, packet loss, timed outage, or combined stress.
3. Adjust noise, NLOS bias, packet loss, wall propagation, and individual anchor availability. Slider changes commit when the pointer is released or an adjustment key is released.
4. Compare the white simulated target, amber baseline, and mint LOCUS-X estimate. Dashed red signal paths correspond to actual injected obstruction bias. Room furniture is decorative; wall segments govern propagation.
5. Inspect live errors, residual consistency weights, tracking state, and the covariance ellipse. Enable **Diagnostics** for residuals, velocity, geometry, events, and scenario export.
6. **Reset restores the settings captured when the session was created**, clears tracking/history, and returns the target to t=0. For a normal browser session these are: wall-obstruction scenario, seed **12**, `asset_round` route, speed **1.2 m/s**, all **8 anchors enabled**, walls enabled, noise σ **0.15 m**, NLOS bias **2.5 m**, and **0%** packet loss. Sessions created with custom API settings restore those custom initial values. Changing route, speed, or seed restarts time with the edited settings; it does not change the saved reset values. Selecting wall obstruction or combined stress also enables wall propagation.
7. Open **Evaluation** and run a selected scenario or the full benchmark suite. These results are separate from your live session. Export metrics CSV or the full JSON experiment.

The browser requests fixed 0.2-second simulation steps in a serial HTTP loop. Simulation time is independent of wall-clock rendering time. Pausing lets an already in-flight frame finish. Reloading reconnects to the same session where possible, but the browser's plotted history starts a new window. History retains at most 600 samples. No synthetic telemetry is generated in the frontend.

## Implemented

- One configurable 30 × 20 m floor with room and door geometry, eight anchors, two routes.
- Seeded Gaussian range noise, positive wall bias, independent packet loss, manual disable, periodic anchor failures.
- Geometry-aware nonlinear least-squares baseline; Huber loss and smoothed residual consistency weights.
- Constant-velocity Kalman filter, innovation rejection, prediction-only status, growing outage uncertainty, three-second timeout and reacquisition.
- Interactive Three.js/React scene: orbit, plan view, recenter, expand, trajectories, physical signal paths, anchor states and 95% covariance ellipse.
- Pydantic API, revision-safe controls/reset, serial client updates, bounded in-memory sessions and background benchmark worker.
- Independent CLI benchmark, held-out route and seeds, error curves/CDF, CSV/JSON exports, tests and documentation.

No learned classifier is claimed or implemented. This is a robust statistical estimator with a deterministic fallback and a motion filter.

To replay an exported scenario's initial settings through the API (after saving the Diagnostics export as `scenario.json`):

```powershell
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/api/v1/sessions' -ContentType 'application/json' -Body (Get-Content -LiteralPath 'scenario.json' -Raw)
```

This creates a repeatable session at t=0. It does not replay prior manual control events.

## Verify

```powershell
.\.venv\Scripts\python.exe -m pytest --cov=backend.locus_x --cov-report=term-missing -q
.\.venv\Scripts\python.exe -m ruff check backend
.\.venv\Scripts\python.exe -m ruff format --check backend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

For the same sandbox configuration-loading error, the tested frontend test command is `npm.cmd test -- --configLoader native` (Node 24.14.0). The regular production build succeeded during the final audit without this option. See [the audit report](docs/integration-audit.md) for executed results and validation gaps.

Run the full independent evaluation:

```powershell
.\.venv\Scripts\python.exe -m backend.locus_x.benchmark --config configs/benchmarks/competition.json --output artifacts/benchmark
```

The saved configuration evaluates 7 scenarios × 4 anchor counts × 2 seeds × 160 frames = **8,960 evaluated frames**, plus initialization frames. Output: `artifacts/benchmark/metrics.csv` and `results.json` (56 method/scenario/count rows). Accuracy metrics reproduce for the same code, configuration, seed and numerical-library versions; wall-clock latency does not.

## Actual results and limitations

The completed reference run on the held-out route produced these **8-anchor RMSEs**, in metres, pooled over seeds 101 and 202:

| Scenario | Baseline | LOCUS-X |
|---|---:|---:|
| Clean LOS | <0.000001 | 0.050 |
| Moderate noise | 0.285 | 0.266 |
| High noise | 0.853 | 0.783 |
| NLOS bias | 1.540 | 1.968 |
| Packet loss | 0.216 | 0.214 |
| Anchor outage | 0.160 | 0.155 |
| Combined failures | 3.640 | 3.782 |

**The proposed method does not always win.** The filter introduces lag in perfect measurements. Broad positive bias can make a mutually consistent set of bad ranges dominate reliability weighting. Eight-anchor NLOS coverage of the nominal 95% ellipse was only **49.4%**; combined-failure coverage was **36.3%**. The ellipse is a model-based region, not calibrated confidence. Compare update/availability rates as well as error: prediction-only positions are included until the three-second timeout. Errors for unavailable positions are omitted, not set to zero.

Only a synthetic floor has been evaluated. This does not validate performance with actual UWB/BLE radios, multipath, correlated packet loss, or a real hospital. No hardware compatibility or deployment readiness is claimed.

## Architecture and next work

`configs → simulation → identical range observations → baseline / robust estimator → motion filter → evaluation → API → React/Three.js`

See [architecture](docs/architecture.md), [methodology](docs/methodology.md), [assumptions and limitations](docs/assumptions-limitations.md), [build status](docs/build-status.md), and the [final integration audit](docs/integration-audit.md).

Highest priorities: mitigate majority-positive-bias failures using inference-only evidence, validate covariance calibration on additional held-out layouts, and add a real timestamped radio-measurement adapter. A learned trust model requires an actual training pipeline and scenario-level validation before it can be added. Historical control-event replay, persistent experiment storage, and more environments remain extensions.
