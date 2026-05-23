import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll, TransformControls, Float, Sparkles, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export const HeroScene = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Subtle continuous rotation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#4ade80" />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#064e3b" />
      

    </group>
  );
};

export default HeroScene;
