import { BallCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useRef } from 'react';
import { BALL, len3, type BallId } from '@shared';
import { useRuntime } from '@/game/runtime/RuntimeContext';
import { COLORS } from '@/game/palette';

/**
 * One pooled pink rubber ball: a Rapier body the runtime switches between
 * dynamic (idle/thrown) and kinematic (held). Reports fast collisions back to
 * the runtime for bounce SFX/FX.
 */
export function BallRig({ id }: { id: BallId }) {
  const runtime = useRuntime();
  const bodyRef = useRef<RapierRigidBody>(null);
  const lastBounce = useRef(0);
  const start = runtime.state.balls[id].position;

  useEffect(() => {
    if (bodyRef.current) runtime.registerBallBody(id, bodyRef.current);
    return () => runtime.unregisterBallBody(id);
  }, [id, runtime]);

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={[start.x, start.y, start.z]}
      restitution={BALL.restitution}
      friction={BALL.friction}
      linearDamping={BALL.linearDamping}
      angularDamping={0.3}
      ccd
      onCollisionEnter={({ target }) => {
        const body = bodyRef.current;
        if (!body) return;
        const now = performance.now();
        if (now - lastBounce.current < 90) return; // debounce
        const v = body.linvel();
        const speed = len3(v);
        if (speed < 2.2) return;
        lastBounce.current = now;
        const t = body.translation();
        const surface = t.y < 0.35 ? 'floor' : 'wall';
        runtime.reportBounce(id, { x: t.x, y: t.y, z: t.z }, speed, surface);
        void target;
      }}
    >
      <BallCollider args={[BALL.radius]} />
      <mesh castShadow>
        <sphereGeometry args={[BALL.radius, 20, 20]} />
        <meshStandardMaterial
          color={COLORS.ballPink}
          roughness={0.4}
          metalness={0.05}
          emissive={COLORS.ballPink}
          emissiveIntensity={0.18}
        />
      </mesh>
    </RigidBody>
  );
}
