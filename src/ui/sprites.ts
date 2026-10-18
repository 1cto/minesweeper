/**
 * Every graphic in the game is original pixel art, drawn here as rows of palette characters
 * and turned into crisp SVG images. Nothing is copied from Microsoft.
 */

/** Rows of palette characters; "." is transparent. */
type Bitmap = readonly string[];

const PALETTE: Readonly<Record<string, string>> = {
  w: "#ffffff",
  L: "#dfdfdf",
  l: "#c0c0c0",
  g: "#808080",
  k: "#000000",
  y: "#ffff00",
  r: "#ff0000",
  d: "#400000",
  b: "#0000ff",
  G: "#008000",
  n: "#000080",
  m: "#800000",
  t: "#008080",
};

function toSvg(bitmap: Bitmap): string {
  const height = bitmap.length;
  const width = bitmap[0]?.length ?? 0;
  const rects: string[] = [];
  bitmap.forEach((line, y) => {
    for (let x = 0; x < line.length;) {
      const char = line.charAt(x);
      let end = x + 1;
      while (line.charAt(end) === char) end++;
      const fill = PALETTE[char];
      if (fill)
        rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${fill}"/>`);
      x = end;
    }
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${rects.join("")}</svg>`
  );
}

/** A CSS `url(...)` value for the bitmap. */
function sprite(bitmap: Bitmap): string {
  return `url("data:image/svg+xml,${encodeURIComponent(toSvg(bitmap))}")`;
}

/**
 * A raised or sunken box. Each layer, from the outside in, colours its top and left edges with
 * the first character and its bottom and right edges with the second, meeting in a pixel step.
 */
function bevel(
  width: number,
  height: number,
  layers: readonly (readonly [string, string])[],
  fill: string,
): Bitmap {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const depth = Math.min(x, y, width - 1 - x, height - 1 - y);
      const layer = layers[depth];
      if (!layer) return fill;
      const topLeft =
        (y === depth && x < width - 1 - depth) || (x === depth && y < height - 1 - depth);
      return topLeft ? layer[0] : layer[1];
    }).join(""),
  );
}

/** Draws `top` over `base` with its top-left corner at (x, y); "." in `top` is transparent. */
function overlay(base: Bitmap, top: Bitmap, x: number, y: number): Bitmap {
  return base.map((line, row) => {
    const topLine = top[row - y];
    if (topLine === undefined) return line;
    return [...line]
      .map((char, col) => {
        const topChar = topLine.charAt(col - x);
        return topChar && topChar !== "." ? topChar : char;
      })
      .join("");
  });
}

function recolor(bitmap: Bitmap, color: string): Bitmap {
  return bitmap.map((line) => line.replaceAll("#", color));
}

// Board Cells (16×16)

const HIDDEN_CELL = bevel(
  16,
  16,
  [
    ["w", "g"],
    ["w", "g"],
  ],
  "l",
);

const REVEALED_CELL: Bitmap = Array.from({ length: 16 }, (_, y) =>
  y === 0 ? "g".repeat(16) : "g" + "l".repeat(15),
);

const CLUE_GLYPHS: Readonly<Record<number, Bitmap>> = {
  1: [
    "...##...",
    "..###...",
    ".####...",
    "...##...",
    "...##...",
    "...##...",
    "...##...",
    "...##...",
    ".######.",
    ".######.",
  ],
  2: [
    ".######.",
    "########",
    "##....##",
    ".....###",
    "...####.",
    ".####...",
    "###.....",
    "##......",
    "########",
    "########",
  ],
  3: [
    ".######.",
    "########",
    "......##",
    "......##",
    "..#####.",
    "..#####.",
    "......##",
    "......##",
    "########",
    ".######.",
  ],
  4: [
    "....###.",
    "...####.",
    "..##.##.",
    ".##..##.",
    "##...##.",
    "########",
    "########",
    ".....##.",
    ".....##.",
    ".....##.",
  ],
  5: [
    "########",
    "########",
    "##......",
    "##......",
    "#######.",
    "########",
    "......##",
    "......##",
    "########",
    "#######.",
  ],
  6: [
    ".######.",
    "########",
    "##......",
    "##......",
    "#######.",
    "########",
    "##....##",
    "##....##",
    "########",
    ".######.",
  ],
  7: [
    "########",
    "########",
    "......##",
    ".....##.",
    "....##..",
    "...##...",
    "...##...",
    "..##....",
    "..##....",
    "..##....",
  ],
  8: [
    ".######.",
    "########",
    "##....##",
    "##....##",
    ".######.",
    ".######.",
    "##....##",
    "##....##",
    "########",
    ".######.",
  ],
};

/** The classic Clue colours: blue, green, red, navy, maroon, teal, black, gray. */
const CLUE_COLORS = ["", "b", "G", "r", "n", "m", "t", "k", "g"];

const MINE: Bitmap = [
  "......k......",
  "......k......",
  "..k.kkkkk.k..",
  "...kkkkkkk...",
  "..kkwwkkkkk..",
  "..kkwwkkkkk..",
  "kkkkkkkkkkkkk",
  "..kkkkkkkkk..",
  "..kkkkkkkkk..",
  "...kkkkkkk...",
  "..k.kkkkk.k..",
  "......k......",
  "......k......",
];

const FLAG: Bitmap = [
  "....rrk...",
  "..rrrrk...",
  ".rrrrrk...",
  "..rrrrk...",
  "....rrk...",
  "......k...",
  "......k...",
  "....kkkk..",
  "..kkkkkkkk",
  "..kkkkkkkk",
];

const QUESTION: Bitmap = [
  ".kkkkkk.",
  "kkkkkkkk",
  "kk....kk",
  "......kk",
  "....kkk.",
  "...kkk..",
  "...kk...",
  "........",
  "...kk...",
  "...kk...",
];

/** The red cross drawn over a Mine to show a wrong Flag after a Loss. */
const CROSS: Bitmap = [
  "rr........rr",
  ".rr......rr.",
  "..rr....rr..",
  "...rr..rr...",
  "....rrrr....",
  ".....rr.....",
  ".....rr.....",
  "....rrrr....",
  "...rr..rr...",
  "..rr....rr..",
  ".rr......rr.",
  "rr........rr",
];

/** The Revealed Mine that lost the Game sits on a red background. */
const EXPLODED_CELL: Bitmap = REVEALED_CELL.map((line, y) =>
  y === 0 ? line : line.charAt(0) + "r".repeat(line.length - 1),
);

export const CELL_SPRITES = {
  hidden: sprite(HIDDEN_CELL),
  flag: sprite(overlay(HIDDEN_CELL, FLAG, 2, 3)),
  question: sprite(overlay(HIDDEN_CELL, QUESTION, 4, 3)),
  clues: Array.from({ length: 9 }, (_, clue) => {
    const glyph = CLUE_GLYPHS[clue];
    const color = CLUE_COLORS[clue];
    return sprite(
      glyph && color ? overlay(REVEALED_CELL, recolor(glyph, color), 4, 3) : REVEALED_CELL,
    );
  }),
  mine: sprite(overlay(REVEALED_CELL, MINE, 2, 2)),
  exploded: sprite(overlay(EXPLODED_CELL, MINE, 2, 2)),
  wrongFlag: sprite(overlay(overlay(REVEALED_CELL, MINE, 2, 2), CROSS, 2, 2)),
};

// Seven-segment counter digits (13×23)

type Segment = "a" | "b" | "c" | "d" | "e" | "f" | "g";

/** Each segment as [row or column, first, last] runs, tapering towards the inside. */
const SEGMENT_PIXELS: Readonly<Record<Segment, readonly [number, number, number][]>> = {
  a: [
    [1, 2, 10],
    [2, 3, 9],
    [3, 4, 8],
  ],
  g: [
    [10, 3, 9],
    [11, 2, 10],
    [12, 3, 9],
  ],
  d: [
    [19, 4, 8],
    [20, 3, 9],
    [21, 2, 10],
  ],
  f: [
    [1, 2, 10],
    [2, 3, 9],
    [3, 4, 8],
  ],
  b: [
    [11, 2, 10],
    [10, 3, 9],
    [9, 4, 8],
  ],
  e: [
    [1, 12, 20],
    [2, 13, 19],
    [3, 14, 18],
  ],
  c: [
    [11, 12, 20],
    [10, 13, 19],
    [9, 14, 18],
  ],
};

const HORIZONTAL: readonly Segment[] = ["a", "g", "d"];

const DIGIT_SEGMENTS: readonly (readonly Segment[])[] = [
  ["a", "b", "c", "d", "e", "f"],
  ["b", "c"],
  ["a", "b", "d", "e", "g"],
  ["a", "b", "c", "d", "g"],
  ["b", "c", "f", "g"],
  ["a", "c", "d", "f", "g"],
  ["a", "c", "d", "e", "f", "g"],
  ["a", "b", "c"],
  ["a", "b", "c", "d", "e", "f", "g"],
  ["a", "b", "c", "d", "f", "g"],
];

function ledDigit(lit: readonly Segment[]): Bitmap {
  const pixels = Array.from({ length: 23 }, () => Array.from({ length: 13 }, () => "k"));
  for (const segment of Object.keys(SEGMENT_PIXELS) as Segment[]) {
    const color = lit.includes(segment) ? "r" : "d";
    for (const [line, first, last] of SEGMENT_PIXELS[segment]) {
      for (let i = first; i <= last; i++) {
        const [row, col] = HORIZONTAL.includes(segment) ? [line, i] : [i, line];
        const pixelRow = pixels[row];
        if (pixelRow) pixelRow[col] = color;
      }
    }
  }
  return pixels.map((row) => row.join(""));
}

export const LED_DIGITS = DIGIT_SEGMENTS.map((lit) => sprite(ledDigit(lit)));

export const LED_MINUS = sprite(ledDigit(["g"]));

// The smiley button (26×26)

const NORMAL_FACE: Bitmap = [
  "......kkkkk......",
  "....kkyyyyykk....",
  "...kyyyyyyyyyk...",
  "..kyyyyyyyyyyyk..",
  ".kyyyyyyyyyyyyyk.",
  ".kyyykkyyykkyyyk.",
  "kyyyykkyyykkyyyyk",
  "kyyyyyyyyyyyyyyyk",
  "kyyyyyyyyyyyyyyyk",
  "kyyyyyyyyyyyyyyyk",
  "kyyykyyyyyyykyyyk",
  ".kyyykyyyyykyyyk.",
  ".kyyyykkkkkyyyyk.",
  "..kyyyyyyyyyyyk..",
  "...kyyyyyyyyyk...",
  "....kkyyyyykk....",
  "......kkkkk......",
];

/** The "O" face shown while a button is held on the Board. */
const SURPRISED_FACE: Bitmap = [
  "......kkkkk......",
  "....kkyyyyykk....",
  "...kyyyyyyyyyk...",
  "..kyyyyyyyyyyyk..",
  ".kyyyyyyyyyyyyyk.",
  ".kyyykkyyykkyyyk.",
  "kyyyykkyyykkyyyyk",
  "kyyyyyyyyyyyyyyyk",
  "kyyyyyyyyyyyyyyyk",
  "kyyyyyyyyyyyyyyyk",
  "kyyyyyykkkyyyyyyk",
  ".kyyyykyyykyyyyk.",
  ".kyyyykyyykyyyyk.",
  "..kyyyykkkyyyyk..",
  "...kyyyyyyyyyk...",
  "....kkyyyyykk....",
  "......kkkkk......",
];

/** After a Win: sunglasses over the eyes. */
const COOL_FACE: Bitmap = [
  "......kkkkk......",
  "....kkyyyyykk....",
  "...kyyyyyyyyyk...",
  "..kyyyyyyyyyyyk..",
  ".kyyyyyyyyyyyyyk.",
  ".kkkkkkkkkkkkkkk.",
  "kyykkkkkykkkkkyyk",
  "kyyykkkyyykkkyyyk",
  "kyyyyyyyyyyyyyyyk",
  "kyyyyyyyyyyyyyyyk",
  "kyyykyyyyyyykyyyk",
  ".kyyykyyyyykyyyk.",
  ".kyyyykkkkkyyyyk.",
  "..kyyyyyyyyyyyk..",
  "...kyyyyyyyyyk...",
  "....kkyyyyykk....",
  "......kkkkk......",
];

/** After a Loss: crossed-out eyes and a frown. */
const DEAD_FACE: Bitmap = [
  "......kkkkk......",
  "....kkyyyyykk....",
  "...kyyyyyyyyyk...",
  "..kyyyyyyyyyyyk..",
  ".kyykykyyykykyyk.",
  ".kyyykyyyyykyyyk.",
  "kyyykykyyykykyyyk",
  "kyyyyyyyyyyyyyyyk",
  "kyyyyyyyyyyyyyyyk",
  "kyyyyyyyyyyyyyyyk",
  "kyyyyykkkkkyyyyyk",
  ".kyyykyyyyykyyyk.",
  ".kyykyyyyyyykyyk.",
  "..kyyyyyyyyyyyk..",
  "...kyyyyyyyyyk...",
  "....kkyyyyykk....",
  "......kkkkk......",
];

const SMILEY_BUTTON = bevel(
  26,
  26,
  [
    ["g", "g"],
    ["w", "g"],
    ["w", "g"],
  ],
  "l",
);

const SMILEY_BUTTON_PRESSED = bevel(
  26,
  26,
  [
    ["g", "g"],
    ["g", "l"],
  ],
  "l",
);

export const SMILEY_SPRITES = {
  normal: sprite(overlay(SMILEY_BUTTON, NORMAL_FACE, 4, 4)),
  pressed: sprite(overlay(SMILEY_BUTTON_PRESSED, NORMAL_FACE, 5, 5)),
  surprised: sprite(overlay(SMILEY_BUTTON, SURPRISED_FACE, 4, 4)),
  cool: sprite(overlay(SMILEY_BUTTON, COOL_FACE, 4, 4)),
  dead: sprite(overlay(SMILEY_BUTTON, DEAD_FACE, 4, 4)),
};

// Title bar (16×14 buttons, 16×16 icon)

const TITLE_BUTTON = bevel(
  16,
  14,
  [
    ["w", "k"],
    ["L", "g"],
  ],
  "l",
);

const MINIMISE_GLYPH: Bitmap = ["kkkkkk", "kkkkkk"];

const CLOSE_GLYPH: Bitmap = [
  "kk....kk",
  ".kk..kk.",
  "..kkkk..",
  "...kk...",
  "..kkkk..",
  ".kk..kk.",
  "kk....kk",
];

export const TITLE_SPRITES = {
  icon: sprite(
    overlay(
      Array.from({ length: 16 }, () => ".".repeat(16)),
      MINE,
      1,
      1,
    ),
  ),
  minimise: sprite(overlay(TITLE_BUTTON, MINIMISE_GLYPH, 4, 9)),
  close: sprite(overlay(TITLE_BUTTON, CLOSE_GLYPH, 4, 3)),
};

// Menus (7×7 checkmark)

/** Drawn in black but used as a mask, so it takes the colour of the menu item's text. */
const CHECKMARK: Bitmap = [
  "......k",
  ".....kk",
  "k...kkk",
  "kk.kkk.",
  "kkkkk..",
  ".kkk...",
  "..k....",
];

export const MENU_SPRITES = { check: sprite(CHECKMARK) };
