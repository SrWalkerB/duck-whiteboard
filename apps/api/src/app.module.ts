import { Module } from '@nestjs/common'

import { LocksService } from './locks.service.js'
import { MetricsController } from './metrics.controller.js'
import { MetricsService } from './metrics.service.js'
import { OutboxRelayService } from './outbox-relay.service.js'
import { PrismaService } from './prisma.service.js'
import { RabbitService } from './rabbit.service.js'
import { RoomsController } from './rooms.controller.js'
import { RoomsGateway } from './rooms.gateway.js'
import { RoomsService } from './rooms.service.js'
import { SnapshotService } from './snapshot.service.js'

@Module({
  controllers: [RoomsController, MetricsController],
  providers: [
    PrismaService,
    MetricsService,
    LocksService,
    RabbitService,
    RoomsService,
    RoomsGateway,
    OutboxRelayService,
    SnapshotService,
  ],
})
export class AppModule {}
