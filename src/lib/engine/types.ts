/**
 * Core scene model for the Duckboard engine (our own SVG + rough.js whiteboard).
 * An element is a plain, immutable data object; the store swaps whole arrays so
 * React can memoize each node by reference.
 */

export type ElementType =
  | 'freedraw'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'text'

export type FillStyle = 'hachure' | 'solid' | 'cross-hatch'

export type Theme = 'light' | 'dark'

export type Point = [number, number]

export interface BaseElement {
  id: string
  type: ElementType
  /** Top-left of the bounding box, in scene coordinates. */
  x: number
  y: number
  width: number
  height: number
  /** Rotation in radians about the box center. */
  angle: number
  strokeColor: string
  /** 'transparent' when the shape has no fill. */
  backgroundColor: string
  fillStyle: FillStyle
  strokeWidth: number
  roughness: number
  /** Fixed at creation — freezes the rough.js hand-drawn look across re-renders. */
  seed: number
  /** 0..100 */
  opacity: number
  groupIds: string[]
  /** Bumped on every mutation; used as a render/memo key. */
  version: number
  isDeleted: boolean
  /** For rectangles: corner radius. For linear elements: truthy = smooth curve. */
  roundness: number | null
}

export interface FreedrawElement extends BaseElement {
  type: 'freedraw'
  /** Pen points relative to (x, y). */
  points: Point[]
  pressures?: number[]
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle'
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse'
}

export interface DiamondElement extends BaseElement {
  type: 'diamond'
}

export interface LinearElement extends BaseElement {
  type: 'line' | 'arrow'
  /** Points relative to (x, y); the bbox is normalized so they sit in [0,w]x[0,h]. */
  points: Point[]
}

export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle'
  /** When set, this text is a label bound to (and centered on) a container shape. */
  containerId: string | null
  lineHeight: number
}

export type DuckElement =
  | FreedrawElement
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | LinearElement
  | TextElement

export interface Camera {
  scrollX: number
  scrollY: number
  zoom: number
}

export type Tool =
  | 'select'
  | 'hand'
  | 'freedraw'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'text'
  | 'eraser'

/** True for elements that carry a relative `points` array. */
export function hasPoints(
  el: DuckElement,
): el is FreedrawElement | LinearElement {
  return el.type === 'freedraw' || el.type === 'line' || el.type === 'arrow'
}
