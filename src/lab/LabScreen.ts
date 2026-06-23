import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Screen, type ScreenOptions } from "scenerystack/sim";
import type { OpticsLabScreenOptions } from "../common/RayTracingCommonScreen.js";
import { OpticsLabKeyboardHelpContent } from "../common/view/OpticsLabKeyboardHelpContent.js";
import OpticsLabNamespace from "../OpticsLabNamespace.js";
import { LabModel } from "./LabModel.js";
import { LabScreenView } from "./LabScreenView.js";

export class LabScreen extends Screen<LabModel, LabScreenView> {
  public constructor(options: OpticsLabScreenOptions) {
    super(
      () => new LabModel(options.tandem.createTandem("model")),
      (model) =>
        new LabScreenView(
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

OpticsLabNamespace.register("LabScreen", LabScreen);
