import * as React from 'react'

import type { DuckElement, TextElement, Theme } from '../types'
import { displayStroke } from '../theme-defaults'
import { elementRoughPaths } from './generator'
import { freedrawPath } from './freehand'

interface ElementNodeProps {
  element: DuckElement
  theme: Theme
  /** Hidden while its text is being edited in the overlay. */
  hidden?: boolean
}

function transformFor(el: DuckElement): string {
  const deg = (el.angle * 180) / Math.PI
  const base = `translate(${el.x} ${el.y})`
  if (!deg) return base
  return `${base} rotate(${deg} ${el.width / 2} ${el.height / 2})`
}

function TextNode({
  element,
  color,
}: {
  element: TextElement
  color: string
}) {
  const { fontSize, fontFamily, lineHeight, textAlign, verticalAlign } = element
  const lines = element.text.split('\n')
  const lineH = fontSize * lineHeight
  const total = lines.length * lineH
  const startY = verticalAlign === 'middle' ? (element.height - total) / 2 : 0
  const anchor =
    textAlign === 'center' ? 'middle' : textAlign === 'right' ? 'end' : 'start'
  const anchorX =
    textAlign === 'center'
      ? element.width / 2
      : textAlign === 'right'
        ? element.width
        : 0

  return (
    <text
      fontFamily={fontFamily}
      fontSize={fontSize}
      fill={color}
      textAnchor={anchor}
      style={{ whiteSpace: 'pre' }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={anchorX} y={startY + i * lineH + fontSize * 0.82}>
          {line.length ? line : ' '}
        </tspan>
      ))}
    </text>
  )
}

function ElementNodeInner({ element, theme, hidden }: ElementNodeProps) {
  if (hidden) return null

  const stroke = displayStroke(element.strokeColor, theme)
  let content: React.ReactNode

  if (element.type === 'text') {
    content = <TextNode element={element} color={stroke} />
  } else if (element.type === 'freedraw') {
    content = (
      <path
        d={freedrawPath(element.points, element.pressures, element.strokeWidth)}
        fill={stroke}
      />
    )
  } else {
    const forRender =
      stroke === element.strokeColor ? element : { ...element, strokeColor: stroke }
    const paths = elementRoughPaths(forRender)
    content = paths.map((p, i) => (
      <path
        key={i}
        d={p.d}
        stroke={p.stroke}
        strokeWidth={p.strokeWidth}
        fill={p.fill ?? 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))
  }

  return (
    <g
      transform={transformFor(element)}
      opacity={element.opacity / 100}
      style={{ pointerEvents: 'none' }}
    >
      {content}
    </g>
  )
}

/** Memoized per element — the store swaps whole arrays, so refs are stable. */
export const ElementNode = React.memo(
  ElementNodeInner,
  (a, b) =>
    a.element === b.element && a.hidden === b.hidden && a.theme === b.theme,
)
