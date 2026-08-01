/**
 * OpticsLabPanel.ts
 *
 * A pre-themed Panel that automatically uses OpticsLabColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { OpticsLabPanel } from "../../common/OpticsLabPanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new OpticsLabPanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new OpticsLabPanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new OpticsLabPanel(content, { fill: "transparent" });
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { Node } from "scenerystack/scenery";
import { Panel, type PanelOptions } from "scenerystack/sun";
import OpticsLabColors from "../OpticsLabColors.js";
import { PANEL_CORNER_RADIUS } from "../OpticsLabConstants.js";

export type OpticsLabPanelOptions = PanelOptions;

export class OpticsLabPanel extends Panel {
  public constructor(content: Node, providedOptions?: OpticsLabPanelOptions) {
    const options = optionize<OpticsLabPanelOptions, EmptySelfOptions, PanelOptions>()(
      {
        fill: OpticsLabColors.panelBackgroundColorProperty,
        stroke: OpticsLabColors.panelBorderColorProperty,
        cornerRadius: PANEL_CORNER_RADIUS,
        xMargin: 12,
        yMargin: 10,
      },
      providedOptions,
    );
    super(content, options);
  }
}
