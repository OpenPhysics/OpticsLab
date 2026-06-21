/**
 * Home screen and navigation bar icons for each OpticsLab screen.
 * Motifs use scenery nodes; ScreenIcon scales and centers them on the standard joist background.
 *
 * Each icon is a physically-motivated miniature of the optics that screen demonstrates:
 *   • Intro       — a glass prism dispersing white light (violet deviates most, toward the base).
 *   • Lab         — an optical bench imaging a point source through a lens onto a detector.
 *   • Presets     — three cards, each a recognizable instrument (telescope, reflector, spectroscope).
 *   • Diffraction — a grating producing a zeroth order plus symmetric, dispersed higher orders
 *                   (red deviates most — the opposite ordering of a prism).
 *
 * Spectrum colors come from VisibleColor.wavelengthToColor so the rainbows match the sim's own
 * ray rendering rather than being hand-tuned.
 */

import type { Color } from "scenerystack";
import { Shape } from "scenerystack/kite";
import { Line, Node, Path } from "scenerystack/scenery";
import { VisibleColor } from "scenerystack/scenery-phet";
import { ScreenIcon } from "scenerystack/sim";
import OpticsLabColors from "./OpticsLabColors.js";

// ── Shared icon palette ────────────────────────────────────────────────────────
const RAY = "#55ee77";
const RAY_SOFT = "#88dd99";
const LENS_STROKE = "rgba(140, 200, 255, 0.95)";
const LENS_FILL = "rgba(100, 180, 255, 0.35)";
const MIRROR = "rgba(210, 210, 220, 0.9)";
const ACCENT = "#ffaa55";
const WHITE_RAY = "rgba(255, 255, 235, 0.95)";
const GLASS_FILL = "rgba(120, 165, 215, 0.22)";
const GLASS_STROKE = "rgba(165, 205, 248, 0.9)";
const PRESET_ROW = "rgba(160, 175, 200, 0.55)";
const PRESET_ROW_STROKE = "rgba(200, 210, 230, 0.5)";

// Sampled visible wavelengths in nm, violet → red. Used to build accurate spectra.
const SPECTRUM_WL = [410, 440, 470, 510, 555, 590, 650];

