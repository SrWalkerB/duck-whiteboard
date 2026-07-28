import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import type { Server, Socket } from 'socket.io'

import {
  MAX_OPERATION_BYTES,
  MAX_ROOM_PARTICIPANTS,
  isOperation,
  operationElementIds,
} from './collaboration/types.js'
import { LocksService } from './locks.service.js'
import { MetricsService } from './metrics.service.js'
import { RoomsService } from './rooms.service.js'

type CollaborationSocket = Socket
type PresenceProfile = { id: string; name: string; color: string }
type JoinProfile = { color?: string }

const GUEST_COLORS = ['#e5484d', '#0e7c86', '#8e4ec6', '#d9730d', '#30a46c', '#3b82f6']

@WebSocketGateway({
  namespace: '/collaboration',
  transports: ['websocket'],
  cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? true },
  maxHttpBufferSize: MAX_OPERATION_BYTES,
})
export class RoomsGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(RoomsGateway.name)

  @WebSocketServer()
  server!: Server

  constructor(
    private readonly rooms: RoomsService,
    private readonly locks: LocksService,
    private readonly metrics: MetricsService,
  ) {}

  @SubscribeMessage('room:join')
  async join(
    @ConnectedSocket() client: CollaborationSocket,
    @MessageBody() body: {
      token?: string
      actorId?: string
      lastSequence?: string
      profile?: JoinProfile
    },
  ) {
    if (!body?.token || !body.actorId || body.actorId.length > 100) {
      return { ok: false, code: 'invalid_join' }
    }
    try {
      const roomId = await this.rooms.roomIdForToken(body.token)
      const roomSockets = await this.server.in(roomId).fetchSockets()
      if (roomSockets.length >= MAX_ROOM_PARTICIPANTS) {
        return { ok: false, code: 'room_full' }
      }
      const peers = roomSockets
        .map((socket) => socket.data.profile)
        .filter(isPresenceProfile)
      const profile = nextGuestProfile(body.actorId, body.profile, peers)
      client.data.roomId = roomId
      client.data.actorId = body.actorId
      client.data.profile = profile
      client.data.lockedIds = new Set()
      await client.join(roomId)
      this.metrics.increment('room_join_total')
      client.to(roomId).emit('presence:joined', { actorId: body.actorId })
      return {
        ok: true,
        profile,
        peers,
        ...(await this.rooms.sync(roomId, body.lastSequence)),
      }
    } catch (error) {
      this.logger.warn(`Room join rejected: ${String(error)}`)
      return { ok: false, code: 'room_not_found' }
    }
  }

  @SubscribeMessage('board:operation')
  async operation(
    @ConnectedSocket() client: CollaborationSocket,
    @MessageBody() body: unknown,
  ) {
    const { roomId, actorId } = client.data
    if (!roomId || !actorId) return { ok: false, code: 'not_joined' }
    if (!isOperation(body) || Buffer.byteLength(JSON.stringify(body)) > MAX_OPERATION_BYTES) {
      return { ok: false, code: 'invalid_operation' }
    }
    const ids = operationElementIds(body)
    for (const id of ids) {
      if (!(await this.locks.acquire(roomId, id, actorId))) {
        this.metrics.increment('lock_rejected_total')
        return { ok: false, code: 'element_locked', elementId: id }
      }
      client.data.lockedIds?.add(id)
    }
    const operation = await this.rooms.persistOperation(roomId, actorId, body)
    this.server.to(roomId).emit('board:operation', operation)
    this.metrics.increment('board_operation_total')
    return { ok: true, operation }
  }

  @SubscribeMessage('board:preview')
  preview(@ConnectedSocket() client: CollaborationSocket, @MessageBody() body: unknown) {
    if (!client.data.roomId) return
    client.to(client.data.roomId).volatile.emit('board:preview', {
      actorId: client.data.actorId,
      payload: body,
    })
  }

  @SubscribeMessage('presence:update')
  presence(@ConnectedSocket() client: CollaborationSocket, @MessageBody() body: unknown) {
    if (!client.data.roomId) return
    const profile = client.data.profile as PresenceProfile | undefined
    if (!profile) return
    if (isPresenceProfilePayload(body) && isSafeColor(body.color)) {
      profile.color = body.color
    }
    client.to(client.data.roomId).volatile.emit('presence:update', {
      actorId: client.data.actorId,
      payload: { name: profile.name, color: profile.color },
    })
  }

  @SubscribeMessage('element:unlock')
  async unlock(
    @ConnectedSocket() client: CollaborationSocket,
    @MessageBody() body: { elementId?: string },
  ) {
    const { roomId, actorId } = client.data
    if (!roomId || !actorId || !body?.elementId) return
    await this.locks.release(roomId, body.elementId, actorId)
    client.data.lockedIds?.delete(body.elementId)
    client.to(roomId).emit('element:unlocked', { elementId: body.elementId, actorId })
  }

  async handleDisconnect(client: CollaborationSocket) {
    const { roomId, actorId, lockedIds } = client.data
    if (!roomId || !actorId) return
    for (const elementId of lockedIds ?? []) {
      await this.locks.release(roomId, elementId, actorId)
    }
    client.to(roomId).emit('presence:left', { actorId })
  }
}

function isPresenceProfile(value: unknown): value is PresenceProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<PresenceProfile>
  return (
    typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    typeof profile.color === 'string'
  )
}

function isPresenceProfilePayload(value: unknown): value is Omit<PresenceProfile, 'id'> {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<PresenceProfile>
  return typeof profile.name === 'string' && typeof profile.color === 'string'
}

function nextGuestProfile(
  actorId: string,
  requestedProfile: JoinProfile | undefined,
  peers: PresenceProfile[],
): PresenceProfile {
  const usedNumbers = new Set(
    peers
      .map((peer) => Number(/^Convidado (\d+)$/.exec(peer.name)?.[1]))
      .filter(Number.isInteger),
  )
  let number = 1
  while (usedNumbers.has(number)) number += 1

  const requestedColor = requestedProfile?.color
  const color = isSafeColor(requestedColor)
    ? requestedColor
    : GUEST_COLORS[(number - 1) % GUEST_COLORS.length]

  return { id: actorId, name: `Convidado ${number}`, color }
}

function isSafeColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}
