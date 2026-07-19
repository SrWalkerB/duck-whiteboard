import type { Point } from './types'

/** Two short segments forming an arrowhead at the end of a polyline. */
export function arrowheadLines(points: Point[]): Point[][] {
  if (points.length < 2) return []
  const end = points[points.length - 1]
  const prev = points[points.length - 2]
  const angle = Math.atan2(end[1] - prev[1], end[0] - prev[0])
  const len = 14
  const spread = Math.PI / 7
  const left: Point = [
    end[0] - len * Math.cos(angle - spread),
    end[1] - len * Math.sin(angle - spread),
  ]
  const right: Point = [
    end[0] - len * Math.cos(angle + spread),
    end[1] - len * Math.sin(angle + spread),
  ]
  return [
    [end, left],
    [end, right],
  ]
}