/** Returns an "rgba(...)" string for a wavelength, matching the sim's ray colors. */
function wlColor(wavelengthNm: number, alpha = 1): string {
  const c = VisibleColor.wavelengthToColor(wavelengthNm);
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

function iconBackgroundFill(): Color | string {
  return OpticsLabColors.backgroundColorProperty.value;
}

// ── Intro: a prism dispersing white light into a spectrum ──────────────────────
// Classic Newton geometry: a horizontal beam enters the left face, crosses the glass,
// and fans out the right face deviated toward the base — violet bends most, red least.
function wrapIntroIcon(): Node {
  const root = new Node();

  // Equilateral-ish glass prism, apex up, base along the bottom.
  const apex = { x: 0, y: -50 };
  const baseLeft = { x: -54, y: 42 };
  const baseRight = { x: 54, y: 42 };
  root.addChild(
    new Path(
      new Shape().moveTo(apex.x, apex.y).lineTo(baseLeft.x, baseLeft.y).lineTo(baseRight.x, baseRight.y).close(),
      { fill: GLASS_FILL, stroke: GLASS_STROKE, lineWidth: 3.5 },
    ),
  );

  // Entry/exit points where a horizontal internal ray crosses the two slanted faces.
  const entry = { x: -28, y: -2 };
  const exit = { x: 28, y: -2 };

  // Incoming white ray, refracting downward at the left face into the horizontal internal ray.
  root.addChild(new Line(-94, -26, entry.x, entry.y, { stroke: WHITE_RAY, lineWidth: 5, lineCap: "round" }));
  // Faint white ray traversing the glass.
  root.addChild(
    new Line(entry.x, entry.y, exit.x, exit.y, { stroke: "rgba(255,255,235,0.55)", lineWidth: 3, lineCap: "round" }),
  );

  // Dispersed spectrum exiting the right face: violet deviates most (largest downward angle).
  for (let i = 0; i < SPECTRUM_WL.length; i++) {
    const endY = 56 - 7 * i; // violet (i=0) → 56, red (i=last) → 14
    root.addChild(
      new Line(exit.x, exit.y, 94, endY, {
        stroke: wlColor(SPECTRUM_WL[i] ?? 555),
        lineWidth: 3.4,
        lineCap: "round",
      }),
    );
  }

  return root;
}

// ── Lab: optical bench imaging a point source through a lens onto a detector ───
// A point source emits diverging rays; the biconvex lens collects and converges them
// to a focal spot on the detector screen.
function wrapLabIcon(): Node {
  const root = new Node();

  const source = { x: -80, y: 0 };
  const focus = { x: 64, y: 0 };
  const railY = 54;
  const lensHalfHeight = 30;
  // Heights at which each ray crosses the (thin) lens plane at x = 0.
  const rayHeights = [-26, -13, 0, 13, 26];

  // Bench rail with tick marks.
  root.addChild(
    new Line(-96, railY, 96, railY, { stroke: "rgba(135, 150, 182, 0.9)", lineWidth: 7, lineCap: "round" }),
  );
  for (const x of [-72, -48, -24, 0, 24, 48, 72]) {
    root.addChild(new Line(x, railY - 4, x, railY + 4, { stroke: "rgba(85, 98, 128, 0.85)", lineWidth: 1.5 }));
  }

  // Rays: diverging from the source to the lens, then converging to the focal spot.
  for (const yLens of rayHeights) {
    const isAxis = yLens === 0;
    root.addChild(
      new Line(source.x, source.y, 0, yLens, {
        stroke: isAxis ? RAY : RAY_SOFT,
        lineWidth: isAxis ? 2.6 : 2.2,
        lineCap: "round",
      }),
    );
    root.addChild(
      new Line(0, yLens, focus.x, focus.y, {
        stroke: isAxis ? RAY : "rgba(85, 238, 119, 0.6)",
        lineWidth: isAxis ? 2.4 : 2.0,
        lineCap: "round",
      }),
    );
  }

  // Element stands rising from the rail.
  root.addChild(
    new Line(source.x, source.y + 10, source.x, railY, {
      stroke: "rgba(108, 124, 158, 0.85)",
      lineWidth: 3,
      lineCap: "round",
    }),
  );
  root.addChild(
    new Line(0, lensHalfHeight, 0, railY, { stroke: "rgba(108, 124, 158, 0.85)", lineWidth: 3, lineCap: "round" }),
  );
  root.addChild(
    new Line(focus.x, 28, focus.x, railY, { stroke: "rgba(108, 124, 158, 0.85)", lineWidth: 3, lineCap: "round" }),
  );

  // Biconvex lens at x = 0.
  root.addChild(
    new Path(
      new Shape()
        .moveTo(0, -lensHalfHeight)
        .quadraticCurveTo(20, 0, 0, lensHalfHeight)
        .quadraticCurveTo(-20, 0, 0, -lensHalfHeight)
        .close(),
      { fill: LENS_FILL, stroke: LENS_STROKE, lineWidth: 3 },
    ),
  );

  // Point source: bright core with glow rings.
  root.addChild(
    new Path(Shape.circle(source.x, source.y, 10), { fill: ACCENT, stroke: "rgba(255, 195, 85, 0.9)", lineWidth: 2.5 }),
  );
  root.addChild(
    new Path(Shape.circle(source.x, source.y, 18), { fill: null, stroke: "rgba(255, 190, 80, 0.35)", lineWidth: 2 }),
  );
  root.addChild(
    new Path(Shape.circle(source.x, source.y, 27), { fill: null, stroke: "rgba(255, 185, 75, 0.15)", lineWidth: 1.5 }),
  );

  // Detector screen with the bright focal spot.
  root.addChild(
    new Path(Shape.roundRect(focus.x - 4, -28, 9, 56, 3, 3), {
      fill: "rgba(75, 90, 122, 0.4)",
      stroke: "rgba(152, 168, 205, 0.9)",
      lineWidth: 2.5,
    }),
  );
  root.addChild(
    new Path(Shape.circle(focus.x, focus.y, 7), { fill: RAY, stroke: "rgba(85, 238, 119, 0.5)", lineWidth: 2.5 }),
  );

  return root;
}

// ── Presets: three cards, each a recognizable optical instrument ───────────────
function wrapPresetsIcon(): Node {
  const root = new Node();

  const cardYCenters = [-36, 0, 36] as const;
  for (const y of cardYCenters) {
    root.addChild(
      new Path(Shape.roundRect(-80, y - 16, 160, 28, 8, 8), {
        fill: PRESET_ROW,
        stroke: PRESET_ROW_STROKE,
        lineWidth: 1.5,
      }),
    );
  }

  const [y0card, y1card, y2card] = cardYCenters;

  // ── Card 1: refracting telescope — parallel in, parallel out (afocal). ──
  {
    const y = y0card;
    // Objective lens (left, larger).
    root.addChild(
      new Path(
        new Shape()
          .moveTo(-58, y - 13)
          .quadraticCurveTo(-49, y, -58, y + 13)
          .quadraticCurveTo(-67, y, -58, y - 13)
          .close(),
        { fill: LENS_FILL, stroke: LENS_STROKE, lineWidth: 1.8 },
      ),
    );
    // Eyepiece lens (right, smaller).
    root.addChild(
      new Path(
        new Shape()
          .moveTo(-12, y - 9)
          .quadraticCurveTo(-6, y, -12, y + 9)
          .quadraticCurveTo(-18, y, -12, y - 9)
          .close(),
        { fill: LENS_FILL, stroke: LENS_STROKE, lineWidth: 1.8 },
      ),
    );
    for (const dy of [-7, 0, 7]) {
      root.addChild(
        new Line(-80, y + dy, -67, y + dy, { stroke: dy === 0 ? RAY : RAY_SOFT, lineWidth: 1.8, lineCap: "round" }),
      );
    }
    // Converging to the shared focal plane between the lenses.
    root.addChild(new Line(-49, y - 7, -18, y - 2, { stroke: RAY_SOFT, lineWidth: 1.6, lineCap: "round" }));
    root.addChild(new Line(-49, y, -18, y, { stroke: RAY, lineWidth: 1.8, lineCap: "round" }));
    root.addChild(new Line(-49, y + 7, -18, y + 2, { stroke: RAY_SOFT, lineWidth: 1.6, lineCap: "round" }));
    for (const dy of [-5, 0, 5]) {
      root.addChild(
        new Line(-6, y + dy, 72, y + dy, { stroke: dy === 0 ? RAY : RAY_SOFT, lineWidth: 1.6, lineCap: "round" }),
      );
    }
  }

  // ── Card 2: reflecting telescope — parallel rays focused by a concave mirror. ──
  {
    const y = y1card;
    root.addChild(
      new Path(new Shape().moveTo(46, y - 14).quadraticCurveTo(62, y, 46, y + 14), {
        stroke: MIRROR,
        lineWidth: 5,
        lineCap: "round",
        fill: null,
      }),
    );
    root.addChild(new Line(-80, y - 7, 40, y - 7, { stroke: RAY_SOFT, lineWidth: 1.8, lineCap: "round" }));
    root.addChild(new Line(-80, y, 40, y, { stroke: RAY, lineWidth: 2, lineCap: "round" }));
    root.addChild(new Line(-80, y + 7, 40, y + 7, { stroke: RAY_SOFT, lineWidth: 1.8, lineCap: "round" }));
    root.addChild(new Line(40, y - 7, 24, y, { stroke: RAY_SOFT, lineWidth: 1.8, lineCap: "round" }));
    root.addChild(new Line(40, y, 24, y, { stroke: RAY, lineWidth: 2, lineCap: "round" }));
    root.addChild(new Line(40, y + 7, 24, y, { stroke: RAY_SOFT, lineWidth: 1.8, lineCap: "round" }));
    root.addChild(new Path(Shape.circle(24, y, 5), { fill: ACCENT, stroke: "rgba(255, 195, 85, 0.6)", lineWidth: 2 }));
  }

  // ── Card 3: spectroscope — prism dispersing to a spectrum (violet deviates most). ──
  {
    const y = y2card;
    root.addChild(
      new Path(
        new Shape()
          .moveTo(-54, y + 12)
          .lineTo(-38, y - 12)
          .lineTo(-22, y + 12)
          .close(),
        {
          fill: GLASS_FILL,
          stroke: "rgba(155, 195, 238, 0.75)",
          lineWidth: 1.8,
        },
      ),
    );
    root.addChild(new Line(-80, y, -54, y + 6, { stroke: WHITE_RAY, lineWidth: 2.5, lineCap: "round" }));
    for (let i = 0; i < SPECTRUM_WL.length; i++) {
      const endY = y + 20 - 5 * i; // violet most deviation (largest downward angle)
      root.addChild(
        new Line(-22, y + 8, 72, endY, { stroke: wlColor(SPECTRUM_WL[i] ?? 555), lineWidth: 2, lineCap: "round" }),
      );
    }
  }

  return root;
}

// ── Diffraction: grating with a zeroth order plus symmetric, dispersed orders ──
// Unlike a prism, a grating spreads each order so that red (long wavelength) deviates
// most. The undeviated zeroth order passes straight through; higher orders appear
// symmetrically above and below, and second orders exist only for the shorter
// wavelengths whose diffraction angle stays below 90°.
function wrapDiffractionIcon(): Node {
  const root = new Node();

  // Ruled grating: a stack of fine vertical lines.
  for (let i = -3; i <= 3; i++) {
    const x = i * 7;
    root.addChild(new Line(x, -46, x, 46, { stroke: "rgba(200, 210, 230, 0.85)", lineWidth: 3, lineCap: "round" }));
  }

  const origin = { x: 20, y: 0 };

  // Incoming collimated white beam and the undeviated zeroth order.
  root.addChild(new Line(-94, 0, -20, 0, { stroke: WHITE_RAY, lineWidth: 4, lineCap: "round" }));
  root.addChild(new Line(origin.x, 0, 94, 0, { stroke: WHITE_RAY, lineWidth: 3.5, lineCap: "round" }));

  // First-order spectra, fanned symmetrically; violet nearest the axis, red farthest.
  const firstOrderLen = 82;
  for (let i = 0; i < SPECTRUM_WL.length; i++) {
    const angle = ((15 + 5 * i) * Math.PI) / 180; // violet ~15°, red ~45°
    const dx = firstOrderLen * Math.cos(angle);
    const dy = firstOrderLen * Math.sin(angle);
    const color = wlColor(SPECTRUM_WL[i] ?? 555);
    root.addChild(new Line(origin.x, 0, origin.x + dx, -dy, { stroke: color, lineWidth: 2.6, lineCap: "round" }));
    root.addChild(new Line(origin.x, 0, origin.x + dx, dy, { stroke: color, lineWidth: 2.6, lineCap: "round" }));
  }

  // Faint second-order partial spectra: only the shorter wavelengths diffract within range.
  const secondOrderLen = 58;
  for (let i = 0; i < 3; i++) {
    const sinTheta1 = Math.sin(((15 + 5 * i) * Math.PI) / 180);
    const sinTheta2 = 2 * sinTheta1;
    if (sinTheta2 >= 1) {
      continue;
    }
    const angle = Math.asin(sinTheta2);
    const dx = secondOrderLen * Math.cos(angle);
    const dy = secondOrderLen * Math.sin(angle);
    const color = wlColor(SPECTRUM_WL[i] ?? 555, 0.65);
    root.addChild(new Line(origin.x, 0, origin.x + dx, -dy, { stroke: color, lineWidth: 1.8, lineCap: "round" }));
    root.addChild(new Line(origin.x, 0, origin.x + dx, dy, { stroke: color, lineWidth: 1.8, lineCap: "round" }));
  }

  return root;
}

export function createIntroScreenIcon(): ScreenIcon {
  return new ScreenIcon(wrapIntroIcon(), {
    fill: iconBackgroundFill(),
    maxIconWidthProportion: 0.9,
    maxIconHeightProportion: 0.9,
  });
}

export function createLabScreenIcon(): ScreenIcon {
  return new ScreenIcon(wrapLabIcon(), {
    fill: iconBackgroundFill(),
    maxIconWidthProportion: 0.9,
    maxIconHeightProportion: 0.9,
  });
}

export function createPresetsScreenIcon(): ScreenIcon {
  return new ScreenIcon(wrapPresetsIcon(), {
    fill: iconBackgroundFill(),
    maxIconWidthProportion: 0.88,
    maxIconHeightProportion: 0.88,
  });
}

export function createDiffractionScreenIcon(): ScreenIcon {
  return new ScreenIcon(wrapDiffractionIcon(), {
    fill: iconBackgroundFill(),
    maxIconWidthProportion: 0.9,
    maxIconHeightProportion: 0.9,
  });
}
