import * as React from 'react'

import { Board } from '@/components/board/Board'
import { Toolbar } from '@/components/board/Toolbar'
import { FloatingControls } from '@/components/board/FloatingControls'
import { PresenceBar } from '@/components/board/PresenceBar'
import { StencilPanel } from '@/components/StencilPanel'
import { ColorControl } from '@/components/ColorControl'
import { duckboardApi } from '@/lib/engine/api'
import { useEngine } from '@/lib/engine/store'
import { insertSkeleton } from '@/lib/stencils/insert'
import { SHAPE_DRAG_TYPE, resolveShape } from '@/lib/stencils'
import { loadScene, saveScene, debounce } from '@/lib/persistence'
import { useTheme } from '@/lib/theme'

export function BoardPage() {
  const { theme } = useTheme()
  const [stencilsOpen, setStencilsOpen] = React.useState(false)

  // Load persisted scene once, then autosave on every scene change (debounced).
  React.useEffect(() => {
    const stored = loadScene()
    if (stored) useEngine.getState().setElements(stored)

    const save = debounce(saveScene, 500)
    const unsub = useEngine.subscribe((state, prev) => {
      if (state.elements !== prev.elements) {
        save(state.elements.filter((el) => !el.isDeleted))
      }
    })
    return unsub
  }, [])

  // Keep the engine's theme (for defaults + board background) in sync.
  React.useEffect(() => {
    useEngine.getState().setTheme(theme)
  }, [theme])

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const ref = e.dataTransfer.getData(SHAPE_DRAG_TYPE)
    if (!ref) return
    e.preventDefault()
    const resolved = resolveShape(ref)
    if (!resolved) return
    const rect = e.currentTarget.getBoundingClientRect()
    const { scrollX, scrollY, zoom } = duckboardApi.getAppState()
    const at = {
      x: (e.clientX - rect.left) / zoom.value - scrollX,
      y: (e.clientY - rect.top) / zoom.value - scrollY,
    }
    insertSkeleton(duckboardApi, resolved.key, resolved.skeleton, at)
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(SHAPE_DRAG_TYPE)) e.preventDefault()
      }}
      onDrop={handleDrop}
    >
      <Board />
      <Toolbar />
      <PresenceBar />
      <FloatingControls
        api={duckboardApi}
        onToggleStencils={() => setStencilsOpen((v) => !v)}
        stencilsOpen={stencilsOpen}
      />
      <StencilPanel
        api={duckboardApi}
        open={stencilsOpen}
        onClose={() => setStencilsOpen(false)}
      />
      <ColorControl />
    </div>
  )
}
