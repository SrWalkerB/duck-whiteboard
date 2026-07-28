import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module.js'
import { RabbitService } from './rabbit.service.js'
import { SnapshotService } from './snapshot.service.js'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const rabbit = app.get(RabbitService)
  const snapshots = app.get(SnapshotService)
  await rabbit.consumeSnapshots((job) => snapshots.compact(job.roomId, job.sequence))
}

void bootstrap()
