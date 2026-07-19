/**
 * Deserialization of optical elements from plain objects (saved scenes, PhET-iO state).
 *
 * Most element types follow a uniform pattern: validate a fixed set of point/number
 * fields, call the constructor, and restore the serialized ID.  These are handled
 * data-driven via the DEFS map so that adding a new element type only requires
 * one schema entry.  The four special cases (Glass, SphericalLens, DetectorElement,
 * FiberOpticElement) keep explicit code because they have irregular validation or
 * post-construction steps that do not fit the shared loop.
 */

import { ARCHETYPE_DEFAULT_WAVELENGTH_NM, DEFAULT_BEAM_BRIGHTNESS } from "../../../OpticsLabConstants.js";
import {
  ELEMENT_TYPE_APERTURE,
  ELEMENT_TYPE_APERTURED_PARABOLIC_MIRROR,
  ELEMENT_TYPE_ARC_MIRROR,
  ELEMENT_TYPE_ARC_SOURCE,
  ELEMENT_TYPE_BEAM,
  ELEMENT_TYPE_BEAM_SPLITTER,
  ELEMENT_TYPE_BICONCAVE_LENS,
  ELEMENT_TYPE_BICONVEX_LENS,
  ELEMENT_TYPE_CIRCLE_GLASS,
  ELEMENT_TYPE_CONTINUOUS_SPECTRUM_SOURCE,
  ELEMENT_TYPE_DETECTOR,
  ELEMENT_TYPE_DIVERGENT_BEAM,
  ELEMENT_TYPE_DOVE_PRISM,
  ELEMENT_TYPE_EQUILATERAL_PRISM,
  ELEMENT_TYPE_FIBER_OPTIC,
  ELEMENT_TYPE_GLASS,
  ELEMENT_TYPE_IDEAL_LENS,
  ELEMENT_TYPE_IDEAL_MIRROR,
  ELEMENT_TYPE_LINE_BLOCKER,
  ELEMENT_TYPE_PARABOLIC_MIRROR,
  ELEMENT_TYPE_PARALLELOGRAM_PRISM,
  ELEMENT_TYPE_PLANE_GLASS,
  ELEMENT_TYPE_PLANO_CONCAVE_LENS,
  ELEMENT_TYPE_PLANO_CONVEX_LENS,
  ELEMENT_TYPE_POINT_SOURCE,
  ELEMENT_TYPE_PORRO_PRISM,
  ELEMENT_TYPE_REFLECTION_GRATING,
  ELEMENT_TYPE_RIGHT_ANGLE_PRISM,
  ELEMENT_TYPE_SEGMENT_MIRROR,
  ELEMENT_TYPE_SINGLE_RAY,
  ELEMENT_TYPE_SLAB_GLASS,
  ELEMENT_TYPE_SPHERICAL_LENS,
  ELEMENT_TYPE_TRACK,
  ELEMENT_TYPE_TRANSMISSION_GRATING,
} from "../../../OpticsLabStrings.js";
import { ApertureElement } from "../blockers/ApertureElement.js";
import { LineBlocker } from "../blockers/LineBlocker.js";
import { DetectorElement } from "../detectors/DetectorElement.js";
import { FiberOpticElement } from "../fiber/FiberOpticElement.js";
import { BiconcaveLens } from "../glass/BiconcaveLens.js";
import { BiconvexLens } from "../glass/BiconvexLens.js";
import { CircleGlass } from "../glass/CircleGlass.js";
import { DovePrism } from "../glass/DovePrism.js";
import { EquilateralPrism } from "../glass/EquilateralPrism.js";
import type { GlassPathPoint } from "../glass/Glass.js";
import { Glass } from "../glass/Glass.js";
import { HalfPlaneGlass } from "../glass/HalfPlaneGlass.js";
import { IdealLens } from "../glass/IdealLens.js";
import { ParallelogramPrism } from "../glass/ParallelogramPrism.js";
import { PlanoConcaveLens } from "../glass/PlanoConcaveLens.js";
import { PlanoConvexLens } from "../glass/PlanoConvexLens.js";
import { PorroPrism } from "../glass/PorroPrism.js";
import { RightAnglePrism } from "../glass/RightAnglePrism.js";
import { SlabGlass } from "../glass/SlabGlass.js";
import { SphericalLens } from "../glass/SphericalLens.js";
import { ReflectionGrating } from "../gratings/ReflectionGrating.js";
import { TransmissionGrating } from "../gratings/TransmissionGrating.js";
import { TrackElement } from "../guides/TrackElement.js";
import { ArcLightSource } from "../light-sources/ArcLightSource.js";
import { BeamSource } from "../light-sources/BeamSource.js";
import { ContinuousSpectrumSource } from "../light-sources/ContinuousSpectrumSource.js";
import { DivergentBeam } from "../light-sources/DivergentBeam.js";
import { PointSourceElement } from "../light-sources/PointSourceElement.js";
import { SingleRaySource } from "../light-sources/SingleRaySource.js";
import { AperturedParabolicMirror } from "../mirrors/AperturedParabolicMirror.js";
import { ArcMirror } from "../mirrors/ArcMirror.js";
import { BeamSplitterElement } from "../mirrors/BeamSplitterElement.js";
import { IdealCurvedMirror } from "../mirrors/IdealCurvedMirror.js";
import { ParabolicMirror } from "../mirrors/ParabolicMirror.js";
import { SegmentMirror } from "../mirrors/SegmentMirror.js";
import { BaseElement } from "./BaseElement.js";
import type { Point } from "./Geometry.js";
import { point } from "./Geometry.js";
import type { OpticalElement } from "./OpticsTypes.js";

