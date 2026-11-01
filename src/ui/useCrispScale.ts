import { useLayoutEffect, type RefObject } from "react";

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
 * Draws the element at the largest of those scales at which it fits the viewport, and shows that
 * scale in its `data-scale` attribute. The scale is recomputed when the viewport is resized or
 * turned, when the device pixel ratio changes, and when the element's own size changes, as it
 * does with the Difficulty. When even ×1 doesn't fit, the element keeps its ×1 size and the page
 * scrolls. Centred on the desktop, the window lands on whole screen pixels at every one of these
 * scales, because its size at ×1 is an even number of pixels each way.
 *
 * The scale is CSS `zoom` rather than a transform: a transform would become the containing
 * block of the `position: fixed` menu backdrop and dialogs inside, so they would only cover the
 * element instead of the viewport. It is written to the element directly, before the browser
 * paints, so the element is never shown for a frame at the scale of its previous size.
 */
export function useCrispScale(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => {
      // The offset size leaves out the element's own zoom, so it is the size at ×1. The
      // viewport size includes any scrollbars, which go away once the chosen scale fits.
      const { offsetWidth: width, offsetHeight: height } = element;
      const scale =
        scalesFor(window.devicePixelRatio).find(
          (scale) => width * scale <= window.innerWidth && height * scale <= window.innerHeight,
        ) ?? 1;
      element.style.zoom = String(scale);
      element.dataset.scale = String(scale);
    };
    fit();
    // A change of zoom alone is no resize to the observer, so this never loops.
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    window.addEventListener("resize", fit);
    // A new device pixel ratio alone, as when the browser window moves to another screen, fires
    // no resize; a media query for the current ratio stops matching, and is then set up afresh
    // for the new one.
    let ratio: MediaQueryList | undefined;
    const watchRatio = () => {
      ratio?.removeEventListener("change", ratioChanged);
      ratio = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      ratio.addEventListener("change", ratioChanged);
    };
    const ratioChanged = () => {
      fit();
      watchRatio();
    };
    watchRatio();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      ratio?.removeEventListener("change", ratioChanged);
    };
  }, [ref]);
}
