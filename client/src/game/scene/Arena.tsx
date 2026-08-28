import { RigidBody } from '@react-three/rapier';
import { ARENA, Team } from '@shared';
import { COLORS, teamColor } from '@/game/palette';

const L = ARENA.length;
const W = ARENA.width;
const H = ARENA.wallHeight;
const T = ARENA.wallThickness;
const EPS = 0.012; // floor-marking lift to avoid z-fighting

/** Painted line on the floor (decorative, no collider). */
function Line({
  x = 0,
  z = 0,
  w,
  d,
  color,
  y = EPS,
}: {
  x?: number;
  z?: number;
  w: number;
  d: number;
  color: string;
  y?: number;
}) {
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0} />
    </mesh>
  );
}

/** Tinted floor zone for a team's Keule area. */
function KeuleZone({ team }: { team: Team }) {
  const [x0, x1] = ARENA.keuleZoneX[team];
  const cx = (x0 + x1) / 2;
  const w = Math.abs(x1 - x0);
  const zoneW = W - 2 * ARENA.playableInset;
  return (
    <group>
      <mesh position={[cx, EPS * 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, zoneW]} />
        <meshStandardMaterial color={teamColor(team)} transparent opacity={0.16} roughness={1} />
      </mesh>
      {/* zone outline lines */}
      <Line x={x0} w={0.12} d={zoneW} color={teamColor(team)} />
      <Line x={x1} w={0.12} d={zoneW} color={teamColor(team)} />
    </group>
  );
}

/**
 * The Swiss sports-hall arena: warm wooden floor, perimeter walls, centre line,
 * per-team Keule zones, scoring lines and sideline out-benches. Built to
 * STYLEGUIDE colours; the painted court-lines are the recurring signature.
 */
export function Arena() {
  return (
    <group>
      {/* Floor (physics) */}
      <RigidBody type="fixed" colliders="cuboid" friction={0.9}>
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[L, 1, W]} />
          <meshStandardMaterial color={COLORS.floor} roughness={0.85} metalness={0} />
        </mesh>
      </RigidBody>

      {/* Court markings */}
      {/* outer boundary */}
      <Line w={L - 2 * ARENA.playableInset + 0.2} d={0.12} z={-(W / 2 - ARENA.playableInset)} color={COLORS.lineWhite} />
      <Line w={L - 2 * ARENA.playableInset + 0.2} d={0.12} z={W / 2 - ARENA.playableInset} color={COLORS.lineWhite} />
      <Line w={0.12} d={W - 2 * ARENA.playableInset + 0.2} x={-(L / 2 - ARENA.playableInset)} color={COLORS.lineWhite} />
      <Line w={0.12} d={W - 2 * ARENA.playableInset + 0.2} x={L / 2 - ARENA.playableInset} color={COLORS.lineWhite} />

      {/* centre line + centre circle */}
      <Line w={0.18} d={W - 2 * ARENA.playableInset} color={COLORS.courtYellow} />
      <mesh position={[0, EPS, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.58, 48]} />
        <meshStandardMaterial color={COLORS.courtYellow} roughness={0.8} />
      </mesh>

      {/* scoring lines (each team's own line) */}
      <Line x={ARENA.scoreLineX[Team.Blue]} w={0.16} d={W - 2 * ARENA.playableInset} color={COLORS.teamBlue} />
      <Line x={ARENA.scoreLineX[Team.Red]} w={0.16} d={W - 2 * ARENA.playableInset} color={COLORS.teamRed} />

      {/* Keule zones */}
      <KeuleZone team={Team.Blue} />
      <KeuleZone team={Team.Red} />

      {/* Perimeter walls (physics) */}
      <Walls />

      {/* Out-benches (decorative for now; players sit here when OUT) */}
      <Bench team={Team.Blue} />
      <Bench team={Team.Red} />
    </group>
  );
}

function Walls() {
  const half = 0.5;
  const zEdge = W / 2 + T / 2;
  const xEdge = L / 2 + T / 2;
  return (
    <RigidBody type="fixed" colliders="cuboid" restitution={0.55} friction={0.4}>
      {/* long walls (front/back along z) */}
      <mesh position={[0, H / 2 - half, -zEdge]} castShadow receiveShadow>
        <boxGeometry args={[L + 2 * T, H, T]} />
        <meshStandardMaterial color={COLORS.wall} roughness={0.9} />
      </mesh>
      <mesh position={[0, H / 2 - half, zEdge]} castShadow receiveShadow>
        <boxGeometry args={[L + 2 * T, H, T]} />
        <meshStandardMaterial color={COLORS.wall} roughness={0.9} />
      </mesh>
      {/* end walls (along x) */}
      <mesh position={[-xEdge, H / 2 - half, 0]} castShadow receiveShadow>
        <boxGeometry args={[T, H, W]} />
        <meshStandardMaterial color={COLORS.wall} roughness={0.9} />
      </mesh>
      <mesh position={[xEdge, H / 2 - half, 0]} castShadow receiveShadow>
        <boxGeometry args={[T, H, W]} />
        <meshStandardMaterial color={COLORS.wall} roughness={0.9} />
      </mesh>
    </RigidBody>
  );
}

function Bench({ team }: { team: Team }) {
  const z = ARENA.benchZ[team];
  const dir = team === Team.Blue ? -1 : 1;
  return (
    <group position={[dir * 5, 0, z]}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 0.5, 0.6]} />
        <meshStandardMaterial color={COLORS.woodDeep} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.6, -0.25]} castShadow>
        <boxGeometry args={[6, 0.7, 0.1]} />
        <meshStandardMaterial color={teamColor(team, true)} roughness={0.8} />
      </mesh>
    </group>
  );
}