/** Default serialized shape for the PhET-iO group archetype (PointSource). */
export const ARCHETYPE_ELEMENT_STATE: Record<string, unknown> = {
  type: ELEMENT_TYPE_POINT_SOURCE,
  x: 0,
  y: 0,
  brightness: DEFAULT_BEAM_BRIGHTNESS,
  wavelength: ARCHETYPE_DEFAULT_WAVELENGTH_NM,
  id: "archetype",
};

/** Internal key: live model reference when adding an element without round-trip clone. */
export const LIVE_ELEMENT_STATE_KEY = "__opticsLabLiveElement__";

// ── Validation helpers ────────────────────────────────────────────────────────

function asPoint(v: unknown, field: string): Point {
  if (
    typeof v !== "object" ||
    v === null ||
    typeof (v as Record<string, unknown>)["x"] !== "number" ||
    typeof (v as Record<string, unknown>)["y"] !== "number"
  ) {
    throw new Error(`Invalid point at field "${field}": ${JSON.stringify(v)}`);
  }
  const p = v as { x: number; y: number };
  if (!(Number.isFinite(p.x) && Number.isFinite(p.y))) {
    throw new Error(`Non-finite point at field "${field}": ${JSON.stringify(v)}`);
  }
  return point(p.x, p.y);
}

function asNumber(v: unknown, field: string, min?: number, max?: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`Invalid number at field "${field}": ${JSON.stringify(v)}`);
  }
  if (min !== undefined && v < min) {
    throw new Error(`Value at field "${field}" (${v}) is below minimum ${min}`);
  }
  if (max !== undefined && v > max) {
    throw new Error(`Value at field "${field}" (${v}) exceeds maximum ${max}`);
  }
  return v;
}

/**
 * Parse a radius-of-curvature field. Flat surfaces are represented as
 * ±Infinity in the model, which JSON.stringify serializes as null — so
 * null/undefined and non-finite numbers are all restored as Infinity.
 * A zero radius is invalid (degenerate surface).
 */
function asRadius(v: unknown, field: string): number {
  if (v === null || v === undefined) {
    return Infinity;
  }
  if (typeof v !== "number" || Number.isNaN(v)) {
    throw new Error(`Invalid radius at field "${field}": ${JSON.stringify(v)}`);
  }
  if (v === 0) {
    throw new Error(`Radius at field "${field}" must not be zero`);
  }
  return v;
}

function assignElementId(element: OpticalElement, rawId: unknown): void {
  if (typeof rawId === "string" && element instanceof BaseElement) {
    element.reassignIdForDeserialization(rawId);
  }
}

