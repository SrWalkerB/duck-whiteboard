import type { ArrowBinding, DuckElement, LinearElement, Point } from './types'

const BINDABLE_TYPES = new Set(['rectangle', 'ellipse', 'diamond'])

export function isBindableElement(el: DuckElement): boolean {
  return !el.isDeleted && BINDABLE_TYPES.has(el.type)
}

function rotatePoint(p: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = p[0] - center[0]
  const dy = p[1] - center[1]
  return [center[0] + dx * cos - dy * sin, center[1] + dx * sin + dy * cos]
}

function unrotatePoint(p: Point, center: Point, angle: number): Point {
  return rotatePoint(p, center, -angle)
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/** Returns the point on a shape's perimeter in the direction of `toward`. */
export function bindingForPoint(
  target: DuckElement,
  toward: Point,
): ArrowBinding {
  const center: Point = [
    target.x + target.width / 2,
    target.y + target.height / 2,
  ]
  const localToward = unrotatePoint(toward, center, target.angle)
  const localCenter: Point = [
    target.x + target.width / 2,
    target.y + target.height / 2,
  ]
  let dx = localToward[0] - localCenter[0]
  let dy = localToward[1] - localCenter[1]
  if (Math.abs(dx) + Math.abs(dy) < 0.001) dx = 1

  const halfW = Math.max(target.width / 2, 0.5)
  const halfH = Math.max(target.height / 2, 0.5)
  let scale: number
  if (target.type === 'ellipse') {
    scale = 1 / Math.sqrt((dx / halfW) ** 2 + (dy / halfH) ** 2)
  } else if (target.type === 'diamond') {
    scale = 1 / (Math.abs(dx) / halfW + Math.abs(dy) / halfH)
  } else {
    scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH)
  }
  const edge = rotatePoint(
    [localCenter[0] + dx * scale, localCenter[1] + dy * scale],
    center,
    target.angle,
  )
  return {
    elementId: target.id,
    focus: [
      clamp01((unrotatePoint(edge, center, target.angle)[0] - target.x) / (target.width || 1)),
      clamp01((unrotatePoint(edge, center, target.angle)[1] - target.y) / (target.height || 1)),
    ],
  }
}

export function pointForBinding(
  target: DuckElement,
  binding: ArrowBinding,
): Point {
  const local: Point = [
    target.x + target.width * binding.focus[0],
    target.y + target.height * binding.focus[1],
  ]
  return rotatePoint(
    local,
    [target.x + target.width / 2, target.y + target.height / 2],
    target.angle,
  )
}

export function arrowWorldPoints(el: LinearElement): Point[] {
  return el.points.map(([x, y]) => [el.x + x, el.y + y])
}

/** Replaces an arrow's endpoints while retaining any intermediate points. */
export function setArrowEndpoints(
  el: LinearElement,
  start: Point,
  end: Point,
): LinearElement {
  const points = arrowWorldPoints(el)
  if (points.length < 2) points.splice(0, points.length, start, end)
  else {
    points[0] = start
    points[points.length - 1] = end
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return {
    ...el,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    points: points.map(([x, y]) => [x - minX, y - minY]),
  }
}

function samePoint(a: Point, b: Point): boolean {
  return a[0] === b[0] && a[1] === b[1]
}

/** Reprojects all bound arrow endpoints after scene geometry changes. */
export function refreshBoundArrows(elements: DuckElement[]): DuckElement[] {
  const byId = new Map(elements.map((el) => [el.id, el]))
  return elements.map((el) => {
    if (el.type !== 'arrow') return el
    const current = arrowWorldPoints(el)
    if (current.length < 2) return el
    const startTarget = el.startBinding
      ? byId.get(el.startBinding.elementId)
      : undefined
    const endTarget = el.endBinding
      ? byId.get(el.endBinding.elementId)
      : undefined
    const start = startTarget
      ? pointForBinding(startTarget, el.startBinding!)
      : current[0]
    const end = endTarget
      ? pointForBinding(endTarget, el.endBinding!)
      : current[current.length - 1]
    if (samePoint(start, current[0]) && samePoint(end, current[current.length - 1])) {
      return el
    }
    return { ...setArrowEndpoints(el, start, end), version: el.version + 1 }
  })
}
