import rough from 'roughjs'
import type { Options, PathInfo } from 'roughjs/bin/core'
import type { RoughGenerator } from 'roughjs/bin/generator'

import { arrowheadLines } from '../arrow'
import type { DuckElement } from '../types'

let gen: RoughGenerator | null = null

/** Shared rough.js generator — produces drawables (path data), no DOM needed. */
export function generator(): RoughGenerator {
  if (!gen) gen = rough.generator()
  return gen
}

function optionsFor(el: DuckElement): Options {
  const filled = el.backgroundColor && el.backgroundColor !== 'transparent'
  return {
    seed: el.seed,
    roughness: el.roughness,
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    ...(filled
      ? { fill: el.backgroundColor, fillStyle: el.fillStyle }
      : {}),
  }
}

/**
 * Rough path data for a shape/linear element (not text/freedraw), in the
 * element's local frame. Each PathInfo → one <path> node.
 */
export function elementRoughPaths(el: DuckElement): PathInfo[] {
  const g = generator()
  const opts = optionsFor(el)
  const w = el.width
  const h = el.height

  let drawables

  switch (el.type) {
    case 'rectangle':
      drawables = [g.rectangle(0, 0, Math.max(w, 0.01), Math.max(h, 0.01), opts)]
      break
    case 'ellipse':
      drawables = [g.ellipse(w / 2, h / 2, Math.max(w, 0.01), Math.max(h, 0.01), opts)]
      break
    case 'diamond':
      drawables = [
        g.polygon(
          [
            [w / 2, 0],
            [w, h / 2],
            [w / 2, h],
            [0, h / 2],
          ],
          opts,
        ),
      ]
      break
    case 'line':
    case 'arrow': {
      const pts = el.points
      const lineOpts: Options = { ...opts, fill: undefined }
      const shapes = [
        el.roundness ? g.curve(pts, lineOpts) : g.linearPath(pts, lineOpts),
      ]
      if (el.type === 'arrow') {
        for (const seg of arrowheadLines(pts)) {
          shapes.push(g.linearPath(seg, lineOpts))
        }
      }
      drawables = shapes
      break
    }
    default:
      return []
  }

  return drawables.flatMap((d) => g.toPaths(d))
}