/** Minimum allowed refractive index (must be strictly positive and non-zero). */
const REF_INDEX_MIN = 1e-9;

// ── Data-driven deserialization schema ───────────────────────────────────────

type FieldSpec =
  | { t: "P"; k: string }
  | { t: "N"; k: string; min?: number; max?: number }
  | { t: "N?"; k: string; min?: number; max?: number };

/** Validated field values: Points, numbers, or (for optional fields) undefined. */
type ParsedFields = Record<string, Point | number | undefined>;

interface ElementDef {
  fields: FieldSpec[];
  build: (v: ParsedFields) => OpticalElement;
  /** Optional post-construction step (e.g. applying a serialized rotation). */
  afterBuild?: (el: OpticalElement, v: ParsedFields) => void;
}

// Shorthand field-spec factories keep the DEFS table compact.
// Spread only defined bounds so exactOptionalPropertyTypes is satisfied.
const p = (k: string): FieldSpec => ({ t: "P", k });
const n = (k: string, min?: number, max?: number): FieldSpec => ({
  t: "N",
  k,
  ...(min !== undefined && { min }),
  ...(max !== undefined && { max }),
});
const nOpt = (k: string, min?: number, max?: number): FieldSpec => ({
  t: "N?",
  k,
  ...(min !== undefined && { min }),
  ...(max !== undefined && { max }),
});

/** Shared afterBuild for elements that serialise an optional rotation angle. */
const applyRotation = (el: OpticalElement, v: ParsedFields): void => {
  const rot = v["rotation"];
  if (rot !== undefined && rot !== 0) {
    (el as unknown as { setRotation: (r: number) => void }).setRotation(rot as number);
  }
};

function runDef(def: ElementDef, obj: Record<string, unknown>): OpticalElement {
  const v: ParsedFields = {};
  for (const f of def.fields) {
    if (f.t === "P") {
      v[f.k] = asPoint(obj[f.k], f.k);
    } else if (f.t === "N") {
      v[f.k] = asNumber(obj[f.k], f.k, f.min, f.max);
    } else {
      v[f.k] = obj[f.k] !== undefined ? asNumber(obj[f.k], f.k, f.min, f.max) : undefined;
    }
  }
  const el = def.build(v);
  def.afterBuild?.(el, v);
  assignElementId(el, obj["id"]);
  return el;
}

// ── Per-type schemas ──────────────────────────────────────────────────────────

const ContinuousSpectrumDef: ElementDef = {
  fields: [p("p1"), p("p2"), n("wavelengthMin", 0), n("wavelengthStep", 0), n("wavelengthMax", 0), n("brightness", 0)],
  build: (v) =>
    new ContinuousSpectrumSource(
      v["p1"] as Point,
      v["p2"] as Point,
      v["wavelengthMin"] as number,
      v["wavelengthStep"] as number,
      v["wavelengthMax"] as number,
      v["brightness"] as number,
    ),
};

