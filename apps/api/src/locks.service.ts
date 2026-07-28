import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { Redis } from 'ioredis'

const LOCK_TTL_MS = 10_000

@Injectable()
export class LocksService implements OnModuleDestroy {
  private readonly memoryLocks = new Map<string, { actorId: string; expiresAt: number }>()
  private readonly redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 })
    : null

  private key(roomId: string, elementId: string) {
    return `duckboard:lock:${roomId}:${elementId}`
  }

  async acquire(roomId: string, elementId: string, actorId: string) {
    const key = this.key(roomId, elementId)
    if (this.redis) {
      const current = await this.redis.get(key)
      if (current && current !== actorId) return false
      const result = await this.redis.set(key, actorId, 'PX', LOCK_TTL_MS, 'NX')
      if (result === 'OK') return true
      if (current === actorId) {
        await this.redis.pexpire(key, LOCK_TTL_MS)
        return true
      }
      return false
    }

    const current = this.memoryLocks.get(key)
    if (current && current.expiresAt > Date.now() && current.actorId !== actorId) {
      return false
    }
    this.memoryLocks.set(key, { actorId, expiresAt: Date.now() + LOCK_TTL_MS })
    return true
  }

  async release(roomId: string, elementId: string, actorId: string) {
    const key = this.key(roomId, elementId)
    if (this.redis) {
      const current = await this.redis.get(key)
      if (current === actorId) await this.redis.del(key)
      return
    }
    if (this.memoryLocks.get(key)?.actorId === actorId) this.memoryLocks.delete(key)
  }

  async onModuleDestroy() {
    await this.redis?.quit()
  }
}
