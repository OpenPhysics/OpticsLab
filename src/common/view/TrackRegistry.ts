/**
 * TrackRegistry.ts
 *
 * Singleton registry of active Track elements. Used by the drag-snap logic
 * in ViewHelpers to find nearby tracks and project element positions onto them.
 */

import type { Point } from "../model/optics/Geometry.js";

export interface TrackDescriptor {
  scopeId: string;
  getP1: () => Point;
  getP2: () => Point;
}

class TrackRegistryImpl {
  private readonly tracks = new Map<string, TrackDescriptor>();
  private activeScopeId: string | null = null;

  public register(id: string, scopeId: string, getP1: () => Point, getP2: () => Point): void {
    this.tracks.set(id, { scopeId, getP1, getP2 });
  }

  public unregister(id: string): void {
    this.tracks.delete(id);
  }

  public setActiveScope(scopeId: string): void {
    this.activeScopeId = scopeId;
  }

  public clearActiveScope(scopeId: string): void {
    if (this.activeScopeId === scopeId) {
      this.activeScopeId = null;
    }
  }

  public getAllTracks(): ReadonlyArray<{ id: string; p1: Point; p2: Point }> {
    const result: Array<{ id: string; p1: Point; p2: Point }> = [];
    for (const [id, desc] of this.tracks) {
      if (desc.scopeId === this.activeScopeId) {
        result.push({ id, p1: desc.getP1(), p2: desc.getP2() });
      }
    }
    return result;
  }
}

export const trackRegistry = new TrackRegistryImpl();
