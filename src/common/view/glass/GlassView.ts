/**
 * GlassView.ts
 *
 * Scenery node for a Glass element whose boundary may include both line
 * segments and circular arcs. Renders the closed path as a translucent
 * blue filled shape with a blue outline.
 *
 * For plain prisms (no arc points), supports adding vertices on edges and
 * removing vertices via on-screen controls.
 *
 * Replaces the former PolygonGlassView (which only handled line segments).
 */

import { BooleanProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import type { ModelViewTransform2 } from "scenerystack/phetcommon";
import { Circle, Node, Path, type RichDragListener } from "scenerystack/scenery";
import { Tandem } from "scenerystack/tandem";
import OpticsLabColors, { glassFill } from "../../../OpticsLabColors.js";
import {
  GLASS_STROKE_WIDTH,
  HANDLE_LINE_WIDTH,
  HANDLE_RADIUS,
  PRISM_EDGE_ADD_RADIUS,
  PRISM_VERTEX_REMOVE_RADIUS,
} from "../../../OpticsLabConstants.js";
import OpticsLabNamespace from "../../../OpticsLabNamespace.js";
import type { Glass, GlassPathPoint } from "../../model/glass/Glass.js";
import {
  distance,
  linesIntersection,
  type Point,
  perpendicularBisector,
  point,
  segment,
} from "../../model/optics/Geometry.js";
import { BaseOpticalElementView } from "../BaseOpticalElementView.js";
import { sceneHistoryRegistry } from "../SceneHistoryRegistry.js";
import { attachTranslationDrag, type DragHandle, makeEndpointHandle, unlinkHandleVisibility } from "../ViewHelpers.js";

export class GlassView extends BaseOpticalElementView {
  private _bodyDragListener!: RichDragListener;
  /**
   * Stable array backing the body drag listener. Contents are refreshed in
   * place by rebuildHandlesAndDragListener() when the path gains or loses
   * vertices; the listener itself is created exactly once.
   */
  private readonly bodyDragPoints: Array<{ get: () => Point; set: (p: Point) => void }> = [];
  private readonly glassPath: Path;
  private readonly handlesContainer: Node;
  private handles: DragHandle[] = [];
  private handleVerts: GlassPathPoint[] = [];
  private addButtons: Node[] = [];
  private addButtonEdgeIndices: number[] = [];
  private readonly isPrism: boolean;
  private readonly handleVertsOption: GlassPathPoint[] | undefined;
  protected readonly glassTandem: Tandem;
  /** Per-screen property controlling visibility of vertex drag handles. */
  protected readonly handlesVisibleProperty: TReadOnlyProperty<boolean>;

  public get bodyDragListener(): RichDragListener {
    return this._bodyDragListener;
  }

  protected readonly glass: Glass;
  protected readonly modelViewTransform: ModelViewTransform2;
  public constructor(
    glass: Glass,
    modelViewTransform: ModelViewTransform2,
    tandem?: Tandem,
    handleVerts?: GlassPathPoint[],
    handlesVisibleProperty?: TReadOnlyProperty<boolean>,
  ) {
    super();
    this.glass = glass;
    this.modelViewTransform = modelViewTransform;
    this.glassTandem = tandem ?? Tandem.OPT_OUT;
    // Use the per-screen property when provided; otherwise default to always-visible
    // so that uninstrumented usages (e.g. the SVG exporter) still render handles.
    this.handlesVisibleProperty = handlesVisibleProperty ?? new BooleanProperty(true);

    this.glassPath = new Path(null, {
      fill: glassFill(glass.refIndex),
      stroke: OpticsLabColors.glassStrokeProperty,
      lineWidth: GLASS_STROKE_WIDTH,
    });
    this.addChild(this.glassPath);

    this.handlesContainer = new Node();
    this.addChild(this.handlesContainer);

    this.handleVertsOption = handleVerts;
    // Enable free vertex handles only for plain (untyped) Glass polygons.
    // Typed prisms (RightAnglePrism, SlabGlass, etc.) expose dimension sliders
    // instead, so vertex dragging is intentionally disabled for them.
    this.isPrism = handleVerts === undefined && glass.type === "Glass";
    this.rebuildHandlesAndDragListener();

    this.rebuild();
  }

  /**
   * Rebuild handles, add/remove buttons (for prisms), and body drag listener
   * from the current glass.path. Call when path length changes.
   */
  protected rebuildHandlesAndDragListener(): void {
    // Dispose old handles and their attached RichDragListeners before recreating.
    // removeAllChildren() alone only detaches; it does not dispose, so the old
    // listeners would otherwise be retained by the closures that capture `this`.
    for (const handle of this.handles) {
      unlinkHandleVisibility(handle);
      handle.dispose();
    }
    for (const btn of this.addButtons) {
      btn.dispose();
    }
    this.handles = [];
    this.addButtons = [];
    this.handlesContainer.removeAllChildren();

    this.handleVerts = this.isPrism ? [...this.glass.path] : (this.handleVertsOption ?? []);
    this.handles = this.handleVerts.map((vert, index) => {
      const handle = makeEndpointHandle(
        (): Point => ({ x: vert.x, y: vert.y }),
        (p) => {
          vert.x = p.x;
          vert.y = p.y;
        },
        () => {
          this.rebuild();
        },
        this.modelViewTransform,
        this.glassTandem.createTandem(`vertexDragListener${index}`),
        this.handlesVisibleProperty,
      );
      if (this.isPrism && this.glass.path.length > 3) {
        const removeBtn = this.createRemoveButton();
        this.attachRemoveButtonListener(removeBtn, vert);
        handle.addChild(removeBtn);
      }
      this.handlesContainer.addChild(handle);

      return handle;
    });

    if (this.isPrism) {
      const path = this.glass.path;
      const n = path.length;
      this.addButtons = [];
      this.addButtonEdgeIndices = [];
      for (let i = 0; i < n; i++) {
        const addBtn = this.createAddButton(i);
        this.addButtons.push(addBtn);
        this.addButtonEdgeIndices.push(i);
        this.handlesContainer.addChild(addBtn);
      }
    }

    // Repopulate the stable points array in place rather than recreating the
    // body drag listener. External observers (RayTracingCommonView) link to
    // bodyDragListener.isPressedProperty once at view creation — disposing and
    // recreating the listener here would sever that link, silently breaking
    // drag-layer reparenting and drop-on-carousel deletion after a vertex
    // add/remove. attachTranslationDrag reads the array contents afresh on
    // every drag start, so in-place mutation is safe.
    this.bodyDragPoints.length = 0;
    for (const v of this.glass.path) {
      this.bodyDragPoints.push({
        get: (): Point => ({ x: v.x, y: v.y }),
        set: (p: Point): void => {
          v.x = p.x;
          v.y = p.y;
        },
      });
    }
    if (!this._bodyDragListener) {
      this._bodyDragListener = attachTranslationDrag(
        this.glassPath,
        this.bodyDragPoints,
        () => {
          this.rebuild();
        },
        this.modelViewTransform,
        this.glassTandem.createTandem("bodyDragListener"),
      );
    }
  }

  private createAddButton(edgeIndex: number): Node {
    const path = this.glass.path;
    const n = path.length;
    const i = edgeIndex % n;
    const current = path[i];
    const next = path[(i + 1) % n];
    const midX = current && next ? (current.x + next.x) / 2 : 0;
    const midY = current && next ? (current.y + next.y) / 2 : 0;

    const plusShape = new Shape().moveTo(-3, 0).lineTo(3, 0).moveTo(0, -3).lineTo(0, 3);

    const addEdgeButton = new Node({
      x: this.modelViewTransform.modelToViewX(midX),
      y: this.modelViewTransform.modelToViewY(midY),
      cursor: "pointer",
      children: [
        new Circle(PRISM_EDGE_ADD_RADIUS, {
          fill: OpticsLabColors.prismAddFillProperty,
          stroke: OpticsLabColors.prismAddStrokeProperty,
          lineWidth: HANDLE_LINE_WIDTH,
        }),
        new Path(plusShape, { stroke: OpticsLabColors.prismAddStrokeProperty, lineWidth: HANDLE_LINE_WIDTH }),
      ],
    });

    addEdgeButton.addInputListener({
      down: (event: { handle: () => void }) => {
        event.handle();
        const glassPath = this.glass.path;
        const len = glassPath.length;
        const idx = edgeIndex % len;
        const a = glassPath[idx];
        const b = glassPath[(idx + 1) % len];
        if (a && b) {
          const clickMidX = (a.x + b.x) / 2;
          const clickMidY = (a.y + b.y) / 2;
          this.glass.addVertexOnEdge(edgeIndex, { x: clickMidX, y: clickMidY });
          this.refreshAfterVertexChange();

          // Record as an undoable command (already applied, so push not execute).
          // The inserted vertex is tracked by object identity so undo/redo stay
          // correct even after later drags mutate its coordinates.
          const insertAt = (idx + 1) % len;
          const inserted = glassPath[insertAt];
          const history = sceneHistoryRegistry.history;
          if (history && inserted) {
            history.push({
              description: "Add vertex",
              execute: () => {
                if (!glassPath.includes(inserted)) {
                  glassPath.splice(Math.min(insertAt, glassPath.length), 0, inserted);
                }
                this.refreshAfterVertexChange();
              },
              undo: () => {
                const insertedIndex = glassPath.indexOf(inserted);
                if (insertedIndex >= 0) {
                  this.glass.removeVertex(insertedIndex);
                }
                this.refreshAfterVertexChange();
              },
            });
          }
        }
      },
    });

    return addEdgeButton;
  }

  private createRemoveButton(): Node {
    const xShape = new Shape().moveTo(-2.5, -2.5).lineTo(2.5, 2.5).moveTo(2.5, -2.5).lineTo(-2.5, 2.5);

    const removeVertexButton = new Node({
      x: HANDLE_RADIUS + PRISM_VERTEX_REMOVE_RADIUS,
      y: -HANDLE_RADIUS - PRISM_VERTEX_REMOVE_RADIUS,
      cursor: "pointer",
      children: [
        new Circle(PRISM_VERTEX_REMOVE_RADIUS, {
          fill: OpticsLabColors.prismRemoveFillProperty,
          stroke: OpticsLabColors.prismRemoveStrokeProperty,
          lineWidth: HANDLE_LINE_WIDTH,
        }),
        new Path(xShape, { stroke: OpticsLabColors.prismRemoveStrokeProperty, lineWidth: HANDLE_LINE_WIDTH }),
      ],
    });

    return removeVertexButton;
  }

  private attachRemoveButtonListener(removeBtn: Node, vert: GlassPathPoint): void {
    removeBtn.addInputListener({
      down: (event: { handle: () => void }) => {
        event.handle();
        const idx = this.glass.path.indexOf(vert);
        if (idx >= 0 && this.glass.removeVertex(idx)) {
          this.refreshAfterVertexChange();

          // Record as an undoable command (already applied, so push not execute).
          const history = sceneHistoryRegistry.history;
          if (history) {
            history.push({
              description: "Remove vertex",
              execute: () => {
                const i = this.glass.path.indexOf(vert);
                if (i >= 0) {
                  this.glass.removeVertex(i);
                }
                this.refreshAfterVertexChange();
              },
              undo: () => {
                this.glass.path.splice(Math.min(idx, this.glass.path.length), 0, vert);
                this.refreshAfterVertexChange();
              },
            });
          }
        }
      },
    });
  }

  /**
   * Refresh handles and geometry after the path gained or lost a vertex.
   * Safe to call from undo/redo commands that may outlive this view: the
   * model mutation has already happened, so a disposed view just skips the
   * visual refresh (a fresh view built from the model will be correct).
   */
  private refreshAfterVertexChange(): void {
    if (this.isDisposed) {
      return;
    }
    this.rebuildHandlesAndDragListener();
    this.rebuild();
  }

  /**
   * Dispose handles inside handlesContainer before the parent class disposes
   * the container itself. BaseOpticalElementView.dispose() iterates direct
   * children, but Node.dispose() does NOT recursively dispose grandchildren,
   * so handles and their attached RichDragListeners would otherwise be leaked.
   * The bodyDragListener is disposed by super.dispose(); do not dispose it here.
   */
  public override dispose(): void {
    for (const handle of this.handles) {
      unlinkHandleVisibility(handle);
      // Remove input listeners from any remove-vertex buttons (children of handle)
      // before disposal. Node.dispose() does not call removeAllInputListeners(), so
      // listeners that capture `this` (GlassView) would otherwise remain reachable
      // through the handle→listener→this reference chain.
      for (const child of handle.children) {
        for (const listener of child.inputListeners) {
          child.removeInputListener(listener);
        }
      }
      handle.dispose();
    }
    for (const btn of this.addButtons) {
      // Explicitly remove input listeners before disposal so that closures
      // capturing `this` (GlassView) do not extend the view's lifetime.
      for (const listener of btn.inputListeners) {
        btn.removeInputListener(listener);
      }
      btn.dispose();
    }
    this.handles = [];
    this.addButtons = [];
    // Remove the body drag listener from glassPath before super.dispose() disposes
    // it. Without this, glassPath._inputListeners retains a reference to the
    // disposed RichDragListener whose drag closure captures `this`, creating a
    // retention cycle through the glassPath field.
    this.glassPath.removeInputListener(this._bodyDragListener);
    super.dispose();
  }

  protected override _doRebuild(): void {
    const pathPoints = this.glass.path;
    const n = pathPoints.length;

    if (n < 3) {
      this.glassPath.shape = null;
      this.repositionHandles();
      return;
    }

    const shape = new Shape();
    const first = pathPoints[0] as GlassPathPoint;
    shape.moveTo(this.modelViewTransform.modelToViewX(first.x), this.modelViewTransform.modelToViewY(first.y));

    for (let i = 0; i < n; i++) {
      const current = pathPoints[i % n] as GlassPathPoint;
      const next = pathPoints[(i + 1) % n] as GlassPathPoint;

      if (next.arc && !current.arc) {
        const after = pathPoints[(i + 2) % n] as GlassPathPoint;
        this.addArcToShape(shape, current, next, after);
      } else if (!(next.arc || current.arc)) {
        shape.lineTo(this.modelViewTransform.modelToViewX(next.x), this.modelViewTransform.modelToViewY(next.y));
      }
    }
    shape.close();

    this.glassPath.fill = glassFill(this.glass.refIndex);
    this.glassPath.shape = shape;
    this.repositionHandles();
  }

  private addArcToShape(
    shape: Shape,
    p1pt: GlassPathPoint,
    arcControlPoint: GlassPathPoint,
    p2pt: GlassPathPoint,
  ): void {
    // All geometry computed in model space
    const p1 = point(p1pt.x, p1pt.y);
    const p3 = point(arcControlPoint.x, arcControlPoint.y);
    const p2 = point(p2pt.x, p2pt.y);

    const center = linesIntersection(perpendicularBisector(segment(p1, p3)), perpendicularBisector(segment(p2, p3)));

    if (!(center && Number.isFinite(center.x) && Number.isFinite(center.y))) {
      shape.lineTo(this.modelViewTransform.modelToViewX(p2.x), this.modelViewTransform.modelToViewY(p2.y));
      return;
    }

    const r = distance(center, p3); // model radius
    const a1 = Math.atan2(p1.y - center.y, p1.x - center.x);
    const a2 = Math.atan2(p2.y - center.y, p2.x - center.x);
    const a3 = Math.atan2(p3.y - center.y, p3.x - center.x);

    // In canvas (y-down) the angle of a model point is -a_model.  Going
    // clockwise in canvas (anticlockwise=false) means increasing canvas angle.
    // The clockwise canvas distance from -a1 to an angle -aX equals
    // (a1 - aX + 2π) % 2π.  The arc reaches the control point via the short
    // (clockwise) route when that distance is less than the distance to the
    // end point; otherwise the counterclockwise route passes through it.
    const tau = 2 * Math.PI;
    const cwCanvas1ToCtrl = (((a1 - a3) % tau) + tau) % tau;
    const cwCanvas1ToEnd = (((a1 - a2) % tau) + tau) % tau;
    const acw = cwCanvas1ToCtrl >= cwCanvas1ToEnd;

    // Convert center and radius to view space; negate angles for y-inversion
    const vcx = this.modelViewTransform.modelToViewX(center.x);
    const vcy = this.modelViewTransform.modelToViewY(center.y);
    const vr = Math.abs(this.modelViewTransform.modelToViewDeltaX(r));
    shape.arc(vcx, vcy, vr, -a1, -a2, acw);
  }

  private repositionHandles(): void {
    for (const h of this.handles) {
      h.syncToModel();
    }
    for (let i = 0; i < this.addButtons.length; i++) {
      const addEdgeButton = this.addButtons[i];
      const edgeIdx = this.addButtonEdgeIndices[i];
      if (addEdgeButton !== undefined && edgeIdx !== undefined) {
        const path = this.glass.path;
        const n = path.length;
        const idx = edgeIdx % n;
        const current = path[idx];
        const next = path[(idx + 1) % n];
        if (current && next) {
          const midX = (current.x + next.x) / 2;
          const midY = (current.y + next.y) / 2;
          addEdgeButton.x = this.modelViewTransform.modelToViewX(midX);
          addEdgeButton.y = this.modelViewTransform.modelToViewY(midY);
        }
      }
    }
  }
}

OpticsLabNamespace.register("GlassView", GlassView);
