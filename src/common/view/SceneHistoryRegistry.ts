/**
 * SceneHistoryRegistry.ts
 *
 * Module-level singleton that gives view helpers (ViewHelpers.ts,
 * EditControlHelpers.ts) access to the scene's CommandHistory without
 * threading the reference through every call site.
 *
 * Lifecycle:
 *   A visible RayTracingCommonView registers its model.scene.history and
 *   conditionally clears it when that screen becomes inactive.
 *   Drag and slider helpers call sceneHistoryRegistry.history to get the
 *   CommandHistory instance (null-safe: no-op when history is not set).
 *
 * Pattern mirrors ViewSnapState.ts and TrackRegistry.ts.
 */

import OpticsLabNamespace from "../../OpticsLabNamespace.js";
import type { CommandHistory } from "../model/optics/CommandHistory.js";

class SceneHistoryRegistryImpl {
  private _history: CommandHistory | null = null;

  /** Set the history for the currently visible screen. */
  public setHistory(history: CommandHistory | null): void {
    this._history = history;
  }

  /** Clear a screen's history only if it is still the active registration. */
  public clearHistory(history: CommandHistory): void {
    if (this._history === history) {
      this._history = null;
    }
  }

  /** Returns the active CommandHistory, or null when not wired up. */
  public get history(): CommandHistory | null {
    return this._history;
  }
}

export const sceneHistoryRegistry = new SceneHistoryRegistryImpl();

OpticsLabNamespace.register("sceneHistoryRegistry", sceneHistoryRegistry);
