import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Screen, type ScreenOptions } from "scenerystack/sim";
import type { OpticsLabScreenOptions } from "../common/RayTracingCommonScreen.js";
import { OpticsLabKeyboardHelpContent } from "../common/view/OpticsLabKeyboardHelpContent.js";
import OpticsLabNamespace from "../OpticsLabNamespace.js";
import { IntroModel } from "./IntroModel.js";
import { IntroScreenView } from "./IntroScreenView.js";

export class IntroScreen extends Screen<IntroModel, IntroScreenView> {
  public constructor(options: OpticsLabScreenOptions) {
    super(
      () => new IntroModel(options.tandem.createTandem("model")),
      (model) =>
        new IntroScreenView(
          model,
          options.opticsLabPreferences,
          { tandem: options.tandem.createTandem("view") },
          options.carouselComponents,
        ),
      optionize<OpticsLabScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          createKeyboardHelpNode: () => new OpticsLabKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}

OpticsLabNamespace.register("IntroScreen", IntroScreen);
