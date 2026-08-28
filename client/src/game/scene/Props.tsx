import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { arenaProps, type PropDef } from '@shared';
import { COLORS } from '@/game/palette';

/**
 * Physics-backed gym equipment: blocks movement, sight and balls and serves as
 * cover. Footprints come from the shared prop layout, so colliders, the nav
 * grid and the AI all agree on where cover is.
 */
export function Props() {
  const props = arenaProps();
  return (
    <group>
      {props.map((p) => (
        <Prop key={p.id} p={p} />
      ))}
    </group>
  );
}

function Prop({ p }: { p: PropDef }) {
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={[p.x, 0, p.z]}
      rotation={[0, p.rot ?? 0, 0]}
      restitution={0.4}
      friction={0.7}
    >
      <CuboidCollider args={[p.w / 2, p.h / 2, p.d / 2]} position={[0, p.h / 2, 0]} />
      <PropMesh p={p} />
    </RigidBody>
  );
}

function PropMesh({ p }: { p: PropDef }) {
  switch (p.kind) {
    case 'goal':
      return <Goal p={p} />;
    case 'crashmat':
      return (
        <group>
          <mesh position={[0, p.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[p.w, p.h, p.d]} />
            <meshStandardMaterial color={COLORS.propMat} roughness={0.95} />
          </mesh>
          <mesh position={[0, p.h + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[p.w - 0.1, p.d - 0.1]} />
            <meshStandardMaterial color={COLORS.propMatTop} roughness={1} />
          </mesh>
        </group>
      );
    case 'tower':
      return (
        <group>
          <mesh position={[0, p.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[p.w, p.h, p.d]} />
            <meshStandardMaterial color={COLORS.propTower} roughness={0.85} />
          </mesh>
          {/* plank seams */}
          <mesh position={[0, p.h * 0.66, p.d / 2 + 0.002]}>
            <planeGeometry args={[p.w, 0.06]} />
            <meshStandardMaterial color={COLORS.woodDeep} />
          </mesh>
          <mesh position={[0, p.h * 0.33, p.d / 2 + 0.002]}>
            <planeGeometry args={[p.w, 0.06]} />
            <meshStandardMaterial color={COLORS.woodDeep} />
          </mesh>
        </group>
      );
    default: {
      const color =
        p.kind === 'wall' ? COLORS.propWall : p.kind === 'barrier' ? COLORS.propBarrier : COLORS.propBox;
      return (
        <mesh position={[0, p.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[p.w, p.h, p.d]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      );
    }
  }
}

function Goal({ p }: { p: PropDef }) {
  const postR = 0.06;
  const half = p.w / 2;
  return (
    <group>
      <mesh position={[-half, p.h / 2, 0]} castShadow>
        <cylinderGeometry args={[postR, postR, p.h, 10]} />
        <meshStandardMaterial color={COLORS.propMetal} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[half, p.h / 2, 0]} castShadow>
        <cylinderGeometry args={[postR, postR, p.h, 10]} />
        <meshStandardMaterial color={COLORS.propMetal} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, p.h - postR, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[postR, postR, p.w, 10]} />
        <meshStandardMaterial color={COLORS.propMetal} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* net */}
      <mesh position={[0, p.h / 2, -0.15]}>
        <planeGeometry args={[p.w, p.h]} />
        <meshStandardMaterial color={COLORS.propMetal} transparent opacity={0.12} side={2} />
      </mesh>
    </group>
  );
}
