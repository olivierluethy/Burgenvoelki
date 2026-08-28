import { Team } from '@shared';

/**
 * Hex mirrors of the design tokens for use in Three.js materials (which can't
 * read CSS custom properties). Keep in sync with docs/STYLEGUIDE.md §2.
 */
export const COLORS = {
  bg850: '#1a160f',
  woodLight: '#e7c08a',
  wood: '#c98f52',
  woodDeep: '#8a5a2c',
  floor: '#c98f52',
  floorAlt: '#b97e45',
  teamBlue: '#2b7ce9',
  teamBlueDeep: '#144c9e',
  teamRed: '#e23b3b',
  teamRedDeep: '#a11f1f',
  ballPink: '#ff3e9c',
  ballPinkGlow: '#ff8ac4',
  courtYellow: '#f2c14e',
  courtGreen: '#3fb27f',
  courtCyan: '#38b6c9',
  courtMagenta: '#d84fa8',
  lineWhite: '#f4ecdd',
  wall: '#2a241c',
  wallTrim: '#3a3125',
  textHi: '#fbf3e7',
} as const;

export function teamColor(team: Team, deep = false): string {
  if (team === Team.Blue) return deep ? COLORS.teamBlueDeep : COLORS.teamBlue;
  return deep ? COLORS.teamRedDeep : COLORS.teamRed;
}
