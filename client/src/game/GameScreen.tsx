import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { useEffect, useState } from 'react';
import { CAMERA, PHYSICS, TICK_DT } from '@shared';
import { useUIStore } from '@/state/uiStore';
import { inputManager } from '@/game/input/inputManager';
import { GameRuntime } from '@/game/runtime/GameRuntime';
import { ProvideRuntime } from '@/game/runtime/RuntimeContext';
import { GameLoop } from '@/game/runtime/GameLoop';
import { FollowCamera } from '@/game/camera/FollowCamera';
import { Arena } from '@/game/scene/Arena';
import { Lighting } from '@/game/scene/Lighting';
import { PlayerRig } from '@/game/player/PlayerRig';
import { HUD } from '@/game/hud/HUD';
import { PauseOverlay } from '@/game/hud/PauseOverlay';

/** In-canvas scene: everything that lives inside the R3F reconciler. */
function Scene({ runtime }: { runtime: GameRuntime }) {
  return (
    <ProvideRuntime runtime={runtime}>
      <color attach="background" args={['#1a160f']} />
      <fog attach="fog" args={['#1a160f', 34, 62]} />
      <Lighting />
      <Physics gravity={[PHYSICS.gravity.x, PHYSICS.gravity.y, PHYSICS.gravity.z]} timeStep={TICK_DT}>
        <Arena />
        {Object.keys(runtime.state.players).map((id) => (
          <PlayerRig key={id} id={id} />
        ))}
      </Physics>
      <FollowCamera />
      <GameLoop />
    </ProvideRuntime>
  );
}

/** Hosts a full match: builds the runtime, wires input, renders scene + HUD. */
export function GameScreen() {
  const config = useUIStore((s) => s.matchConfig);
  const go = useUIStore((s) => s.go);
  const [runtime] = useState(() => new GameRuntime(config));
  const [paused, setPaused] = useState(false);

  // input lifecycle
  useEffect(() => {
    inputManager.attach();
    return () => {
      inputManager.detach();
      runtime.dispose();
    };
  }, [runtime]);

  // Esc toggles the pause overlay and halts the sim
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setPaused((p) => {
          const next = !p;
          runtime.paused = next;
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runtime]);

  const resume = () => {
    runtime.paused = false;
    setPaused(false);
  };
  const leave = () => {
    runtime.paused = false;
    go('menu');
  };

  return (
    <div className="relative h-full w-full bg-bg-850">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [CAMERA.offset.x, CAMERA.offset.y, CAMERA.offset.z], fov: CAMERA.fov }}
      >
        <Scene runtime={runtime} />
      </Canvas>

      <HUD onPause={() => { runtime.paused = true; setPaused(true); }} />
      {paused && <PauseOverlay onResume={resume} onLeave={leave} />}
    </div>
  );
}
