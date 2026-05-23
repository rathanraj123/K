import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useUIStore } from '@/store/useUIStore';
import * as THREE from 'three';
import { Wireframe } from '@react-three/drei';

export const ScannerScene = () => {
  const isScanning = useUIStore((state) => state.isScanning);
  const currentScene = useUIStore((state) => state.currentScene);
  const scanGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (scanGroupRef.current) {
        scanGroupRef.current.rotation.y += delta * 0.5;
    }
    if (ringRef.current && isScanning) {
        // Move scanner ring up and down
        ringRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 1.5;
    }
  });

  if (currentScene !== 'lab') return null;

  return (
    <group position={[0, -0.5, 0]}>
      {/* Target Pedestal */}
      <mesh position={[0, -1, 0]}>
        <cylinderGeometry args={[2, 2.5, 0.2, 32]} />
        <meshStandardMaterial color="#020617" emissive="#064e3b" emissiveIntensity={0.5} opacity={0.8} transparent />
      </mesh>

      {/* Holographic scanning object representing the leaf/crop */}
      <group ref={scanGroupRef} position={[0, 0.5, 0]}>
        <mesh>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial 
            color="#4ade80" 
            wireframe={true} 
            transparent 
            opacity={isScanning ? 0.8 : 0.2}
            side={THREE.DoubleSide} 
          />
        </mesh>
      </group>

      {/* Animated Scanner Ring */}
      {isScanning && (
        <mesh ref={ringRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.5, 0.05, 16, 100]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.9} />
          {/* Light emission from scanner */}
          <pointLight color="#10b981" intensity={2} distance={3} />
        </mesh>
      )}

      {/* Grid Floor */}
      <gridHelper args={[10, 10, '#047857', '#022c22']} position={[0, -0.9, 0]} />
    </group>
  );
};

export default ScannerScene;
