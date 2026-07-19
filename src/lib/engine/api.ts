import { getCommonBounds } from './coords'
import { liveElements, useEngine } from './store'
import type { DuckElement, Theme } from './types'

/**
 * Facade that mirrors the small slice of `ExcalidrawImperativeAPI` the app shell
 * used to consume, so components (AppMenu, ColorControl, StencilPanel, BoardPage,
 * stencils/insert, export) migrate with almost no changes. It reads/writes the
 * Zustand store imperatively via getState/setState.
 */

export interface DuckAppState {
  scrollX: number
  scrollY: number
  zoom: { value: number }
  width: number
  height: number
  selectedElementIds: Record<string, true>
  currentItemStrokeColor: string
  currentItemBackgroundColor: string
  theme: Theme
  viewBackgroundColor: string
}

export interface UpdateScenePayload {
  elements?: DuckElement[]
  appState?: Partial<{
    selectedElementIds: Record<string, true>
    currentItemStrokeColor: string
    currentItemBackgroundColor: string
  }>
  /** Push this change onto the undo stack (replaces Excalidraw's captureUpdate). */
  commit?: boolean
}

export interface DuckboardAPI {
  getSceneElements: () => DuckElement[]
  getAppState: () => DuckAppState
  getTheme: () => Theme
  getFiles: () => Record<string, never>
  addFiles: (files: unknown[]) => void
  updateScene: (payload: UpdateScenePayload) => void
  scrollToContent: (
    elements?: DuckElement[],
    opts?: { fitToContent?: boolean },
  ) => void
}

export const duckboardApi: DuckboardAPI = {
  getSceneElements: () => liveElements(useEngine.getState()),

  getAppState: () => {
    const s = useEngine.getState()
    return {
      scrollX: s.camera.scrollX,
      scrollY: s.camera.scrollY,
      zoom: { value: s.camera.zoom },
      width: s.viewport.width,
      height: s.viewport.height,
      selectedElementIds: s.selectedIds,
      currentItemStrokeColor: s.defaults.strokeColor,
      currentItemBackgroundColor: s.defaults.backgroundColor,
      theme: s.theme,
      viewBackgroundColor: 'transparent',
    }
  },

  getTheme: () => useEngine.getState().theme,

  getFiles: () => ({}),

  addFiles: () => {
    /* no-op in v1 (no embedded images yet) */
  },

  updateScene: (payload) => {
    const s = useEngine.getState()
    if (payload.elements) {
      if (payload.commit) s.commitElements(payload.elements)
      else s.setElements(payload.elements)
    }
    const app = payload.appState
    if (app) {
      if (app.selectedElementIds) s.setSelected(app.selectedElementIds)
      if (app.currentItemStrokeColor !== undefined)
        s.setDefaults({ strokeColor: app.currentItemStrokeColor })
      if (app.currentItemBackgroundColor !== undefined)
        s.setDefaults({ backgroundColor: app.currentItemBackgroundColor })
    }
  },

  scrollToContent: (elements, opts) => {
    const s = useEngine.getState()
    const els = elements ?? liveElements(s)
    if (els.length === 0) return
    const [minX, minY, maxX, maxY] = getCommonBounds(els)
    const contentW = Math.max(1, maxX - minX)
    const contentH = Math.max(1, maxY - minY)
    const { width, height } = s.viewport
    if (width === 0 || height === 0) return

    const padding = 0.9
    let zoom = s.camera.zoom
    if (opts?.fitToContent) {
      zoom = Math.min(
        (width / contentW) * padding,
        (height / contentH) * padding,
      )
      zoom = Math.max(0.1, Math.min(zoom, 30))
    }
    // Center the content bbox in the viewport.
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    s.setCamera({
      zoom,
      scrollX: width / 2 / zoom - centerX,
      scrollY: height / 2 / zoom - centerY,
    })
  },
}

/** Stable hook returning the singleton API (kept as a hook for call-site symmetry). */
export function useDuckboardApi(): DuckboardAPI {
  return duckboardApi
}
