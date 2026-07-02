import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SpinningModelOverlayProps {
  targetObjectName: string;
}

// Define a type for the r3f canvas element
interface R3FCanvasElement extends HTMLCanvasElement {
  __r3f?: {
    scene: THREE.Scene;
  };
}

export function SpinningModelOverlay({ targetObjectName }: SpinningModelOverlayProps) {
  const { scene: modelScene } = useGLTF('/models/encava.glb');
  const modelRef = useRef<THREE.Group>(null);
  const targetObjectRef = useRef<THREE.Object3D | null>(null);
  
  // Find the target object in the scene
  useEffect(() => {
    const findTargetObject = () => {
      // Get the current scene
      const canvas = document.querySelector('canvas') as R3FCanvasElement | null;
      const scene = canvas?.__r3f?.scene;
      if (!scene) return null;
      
      // Find the target object
      let targetObject: THREE.Object3D | null = null;
      scene.traverse((object: THREE.Object3D) => {
        if (object.name === targetObjectName) {
          targetObject = object;
        }
      });
      
      if (targetObject) {
        console.log(`🎮 Found target object: ${targetObjectName}`);
        targetObjectRef.current = targetObject;
      } else {
        // Try again in a moment if not found
        setTimeout(findTargetObject, 500);
      }
    };
    
    findTargetObject();
  }, [targetObjectName]);
  
  // Position the model at specific coordinates
  useEffect(() => {
    if (modelRef.current) {
      // Set smaller scale (50% smaller than before)
      modelRef.current.scale.set(0.145, 0.145, 0.145);
      
      // Position at specific coordinates
      modelRef.current.position.set(-16.5, 2, 3.2);
    }
  }, [modelRef.current]);
  
  // Make the model spin
  useFrame((_, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 1.5; // Spin speed
    }
  });
  
  if (!modelScene) return null;
  
  return (
    <group ref={modelRef}>
      <primitive object={modelScene.clone()} />
    </group>
  );
}

// Preload the model
useGLTF.preload('/models/encava.glb');

export default SpinningModelOverlay; 