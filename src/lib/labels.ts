export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface LabelInput {
  id: string;
  text: string;
  cx: number;
  cy: number;
  /** estimated rendered width in px */
  w: number;
}

export interface PlacedLabel extends LabelInput {
  x: number;
  y: number;
  side: 1 | -1;
  /** true when no candidate fit; shown only while hovered */
  hidden: boolean;
}

const DYS = [-16, 16, 0, -32, 32, -48, 48, -64, 64, -80, 80, -100, 100, -120, 120];
const DXS = [12, 28, 44];
const SIDES: (1 | -1)[] = [1, -1];
const H2 = 9;

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Greedy collision-avoiding placement, left to right, as in the reference. */
export function placeLabels(inputs: LabelInput[], obstacles: Box[], plot: Box): PlacedLabel[] {
  const placed: Box[] = [];
  const hit = (b: Box) =>
    b.x0 < plot.x0 + 2 ||
    b.x1 > plot.x1 - 2 ||
    b.y0 < plot.y0 + 2 ||
    b.y1 > plot.y1 - 2 ||
    placed.some((q) => overlaps(b, q)) ||
    obstacles.some((q) => overlaps(b, q));

  return [...inputs]
    .sort((a, b) => a.cx - b.cx)
    .map((l) => {
      for (const dy of DYS) {
        for (const dx of DXS) {
          for (const side of SIDES) {
            const x = l.cx + side * dx;
            const y = l.cy + dy;
            const b: Box = side > 0 ? { x0: x, x1: x + l.w, y0: y - H2, y1: y + H2 } : { x0: x - l.w, x1: x, y0: y - H2, y1: y + H2 };
            if (!hit(b)) {
              placed.push(b);
              return { ...l, x, y, side, hidden: false };
            }
          }
        }
      }
      return { ...l, x: l.cx + 12, y: l.cy - 16, side: 1, hidden: true };
    });
}
