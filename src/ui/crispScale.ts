/** A width and a height in CSS pixels. */
export type Size = { readonly width: number; readonly height: number };

/** The largest scale the window is drawn at. */
const MAX_SCALE = 3;

/**
 * The scales the window may be drawn at, from the largest down: ×1, ×2 and ×3, and every scale in
 * between at which one drawn pixel covers a whole number of screen pixels at `pixelRatio`, such as
 * ×1.5 and ×2.5 at a ratio of 2. At those scales every pixel edge stays crisp.
 */
function scalesFor(pixelRatio: number): number[] {
  const scales = new Set([1, 2, MAX_SCALE]);
  for (let pixels = Math.ceil(pixelRatio); pixels <= MAX_SCALE * pixelRatio; pixels++) {
    scales.add(pixels / pixelRatio);
  }
  return [...scales].sort((a, b) => b - a);
}

/**
 * The scale to draw a window of size `atOne` (its size at ×1) at in `viewport`, on a screen with
 * `pixelRatio` screen pixels to the CSS pixel: the largest of those scales at which the window
 * fits, or ×1 when even ×1 doesn't, so that the page scrolls instead of the window shrinking.
 */
export function crispScale(atOne: Size, viewport: Size, pixelRatio: number): number {
  const fits = (scale: number) =>
    atOne.width * scale <= viewport.width && atOne.height * scale <= viewport.height;
  return scalesFor(pixelRatio).find(fits) ?? 1;
}
