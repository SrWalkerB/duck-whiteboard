import * as React from 'react'

import { useEngine } from '@/lib/engine/store'
import { sceneToViewport } from '@/lib/engine/coords'
import { measureText } from '@/lib/engine/measure-text'
import { displayStroke } from '@/lib/engine/theme-defaults'
import type { DuckElement, TextElement } from '@/lib/engine/types'

/** Overlay textarea for creating/editing text elements in scene space. */
export function TextEditor() {
  const editingId = useEngine((s) => s.editingTextId)
  const elements = useEngine((s) => s.elements)
  const camera = useEngine((s) => s.camera)
  const theme = useEngine((s) => s.theme)
  const ref = React.useRef<HTMLTextAreaElement>(null)

  const element = React.useMemo(
    () => elements.find((el) => el.id === editingId && el.type === 'text') as
      | TextElement
      | undefined,
    [elements, editingId],
  )

  // Focus on the next frame — after the click that created the text has
  // settled — so the canvas doesn't steal focus back and blur (delete) it.
  React.useEffect(() => {
    if (!editingId) return
    const raf = requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.select()
    })
    return () => cancelAnimationFrame(raf)
  }, [editingId])

  if (!editingId || !element) return null

  const container = element.containerId
    ? (elements.find((el) => el.id === element.containerId) as DuckElement | undefined)
    : undefined

  const update = (text: string) => {
    const s = useEngine.getState()
    const { width, height } = measureText(
      text || ' ',
      element.fontSize,
      element.fontFamily,
      element.lineHeight,
    )
    s.setElements(
      s.elements.map((el) => {
        if (el.id !== element.id) return el
        const next = { ...el, text, width, height } as TextElement
        if (container) {
          next.x = container.x + (container.width - width) / 2
          next.y = container.y + (container.height - height) / 2
        }
        return next
      }),
    )
  }

  const commit = () => {
    const s = useEngine.getState()
    const current = s.elements.find((el) => el.id === element.id) as
      | TextElement
      | undefined
    if (current && current.text.trim() === '') {
      s.setElements(s.elements.filter((el) => el.id !== element.id))
    }
    s.setEditingText(null)
  }

  const [vx, vy] = sceneToViewport(element.x, element.y, camera)

  return (
    <textarea
      ref={ref}
      value={element.text}
      onChange={(e) => update(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          commit()
        }
        e.stopPropagation()
      }}
      spellCheck={false}
      className="absolute z-20 resize-none overflow-hidden border-none bg-transparent p-0 outline-none"
      style={{
        left: vx,
        top: vy,
        transformOrigin: 'top left',
        transform: `scale(${camera.zoom})`,
        width: Math.max(element.width, 20) + 4,
        height: Math.max(element.height, element.fontSize * element.lineHeight),
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        lineHeight: element.lineHeight,
        color: displayStroke(element.strokeColor, theme),
        textAlign: element.textAlign,
        whiteSpace: 'pre',
      }}
    />
  )
}
