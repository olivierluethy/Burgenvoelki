import { Canvas } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { getCosmetic } from '@shared';
import { COLORS } from '@/game/palette';

function isVisible(id: string | undefined): boolean {
  return !!id && !id.endsWith('_none');
}

function Mannequin({ outfit, hat }: { outfit?: string; hat?: string }) {
  const g = useRef<Group>(null);
  const outfitC = outfit ? getCosmetic(outfit)?.colors ?? [COLORS.woodLight, COLORS.wood] : [COLORS.woodLight, COLORS.wood];
  const hatC = hat ? getCosmetic(hat)?.colors ?? null : null;

  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.6;
  });

  return (
    <group ref={g}>
      {/* body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.42, 0.9, 8, 20]} />
        <meshStandardMaterial color={COLORS.bg850} roughness={0.6} />
      </mesh>
      {/* accent chest band (outfit primary) */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.28, 20]} />
        <meshStandardMaterial color={outfitC[0]} roughness={0.5} emissive={outfitC[0]} emissiveIntensity={0.15} />
      </mesh>
      {/* shoulders accent (outfit secondary) */}
      <mesh position={[0, 1.28, 0]}>
        <cylinderGeometry args={[0.4, 0.44, 0.14, 20]} />
        <meshStandardMaterial color={outfitC[1]} roughness={0.5} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshStandardMaterial color={COLORS.textHi} roughness={0.55} />
      </mesh>
      {/* hat */}
      {isVisible(hat) && hatC && (
        <mesh position={[0, 1.86, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.26, 0.18, 18]} />
          <meshStandardMaterial color={hatC[0]} roughness={0.5} emissive={hatC[0]} emissiveIntensity={0.1} />
        </mesh>
      )}
      {/* base ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.7, 32]} />
        <meshBasicMaterial color={outfitC[0]} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

/** Live rotating character preview reflecting the equipped cosmetics. */
export function CharacterPreview({
  outfit,
  hat,
  className = '',
}: {
  outfit?: string;
  hat?: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-lg bg-bg-850 ${className}`}>
      <Canvas shadows camera={{ position: [0, 1.4, 3.4], fov: 42 }}>
        <color attach="background" args={['#1a160f']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 6, 4]} intensity={1.1} castShadow />
        <directionalLight position={[-3, 3, -2]} intensity={0.3} color="#bcd4ff" />
        <Mannequin outfit={outfit} hat={hat} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <circleGeometry args={[1.3, 40]} />
          <meshStandardMaterial color={COLORS.floor} roughness={0.9} />
        </mesh>
      </Canvas>
    </div>
  );
}
