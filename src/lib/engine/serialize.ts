import { newId, newSeed } from './id'
import { themeDefaults } from './theme-defaults'
import type { DuckElement, ElementType, Point } from './types'

export interface DuckFile {
  type: 'duck-whiteboard'
  version: 1
  source: string
  elements: DuckElement[]
  appState: { viewBackgroundColor?: string }
  files: Record<string, never>
}

const KNOWN_TYPES: ElementType[] = [
  'freedraw',
  'rectangle',
  'ellipse',
  'diamond',
  'line',
  'arrow',
  'text',
]

export function serializeScene(elements: DuckElement[]): string {
  const file: DuckFile = {
    type: 'duck-whiteboard',
    version: 1,
    source: typeof location !== 'undefined' ? location.origin : 'duck',
    elements: elements.filter((el) => !el.isDeleted),
    appState: { viewBackgroundColor: 'transparent' },
    files: {},
  }
  return JSON.stringify(file)
}

/** Best-effort import of a legacy Excalidraw element into our model. */
function migrateElement(raw: unknown): DuckElement | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const type = e.type as ElementType
  if (!KNOWN_TYPES.includes(type)) return null
  if (e.isDeleted) return null

  const d = themeDefaults('light')
  const base = {
    id: (e.id as string) ?? newId(),
    type,
    x: Number(e.x) || 0,
    y: Number(e.y) || 0,
    width: Number(e.width) || 0,
    height: Number(e.height) || 0,
    angle: Number(e.angle) || 0,
    strokeColor: (e.strokeColor as string) ?? d.strokeColor,
    backgroundColor:
      (e.backgroundColor as string) === 'transparent' || !e.backgroundColor
        ? 'transparent'
        : (e.backgroundColor as string),
    fillStyle: (e.fillStyle as DuckElement['fillStyle']) ?? d.fillStyle,
    strokeWidth: Number(e.strokeWidth) || d.strokeWidth,
    roughness: typeof e.roughness === 'number' ? e.roughness : d.roughness,
    seed: typeof e.seed === 'number' ? (e.seed as number) : newSeed(),
    opacity: typeof e.opacity === 'number' ? (e.opacity as number) : 100,
    groupIds: Array.isArray(e.groupIds) ? (e.groupIds as string[]) : [],
    version: 1,
    isDeleted: false,
    roundness: e.roundness ? 2 : null,
  }

  if (type === 'text') {
    return {
      ...base,
      type: 'text',
      text: (e.text as string) ?? '',
      fontSize: Number(e.fontSize) || d.fontSize,
      fontFamily: d.fontFamily,
      textAlign: (e.textAlign as 'left' | 'center' | 'right') ?? 'left',
      verticalAlign: 'top',
      containerId: null,
      lineHeight: 1.25,
    }
  }
  if (type === 'line' || type === 'arrow' || type === 'freedraw') {
    return { ...base, type, points: (e.points as Point[]) ?? [] } as DuckElement
  }
  return { ...base, type } as DuckElement
}

/** Parses a scene from JSON, accepting our `.duck` files and legacy Excalidraw JSON. */
export function parseScene(json: string): DuckElement[] | null {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>
    const rawElements = parsed.elements
    if (!Array.isArray(rawElements)) return null

    if (parsed.type === 'duck-whiteboard') {
      return rawElements as DuckElement[]
    }
    // Legacy Excalidraw scene → best-effort migration.
    const migrated = rawElements
      .map(migrateElement)
      .filter((el): el is DuckElement => el !== null)
    return migrated
  } catch {
    return null
  }
}
