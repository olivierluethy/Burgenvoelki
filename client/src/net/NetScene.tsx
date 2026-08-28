import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Group, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { BALL, CAMERA, KEULE, PLAYER, Team, damp, norm2, neutralInput, type Vec2 } from '@shared';
import { inputManager } from '@/game/input/inputManager';
import { net } from '@/net/NetworkManager';
import { useNetStore } from '@/net/netStore';
import { COLORS, teamColor } from '@/game/palette';

const CYL_HALF = (PLAYER.height - 2 * PLAYER.radius) / 2;

function getState(): Record<string, { get: (k: string) => Record<string, number | string | boolean> | undefined } & { forEach?: (cb: (v: unknown, k: string) => void) => void }> | null {
  const st = net.current?.state as unknown;
  return (st as never) ?? null;
}

/** One interpolated remote/local player. */
function NetPlayer({ id, localPosRef }: { id: string; localPosRef: MutableRefObject<Vector3> }) {
  const group = useRef<Group>(null);
  const aim = useRef<Group>(null);
  const isLocal = id === net.myPlayerId;
  const hud = useNetStore.getState().hud;
  const team = hud?.players.find((p) => p.id === id)?.team ?? Team.Blue;
  const color = teamColor(team);

  useFrame((_, dt) => {
    const st = getState();
    const p = st?.players?.get(id) as Record<string, number | string> | undefined;
    if (!p || !group.current) return;
    const tx = p.x as number;
    const ty = p.y as number;
    const tz = p.z as number;
    const g = group.current;
    g.position.x = damp(g.position.x, tx, 14, dt);
    g.position.y = damp(g.position.y, ty, 14, dt);
    g.position.z = damp(g.position.z, tz, 14, dt);
    g.visible = (p.life as string) !== 'out' ? true : true;
    if (aim.current) aim.current.rotation.y = Math.atan2(p.aimX as number, p.aimZ as number);
    if (isLocal) localPosRef.current.copy(g.position);
  });

  return (
    <group ref={group}>
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[PLAYER.radius, CYL_HALF * 2, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.55} emissive={isLocal ? color : '#000'} emissiveIntensity={isLocal ? 0.25 : 0} />
      </mesh>
      <group ref={aim} position={[0, -CYL_HALF - PLAYER.radius + 0.02, 0]}>
        <mesh position={[0, 0, PLAYER.radius + 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.16, 0.5, 3]} />
          <meshStandardMaterial color={isLocal ? COLORS.textHi : color} />
        </mesh>
      </group>
      <mesh position={[0, -CYL_HALF - PLAYER.radius + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PLAYER.radius + 0.05, PLAYER.radius + 0.16, 24]} />
        <meshStandardMaterial color={isLocal ? COLORS.textHi : color} transparent opacity={isLocal ? 0.9 : 0.4} />
      </mesh>
    </group>
  );
}

function NetBall({ id }: { id: string }) {
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    const st = getState();
    const b = st?.balls?.get(id) as Record<string, number | string> | undefined;
    if (!b || !group.current) return;
    group.current.position.x = damp(group.current.position.x, b.x as number, 16, dt);
    group.current.position.y = damp(group.current.position.y, b.y as number, 16, dt);
    group.current.position.z = damp(group.current.position.z, b.z as number, 16, dt);
  });
  return (
    <group ref={group}>
      <mesh castShadow>
        <sphereGeometry args={[BALL.radius, 18, 18]} />
        <meshStandardMaterial color={COLORS.ballPink} roughness={0.4} emissive={COLORS.ballPink} emissiveIntensity={0.18} />
      </mesh>
    </group>
  );
}

function NetKeule({ team }: { team: Team }) {
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    const st = getState();
    const k = st?.keules?.get(team) as Record<string, number | string> | undefined;
    if (!k || !group.current) return;
    group.current.position.x = damp(group.current.position.x, k.x as number, 16, dt);
    group.current.position.y = damp(group.current.position.y, (k.y as number) - KEULE.height / 2, 16, dt);
    group.current.position.z = damp(group.current.position.z, k.z as number, 16, dt);
  });
  const color = teamColor(team);
  return (
    <group ref={group}>
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.28, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 0.5, 14]} />
        <meshStandardMaterial color={teamColor(team, true)} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.12, 14, 14]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function FollowCam({ localPosRef }: { localPosRef: MutableRefObject<Vector3> }) {
  const { camera } = useThree();
  const look = useRef(new Vector3());
  useFrame((_, dt) => {
    const t = localPosRef.current;
    camera.position.x = damp(camera.position.x, t.x + CAMERA.offset.x, 6.5, dt);
    camera.position.y = damp(camera.position.y, t.y + CAMERA.offset.y, 6.5, dt);
    camera.position.z = damp(camera.position.z, t.z + CAMERA.offset.z, 6.5, dt);
    look.current.set(
      damp(look.current.x, t.x, 6.5, dt),
      damp(look.current.y, t.y + CAMERA.lookAheadY, 6.5, dt),
      damp(look.current.z, t.z, 6.5, dt),
    );
    camera.lookAt(look.current);
  });
  return null;
}

/** Reads pointer aim and streams local input to the server each frame. */
function InputSender({ localPosRef }: { localPosRef: MutableRefObject<Vector3> }) {
  const { camera } = useThree();
  const ray = useMemo(() => new Raycaster(), []);
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), -PLAYER.centerY), []);
  const hit = useMemo(() => new Vector3(), []);
  const ndc = useMemo(() => new Vector2(), []);

  useFrame(() => {
    const input = neutralInput();
    input.move = inputManager.moveVector();
    input.sprint = inputManager.sprint();
    input.throwHeld = inputManager.throwHeld();
    input.dash = inputManager.consumeDash();
    input.interact = inputManager.consumeInteract();
    input.throwRelease = inputManager.consumeThrowRelease();

    ndc.set(inputManager.pointer.x, -inputManager.pointer.z);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      const t = localPosRef.current;
      const dir: Vec2 = norm2({ x: hit.x - t.x, z: hit.z - t.z });
      if (dir.x !== 0 || dir.z !== 0) input.aim = dir;
    }
    net.sendInput(input);
  });
  return null;
}

/** The networked scene: interpolated entities driven by authoritative state. */
export function NetScene() {
  const players = useNetStore((s) => s.hud?.players ?? []);
  const localPosRef = useRef(new Vector3(0, PLAYER.centerY, 0));
  const [ballIds, setBallIds] = useState<string[]>([]);

  useEffect(() => {
    const st = getState();
    const ids: string[] = [];
    st?.balls?.forEach?.((_v, k) => ids.push(k as string));
    setBallIds(ids);
  }, [players.length]);

  return (
    <>
      {players.map((p) => (
        <NetPlayer key={p.id} id={p.id} localPosRef={localPosRef} />
      ))}
      {ballIds.map((id) => (
        <NetBall key={id} id={id} />
      ))}
      <NetKeule team={Team.Blue} />
      <NetKeule team={Team.Red} />
      <FollowCam localPosRef={localPosRef} />
      <InputSender localPosRef={localPosRef} />
    </>
  );
}
