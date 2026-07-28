import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCollaboration } from '@/components/collaboration/CollaborationProvider'

export function PresenceBar() {
  const { t } = useTranslation()
  const { roomActive, connected, ready, error, self, peers } = useCollaboration()
  if (!roomActive || !self) return null

  const participants = [self, ...peers]
  const visibleParticipants = participants.slice(0, 4)
  const remaining = participants.length - visibleParticipants.length
  const status = error
    ? t('presence.reconnecting')
    : ready && connected
      ? t('presence.connected')
      : t('presence.connecting')
  const isOnline = ready && connected && !error

  return (
    <aside
      aria-label={t('presence.participants', { count: participants.length })}
      className="pointer-events-auto absolute right-3 top-20 z-10 flex items-center rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-lg backdrop-blur"
    >
      <span className="sr-only" aria-live="polite">
        {t('presence.participants', { count: participants.length })}. {status}
      </span>
      <div className="flex -space-x-2.5">
        {visibleParticipants.map((participant) => {
          const initials = participant.name
            .split(/\s+/)
            .map((part) => part.charAt(0))
            .join('')
            .slice(0, 2)
            .toUpperCase()
          const isSelf = participant.id === self.id

          return (
            <Tooltip key={participant.id} delayDuration={200}>
              <TooltipTrigger asChild>
                <div
                  className="relative flex size-8 items-center justify-center rounded-full text-[10px] font-bold tracking-wide text-white ring-2 ring-card"
                  style={{ backgroundColor: participant.color }}
                  aria-label={`${isSelf ? t('presence.you') : participant.name} · ${isSelf ? status : t('presence.connected')}`}
                >
                  {initials}
                  {isSelf && (
                    <span
                      aria-hidden="true"
                      className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end">
                {isSelf ? t('presence.you') : participant.name}
                <span className="text-muted-foreground"> · {isSelf ? status : t('presence.connected')}</span>
              </TooltipContent>
            </Tooltip>
          )
        })}
        {remaining > 0 && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <div className="flex size-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground ring-2 ring-card">
                +{remaining}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">
              <Users className="mr-1.5 inline size-3.5" />
              {t('presence.participants', { count: participants.length })}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  )
}
