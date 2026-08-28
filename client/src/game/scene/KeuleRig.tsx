import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { KEULE, KeuleState, Team } from '@shared';
import { useRuntime } from '@/game/runtime/RuntimeContext';
import { COLORS, teamColor } from '@/game/palette';

/**
 * The Keule objective for one team. Purely visual — its authoritative position
 * lives in GameState (safe at home, carried by a player, or dropped). Glows
 * warning/danger when displaced so it reads across the hall.
 */
export function KeuleRig({ team }: { team: Team }) {
  const runtime = useRuntime();
  const group = useRef<Group>(null);
  const glow = useRef<Mesh>(null);

  useFrame(() => {
    const k = runtime.state.keules[team];
    if (group.current) {
      group.current.position.set(k.position.x, k.position.y - KEULE.height / 2, k.position.z);
    }
    if (glow.current) {
      const mat = glow.current.material as MeshStandardMaterial;
      const displaced = k.state !== KeuleState.Safe;
      mat.emissiveIntensity = displaced ? 0.9 : 0.25;
      mat.emissive.set(
        k.state === KeuleState.Carried ? COLORS.teamRed : k.state === KeuleState.Dropped ? COLORS.courtYellow : teamColor(team),
      );
    }
  });

  const color = teamColor(team);
  const deep = teamColor(team, true);

  return (
    <group ref={group}>
      {/* base */}
      <mesh ref={glow} position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.28, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.5} />
      </mesh>
      {/* neck */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, 0.34, 16]} />
        <meshStandardMaterial color={deep} roughness={0.5} />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.64, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      {/* painted ring */}
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[0.1, 0.02, 8, 20]} />
        <meshStandardMaterial color={COLORS.textHi} />
      </mesh>
      {/* ground marker */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.36, 28]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
