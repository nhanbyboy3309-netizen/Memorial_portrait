
// Builds an SVG <filter> (feComponentTransfer tone curve + feColorMatrix CMYK shift)
// that can be referenced from a CSS `filter: url(#id)` on either an <img>/<canvas>
// element (live preview) or a CanvasRenderingContext2D.filter (export bake), so the
// same computation drives both without touching pixels in JS.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Builds a luminance-zone tone curve: shadows lift/crush the low end, highlights the
// high end, midtones the middle — each independently, -100..100, 0 = no change.
const buildToneCurveTable = (shadow: number, highlight: number, midtone: number, steps = 11): string => {
  const s = shadow / 100;
  const h = highlight / 100;
  const m = midtone / 100;
  const values: string[] = [];
  for (let i = 0; i < steps; i++) {
    const x = i / (steps - 1);
    const shadowWeight = clamp01(1 - x / 0.5);
    const highlightWeight = clamp01((x - 0.5) / 0.5);
    const midtoneWeight = clamp01(1 - shadowWeight - highlightWeight);
    const y = x + s * 0.3 * shadowWeight + h * 0.3 * highlightWeight + m * 0.25 * midtoneWeight;
    values.push(clamp01(y).toFixed(3));
  }
  return values.join(' ');
};

// Builds a per-channel color matrix simulating CMYK ink: more cyan/magenta/yellow
// subtracts red/green/blue respectively, K darkens all channels. 0..100 per slider.
const buildCmykMatrix = (cyan: number, magenta: number, yellow: number, key: number): string => {
  const c = clamp01(cyan / 100);
  const m = clamp01(magenta / 100);
  const y = clamp01(yellow / 100);
  const k = clamp01(key / 100);
  const kFactor = 1 - k * 0.5;
  const offsetR = (-c * 0.5).toFixed(3);
  const offsetG = (-m * 0.5).toFixed(3);
  const offsetB = (-y * 0.5).toFixed(3);
  const kf = kFactor.toFixed(3);
  return [
    kf, 0, 0, 0, offsetR,
    0, kf, 0, 0, offsetG,
    0, 0, kf, 0, offsetB,
    0, 0, 0, 1, 0
  ].join(' ');
};

export interface ToneFilterInput {
  highlightIntensity: number;
  shadowIntensity: number;
  midtoneIntensity: number;
  cyanIntensity: number;
  magentaIntensity: number;
  yellowIntensity: number;
  keyIntensity: number;
}

export const isToneFilterActive = (v: ToneFilterInput): boolean =>
  v.highlightIntensity !== 0 || v.shadowIntensity !== 0 || v.midtoneIntensity !== 0 ||
  v.cyanIntensity !== 0 || v.magentaIntensity !== 0 || v.yellowIntensity !== 0 || v.keyIntensity !== 0;

// Returns the inner markup for an <svg><defs><filter id={filterId}>...</filter></defs></svg>
// wrapper the caller renders (hidden, 0x0) once per unique filterId.
export const buildToneFilterMarkup = (filterId: string, v: ToneFilterInput): string => {
  const table = buildToneCurveTable(v.shadowIntensity, v.highlightIntensity, v.midtoneIntensity);
  const matrix = buildCmykMatrix(v.cyanIntensity, v.magentaIntensity, v.yellowIntensity, v.keyIntensity);
  return `
    <filter id="${filterId}" color-interpolation-filters="sRGB">
      <feComponentTransfer>
        <feFuncR type="table" tableValues="${table}" />
        <feFuncG type="table" tableValues="${table}" />
        <feFuncB type="table" tableValues="${table}" />
      </feComponentTransfer>
      <feColorMatrix type="matrix" values="${matrix}" />
    </filter>
  `;
};
