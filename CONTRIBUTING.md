# Contributing to LOCUS-X

Use a short feature branch, such as `feature/range-log-import`, when this folder is placed under Git. The initial workspace was empty and had no Git repository; no commits or remote changes were made during the build.

Keep estimator inputs limited to measured ranges, timestamps and known anchor positions. Never use simulator ground truth, true ranges or injected fault labels as features. Tests must exercise that boundary. Evaluate both methods on the same observation stream and report failures as well as improvements.

Before review, run the Python tests, Ruff check/format check, frontend typecheck/lint/tests/build, and the relevant reproducible benchmark command in README.md. Keep benchmark configurations with any claimed result. Report numerical dependency versions and keep wall-clock runtime out of reproducibility assertions.

Use typed contracts, small modules, stable metre coordinates, and explicit unavailable states. Add tests for meaningful changes to estimation, tracking, session revision/reset behavior or the API. Avoid cosmetic tests that mirror component markup.

Do not commit `.venv`, `node_modules`, local secrets, generated build output or bulk experiment artifacts. Runtime does not need credentials or environment variables. Use the checked-in npm lockfile for dependency installation.
