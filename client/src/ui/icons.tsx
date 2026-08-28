import type { SVGProps } from 'react';

/** The Keule (Swiss gym club / skittle) — the game's objective and icon motif. */
export function KeuleIcon({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg viewBox="0 0 24 48" fill="none" role={title ? 'img' : 'presentation'} aria-hidden={!title} {...props}>
      {title ? <title>{title}</title> : null}
      {/* club body: narrow neck flaring to a rounded base */}
      <path
        d="M12 2c1.5 0 2.4 1.2 2.5 2.8.1 1.6-.5 3.2-.9 5.2-.4 2-.5 3.6-.2 5.4.5 3 2.2 5 3.3 8 1 2.7 1.3 5.6.2 8.3-1.1 2.7-3.6 4.6-6.9 4.6s-5.8-1.9-6.9-4.6c-1.1-2.7-.8-5.6.2-8.3 1.1-3 2.8-5 3.3-8 .3-1.8.2-3.4-.2-5.4-.4-2-1-3.6-.9-5.2C9.6 3.2 10.5 2 12 2Z"
        fill="currentColor"
      />
      {/* painted ring near the head, echoing court-line markings */}
      <rect x="8.4" y="10.5" width="7.2" height="1.8" rx="0.9" fill="var(--bg-900)" opacity="0.55" />
    </svg>
  );
}

/** Simple pink ball glyph. */
export function BallIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" fill="var(--ball-pink)" />
      <path d="M6 9c3 1.5 9 1.5 12 0M6 15c3-1.5 9-1.5 12 0" stroke="var(--ball-pink-deep)" strokeWidth="1.2" />
      <circle cx="9" cy="9" r="2.4" fill="var(--ball-pink-glow)" opacity="0.6" />
    </svg>
  );
}
