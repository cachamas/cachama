import { DetectGPU } from '@react-three/drei';
import * as THREE from 'three';

export interface QualitySettings {
  frustumCulling: boolean;
  instanceMerging: boolean;
  distanceCulling: number;
  shadowMapSize: number;
  maxLights: number;
  textureQuality: number;
  maxAnisotropy: number;
}

class PerformanceManager {
  private static instance: PerformanceManager;
  private gpuTier: number = 1;
  private settings: QualitySettings;
  private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private objectsToMerge: Map<string, THREE.Mesh[]> = new Map();

  private constructor() {
    this.settings = this.getDefaultSettings();
  }

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  private getDefaultSettings(): QualitySettings {
    return {
      frustumCulling: true,
      instanceMerging: true,
      distanceCulling: 500,
      shadowMapSize: 1024,
      maxLights: 3,
      textureQuality: 0.75,
      maxAnisotropy: 2
    };
  }

  async initializeGPUTier() {
    try {
      // Create a temporary scene for GPU detection
      const tempScene = new THREE.Scene();
      const tempCamera = new THREE.PerspectiveCamera();
      const tempRenderer = new THREE.WebGLRenderer({ antialias: true });
      
      // Add some basic objects to the scene for detection
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      tempScene.add(mesh);
      
      // Perform GPU detection with a timeout
      const gpuTier = await Promise.race([
        DetectGPU(tempRenderer),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('GPU detection timeout')), 1000)
        )
      ]);
      
      // Clean up temporary objects
      tempScene.remove(mesh);
      geometry.dispose();
      material.dispose();
      tempRenderer.dispose();
      
      // Update settings based on GPU tier
      this.gpuTier = gpuTier.tier;
      this.updateSettingsForGPUTier();
    } catch (error) {
      console.warn('GPU detection failed, using default low settings:', error);
      this.gpuTier = 0;
      this.updateSettingsForGPUTier();
    }
  }

  private updateSettingsForGPUTier() {
    switch (this.gpuTier) {
      case 3: // High-end GPU
        this.settings = {
          frustumCulling: true,
          instanceMerging: true,
          distanceCulling: 1500,
          shadowMapSize: 2048,
          maxLights: 6,
          textureQuality: 1,
          maxAnisotropy: 8
        };
        break;
      case 2: // Mid-range GPU
        this.settings = {
          frustumCulling: true,
          instanceMerging: true,
          distanceCulling: 1000,
          shadowMapSize: 1024,
          maxLights: 4,
          textureQuality: 0.5,
          maxAnisotropy: 4
        };
        break;
      case 1: // Low-end GPU
        this.settings = {
          frustumCulling: true,
          instanceMerging: true,
          distanceCulling: 500,
          shadowMapSize: 512,
          maxLights: 2,
          textureQuality: 0.25,
          maxAnisotropy: 2
        };
        break;
      default: // Fallback for very low-end or unknown
        this.settings = {
          frustumCulling: true,
          instanceMerging: false,
          distanceCulling: 250,
          shadowMapSize: 256,
          maxLights: 1,
          textureQuality: 0.1,
          maxAnisotropy: 1
        };
    }
  }

  optimizeScene(scene: THREE.Scene | THREE.Group, camera: THREE.Camera) {
    const sceneObject = scene instanceof THREE.Scene ? scene : (() => {
      const newScene = new THREE.Scene();
      newScene.add(scene);
      return newScene;
    })();
    
    this.setupFrustumCulling(sceneObject);
    this.setupDistanceCulling(sceneObject, camera);
    this.optimizeMaterials(sceneObject);
    if (this.settings.instanceMerging) {
      this.mergeInstances(sceneObject);
    }
  }

  private setupFrustumCulling(scene: THREE.Scene) {
    if (!this.settings.frustumCulling) return;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.frustumCulled = true;
      }
    });
  }

  private setupDistanceCulling(scene: THREE.Scene, camera: THREE.Camera) {
    const distanceSq = this.settings.distanceCulling * this.settings.distanceCulling;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const distance = object.position.distanceToSquared(camera.position);
        object.visible = distance <= distanceSq;
      }
    });
  }

  private optimizeMaterials(scene: THREE.Scene) {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material as THREE.Material;
        
        // More aggressive material optimization
        if (material instanceof THREE.MeshStandardMaterial) {
          // Reduce texture quality based on distance
          if (material.map) {
            material.map.anisotropy = this.settings.maxAnisotropy;
            material.map.minFilter = THREE.LinearMipMapLinearFilter;
            material.map.magFilter = THREE.LinearFilter;
            
            // Compress textures for low-end devices
            if (this.gpuTier <= 1) {
              material.map.format = THREE.RGBAFormat;
              material.map.generateMipmaps = false;
            }
          }
          
          // Reduce material complexity based on distance
          const cameraObj = scene.getObjectByName('camera');
          const distance = cameraObj ? 
            object.position.distanceTo(cameraObj.position) : 
            this.settings.distanceCulling;

          if (distance > this.settings.distanceCulling * 0.3) {
            material.roughness = Math.min(material.roughness * 2, 1);
            material.metalness = Math.max(material.metalness * 0.25, 0);
            material.envMapIntensity = Math.max(material.envMapIntensity * 0.5, 0);
          }

          // Disable shadows for distant objects
          if (distance > this.settings.distanceCulling * 0.5) {
            object.castShadow = false;
            object.receiveShadow = false;
          }
        }
      }
    });
  }

  private mergeInstances(scene: THREE.Scene) {
    // Reset collections
    this.objectsToMerge.clear();
    this.instancedMeshes.clear();

    // Collect similar meshes
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const key = this.getMeshKey(object);
        if (!this.objectsToMerge.has(key)) {
          this.objectsToMerge.set(key, []);
        }
        this.objectsToMerge.get(key)?.push(object);
      }
    });

    // Create instanced meshes
    this.objectsToMerge.forEach((meshes, key) => {
      if (meshes.length > 1) {
        const firstMesh = meshes[0];
        const instancedMesh = new THREE.InstancedMesh(
          firstMesh.geometry,
          firstMesh.material,
          meshes.length
        );

        meshes.forEach((mesh, index) => {
          const matrix = new THREE.Matrix4();
          mesh.updateMatrix();
          matrix.copy(mesh.matrix);
          instancedMesh.setMatrixAt(index, matrix);
          mesh.removeFromParent();
        });

        scene.add(instancedMesh);
        this.instancedMeshes.set(key, instancedMesh);
      }
    });
  }

  private getMeshKey(mesh: THREE.Mesh): string {
    return `${mesh.geometry.uuid}-${(mesh.material as THREE.Material).uuid}`;
  }

  getSettings(): QualitySettings {
    return { ...this.settings };
  }
}

export const performanceManager = PerformanceManager.getInstance(); 