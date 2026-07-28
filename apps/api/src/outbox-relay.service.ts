import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'

import { RabbitService } from './rabbit.service.js'
import { PrismaService } from './prisma.service.js'

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name)
  private timer: NodeJS.Timeout | null = null
  private running = false
  private lastSnapshotSweep = 0

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbit: RabbitService,
  ) {}

  onModuleInit() {
    if (process.env.RUN_OUTBOX_RELAY === 'false') return
    this.timer = setInterval(() => void this.flush(), 1_000)
    void this.flush()
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  private async flush() {
    if (this.running || !process.env.RABBITMQ_URL) return
    this.running = true
    try {
      await this.enqueueTimedSnapshots()
      const events = await this.prisma.outboxEvent.findMany({
        where: { publishedAt: null, availableAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' },
        take: 50,
      })
      for (const event of events) {
        if (event.type !== 'snapshot.request') continue
        const payload = event.payload as { roomId: string; sequence: string }
        const published = await this.rabbit.publishSnapshot(payload)
        if (!published) break
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date(), attempts: { increment: 1 } },
        })
      }
    } catch (error) {
      this.logger.error('Could not relay collaboration outbox', error)
    } finally {
      this.running = false
    }
  }

  private async enqueueTimedSnapshots() {
    const now = Date.now()
    if (now - this.lastSnapshotSweep < 60_000) return
    this.lastSnapshotSweep = now
    const rooms = await this.prisma.room.findMany({
      where: {
        currentSequence: { gt: 0n },
        updatedAt: { gte: new Date(now - 60_000) },
      },
      select: { id: true, currentSequence: true },
      take: 100,
    })
    for (const room of rooms) {
      const [snapshot, pending] = await Promise.all([
        this.prisma.boardSnapshot.findFirst({
          where: { roomId: room.id },
          orderBy: { sequence: 'desc' },
          select: { sequence: true },
        }),
        this.prisma.outboxEvent.findFirst({
          where: { roomId: room.id, type: 'snapshot.request', publishedAt: null },
          select: { id: true },
        }),
      ])
      if (!pending && (snapshot?.sequence ?? 0n) < room.currentSequence) {
        await this.prisma.outboxEvent.create({
          data: {
            roomId: room.id,
            type: 'snapshot.request',
            payload: { roomId: room.id, sequence: room.currentSequence.toString() },
          },
        })
      }
    }
  }
}
