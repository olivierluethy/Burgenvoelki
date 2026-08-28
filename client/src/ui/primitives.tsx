import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

/** Reusable UI primitives implementing docs/STYLEGUIDE.md §6. */

type Variant = 'primary' | 'ghost' | 'danger' | 'pink';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-ui font-bold rounded-md ' +
  'transition-[transform,box-shadow,background-color,filter] duration-150 ' +
  'active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 ' +
  'select-none whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary:
    'bg-team-blue text-text-hi hover:-translate-y-px hover:shadow-glow-blue active:bg-team-blue-deep focus-visible:outline-team-blue-glow',
  ghost:
    'bg-transparent text-text-hi border border-bg-500 hover:bg-bg-700 hover:-translate-y-px focus-visible:outline-team-blue-glow',
  danger:
    'bg-team-red text-text-hi hover:-translate-y-px hover:shadow-glow-red active:bg-team-red-deep focus-visible:outline-team-red-glow',
  pink:
    'bg-ball-pink text-text-hi hover:-translate-y-px hover:shadow-glow-pink active:bg-ball-pink-deep focus-visible:outline-ball-pink-glow',
};

const sizes: Record<Size, string> = {
  md: 'text-[15px] px-5 py-3 min-h-[44px]',
  lg: 'text-[17px] px-7 py-4 min-h-[52px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

export function CourtRule({ segmented = false, className = '' }: { segmented?: boolean; className?: string }) {
  return <hr className={`${segmented ? 'court-rule--segmented' : 'court-rule'} ${className}`} />;
}

export function Panel({
  children,
  court = false,
  className = '',
}: {
  children: ReactNode;
  court?: boolean;
  className?: string;
}) {
  if (court) {
    return <div className={`panel--court p-6 ${className}`}>{children}</div>;
  }
  return (
    <div
      className={`bg-bg-800 border border-bg-600 rounded-lg shadow-md p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function Tag({
  children,
  color = 'var(--text-mid)',
  className = '',
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`eyebrow inline-flex items-center rounded-pill px-2.5 py-1 ${className}`}
      style={{ color, border: `1px solid ${color}`, background: 'rgba(0,0,0,.2)' }}
    >
      {children}
    </span>
  );
}
