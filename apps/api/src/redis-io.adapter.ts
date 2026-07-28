import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Server, ServerOptions } from 'socket.io'
import { Redis } from 'ioredis'

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>
  private pubClient?: Redis
  private subClient?: Redis

  async connectToRedis() {
    if (!process.env.REDIS_URL) return
    this.pubClient = new Redis(process.env.REDIS_URL, { lazyConnect: true })
    this.subClient = this.pubClient.duplicate()
    await Promise.all([this.pubClient.connect(), this.subClient.connect()])
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient)
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options)
    if (this.adapterConstructor) server.adapter(this.adapterConstructor)
    return server
  }

  async close(server: Server) {
    await Promise.all([this.pubClient?.quit(), this.subClient?.quit()])
    await super.close(server)
  }
}
