import { create } from 'zustand'

import { newId } from './id'
import { defaultInk, themeDefaults, type ItemDefaults } from './theme-defaults'
import type { Camera, DuckElement, Theme, Tool } from './types'

const HISTORY_LIMIT = 100

export interface EngineState {
  elements: DuckElement[]
  camera: Camera
  selectedIds: Record<string, true>
  activeTool: Tool
  /** Hides the tool-defaults panel until the user selects an object again. */
  propertiesPanelDismissed: boolean
  editingTextId: string | null
  theme: Theme
  defaults: ItemDefaults
  /** Eraser radius in screen pixels. */
  eraserSize: number
  /** 'stroke' erases only the part under the cursor; 'object' removes whole objects. */
  eraserMode: 'stroke' | 'object'
  viewport: { width: number; height: number }
  past: DuckElement[][]
  future: DuckElement[][]

  // --- element mutations ---
  /** Replace the scene without touching history (use during a live drag). */
  setElements: (next: DuckElement[]) => void
  /** Snapshot the current scene onto the undo stack (call before a committing change). */
  pushHistory: () => void
  /** Snapshot then replace — a single committed mutation. */
  commitElements: (next: DuckElement[]) => void
  undo: () => void
  redo: () => void

  // --- view / selection / tools ---
  setCamera: (patch: Partial<Camera>) => void
  setViewport: (width: number, height: number) => void
  setSelected: (ids: Record<string, true>) => void
  setTool: (tool: Tool) => void
  setPropertiesPanelDismissed: (dismissed: boolean) => void
  setEditingText: (id: string | null) => void
  setTheme: (theme: Theme) => void
  setDefaults: (patch: Partial<ItemDefaults>) => void
  setEraserSize: (size: number) => void
  setEraserMode: (mode: 'stroke' | 'object') => void
  /** Merge the current selection into a new group so they move/select as one. */
  groupSelected: () => void
  /** Remove the topmost group from the selected elements. */
  ungroupSelected: () => void
  /** Reorder the selection in the paint stack (z-order). */
  reorderSelected: (mode: 'front' | 'back' | 'forward' | 'backward') => void
}

