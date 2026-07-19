import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Ban, Plus } from 'lucide-react'

import { useEngine } from '@/lib/engine/store'
import type { DuckElement, FillStyle, Tool } from '@/lib/engine/types'
import { cn } from '@/lib/utils'

const CREATOR_TOOLS = new Set([
  'freedraw',
  'rectangle',
  'ellipse',
  'diamond',
  'line',
  'arrow',
  'text',
])
const CLOSED_SHAPES = new Set(['rectangle', 'ellipse', 'diamond'])

/**
 * Stops a panel button from stealing focus from the text editor: without this,
 * the mousedown blurs the textarea (committing/closing the edit) before the
 * click's onClick runs, so the color change would never reach the live text.
 */
function keepEditorFocus(e: React.MouseEvent) {
  e.preventDefault()
}

/**
 * Docks the properties panel next to the active tool's button on the left rail
 * (aligning their tops) instead of pinning it to the vertical center, so the
 * panel always appears beside the tool you picked. Falls back to centered until
 * measured, and clamps so a low tool (e.g. eraser) doesn't push it off-screen.
 */
function ToolPanel({
  anchorTool,
  children,
}: {
  anchorTool: Tool
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [top, setTop] = React.useState<number | null>(null)

  React.useLayoutEffect(() => {
    const place = () => {
      const btn = document.querySelector<HTMLElement>(
        `[data-tool="${anchorTool}"]`,
      )
      const panelH = ref.current?.offsetHeight ?? 0
      if (!btn) return
      const bt = btn.getBoundingClientRect().top
      const maxTop = window.innerHeight - panelH - 12
      const next = Math.max(12, Math.min(bt, maxTop))
      setTop((prev) => (prev === next ? prev : next))
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  })

  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute left-[4.25rem] z-10 flex w-48 flex-col gap-3 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-xl backdrop-blur"
      style={
        top === null
          ? { top: '50%', transform: 'translateY(-50%)' }
          : { top }
      }
    >
      {children}
    </div>
  )
}

const STROKE_PRESETS = [
  '#1f2430',
  '#e8e6e1',
  '#e5484d',
  '#e8850c',
  '#f5b301',
  '#30a46c',
  '#3b82f6',
  '#8e4ec6',
]
const FILL_PRESETS = [
  '#e5484d',
  '#e8850c',
  '#f5b301',
  '#30a46c',
  '#3b82f6',
  '#8e4ec6',
  '#1f2430',
]
const WIDTHS = [
  { key: 'thin', value: 1 },
  { key: 'medium', value: 2 },
  { key: 'bold', value: 4 },
]
const ERASER_SIZES = [
  { key: 'thin', value: 6 },
  { key: 'medium', value: 12 },
  { key: 'bold', value: 22 },
]

/**
 * Apply a property to the current-item defaults and to the live targets: the
 * selection and/or the text element being edited. While a text is open in the
 * editor it isn't in `selectedIds`, so we fold `editingTextId` in explicitly —
 * otherwise changing the color mid-typing would only affect future elements.
 */
function apply(field: keyof DuckElement, value: string | number) {
  const s = useEngine.getState()
  if (field === 'strokeColor') s.setDefaults({ strokeColor: value as string })
  if (field === 'backgroundColor')
    s.setDefaults({ backgroundColor: value as string })
  if (field === 'strokeWidth') s.setDefaults({ strokeWidth: value as number })
  if (field === 'fillStyle') s.setDefaults({ fillStyle: value as FillStyle })

  const ids: Record<string, true> = { ...s.selectedIds }
  if (s.editingTextId) ids[s.editingTextId] = true
  if (Object.keys(ids).length === 0) return

  const next = s.elements.map((el) =>
    ids[el.id] ? { ...el, [field]: value, version: el.version + 1 } : el,
  )
  // Don't churn undo history on every keystroke-adjacent tweak while editing.
  if (s.editingTextId) s.setElements(next)
  else s.commitElements(next)
}

/**
 * Properties panel docked next to the tool rail. Appears when a drawing tool is
 * active (sets defaults for new shapes) or elements are selected (edits them).
 */
export function ColorControl() {
  const { t } = useTranslation()
  const selectedMap = useEngine((s) => s.selectedIds)
  const activeTool = useEngine((s) => s.activeTool)
  const defaults = useEngine((s) => s.defaults)
  const elements = useEngine((s) => s.elements)
  const editingTextId = useEngine((s) => s.editingTextId)

  const selectedIds = Object.keys(selectedMap)
  if (activeTool === 'eraser') return <EraserPanel />
  const visible =
    selectedIds.length > 0 || editingTextId !== null || CREATOR_TOOLS.has(activeTool)
  if (!visible) return null

  // Prefer the selection, then the text being edited, so the panel highlights
  // the swatch that actually matches what's on screen.
  const first =
    elements.find((el) => selectedMap[el.id]) ??
    elements.find((el) => el.id === editingTextId)
  const stroke = first?.strokeColor ?? defaults.strokeColor
  const fill = first?.backgroundColor ?? defaults.backgroundColor
  const fillStyle = first?.fillStyle ?? defaults.fillStyle
  const width = first?.strokeWidth ?? defaults.strokeWidth
  const hasFill = fill !== 'transparent'

  const showFill =
    selectedIds.length > 0
      ? elements.some((el) => selectedMap[el.id] && CLOSED_SHAPES.has(el.type))
      : CLOSED_SHAPES.has(activeTool)

  // Anchor to the active creator tool, or to "select" when editing a selection.
  const anchorTool: Tool = CREATOR_TOOLS.has(activeTool) ? activeTool : 'select'

  return (
    <ToolPanel anchorTool={anchorTool}>
      <Section label={t('color.stroke')}>
        <Swatches
          presets={STROKE_PRESETS}
          value={stroke}
          onPick={(c) => apply('strokeColor', c)}
        />
      </Section>

      {showFill && (
        <Section label={t('color.fill')}>
          <Swatches
            presets={FILL_PRESETS}
            value={fill}
            withNone
            noneLabel={t('color.none')}
            onPick={(c) => apply('backgroundColor', c)}
          />
          {hasFill && (
            <div className="mt-1 flex gap-1.5">
              {(['hachure', 'solid'] as FillStyle[]).map((fs) => (
                <button
                  key={fs}
                  type="button"
                  onMouseDown={keepEditorFocus}
                  onClick={() => apply('fillStyle', fs)}
                  aria-label={t(`color.${fs}`)}
                  title={t(`color.${fs}`)}
                  className={cn(
                    'h-6 flex-1 overflow-hidden rounded-md border transition-colors',
                    fillStyle === fs
                      ? 'border-foreground'
                      : 'border-border hover:bg-accent',
                  )}
                  style={
                    fs === 'solid'
                      ? { background: fill }
                      : {
                          backgroundImage: `repeating-linear-gradient(45deg, ${fill} 0 2px, transparent 2px 5px)`,
                        }
                  }
                />
              ))}
            </div>
          )}
        </Section>
      )}

      <Section label={t('color.width')}>
        <div className="flex items-center gap-1.5">
          {WIDTHS.map(({ key, value }) => (
            <button
              key={key}
              type="button"
              onMouseDown={keepEditorFocus}
              onClick={() => apply('strokeWidth', value)}
              aria-label={t(`color.${key}`)}
              title={t(`color.${key}`)}
              className={cn(
                'flex h-7 flex-1 items-center justify-center rounded-lg border transition-colors hover:bg-accent',
                width === value
                  ? 'border-foreground bg-foreground/5'
                  : 'border-border',
              )}
            >
              <span
                className="rounded-full bg-foreground"
                style={{ width: 18, height: value + 1 }}
              />
            </button>
          ))}
        </div>
      </Section>
    </ToolPanel>
  )
}

/** Standalone panel shown while the eraser tool is active: mode + size. */
function EraserPanel() {
  const { t } = useTranslation()
  const size = useEngine((s) => s.eraserSize)
  const setSize = useEngine((s) => s.setEraserSize)
  const mode = useEngine((s) => s.eraserMode)
  const setMode = useEngine((s) => s.setEraserMode)
  return (
    <ToolPanel anchorTool="eraser">
      <Section label={t('color.eraserMode')}>
        <div className="flex gap-1.5">
          {(['stroke', 'object'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'h-8 flex-1 rounded-lg border px-1 text-[11px] font-medium leading-tight transition-colors',
                mode === m
                  ? 'border-foreground bg-foreground/5'
                  : 'border-border hover:bg-accent',
              )}
            >
              {t(`color.eraser_${m}`)}
            </button>
          ))}
        </div>
      </Section>
      <Section label={t('color.eraser')}>
        <div className="flex items-center gap-1.5">
          {ERASER_SIZES.map(({ key, value }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSize(value)}
              aria-label={t(`color.${key}`)}
              title={t(`color.${key}`)}
              className={cn(
                'flex h-9 flex-1 items-center justify-center rounded-lg border transition-colors hover:bg-accent',
                size === value
                  ? 'border-foreground bg-foreground/5'
                  : 'border-border',
              )}
            >
              <span
                className="rounded-full bg-foreground"
                style={{ width: value / 1.6, height: value / 1.6 }}
              />
            </button>
          ))}
        </div>
      </Section>
    </ToolPanel>
  )
}

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}

