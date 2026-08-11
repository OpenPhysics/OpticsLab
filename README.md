# OpticsLab

[![CI](https://github.com/OpenPhysics/OpticsLab/actions/workflows/ci.yml/badge.svg)](https://github.com/OpenPhysics/OpticsLab/actions/workflows/ci.yml)

A web-based geometric optics simulation built with [SceneryStack](https://scenerystack.org/). Build scenes
with light sources, mirrors, lenses, beam splitters, and refracting interfaces.

## Features

Four screens (see `src/main.ts`):

- **Intro** — guided entry to the optical bench and component carousel
- **Lab** — open-ended scene building with the full standard component set
- **Presets** — load curated preset scenes from a combo box, then explore and edit
- **Diffraction** — transmission and reflection gratings plus a focused subset of supporting optics

Optical elements and tools (Intro / Lab / Presets unless noted):

- Ray, parallel-beam, divergent-beam, and point light sources
- Reflection at linear and curved mirrors; refraction at curved interfaces
- Ideal lenses and mirrors, spherical lenses, and beam splitters
- **Detectors** with live and acquired intensity charts and an Acquire control
- **Gratings** (transmission and reflection) on the Diffraction screen
- Tools panel: grid, ray density, measuring tape, protractor, extended rays, and related view options
- **Undo / redo** for add and remove element actions (keyboard shortcuts; see a11y strings)

- English and French UI, projector color profile, and PWA support
- Vitest unit tests for core optics model logic

## Quick Start

```bash
npm install
npm run icons    # generate PNG icons from public/icons/icon.svg
npm start        # dev server → http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm test` | Run Vitest unit tests |
| `npm run generate-svg-icon` | Generate `public/icons/icon.svg` from optics script |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run clean` | Remove `dist/` |

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^7 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.5 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^1 | PWA + service worker |

## License

GNU Affero General Public License v3.0 — see [OpenPhysics org license](https://github.com/OpenPhysics/.github/blob/main/LICENSE).

## Contributing

See [OpenPhysics contributing guidelines](https://github.com/OpenPhysics/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
