import * as React from 'react'
import { io, type Socket } from 'socket.io-client'

import { collaborationApiUrl } from '@/lib/collaboration/api'
import {
  applyElementsBatch,
  diffElements,
  type ElementsBatchOperation,
  type PersistedElementsBatchOperation,
} from '@/lib/collaboration/scene-operations'
import { useEngine } from '@/lib/engine/store'

interface Peer {
  id: string
  name: string
  color: string
}

interface CollaborationContextValue {
  roomActive: boolean
  connected: boolean
  ready: boolean
  self: Peer | null
  peers: Peer[]
  error: string | null
  sendPresence: (payload: unknown) => void
}

const emptyCollaboration: CollaborationContextValue = {
  roomActive: false,
  connected: false,
  ready: true,
  self: null,
  peers: [],
  error: null,
  sendPresence: () => undefined,
}

const CollaborationContext = React.createContext<CollaborationContextValue>(emptyCollaboration)

const COLORS = ['#e5484d', '#0e7c86', '#8e4ec6', '#d9730d', '#30a46c', '#3b82f6']

function actorProfile() {
  const key = 'duckboard:collaboration:actor'
  const existing = sessionStorage.getItem(key)
  if (existing) return JSON.parse(existing) as Peer
  const id = crypto.randomUUID()
  const profile = {
    id,
    name: 'Convidado',
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }
  sessionStorage.setItem(key, JSON.stringify(profile))
  return profile
}

export function CollaborationProvider({
  token,
  children,
}: React.PropsWithChildren<{ token: string }>) {
  const [connected, setConnected] = React.useState(false)
  const [ready, setReady] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [self, setSelf] = React.useState<Peer | null>(null)
  const [peers, setPeers] = React.useState<Peer[]>([])
  const socketRef = React.useRef<Socket | null>(null)
  const sequenceRef = React.useRef('0')
  const remoteApplyRef = React.useRef(false)
  const readyRef = React.useRef(false)
  const pendingRef = React.useRef<ElementsBatchOperation[]>([])
  const pendingSceneRef = React.useRef<{ before: ReturnType<typeof useEngine.getState>['elements']; after: ReturnType<typeof useEngine.getState>['elements'] } | null>(null)
  const sendTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPresenceRef = React.useRef(0)

  const sendPresence = React.useCallback((payload: unknown) => {
    const socket = socketRef.current
    const now = Date.now()
    if (!socket || !readyRef.current || now - lastPresenceRef.current < 100) return
    lastPresenceRef.current = now
    socket.volatile.emit('presence:update', payload)
  }, [])

  React.useEffect(() => {
    const actor = actorProfile()
    setSelf(actor)
    const socket = io(`${collaborationApiUrl}/collaboration`, {
      transports: ['websocket'],
      reconnection: true,
    })
    socketRef.current = socket

    const applyRemote = (operation: PersistedElementsBatchOperation) => {
      sequenceRef.current = operation.sequence
      if (operation.actorId === actor.id) return
      remoteApplyRef.current = true
      useEngine.getState().setElements(
        applyElementsBatch(useEngine.getState().elements, operation.payload),
      )
      remoteApplyRef.current = false
    }

    const flush = () => {
      if (!readyRef.current || !socket.connected || pendingRef.current.length === 0) return
      const operation = pendingRef.current[0]
      socket.timeout(5_000).emit('board:operation', operation, (timeout: Error | null, result?: { ok: boolean; operation?: PersistedElementsBatchOperation; code?: string }) => {
        if (timeout) return
        if (!result?.ok) {
          pendingRef.current.shift()
          setError(result?.code ?? 'operation_rejected')
          return
        }
        pendingRef.current.shift()
        if (result.operation) sequenceRef.current = result.operation.sequence
        flush()
      })
    }

    const join = () => {
      setConnected(true)
      socket.timeout(8_000).emit(
        'room:join',
        {
          token,
          actorId: actor.id,
          lastSequence: sequenceRef.current,
          profile: { color: actor.color },
        },
        (timeout: Error | null, result?: {
          ok: boolean
          code?: string
          sequence?: string
          profile?: Peer
          snapshot?: { scene: ReturnType<typeof useEngine.getState>['elements'] } | null
          operations?: PersistedElementsBatchOperation[]
          peers?: Peer[]
        }) => {
          if (timeout || !result?.ok) {
            setError(result?.code ?? 'connection_failed')
            return
          }
          let scene = result.snapshot?.scene ?? useEngine.getState().elements
          for (const operation of result.operations ?? []) {
            scene = applyElementsBatch(scene, operation.payload)
          }
          remoteApplyRef.current = true
          useEngine.getState().setElements(scene)
          remoteApplyRef.current = false
          sequenceRef.current = result.sequence ?? sequenceRef.current
          setPeers(result.peers ?? [])
          const profile = result.profile ?? actor
          sessionStorage.setItem('duckboard:collaboration:actor', JSON.stringify(profile))
          setSelf(profile)
          readyRef.current = true
          setReady(true)
          setError(null)
          socket.emit('presence:update', { name: profile.name, color: profile.color })
          flush()
        },
      )
    }

    socket.on('connect', join)
    socket.on('disconnect', () => {
      readyRef.current = false
      setConnected(false)
      setReady(false)
    })
    socket.on('board:operation', applyRemote)
    socket.on('presence:update', ({ actorId, payload }: { actorId: string; payload: Partial<Peer> }) => {
      const { name, color } = payload
      if (actorId === actor.id || !name || !color) return
      setPeers((current) => [
        ...current.filter((peer) => peer.id !== actorId),
        { id: actorId, name, color },
      ])
    })
    socket.on('presence:joined', () => {
      const profile = JSON.parse(
        sessionStorage.getItem('duckboard:collaboration:actor') ?? JSON.stringify(actor),
      ) as Peer
      socket.emit('presence:update', { name: profile.name, color: profile.color })
    })
    socket.on('presence:left', ({ actorId }: { actorId: string }) => {
      setPeers((current) => current.filter((peer) => peer.id !== actorId))
    })

    const unsubscribe = useEngine.subscribe((state, previous) => {
      if (!readyRef.current || remoteApplyRef.current || state.elements === previous.elements) return
      if (!pendingSceneRef.current) pendingSceneRef.current = { before: previous.elements, after: state.elements }
      else pendingSceneRef.current.after = state.elements
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current)
      sendTimerRef.current = setTimeout(() => {
        const pending = pendingSceneRef.current
        pendingSceneRef.current = null
        if (!pending) return
        const operation = diffElements(pending.before, pending.after, sequenceRef.current)
        if (!operation) return
        pendingRef.current.push(operation)
        flush()
      }, 250)
    })

    return () => {
      unsubscribe()
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current)
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  return (
    <CollaborationContext.Provider
      value={{ roomActive: true, connected, ready, self, peers, error, sendPresence }}
    >
      {children}
    </CollaborationContext.Provider>
  )
}

export function useCollaboration() {
  return React.useContext(CollaborationContext)
}