const DEFS: Record<string, ElementDef> = {
  // ── Light sources ────────────────────────────────────────────────────────
  [ELEMENT_TYPE_POINT_SOURCE]: {
    fields: [n("x"), n("y"), n("brightness", 0), n("wavelength", 0)],
    build: (v) =>
      new PointSourceElement(
        point(v["x"] as number, v["y"] as number),
        v["brightness"] as number,
        v["wavelength"] as number,
      ),
  },
  [ELEMENT_TYPE_BEAM]: {
    fields: [p("p1"), p("p2"), n("brightness", 0), n("wavelength", 0)],
    build: (v) =>
      new BeamSource(v["p1"] as Point, v["p2"] as Point, v["brightness"] as number, v["wavelength"] as number),
  },
  [ELEMENT_TYPE_DIVERGENT_BEAM]: {
    fields: [p("p1"), p("p2"), n("brightness", 0), n("wavelength", 0), n("emisAngle", 0)],
    build: (v) =>
      new DivergentBeam(
        v["p1"] as Point,
        v["p2"] as Point,
        v["brightness"] as number,
        v["wavelength"] as number,
        v["emisAngle"] as number,
      ),
  },
  [ELEMENT_TYPE_SINGLE_RAY]: {
    fields: [p("p1"), p("p2"), n("brightness", 0), n("wavelength", 0)],
    build: (v) =>
      new SingleRaySource(v["p1"] as Point, v["p2"] as Point, v["brightness"] as number, v["wavelength"] as number),
  },
  [ELEMENT_TYPE_ARC_SOURCE]: {
    fields: [n("x"), n("y"), n("direction"), n("emissionAngle", 0), n("brightness", 0), n("wavelength", 0)],
    build: (v) =>
      new ArcLightSource(
        point(v["x"] as number, v["y"] as number),
        v["direction"] as number,
        v["emissionAngle"] as number,
        v["brightness"] as number,
        v["wavelength"] as number,
      ),
  },
  [ELEMENT_TYPE_CONTINUOUS_SPECTRUM_SOURCE]: ContinuousSpectrumDef,
  // Legacy camelCase key written by versions prior to the PascalCase rename.
  continuousSpectrumSource: ContinuousSpectrumDef,

  // ── Mirrors ──────────────────────────────────────────────────────────────
  [ELEMENT_TYPE_SEGMENT_MIRROR]: {
    fields: [p("p1"), p("p2")],
    build: (v) => new SegmentMirror(v["p1"] as Point, v["p2"] as Point),
  },
  [ELEMENT_TYPE_ARC_MIRROR]: {
    fields: [p("p1"), p("p2"), p("p3")],
    build: (v) => new ArcMirror(v["p1"] as Point, v["p2"] as Point, v["p3"] as Point),
  },
  [ELEMENT_TYPE_PARABOLIC_MIRROR]: {
    fields: [p("p1"), p("p2"), p("p3")],
    build: (v) => new ParabolicMirror(v["p1"] as Point, v["p2"] as Point, v["p3"] as Point),
  },
  [ELEMENT_TYPE_IDEAL_MIRROR]: {
    fields: [p("p1"), p("p2"), n("focalLength")],
    build: (v) => new IdealCurvedMirror(v["p1"] as Point, v["p2"] as Point, v["focalLength"] as number),
  },
  [ELEMENT_TYPE_BEAM_SPLITTER]: {
    fields: [p("p1"), p("p2"), n("transRatio", 0, 1)],
    build: (v) => new BeamSplitterElement(v["p1"] as Point, v["p2"] as Point, v["transRatio"] as number),
  },
  [ELEMENT_TYPE_APERTURED_PARABOLIC_MIRROR]: {
    fields: [p("p1"), p("p2"), p("p3"), n("apertureHalfWidth", 0)],
    build: (v) =>
      new AperturedParabolicMirror(
        v["p1"] as Point,
        v["p2"] as Point,
        v["p3"] as Point,
        v["apertureHalfWidth"] as number,
      ),
  },

  // ── Prisms & glass ───────────────────────────────────────────────────────
  [ELEMENT_TYPE_EQUILATERAL_PRISM]: {
    fields: [n("cx"), n("cy"), n("size", 0), n("refIndex", REF_INDEX_MIN)],
    build: (v) =>
      new EquilateralPrism(point(v["cx"] as number, v["cy"] as number), v["size"] as number, v["refIndex"] as number),
  },
  [ELEMENT_TYPE_RIGHT_ANGLE_PRISM]: {
    fields: [n("cx"), n("cy"), n("legLength", 0), n("refIndex", REF_INDEX_MIN)],
    build: (v) =>
      new RightAnglePrism(
        point(v["cx"] as number, v["cy"] as number),
        v["legLength"] as number,
        v["refIndex"] as number,
      ),
  },
  [ELEMENT_TYPE_PORRO_PRISM]: {
    fields: [n("cx"), n("cy"), n("legLength", 0), n("refIndex", REF_INDEX_MIN)],
    build: (v) =>
      new PorroPrism(point(v["cx"] as number, v["cy"] as number), v["legLength"] as number, v["refIndex"] as number),
  },
  [ELEMENT_TYPE_SLAB_GLASS]: {
    fields: [n("cx"), n("cy"), n("width", 0), n("height", 0), n("refIndex", REF_INDEX_MIN), nOpt("rotation")],
    build: (v) =>
      new SlabGlass(
        point(v["cx"] as number, v["cy"] as number),
        v["width"] as number,
        v["height"] as number,
        v["refIndex"] as number,
      ),
    afterBuild: applyRotation,
  },
  [ELEMENT_TYPE_PARALLELOGRAM_PRISM]: {
    fields: [n("cx"), n("cy"), n("width", 0), n("height", 0), n("refIndex", REF_INDEX_MIN), nOpt("rotation")],
    build: (v) =>
      new ParallelogramPrism(
        point(v["cx"] as number, v["cy"] as number),
        v["width"] as number,
        v["height"] as number,
        v["refIndex"] as number,
      ),
    afterBuild: applyRotation,
  },
  [ELEMENT_TYPE_DOVE_PRISM]: {
    fields: [n("cx"), n("cy"), n("width", 0), n("height", 0), n("refIndex", REF_INDEX_MIN), nOpt("rotation")],
    build: (v) =>
      new DovePrism(
        point(v["cx"] as number, v["cy"] as number),
        v["width"] as number,
        v["height"] as number,
        v["refIndex"] as number,
      ),
    afterBuild: applyRotation,
  },
  [ELEMENT_TYPE_CIRCLE_GLASS]: {
    fields: [p("p1"), p("p2"), n("refIndex", REF_INDEX_MIN)],
    build: (v) => new CircleGlass(v["p1"] as Point, v["p2"] as Point, v["refIndex"] as number),
  },
  [ELEMENT_TYPE_PLANE_GLASS]: {
    fields: [p("p1"), p("p2"), n("refIndex", REF_INDEX_MIN)],
    build: (v) => new HalfPlaneGlass(v["p1"] as Point, v["p2"] as Point, v["refIndex"] as number),
  },
  [ELEMENT_TYPE_IDEAL_LENS]: {
    fields: [p("p1"), p("p2"), n("focalLength")],
    build: (v) => {
      const f = v["focalLength"] as number;
      if (f === 0) {
        throw new Error("focalLength must not be zero");
      }
      return new IdealLens(v["p1"] as Point, v["p2"] as Point, f);
    },
  },

  // ── Blockers ─────────────────────────────────────────────────────────────
  [ELEMENT_TYPE_APERTURE]: {
    fields: [p("p1"), p("p2"), p("p3"), p("p4")],
    build: (v) => new ApertureElement(v["p1"] as Point, v["p2"] as Point, v["p3"] as Point, v["p4"] as Point),
  },
  [ELEMENT_TYPE_LINE_BLOCKER]: {
    fields: [p("p1"), p("p2")],
    build: (v) => new LineBlocker(v["p1"] as Point, v["p2"] as Point),
  },

  // ── Gratings ─────────────────────────────────────────────────────────────
  [ELEMENT_TYPE_REFLECTION_GRATING]: {
    fields: [p("p1"), p("p2"), n("linesDensity", 0), n("dutyCycle", 1e-9, 1 - 1e-9)],
    build: (v) =>
      new ReflectionGrating(v["p1"] as Point, v["p2"] as Point, v["linesDensity"] as number, v["dutyCycle"] as number),
  },
  [ELEMENT_TYPE_TRANSMISSION_GRATING]: {
    fields: [p("p1"), p("p2"), n("linesDensity", 0), n("dutyCycle", 1e-9, 1 - 1e-9)],
    build: (v) =>
      new TransmissionGrating(
        v["p1"] as Point,
        v["p2"] as Point,
        v["linesDensity"] as number,
        v["dutyCycle"] as number,
      ),
  },

  // ── Guides ───────────────────────────────────────────────────────────────
  [ELEMENT_TYPE_TRACK]: {
    fields: [p("p1"), p("p2")],
    build: (v) => new TrackElement(v["p1"] as Point, v["p2"] as Point),
  },
};

