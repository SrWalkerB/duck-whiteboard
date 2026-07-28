import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import * as amqp from 'amqplib'
import type { ChannelModel, ConfirmChannel } from 'amqplib'

export const SNAPSHOT_QUEUE = 'duckboard.snapshot.request'

@Injectable()
export class RabbitService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitService.name)
  private connection: ChannelModel | null = null
  private channel: ConfirmChannel | null = null

  async publishSnapshot(payload: { roomId: string; sequence: string }) {
    const channel = await this.getChannel()
    if (!channel) return false
    return channel.sendToQueue(SNAPSHOT_QUEUE, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: 'application/json',
    })
  }

  async consumeSnapshots(handler: (payload: { roomId: string; sequence: string }) => Promise<void>) {
    const channel = await this.getChannel()
    if (!channel) throw new Error('RABBITMQ_URL is required for the worker')
    await channel.prefetch(4)
    await channel.consume(SNAPSHOT_QUEUE, async (message) => {
      if (!message) return
      try {
        const payload = JSON.parse(message.content.toString()) as {
          roomId: string
          sequence: string
        }
        await handler(payload)
        channel.ack(message)
      } catch (error) {
        this.logger.error('Snapshot job failed', error)
        channel.nack(message, false, true)
      }
    })
  }

  private async getChannel() {
    if (!process.env.RABBITMQ_URL) return null
    if (this.channel) return this.channel
    const connection = await amqp.connect(process.env.RABBITMQ_URL)
    const channel = await connection.createConfirmChannel()
    await channel.assertQueue(SNAPSHOT_QUEUE, { durable: true })
    this.connection = connection
    this.channel = channel
    return channel
  }

  async onModuleDestroy() {
    await this.channel?.close()
    await this.connection?.close()
  }
}
