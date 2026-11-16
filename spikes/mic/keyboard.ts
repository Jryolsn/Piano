const BLACK = new Set([1, 3, 6, 8, 10]);
const LOWEST = 21; // A0
const HIGHEST = 108; // C8
const SVG_NS = 'http://www.w3.org/2000/svg';

const isBlack = (midi: number) => BLACK.has(midi % 12);

/** SVG piano keyboard from `from` to `to` (inclusive) with `highlight` keys marked. */
export function keyboardSvg(highlight: readonly number[], from = LOWEST, to = HIGHEST): SVGSVGElement {
  const whites: number[] = [];
  for (let m = from; m <= to; m++) if (!isBlack(m)) whites.push(m);
  const w = 10;
  const h = 48;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${whites.length * w} ${h}`);
  svg.setAttribute('width', '100%');

  const rect = (x: number, width: number, height: number, midi: number, black: boolean) => {
    const r = document.createElementNS(SVG_NS, 'rect');
    Object.entries({ x, y: 0, width, height, stroke: '#555', 'stroke-width': 0.5 }).forEach(([k, v]) =>
      r.setAttribute(k, String(v)),
    );
    r.setAttribute('fill', highlight.includes(midi) ? '#ffd23f' : black ? '#222' : '#f5f5f5');
    svg.append(r);
  };

  whites.forEach((m, i) => rect(i * w, w, h, m, false));
  whites.forEach((m, i) => {
    if (m + 1 <= to && isBlack(m + 1)) rect(i * w + w * 0.65, w * 0.7, h * 0.6, m + 1, true);
  });
  return svg;
}

/** A zoomed range around the highlighted keys, padded to whole octaves. */
export function zoomRange(keys: readonly number[]): [number, number] {
  const lo = Math.min(...keys);
  const hi = Math.max(...keys);
  const from = Math.max(LOWEST, Math.floor((lo - 5) / 12) * 12);
  const to = Math.min(HIGHEST, Math.max(Math.ceil((hi + 5) / 12) * 12, from + 24));
  return [from, to];
}
