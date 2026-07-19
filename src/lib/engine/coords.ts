import type { Camera, DuckElement, Point } from './types'

/**
 * Coordinate convention (kept identical to the previous engine's math so the
 * drag-and-drop and centering code carries over unchanged):
 *   sceneX = viewportX / zoom - scrollX
 * The SVG root <g> uses transform="scale(zoom) translate(scrollX, scrollY)".
 */

export function viewportToScene(
  viewportX: number,
  viewportY: number,
  cam: Camera,
): Point {
  return [viewportX / cam.zoom - cam.scrollX, viewportY / cam.zoom - cam.scrollY]
}

export function sceneToViewport(
  sceneX: number,
  sceneY: number,
  cam: Camera,
): Point {
  return [(sceneX + cam.scrollX) * cam.zoom, (sceneY + cam.scrollY) * cam.zoom]
}

/** Axis-aligned bounds of a single element (ignores rotation for v1). */
export function elementBounds(
  el: DuckElement,
): [number, number, number, number] {
  return [el.x, el.y, el.x + el.width, el.y + el.height]
}

/** Combined bounds of many elements: [minX, minY, maxX, maxY]. */
export function getCommonBounds(
  elements: DuckElement[],
): [number, number, number, number] {
  if (elements.length === 0) return [0, 0, 0, 0]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const el of elements) {
    const [x1, y1, x2, y2] = elementBounds(el)
    if (x1 < minX) minX = x1
    if (y1 < minY) minY = y1
    if (x2 > maxX) maxX = x2
    if (y2 > maxY) maxY = y2
  }
  return [minX, minY, maxX, maxY]
}
