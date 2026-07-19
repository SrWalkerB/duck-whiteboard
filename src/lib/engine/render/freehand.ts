import getStroke from 'perfect-freehand'

import type { Point } from '../types'

/** Converts a perfect-freehand outline into a closed SVG path string. */
function getSvgPathFromStroke(stroke: number[][]): string {
  if (stroke.length === 0) return ''
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q'] as (string | number)[],
  )
  d.push('Z')
  return d.join(' ')
}

/** Filled SVG path for a freehand stroke (perfect-freehand). */
export function freedrawPath(
  points: Point[],
  pressures: number[] | undefined,
  size: number,
): string {
  const input: number[][] = points.map((p, i) =>
    pressures ? [p[0], p[1], pressures[i] ?? 0.5] : [p[0], p[1]],
  )
  const outline = getStroke(input, {
    size: Math.max(size * 2.4, 4),
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: !pressures,
  })
  return getSvgPathFromStroke(outline)
}
