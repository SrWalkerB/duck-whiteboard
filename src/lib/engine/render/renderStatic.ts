import { getCommonBounds } from '../coords'
import { displayStroke } from '../theme-defaults'
import type { DuckElement, TextElement, Theme } from '../types'
import { elementRoughPaths } from './generator'
import { freedrawPath } from './freehand'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function transformFor(el: DuckElement): string {
  const deg = (el.angle * 180) / Math.PI
  const base = `translate(${el.x} ${el.y})`
  return deg ? `${base} rotate(${deg} ${el.width / 2} ${el.height / 2})` : base
}

function textToSvg(el: TextElement, color: string): string {
  const lines = el.text.split('\n')
  const lineH = el.fontSize * el.lineHeight
  const total = lines.length * lineH
  const startY = el.verticalAlign === 'middle' ? (el.height - total) / 2 : 0
  const anchor =
    el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start'
  const anchorX =
    el.textAlign === 'center' ? el.width / 2 : el.textAlign === 'right' ? el.width : 0
  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${anchorX}" y="${startY + i * lineH + el.fontSize * 0.82}">${escapeXml(line.length ? line : ' ')}</tspan>`,
    )
    .join('')
  return `<text font-family="${escapeXml(el.fontFamily)}" font-size="${el.fontSize}" fill="${color}" text-anchor="${anchor}" style="white-space:pre">${tspans}</text>`
}

function elementToSvg(el: DuckElement, theme: Theme): string {
  const stroke = displayStroke(el.strokeColor, theme)
  let inner = ''
  if (el.type === 'text') {
    inner = textToSvg(el, stroke)
  } else if (el.type === 'freedraw') {
    inner = `<path d="${freedrawPath(el.points, el.pressures, el.strokeWidth)}" fill="${stroke}" />`
  } else {
    const forRender =
      stroke === el.strokeColor ? el : { ...el, strokeColor: stroke }
    inner = elementRoughPaths(forRender)
      .map(
        (p) =>
          `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? 'none'}" stroke-linecap="round" stroke-linejoin="round" />`,
      )
      .join('')
  }
  return `<g transform="${transformFor(el)}" opacity="${el.opacity / 100}">${inner}</g>`
}

export interface StaticRenderOptions {
  padding?: number
  background?: string
  theme?: Theme
}

/** Serializes the scene to a standalone SVG string (used by SVG/PNG export). */
export function renderSceneToSvgString(
  elements: DuckElement[],
  opts: StaticRenderOptions = {},
): { svg: string; width: number; height: number } {
  const theme: Theme = opts.theme ?? 'light'
  const live = elements.filter((el) => !el.isDeleted)
  const padding = opts.padding ?? 24
  const [minX, minY, maxX, maxY] = getCommonBounds(live)
  const width = Math.max(1, maxX - minX) + padding * 2
  const height = Math.max(1, maxY - minY) + padding * 2
  const ox = minX - padding
  const oy = minY - padding

  const bg = opts.background
    ? `<rect x="${ox}" y="${oy}" width="${width}" height="${height}" fill="${opts.background}" />`
    : ''
  const body = live.map((el) => elementToSvg(el, theme)).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${ox} ${oy} ${width} ${height}">${bg}${body}</svg>`
  return { svg, width, height }
}
