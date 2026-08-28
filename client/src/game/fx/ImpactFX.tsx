import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdditiveBlending, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import type { Vec3 } from '@shared';
import { useRuntime } from '@/game/runtime/RuntimeContext';
import { COLORS } from '@/game/palette';

interface Burst {
  id: number;
  pos: Vec3;
}

let uid = 0;

/** Short-lived pink impact burst spawned on ball-hits-player. */
function Burst({ pos, onDone }: { pos: Vec3; onDone: () => void }) {
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const life = useRef(0);
  const shards = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return { x: Math.cos(a), z: Math.sin(a), y: 0.4 + Math.random() * 0.6 };
      }),
    [],
  );

  useFrame((_, dt) => {
    life.current += dt;
    const t = life.current / 0.45;
    if (t >= 1) {
      onDone();
      return;
    }
    if (group.current) {
      group.current.children.forEach((c, i) => {
        if (i === 0) return;
        const s = shards[i - 1];
        const d = t * 1.6;
        c.position.set(s.x * d, s.y * (1 - t) + 0.1, s.z * d);
        c.scale.setScalar(1 - t);
      });
    }
    if (ring.current) {
      const s = 0.3 + t * 2.2;
      ring.current.scale.set(s, s, s);
      (ring.current.material as MeshBasicMaterial).opacity = (1 - t) * 0.8;
    }
  });

  return (
    <group ref={group} position={[pos.x, pos.y, pos.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.28, 24]} />
        <meshBasicMaterial color={COLORS.ballPinkGlow} transparent blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      {shards.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color={COLORS.ballPink} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Listens for hit events and renders transient bursts. */
export function ImpactFX() {
  const runtime = useRuntime();
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    return runtime.onEvent((e) => {
      if (e.type === 'hit') {
        setBursts((b) => [...b, { id: ++uid, pos: e.at }].slice(-12));
      }
    });
  }, [runtime]);

  const remove = (id: number) => setBursts((b) => b.filter((x) => x.id !== id));

  return (
    <>
      {bursts.map((b) => (
        <Burst key={b.id} pos={b.pos} onDone={() => remove(b.id)} />
      ))}
    </>
  );
}
