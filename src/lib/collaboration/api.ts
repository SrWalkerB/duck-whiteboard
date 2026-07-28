import type { DuckElement } from '@/lib/engine/types'

export const collaborationApiUrl =
  import.meta.env.VITE_COLLABORATION_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin)

export async function createRoom(elements: DuckElement[]) {
  const response = await fetch(`${collaborationApiUrl}/api/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ elements }),
  })
  if (!response.ok) throw new Error('Unable to create collaboration room')
  return response.json() as Promise<{ token: string; path: string }>
}
