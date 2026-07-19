import type { DuckboardAPI } from '@/lib/engine/api'
import { serializeScene, parseScene } from '@/lib/engine/serialize'
import { renderSceneToSvgString } from '@/lib/engine/render/renderStatic'
import { canvasBackground } from '@/lib/engine/theme-defaults'

const FILE_NAME = 'duck-whiteboard'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** UTF-8 safe base64 (btoa breaks on accented characters). */
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/** Exports the current scene as a `.duck` JSON file. */
export function exportSceneFile(api: DuckboardAPI) {
  const json = serializeScene(api.getSceneElements())
  triggerDownload(
    new Blob([json], { type: 'application/json' }),
    `${FILE_NAME}.duck`,
  )
}

/** Exports the current scene as an SVG image. */
export function exportSceneSvg(api: DuckboardAPI) {
  const { svg } = renderSceneToSvgString(api.getSceneElements(), {
    background: canvasBackground(api.getTheme()),
    theme: api.getTheme(),
  })
  triggerDownload(
    new Blob([svg], { type: 'image/svg+xml' }),
    `${FILE_NAME}.svg`,
  )
}

/** Exports the current scene as a PNG image (SVG → canvas → blob). */
export async function exportScenePng(api: DuckboardAPI) {
  const { svg, width, height } = renderSceneToSvgString(api.getSceneElements(), {
    background: canvasBackground(api.getTheme()),
    theme: api.getTheme(),
  })
  if (document.fonts?.ready) await document.fonts.ready

  const scale = Math.min(window.devicePixelRatio || 1, 2) * 2
  const img = new Image()
  img.src = `data:image/svg+xml;base64,${toBase64(svg)}`
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('failed to rasterize SVG'))
  })

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, `${FILE_NAME}.png`)
      resolve()
    }, 'image/png')
  })
}

/** Opens a `.duck`/`.json` file picker and loads it into the scene. */
export function importSceneFile(api: DuckboardAPI) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.duck,.json,application/json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const elements = parseScene(text)
      if (!elements) throw new Error('unrecognized file')
      api.updateScene({ elements, commit: true })
      api.scrollToContent(elements, { fitToContent: true })
    } catch (err) {
      console.error('[duck-whiteboard] failed to import file', err)
    }
  }
  input.click()
}
