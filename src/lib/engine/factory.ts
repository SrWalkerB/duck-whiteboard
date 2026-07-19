import { newId, newSeed } from './id'
import type { ItemDefaults } from './theme-defaults'
import type { DuckElement, Point, TextElement } from './types'
import { hasPoints } from './types'

function base(defaults: ItemDefaults) {
  return {
    id: newId(),
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: defaults.strokeColor,
    backgroundColor: defaults.backgroundColor,
    fillStyle: defaults.fillStyle,
    strokeWidth: defaults.strokeWidth,
    roughness: defaults.roughness,
    seed: newSeed(),
    opacity: 100,
    groupIds: [] as string[],
    version: 1,
    isDeleted: false,
    roundness: null as number | null,
  }
}

export function createShape(
  type: 'rectangle' | 'ellipse' | 'diamond',
  at: Point,
  defaults: ItemDefaults,
): DuckElement {
  return { ...base(defaults), type, x: at[0], y: at[1] } as DuckElement
}

export function createLinear(
  type: 'line' | 'arrow',
  at: Point,
  defaults: ItemDefaults,
): DuckElement {
  return {
    ...base(defaults),
    type,
    x: at[0],
    y: at[1],
    points: [
      [0, 0],
      [0, 0],
    ],
  } as DuckElement
}

export function createFreedraw(at: Point, defaults: ItemDefaults): DuckElement {
  return {
    ...base(defaults),
    type: 'freedraw',
    x: at[0],
    y: at[1],
    points: [[0, 0]],
    pressures: [],
  } as DuckElement
}

export function createText(
  at: Point,
  defaults: ItemDefaults,
): TextElement {
  return {
    ...base(defaults),
    type: 'text',
    x: at[0],
    y: at[1],
    text: '',
    fontSize: defaults.fontSize,
    fontFamily: defaults.fontFamily,
    textAlign: 'left',
    verticalAlign: 'top',
    containerId: null,
    lineHeight: 1.25,
  }
}

/**
 * Resamples a polyline so consecutive points are at most `step` apart. This
 * makes point-level erasing precise regardless of the original point spacing
 * (a 2-point line becomes many points, so only the touched region is removed).
 */
function densify(
  points: Point[],
  pressures: number[] | undefined,
  step: number,
): { points: Point[]; pressures?: number[] } {
  if (points.length < 2) return { points, pressures }
  const out: Point[] = [points[0]]
  const outP: number[] = pressures ? [pressures[0] ?? 0.5] : []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const d = Math.hypot(b[0] - a[0], b[1] - a[1])
    const n = Math.max(1, Math.ceil(d / step))
    const pa = pressures ? (pressures[i - 1] ?? 0.5) : 0.5
    const pb = pressures ? (pressures[i] ?? 0.5) : 0.5
    for (let k = 1; k <= n; k++) {
      const t = k / n
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
      if (pressures) outP.push(pa + (pb - pa) * t)
    }
  }
  return { points: out, pressures: pressures ? outP : undefined }
}

/**
 * Traces a closed shape's perimeter as an open `line` element (points relative
 * to x/y, filling the same bbox). Used so the partial eraser can trim a
 * rectangle/ellipse/diamond outline instead of deleting the whole shape — after
 * a cut it's no longer a clean shape anyway, so it becomes line pieces.
 */
export function outlineElement(el: DuckElement): DuckElement {
  const { width: w, height: h } = el
  let points: Point[]
  if (el.type === 'diamond') {
    points = [
      [w / 2, 0],
      [w, h / 2],
      [w / 2, h],
      [0, h / 2],
      [w / 2, 0],
    ]
  } else if (el.type === 'ellipse') {
    const n = 64
    points = []
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2
      points.push([(w / 2) * (1 + Math.cos(t)), (h / 2) * (1 + Math.sin(t))])
    }
  } else {
    // rectangle (and any other box-like shape)
    points = [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
      [0, 0],
    ]
  }
  return {
    ...el,
    type: 'line',
    points,
    backgroundColor: 'transparent',
    roundness: null,
  } as DuckElement
}

/**
 * Partial eraser for point-based elements (freedraw / line / arrow): removes the
 * points within `radius` scene units of `wp` and splits the survivors into one
 * or more pieces. The stroke is densified first so only the exact touched region
 * disappears (not whole segments). Returns the same element (by reference) when
 * nothing is erased, an empty array when it's fully gone, or the new pieces.
 */
export function erasePointBased(
  el: DuckElement,
  wp: Point,
  radius: number,
): DuckElement[] {
  if (!hasPoints(el)) return [el]

  // Cheap early-out: skip if the eraser is nowhere near the element's box.
  const margin = radius
  if (
    wp[0] < el.x - margin ||
    wp[0] > el.x + el.width + margin ||
    wp[1] < el.y - margin ||
    wp[1] > el.y + el.height + margin
  ) {
    return [el]
  }

  const srcPressures = el.type === 'freedraw' ? el.pressures : undefined
  const step = Math.max(1, Math.min(radius / 3, 4))
  const { points: pts, pressures } = densify(el.points, srcPressures, step)

  const keep = pts.map(
    ([px, py]) => Math.hypot(el.x + px - wp[0], el.y + py - wp[1]) > radius,
  )
  if (keep.every(Boolean)) return [el] // untouched — preserve the reference

  const runs: number[][] = []
  let cur: number[] = []
  for (let i = 0; i < pts.length; i++) {
    if (keep[i]) cur.push(i)
    else if (cur.length) {
      runs.push(cur)
      cur = []
    }
  }
  if (cur.length) runs.push(cur)

  const out: DuckElement[] = []
  for (const run of runs) {
    if (run.length < 2) continue
    const subPoints: Point[] = run.map((i) => pts[i])
    const base = { ...el, id: newId(), points: subPoints } as DuckElement
    if (pressures && base.type === 'freedraw') {
      base.pressures = run.map((i) => pressures[i] ?? 0.5)
    }
    out.push(normalizeElement(base))
  }
  return out
}

/**
 * Recomputes x/y/width/height for point-based elements so (x, y) is the true
 * top-left and points sit in [0,w]x[0,h]. Call when a create/drag gesture ends.
 */
export function normalizeElement(el: DuckElement): DuckElement {
  if (!hasPoints(el) || el.points.length === 0) return el
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [px, py] of el.points) {
    if (px < minX) minX = px
    if (py < minY) minY = py
    if (px > maxX) maxX = px
    if (py > maxY) maxY = py
  }
  const shifted: Point[] = el.points.map(([px, py]) => [px - minX, py - minY])
  return {
    ...el,
    x: el.x + minX,
    y: el.y + minY,
    width: maxX - minX,
    height: maxY - minY,
    points: shifted,
  }
}
