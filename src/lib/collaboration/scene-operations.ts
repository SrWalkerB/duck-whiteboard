import type { DuckElement } from '@/lib/engine/types'

export interface ElementsBatchOperation {
  operationId: string
  baseSequence: string
  type: 'elements.batch'
  payload: {
    upserts: DuckElement[]
    deletedIds: string[]
    order: string[]
  }
}

export interface PersistedElementsBatchOperation extends ElementsBatchOperation {
  sequence: string
  actorId: string
  createdAt: string
}

export function diffElements(
  before: DuckElement[],
  after: DuckElement[],
  baseSequence: string,
): ElementsBatchOperation | null {
  const previous = new Map(before.map((element) => [element.id, element]))
  const upserts = after.filter((element) => {
    const old = previous.get(element.id)
    return !old || JSON.stringify(old) !== JSON.stringify(element)
  })
  const nextIds = new Set(after.map((element) => element.id))
  const deletedIds = before
    .filter((element) => !nextIds.has(element.id))
    .map((element) => element.id)

  if (upserts.length === 0 && deletedIds.length === 0) return null
  return {
    operationId: crypto.randomUUID(),
    baseSequence,
    type: 'elements.batch',
    payload: {
      upserts,
      deletedIds,
      order: after.map((element) => element.id),
    },
  }
}

export function applyElementsBatch(
  elements: DuckElement[],
  payload: ElementsBatchOperation['payload'],
): DuckElement[] {
  const byId = new Map(elements.map((element) => [element.id, element]))
  for (const element of payload.upserts) byId.set(element.id, element)
  for (const id of payload.deletedIds) {
    const element = byId.get(id)
    if (element) byId.set(id, { ...element, isDeleted: true })
  }

  const ordered: DuckElement[] = []
  for (const id of payload.order) {
    const element = byId.get(id)
    if (element) {
      ordered.push(element)
      byId.delete(id)
    }
  }
  return [...ordered, ...byId.values()]
}
