/** Shared offscreen canvas context for measuring text (labels, text elements). */
let ctx: CanvasRenderingContext2D | null = null

function getCtx(): CanvasRenderingContext2D {
  if (!ctx) {
    const canvas = document.createElement('canvas')
    ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2d canvas context unavailable')
  }
  return ctx
}

function fontString(fontSize: number, fontFamily: string): string {
  return `${fontSize}px ${fontFamily}`
}

export function measureLineWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
): number {
  const c = getCtx()
  c.font = fontString(fontSize, fontFamily)
  return c.measureText(text).width
}

export interface TextMetrics {
  width: number
  height: number
  lines: string[]
}

export function measureText(
  text: string,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
): TextMetrics {
  const lines = text.split('\n')
  const width = lines.reduce(
    (max, line) => Math.max(max, measureLineWidth(line, fontSize, fontFamily)),
    0,
  )
  const height = Math.max(1, lines.length) * fontSize * lineHeight
  return { width, height, lines }
}
