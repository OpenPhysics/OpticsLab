# SceneryStack Code Review — Findings

**Date:** 2026-07-21
**Scope:** OpticsLab shared stack (`src/common/`) and screens, reviewed against the six SceneryStack
pillars: architecture, memory, accessibility, layout, numerics, i18n.
**Companion:** physics/deserialization defects are covered separately in
[adversarial-security-review.md](./adversarial-security-review.md); this review focuses on the
architecture, a11y, and i18n pillars that review did not touch.

---

## Summary

OpticsLab scores well on the two pillars that are hardest to retrofit: **model–view separation is
clean** (no view imports anywhere under `src/common/model/**`) and **disposal discipline is real**
(explicit `disposeNodes` arrays, listeners unlinked on `disposeEmitter`, a per-frame allocation path
that was deliberately optimized for static scenes). The gaps are concentrated in **internationalization
of accessibility strings** and a couple of **frame-rate-coupling** rough edges.

| # | Pillar | Severity | One-line |
|---|--------|----------|----------|
| 1 | i18n / a11y | MEDIUM | Optical-element accessible names are English-only, bypassing `StringManager` |
| 2 | i18n | LOW–MED | Hardcoded `"∫I ="` detector label sits next to a properly localized sibling |
| 3 | Numerics | LOW–MED | No `dt` cap; acquisition sample count is frame-rate-dependent |
| 4 | Architecture | LOW | Element geometry is plain objects, not Axon Properties → manual `invalidate()` |

---

## FINDING #1 — Optical-element accessible names bypass i18n (English-only)

**File:** `src/common/view/RayTracingCommonView.ts:780` (and helper at `:853`)
**Pillars:** 6 (i18n) + 3 (a11y) — **Severity: MEDIUM**

### Code

```typescript
// :780
view.accessibleName = ElementTypeToAccessibleName(element.type);

// :853 — regex-splits the English class name
function ElementTypeToAccessibleName(type: string): string {
  return type.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}
```

### Problem

Every draggable optical element's screen-reader name is derived by splitting its **English** type
string (`"IdealLens"` → `"Ideal Lens"`). Every *other* accessible name in the same file goes through
`StringManager` string Properties — e.g. `resetAllStringProperty` (`:529`), `downloadSceneStringProperty`
(`:564`). OpticsLab ships a French UI, so:

- Screen-reader users on `fr` (or any non-English locale) hear English element names.
- `accessibleName` is assigned a **plain string**, not a `StringProperty`, so it does **not** update when
  the locale changes at runtime — it is frozen to whatever the class name spells.

This is the single clearest i18n Fail in the view layer: the PDOM, which is precisely the surface a11y
users depend on, is the one place still hardcoded to English.

### Fix

Map `element.type` → a localized `StringProperty` from `StringManager` (a per-type key, or a lookup keyed
by type), and assign that Property to `accessibleName` so it both localizes and stays reactive.

---

## FINDING #2 — Hardcoded `"∫I ="` label in the detector chart

**File:** `src/common/view/detectors/DetectorChartPanel.ts:169`
**Pillar:** 6 (i18n) — **Severity: LOW–MEDIUM**

### Code

```typescript
const hitCountLabel = new Text(StringManager.getInstance().getUIStrings().detectorHitsStringProperty, { … }); // :159 — localized
…
const powerLabel = new Text("∫I =", { … }); // :169 — raw literal
```

### Problem

The two readout labels are built side by side, but only one is localized. `"∫I ="` is a raw string
literal, so translators can't reach it and it can't adapt (the `=` sign, spacing, and any locale-specific
notation are fixed). The neighbouring `hitCountLabel` shows the intended pattern.

### Fix

Add a string key (e.g. `integratedIntensityStringProperty`) and pass the Property to the `Text` node, as
`hitCountLabel` already does.

---

## FINDING #3 — No `dt` cap; acquisition sampling is frame-rate-coupled

**Files:** `src/common/TimeModel.ts:66`, `src/common/model/detectors/DetectorAcquisition.ts:50`,
`src/common/view/RayTracingCommonView.ts:814`
**Pillar:** 5 (numerics / variable frame rate) — **Severity: LOW–MEDIUM**

### Problem

There is no `dt = Math.min(dt, MAX_DT)` anywhere in the codebase. `TimeModel.step` accumulates raw `dt`,
and `DetectorAcquisition.step` accumulates raw `dt` toward `ACQUISITION_DURATION_S = 2.0`
(`OpticsLabConstants.ts:391`). Meanwhile the jittered sample passes that fill the acquisition histogram
run a **fixed** `ACQUISITION_PASSES_PER_FRAME = 100` per animation frame (`RayTracingCommonView.ts:814`),
independent of `dt`.

Consequences of the frame-count coupling:

- Total samples per acquisition ≈ `100 × (frames elapsed during 2 s)` — ~12 000 at 60 fps but ~6 000 at
  30 fps. **Acquisition quality depends on the device's frame rate**, not on physical time.
- After a backgrounded/refocused tab, a single large `dt` can push `elapsed` past `ACQUISITION_DURATION_S`
  in **one frame**, completing the acquisition with only ~100 samples — a visibly noisier histogram.

There is no continuous integrator here, so nothing "explodes" (unlike a dynamics sim), which is why this
is low–medium rather than high. But it violates the "resilient to variable frame rates" guideline.

### Fix

Cap `dt` at the model boundary (`RayTracingCommonModel.step` / `TimeModel.step`) and/or drive the number
of jitter passes from `dt` rather than a fixed per-frame count, so total sample count tracks physical
acquisition time.

---

## FINDING #4 — Element geometry is plain objects, not Axon Properties

**File:** `src/common/view/RayTracingCommonView.ts:714–717`
**Pillar:** 1 (Property hygiene) — **Severity: LOW (deliberate tradeoff, but fragile)**

### Code / comment (verbatim)

```typescript
// Element positions are plain objects (not axon Properties), so dragging
// does not automatically mark the scene dirty. Invalidate here so the
// ray tracer re-runs on the next step() rather than showing a stale result.
this.model.scene.invalidate();
```

### Problem

Element position/geometry is imperative mutable state rather than reactive `Property` state. Nothing
observes it, so the view must remember to call `scene.invalidate()` by hand after any geometry change.
Today there is exactly one such call site, which is fine — but the invariant "every geometry mutation must
be followed by `invalidate()`" is enforced by nothing. A future drag path, a preset loader, or a
programmatic move that forgets the call will silently render a **stale ray trace** with no error.

This is a conscious performance tradeoff (Properties on every control point would be heavier), so it is
not a defect to "fix" blindly — but per the pillar-1 guideline it is the one place raw state escapes the
Axon reactivity model, and it should be documented as a load-bearing invariant (or centralized behind a
single `moveElement()`/`setGeometry()` helper that invalidates internally).

---

## Pillars that passed

- **Architecture (model–view).** No `scenerystack/scenery`, `scenerystack/sun`, or `common/view` imports
  under `src/common/model/**`. Data flows Model → View through Properties and `OpticsScene` invalidation.
- **Memory / disposal.** `DetectorChartPanel` disposes every node it owns via an explicit `disposeNodes`
  array (`:214`, `:228`); `RayTracingCommonView` unlinks selection/rebuild listeners on `disposeEmitter`
  (`:720`, `:733`). Dynamic element add/remove is covered by `tests/memory-leak.test.ts`.
- **Per-frame allocation.** `updateRayPropagation` (`:807`) reuses the cached `TraceResult` for static
  scenes; the allocation-heavy path only runs while a detector is actively acquiring — a documented,
  intentional optimization.
