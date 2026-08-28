import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import { CAMERA, damp } from '@shared';
import { useUIStore } from '@/state/uiStore';
import { useRuntime } from '@/game/runtime/RuntimeContext';

/**
 * Fixed-angle third-person follow camera (STYLEGUIDE / plan): elevated and
 * slightly behind, smooth follow, minimal configurable shake. It never rotates
 * with the player, so enemies, balls and the Keule stay clearly readable.
 */
export function FollowCamera() {
  const runtime = useRuntime();
  const { camera } = useThree();
  const shakeSetting = useUIStore((s) => s.settings.cameraShake);

  const target = useRef(new Vector3(0, 0, 0));
  const look = useRef(new Vector3(0, 0, 0));
  const shake = useRef(0);

  useFrame((_, delta) => {
    const body = runtime.getBody(runtime.state.humanId);
    if (!body) return;
    const t = body.translation();

    // desired camera position and look-at
    const dx = t.x + CAMERA.offset.x;
    const dy = t.y + CAMERA.offset.y;
    const dz = t.z + CAMERA.offset.z;

    const lambda = 6.5;
    target.current.set(
      damp(camera.position.x, dx, lambda, delta),
      damp(camera.position.y, dy, lambda, delta),
      damp(camera.position.z, dz, lambda, delta),
    );

    // decaying shake
    shake.current = Math.max(0, shake.current - delta * 2.4);
    const amp = shake.current * shakeSetting * 0.35;
    if (amp > 0) {
      target.current.x += (Math.random() - 0.5) * amp;
      target.current.y += (Math.random() - 0.5) * amp;
    }

    camera.position.copy(target.current);
    look.current.set(
      damp(look.current.x, t.x, lambda, delta),
      damp(look.current.y, t.y + CAMERA.lookAheadY, lambda, delta),
      damp(look.current.z, t.z, lambda, delta),
    );
    camera.lookAt(look.current);

    // FX-requested shake pulses (from M2 hits / M3 captures)
    const pending = runtime.consumeCameraShake();
    if (pending > 0) shake.current = Math.min(1.5, shake.current + pending);
  });

  return null;
}
