import type { DuckboardAPI } from '@/lib/engine/api'
import { getCommonBounds } from '@/lib/engine/coords'
import { skeletonToElements, type Skeleton } from '@/lib/engine/skeleton'
import type { DuckElement } from '@/lib/engine/types'

let groupCounter = 0

/** Center of the currently visible canvas area, in scene coordinates. */
function viewportCenter(api: DuckboardAPI) {
  const { scrollX, scrollY, width, height, zoom } = api.getAppState()
  // Fall back to the window size if the store's viewport hasn't been measured
  // yet (width/height === 0) — otherwise the center collapses to (-scrollX,
  // -scrollY), dumping the stencil into the top-left corner behind the toolbar.
  const w = width || window.innerWidth
  const h = height || window.innerHeight
  return {
    x: w / 2 / zoom.value - scrollX,
    y: h / 2 / zoom.value - scrollY,
  }
}

/**
 * Converts a stencil/template skeleton into real elements, centers the group on
 * a target scene point (or the viewport center), groups the parts so they move
 * as one, and selects them.
 *
 * @param at optional scene coordinate to center the group on (e.g. a drop point)
 */
export function insertSkeleton(
  api: DuckboardAPI,
  key: string,
  skeleton: Skeleton[],
  at?: { x: number; y: number },
) {
  const converted = skeletonToElements(skeleton, api.getTheme())
  if (converted.length === 0) return

  const [minX, minY, maxX, maxY] = getCommonBounds(converted)
  // Drop at the given point, else cascade around the viewport center.
  const cascade = at ? 0 : (groupCounter % 8) * 40
  const center = at ?? viewportCenter(api)
  const dx = center.x - (minX + maxX) / 2 + cascade
  const dy = center.y - (minY + maxY) / 2 + cascade

  const groupId = `stencil-${key}-${groupCounter++}`
  const positioned: DuckElement[] = converted.map((el) => ({
    ...el,
    x: el.x + dx,
    y: el.y + dy,
    groupIds: [...el.groupIds, groupId],
  }))

  api.updateScene({
    elements: [...api.getSceneElements(), ...positioned],
    appState: {
      selectedElementIds: Object.fromEntries(
        positioned.map((el) => [el.id, true]),
      ),
    },
    commit: true,
  })
}
