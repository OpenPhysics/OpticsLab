# Multi-Screen Simulations

OpticsLab is a **four-screen** geometric-optics sim. All screens share the
ray-tracing stack under `src/common/`; each screen is a thin
`Screen` / model / view wrapper with its own carousel component list.

For physics and architecture, see [model.md](./model.md) and
[implementation-notes.md](./implementation-notes.md).

---

## Screens in this sim

| Order | UI name | Folder | Screen class | Icon factory |
|---|---|---|---|---|
| 1 | Intro | `src/intro/` | `IntroScreen` | `createIntroIcon()` |
| 2 | Lab | `src/lab/` | `LabScreen` | `createLabIcon()` |
| 3 | Presets | `src/presets/` | `PresetsScreen` | `createPresetsIcon()` |
| 4 | Diffraction | `src/diffraction/` | `DiffractionScreen` | `createDiffractionIcon()` |

```
main.ts
  ├─ IntroScreen         → IntroModel / IntroScreenView
  ├─ LabScreen           → LabModel / LabScreenView
  ├─ PresetsScreen       → PresetsModel / PresetsScreenView
  └─ DiffractionScreen   → DiffractionModel / DiffractionScreenView
         │
         └─ each extends / reuses RayTracingCommonModel + RayTracingCommonView
```

Screen models are **independent** (separate scenes). They share
`OpticsLabPreferencesModel` and the common optics code. Intro / Lab / Presets
use `standardComponents`; Diffraction uses `diffractionComponents` (gratings +
a curated subset) — both lists are built in `main.ts`.

---

## Folder layout

```
src/
├─ common/
│   ├─ OpticsLabScreenIcons.ts      # createIntroIcon(), createLabIcon(), …
│   ├─ RayTracingCommonScreen.ts    # shared Screen options type / base
│   ├─ model/                       # OpticsScene, RayTracer, elements, …
│   └─ view/                        # RayTracingCommonView, carousel, …
├─ intro/
│   ├─ IntroScreen.ts
│   ├─ IntroModel.ts
│   └─ IntroScreenView.ts
├─ lab/
│   ├─ LabScreen.ts
│   ├─ LabModel.ts
│   └─ LabScreenView.ts
├─ presets/
│   ├─ PresetsScreen.ts
│   ├─ PresetsModel.ts
│   └─ view/PresetsScreenView.ts
└─ diffraction/
    ├─ DiffractionScreen.ts
    ├─ DiffractionModel.ts
    └─ DiffractionScreenView.ts
```

Do **not** put a per-screen `*ScreenIcon.ts` next to each screen — icons live
only in `src/common/OpticsLabScreenIcons.ts`.

---

## Wiring in `main.ts`

Inside `onReadyToLaunch`:

1. Create `OpticsLabPreferencesModel` once.
2. Build `standardComponents` and `diffractionComponents` carousel lists.
3. Construct the four screens with `name` from
   `stringManager.getScreenNames()`, a PhET-iO `tandem`, `carouselComponents`,
   `homeScreenIcon: create…Icon()`, and shared `opticsLabPreferences` /
   `backgroundColorProperty`.

```typescript
import {
  createDiffractionIcon,
  createIntroIcon,
  createLabIcon,
  createPresetsIcon,
} from "./common/OpticsLabScreenIcons.js";

const screens = [
  new IntroScreen({
    name: screenNames.introStringProperty,
    tandem: Tandem.ROOT.createTandem(TANDEM_INTRO_SCREEN),
    carouselComponents: standardComponents,
    homeScreenIcon: createIntroIcon(),
    ...commonScreenOptions,
  }),
  new LabScreen({ /* … createLabIcon() … */ }),
  new PresetsScreen({ /* … createPresetsIcon() … */ }),
  new DiffractionScreen({
    carouselComponents: diffractionComponents,
    homeScreenIcon: createDiffractionIcon(),
    ...commonScreenOptions,
  }),
];
```

Each `*Screen.ts` only supplies `createKeyboardHelpNode` defaults via
`optionize` and forwards the rest of the options (including icons) from
`main.ts`.

---

## Home screen icons

### Fleet convention

```
src/common/OpticsLabScreenIcons.ts
```

| Screen | Factory |
|---|---|
| Intro | `createIntroIcon()` |
| Lab | `createLabIcon()` |
| Presets | `createPresetsIcon()` |
| Diffraction | `createDiffractionIcon()` |

Icons are drawn on the standard PhET **548 × 373** canvas with scenery
primitives and `OpticsLabColors` `ProfileColorProperty`s so they follow default /
projector mode.

Wire `homeScreenIcon` (and usually `navigationBarIcon`) when registering
screens. OpticsLab currently sets `homeScreenIcon` in `main.ts`; other fleet
sims often set both icons in each `*Screen.ts` `optionize` defaults instead.

---

## Screen options reference

| Option | Type | Purpose |
|---|---|---|
| `name` | `ReadOnlyProperty<string>` | Localizable tab label |
| `tandem` | `Tandem` | PhET-iO registration root |
| `backgroundColorProperty` | `TReadOnlyProperty<Color>` | Screen background |
| `createKeyboardHelpNode` | `() => Node` | Per-screen keyboard help |
| `homeScreenIcon` | `ScreenIcon` | Icon on the home screen |
| `navigationBarIcon` | `ScreenIcon` | Smaller icon in the nav bar |
| `opticsLabPreferences` | `OpticsLabPreferencesModel` | Shared Preferences → Simulation |
| `carouselComponents` | `ComponentKey[]` | Toolbox order / filter |

---

## Strings and accessibility

Screen titles live under `screens` in `src/i18n/strings_*.json` (`intro`,
`lab`, `presets`, `diffraction`) and are exposed by
`StringManager.getScreenNames()`.

Each screen should keep its own `ScreenSummaryContent` / keyboard-help strings
under per-screen a11y keys when those differ. Shared help currently uses
`OpticsLabKeyboardHelpContent`.

---

## Adding another screen

1. Add a locale key under `screens` in every `strings_*.json`.
2. Expose it from `getScreenNames()`.
3. Add `src/<name>/` with `*Screen.ts`, model, and view (reuse
   `RayTracingCommonModel` / view unless the screen needs different physics).
4. Add `create…Icon()` to `OpticsLabScreenIcons.ts`.
5. Register the screen in `main.ts` with name, tandem, carousel list, and icon.
