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
    </g>
  )
}
