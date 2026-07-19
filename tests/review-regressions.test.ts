/**
 * review-regressions.test.ts
 *
 * Regression tests for bugs found in a full code review of the simulation:
 *
 *   1. IdealLens deflected back-side rays with the wrong sign — a converging
 *      lens acted as a diverging lens for rays traveling against its normal.
 *   2. Five element types (AperturedParabolicMirror, BiconvexLens,
 *      BiconcaveLens, PlanoConvexLens, PlanoConcaveLens) serialized with type
 *      keys that deserializeElement did not recognize, silently dropping them
 *      from saved scenes and breaking duplicate + PhET-iO state restore.
 *      Additionally, plano lenses serialize a flat surface as r = Infinity,
 *      which JSON.stringify turns into null — previously a hard parse error.
 *   3. Arc-based elements (ArcMirror, curved DetectorElement, Glass arc edges)
 *      reported bounding boxes of just their control points, but an arc bulges
 *      beyond them (dramatically for arcs > 180°). The spatial index culls by
 *      bounds, so rays could pass straight through the element.
 *   4. Beam-type sources emitted rays without sourceId/rayIndex, so image
 *      detection pooled rays from different sources into one shared group,
 *      producing spurious cross-source image markers.
 */

import { Tandem } from "scenerystack/tandem";
import { describe, expect, it } from "vitest";
import { LineBlocker } from "../src/common/model/blockers/LineBlocker.js";
import { BiconcaveLens } from "../src/common/model/glass/BiconcaveLens.js";
import { BiconvexLens } from "../src/common/model/glass/BiconvexLens.js";
import { IdealLens } from "../src/common/model/glass/IdealLens.js";
import { PlanoConcaveLens } from "../src/common/model/glass/PlanoConcaveLens.js";
import { PlanoConvexLens } from "../src/common/model/glass/PlanoConvexLens.js";
import { SphericalLens } from "../src/common/model/glass/SphericalLens.js";
import { BeamSource } from "../src/common/model/light-sources/BeamSource.js";
import { DivergentBeam } from "../src/common/model/light-sources/DivergentBeam.js";
import { SingleRaySource } from "../src/common/model/light-sources/SingleRaySource.js";
import { AperturedParabolicMirror } from "../src/common/model/mirrors/AperturedParabolicMirror.js";
import { ArcMirror } from "../src/common/model/mirrors/ArcMirror.js";
import { deserializeElement } from "../src/common/model/optics/elementSerialization.js";
import { arcBounds, point } from "../src/common/model/optics/Geometry.js";
import { OpticsScene } from "../src/common/model/optics/OpticsScene.js";
import type { SimulationRay } from "../src/common/model/optics/OpticsTypes.js";
import { RayTracer } from "../src/common/model/optics/RayTracer.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRay(origin: { x: number; y: number }, direction: { x: number; y: number }): SimulationRay {
  return {
    origin: point(origin.x, origin.y),
    direction: point(direction.x, direction.y),
    brightnessS: 0.5,
    brightnessP: 0.5,
    gap: false,
    isNew: false,
  };
}

/** JSON round-trip exactly as OpticsScene.toJSON / fromJSON does per element. */
function roundTrip(el: { serialize(): Record<string, unknown>; id: string }): ReturnType<typeof deserializeElement> {
  const state = JSON.parse(JSON.stringify({ ...el.serialize(), id: el.id })) as Record<string, unknown>;
  return deserializeElement(state);
}

// ── 1. IdealLens back-side deflection ───────────────────────────────────────

describe("IdealLens deflection sign", () => {
  // Lens on the y-axis from (0,-1) to (0,1); segmentNormal is (+1, 0), f = 1.
  const lens = (): IdealLens => new IdealLens(point(0, -1), point(0, 1), 1);

  it("converges a front-side parallel ray to the focal point", () => {
    const l = lens();
    const ray = makeRay({ x: -2, y: 0.5 }, { x: 1, y: 0 });
    const hit = l.checkRayIntersection(ray);
    expect(hit).not.toBeNull();
    if (!hit) {
      return;
    }
    const result = l.onRayIncident(ray, hit);
    expect(result.isAbsorbed).toBe(false);
    const dir = result.outgoingRay?.direction;
    expect(dir).toBeDefined();
    if (!dir) {
      return;
    }
    // Outgoing ray from (0, 0.5) must pass through the focus (1, 0):
    // direction ∝ (1, -0.5).
    expect(dir.x).toBeGreaterThan(0);
    expect(dir.y / dir.x).toBeCloseTo(-0.5, 10);
  });

  it("converges a back-side parallel ray to the focal point on the exit side", () => {
    const l = lens();
    const ray = makeRay({ x: 2, y: 0.5 }, { x: -1, y: 0 });
    const hit = l.checkRayIntersection(ray);
    expect(hit).not.toBeNull();
    if (!hit) {
      return;
    }
    const result = l.onRayIncident(ray, hit);
    expect(result.isAbsorbed).toBe(false);
    const dir = result.outgoingRay?.direction;
    expect(dir).toBeDefined();
    if (!dir) {
      return;
    }
    // Outgoing ray from (0, 0.5) must pass through the focus (-1, 0):
    // direction ∝ (-1, -0.5). Before the fix the deflection sign was
    // inverted, sending the ray away from the axis (diverging behaviour).
    expect(dir.x).toBeLessThan(0);
    expect(dir.y / dir.x).toBeCloseTo(0.5, 10);
  });
});

