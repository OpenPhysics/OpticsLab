# Implementation Notes - OpticsLab

Developer-facing notes on the architecture. The physics is documented for educators in
[model.md](./model.md). Model-vs-view feature mapping: [model-features-vs-view.md](./model-features-vs-view.md).

## Architecture Overview

OpticsLab is a four-screen SceneryStack geometric-optics sim. Shared ray tracing lives under
`src/common/`; each screen wires a thin model/view pair and a component carousel list in `main.ts`.

```
src/common/model/
  ├─ RayTracingCommonModel.ts    scene handle, preferences hooks
  ├─ optics/
  │   ├─ OpticsScene.ts          elements[], settings, invalidate/simulate, JSON, PhET-iO group
  │   ├─ RayTracer.ts            BFS queue, max depth, brightness cutoff, view modes
  │   ├─ OpticsTypes.ts          OpticalElement contract, SimulationRay, TraceResult
  │   ├─ Geometry.ts             intersections, Snell/Fresnel helpers
  │   ├─ SpatialIndex.ts         accelerate intersection queries
  │   ├─ elementSerialization.ts / CommandHistory.ts
  │   └─ BaseElement.ts, OpticalElementPhetioObject.ts
  ├─ glass/          BaseGlass (Snell + Fresnel + Cauchy), lenses, prisms, slabs, …
  ├─ mirrors/        flat, arc, parabolic, ideal curved, beam splitter, …
  ├─ light-sources/  beam, point, arc, continuous spectrum, single ray, …
  ├─ blockers/       line blocker, aperture
  ├─ gratings/       transmission/reflection + gratingRayInteraction
  ├─ detectors/      DetectorElement, acquisition buffers
  └─ fiber/          FiberOpticElement

src/common/view/
  ├─ RayTracingCommonView.ts     MVT, carousel, edit panel, simulate each frame
  ├─ RayPropagationView.ts       CanvasNode draws TracedSegment[]
  ├─ ElementRegistry.ts          ONLY dispatch: guard → createView → buildEditControls
  ├─ OpticalElementViewFactory.ts / EditControlFactory.ts   thin wrappers
  ├─ ComponentCarousel.ts        toolbox → new element constructors
  ├─ BaseOpticalElementView.ts   drag, handles, rebuildEmitter
  └─ {glass,mirrors,light-sources,…}/   one view node per element family

src/intro/ IntroModel, IntroScreenView, IntroScreen
src/lab/   LabModel, LabScreenView, LabScreen
src/presets/ PresetsModel, PresetScenes, PresetsScreenView, PresetsScreen
src/diffraction/ DiffractionModel, DiffractionScreenView, DiffractionScreen

src/OpticsLabConstants.ts / OpticsLabColors.ts / OpticsLabStrings.ts
src/preferences/ OpticsLabPreferencesModel, opticsLabQueryParameters
```

Data flows Model → View through AXON `Property` objects and `OpticsScene` invalidation; the view
calls `scene.simulate()` when dirty. Model classes must not import from view.

## Key design decisions

- **Single registry.** `ElementRegistry.ts` is the only place mapping model types to view nodes and
  edit controls; **subclass order matters** (specific prisms before generic `Glass`).
- **Cached trace.** `OpticsScene.invalidate()` marks stale; `simulate()` runs `RayTracer` and caches
  `TraceResult`. Detectors clear on each full trace.
- **OpticalElement contract.** `emitRays`, `checkRayIntersection`, `onRayIncident`, `serialize`,
  `dispose` — new elements must add a `deserializeElement` branch or JSON load fails.
- **Polarization channels.** Rays carry separate s and p brightness; Fresnel and beam splitters preserve
  the bookkeeping convention documented in `BaseGlass.refractRay()`.
- **Coordinates.** Model y-up; view y-down via inverted `ModelViewTransform2` in `RayTracingCommonView`.

## Model / view design

- `RayTracingCommonView._setupView` reparents nodes during carousel drag-and-drop; dropped tools return
  to the carousel.
- `RayPropagationView` batches canvas strokes; wavelength → RGB is a documented carve-out (physical
  tinting, not UI theme tokens).
- Command history (`CommandHistory`, `BatchPropertyCommand`) supports undoable property edits on elements.
- `OpticsLabNamespace.register()` exposes classes to the browser console for debugging.

## Disposal conventions

`OpticalElement.dispose()` clears element-owned listeners. Scene rebuilds and carousel drops should
dispose removed elements; `RayTracingCommonView` coordinates teardown when elements leave the scene.
Expand `tests/memory-leak.test.ts` when adding dynamic element views.

## Testing

`npm test` (vitest, `--expose-gc`):

- `tests/duplicate-element.test.ts` — scene/serialization invariant
- `tests/memory-leak.test.ts` — fleet WeakRef/GC regression

Run `npm run lint && npm run check && npm run build` after model or registry changes.

## Multi-screen simulations

Four screens share `RayTracingCommonModel` / `RayTracingCommonView` with different carousels and
backgrounds (`main.ts`: `standardComponents` vs `diffractionComponents`). See fleet `doc/multi-screen.md`
for StringManager screen names and per-screen folders.
