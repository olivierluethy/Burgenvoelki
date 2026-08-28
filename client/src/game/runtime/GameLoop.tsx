import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { PLAYER, norm2, type Vec2 } from '@shared';
import { inputManager } from '@/game/input/inputManager';
import { useRuntime } from './RuntimeContext';

/**
 * Drives the fixed-timestep simulation each render frame and computes the
 * human's aim by raycasting the pointer onto a floor-height plane. Renders
 * nothing — it is the bridge between React's frame loop and the runtime.
 */
export function GameLoop() {
  const runtime = useRuntime();
  const { camera } = useThree();

  const ray = useMemo(() => new Raycaster(), []);
  const aimPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), -PLAYER.centerY), []);
  const hit = useMemo(() => new Vector3(), []);
  const ndc = useMemo(() => new Vector2(), []);

  useFrame((_, delta) => {
    // aim: pointer -> world point on the chest-height plane -> direction from player
    const body = runtime.getBody(runtime.state.humanId);
    if (body) {
      ndc.set(inputManager.pointer.x, -inputManager.pointer.z);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(aimPlane, hit)) {
        const t = body.translation();
        const dir: Vec2 = norm2({ x: hit.x - t.x, z: hit.z - t.z });
        if (dir.x !== 0 || dir.z !== 0) runtime.setHumanAim(dir);
      }
    }

    runtime.frame(delta);
  });

  return null;
}
