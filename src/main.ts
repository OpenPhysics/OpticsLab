/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screen, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. It triggers the full bootstrap chain:
 *
 *   brand.ts → splash.ts → assert.ts → init.ts
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first — triggers: init.ts → assert.ts → splash.ts → brand.ts
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import type { ComponentKey } from "./common/view/ComponentCarousel.js";
import { DiffractionScreen } from "./diffraction/DiffractionScreen.js";
import { StringManager } from "./i18n/StringManager.js";
import { IntroScreen } from "./intro/IntroScreen.js";
import { LabScreen } from "./lab/LabScreen.js";
import OpticsLabColors from "./OpticsLabColors.js";
import {
  createDiffractionScreenIcon,
  createIntroScreenIcon,
  createLabScreenIcon,
  createPresetsScreenIcon,
} from "./OpticsLabScreenIcons.js";
import {
  TANDEM_DIFFRACTION_SCREEN,
  TANDEM_INTRO_SCREEN,
  TANDEM_LAB_SCREEN,
  TANDEM_OPTICS_LAB_PREFERENCES,
  TANDEM_PRESETS_SCREEN,
} from "./OpticsLabStrings.js";
import { OpticsLabPreferencesModel } from "./preferences/OpticsLabPreferencesModel.js";
import { OpticsLabPreferencesNode } from "./preferences/OpticsLabPreferencesNode.js";
import opticsLabQueryParameters from "./preferences/opticsLabQueryParameters.js";
import { PresetsScreen } from "./presets/PresetsScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();
  const opticsLabPreferences = new OpticsLabPreferencesModel(Tandem.ROOT.createTandem(TANDEM_OPTICS_LAB_PREFERENCES));
  const screenNames = stringManager.getScreenNames();

  const commonScreenOptions = {
    backgroundColorProperty: OpticsLabColors.backgroundColorProperty,
    opticsLabPreferences,
  };

  // Components shared by non-diffraction screens (everything except gratings).
  const standardComponents: ComponentKey[] = [
    "beam",
    "singleRay",
    "continuousSpectrum",
    "arcSource",
    "pointSource",
    "sphericalLens",
    "biconvexLens",
    "biconcaveLens",
    "planoConvexLens",
    "planoConcaveLens",
    "idealLens",
    "circleGlass",
    "prism",
    "equilateralPrism",
    "rightAnglePrism",
    "porroPrism",
    "slabGlass",
    "parallelogramPrism",
    "dovePrism",
    "halfPlaneGlass",
    "flatMirror",
    "arcMirror",
    "idealMirror",
    "parabolicMirror",
    "lineBlocker",
    "detector",
    "aperture",
    "beamSplitter",
    "track",
    ...(opticsLabQueryParameters.enabledOpticalFiber ? ["fiberOptic" as ComponentKey] : []),
  ];

  // The diffraction screen adds gratings and a curated subset of other components.
  const diffractionComponents: ComponentKey[] = [
    "transmissionGrating",
    "reflectionGrating",
    "beam",
    "singleRay",
    "continuousSpectrum",
    "pointSource",
    "aperture",
    "detector",
    "flatMirror",
    "lineBlocker",
    "track",
  ];

  const screens = [
    new IntroScreen({
      name: screenNames.introStringProperty,
      tandem: Tandem.ROOT.createTandem(TANDEM_INTRO_SCREEN),
      carouselComponents: standardComponents,
      homeScreenIcon: createIntroScreenIcon(),
      ...commonScreenOptions,
    }),
    new LabScreen({
      name: screenNames.labStringProperty,
      tandem: Tandem.ROOT.createTandem(TANDEM_LAB_SCREEN),
      carouselComponents: standardComponents,
      homeScreenIcon: createLabScreenIcon(),
      ...commonScreenOptions,
    }),
    new PresetsScreen({
      name: screenNames.presetsStringProperty,
      tandem: Tandem.ROOT.createTandem(TANDEM_PRESETS_SCREEN),
      carouselComponents: standardComponents,
      homeScreenIcon: createPresetsScreenIcon(),
      ...commonScreenOptions,
    }),
    new DiffractionScreen({
      name: screenNames.diffractionStringProperty,
      tandem: Tandem.ROOT.createTandem(TANDEM_DIFFRACTION_SCREEN),
      carouselComponents: diffractionComponents,
      homeScreenIcon: createDiffractionScreenIcon(),
      ...commonScreenOptions,
    }),
  ];

  const simOptions = {
    webgl: true,
    preferencesModel: new PreferencesModel({
      visualOptions: {
        supportsProjectorMode: true,
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new OpticsLabPreferencesNode(opticsLabPreferences, tandem),
          },
        ],
      },
      inputOptions: {
        supportsGestureControl: true,
      },
      localizationOptions: {
        supportsDynamicLocale: true,
      },
    }),
  };

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, simOptions);
  sim.start();
});
