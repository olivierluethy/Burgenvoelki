import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody } from '@react-three/rapier';
import { useUIStore } from '@/state/uiStore';
import { Button } from '@/ui/primitives';
import { PHYSICS } from '@shared';

/**
 * M0 game shell: proves the R3F + Rapier stack renders and simulates against a
 * warm-dark arena backdrop. The real arena, player, camera and game loop are
 * built in M1+ and replace this scene's contents.
 */
export function GameScreen() {
  const go = useUIStore((s) => s.go);

  return (
    <div className="relative h-full w-full bg-bg-850">
      <Canvas shadows camera={{ position: [0, 13, 16], fov: 45 }}>
        <color attach="background" args={['#1a160f']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 16, 8]} intensity={1.1} castShadow />

        <Physics gravity={[PHYSICS.gravity.x, PHYSICS.gravity.y, PHYSICS.gravity.z]}>
          {/* floor */}
          <RigidBody type="fixed" colliders="cuboid">
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[30, 18]} />
              <meshStandardMaterial color="#c98f52" />
            </mesh>
          </RigidBody>

          {/* a few test balls to confirm gravity + bounce */}
          {[-2, 0, 2].map((x) => (
            <RigidBody key={x} colliders="ball" position={[x, 6, 0]} restitution={0.62} friction={0.7}>
              <mesh castShadow>
                <sphereGeometry args={[0.18, 24, 24]} />
                <meshStandardMaterial color="#ff3e9c" />
              </mesh>
            </RigidBody>
          ))}
        </Physics>
      </Canvas>

      <div className="pointer-events-none absolute inset-0 p-4">
        <div className="pointer-events-auto flex items-center justify-between">
          <span className="eyebrow rounded-md bg-bg-800/80 px-3 py-2">Arena · M0 physics check</span>
          <Button variant="ghost" onClick={() => go('menu')}>
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
}