// ── 2. Missing element deserialization ──────────────────────────────────────

describe("serialization round-trip of previously missing element types", () => {
  it("restores an AperturedParabolicMirror", () => {
    const src = new AperturedParabolicMirror(point(-2, 0), point(2, 0), point(0, 1), 0.5);
    const restored = roundTrip(src);
    expect(restored).toBeInstanceOf(AperturedParabolicMirror);
    const m = restored as AperturedParabolicMirror;
    expect(m.id).toBe(src.id);
    expect(m.p3).toEqual(src.p3);
    expect(m.apertureHalfWidth).toBe(0.5);
  });

  it("restores a BiconvexLens with its geometry", () => {
    const src = new BiconvexLens(point(0, -1), point(0, 1), 3, 1.6);
    const restored = roundTrip(src);
    expect(restored).toBeInstanceOf(BiconvexLens);
    const l = restored as BiconvexLens;
    expect(l.refIndex).toBe(1.6);
    const { d, r1, r2 } = l.getDR1R2();
    const orig = src.getDR1R2();
    expect(d).toBeCloseTo(orig.d, 6);
    expect(r1).toBeCloseTo(orig.r1, 6);
    expect(r2).toBeCloseTo(orig.r2, 6);
  });

  it("restores a BiconcaveLens", () => {
    const src = new BiconcaveLens(point(0, -1), point(0, 1), 3, 1.5);
    const restored = roundTrip(src);
    expect(restored).toBeInstanceOf(BiconcaveLens);
    const { r1, r2 } = (restored as BiconcaveLens).getDR1R2();
    expect(r1).toBeLessThan(0);
    expect(r2).toBeGreaterThan(0);
  });

  it("restores a PlanoConvexLens whose flat surface serialized as null", () => {
    const src = new PlanoConvexLens(point(0, -1), point(0, 1), 3, 1.5);
    // Flat surface: r1 is Infinity in the model, null after JSON.stringify.
    const json = JSON.parse(JSON.stringify({ ...src.serialize(), id: src.id })) as Record<string, unknown>;
    expect(json["r1"]).toBeNull();
    const restored = deserializeElement(json);
    expect(restored).toBeInstanceOf(PlanoConvexLens);
    const { r1, r2 } = (restored as PlanoConvexLens).getDR1R2();
    expect(Number.isFinite(r1)).toBe(false);
    expect(r2).toBeLessThan(0);
  });

  it("restores a PlanoConcaveLens", () => {
    const src = new PlanoConcaveLens(point(0, -1), point(0, 1), 3, 1.5);
    const restored = roundTrip(src);
    expect(restored).toBeInstanceOf(PlanoConcaveLens);
    const { r1, r2 } = (restored as PlanoConcaveLens).getDR1R2();
    expect(Number.isFinite(r1)).toBe(false);
    expect(r2).toBeGreaterThan(0);
  });

  it("restores a generic SphericalLens with one flat surface (r → null in JSON)", () => {
    const src = new SphericalLens(point(0, -1), point(0, 1), Infinity, -3, 1.5);
    const restored = roundTrip(src);
    expect(restored).toBeInstanceOf(SphericalLens);
  });

  it("duplicateElement works for the previously missing types", () => {
    const scene = new OpticsScene(Tandem.OPT_OUT);
    const lens = new BiconvexLens(point(0, -1), point(0, 1), 3, 1.5);
    const mirror = new AperturedParabolicMirror(point(-2, 0), point(2, 0), point(0, 1), 0.5);
    scene.addElement(lens, false);
    scene.addElement(mirror, false);

    expect(scene.duplicateElement(lens.id, point(1, 0))).toBeInstanceOf(BiconvexLens);
    expect(scene.duplicateElement(mirror.id, point(1, 0))).toBeInstanceOf(AperturedParabolicMirror);
  });
});

