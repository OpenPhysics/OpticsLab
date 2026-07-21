# SceneryStack Code Review Guide

A reusable checklist for reviewing interactive simulations built on
[SceneryStack](https://scenerystack.org/) — the open-source TypeScript framework behind PhET sims.
It is organized around six pillars: architecture, memory, accessibility, layout, numerics, and i18n.

This guide is framework-general but anchored to OpticsLab so each item points at real code. For the
architecture it reviews, see [implementation-notes.md](./implementation-notes.md); for a worked example
of applying a review to this codebase, see [adversarial-security-review.md](./adversarial-security-review.md).
General org guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## How to use it

Walk the six pillars in order — each has **Pass / Fail** signals and OpticsLab anchors. Not every item
applies to every PR; skip pillars a change doesn't touch. Treat Fail signals as review blockers, and
Watch items as things to confirm rather than assume.

---

## 1. Architecture & State Management (Axon / Model–View)

**Model–view separation.** The physical model must be fully decoupled from its visual representation.

- **Pass** — model classes hold only physical state (`Property<number>`, units, interaction logic) with
  zero UI imports (`scenery` / `sun` / `phet-core` view types).
- **Fail** — a view mutates raw model state directly instead of reacting to `Property` updates.
- **OpticsLab anchor** — CLAUDE.md is explicit: *"Model classes must not import from view."* Data flows
  Model → View through AXON `Property` objects and `OpticsScene` invalidation (`implementation-notes.md`:
  *Data flows*). A grep of `src/common/model/**` for `scenerystack/scenery`, `scenerystack/sun`, or view
  imports should return nothing.

**Property hygiene.**

- Reactive state uses explicit property classes (`NumberProperty`, `BooleanProperty`, `DerivedProperty`),
  not plain fields with manual notification.
- `DerivedProperty` is used for values computed entirely from other properties, rather than recomputed by
  hand in a listener or step loop.
- `NumberProperty` declares `range` and `units` where they apply — e.g. `new NumberProperty(0, { units: "s" })`
  in `src/common/TimeModel.ts:59`. Boolean properties use verb prefixes (`is`, `has`, `show`) per CLAUDE.md.
- **Watch** — a value derived from other properties but stored in a standalone `NumberProperty` and kept in
  sync manually is a `DerivedProperty` waiting to happen.

---

## 2. Memory & Observer Lifecycle

**Listener disposal.**

- Every `.link()` / `.lazyLink()` on a Property owned elsewhere is torn down — via `.unlink()`, an
  `addDisposable`, or the owning node's `dispose()` — when the node or model component is removed.
- Transient components (dynamic elements, spawned UI) must not leak listeners into long-lived properties.
- **OpticsLab anchor** — `OpticalElement.dispose()` clears element-owned listeners; scene rebuilds and
  carousel drops dispose removed elements, coordinated by `RayTracingCommonView`
  (`implementation-notes.md`: *Disposal conventions*). Optical elements are a `PhetioGroup`
  (`OpticsScene.opticalElementsGroup`), so `disposeElement` must fully unregister. **When adding a dynamic
  element view, extend `tests/memory-leak.test.ts`** — the WeakRef + `forceGC` regression is the guardrail.

**Allocation in step loops.**

- Avoid allocating `Vector2` / `Bounds2` inside `step(dt)` or per-frame trace loops; pre-allocate a
  scratchpad and mutate in place (`position.setXY(x, y)`).
- **OpticsLab anchor** — the only per-frame model work is `DetectorElement.stepAcquisition(dt)` (CLAUDE.md);
  the ray trace itself runs on-demand via `OpticsScene.simulate()` when the scene is dirty, not every frame.
  When reviewing hot paths, focus allocation scrutiny on `RayTracer`'s BFS queue and `Geometry.ts` helpers.

---

## 3. Accessibility & Inclusivity (A11y)

Follow the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).

**Parallel DOM (PDOM) & keyboard navigation.**

- Interaction order is defined explicitly with `pdomOrder`, not left to scene-graph insertion order.
- Custom interactive nodes map to standard accessible roles via `tagName`, `labelContent`,
  `descriptionContent`.
- **OpticsLab anchor** — all four screens share `RayTracingCommonView`, which registers
  `OpticsLabScreenSummaryContent` via the `screenSummaryContent` super-option and orders the PDOM through a
  wrapper `Node`'s `pdomOrder` (`RayTracingCommonView.ts:601`; CLAUDE.md → *Accessibility*).

**Alternative input.**

