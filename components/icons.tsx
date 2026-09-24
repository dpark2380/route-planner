type IconProps = { className?: string };

export function OriginIcon({ className }: IconProps) {
  return (
    <div className={`flex items-center justify-center rounded-full bg-accent ${className ?? "h-8 w-8"}`}>
      <div className="h-2.5 w-2.5 rounded-full bg-white" />
    </div>
  );
}

export function DestinationIcon({ className }: IconProps) {
  return (
    <div className={`flex items-center justify-center rounded-full bg-blue-500 ${className ?? "h-8 w-8"}`}>
      <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
      </svg>
    </div>
  );
}

export function SwapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "h-4 w-4"} aria-hidden="true">
      <path
        d="M7 8h10m0 0-3-3m3 3-3 3M17 16H7m0 0 3 3m-3-3 3-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BackArrowIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "h-5 w-5"} aria-hidden="true">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "h-5 w-5"} aria-hidden="true">
      <path
        d="M12 16V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "h-4 w-4"} aria-hidden="true">
      <path
        d="M5 12h14m0 0-5-5m5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TollGantryIcon({ className }: IconProps) {
  return (
    <div className={`flex items-center justify-center rounded-full bg-purple-500 ${className ?? "h-6 w-6"}`}>
      <span className="text-xs font-bold text-white">$</span>
    </div>
  );
}
