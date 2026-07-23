/**
 * ImageOverlayNode.ts
 *
 * Renders DetectedImage markers (real / virtual image positions) produced
 * by the ray tracer in "images" mode as Scenery Node children.
 *
 *   Real images    – solid yellow-orange filled circle,  label "R"
 *   Virtual images – dashed cyan hollow circle,          label "V"
 *   Virtual object – dashed red hollow circle,           label "VO"
 *
 * Call setImages() every frame when in "images" mode; call setImages([])
 * to clear when switching away from that mode.
 */

import { Multilink } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import type { ModelViewTransform2 } from "scenerystack/phetcommon";
import { Circle, Node, Text } from "scenerystack/scenery";
import OpticsLabColors from "../../OpticsLabColors.js";
import {
  FONT_BOLD_9PX,
  HANDLE_LINE_WIDTH,
  IMAGE_LABEL_OFFSET_X_PX,
  IMAGE_MARKER_RADIUS_PX,
} from "../../OpticsLabConstants.js";
import OpticsLabNamespace from "../../OpticsLabNamespace.js";
import type { DetectedImage } from "../model/optics/OpticsTypes.js";

const LABEL_FONT = FONT_BOLD_9PX;

export class ImageOverlayNode extends Node {
  private readonly modelViewTransform: ModelViewTransform2;
  private lastImages: readonly DetectedImage[] | null = null;

  public constructor(modelViewTransform: ModelViewTransform2) {
    super({ pickable: false });
    this.modelViewTransform = modelViewTransform;

    // Marker fills/strokes are sampled from ProfileColorProperty.value when
    // rebuilding. Invalidate the cache on profile change so a static scene
    // still repaints when Projector Mode toggles.
    const colorMultilink = Multilink.multilink(
      [
        OpticsLabColors.imageRealFillBaseColorProperty,
        OpticsLabColors.imageRealStrokeBaseColorProperty,
        OpticsLabColors.imageRealLabelFillProperty,
        OpticsLabColors.imageVirtualObjectStrokeBaseColorProperty,
        OpticsLabColors.imageVirtualObjectLabelFillProperty,
        OpticsLabColors.imageVirtualStrokeBaseColorProperty,
        OpticsLabColors.imageVirtualLabelFillProperty,
      ],
      () => {
        if (this.lastImages !== null) {
          const images = this.lastImages;
          this.lastImages = null;
          this.setImages(images);
        }
      },
    );
    this.disposeEmitter.addListener(() => colorMultilink.dispose());
  }

  public setImages(images: readonly DetectedImage[]): void {
    // Skip rebuild when the same array reference is passed (cached TraceResult).
    if (images === this.lastImages) {
      return;
    }
    this.lastImages = images;

    // Dispose old marker/label nodes so their internal Properties, Bounds2
    // caches, and Tandem entries are released — removeAllChildren() alone
    // only detaches them from the scene graph.
    for (const child of [...this.children]) {
      child.dispose();
    }
    const mvt = this.modelViewTransform;

    for (const img of images) {
      const vx = mvt.modelToViewX(img.position.x);
      const vy = mvt.modelToViewY(img.position.y);
      const alpha = Math.min(1, Math.max(0.35, img.brightness));

      let marker: Circle;
      let labelText: string;
      let labelFill: string;

      if (img.imageType === "real") {
        const fillBase = OpticsLabColors.imageRealFillBaseColorProperty.value;
        const strokeBase = OpticsLabColors.imageRealStrokeBaseColorProperty.value;
        marker = new Circle(IMAGE_MARKER_RADIUS_PX, {
          fill: `rgba(${fillBase.r},${fillBase.g},${fillBase.b},${toFixed(alpha * 0.85, 3)})`,
          stroke: `rgba(${strokeBase.r},${strokeBase.g},${strokeBase.b},${toFixed(alpha, 3)})`,
          lineWidth: HANDLE_LINE_WIDTH,
          x: vx,
          y: vy,
        });
        labelText = "R";
        labelFill = OpticsLabColors.imageRealLabelFillProperty.value.toCSS();
      } else if (img.imageType === "virtualObject") {
        const strokeBase = OpticsLabColors.imageVirtualObjectStrokeBaseColorProperty.value;
        marker = new Circle(IMAGE_MARKER_RADIUS_PX, {
          fill: null,
          stroke: `rgba(${strokeBase.r},${strokeBase.g},${strokeBase.b},${toFixed(alpha, 3)})`,
          lineWidth: HANDLE_LINE_WIDTH,
          lineDash: [3, 2],
          x: vx,
          y: vy,
        });
        labelText = "VO";
        labelFill = OpticsLabColors.imageVirtualObjectLabelFillProperty.value.toCSS();
      } else {
        const strokeBase = OpticsLabColors.imageVirtualStrokeBaseColorProperty.value;
        marker = new Circle(IMAGE_MARKER_RADIUS_PX, {
          fill: null,
          stroke: `rgba(${strokeBase.r},${strokeBase.g},${strokeBase.b},${toFixed(alpha, 3)})`,
          lineWidth: HANDLE_LINE_WIDTH,
          lineDash: [3, 2],
          x: vx,
          y: vy,
        });
        labelText = "V";
        labelFill = OpticsLabColors.imageVirtualLabelFillProperty.value.toCSS();
      }

      const label = new Text(labelText, {
        font: LABEL_FONT,
        fill: labelFill,
        x: vx + IMAGE_LABEL_OFFSET_X_PX,
        y: vy + 3,
      });

      this.addChild(marker);
      this.addChild(label);
    }
  }
}

OpticsLabNamespace.register("ImageOverlayNode", ImageOverlayNode);
