import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Screen, type ScreenOptions } from "scenerystack/sim";
import type { OpticsLabScreenOptions } from "../common/RayTracingCommonScreen.js";
import { OpticsLabKeyboardHelpContent } from "../common/view/OpticsLabKeyboardHelpContent.js";
import OpticsLabNamespace from "../OpticsLabNamespace.js";
import { DiffractionModel } from "./DiffractionModel.js";
import { DiffractionScreenView } from "./DiffractionScreenView.js";

export class DiffractionScreen extends Screen<DiffractionModel, DiffractionScreenView> {
  public constructor(options: OpticsLabScreenOptions) {
    super(
      () => new DiffractionModel(options.tandem.createTandem("model")),
      (model) =>
        new DiffractionScreenView(
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

OpticsLabNamespace.register("DiffractionScreen", DiffractionScreen);
