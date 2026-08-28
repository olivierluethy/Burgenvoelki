import type { Vec2 } from '../types';

/**
 * A single player's intent for one tick. Produced by the human input manager
 * (client) or the AI (bots), and consumed by the identical movement/combat
 * rules — so humans and bots go through exactly the same authoritative path.
 */
export interface PlayerInput {
  /** Desired move direction on the floor plane (need not be normalised). */
  move: Vec2;
  /** Aim direction on the floor plane (normalised, points where the player faces). */
  aim: Vec2;
  sprint: boolean;
  /** Rising edge requests a dash this tick. */
  dash: boolean;
  /** True while the throw button is held (charging). */
  throwHeld: boolean;
  /** Rising edge: throw was released this tick. */
  throwRelease: boolean;
  /** Rising edge: interact/pickup (E). */
  interact: boolean;
}

export function neutralInput(): PlayerInput {
  return {
    move: { x: 0, z: 0 },
    aim: { x: 1, z: 0 },
    sprint: false,
    dash: false,
    throwHeld: false,
    throwRelease: false,
    interact: false,
  };
}
