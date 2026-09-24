"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Plan", icon: PlanIcon },
  { href: "/trips", label: "Trips", icon: TripsIcon },
  { href: "/more", label: "More", icon: MoreIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] px-4">
      <div className="flex items-center gap-1 rounded-full border border-border bg-surface/95 p-1.5 shadow-lg backdrop-blur">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-full px-5 py-2 text-xs font-medium transition ${
                isActive ? "bg-surface-raised text-accent" : "text-neutral-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function PlanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 3v16M15 5v16" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function TripsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="12" r="1.1" fill="currentColor" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" />
      <circle cx="15.5" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}
