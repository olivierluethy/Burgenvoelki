# Online Burgenvölki

A browser-based 3D team game inspired by the Swiss gym-hall game **Burgenvölki /
Völk** — dodgeball meets capture-the-flag in a physics-driven sports hall. Knock
out the other team with pink rubber balls, steal their **Keule**, and carry it
home across your line to win the round.

Built as a pnpm monorepo with a clean split between game rules and rendering, so
the authoritative multiplayer server runs the exact same simulation as the
client.

## Stack

- **client/** — React + TypeScript + Vite + Tailwind, Three.js via React Three
  Fiber, Rapier physics, Zustand state.
- **shared/** — the deterministic game rules: types, config, fixed-timestep sim,
  ball/Keule/match logic, nav grid + A*, AI, progression, content, and a
  Rapier-free headless simulation for the server.
- **server/** — authoritative Colyseus room running the shared headless sim.

## Setup

```bash
pnpm install
```

## Run

**Singleplayer** (no server needed):

```bash
pnpm dev            # client on http://localhost:5173
```

Open the site → **Play singleplayer** → pick difficulty and team size → play.

**Multiplayer** (two terminals):

```bash
pnpm server:dev     # authoritative server on ws://localhost:2567
pnpm dev            # client on http://localhost:5173
```

Open the site → **Play online**. Create a room and share the 5-char code, have a
second browser/tab **Join by code**, or use **Quick match**. Empty slots are
filled by bots. Override the server URL with `VITE_SERVER_URL` if needed.

## Controls

WASD move · mouse aim · left-click throw (hold to charge) · `E` pick up / grab
Keule · `Shift` sprint · `Space` dodge-dash · `Esc` menu.

## Scripts

- `pnpm dev` — run the client
- `pnpm server:dev` — run the multiplayer server
- `pnpm build` — production build of the client
- `pnpm typecheck` — typecheck all packages

## Design

The visual system is locked in [`docs/STYLEGUIDE.md`](docs/STYLEGUIDE.md) — Swiss
International Typographic Style meets arcade sports, over a warm-dark arena with
team blue/red, ball pink, gym-wood accents and the painted court-line motif.
