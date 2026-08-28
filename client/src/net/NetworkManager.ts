import { Client, type Room } from 'colyseus.js';
import {
  DEFAULT_ROOM_SETTINGS,
  NET_MSG,
  Team,
  type PlayerInput,
  type RoomSettings,
  type SimEvent,
} from '@shared';
import { useNetStore, type LobbyPlayer, type NetHud, type NetHudPlayer } from './netStore';
import { audio } from '@/audio/AudioService';
import { useFxStore } from '@/game/fx/fxStore';

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ??
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:2567`;

/**
 * Client-side networking: connect/create/join rooms, mirror authoritative
 * state into the net store, forward input, and play server events (SFX/FX).
 * The client is never authoritative — it only sends intent and renders state.
 */
class NetworkManager {
  private client = new Client(SERVER_URL);
  private room: Room | null = null;
  myPlayerId = '';

  get current(): Room | null {
    return this.room;
  }

  async quickMatch(name: string) {
    await this.connect(async () => {
      const rooms = await this.client.getAvailableRooms('burgen');
      const open = rooms.find(
        (r) => !r.metadata?.started && !r.metadata?.isPrivate && r.clients < r.maxClients,
      );
      if (open) return this.client.joinById(open.roomId, { name });
      return this.client.create('burgen', { name, settings: { ...DEFAULT_ROOM_SETTINGS, isPrivate: false } });
    });
  }

  async createRoom(name: string, settings: Partial<RoomSettings>) {
    await this.connect(() =>
      this.client.create('burgen', { name, settings: { ...DEFAULT_ROOM_SETTINGS, ...settings, isPrivate: true } }),
    );
  }

  async joinByCode(name: string, code: string) {
    const wanted = code.trim().toUpperCase();
    await this.connect(async () => {
      const rooms = await this.client.getAvailableRooms('burgen');
      const match = rooms.find((r) => (r.metadata?.code ?? '').toUpperCase() === wanted);
      if (!match) throw new Error(`No room with code ${wanted}`);
      return this.client.joinById(match.roomId, { name });
    });
  }

  private async connect(factory: () => Promise<Room>) {
    const net = useNetStore.getState();
    net.set({ status: 'connecting', error: null });
    try {
      const room = await factory();
      this.room = room;
      this.myPlayerId = '';
      net.set({ status: 'lobby', sessionId: room.sessionId });
      this.bind(room);
    } catch (e) {
      net.set({ status: 'error', error: e instanceof Error ? e.message : 'Connection failed' });
    }
  }

  private bind(room: Room) {
    room.onStateChange((state) => this.syncFromState(state as unknown as Record<string, unknown>));
    room.onMessage(NET_MSG.events, (events: SimEvent[]) => this.handleEvents(events));
    room.onLeave(() => {
      this.room = null;
      useNetStore.getState().reset();
    });
    room.onError((_code, message) => {
      useNetStore.getState().set({ status: 'error', error: message ?? 'Room error' });
    });
  }

  sendInput(input: PlayerInput) {
    this.room?.send(NET_MSG.input, input);
  }
  toggleReady() {
    this.room?.send(NET_MSG.ready);
  }
  startMatch() {
    this.room?.send(NET_MSG.start);
  }
  updateSettings(patch: Partial<RoomSettings>) {
    this.room?.send(NET_MSG.settings, patch);
  }
  reassign(sessionId: string, team: Team) {
    this.room?.send(NET_MSG.reassign, { sessionId, team });
  }
  leave() {
    this.room?.leave();
    this.room = null;
    useNetStore.getState().reset();
  }

  // --- state mirroring ---

  private syncFromState(state: Record<string, unknown>) {
    const store = useNetStore.getState();
    const mySession = this.room?.sessionId ?? '';

    const lobbyPlayers: LobbyPlayer[] = [];
    const hudPlayers: NetHudPlayer[] = [];
    const playersMap = state.players as { forEach: (cb: (p: Record<string, unknown>, key: string) => void) => void };
    playersMap.forEach((p, key) => {
      const team = (p.team as string) === 'red' ? Team.Red : Team.Blue;
      if (p.sessionId) {
        lobbyPlayers.push({
          sessionId: p.sessionId as string,
          name: p.name as string,
          team,
          ready: !!p.ready,
          isOwner: p.sessionId === state.ownerSessionId,
        });
      }
      if (p.sessionId === mySession) this.myPlayerId = key;
      hudPlayers.push({
        id: key,
        sessionId: (p.sessionId as string) ?? '',
        name: p.name as string,
        team,
        life: (p.life as string) ?? 'alive',
        respawnIn: (p.respawnIn as number) ?? 0,
        carrying: !!p.carrying,
        heldBall: (p.heldBall as string) ?? '',
        charge: (p.charge as number) ?? 0,
        hits: (p.hits as number) ?? 0,
        deaths: (p.deaths as number) ?? 0,
        captures: (p.captures as number) ?? 0,
        keuleReturns: (p.keuleReturns as number) ?? 0,
      });
    });

    const keules: { team: Team; state: string }[] = [];
    const keulesMap = state.keules as { forEach: (cb: (k: Record<string, unknown>, key: string) => void) => void };
    keulesMap.forEach((k, key) => {
      keules.push({ team: key === 'red' ? Team.Red : Team.Blue, state: (k.state as string) ?? 'SAFE' });
    });

    const lobby = {
      code: (state.code as string) ?? '',
      ownerSessionId: (state.ownerSessionId as string) ?? '',
      started: !!state.started,
      players: lobbyPlayers,
      settings: {
        teamSize: (state.teamSize as number) ?? 3,
        rounds: (state.rounds as number) ?? 3,
        roundDurationSec: (state.roundDurationSec as number) ?? 180,
        friendlyFire: !!state.friendlyFire,
        botDifficulty: (state.botDifficulty as RoomSettings['botDifficulty']) ?? DEFAULT_ROOM_SETTINGS.botDifficulty,
      },
    };

    const hud: NetHud = {
      phase: (state.phase as string) ?? 'LOBBY',
      round: (state.round as number) ?? 1,
      phaseTimer: (state.phaseTimer as number) ?? 0,
      scoreBlue: (state.scoreBlue as number) ?? 0,
      scoreRed: (state.scoreRed as number) ?? 0,
      lastRoundWinner: (state.lastRoundWinner as string) ?? '',
      lastRoundReason: (state.lastRoundReason as string) ?? '',
      matchWinner: (state.matchWinner as string) ?? '',
      mvpId: (state.mvpId as string) ?? '',
      mvpReason: (state.mvpReason as string) ?? '',
      keules,
      players: hudPlayers,
    };

    const nextStatus = state.started ? 'ingame' : 'lobby';
    store.set({ lobby, hud, status: store.status === 'error' ? 'error' : nextStatus });
  }

  // --- events → audio + hud feed ---

  private handleEvents(events: SimEvent[]) {
    const fx = useFxStore.getState();
    const hud = useNetStore.getState().hud;
    const name = (id: string | null) => hud?.players.find((p) => p.id === id)?.name ?? '—';
    for (const e of events) {
      switch (e.type) {
        case 'throw':
          audio.play('throw', 0.5 + e.power * 0.8);
          break;
        case 'bounce':
          audio.play(e.surface === 'floor' ? 'bounceWood' : 'bounceWall', e.speed / 12);
          break;
        case 'pickup':
          if (e.player === this.myPlayerId) audio.play('pickup');
          break;
        case 'hit':
          audio.play('hitPlayer');
          if (e.by === this.myPlayerId) fx.markHit();
          if (e.target === this.myPlayerId) fx.markHurt();
          break;
        case 'out':
          audio.play('out', 0.9);
          fx.pushFeed('out', `${name(e.by)} knocked out ${name(e.player)}`, '#ff6b6b');
          break;
        case 'respawn':
          if (e.player === this.myPlayerId) audio.play('respawn');
          break;
        case 'keule-pickup':
          audio.play('keulePickup');
          break;
        case 'keule-invalid':
          audio.play('keuleInvalid');
          fx.markInvalid();
          break;
        case 'capture':
          audio.play('capture');
          fx.pushFeed('capture', `${name(e.by)} scored a capture!`, '#f2c14e');
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
    }
  }
}

export const net = new NetworkManager();
