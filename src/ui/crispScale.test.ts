import { describe, expect, it } from "vitest";
import { crispScale } from "./crispScale";

// The window's size at ×1 on each Difficulty, in CSS pixels.
const BEGINNER = { width: 174, height: 256 };
const INTERMEDIATE = { width: 286, height: 368 };
const EXPERT = { width: 510, height: 368 };

describe("the crisp scale", () => {
  it("at a device pixel ratio of 1 is the largest of ×1, ×2 and ×3 that fits", () => {
    expect(crispScale(BEGINNER, { width: 1920, height: 1080 }, 1)).toBe(3);
    expect(crispScale(BEGINNER, { width: 1280, height: 720 }, 1)).toBe(2);
    expect(crispScale(EXPERT, { width: 1019, height: 1080 }, 1)).toBe(1);
  });

  it("at a ratio of 2, as on an iPad, may also be ×1.5 or ×2.5", () => {
    expect(crispScale(EXPERT, { width: 820, height: 1180 }, 2)).toBe(1.5);
    expect(crispScale(INTERMEDIATE, { width: 820, height: 1180 }, 2)).toBe(2.5);
    expect(crispScale(EXPERT, { width: 1180, height: 820 }, 2)).toBe(2);
    expect(crispScale(EXPERT, { width: 1019, height: 1080 }, 2)).toBe(1.5);
  });

  it("at a ratio of 3, as on many phones, may also be a third in between", () => {
    // ×4/3 is 381⅓ pixels wide, inside 393; ×5/3 is 476⅔, outside it.
    expect(crispScale(INTERMEDIATE, { width: 393, height: 852 }, 3)).toBeCloseTo(4 / 3, 9);
  });

  it("at a ratio of 1.25, as on many Windows laptops, may also be ×1.6 or ×2.4", () => {
    // ×2 is 736 pixels high, outside 730; ×1.6 is 816 by 588.8.
    expect(crispScale(EXPERT, { width: 1536, height: 730 }, 1.25)).toBeCloseTo(1.6, 9);
    // ×2.4 is 417.6 by 614.4; ×3 is 522 pixels wide, outside 500.
    expect(crispScale(BEGINNER, { width: 500, height: 900 }, 1.25)).toBeCloseTo(2.4, 9);
  });

  it("is ×1 when even ×1 doesn't fit, so the page scrolls instead of the window shrinking", () => {
    expect(crispScale(EXPERT, { width: 400, height: 300 }, 2)).toBe(1);
  });

  it("is never more than ×3, however much room there is", () => {
    expect(crispScale(BEGINNER, { width: 4000, height: 4000 }, 2)).toBe(3);
  });
});
