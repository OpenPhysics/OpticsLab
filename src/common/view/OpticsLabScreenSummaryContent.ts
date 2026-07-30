/**
 * OpticsLabScreenSummaryContent.ts
 *
 * Accessible screen summary (SceneryStack Interactive Description) shared by all
 * OpticsLab screens (they all extend RayTracingCommonView). Describes the optical
 * bench play area and the controls, and gives an interaction hint.
 *
 * Follows the OpenPhysics accessibility convention; see the canonical
 * SceneryStackTemplate/SimScreenSummaryContent.ts. The current-details paragraph is
 * static here because the scene's optical elements are held in a PhetioGroup
 * rather than a count Property; it can be made live by deriving a count.
 */
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";

export class OpticsLabScreenSummaryContent extends ScreenSummaryContent {
  public constructor() {
    const a11y = StringManager.getInstance().getA11yStrings();

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: a11y.currentDetailsStringProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
