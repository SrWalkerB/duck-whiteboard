import type { Skeleton } from '@/lib/engine/skeleton'

export interface TemplateDefinition {
  /** Stable id used for React keys and i18n lookup (`templates.items.<key>`). */
  key: string
  build: () => Skeleton[]
}

const box = (
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
): Skeleton =>
  ({
    type: 'rectangle',
    x,
    y,
    width: w,
    height: h,
    label: { text: label },
  }) as Skeleton

const arrow = (
  x: number,
  y: number,
  points: [number, number][],
): Skeleton =>
  ({ type: 'arrow', x, y, points }) as Skeleton

/** A database cylinder anchored at (x, y). */
const db = (x: number, y: number, label: string): Skeleton[] => [
  { type: 'ellipse', x, y, width: 110, height: 28 } as Skeleton,
  { type: 'line', x, y: y + 14, points: [[0, 0], [0, 82]] } as Skeleton,
  {
    type: 'line',
    x: x + 110,
    y: y + 14,
    points: [[0, 0], [0, 82]],
  } as Skeleton,
  {
    type: 'line',
    x,
    y: y + 96,
    points: [[0, 0], [20, 9], [55, 13], [90, 9], [110, 0]],
    roundness: { type: 2 },
  } as Skeleton,
  {
    type: 'text',
    x: x + 40,
    y: y + 42,
    text: label,
    fontSize: 16,
  } as Skeleton,
]

export const TEMPLATES: TemplateDefinition[] = [
  {
    // Classic 3-tier web app: client → API → database.
    key: 'web3tier',
    build: () => [
      box(0, 30, 96, 60, 'Client'),
      arrow(100, 60, [[0, 0], [64, 0]]),
      box(168, 30, 120, 60, 'API'),
      arrow(292, 60, [[0, 0], [64, 0]]),
      ...db(360, 12, 'DB'),
    ],
  },
  {
    // Microservices behind a gateway sharing a database and cache.
    key: 'microservices',
    build: () => [
      box(0, 70, 110, 56, 'Gateway'),
      arrow(114, 92, [[0, 0], [60, -40]]),
      arrow(114, 100, [[0, 0], [60, 60]]),
      box(178, 20, 120, 56, 'Service A'),
      box(178, 150, 120, 56, 'Service B'),
      arrow(302, 46, [[0, 0], [60, 30]]),
      arrow(302, 176, [[0, 0], [60, -30]]),
      ...db(366, 44, 'DB'),
      box(366, 170, 110, 52, 'Cache'),
    ],
  },
]

export function findTemplateByKey(key: string): TemplateDefinition | undefined {
  return TEMPLATES.find((t) => t.key === key)
}
