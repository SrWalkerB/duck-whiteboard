import { Injectable, NotFoundException } from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'

import type { Prisma } from './generated/prisma/client.js'
import {
  type BoardOperationInput,
  type PersistedOperation,
  type RoomSync,
} from './collaboration/types.js'
import { PrismaService } from './prisma.service.js'

const SNAPSHOT_EVERY_OPERATIONS = 500n

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(scene: unknown[]) {
    const token = randomBytes(24).toString('base64url')
    const room = await this.prisma.room.create({
      data: {
        tokenHash: this.hashToken(token),
        snapshots: {
          create: { sequence: 0n, scene: scene as Prisma.InputJsonValue },
        },
      },
    })
    return { id: room.id, token }
  }

  async roomIdForToken(token: string) {
    const room = await this.prisma.room.findUnique({
      where: { tokenHash: this.hashToken(token) },
      select: { id: true },
    })
    if (!room) throw new NotFoundException('Room not found')
    return room.id
  }

  async sync(roomId: string, afterSequence?: string | number): Promise<RoomSync> {
    const after = afterSequence === undefined ? null : BigInt(afterSequence)
    const snapshot = await this.prisma.boardSnapshot.findFirst({
      where: { roomId },
      orderBy: { sequence: 'desc' },
    })
    if (!snapshot) throw new NotFoundException('Room snapshot not found')
    const start = after !== null && after >= snapshot.sequence ? after : snapshot.sequence
    const operations = await this.prisma.boardOperation.findMany({
      where: { roomId, sequence: { gt: start } },
      orderBy: { sequence: 'asc' },
    })
    const room = await this.prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      select: { currentSequence: true },
    })
    return {
      roomId,
      sequence: room.currentSequence.toString(),
      snapshot:
        after !== null && after >= snapshot.sequence
          ? null
          : { sequence: snapshot.sequence.toString(), scene: snapshot.scene as unknown[] },
      operations: operations.map((operation) => this.mapOperation(operation)),
    }
  }

  async persistOperation(roomId: string, actorId: string, input: BoardOperationInput) {
    const duplicate = await this.prisma.boardOperation.findUnique({
      where: { roomId_operationId: { roomId, operationId: input.operationId } },
    })
    if (duplicate) return this.mapOperation(duplicate)

    const saved = await this.prisma.$transaction(async (tx) => {
      const room = await tx.room.update({
        where: { id: roomId },
        data: { currentSequence: { increment: 1 } },
        select: { currentSequence: true },
      })
      const operation = await tx.boardOperation.create({
        data: {
          roomId,
          sequence: room.currentSequence,
          operationId: input.operationId,
          actorId,
          type: input.type,
          payload: input.payload as Prisma.InputJsonValue,
        },
      })
      if (room.currentSequence % SNAPSHOT_EVERY_OPERATIONS === 0n) {
        await tx.outboxEvent.create({
          data: {
            roomId,
            type: 'snapshot.request',
            payload: { roomId, sequence: room.currentSequence.toString() },
          },
        })
      }
      return operation
    })
    return this.mapOperation(saved)
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  private mapOperation(operation: {
    operationId: string
    sequence: bigint
    actorId: string
    type: string
    payload: unknown
    createdAt: Date
  }): PersistedOperation {
    return {
      operationId: operation.operationId,
      baseSequence: 0,
      sequence: operation.sequence.toString(),
      actorId: operation.actorId,
      type: operation.type as 'elements.batch',
      payload: operation.payload as BoardOperationInput['payload'],
      createdAt: operation.createdAt.toISOString(),
    }
  }
}
