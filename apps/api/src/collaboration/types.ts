export const MAX_ROOM_PARTICIPANTS = 50
export const MAX_OPERATION_BYTES = 64 * 1024

export interface BoardOperationInput {
  operationId: string
  baseSequence: string | number
  type: 'elements.batch'
  payload: {
    upserts: unknown[]
    deletedIds: string[]
    order: string[]
  }
}

export interface PersistedOperation extends BoardOperationInput {
  sequence: string
  actorId: string
  createdAt: string
}

export interface RoomSync {
  roomId: string
  sequence: string
  snapshot: { sequence: string; scene: unknown[] } | null
  operations: PersistedOperation[]
}

export function operationElementIds(operation: BoardOperationInput): string[] {
  const ids = new Set<string>(operation.payload.deletedIds)
  for (const element of operation.payload.upserts) {
    if (
      typeof element === 'object' &&
      element !== null &&
      'id' in element &&
      typeof element.id === 'string'
    ) {
      ids.add(element.id)
    }
  }
  return [...ids]
}

export function isOperation(value: unknown): value is BoardOperationInput {
  if (!value || typeof value !== 'object') return false
  const op = value as Partial<BoardOperationInput>
  if (
    typeof op.operationId !== 'string' ||
    op.operationId.length > 100 ||
    op.type !== 'elements.batch' ||
    !op.payload ||
    typeof op.payload !== 'object'
  ) {
    return false
  }
  const payload = op.payload as Partial<BoardOperationInput['payload']>
  return (
    Array.isArray(payload.upserts) &&
    Array.isArray(payload.deletedIds) &&
    Array.isArray(payload.order)
  )
}
