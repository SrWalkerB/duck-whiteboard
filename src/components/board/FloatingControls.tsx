import { useTranslation } from 'react-i18next'
import { Minus, Plus, Shapes } from 'lucide-react'

import { DuckLogo } from '@/components/DuckLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AppMenu } from '@/components/AppMenu'
import { Button } from '@/components/ui/button'
import { useEngine } from '@/lib/engine/store'
import type { DuckboardAPI } from '@/lib/engine/api'

interface FloatingControlsProps {
  api: DuckboardAPI
  onToggleStencils: () => void
  stencilsOpen: boolean
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 30

export function FloatingControls({
  api,
  onToggleStencils,
  stencilsOpen,
}: FloatingControlsProps) {
  const { t } = useTranslation()
  const zoom = useEngine((s) => s.camera.zoom)
  const setCamera = useEngine((s) => s.setCamera)

  const zoomBy = (factor: number) => {
    const s = useEngine.getState()
    const { width, height } = s.viewport
    const [cx, cy] = [
      width / 2 / s.camera.zoom - s.camera.scrollX,
      height / 2 / s.camera.zoom - s.camera.scrollY,
    ]
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.camera.zoom * factor))
    setCamera({
      zoom: next,
      scrollX: width / 2 / next - cx,
      scrollY: height / 2 / next - cy,
    })
  }

  return (
    <>
      {/* Brand — floating, top-left */}
      <div className="pointer-events-auto absolute left-3 top-3 z-10 flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card/90 px-3 py-2 shadow-lg backdrop-blur">
        <DuckLogo size={30} />
        <div className="flex flex-col leading-none">
          <span className="font-brand text-base font-semibold tracking-tight">
            Duck<span className="text-brand">board</span>
          </span>
          <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-pond">
            whiteboard
          </span>
        </div>
      </div>

      {/* Actions — floating, top-right */}
      <div className="pointer-events-auto absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-2xl border border-border/70 bg-card/90 p-1.5 shadow-lg backdrop-blur">
        <Button
          size="sm"
          onClick={onToggleStencils}
          aria-pressed={stencilsOpen}
          className="bg-brand font-medium text-brand-ink shadow-sm hover:bg-brand-hover"
        >
          <Shapes />
          {t('stencils.openPanel')}
        </Button>
        <ThemeToggle />
        <AppMenu api={api} />
      </div>

      {/* Zoom — floating, bottom-right */}
      <div className="pointer-events-auto absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-full border border-border/70 bg-card/90 p-1 shadow-lg backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-full"
          onClick={() => zoomBy(1 / 1.15)}
          aria-label={t('zoom.out')}
        >
          <Minus />
        </Button>
        <button
          type="button"
          onClick={() => setCamera({ zoom: 1 })}
          className="min-w-12 rounded-full px-2 text-xs font-medium tabular-nums text-foreground/80 hover:text-brand-hover"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-full"
          onClick={() => zoomBy(1.15)}
          aria-label={t('zoom.in')}
        >
          <Plus />
        </Button>
      </div>
    </>
  )
}
