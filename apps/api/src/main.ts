import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module.js'
import { RedisIoAdapter } from './redis-io.adapter.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true })
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))

  const redisAdapter = new RedisIoAdapter(app)
  await redisAdapter.connectToRedis()
  app.useWebSocketAdapter(redisAdapter)

  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0')
}

void bootstrap()
