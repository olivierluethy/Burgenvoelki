import type { Config } from 'tailwindcss';

/**
 * Tailwind theme mirrors docs/STYLEGUIDE.md. Colours reference CSS custom
 * properties (defined in src/styles/index.css) so the tokens stay the single
 * source of truth — never hardcode hex in components.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          900: 'var(--bg-900)',
          850: 'var(--bg-850)',
          800: 'var(--bg-800)',
          700: 'var(--bg-700)',
          600: 'var(--bg-600)',
          500: 'var(--bg-500)',
        },
        wood: {
          light: 'var(--wood-light)',
          DEFAULT: 'var(--wood)',
          deep: 'var(--wood-deep)',
        },
        team: {
          blue: 'var(--team-blue)',
          'blue-deep': 'var(--team-blue-deep)',
          'blue-glow': 'var(--team-blue-glow)',
          red: 'var(--team-red)',
          'red-deep': 'var(--team-red-deep)',
          'red-glow': 'var(--team-red-glow)',
        },
        ball: {
          pink: 'var(--ball-pink)',
          'pink-deep': 'var(--ball-pink-deep)',
          'pink-glow': 'var(--ball-pink-glow)',
        },
        court: {
          yellow: 'var(--court-yellow)',
          green: 'var(--court-green)',
          cyan: 'var(--court-cyan)',
          magenta: 'var(--court-magenta)',
        },
        text: {
          hi: 'var(--text-hi)',
          mid: 'var(--text-mid)',
          lo: 'var(--text-lo)',
          ink: 'var(--text-ink)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        rarity: {
          common: 'var(--rarity-common)',
          rare: 'var(--rarity-rare)',
          epic: 'var(--rarity-epic)',
          legendary: 'var(--rarity-legendary)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        ui: 'var(--font-ui)',
        data: 'var(--font-data)',
      },
      borderRadius: {
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '14px',
        pill: '999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,.4)',
        md: '0 6px 20px rgba(0,0,0,.45)',
        lg: '0 18px 50px rgba(0,0,0,.55)',
        'glow-blue': '0 0 24px rgba(90,160,255,.45)',
        'glow-red': '0 0 24px rgba(255,107,107,.45)',
        'glow-pink': '0 0 24px rgba(255,138,196,.55)',
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
