import { ARENA } from '@shared';

/** Bright, even gym-hall lighting with a soft key for readable shadows. */
export function Lighting() {
  return (
    <group>
      <hemisphereLight args={['#fff3df', '#5a4a34', 0.75]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[10, 22, 12]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-ARENA.length / 1.6}
        shadow-camera-right={ARENA.length / 1.6}
        shadow-camera-top={ARENA.width}
        shadow-camera-bottom={-ARENA.width}
        shadow-bias={-0.0004}
      />
      {/* subtle cool fill from the opposite side */}
      <directionalLight position={[-12, 10, -8]} intensity={0.25} color="#bcd4ff" />
    </group>
  );
}
