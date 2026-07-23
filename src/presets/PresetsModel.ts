import { Property } from "scenerystack/axon";
import { StringUnionIO, type Tandem } from "scenerystack/tandem";
import { RayTracingCommonModel } from "../common/model/RayTracingCommonModel.js";
import OpticsLabNamespace from "../OpticsLabNamespace.js";
import { getPresetDescriptors, PRESET_ID_VALUES, type PresetId } from "./PresetScenes.js";

const PresetIdIO = StringUnionIO(PRESET_ID_VALUES);

export class PresetsModel extends RayTracingCommonModel {
  public readonly selectedPresetProperty: Property<PresetId>;

  public constructor(tandem: Tandem) {
    super(tandem);

    this.selectedPresetProperty = new Property<PresetId>("empty", {
      tandem: tandem.createTandem("selectedPresetProperty"),
      phetioValueType: PresetIdIO,
      phetioFeatured: true,
      phetioDocumentation: "Which built-in preset layout is loaded into the scene.",
    });

    // Load elements whenever the selected preset changes.
    this.selectedPresetProperty.link((presetId) => {
      this.scene.clearElements();
      // Loading a preset is a programmatic scene replacement, not a user edit,
      // so it must not record undo history: (1) undoing a preset load
      // element-by-element is nonsensical UX, and (2) the "Add" command closures
      // would otherwise keep every superseded preset element reachable (up to the
      // MAX_HISTORY_SIZE cap) long after clearElements() removed it from the scene.
      // Clear any prior history too, since undo across a preset boundary is
      // meaningless and would reference elements clearElements() just disposed.
      this.scene.history.clear();
      const descriptors = getPresetDescriptors();
      const preset = descriptors.find((d) => d.id === presetId);
      if (preset) {
        for (const element of preset.createElements()) {
          this.scene.addElement(element, false);
        }
      }
    });
  }

  public override reset(): void {
    super.reset();
    this.selectedPresetProperty.reset();
  }
}

OpticsLabNamespace.register("PresetsModel", PresetsModel);
