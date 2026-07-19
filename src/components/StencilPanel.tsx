import * as React from 'react'
import type { DuckboardAPI } from '@/lib/engine/api'
import { useTranslation } from 'react-i18next'
import {
  Boxes,
  Box,
  BrickWall,
  Cloud,
  Database,
  DoorOpen,
  Globe,
  HardDrive,
  Layers,
  LayoutTemplate,
  ListOrdered,
  Network,
  Search,
  Server,
  Shapes,
  Smartphone,
  User,
  X,
  Zap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { STENCIL_CATEGORIES } from '@/lib/stencils/definitions'
import { TEMPLATES } from '@/lib/stencils/templates'
import { insertSkeleton } from '@/lib/stencils/insert'
import { SHAPE_DRAG_TYPE, encodeShapeRef } from '@/lib/stencils'

const STENCIL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  database: Database,
  nosql: Database,
  server: Server,
  cloud: Cloud,
  loadBalancer: Network,
  cdn: Globe,
  firewall: BrickWall,
  api: Layers,
  microservice: Boxes,
  queue: ListOrdered,
  cache: Zap,
  gateway: DoorOpen,
  user: User,
  mobile: Smartphone,
  storage: HardDrive,
  container: Box,
}

interface StencilPanelProps {
  api: DuckboardAPI | null
  open: boolean
  onClose: () => void
}

export function StencilPanel({ api, open, onClose }: StencilPanelProps) {
  const { t } = useTranslation()
  const [query, setQuery] = React.useState('')

  const q = query.trim().toLowerCase()
  const matches = (label: string) => label.toLowerCase().includes(q)

  return (
    <div className="pointer-events-none absolute right-3 top-16 z-10 flex flex-col items-end gap-2">
      <div
        className={cn(
          'pointer-events-auto flex max-h-[calc(100vh-6rem)] w-64 origin-top-right flex-col rounded-2xl border border-border/70 bg-card text-card-foreground shadow-xl transition-all',
          open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
        )}
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="font-brand text-sm font-semibold text-pond">
            {t('stencils.title')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
            aria-label={t('menu.open')}
          >
            <X />
          </Button>
        </div>

        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('stencils.search')}
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          <p className="py-2 text-xs text-muted-foreground">{t('stencils.hint')}</p>
          <Accordion
            type="multiple"
            defaultValue={[...STENCIL_CATEGORIES.map((c) => c.key), 'templates']}
          >
            {STENCIL_CATEGORIES.map((category) => {
              const items = category.stencils.filter((s) =>
                matches(t(`stencils.items.${s.key}`)),
              )
              if (items.length === 0) return null
              return (
                <AccordionItem key={category.key} value={category.key}>
                  <AccordionTrigger>
                    {t(`stencils.categories.${category.key}`)}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map((stencil) => {
                        const Icon = STENCIL_ICONS[stencil.key] ?? Shapes
                        const label = t(`stencils.items.${stencil.key}`)
                        return (
                          <ShapeTile
                            key={stencil.key}
                            icon={Icon}
                            label={label}
                            disabled={!api}
                            dragRef={encodeShapeRef('stencil', stencil.key)}
                            onInsert={() =>
                              api &&
                              insertSkeleton(api, stencil.key, stencil.build())
                            }
                          />
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}

            {TEMPLATES.some((tpl) => matches(t(`templates.items.${tpl.key}`))) && (
              <AccordionItem value="templates">
                <AccordionTrigger>{t('templates.title')}</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-2">
                    {TEMPLATES.filter((tpl) =>
                      matches(t(`templates.items.${tpl.key}`)),
                    ).map((tpl) => (
                      <ShapeTile
                        key={tpl.key}
                        icon={LayoutTemplate}
                        label={t(`templates.items.${tpl.key}`)}
                        horizontal
                        disabled={!api}
                        dragRef={encodeShapeRef('template', tpl.key)}
                        onInsert={() =>
                          api && insertSkeleton(api, tpl.key, tpl.build())
                        }
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </div>
    </div>
  )
}

interface ShapeTileProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  disabled: boolean
  dragRef: string
  horizontal?: boolean
  onInsert: () => void
}

function ShapeTile({
  icon: Icon,
  label,
  disabled,
  dragRef,
  horizontal,
  onInsert,
}: ShapeTileProps) {
  // Guard against a stray click firing right after a drag (double insert).
  const dragged = React.useRef(false)
  return (
    <button
      type="button"
      draggable={!disabled}
      onDragStart={(e) => {
        dragged.current = true
        e.dataTransfer.setData(SHAPE_DRAG_TYPE, dragRef)
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          dragged.current = false
        }, 0)
      }}
      disabled={disabled}
      onClick={() => {
        if (dragged.current) return
        onInsert()
      }}
      title={label}
      className={cn(
        'group flex items-center gap-1.5 rounded-lg border bg-background p-2 text-xs transition-colors hover:border-brand hover:bg-brand-tint disabled:opacity-50',
        horizontal ? 'flex-row' : 'flex-col justify-center',
      )}
    >
      <Icon className="size-6 shrink-0 text-pond transition-colors group-hover:text-brand-hover" />
      <span className="text-center leading-tight">{label}</span>
    </button>
  )
}
