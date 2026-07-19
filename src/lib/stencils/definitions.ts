import type { Skeleton } from '@/lib/engine/skeleton'

export type StencilCategoryKey = 'database' | 'server' | 'services' | 'actors'

export interface StencilDefinition {
  /** Stable id used for React keys and i18n lookup (`stencils.items.<key>`). */
  key: string
  /** Builds the skeleton at local origin; ids/positions are assigned on insert. */
  build: () => Skeleton[]
}

export interface StencilCategory {
  key: StencilCategoryKey
  stencils: StencilDefinition[]
}

// Helpers keep the skeleton definitions terse and readable.
const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  label?: string,
): Skeleton =>
  ({
    type: 'rectangle',
    x,
    y,
    width,
    height,
    ...(label ? { label: { text: label } } : {}),
  }) as Skeleton

const ellipse = (
  x: number,
  y: number,
  width: number,
  height: number,
  label?: string,
): Skeleton =>
  ({
    type: 'ellipse',
    x,
    y,
    width,
    height,
    ...(label ? { label: { text: label } } : {}),
  }) as Skeleton

const diamond = (
  x: number,
  y: number,
  width: number,
  height: number,
  label?: string,
): Skeleton =>
  ({
    type: 'diamond',
    x,
    y,
    width,
    height,
    ...(label ? { label: { text: label } } : {}),
  }) as Skeleton

const line = (
  x: number,
  y: number,
  points: [number, number][],
): Skeleton =>
  ({ type: 'line', x, y, points }) as Skeleton

// A smoothly curved line (catmull-rom), used for the rounded parts of shapes.
const curve = (
  x: number,
  y: number,
  points: [number, number][],
): Skeleton =>
  ({
    type: 'line',
    x,
    y,
    points,
    roundness: { type: 2 },
  }) as Skeleton

const text = (
  x: number,
  y: number,
  value: string,
  fontSize = 16,
): Skeleton =>
  ({ type: 'text', x, y, text: value, fontSize }) as Skeleton

/** A hand-drawn database cylinder with a caption. */
const cylinder = (caption: string): Skeleton[] => [
  ellipse(0, 0, 120, 30),
  line(0, 15, [
    [0, 0],
    [0, 90],
  ]),
  line(120, 15, [
    [0, 0],
    [0, 90],
  ]),
  // Bottom of the cylinder: a smooth downward arc mirroring the top ellipse.
  curve(0, 105, [
    [0, 0],
    [22, 10],
    [60, 15],
    [98, 10],
    [120, 0],
  ]),
  text(60 - caption.length * 5, 46, caption, 18),
]

export function findStencilByKey(key: string): StencilDefinition | undefined {
  for (const category of STENCIL_CATEGORIES) {
    const found = category.stencils.find((s) => s.key === key)
    if (found) return found
  }
  return undefined
}

