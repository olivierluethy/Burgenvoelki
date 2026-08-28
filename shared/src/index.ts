/**
 * Public surface of the shared game-rules package. Consumed by the client and,
 * from milestone M7, the authoritative Colyseus server — both run the identical
 * deterministic simulation from here.
 */

export * from './types';
export * from './config';
export * from './math';
export * from './persistence';
export * from './sim';
export * from './nav/grid';
export * from './nav/astar';
export * from './arena/props';
