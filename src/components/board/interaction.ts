import type { DuckElement, Point } from '@/lib/engine/types'

/** Handle identifiers for the 8-point selection resize box. */
export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export type Interaction =
  | { kind: 'none' }
  | {
      kind: 'panning'
      startClient: Point
      startScroll: Point
    }
  | { kind: 'creating'; id: string; start: Point }
  | { kind: 'freedrawing'; id: string; origin: Point }
  | { kind: 'erasing' }
  | {
      kind: 'translating'
      start: Point
      orig: Map<string, Point>
    }
  | { kind: 'marquee'; start: Point }
  | {
      kind: 'resizing'
      handle: Handle
      anchor: Point
      origBox: { x: number; y: number; w: number; h: number }
      orig: DuckElement[]
    }
  | {
      kind: 'rotating'
      center: Point
      startAngle: number
      orig: DuckElement[]
    }
  | {
      kind: 'binding-arrow-endpoint'
      id: string
      endpoint: 'start' | 'end'
      orig: DuckElement
    }

/** Selection bounding box for the given element ids. */
export function selectionBounds(
  elements: DuckElement[],
  ids: Record<string, true>,
): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let count = 0
  for (const el of elements) {
    if (!ids[el.id]) continue
    count++
    if (el.x < minX) minX = el.x
    if (el.y < minY) minY = el.y
    if (el.x + el.width > maxX) maxX = el.x + el.width
    if (el.y + el.height > maxY) maxY = el.y + el.height
  }
  if (count === 0) return null
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** Handle center positions (scene coords) for a selection box. */
export function handlePositions(box: {
  x: number
  y: number
  w: number
  h: number
}): Record<Handle, Point> {
  const { x, y, w, h } = box
  return {
    nw: [x, y],
    n: [x + w / 2, y],
    ne: [x + w, y],
    e: [x + w, y + h / 2],
    se: [x + w, y + h],
    s: [x + w / 2, y + h],
    sw: [x, y + h],
    w: [x, y + h / 2],
  }
}

/** Rotation handle position (scene coords), above the selection box top-center. */
export function rotationHandlePos(
  box: { x: number; y: number; w: number; h: number },
  zoom: number,
): Point {
  return [box.x + box.w / 2, box.y - 26 / zoom]
}

/** The anchor (opposite point) that stays fixed while dragging a handle. */
export function anchorFor(
  handle: Handle,
  box: { x: number; y: number; w: number; h: number },
): Point {
  const { x, y, w, h } = box
  switch (handle) {
    case 'se':
      return [x, y]
    case 'sw':
      return [x + w, y]
    case 'ne':
      return [x, y + h]
    case 'nw':
      return [x + w, y + h]
    case 'n':
      return [x, y + h]
    case 's':
      return [x, y]
    case 'e':
      return [x, y]
    case 'w':
      return [x + w, y]
  }
}

/** Which axes a handle scales. */
export function handleAxes(handle: Handle): { sx: boolean; sy: boolean } {
  switch (handle) {
    case 'n':
    case 's':
      return { sx: false, sy: true }
    case 'e':
    case 'w':
      return { sx: true, sy: false }
    default:
      return { sx: true, sy: true }
  }
}
