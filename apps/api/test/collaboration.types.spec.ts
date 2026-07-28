import { describe, expect, it } from 'vitest'

import {
  isOperation,
  operationElementIds,
} from '../src/collaboration/types.js'

describe('collaboration operation contract', () => {
  it('accepts a semantic batch and returns each affected element once', () => {
    const operation = {
      operationId: 'operation-1',
      baseSequence: '10',
      type: 'elements.batch' as const,
      payload: {
        upserts: [{ id: 'shape-1' }, { id: 'shape-2' }],
        deletedIds: ['shape-2', 'shape-3'],
        order: ['shape-1', 'shape-2'],
      },
    }

    expect(isOperation(operation)).toBe(true)
    expect(operationElementIds(operation)).toEqual(
      expect.arrayContaining(['shape-1', 'shape-2', 'shape-3']),
    )
  })

  it('rejects malformed payloads before they reach persistence', () => {
    expect(isOperation({ operationId: 'x', type: 'elements.batch', payload: {} })).toBe(false)
    expect(isOperation({ operationId: 'x', type: 'scene.replace', payload: {} })).toBe(false)
  })
})
