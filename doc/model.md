# Model - OpticsLab

This document describes the model (the underlying physics, math, and behavior) for the simulation,
in terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

OpticsLab is a **geometric optics** simulation: light is represented as **rays** — straight-line
segments between interactions. There is **no propagating wave** in the model (no cos(kx − ωt + φ)
phase evolution through space), so interference and diffraction are **not** modeled as waves except at
**gratings**. Students drag lenses, mirrors, prisms, beam splitters, blockers, and detectors from a
carousel, adjust element parameters, and watch rays trace through the scene in real time.

Four screens share the same ray-tracing stack under `src/common/`:

- **Intro** — guided subset of components.
- **Lab** — full toolbox for free-form scene building.
- **Presets** — curated demonstration scenes.
- **Diffraction** — reduced carousel focused on transmission/reflection gratings.

The key ideas a student should take away:

- At smooth interfaces, **Snell's law** relates incident and refracted directions; **total internal
  reflection** occurs when no real transmitted direction exists.
- **Mirrors** reflect specularly (angle of incidence equals angle of reflection).
- An **ideal thin lens** bends rays at a line according to focal length — not by tracing Snell paths
  through thick glass.
- **Gratings** split light into orders via the grating equation; other elements do not produce
  diffraction patterns.
- Ray brightness tracks **energy bookkeeping** (s and p polarization components); weak rays are
  dropped so the tree stays tractable.

## Quantities and units

Model space uses **metres**, **y up**. Air is treated as n = 1 (non-dispersive).

| Quantity | Symbol | Units | Notes |
|---|---|---|---|
| Position | (x, y) | m | Scene coordinates |
| Ray direction | d̂ | — | Unit vector along propagation |
| Wavelength | λ | nm | Optional per-ray; drives dispersion and display colour |
| Refractive index | n | — | Base index + Cauchy dispersion term |
| Cauchy B coefficient | B | — | 0 disables dispersion for that element |
| Focal length | f | m | Ideal thin lens |
| Grating period | d | m | Groove spacing |
| Diffraction order | m | — | Integer order in grating equation |
| Brightness (s / p) | B_s, B_p | — | Separate polarization channels; unpolarized ⇒ equal split |
| Ray depth | — | — | Interaction count limit (default ~200) |
| Observer radius | r | m | Collection disc in observer view mode |

## Governing equations

**Snell's law (refraction).** At an interface with normal n̂ and indices n₁, n₂:

```
n₁ sin θ₁ = n₂ sin θ₂
```

Implemented in vector form in `BaseGlass.refractRay()`. **Total internal reflection** returns a
specular reflected ray when transmission is impossible.

**Fresnel reflection (optional).** When *partial reflect* is enabled, reflected and transmitted
**power** split using Fresnel equations for s- and p-polarization; unpolarized light divides equally.
Very weak reflected rays (below a brightness threshold) are dropped.

**Dispersion.** For rays carrying wavelength λ:

```
n(λ) = n₀ + B / (λ² · k_c)
```

(Cauchy-type; k_c is a model constant in `OpticsLabConstants.ts`). B = 0 gives constant n.

**Mirrors and beam splitters.** Mirrors apply law of reflection. Beam splitters reflect one portion
and transmit the remainder along the incident direction according to a fixed transmission ratio (schematic,
not a thin-film stack).

**Ideal thin lens.** Rays are bent at the lens line to satisfy thin-lens imaging (specified focal length);
not Snell tracing through volumetric glass.

**Grating equation** (transmission and reflection gratings):

```
d (sin θ_m − sin θ_i) = m λ
```

Several orders m are emitted; relative strengths use a **sinc²** factor from duty cycle; intensities
renormalize across emitted orders. Orders requiring |sin θ| > 1 are skipped.

**Ray tracing termination.** Tracing stops when depth exceeds `maxRayDepth`, combined s+p brightness
falls below a minimum, or the ray is **absorbed** (detector, line blocker, opaque aperture). No
exponential absorption in bulk air/glass.

## Simplifications and assumptions

- **Geometric optics only** — no Huygens wavefronts, no interference except grating orders.
- **Monochromatic or per-ray wavelength** — colour on screen maps λ → RGB for display.
- **Extended / image / observer modes** add **construction** segments (virtual rays, image markers,
  observer cone) for pedagogy; they do not add unphysical power.
- Elements are **2D schematic** cross-sections; 3D tilt and vignetting are not modeled.
- Detectors integrate incident ray power; they do not simulate exposure time or sensor noise.

## References

- E. Hecht, *Optics* — Snell's law, Fresnel coefficients, thin lenses, gratings.
- [Snell's law](https://en.wikipedia.org/wiki/Snell%27s_law), [Fresnel equations](https://en.wikipedia.org/wiki/Fresnel_equations), [Diffraction grating](https://en.wikipedia.org/wiki/Diffraction_grating), [Thin lens](https://en.wikipedia.org/wiki/Thin_lens).
- PhET-style geometric ray tracing pedagogy (comparative UI patterns).
