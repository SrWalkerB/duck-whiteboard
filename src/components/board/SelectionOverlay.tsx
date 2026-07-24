import type { DuckElement } from '@/lib/engine/types'
import {
  handlePositions,
  rotationHandlePos,
  selectionBounds,
} from './interaction'

interface SelectionOverlayProps {
  elements: DuckElement[]
  selectedIds: Record<string, true>
  zoom: number
}

/** Visual selection box + resize handles (hit-testing is geometric, in Board). */
export function SelectionOverlay({
  elements,
  selectedIds,
  zoom,
}: SelectionOverlayProps) {
  const box = selectionBounds(elements, selectedIds)
  if (!box) return null

  const pad = 4 / zoom
  const stroke = 1.5 / zoom
  const hs = 7 / zoom
  const handles = handlePositions(box)
  const [rx, ry] = rotationHandlePos(box, zoom)
  const selected = elements.filter((el) => selectedIds[el.id])
  const arrow = selected.length === 1 && selected[0].type === 'arrow'
    ? selected[0]
    : null
  const endpoints = arrow && arrow.points.length >= 2
    ? [
        [arrow.x + arrow.points[0][0], arrow.y + arrow.points[0][1]],
        [
          arrow.x + arrow.points[arrow.points.length - 1][0],
          arrow.y + arrow.points[arrow.points.length - 1][1],
        ],
      ]
    : null

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={box.x - pad}
        y={box.y - pad}
        width={box.w + pad * 2}
        height={box.h + pad * 2}
        fill="none"
        stroke="var(--pond)"
        strokeWidth={stroke}
        strokeDasharray={`${4 / zoom} ${3 / zoom}`}
      />
      {/* rotation handle + connector */}
      <line
        x1={box.x + box.w / 2}
        y1={box.y - pad}
        x2={rx}
        y2={ry}
        stroke="var(--pond)"
        strokeWidth={stroke}
      />
      <circle
        cx={rx}
        cy={ry}
        r={hs / 1.4}
        fill="var(--background)"
        stroke="var(--pond)"
        strokeWidth={stroke}
      />
      {Object.values(handles).map(([hx, hy], i) => (
        <rect
          key={i}
          x={hx - hs / 2}
          y={hy - hs / 2}
          width={hs}
          height={hs}
          rx={1.5 / zoom}
          fill="var(--background)"
          stroke="var(--pond)"
          strokeWidth={stroke}
        />
      ))}
      {endpoints?.map(([x, y], i) => (
        <circle
          key={`arrow-endpoint-${i}`}
          cx={x}
          cy={y}
          r={hs / 1.15}
          fill="var(--background)"
          stroke="var(--brand)"
          strokeWidth={stroke * 1.25}
        />
      ))}
    </g>
  )
}
