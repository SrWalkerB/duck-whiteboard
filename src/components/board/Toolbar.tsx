import { useTranslation } from 'react-i18next'
import {
  ArrowUpRight,
  Circle,
  Diamond,
  Eraser,
  Hand,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Type,
  Undo2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useEngine } from '@/lib/engine/store'
import type { Tool } from '@/lib/engine/types'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ToolDef {
  tool: Tool
  icon: React.ComponentType<{ className?: string }>
  key: string
  shortcut: string
}

const TOOLS: ToolDef[] = [
  { tool: 'select', icon: MousePointer2, key: 'select', shortcut: 'V' },
  { tool: 'hand', icon: Hand, key: 'hand', shortcut: 'H' },
  { tool: 'freedraw', icon: Pencil, key: 'draw', shortcut: 'P' },
  { tool: 'rectangle', icon: Square, key: 'rectangle', shortcut: 'R' },
  { tool: 'ellipse', icon: Circle, key: 'ellipse', shortcut: 'O' },
  { tool: 'diamond', icon: Diamond, key: 'diamond', shortcut: 'D' },
  { tool: 'line', icon: Minus, key: 'line', shortcut: 'L' },
  { tool: 'arrow', icon: ArrowUpRight, key: 'arrow', shortcut: 'A' },
  { tool: 'text', icon: Type, key: 'text', shortcut: 'T' },
  { tool: 'eraser', icon: Eraser, key: 'eraser', shortcut: 'E' },
]

export function Toolbar() {
  const { t } = useTranslation()
  const activeTool = useEngine((s) => s.activeTool)
  const setTool = useEngine((s) => s.setTool)
  const undo = useEngine((s) => s.undo)
  const redo = useEngine((s) => s.redo)
  const canUndo = useEngine((s) => s.past.length > 0)
  const canRedo = useEngine((s) => s.future.length > 0)

  return (
    <div className="pointer-events-auto absolute left-3 top-1/2 z-10 -translate-y-1/2">
      <div className="flex flex-col items-center gap-1 rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-xl backdrop-blur">
        {TOOLS.map(({ tool, icon: Icon, key, shortcut }) => {
          const active = activeTool === tool
          return (
            <Tooltip key={tool} delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-tool={tool}
                  aria-label={t(`tools.${key}`)}
                  aria-pressed={active}
                  onClick={() => setTool(tool)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-xl transition-colors [&_svg]:size-[18px]',
                    active
                      ? 'bg-brand text-brand-ink shadow-sm'
                      : 'text-foreground/70 hover:bg-brand-tint hover:text-brand-hover',
                  )}
                >
                  <Icon />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t(`tools.${key}`)} · {shortcut}
              </TooltipContent>
            </Tooltip>
          )
        })}

        <div className="my-0.5 h-px w-6 bg-border" />

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t('tools.undo')}
              disabled={!canUndo}
              onClick={undo}
              className="flex size-9 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-brand-tint hover:text-brand-hover disabled:opacity-40 disabled:hover:bg-transparent [&_svg]:size-[18px]"
            >
              <Undo2 />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('tools.undo')} · ⌘Z</TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t('tools.redo')}
              disabled={!canRedo}
              onClick={redo}
              className="flex size-9 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-brand-tint hover:text-brand-hover disabled:opacity-40 disabled:hover:bg-transparent [&_svg]:size-[18px]"
            >
              <Redo2 />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('tools.redo')} · ⇧⌘Z</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
