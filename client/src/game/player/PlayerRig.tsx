import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Group } from 'three';
import { PLAYER, PlayerLifeState, getCosmetic, type PlayerId } from '@shared';
import { useRuntime } from '@/game/runtime/RuntimeContext';
import { useProfileStore } from '@/state/profileStore';
import { COLORS, teamColor } from '@/game/palette';

function isVisible(id: string | undefined): boolean {
  return !!id && !id.endsWith('_none');
}

const CYL_HALF = (PLAYER.height - 2 * PLAYER.radius) / 2; // capsule cylinder half-length

/**
 * One player's physics body + stylized capsule avatar. Registers its Rapier
 * body with the runtime so the central sim loop can drive it; renders an aim
 * wedge that tracks the player's facing.
 */
export function PlayerRig({ id }: { id: PlayerId }) {
  const runtime = useRuntime();
  const bodyRef = useRef<RapierRigidBody>(null);
  const aimRef = useRef<Group>(null);
  const player = runtime.state.players[id];
  const isHuman = id === runtime.state.humanId;
  const equipped = useProfileStore((s) => s.profile.equipped);
  const outfit = isHuman ? getCosmetic(equipped.outfit) : undefined;
  const hat = isHuman ? getCosmetic(equipped.hat) : undefined;

  useEffect(() => {
    if (bodyRef.current) runtime.registerBody(id, bodyRef.current);
    return () => runtime.unregisterBody(id);
  }, [id, runtime]);

  useFrame(() => {
    const p = runtime.state.players[id];
    if (aimRef.current) {
      aimRef.current.rotation.y = Math.atan2(p.aim.x, p.aim.z);
      aimRef.current.visible = p.life === PlayerLifeState.Alive;
    }
  });

  const color = teamColor(player.team);
  const deep = teamColor(player.team, true);

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={[player.position.x, player.position.y, player.position.z]}
      enabledRotations={[false, false, false]}
      linearDamping={0.05}
      friction={0.2}
      mass={1.2}
      canSleep={false}
    >
      <CapsuleCollider args={[CYL_HALF, PLAYER.radius]} />

      {/* body */}
      <mesh castShadow>
        <capsuleGeometry args={[PLAYER.radius, CYL_HALF * 2, 8, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          metalness={0.05}
          emissive={isHuman ? color : '#000000'}
          emissiveIntensity={isHuman ? 0.25 : 0}
        />
      </mesh>

      {/* head band — deep team tone, or the human's equipped outfit accent */}
      <mesh position={[0, CYL_HALF + PLAYER.radius * 0.2, 0]} castShadow>
        <cylinderGeometry args={[PLAYER.radius * 0.72, PLAYER.radius * 0.72, 0.16, 16]} />
        <meshStandardMaterial color={outfit ? outfit.colors[0] : deep} roughness={0.6} />
      </mesh>

      {/* human's equipped hat */}
      {isHuman && isVisible(equipped.hat) && hat && (
        <mesh position={[0, CYL_HALF + PLAYER.radius * 0.5, 0]} castShadow>
          <cylinderGeometry args={[PLAYER.radius * 0.5, PLAYER.radius * 0.62, 0.18, 16]} />
          <meshStandardMaterial color={hat.colors[0]} roughness={0.5} emissive={hat.colors[0]} emissiveIntensity={0.1} />
        </mesh>
      )}

      {/* aim wedge (points along facing) */}
      <group ref={aimRef} position={[0, -CYL_HALF - PLAYER.radius + 0.02, 0]}>
        <mesh position={[0, 0, PLAYER.radius + 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.16, 0.5, 3]} />
          <meshStandardMaterial color={isHuman ? COLORS.textHi : color} />
        </mesh>
      </group>

      {/* ground ring: bright for the human, subtle for others */}
      <mesh position={[0, -CYL_HALF - PLAYER.radius + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PLAYER.radius + 0.05, PLAYER.radius + 0.16, 32]} />
        <meshStandardMaterial color={isHuman ? COLORS.textHi : color} transparent opacity={isHuman ? 0.9 : 0.4} />
      </mesh>
    </RigidBody>
  );
}
