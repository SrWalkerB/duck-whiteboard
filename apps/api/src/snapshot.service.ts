import { Injectable } from '@nestjs/common'

import type { BoardOperationInput } from './collaboration/types.js'
import { PrismaService } from './prisma.service.js'

@Injectable()
export class SnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async compact(roomId: string, targetSequence: string) {
    const target = BigInt(targetSequence)
    const existing = await this.prisma.boardSnapshot.findFirst({
      where: { roomId, sequence: { lte: target } },
      orderBy: { sequence: 'desc' },
    })
    if (existing?.sequence === target) return

    const baseScene = Array.isArray(existing?.scene) ? [...existing.scene] : []
    const operations = await this.prisma.boardOperation.findMany({
      where: {
        roomId,
        sequence: { gt: existing?.sequence ?? 0n, lte: target },
      },
      orderBy: { sequence: 'asc' },
    })
    const scene = operations.reduce<unknown[]>(
      (current, operation) => applyOperation(current, operation.payload as BoardOperationInput['payload']),
      baseScene,
    )
    await this.prisma.boardSnapshot.upsert({
      where: { roomId_sequence: { roomId, sequence: target } },
      create: { roomId, sequence: target, scene: scene as never },
      update: { scene: scene as never },
    })
  }
}

function applyOperation(scene: unknown[], payload: BoardOperationInput['payload']) {
  const elements = new Map<string, unknown>()
  for (const element of scene) {
    if (hasId(element)) elements.set(element.id, element)
  }
  for (const element of payload.upserts) {
    if (hasId(element)) elements.set(element.id, element)
  }
  for (const id of payload.deletedIds) {
    const current = elements.get(id)
    if (current && typeof current === 'object') {
      elements.set(id, { ...current, isDeleted: true })
    }
  }
  const ordered = payload.order.flatMap((id) => {
    const element = elements.get(id)
    if (element) {
      elements.delete(id)
      return [element]
    }
    return []
  })
  return [...ordered, ...elements.values()]
}

function hasId(value: unknown): value is { id: string } {
  return !!value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
}