export const useEngine = create<EngineState>((set) => ({
  elements: [],
  camera: { scrollX: 0, scrollY: 0, zoom: 1 },
  selectedIds: {},
  activeTool: 'select',
  propertiesPanelDismissed: false,
  editingTextId: null,
  theme: 'light',
  defaults: themeDefaults('light'),
  eraserSize: 12,
  eraserMode: 'stroke',
  viewport: { width: 0, height: 0 },
  past: [],
  future: [],

  setElements: (next) => set({ elements: next }),

  pushHistory: () =>
    set((s) => ({
      past: [...s.past, s.elements].slice(-HISTORY_LIMIT),
      future: [],
    })),

  commitElements: (next) =>
    set((s) => ({
      past: [...s.past, s.elements].slice(-HISTORY_LIMIT),
      future: [],
      elements: next,
    })),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s
      const prev = s.past[s.past.length - 1]
      return {
        past: s.past.slice(0, -1),
        future: [...s.future, s.elements],
        elements: prev,
      }
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s
      const next = s.future[s.future.length - 1]
      return {
        future: s.future.slice(0, -1),
        past: [...s.past, s.elements],
        elements: next,
      }
    }),

  setCamera: (patch) => set((s) => ({ camera: { ...s.camera, ...patch } })),
  setViewport: (width, height) => set({ viewport: { width, height } }),
  setSelected: (ids) =>
    set((s) => ({
      selectedIds: ids,
      // A selected element is always actionable, so show its properties again.
      propertiesPanelDismissed:
        Object.keys(ids).length > 0 ? false : s.propertiesPanelDismissed,
    })),
  setTool: (tool) => set({ activeTool: tool }),
  setPropertiesPanelDismissed: (dismissed) =>
    set({ propertiesPanelDismissed: dismissed }),
  setEditingText: (id) => set({ editingTextId: id }),

  setTheme: (theme) =>
    set((s) => {
      // Swap the neutral ink for the new theme, unless the user picked a color.
      const usingInk = s.defaults.strokeColor === defaultInk(s.theme)
      return {
        theme,
        defaults: usingInk
          ? { ...s.defaults, strokeColor: defaultInk(theme) }
          : s.defaults,
      }
    }),

  setDefaults: (patch) =>
    set((s) => ({ defaults: { ...s.defaults, ...patch } })),

  setEraserSize: (size) => set({ eraserSize: size }),
  setEraserMode: (mode) => set({ eraserMode: mode }),

  groupSelected: () =>
    set((s) => {
      const ids = s.selectedIds
      const members = s.elements.filter((el) => ids[el.id] && !el.isDeleted)
      if (members.length < 2) return s
      const gid = `group-${newId()}`
      return {
        past: [...s.past, s.elements].slice(-HISTORY_LIMIT),
        future: [],
        elements: s.elements.map((el) =>
          ids[el.id] && !el.isDeleted
            ? { ...el, groupIds: [...el.groupIds, gid], version: el.version + 1 }
            : el,
        ),
      }
    }),

  ungroupSelected: () =>
    set((s) => {
      const ids = s.selectedIds
      const members = s.elements.filter((el) => ids[el.id] && !el.isDeleted)
      // Only the topmost group of the selected elements is peeled off.
      if (!members.some((el) => el.groupIds.length > 0)) return s
      return {
        past: [...s.past, s.elements].slice(-HISTORY_LIMIT),
        future: [],
        elements: s.elements.map((el) =>
          ids[el.id] && !el.isDeleted && el.groupIds.length
            ? { ...el, groupIds: el.groupIds.slice(0, -1), version: el.version + 1 }
            : el,
        ),
      }
    }),

  reorderSelected: (mode) =>
    set((s) => {
      const ids = s.selectedIds
      if (Object.keys(ids).length === 0) return s
      const next = reorder(s.elements, ids, mode)
      if (next === s.elements) return s
      return {
        past: [...s.past, s.elements].slice(-HISTORY_LIMIT),
        future: [],
        elements: next,
      }
    }),
}))

/**
 * Reorders the selected elements in the paint stack. Index 0 is the back, the
 * last index the front. The selection moves as a block (keeping relative order),
 * so grouped elements — always selected together — stay contiguous. Returns the
 * same array reference when nothing moves, so callers can skip a history push.
 */
function reorder(
  elements: DuckElement[],
  ids: Record<string, true>,
  mode: 'front' | 'back' | 'forward' | 'backward',
): DuckElement[] {
  const sel = (el: DuckElement) => ids[el.id] === true
  if (mode === 'front') {
    const rest = elements.filter((el) => !sel(el))
    const picked = elements.filter(sel)
    if (picked.length === 0 || picked.length === elements.length) return elements
    return [...rest, ...picked]
  }
  if (mode === 'back') {
    const rest = elements.filter((el) => !sel(el))
    const picked = elements.filter(sel)
    if (picked.length === 0 || picked.length === elements.length) return elements
    return [...picked, ...rest]
  }
  const arr = [...elements]
  let moved = false
  if (mode === 'forward') {
    for (let i = arr.length - 2; i >= 0; i--) {
      if (sel(arr[i]) && !sel(arr[i + 1])) {
        ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
        moved = true
      }
    }
  } else {
    for (let i = 1; i < arr.length; i++) {
      if (sel(arr[i]) && !sel(arr[i - 1])) {
        ;[arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]
        moved = true
      }
    }
  }
  return moved ? arr : elements
}

/** Non-deleted elements, in paint order. */
export function liveElements(state: EngineState): DuckElement[] {
  return state.elements.filter((el) => !el.isDeleted)
}
