# CLAUDE.md — OpticsLab

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

Geometric optics simulation: ray tracing through lenses, mirrors, beam splitters, gratings, and detectors. Users build scenes from a component carousel and edit element parameters. Four screens share the ray-tracing stack under `src/common/`:

- **Intro** — guided subset of components
- **Lab** — full toolbox
- **Presets** — curated demonstration scenes
- **Diffraction** — gratings-focused carousel

**Upstream reference:** `../Baseline/OpticsLab/ray-optics` (OpenPhysics/Baseline); not part of the shipped sim.

Physics for educators: `doc/model.md`. Architecture: `doc/implementation-notes.md`.

## Key files

| Area | Location |
|---|---|
| Shared screen | `src/common/RayTracingCommonScreen.ts` |
| Scene model | `src/common/model/RayTracingCommonModel.ts`, `optics/OpticsScene.ts`, `RayTracer.ts` |
| Elements | `src/common/model/{glass,mirrors,light-sources,blockers,gratings,detectors}/` |
| Views | `src/common/view/RayTracingCommonView.ts`, `OpticalElementViewFactory.ts`, `RayPropagationView.ts`, `OpticsLabScreenSummaryContent.ts` |
| Screens | `src/intro/`, `src/lab/`, `src/presets/`, `src/diffraction/` |
| Presets | `src/presets/PresetScenes.ts`, `PresetsScreenView.ts` |
| Serialization | `src/common/model/optics/elementSerialization.ts`, `CommandHistory.ts` |
| Colors / constants | `OpticsLabColors.ts`, `OpticsLabConstants.ts`, `src/i18n/StringManager.ts` |

## Model

`RayTracingCommonModel` owns an `OpticsScene` containing all optical elements. Light is **geometric rays** (straight segments between interactions) — no propagating wave phase except at **gratings**.

| Concept | Meaning |
|---|---|
| `OpticsScene` | container for lenses, mirrors, prisms, splitters, blockers, gratings, detectors |
| Ray mode | `"rays"` or `"extended"` (query param) |
| `rayDensity` / `maxRayDepth` | tracing cost controls |
| Snell / mirror / thin-lens / grating rules | per-element interaction models |
| `DetectorElement.stepAcquisition(dt)` | only per-frame model work in `step(dt)` |

Ray brightness tracks s/p polarization energy; weak rays are dropped to keep the tree tractable.

## Accessibility

Follows the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).
All four screens share `RayTracingCommonView`, which registers `OpticsLabScreenSummaryContent`
via the `screenSummaryContent` super-option and orders the PDOM through a wrapper `Node`'s
`pdomOrder`. A11y strings live under the top-level `a11y` key in each locale JSON, via
`StringManager.getA11yStrings()`. Current-details is static (scene elements are a PhetioGroup);
it can be made live by deriving an element-count Property.

## Compliance carve-outs

- **Hardcoded colors:** wavelength-derived `rgba(...)` / canvas strokes in ray/SVG exporters and light-source views — physically tinted optics rendering, not UI theme tokens.

## Testing

Fleet-standard Vitest layout:

| Path | Purpose |
|---|---|
| `vitest.config.ts` | `happy-dom` environment, `setupFiles`, `execArgv: ["--expose-gc"]` |
| `tests/setup.ts` | Canvas 2D mock + `init({ name: "…" })` before SceneryStack imports |
| `tests/**/*.test.ts` | Model/physics unit tests |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression — expanded for dynamic element add/remove |

Actual specs:

- `tests/duplicate-element.test.ts`
- `tests/memory-leak.test.ts`

Run `npm test`. CI runs the suite when a `test` script is present.

## Commands

```bash
npm run lint && npm run check && npm run build
npm test
npm run generate-svg-icon   # regenerate icon SVG before icons
```

## Development notes

- Model classes must not import from view. Boolean properties use verb prefixes (`is`, `has`, `show`).
- **ES2024 target** — `tsconfig.json` and Vite `build.target` use ES2024 (Vite 8+). If build fails on unknown target, run `npm ci`.