export const STENCIL_CATEGORIES: StencilCategory[] = [
  {
    key: 'database',
    stencils: [
      { key: 'database', build: () => cylinder('SQL') },
      { key: 'nosql', build: () => cylinder('NoSQL') },
    ],
  },
  {
    key: 'server',
    stencils: [
      {
        key: 'server',
        build: () => [
          rect(0, 0, 90, 120),
          line(0, 40, [
            [0, 0],
            [90, 0],
          ]),
          line(0, 80, [
            [0, 0],
            [90, 0],
          ]),
          ellipse(72, 14, 8, 8),
          ellipse(72, 54, 8, 8),
          ellipse(72, 94, 8, 8),
          text(20, 128, 'Server'),
        ],
      },
      {
        // A puffy cloud outline (closed rounded curve) with a caption.
        key: 'cloud',
        build: () => [
          curve(0, 0, [
            [20, 60],
            [8, 50],
            [12, 36],
            [26, 30],
            [28, 14],
            [48, 6],
            [66, 15],
            [82, 5],
            [106, 12],
            [112, 30],
            [132, 35],
            [132, 52],
            [116, 60],
            [20, 60],
          ]),
          text(44, 27, 'Cloud'),
        ],
      },
      { key: 'loadBalancer', build: () => [diamond(0, 0, 130, 95, 'LB')] },
      {
        // A globe with meridians for a CDN / edge network.
        key: 'cdn',
        build: () => [
          ellipse(0, 0, 78, 78),
          line(0, 39, [
            [0, 0],
            [78, 0],
          ]),
          curve(39, 0, [
            [0, 0],
            [-16, 39],
            [0, 78],
          ]),
          curve(39, 0, [
            [0, 0],
            [16, 39],
            [0, 78],
          ]),
          text(28, 86, 'CDN'),
        ],
      },
      {
        // A brick wall for a firewall.
        key: 'firewall',
        build: () => [
          rect(0, 0, 120, 66),
          line(0, 22, [
            [0, 0],
            [120, 0],
          ]),
          line(0, 44, [
            [0, 0],
            [120, 0],
          ]),
          line(40, 0, [
            [0, 0],
            [0, 22],
          ]),
          line(80, 0, [
            [0, 0],
            [0, 22],
          ]),
          line(20, 22, [
            [0, 0],
            [0, 22],
          ]),
          line(60, 22, [
            [0, 0],
            [0, 22],
          ]),
          line(100, 22, [
            [0, 0],
            [0, 22],
          ]),
          line(40, 44, [
            [0, 0],
            [0, 22],
          ]),
          line(80, 44, [
            [0, 0],
            [0, 22],
          ]),
          text(30, 74, 'Firewall', 14),
        ],
      },
    ],
  },
  {
    key: 'services',
    stencils: [
      { key: 'api', build: () => [rect(0, 0, 140, 70, 'API')] },
      { key: 'microservice', build: () => [rect(0, 0, 140, 70, 'Service')] },
      {
        key: 'queue',
        build: () => [
          rect(0, 0, 170, 60),
          line(42, 0, [
            [0, 0],
            [0, 60],
          ]),
          line(85, 0, [
            [0, 0],
            [0, 60],
          ]),
          line(128, 0, [
            [0, 0],
            [0, 60],
          ]),
          text(62, 70, 'Queue'),
        ],
      },
      { key: 'cache', build: () => [rect(0, 0, 120, 70, 'Cache')] },
      {
        // API gateway: a box split by a gate slit, captioned below.
        key: 'gateway',
        build: () => [
          rect(0, 0, 130, 64),
          line(65, 0, [
            [0, 0],
            [0, 64],
          ]),
          text(38, 72, 'Gateway', 14),
        ],
      },
    ],
  },
  {
    key: 'actors',
    stencils: [
      {
        key: 'user',
        build: () => [
          ellipse(8, 0, 26, 26),
          line(21, 26, [
            [0, 0],
            [0, 42],
          ]),
          line(0, 40, [
            [0, 0],
            [42, 0],
          ]),
          line(21, 68, [
            [0, 0],
            [-17, 28],
          ]),
          line(21, 68, [
            [0, 0],
            [17, 28],
          ]),
          text(6, 100, 'User'),
        ],
      },
      {
        // A smartphone (client device).
        key: 'mobile',
        build: () => [
          rect(0, 0, 56, 100),
          line(20, 8, [
            [0, 0],
            [16, 0],
          ]),
          line(0, 84, [
            [0, 0],
            [56, 0],
          ]),
          ellipse(24, 89, 8, 8),
          text(6, 108, 'Mobile', 14),
        ],
      },
      {
        // Storage bucket (S3-style pail with a rim and handle).
        key: 'storage',
        build: () => [
          ellipse(8, 0, 84, 20),
          line(14, 10, [
            [0, 0],
            [8, 72],
          ]),
          line(86, 10, [
            [0, 0],
            [-8, 72],
          ]),
          curve(22, 82, [
            [0, 0],
            [24, 7],
            [48, 0],
          ]),
          curve(16, 8, [
            [0, 0],
            [34, -16],
            [68, 0],
          ]),
          text(38, 34, 'S3', 18),
        ],
      },
      {
        // Docker-style: shipping containers stacked over a waterline.
        key: 'container',
        build: () => [
          curve(0, 80, [
            [0, 4],
            [24, 0],
            [48, 6],
            [72, 0],
            [96, 6],
            [120, 2],
          ]),
          rect(6, 44, 33, 30),
          rect(43, 44, 33, 30),
          rect(80, 44, 33, 30),
          rect(24, 14, 33, 30),
          rect(62, 14, 33, 30),
          text(36, 92, 'Docker', 14),
        ],
      },
    ],
  },
]
