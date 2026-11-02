import { useLayoutEffect, type RefObject } from "react";
import { crispScale } from "./crispScale";

/**
 * Draws the element at its crisp scale for the viewport and the device pixel ratio (see
 * `crispScale`), and shows that scale in its `data-scale` attribute. The scale is recomputed when
 * the viewport is resized or turned, when the device pixel ratio changes, and when the element's
 * own size changes, as it does with the Difficulty. Centred on the desktop, the window lands on
 * whole screen pixels at a device pixel ratio of 1 or 2, because its size at ×1 is an even number
 * of pixels each way; at other ratios it may fall between two, which is not rounded away.
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
      // The size at ×1 is measured at ×1: at a fractional zoom the browser may round a border
      // down to whole pixels, and the size measured there would then be a pixel short. The
      // viewport size includes any scrollbars, which go away once the chosen scale fits.
      element.style.zoom = "1";
      const atOne = { width: element.offsetWidth, height: element.offsetHeight };
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const scale = crispScale(atOne, viewport, window.devicePixelRatio);
      element.style.zoom = String(scale);
      element.dataset.scale = String(scale);
    };
    fit();
    // The zoom changes the size the observer sees, but the next fit measures at ×1 again and
    // chooses the same scale, so the observer settles at once.
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
