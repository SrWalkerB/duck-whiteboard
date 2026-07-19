interface DuckLogoProps {
  className?: string
  /** Size in px for width and height. */
  size?: number
}

/** The Duck Whiteboard mascot: a friendly duckling in a marigold badge. */
export function DuckLogo({ className, size = 36 }: DuckLogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Duck Whiteboard"
    >
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="13"
        fill="var(--brand)"
      />
      {/* pond ripple */}
      <path
        d="M7 37c4 2.4 8 2.4 12 0s8-2.4 12 0 8 2.4 10 0"
        stroke="var(--brand-ink)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* body */}
      <ellipse cx="26" cy="27" rx="12" ry="9" fill="var(--brand-ink)" />
      {/* tail flip */}
      <path d="M36 23c3-1.5 5.5-1 6.5.5-1.5 1.8-3.8 2.4-6 2z" fill="var(--brand-ink)" />
      {/* head */}
      <circle cx="18" cy="19" r="7.5" fill="var(--brand-ink)" />
      {/* wing */}
      <path
        d="M22 27c3.5-2 7-2 9.5.4-2.4 2.3-6.4 2.6-9.5-.4z"
        fill="var(--brand)"
        opacity="0.25"
      />
      {/* bill */}
      <path
        d="M23 17.5c5 .2 8 1.3 8 3s-3 2.6-8 2.4c-1.4-.06-1.4-5.34 0-5.4z"
        fill="var(--brand-ink)"
        opacity="0.55"
      />
      {/* eye */}
      <circle cx="18.5" cy="17.5" r="1.7" fill="var(--brand)" />
    </svg>
  )
}
