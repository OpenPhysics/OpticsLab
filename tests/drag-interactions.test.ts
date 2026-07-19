/**
 * drag-interactions.test.ts
 *
 * Regression tests for drag/resize interaction bugs found in code review:
 *
 *   1. createDragHistoryHooks — the shared start/end hooks that make custom
 *      geometry drags (lens curvature, prism scale/rotation) undoable.
 *   2. GlassView previously disposed and recreated its bodyDragListener when
 *      a prism vertex was added or removed. External observers
 *      (RayTracingCommonView) link to bodyDragListener.isPressedProperty once
 *      at view creation, so the recreation silently broke drag-layer
 *      reparenting and drop-on-carousel deletion. The listener must now be
 *      stable across vertex changes.
 *   3. Prism vertex add/remove are recorded as undoable commands.
 */

import { Vector2 } from "scenerystack/dot";
import { ModelViewTransform2 } from "scenerystack/phetcommon";
import { describe, expect, it } from "vitest";
import { Glass } from "../src/common/model/glass/Glass.js";
import { CommandHistory } from "../src/common/model/optics/CommandHistory.js";
import { GlassView } from "../src/common/view/glass/GlassView.js";
import { sceneHistoryRegistry } from "../src/common/view/SceneHistoryRegistry.js";
import { createDragHistoryHooks } from "../src/common/view/ViewHelpers.js";

const mvt = ModelViewTransform2.createSinglePointScaleInvertedYMapping(Vector2.ZERO, new Vector2(500, 400), 100);

/** Run a test body with a fresh CommandHistory installed in the registry. */
function withHistory<T>(body: (history: CommandHistory) => T): T {
  const history = new CommandHistory();
  sceneHistoryRegistry.setHistory(history);
  try {
    return body(history);
  } finally {
    sceneHistoryRegistry.setHistory(null);
  }
}

/** Fire the pointer-down handler of the first input listener on a node. */
function fireDown(node: { inputListeners: unknown[] }): void {
  const listener = node.inputListeners[0] as { down?: (event: { handle: () => void }) => void };
  listener.down?.({
    handle: () => {
      /* no-op */
    },
  });
}

// ── 1. createDragHistoryHooks ───────────────────────────────────────────────

describe("createDragHistoryHooks", () => {
  it("records an undoable snapshot command for a changed drag", () => {
    withHistory((history) => {
      const state = { x: 1, y: 2 };
      const hooks = createDragHistoryHooks(
        "Test drag",
        () => [state.x, state.y],
        (v) => {
          state.x = v[0] ?? state.x;
          state.y = v[1] ?? state.y;
        },
      );

      hooks.start();
      state.x = 10;
      state.y = 20;
      hooks.end();

      expect(history.canUndo).toBe(true);
      history.undo();
      expect(state).toEqual({ x: 1, y: 2 });
      history.redo();
      expect(state).toEqual({ x: 10, y: 20 });
    });
  });

  it("records nothing when the drag did not change the state", () => {
    withHistory((history) => {
      const state = { x: 1 };
      const hooks = createDragHistoryHooks(
        "Test drag",
        () => [state.x],
        (v) => {
          state.x = v[0] ?? state.x;
        },
      );
      hooks.start();
      hooks.end();
      expect(history.canUndo).toBe(false);
    });
  });
});

// ── 2 & 3. GlassView vertex add/remove ──────────────────────────────────────

/** Access GlassView internals that the tests must reach. */
interface GlassViewInternals {
  addButtons: Array<{ inputListeners: unknown[] }>;
  handles: Array<{ children: Array<{ inputListeners: unknown[] }> }>;
  bodyDragPoints: unknown[];
}

function makeTriangleGlassView(): { glass: Glass; view: GlassView; internals: GlassViewInternals } {
  const glass = new Glass(
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 },
    ],
    1.5,
  );
  const view = new GlassView(glass, mvt);
  return { glass, view, internals: view as unknown as GlassViewInternals };
}

describe("GlassView vertex add/remove", () => {
  it("keeps the same bodyDragListener instance across a vertex add", () => {
    withHistory(() => {
      const { glass, view, internals } = makeTriangleGlassView();
      const listenerBefore = view.bodyDragListener;
      expect(internals.bodyDragPoints).toHaveLength(3);

      fireDown(internals.addButtons[0] as { inputListeners: unknown[] });

      expect(glass.path).toHaveLength(4);
      // The listener must be the exact same instance — recreating it severs
      // the isPressedProperty link held by RayTracingCommonView.
      expect(view.bodyDragListener).toBe(listenerBefore);
      // The stable points array must now cover the new vertex.
      expect(internals.bodyDragPoints).toHaveLength(4);

      view.dispose();
      glass.dispose();
    });
  });

  it("records vertex add as an undoable command", () => {
    withHistory((history) => {
      const { glass, view, internals } = makeTriangleGlassView();

      fireDown(internals.addButtons[1] as { inputListeners: unknown[] });
      expect(glass.path).toHaveLength(4);
      expect(history.canUndo).toBe(true);

      history.undo();
      expect(glass.path).toHaveLength(3);
      history.redo();
      expect(glass.path).toHaveLength(4);

      view.dispose();
      glass.dispose();
    });
  });

  it("records vertex remove as an undoable command that restores the vertex", () => {
    withHistory((history) => {
      const { glass, view, internals } = makeTriangleGlassView();

      // Grow to 4 vertices first (remove buttons only exist above 3).
      fireDown(internals.addButtons[0] as { inputListeners: unknown[] });
      expect(glass.path).toHaveLength(4);
      const removedVertex = glass.path[1];

      // Each handle carries its remove button as a child.
      const handleForVertex1 = internals.handles[1] as { children: Array<{ inputListeners: unknown[] }> };
      const removeButton = handleForVertex1.children.find((c) => c.inputListeners.length > 0);
      expect(removeButton).toBeDefined();
      if (!removeButton) {
        return;
      }
      fireDown(removeButton);
      expect(glass.path).toHaveLength(3);
      expect(glass.path).not.toContain(removedVertex);

      history.undo();
      expect(glass.path).toHaveLength(4);
      expect(glass.path[1]).toBe(removedVertex);

      view.dispose();
      glass.dispose();
    });
  });
});