- Sliders and draggable items support keyboard interaction (arrow keys plus shift-modifier fine increments).
- **Watch** — element drag in `BaseOpticalElementView` should have a keyboard-navigable equivalent, not
  pointer-only handles.

**Sonification & audio.**

- Sound cues (`tambo`) attach to meaningful physical transitions or state changes without overwhelming the
  user, and are gated by the sound-enabled preference.

---

## 4. Visual Layout & Responsiveness

**Scene graph & layout.**

- Layout uses `HBox` / `VBox` / `GridBox` containers rather than hardcoded absolute pixel coordinates
  wherever a container fits.
- Nodes re-layout when dynamic labels or locale strings change length (bounds are recomputed, not cached
  from initial text).

**Color & high contrast.**

- Colors are centralized in a SceneryStack color profile via `ProfileColorProperty`, so projector /
  high-contrast modes work seamlessly.
- **OpticsLab anchor** — `src/OpticsLabColors.ts` builds `ProfileColorProperty` instances through a factory
  (`OpticsLabColors.ts:16-21`). The **only** sanctioned hardcoded colors are wavelength-derived `rgba(...)`
  and canvas strokes in the ray / SVG exporters and light-source views — physical tinting, not UI theme
  tokens (CLAUDE.md → *Compliance carve-outs*; e.g. `SceneSVGExporter.ts`, `ContinuousSpectrumSourceView.ts`).
  A new hardcoded color outside those exporters is a Fail.

---

## 5. Numerical Stability & Physics

**Time-step integration.**

- `step(dt)` is resilient to variable frame rates; large `dt` (e.g. after a backgrounded tab) is capped
  (`dt = Math.min(dt, MAX_DT)`) before it drives integration or collision detection.
- **OpticsLab anchor** — `TimeModel.step` only accumulates `timeProperty` and `DetectorElement` acquisition
  advances by `dt`; there is no continuous integrator to tunnel, so an uncapped `dt` is lower-risk here than
  in a dynamics sim. Still confirm acquisition timing (`DetectorAcquisition.step`) behaves under a large `dt`
  spike rather than assuming small frames.

**Boundary & edge cases.**

- Physical singularities are guarded: division by zero (`r = 0`, `refIndex = 0`), zero-length direction
  vectors, empty polygons, degenerate control points, and unbounded loop depth.
- `NaN` is treated as poison: remember `NaN < threshold` is `false` in IEEE 754, so a naive
  `if (x < min) drop()` cull does **not** filter `NaN` — it leaks through and cascades.
- **OpticsLab anchor** — the physics-specific version of this pillar is worked out in detail in
  [adversarial-security-review.md](./adversarial-security-review.md): the sinc singularity
  (`gratingRayInteraction.ts`), `normalize` of the zero vector and `polygonCentroid([])` (`Geometry.ts`),
  the `refIndex = 0` bypass (`BaseGlass.ts`), and the unbounded `RayTracer` BFS queue. Its root cause —
  *deserialization is a trust boundary treated as an internal API* — is the first thing to check when a new
  element type or JSON field is added.

---

## 6. Internationalization (i18n)

**String key usage.**

- Every user-visible string is a string property / key, never a hardcoded literal in a view.
- **OpticsLab anchor** — strings resolve through `src/i18n/StringManager.ts`; a11y strings live under the
  top-level `a11y` key in each locale JSON via `StringManager.getA11yStrings()` (CLAUDE.md → *Accessibility*).
  A literal passed to `new Text(...)` or a `labelContent` is a Fail.

**Layout flexibility.**

- The UI accommodates longer translated text (French UI ships today) without overflowing container bounds —
  panels and labels grow, they do not clip. Verify with the longest locale, not English.

---

## Quick review checklist

| Pillar | First thing to check | OpticsLab anchor |
|---|---|---|
| 1 Architecture | No view imports in `src/common/model/**` | `implementation-notes.md` |
| 2 Memory | New dynamic view → `tests/memory-leak.test.ts` updated | `RayTracingCommonView` disposal |
| 3 A11y | `pdomOrder` set; roles + `labelContent` present | `RayTracingCommonView.ts:601` |
| 4 Layout | Boxes not pixels; colors via `ProfileColorProperty` | `OpticsLabColors.ts` |
| 5 Numerics | Singularity + `NaN` guards on new physics / JSON | `adversarial-security-review.md` |
| 6 i18n | No hardcoded user strings; longest-locale layout | `StringManager.ts` |

Before landing model or registry changes, run `npm run lint && npm run check && npm run build` and `npm test`.
