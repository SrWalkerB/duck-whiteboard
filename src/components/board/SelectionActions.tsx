import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Group,
  Ungroup,
} from 'lucide-react'

import { sceneToViewport } from '@/lib/engine/coords'
import { useEngine } from '@/lib/engine/store'
import { selectionBounds } from './interaction'

/**
 * Floating toolbar above the selection: reorder in the z-stack (front/back) and,
 * for multi-selections, group/ungroup. Shown only when something is selected so
 * it stays out of the way. Keyboard: ⌘G / ⇧⌘G, ⌘[ / ⌘] (⇧ for all-the-way).
 */
export function SelectionActions() {
  const { t } = useTranslation()
  const elements = useEngine((s) => s.elements)
  const selectedIds = useEngine((s) => s.selectedIds)
  const camera = useEngine((s) => s.camera)
  const groupSelected = useEngine((s) => s.groupSelected)
  const ungroupSelected = useEngine((s) => s.ungroupSelected)
  const reorderSelected = useEngine((s) => s.reorderSelected)

  const members = elements.filter((el) => selectedIds[el.id] && !el.isDeleted)
  if (members.length === 0) return null

  const box = selectionBounds(elements, selectedIds)
  if (!box) return null

  // A single existing group → offer ungroup; 2+ loose objects → group.
  const lastGids = members.map((el) => el.groupIds[el.groupIds.length - 1])
  const isSingleGroup =
    lastGids[0] != null && lastGids.every((g) => g === lastGids[0])
  const canGroup = members.length >= 2 && !isSingleGroup

  const [vx, vy] = sceneToViewport(box.x + box.w / 2, box.y, camera)

  return (
    <div
      className="pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-full"
      style={{ left: vx, top: vy - 44 }}
    >
      <div className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-card/95 p-1 shadow-lg backdrop-blur">
        <IconButton
          label={t('order.toBack')}
          onClick={() => reorderSelected('back')}
        >
          <ChevronsDown />
        </IconButton>
        <IconButton
          label={t('order.backward')}
          onClick={() => reorderSelected('backward')}
        >
          <ChevronDown />
        </IconButton>
        <IconButton
          label={t('order.forward')}
          onClick={() => reorderSelected('forward')}
        >
          <ChevronUp />
        </IconButton>
        <IconButton
          label={t('order.toFront')}
          onClick={() => reorderSelected('front')}
        >
          <ChevronsUp />
        </IconButton>

        {(canGroup || isSingleGroup) && (
          <>
            <div className="mx-0.5 h-5 w-px bg-border" />
            {isSingleGroup ? (
              <TextButton label={t('group.ungroup')} onClick={ungroupSelected}>
                <Ungroup />
              </TextButton>
            ) : (
              <TextButton label={t('group.group')} onClick={groupSelected}>
                <Group />
              </TextButton>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center rounded-lg text-foreground/80 transition-colors hover:bg-accent [&_svg]:size-4"
    >
      {children}
    </button>
  )
}

function TextButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-accent [&_svg]:size-4"
    >
      {children}
      {label}
    </button>
  )
}
