import type { Skeleton } from '@/lib/engine/skeleton'

import { findStencilByKey } from './definitions'
import { findTemplateByKey } from './templates'

/** MIME-like key used when dragging a shape from the panel onto the canvas. */
export const SHAPE_DRAG_TYPE = 'application/x-duck-shape'

/** Encodes a shape reference for drag-and-drop. */
export function encodeShapeRef(kind: 'stencil' | 'template', key: string) {
  return `${kind}:${key}`
}

/** Resolves a drag reference (`stencil:database` / `template:web3tier`) to a skeleton. */
export function resolveShape(
  ref: string,
): { key: string; skeleton: Skeleton[] } | null {
  const [kind, key] = ref.split(':')
  if (!key) return null
  if (kind === 'template') {
    const t = findTemplateByKey(key)
    return t ? { key, skeleton: t.build() } : null
  }
  const s = findStencilByKey(key)
  return s ? { key, skeleton: s.build() } : null
}