interface SwatchesProps {
  presets: string[]
  value: string
  withNone?: boolean
  noneLabel?: string
  onPick: (color: string) => void
}

function Swatches({ presets, value, withNone, noneLabel, onPick }: SwatchesProps) {
  const isNone = value === 'transparent'
  const isPreset = presets.includes(value.toLowerCase())
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {withNone && (
        <button
          type="button"
          onMouseDown={keepEditorFocus}
          onClick={() => onPick('transparent')}
          aria-label={noneLabel}
          title={noneLabel}
          className={cn(
            'flex size-7 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:text-foreground',
            isNone ? 'border-foreground text-foreground' : 'border-border',
          )}
        >
          <Ban className="size-4" />
        </button>
      )}
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onMouseDown={keepEditorFocus}
          onClick={() => onPick(c)}
          aria-label={c}
          className={cn(
            'size-7 rounded-full border border-border transition-transform hover:scale-110',
            value.toLowerCase() === c &&
              'ring-2 ring-foreground ring-offset-1 ring-offset-card',
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      {/* custom color */}
      <label
        className={cn(
          'relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border',
          !isNone &&
            !isPreset &&
            'ring-2 ring-foreground ring-offset-1 ring-offset-card',
        )}
        style={{
          background: isNone || !value.startsWith('#')
            ? 'conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)'
            : value,
        }}
        title="Custom"
      >
        {(isNone || isPreset) && (
          <Plus className="size-3.5 text-white mix-blend-difference" />
        )}
        <input
          type="color"
          value={value.startsWith('#') ? value : '#000000'}
          onChange={(e) => onPick(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Custom color"
        />
      </label>
    </div>
  )
}
