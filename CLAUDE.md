# CLAUDE.md — OpticsLab

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

Geometric optics simulation: ray tracing through lenses, mirrors, beam splitters, gratings, and detectors. Users build scenes from a component carousel and edit element parameters.

**Ignore `optics-template/`** when exploring the codebase — it is reference material, not part of the shipped sim.

## Key files

| Area | Location |
|---|---|
| Scene model | `src/common/model/RayTracingCommonModel.ts`, `OpticsScene.ts`, `RayTracer.ts` |
| Elements | `src/common/model/{glass,mirrors,light-sources,blockers,gratings,detectors}/` |
| Views | `src/common/view/`, `OpticalElementViewFactory.ts`, `RayPropagationView.ts` |
| Presets | `src/presets/PresetScenes.ts`, `PresetsScreenView.ts` |
| Colors / constants | `OpticsLabColors.ts`, `OpticsLabConstants.ts` |
| Preferences | `src/preferences/OpticsLabPreferencesModel.ts` |
| Serialization | `src/common/model/optics/elementSerialization.ts`, `CommandHistory.ts` |

## Conventions (this sim)

- Model classes must not import from view
- Boolean properties use verb prefixes (`is`, `has`, `show`)
- Access modifiers required on class members
- JSDoc on public methods and classes

## Accessibility

Follows the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/OpenPhysics/blob/main/ACCESSIBILITY.md).
All four screens share `RayTracingCommonView`, which registers `OpticsLabScreenSummaryContent`
via the `screenSummaryContent` super-option and orders the PDOM through a wrapper `Node`'s
`pdomOrder`. A11y strings live under the top-level `a11y` key in each locale JSON, via
`StringManager.getA11yStrings()`. Current-details is static (scene elements are a PhetioGroup);
it can be made live by deriving an element-count Property.

## Documentation

| File | Contents |
|---|---|
| `doc/model.md` | Optics model overview |
| `doc/implementation-notes.md` | Architecture notes |
| `doc/model-features-vs-view.md` | Model vs view feature mapping |

## Sim-specific commands

```bash
npm test                  # Vitest unit tests
npm run generate-svg-icon # Regenerate icon SVG before icons
```

After changes, run `npm run lint && npm run check && npm run build`.

## Development notes

- **Pure client-side** — no backend, database, or external services
- **ES2024 target** — `tsconfig.json` and Vite `build.target` use ES2024 (Vite 8+). If build fails on unknown target, run `npm ci`
- **Tests** — Vitest with `happy-dom` and Canvas 2D mock (`tests/setup.ts`); no browser required
