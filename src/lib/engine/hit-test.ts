import { hasPoints, type DuckElement, type Point } from './types'

/** Rotate a scene point into an element's local (unrotated) frame. */
function toLocal(el: DuckElement, p: Point): Point {
  if (!el.angle) return [p[0] - el.x, p[1] - el.y]
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const cos = Math.cos(-el.angle)
  const sin = Math.sin(-el.angle)
  const dx = p[0] - cx
  const dy = p[1] - cy
  const rx = dx * cos - dy * sin + cx
  const ry = dx * sin + dy * cos + cy
  return [rx - el.x, ry - el.y]
}

function distToSegment(
  p: Point,
  a: Point,
  b: Point,
): number {
  const [px, py] = p
  const [ax, ay] = a
  const [bx, by] = b
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function distToPolyline(points: Point[], p: Point): number {
  if (points.length === 0) return Infinity
  if (points.length === 1) return Math.hypot(p[0] - points[0][0], p[1] - points[0][1])
  let min = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const d = distToSegment(p, points[i], points[i + 1])
    if (d < min) min = d
  }
  return min
}

/** Whether a scene point hits an element, within `tol` scene units. */
export function hitTest(el: DuckElement, p: Point, tol: number): boolean {
  const [lx, ly] = toLocal(el, p)
  const w = el.width
  const h = el.height

  if (hasPoints(el)) {
    return distToPolyline(el.points, [lx, ly]) <= tol + el.strokeWidth
  }

  if (el.type === 'ellipse') {
    const rx = w / 2 + tol
    const ry = h / 2 + tol
    if (rx <= 0 || ry <= 0) return false
    const nx = (lx - w / 2) / rx
    const ny = (ly - h / 2) / ry
    return nx * nx + ny * ny <= 1
  }

  if (el.type === 'diamond') {
    const rx = w / 2 + tol
    const ry = h / 2 + tol
    if (rx <= 0 || ry <= 0) return false
    return Math.abs(lx - w / 2) / rx + Math.abs(ly - h / 2) / ry <= 1
  }

  // rectangle, text: inside the (tolerance-expanded) box
  return lx >= -tol && ly >= -tol && lx <= w + tol && ly <= h + tol
}

/** Elements under a point, topmost first. */
export function elementsAtPoint(
  elements: DuckElement[],
  p: Point,
  tol: number,
): DuckElement[] {
  const hits: DuckElement[] = []
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitTest(elements[i], p, tol)) hits.push(elements[i])
  }
  return hits
}

/**
 * Fallback hit for grouped elements (stencils): a click anywhere inside a
 * group's overall bounding box selects that group. This makes shapes built from
 * open lines (e.g. the database cylinder) selectable by clicking their interior.
 * Returns a member of the topmost matching group, or undefined.
 */
export function groupHitAt(
  elements: DuckElement[],
  p: Point,
): DuckElement | undefined {
  interface Box {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  const boxes = new Map<string, Box>()
  for (const el of elements) {
    const gid = el.groupIds[el.groupIds.length - 1]
    if (!gid) continue
    const b = boxes.get(gid) ?? {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    }
    b.minX = Math.min(b.minX, el.x)
    b.minY = Math.min(b.minY, el.y)
    b.maxX = Math.max(b.maxX, el.x + el.width)
    b.maxY = Math.max(b.maxY, el.y + el.height)
    boxes.set(gid, b)
  }
  for (let i = elements.length - 1; i >= 0; i--) {
    const gid = elements[i].groupIds[elements[i].groupIds.length - 1]
    if (!gid) continue
    const b = boxes.get(gid)!
    if (p[0] >= b.minX && p[0] <= b.maxX && p[1] >= b.minY && p[1] <= b.maxY) {
      return elements[i]
    }
  }
  return undefined
}

/** Elements whose bounding box intersects a marquee rectangle (scene coords). */
export function marqueeHits(
  elements: DuckElement[],
  box: { x1: number; y1: number; x2: number; y2: number },
): DuckElement[] {
  const minX = Math.min(box.x1, box.x2)
  const maxX = Math.max(box.x1, box.x2)
  const minY = Math.min(box.y1, box.y2)
  const maxY = Math.max(box.y1, box.y2)
  return elements.filter(
    (el) =>
      el.x < maxX &&
      el.x + el.width > minX &&
      el.y < maxY &&
      el.y + el.height > minY,
  )
}
