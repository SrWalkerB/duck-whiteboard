import * as React from 'react'
import { User } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Peer {
  id: string
  name: string
  color: string
}

const PALETTE = ['#e5484d', '#0e7c86', '#8e4ec6', '#d9730d', '#30a46c', '#3b82f6']

/**
 * Presence avatars, floating at the top. One random guest "joins" on mount —
 * this is the seam where a real WebSocket feed plugs in later (replace the mock
 * with a socket subscription; the render stays the same).
 */
function usePeers(): Peer[] {
  return React.useState<Peer[]>(() => {
    const n = Math.floor(Math.random() * 90) + 10
    return [
      {
        id: 'mock',
        name: `Convidado ${n}`,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      },
    ]
  })[0]
}

export function PresenceBar() {
  const peers = usePeers()
  if (peers.length === 0) return null

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/70 bg-card/90 px-1.5 py-1 shadow-lg backdrop-blur">
      {peers.map((p) => (
        <Tooltip key={p.id} delayDuration={200}>
          <TooltipTrigger asChild>
            <div
              className="flex size-7 items-center justify-center rounded-full text-white ring-2 ring-card"
              style={{ backgroundColor: p.color }}
              aria-label={p.name}
            >
              <User className="size-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">{p.name}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