// ── Public entry point ────────────────────────────────────────────────────────

export function deserializeElement(obj: Record<string, unknown>): OpticalElement | null {
  const type = obj["type"];
  if (typeof type !== "string") {
    return null;
  }

  // Fast path: schema-driven deserialization for the majority of element types.
  const def = DEFS[type];
  if (def) {
    return runDef(def, obj);
  }

  // Slow path: explicit handling for types with irregular construction logic.
  switch (type) {
    case ELEMENT_TYPE_GLASS: {
      if (!Array.isArray(obj["path"]) || (obj["path"] as unknown[]).length < 3) {
        throw new Error(`Glass path must have at least 3 vertices`);
      }
      const el = new Glass(obj["path"] as GlassPathPoint[], asNumber(obj["refIndex"], "refIndex", REF_INDEX_MIN));
      assignElementId(el, obj["id"]);
      return el;
    }
    case ELEMENT_TYPE_SPHERICAL_LENS:
    case ELEMENT_TYPE_BICONVEX_LENS:
    case ELEMENT_TYPE_BICONCAVE_LENS:
    case ELEMENT_TYPE_PLANO_CONVEX_LENS:
    case ELEMENT_TYPE_PLANO_CONCAVE_LENS: {
      // Radii are parsed with asRadius because flat surfaces serialize
      // Infinity → null through JSON.
      const r1 = asRadius(obj["r1"], "r1");
      const r2 = asRadius(obj["r2"], "r2");
      const d = asNumber(obj["d"], "d", 0);
      const p1 = asPoint(obj["p1"], "p1");
      const p2 = asPoint(obj["p2"], "p2");
      const refIndex = asNumber(obj["refIndex"], "refIndex", REF_INDEX_MIN);
      let lens: SphericalLens;
      if (type === ELEMENT_TYPE_BICONVEX_LENS) {
        lens = new BiconvexLens(p1, p2, Math.abs(r1), refIndex);
      } else if (type === ELEMENT_TYPE_BICONCAVE_LENS) {
        lens = new BiconcaveLens(p1, p2, Math.abs(r1), refIndex);
      } else if (type === ELEMENT_TYPE_PLANO_CONVEX_LENS) {
        lens = new PlanoConvexLens(p1, p2, Math.abs(r2), refIndex);
      } else if (type === ELEMENT_TYPE_PLANO_CONCAVE_LENS) {
        lens = new PlanoConcaveLens(p1, p2, Math.abs(r2), refIndex);
      } else {
        lens = new SphericalLens(p1, p2, r1, r2, refIndex);
      }
      // Rebuild with the serialized thickness; subclass overrides re-enforce
      // their own r1/r2 constraints, so passing both radii is safe.
      lens.createLensWithDR1R2(d, r1, r2);
      assignElementId(lens, obj["id"]);
      return lens;
    }
    case ELEMENT_TYPE_DETECTOR: {
      const p3 = obj["p3"] !== undefined ? asPoint(obj["p3"], "p3") : undefined;
      const el = new DetectorElement(asPoint(obj["p1"], "p1"), asPoint(obj["p2"], "p2"), p3);
      assignElementId(el, obj["id"]);
      return el;
    }
    case ELEMENT_TYPE_FIBER_OPTIC: {
      const claddingRefIndex = asNumber(obj["refIndex"], "refIndex", REF_INDEX_MIN);
      const coreRefIndex =
        obj["coreRefIndex"] !== undefined ? asNumber(obj["coreRefIndex"], "coreRefIndex", REF_INDEX_MIN) : undefined;
      if (coreRefIndex !== undefined && coreRefIndex <= claddingRefIndex) {
        throw new Error(
          `Fiber core refractive index (${coreRefIndex}) must exceed cladding index (${claddingRefIndex}) for total internal reflection guiding`,
        );
      }
      const el = new FiberOpticElement(
        asPoint(obj["p1"], "p1"),
        asPoint(obj["cp1"], "cp1"),
        asPoint(obj["cp2"], "cp2"),
        asPoint(obj["cp3"], "cp3"),
        asPoint(obj["p2"], "p2"),
        asNumber(obj["outerRadius"], "outerRadius", 0),
        claddingRefIndex,
        obj["coreRadiusFraction"] !== undefined
          ? asNumber(obj["coreRadiusFraction"], "coreRadiusFraction", 0, 1)
          : undefined,
        coreRefIndex,
      );
      assignElementId(el, obj["id"]);
      return el;
    }
    default:
      return null;
  }
}
