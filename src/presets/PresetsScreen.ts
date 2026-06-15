import { Screen } from "scenerystack/sim";
import type { OpticsLabScreenOptions } from "../common/RayTracingCommonScreen.js";
import { OpticsLabKeyboardHelpContent } from "../common/view/OpticsLabKeyboardHelpContent.js";
import OpticsLabNamespace from "../OpticsLabNamespace.js";
import { PresetsModel } from "./PresetsModel.js";
import { PresetsScreenView } from "./PresetsScreenView.js";

export class PresetsScreen extends Screen<PresetsModel, PresetsScreenView> {
  public constructor(options: OpticsLabScreenOptions) {
    super(
      () => new PresetsModel(options.tandem.createTandem("model")),
      (model) =>
        new PresetsScreenView(
          model,
          options.opticsLabPreferences,
          { tandem: options.tandem.createTandem("view") },
          options.carouselComponents,
        ),
      {
        ...options,
        createKeyboardHelpNode: () => new OpticsLabKeyboardHelpContent(),
      },
    );
  }
}

OpticsLabNamespace.register("PresetsScreen", PresetsScreen);
