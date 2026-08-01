import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Node, Text } from "scenerystack/scenery";
import { ComboBox, type ComboBoxItem } from "scenerystack/sun";
import { Tandem } from "scenerystack/tandem";
import type { ComponentKey } from "../common/view/ComponentCarousel.js";
import { createOpticalElementView } from "../common/view/OpticalElementViewFactory.js";
import { RayTracingCommonView, type RayTracingCommonViewOptions } from "../common/view/RayTracingCommonView.js";
import { StringManager } from "../i18n/StringManager.js";
import OpticsLabColors from "../OpticsLabColors.js";
import { FONT_13PX, FONT_BOLD_13PX, PANEL_CORNER_RADIUS } from "../OpticsLabConstants.js";
import OpticsLabNamespace from "../OpticsLabNamespace.js";
import type { OpticsLabPreferencesModel } from "../preferences/OpticsLabPreferencesModel.js";
import { getPresetDescriptors, type PresetId } from "./PresetScenes.js";
import type { PresetsModel } from "./PresetsModel.js";

export type PresetsScreenViewOptions = RayTracingCommonViewOptions;

export class PresetsScreenView extends RayTracingCommonView {
  public constructor(
    model: PresetsModel,
    opticsLabPreferences: OpticsLabPreferencesModel,
    providedOptions?: PresetsScreenViewOptions,
    carouselComponents?: ComponentKey[],
  ) {
    const options = optionize<PresetsScreenViewOptions, EmptySelfOptions, RayTracingCommonViewOptions>()(
      {},
      providedOptions,
    );
    super(model, opticsLabPreferences, options, carouselComponents);

    const viewTandem = options.tandem;

    const presetStrings = StringManager.getInstance().getPresetsStrings();
    const descriptors = getPresetDescriptors();

    // ── ComboBox items ────────────────────────────────────────────────────────
    const items: ComboBoxItem<PresetId>[] = descriptors.map((desc) => ({
      value: desc.id,
      createNode: () =>
        new Text(desc.label, {
          font: FONT_13PX,
          fill: OpticsLabColors.overlayLabelFillProperty,
          maxWidth: 180,
        }),
    }));

    // The list box needs a parent node that sits above everything else.
    const listParent = new Node();
    this.addChild(listParent);

    const comboBox = new ComboBox<PresetId>(model.selectedPresetProperty, items, listParent, {
      listPosition: "below",
      cornerRadius: PANEL_CORNER_RADIUS,
      buttonFill: OpticsLabColors.panelFillProperty,
      buttonStroke: OpticsLabColors.panelStrokeProperty,
      listFill: OpticsLabColors.panelFillProperty,
      listStroke: OpticsLabColors.panelStrokeProperty,
      highlightFill: OpticsLabColors.comboBoxHighlightFillProperty,
      xMargin: 10,
      yMargin: 6,
      accessibleName: presetStrings.choosePresetStringProperty,
      tandem: viewTandem ? viewTandem.createTandem("presetComboBox") : Tandem.OPTIONAL,
    });
    this.addChild(comboBox);

    // ── Label above the ComboBox ──────────────────────────────────────────────
    const label = new Text(presetStrings.choosePresetStringProperty, {
      font: FONT_BOLD_13PX,
      fill: OpticsLabColors.overlayLabelFillProperty,
    });
    this.addChild(label);

    // Position: top-centre of the visible bounds, above the play area.
    this.visibleBoundsProperty.link((visibleBounds) => {
      label.centerX = visibleBounds.centerX;
      label.top = visibleBounds.minY + 10;
      comboBox.centerX = visibleBounds.centerX;
      comboBox.top = label.bottom + 6;
    });

    // ── Sync views when preset changes ───────────────────────────────────────
    // The model listener already clears + adds elements. We need to rebuild
    // the view layer to match.
    model.selectedPresetProperty.lazyLink(() => {
      // Clear existing element views (same as reset()).
      this.reset();

      // Recreate views for all elements now present in the model.
      for (const element of model.scene.getAllElements()) {
        // Tandem names must be camelCase with no hyphens; convert "element-2" → "element2"
        const tandemName = element.id.replace(/-(\d+)/g, "$1");
        const elementTandem = viewTandem?.createTandem(tandemName) ?? Tandem.OPTIONAL;
        const view = createOpticalElementView(element, this.modelViewTransform, elementTandem, this.viewOptions);
        if (view) {
          this.elementTandemMap.set(element.id, elementTandem);
          this._setupView(element, view);
        }
      }
    });
  }
}

OpticsLabNamespace.register("PresetsScreenView", PresetsScreenView);
