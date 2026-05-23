import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Preload, PerspectiveCamera } from '@react-three/drei';
import { useUIStore } from '@/store/useUIStore';
import { motion } from 'framer-motion-3d';
import * as THREE from 'three';

import HeroScene from './HeroScene';
import ScannerScene from './ScannerScene';

// Camera controller smoothly lerps camera between scene positions
const CameraController = () => {
  const currentScene = useUIStore((state) => state.currentScene);
  const { camera } = useThree();
  
  const targetPos = new THREE.Vector3();
  const targetLook = new THREE.Vector3();

  useFrame((state, delta) => {
    switch(currentScene) {
      case 'hero':
        targetPos.set(0, 0, 8);
        targetLook.set(0, 0, 0);
        break;
      case 'dashboard':
        targetPos.set(-5, 2, 5);
        targetLook.set(0, 0, 0);
        break;
      case 'lab':
        targetPos.set(0, 0, 3); // zoom in
        targetLook.set(0, 0, 0);
        break;
      case 'insights':
        targetPos.set(5, 5, 5);
        targetLook.set(0, 0, 0);
        break;
    }
    
    // Smooth transitions
    camera.position.lerp(targetPos, 2 * delta);
    // Basic lookAt lerp approximation for smooth rotational transitions
    const currentLookAt = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
    currentLookAt.lerp(targetLook, 2 * delta);
    camera.lookAt(currentLookAt);
  });

  return null;
};

export const MainCanvas = () => {
  return (
    <div className="fixed inset-0 w-full h-full z-0 bg-gradient-to-br from-[#020617] to-[#064e3b]">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
        <CameraController />
        
        {/* Core lighting and environment rendering */}
        <ambientLight intensity={0.2} />
        <Environment preset="city" />
        
        {/* Render 3D Scenes dynamically layered */}
        <HeroScene />
        <ScannerScene />
        
        <Preload all />
      </Canvas>
    </div>
  );
};

export default MainCanvas;
