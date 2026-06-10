# OpticsLab

A web-based simulation for geometric optical scenes, built with TypeScript and [SceneryStack](https://scenerystack.org/).

## Features

- Multiple light source types: rays, parallel and divergent beams, and point sources.
- Reflection at linear and curved mirrors.
- Beam splitters.
- Refraction at linear and curved interfaces.
- Ideal lenses and mirrors.
- Spherical lenses.

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
| `npm run icons` | Regenerate icons from `public/icons/icon.svg` |
| `npm run clean` | Remove `dist/` |

## Deployment

The repository includes GitHub Actions workflows:

- **`ci.yml`** — Runs on every push and pull request: Biome (format, lint, assist), TypeScript check, and production build
- **`deploy.yml`** — Builds and deploys to GitHub Pages on push to `main`

For GitHub Pages deployment, set **Settings → Pages → Source** to **GitHub Actions**. For other hosting
targets, upload the contents of `dist/` to any static file server.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^6 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.4 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^1 | PWA + service worker |

## License

MIT

## Contributing

See [OpenPhysics contributing guidelines](https://github.com/OpenPhysics/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
