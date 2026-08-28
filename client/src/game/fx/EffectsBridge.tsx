import { useEffect } from 'react';
import { Team, type SimEvent } from '@shared';
import type { GameRuntime } from '@/game/runtime/GameRuntime';
import { audio } from '@/audio/AudioService';
import { useFxStore } from './fxStore';

const BLUE = '#5aa0ff';
const RED = '#ff6b6b';
const PINK = '#ff8ac4';
const GREEN = '#3fb27f';
const YELLOW = '#f2c14e';

/**
 * Bridges runtime sim events to audio (procedural SFX) and the HUD feed /
 * transient markers. Lives outside the Canvas; renders nothing.
 */
export function EffectsBridge({ runtime }: { runtime: GameRuntime }) {
  useEffect(() => {
    const fx = useFxStore.getState();
    const name = (id: string | null) => (id ? runtime.state.players[id]?.name ?? '—' : '—');
    const teamColor = (t: Team) => (t === Team.Blue ? BLUE : RED);
    const humanId = runtime.state.humanId;

    const off = runtime.onEvent((e: SimEvent) => {
      switch (e.type) {
        case 'throw':
          audio.play('throw', 0.5 + e.power * 0.8);
          break;
        case 'bounce':
          audio.play(e.surface === 'floor' ? 'bounceWood' : 'bounceWall', e.speed / 12);
          break;
        case 'pickup':
          if (e.player === humanId) audio.play('pickup');
          break;
        case 'hit':
          audio.play('hitPlayer');
          if (e.by === humanId) fx.markHit();
          if (e.target === humanId) fx.markHurt();
          break;
        case 'out': {
          audio.play('out', 0.9);
          const tp = runtime.state.players[e.player];
          fx.pushFeed('out', `${name(e.by)} knocked out ${name(e.player)}`, tp ? teamColor(tp.team) : RED);
          break;
        }
        case 'respawn':
          if (e.player === humanId) audio.play('respawn');
          break;
        case 'keule-pickup':
          audio.play('keulePickup');
          fx.pushFeed('capture', `${e.team === Team.Blue ? 'Red' : 'Blue'} grabbed the ${e.team} Keule`, PINK);
          break;
        case 'keule-return':
          audio.play('roundStart', 0.8);
          fx.pushFeed('return', `${e.team} Keule returned home`, GREEN);
          break;
        case 'keule-invalid':
          audio.play('keuleInvalid');
          fx.markInvalid();
          break;
        case 'capture':
          audio.play('capture');
          fx.pushFeed('capture', `${e.by ? name(e.by) : e.team} scored a capture!`, YELLOW);
          break;
        case 'round-start':
          audio.play('roundStart');
          fx.showBanner(`Round ${e.round}`, 'Steal the enemy Keule — go!');
          break;
        case 'round-end':
          if (e.winner) audio.play('victory');
          break;
        default:
          break;
      }
    });
    return off;
  }, [runtime]);

  return null;
}
