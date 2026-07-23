/**
 * ObserverNode.ts
 *
 * Draggable Scenery Node representing the observer in "observer" mode.
 *
 * Visual components:
 *   – Dashed yellow circle indicating the collection radius
 *   – Small filled dot at the observer position (drag to reposition)
 *   – Small handle on the rim of the radius circle (drag to resize radius)
 *
 * Dragging the center dot translates the observer position in model space.
 * Dragging the rim handle adjusts the collection radius.
 */

import type { Property } from "scenerystack/axon";
import type { ModelViewTransform2 } from "scenerystack/phetcommon";
import { Circle, Node, RichDragListener, Text } from "scenerystack/scenery";
import { Tandem } from "scenerystack/tandem";
import { StringManager } from "../../i18n/StringManager.js";
import OpticsLabColors from "../../OpticsLabColors.js";
import {
  DEFAULT_OBSERVER_RADIUS_M,
  DEFAULT_OBSERVER_X_M,
  DEFAULT_OBSERVER_Y_M,
  FONT_11PX,
  HANDLE_LINE_WIDTH,
  OBSERVER_CENTER_DOT_RADIUS_PX,
  OBSERVER_RADIUS_MIN_M,
  OBSERVER_RIM_HANDLE_RADIUS_PX,
} from "../../OpticsLabConstants.js";
import OpticsLabNamespace from "../../OpticsLabNamespace.js";
import type { Observer } from "../model/optics/OpticsTypes.js";

export const DEFAULT_OBSERVER: Observer = {
  position: { x: DEFAULT_OBSERVER_X_M, y: DEFAULT_OBSERVER_Y_M },
  radius: DEFAULT_OBSERVER_RADIUS_M,
};

export class ObserverNode extends Node {
  private readonly modelViewTransform: ModelViewTransform2;
  private readonly observerProperty: Property<Observer | null>;
  private readonly radiusCircle: Circle;
  private readonly centerDot: Circle;
  private readonly labelNode: Text;
  private readonly rimHandle: Circle;

  public constructor(observerProperty: Property<Observer | null>, modelViewTransform: ModelViewTransform2) {
    super();
    this.modelViewTransform = modelViewTransform;
    this.observerProperty = observerProperty;

    // ── Visual components ────────────────────────────────────────────────────
    // This node stays at (0,0); children are repositioned in rebuild() using
    // absolute view coordinates so that drag-listener coordinate frames are
    // never invalidated by a parent-node translation mid-drag.

    this.radiusCircle = new Circle(0, {
      stroke: OpticsLabColors.observerCircleStrokeProperty,
      lineWidth: HANDLE_LINE_WIDTH,
      lineDash: [5, 3],
      fill: OpticsLabColors.observerCircleFillProperty,
      pickable: false,
    });

    this.centerDot = new Circle(OBSERVER_CENTER_DOT_RADIUS_PX, {
      fill: OpticsLabColors.observerDotFillProperty,
      stroke: OpticsLabColors.observerDotStrokeProperty,
      lineWidth: HANDLE_LINE_WIDTH,
      cursor: "move",
    });
    this.centerDot.tagName = "div";
    this.centerDot.focusable = true;
    this.centerDot.accessibleHelpText = StringManager.getInstance().getA11yStrings().observerHelpStringProperty;

    this.labelNode = new Text(StringManager.getInstance().getUIStrings().observerLabelStringProperty, {
      font: FONT_11PX,
      fill: OpticsLabColors.observerLabelFillProperty,
    });

    this.rimHandle = new Circle(OBSERVER_RIM_HANDLE_RADIUS_PX, {
      fill: OpticsLabColors.observerRimFillProperty,
      stroke: OpticsLabColors.observerRimStrokeProperty,
      lineWidth: 1,
      cursor: "ew-resize",
    });

    this.addChild(this.radiusCircle);
    this.addChild(this.centerDot);
    this.addChild(this.labelNode);
    this.addChild(this.rimHandle);

    // ── Center-dot drag — translates observer position ────────────────────────
    // Use start + accumulated delta pattern so pointer tracking is stable.
    // Because this node stays at (0,0), the parent frame never shifts during
    // drag and listener.modelDelta remains accurate throughout the gesture.
    let startPos = { x: 0, y: 0 };
    let accX = 0;
    let accY = 0;
    const centerDrag = new RichDragListener({
      tandem: Tandem.OPTIONAL,
      transform: modelViewTransform,
      start: () => {
        const current = observerProperty.value ?? DEFAULT_OBSERVER;
        startPos = { x: current.position.x, y: current.position.y };
        accX = 0;
        accY = 0;
      },
      drag: (_event, listener) => {
        accX += listener.modelDelta.x;
        accY += listener.modelDelta.y;
        const current = observerProperty.value ?? DEFAULT_OBSERVER;
        observerProperty.value = {
          position: { x: startPos.x + accX, y: startPos.y + accY },
          radius: current.radius,
        };
      },
    });
    this.centerDot.addInputListener(centerDrag);
    this.centerDot.disposeEmitter.addListener(() => centerDrag.dispose());

    // ── Rim-handle drag — resizes collection radius ───────────────────────────
    let startRadius = 0;
    let accR = 0;
    const rimDrag = new RichDragListener({
      tandem: Tandem.OPTIONAL,
      transform: modelViewTransform,
      start: () => {
        startRadius = (observerProperty.value ?? DEFAULT_OBSERVER).radius;
        accR = 0;
      },
      drag: (_event, listener) => {
        accR += listener.modelDelta.x;
        const current = observerProperty.value ?? DEFAULT_OBSERVER;
        observerProperty.value = {
          position: current.position,
          radius: Math.max(OBSERVER_RADIUS_MIN_M, startRadius + accR),
        };
      },
    });
    this.rimHandle.addInputListener(rimDrag);
    this.rimHandle.disposeEmitter.addListener(() => rimDrag.dispose());

    this.rebuild();
    const rebuildBound = () => this.rebuild();
    observerProperty.link(rebuildBound);
    this.disposeEmitter.addListener(() => {
      observerProperty.unlink(rebuildBound);
    });
  }

  private rebuild(): void {
    const obs = this.observerProperty.value ?? DEFAULT_OBSERVER;
    const mvt = this.modelViewTransform;

    const cx = mvt.modelToViewX(obs.position.x);
    const cy = mvt.modelToViewY(obs.position.y);
    const radiusPx = Math.abs(mvt.modelToViewDeltaX(obs.radius));

    // Position children at absolute view coordinates; ObserverNode itself
    // remains at (0,0) so its children's parent frame is always stable.
    this.centerDot.x = cx;
    this.centerDot.y = cy;

    this.labelNode.centerX = cx;
    this.labelNode.bottom = cy - (OBSERVER_CENTER_DOT_RADIUS_PX + 3);

    this.radiusCircle.x = cx;
    this.radiusCircle.y = cy;
    this.radiusCircle.radius = radiusPx;

    this.rimHandle.x = cx + radiusPx;
    this.rimHandle.y = cy;
  }
}

OpticsLabNamespace.register("ObserverNode", ObserverNode);
