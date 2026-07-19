import { newId, newSeed } from './id'
import { measureText } from './measure-text'
import { themeDefaults } from './theme-defaults'
import type {
  DuckElement,
  ElementType,
  Point,
  TextElement,
  Theme,
} from './types'

/**
 * Simplified element description used by the architecture stencils/templates.
 * This is our own IR — the stencil definitions produce arrays of these, and
 * `skeletonToElements` turns them into real DuckElements (ids, seeds, bounds,
 * bound labels), the way `convertToExcalidrawElements` used to.
 */
export interface Skeleton {
  type: ElementType
  x: number
  y: number
  width?: number
  height?: number
  points?: Point[]
  roundness?: { type: number }
  label?: { text: string }
  text?: string
  fontSize?: number
}

const LINE_HEIGHT = 1.25

function baseFields(theme: Theme, seed = newSeed()) {
  const d = themeDefaults(theme)
  return {
    id: newId(),
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: d.strokeColor,
    backgroundColor: d.backgroundColor,
    fillStyle: d.fillStyle,
    strokeWidth: d.strokeWidth,
    roughness: d.roughness,
    seed,
    opacity: 100,
    groupIds: [] as string[],
    version: 1,
    isDeleted: false,
    roundness: null as number | null,
  }
}

function pointsBounds(points: Point[]): [number, number, number, number] {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [px, py] of points) {
    if (px < minX) minX = px
    if (py < minY) minY = py
    if (px > maxX) maxX = px
    if (py > maxY) maxY = py
  }
  return [minX, minY, maxX, maxY]
}

function makeTextElement(
  theme: Theme,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  opts: Partial<Pick<TextElement, 'textAlign' | 'verticalAlign' | 'containerId'>> = {},
): TextElement {
  const d = themeDefaults(theme)
  const { width, height } = measureText(text, fontSize, d.fontFamily, LINE_HEIGHT)
  return {
    ...baseFields(theme),
    type: 'text',
    x,
    y,
    width,
    height,
    text,
    fontSize,
    fontFamily: d.fontFamily,
    textAlign: opts.textAlign ?? 'left',
    verticalAlign: opts.verticalAlign ?? 'top',
    containerId: opts.containerId ?? null,
    lineHeight: LINE_HEIGHT,
  }
}

/** Converts a stencil/template skeleton into real, positioned DuckElements. */
export function skeletonToElements(
  skeleton: Skeleton[],
  theme: Theme,
): DuckElement[] {
  const out: DuckElement[] = []

  for (const sk of skeleton) {
    if (sk.type === 'text') {
      out.push(
        makeTextElement(theme, sk.x, sk.y, sk.text ?? '', sk.fontSize ?? 20),
      )
      continue
    }

    if (sk.type === 'line' || sk.type === 'arrow' || sk.type === 'freedraw') {
      const pts = sk.points ?? []
      const [minX, minY, maxX, maxY] = pts.length
        ? pointsBounds(pts)
        : [0, 0, 0, 0]
      // Normalize so (x, y) is the true top-left and points sit in [0,w]x[0,h].
      const normalized: Point[] = pts.map(([px, py]) => [px - minX, py - minY])
      const el = {
        ...baseFields(theme),
        type: sk.type,
        x: sk.x + minX,
        y: sk.y + minY,
        width: maxX - minX,
        height: maxY - minY,
        points: normalized,
        roundness: sk.roundness ? 2 : null,
      }
      out.push(el as DuckElement)
      continue
    }

    // Closed shapes: rectangle / ellipse / diamond
    const shape = {
      ...baseFields(theme),
      type: sk.type,
      x: sk.x,
      y: sk.y,
      width: sk.width ?? 0,
      height: sk.height ?? 0,
    } as DuckElement
    out.push(shape)

    // A bound label becomes a centered text element linked to the shape.
    if (sk.label?.text) {
      const fontSize = 16
      const label = makeTextElement(theme, 0, 0, sk.label.text, fontSize, {
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: shape.id,
      })
      label.x = shape.x + (shape.width - label.width) / 2
      label.y = shape.y + (shape.height - label.height) / 2
      out.push(label)
    }
  }

  return out
}
