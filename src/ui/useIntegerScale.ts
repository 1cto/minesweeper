import { useLayoutEffect, type RefObject } from "react";

/** From the largest down: whole numbers keep every pixel edge crisp. */
const SCALES = [3, 2, 1];

/**
 * Draws the element at the largest whole-number scale from ×1 to ×3 at which it fits the
 * viewport, and shows that scale in its `data-scale` attribute. The scale is recomputed when the
 * viewport is resized and when the element's own size changes, as it does with the Difficulty.
 * When even ×1 doesn't fit, the element keeps its ×1 size and the page scrolls.
 *
 * The scale is CSS `zoom` rather than a transform: a transform would become the containing
 * block of the `position: fixed` menu backdrop and dialogs inside, so they would only cover the
 * element instead of the viewport. It is written to the element directly, before the browser
 * paints, so the element is never shown for a frame at the scale of its previous size.
 */
export function useIntegerScale(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => {
      // The offset size leaves out the element's own zoom, so it is the size at ×1. The
      // viewport size includes any scrollbars, which go away once the chosen scale fits.
      const { offsetWidth: width, offsetHeight: height } = element;
      const scale =
        SCALES.find(
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
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [ref]);
}
