# AGENTS.md

OpticsLab is a client-only geometric optics simulation built on SceneryStack (PhET-style). There is no backend, database, or external service — everything runs in the browser. See `README.md` for scripts and `CLAUDE.md` for architecture/model details.

## Cursor Cloud specific instructions

- Dependencies are installed by the startup update script (`npm ci`). Do not re-run installs unless dependencies changed.
- Node ≥ 22 is required (`engines`). The repo uses npm (`package-lock.json`); do not switch package managers.
- Run the dev server with `npm start` (Vite on `http://localhost:5173`). This is the correct way to develop/test the app in dev mode; do not use the production `npm run build` output for interactive testing. Testing the UI requires a browser navigating to that URL.
- Standard commands are documented in `README.md`: `npm run lint` (Biome), `npm run check` (tsc type-check), `npm test` (Vitest), `npm run build` (tsc + Vite prod build).
- Non-obvious: `npm test` (Vitest) is slow (~90s for the full suite, 400+ tests) because of the physics/ray-tracing model tests — this is expected, not a hang.
- Non-obvious: git hooks are enabled via the `prepare` script (`core.hooksPath .githooks`). The pre-push hook runs `npm run lint` + `npm run check`, so pushes fail if either fails. The pre-commit hook auto-formats staged files with Biome.
- Icon generation (`npm run icons`) is optional and NOT needed to run the dev server or tests; skip it unless working on PWA icons.