// ── 3. Arc bounding boxes ───────────────────────────────────────────────────

describe("arc-aware bounding boxes", () => {
  it("arcBounds includes circle extremes on a major arc", () => {
    // Major arc of the unit circle: endpoints near the top, passing through
    // the bottom (0,-1) — spans ~340°.
    const a = (Math.PI * 80) / 180;
    const p1 = point(Math.cos(a), Math.sin(a));
    const p2 = point(-Math.cos(a), Math.sin(a));
    const p3 = point(0, -1);
    const b = arcBounds(p1, p2, p3);
    expect(b.minX).toBeCloseTo(-1, 6);
    expect(b.maxX).toBeCloseTo(1, 6);
    expect(b.minY).toBeCloseTo(-1, 6);
    expect(b.maxY).toBeCloseTo(Math.sin(a), 6);
  });

  it("arcBounds of a minor arc does not include the far side of the circle", () => {
    // Minor arc across the top of the unit circle.
    const a = (Math.PI * 30) / 180;
    const p1 = point(-Math.cos(a), Math.sin(a));
    const p2 = point(Math.cos(a), Math.sin(a));
    const p3 = point(0, 1);
    const b = arcBounds(p1, p2, p3);
    expect(b.maxY).toBeCloseTo(1, 6);
    expect(b.minY).toBeCloseTo(Math.sin(a), 6);
  });

  it("rays hit the bulge of a wide ArcMirror in a spatially indexed scene", () => {
    // Major-arc mirror around the origin (radius-10 circle, gap at the top).
    // The bulge at (-10, 0) sits many spatial-index cells away from the
    // bounding box of the three control points, so an underestimated box
    // makes the tracer miss the mirror entirely.
    const r = 10;
    const a = (Math.PI * 80) / 180;
    const mirror = new ArcMirror(
      point(r * Math.cos(a), r * Math.sin(a)),
      point(-r * Math.cos(a), r * Math.sin(a)),
      point(0, -r),
    );

    // A ray traveling straight down the x = -9 column. Its cell path never
    // overlaps the narrow control-point box (|x| ≤ r·cos80° ≈ 1.7), so with
    // underestimated bounds the mirror is never even tested for intersection.
    const source = new SingleRaySource(point(-9, 13), point(-9, 12), 1, 550);

    // Distant finite elements so the spatial index uses grid traversal
    // instead of the ≤4-element return-everything fast path.
    const blockers = [0, 1, 2, 3].map((i) => new LineBlocker(point(50, 10 * i), point(51, 10 * i)));

    const tracer = new RayTracer([source, mirror, ...blockers]);
    const result = tracer.trace();

    // The ray must terminate on the mirror at (-9, +sqrt(r² - 81)) rather
    // than escaping through it.
    const hitY = Math.sqrt(r * r - 81);
    const hitSegment = result.segments.find(
      (s) => !s.isExtension && Math.abs(s.p2.x + 9) < 1e-6 && Math.abs(s.p2.y - hitY) < 1e-6,
    );
    expect(hitSegment).toBeDefined();
  });
});

// ── 4. Beam sources tag rays with sourceId/rayIndex ─────────────────────────

describe("beam-type sources tag emitted rays for per-source grouping", () => {
  it("BeamSource rays carry sourceId and sequential rayIndex", () => {
    const src = new BeamSource(point(0, -1), point(0, 1), 0.5, 550);
    const rays = src.emitRays(10, "images");
    expect(rays.length).toBeGreaterThan(1);
    for (const [i, ray] of rays.entries()) {
      expect(ray.sourceId).toBe(src.id);
      expect(ray.rayIndex).toBe(i);
    }
  });

  it("DivergentBeam rays carry sourceId and sequential rayIndex", () => {
    const src = new DivergentBeam(point(0, -1), point(0, 1), 0.5, 550, 20);
    const rays = src.emitRays(10, "images");
    expect(rays.length).toBeGreaterThan(1);
    for (const [i, ray] of rays.entries()) {
      expect(ray.sourceId).toBe(src.id);
      expect(ray.rayIndex).toBe(i);
    }
  });

  it("SingleRaySource ray carries sourceId", () => {
    const src = new SingleRaySource(point(0, 0), point(1, 0), 1, 550);
    const rays = src.emitRays(10, "images");
    expect(rays).toHaveLength(1);
    expect(rays[0]?.sourceId).toBe(src.id);
  });
});
