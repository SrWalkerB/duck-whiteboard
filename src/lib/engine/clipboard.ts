import { newId } from './id'
import type { DuckElement, Point } from './types'

/** A private board clipboard. It intentionally contains only live elements. */
export interface BoardClipboard {
  elements: DuckElement[]
  pasteCount: number
}

/**
 * Captures the selected elements and any label belonging to a selected shape.
 * A label needs its container beside it, otherwise copying a shape would leave
 * the pasted label pointing back at the original shape.
 */
export function copySelection(
  elements: DuckElement[],
  selectedIds: Record<string, true>,
): BoardClipboard | null {
  const ids = new Set(
    elements
      .filter((el) => selectedIds[el.id] && !el.isDeleted)
      .map((el) => el.id),
  )
  if (ids.size === 0) return null

  for (const el of elements) {
    if (el.type === 'text' && el.containerId && ids.has(el.containerId)) {
      ids.add(el.id)
    }
  }

  return {
    elements: elements.filter((el) => ids.has(el.id) && !el.isDeleted),
    pasteCount: 0,
  }
}

/**
 * Creates a fresh, offset copy of a clipboard selection. References are kept
 * only when both sides were copied, so a pasted arrow/label never affects an
 * element from the original selection.
 */
export function pasteSelection(clipboard: BoardClipboard): {
  elements: DuckElement[]
  selectedIds: Record<string, true>
} {
  const sourceIds = new Set(clipboard.elements.map((el) => el.id))
  const ids = new Map(clipboard.elements.map((el) => [el.id, newId()]))
  const groupIds = new Map<string, string>()
  const offset = 24 * (clipboard.pasteCount + 1)

  for (const el of clipboard.elements) {
    for (const groupId of el.groupIds) {
      if (!groupIds.has(groupId)) groupIds.set(groupId, `group-${newId()}`)
    }
  }

  const elements: DuckElement[] = clipboard.elements.map((el) => {
    const base = {
      ...el,
      id: ids.get(el.id)!,
      x: el.x + offset,
      y: el.y + offset,
      groupIds: el.groupIds.map((groupId) => groupIds.get(groupId)!),
      version: 1,
      isDeleted: false,
    }

    if (el.type === 'line' || el.type === 'arrow') {
      return {
        ...base,
        points: el.points.map(([x, y]): Point => [x, y]),
        startBinding:
          el.startBinding && sourceIds.has(el.startBinding.elementId)
            ? { ...el.startBinding, elementId: ids.get(el.startBinding.elementId)! }
            : undefined,
        endBinding:
          el.endBinding && sourceIds.has(el.endBinding.elementId)
            ? { ...el.endBinding, elementId: ids.get(el.endBinding.elementId)! }
            : undefined,
      }
    }
    if (el.type === 'freedraw') {
      return { ...base, points: el.points.map(([x, y]): Point => [x, y]) }
    }
    if (el.type === 'text') {
      return {
        ...base,
        containerId:
          el.containerId && sourceIds.has(el.containerId)
            ? ids.get(el.containerId)!
            : null,
      }
    }
    return base
  })

  return {
    elements,
    selectedIds: Object.fromEntries(elements.map((el) => [el.id, true])),
  }
}
