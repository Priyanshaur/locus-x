# LOCUS-X

**Reliable Indoor Positioning for Real-World Environments**

LOCUS-X is a simulation-driven indoor localization project developed by Team Epoch_12 for CODE APEX 3.0, Track 4 — Technology for Social Cause, Problem Statement 2.

The project explores how a moving target's 2D position can be estimated using a sparse set of fixed anchors when range measurements are noisy, signals are obstructed, and readings are missing or unavailable.

### What we're building

- **Sparse-anchor localization:** Estimate target coordinates from a limited number of reference anchors.
- **NLOS-aware estimation:** Reduce the impact of measurements biased by signal obstruction.
- **Noise and dropout resilience:** Evaluate positioning when readings are corrupted or unavailable.
- **Motion-aware tracking:** Use temporal information to stabilize estimates where appropriate.
- **Uncertainty-aware output:** Communicate the reliability and limitations of each position estimate.
- **Interactive 3D digital twin:** Let users inspect trajectories, disable anchors, introduce obstructions, and compare the proposed estimator against a conventional baseline.
- **Reproducible evaluation:** Measure localization error across controlled scenarios, held-out paths, anchor configurations, and fault conditions.

### Engineering approach

The initial implementation uses synthetic range measurements and a conventional localization baseline. Robust estimation, temporal filtering, uncertainty evaluation, and the interactive visualization will be developed and validated incrementally.

Our objective is to demonstrate measurable improvements under imperfect measurement conditions, rather than rely on visual demonstrations or unverified performance claims.

**Current status:** In development. Performance claims will be published only after reproducible evaluation.

### Team

Team Epoch_12 — CODE APEX 3.0

- Satyam Shrivastav — Team Lead
- Siddesh Shirote — Team Member
- Chiranjilal Kumawat — Team Member
- Priyansh Gaur — Team Member

### Technology direction

Python, NumPy, SciPy, FastAPI, React, TypeScript, Three.js, and pytest. Final dependencies will reflect the components actually implemented.
