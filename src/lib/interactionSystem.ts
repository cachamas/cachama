import * as THREE from 'three';
import { useInteractionStore } from '../stores/interactionStore';
import { debugLog } from '../stores/debugStore';

// List of interactable objects by name
const INTERACTABLE_OBJECTS = [
  'Cube005',  // QR Contact in central
  'qr_cube',  // Spawnable QR code cubes
  'Plane__0017', // Pirate in overworld
  'Plane__0024', // BTR Map
  'Object_2005',
  'unnamed016', // LAS TRES GRACIAS artwork
  'unnamed015', // CABALLO artwork
  'unnamed014', // MARIA LIONZA artwork
  'unnamed009', // IT'S YOUR MOVE artwork
  'unnamed010', // SELKNAM artwork
  'unnamed011', // CARICUAO artwork
  'toribash',
  'venequidad',
  'engi',
  'mural',
  'mgs',
  'indios',
  'lolita',
  'selknam',
  'yeule',
  'china',
  'bonzi',
  'dnd',
  'samurai',
  'persona',
  'tesla',
  'moto',
  'toris',
  'angel',
  'alan',
  'drg',
  'rosita',
  'daggers',
  'forro',
  'elephant',
  'linda',
  'mickey',
  'SimpleTurntableFoot1_Bottom_0',
  'turntable', // Add alternative name
  'Turntable', // Add alternative name
  'TurntableBase', // Add alternative name
  'Mesh_0001', // New interactable mesh (fixed name)
  'body_Maraface2_0006', // New interactable mesh (fixed name)
  'Mesh_0008',
  'body_Maraface2_0',
  'Mesh_0009',
  'body_Maraface2_0019',
  'Mesh_0013',
  'body_Maraface2_0005_1',
  'Mesh_0010',
  'body_Maraface2_0021',
  'Mesh_0011',
  'body_Maraface2_0012_1',
  'Mesh_0012',
  'body_Maraface2_0011_1',
  'Mesh_0007',
  'body_Maraface2_0010_1',
  'Mesh_0006',
  'body_Maraface2_0013_1',
  'Mesh_0005',
  'body_Maraface2_0004',
  'Mesh_0004',
  'body_Maraface2_0008',
  'Mesh_0003',
  'Mesh_0002',
  'Mesh_0',
  'body_Maraface2_0027'
];

interface InteractableInfo {
  title: string;
  description: string;
  subtitle?: string;
  showViewer?: boolean;
  variant?: string;
  isMusicPlayer?: boolean;
}

export class InteractionSystem {
  private raycaster: THREE.Raycaster;
  private camera: THREE.Camera;
  private scene: THREE.Object3D;
  private lastHovered: THREE.Object3D | null = null;
  private highlightOverlays: Map<THREE.Object3D, THREE.Mesh> = new Map();
  private debounceTimeout: number | null = null;
  private isDebugMode: boolean = false;
  private currentMap: string = ''; // Add current map tracking

  constructor(camera: THREE.Camera, scene: THREE.Object3D, currentMap: string) {
    this.raycaster = new THREE.Raycaster();
    this.camera = camera;
    this.scene = scene;
    this.currentMap = currentMap;

    // Add keyboard listeners for debug features
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.initializeMaterials(); // Call this to set up Toribash texture
  }

  // Add method to update current map
  public updateMap(newMap: string) {
    this.currentMap = newMap;
    this.cleanup(); // Clean up highlights when changing maps
  }

  private initializeMaterials() {
    // Handle Plane__0001 material
    this.scene.traverse((object) => {
      if (object.name === 'Plane__0001' && object instanceof THREE.Mesh) {
        if (object.material instanceof THREE.MeshStandardMaterial) {
          const textureLoader = new THREE.TextureLoader();
          textureLoader.load('/images/dirt.webp', (loadedTexture) => {
            loadedTexture.flipY = false;
            object.material.map = loadedTexture;
            object.material.emissive.setRGB(0.6, 0.6, 0.6);
            object.material.emissiveMap = loadedTexture;
            object.material.needsUpdate = true;
          });
        }
      }
    });

    // Only handle Toribash texture
    this.scene.traverse((object) => {
      if (object.name === 'toribash' && object instanceof THREE.Mesh) {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('/images/Object_2.006_Bake1_CyclesBake_DIFFUSE.webp', (loadedTexture) => {
          loadedTexture.flipY = false;  // Important for GLTF models to display correctly
          
          if (object.material instanceof THREE.MeshStandardMaterial) {
            object.material.map = loadedTexture;
            object.material.emissive.setRGB(0.6, 0.6, 0.6);
            object.material.emissiveMap = loadedTexture;
            object.material.needsUpdate = true;
          }
        });
      }
    });
  }

  private createHighlightOverlay(mesh: THREE.Mesh) {
    // Create a clone of the mesh's geometry
    const highlightGeometry = mesh.geometry.clone();
    
    // Create a material that will add a subtle glow
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,    // Render both sides
      polygonOffset: true,       // Enable polygon offset
      polygonOffsetFactor: -1,   // Move the highlight slightly in front
      polygonOffsetUnits: -1
    });

    // Create the highlight mesh
    const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    
    // Copy the transform and make sure to update matrix
    highlightMesh.position.copy(mesh.position);
    highlightMesh.rotation.copy(mesh.rotation);
    highlightMesh.scale.copy(mesh.scale);
    highlightMesh.matrix.copy(mesh.matrix);
    highlightMesh.matrixWorld.copy(mesh.matrixWorld);
    highlightMesh.updateMatrix();
    
    // If the original mesh is a child, we need to match its transform
    if (mesh.parent) {
      mesh.parent.add(highlightMesh);
      highlightMesh.updateMatrixWorld();
    }

    return highlightMesh;
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'KeyO') {
      this.isDebugMode = !this.isDebugMode;
      debugLog('InteractionSystem', `Debug mode: ${this.isDebugMode ? 'ON' : 'OFF'}`);
    }
    if (event.code === 'KeyL') {
      this.listAllObjects();
    }
  }

  private listAllObjects() {
    const objects: string[] = [];
    this.scene.traverse((object) => {
      if (object.name) {
        objects.push(`${object.name} (Type: ${object.type})`);
      }
    });
    debugLog('InteractionSystem', 'All objects in scene', objects);
  }

  update() {
    if (this.debounceTimeout) return;

    this.debounceTimeout = window.setTimeout(() => {
      this.debounceTimeout = null;
      this.performUpdate();
    }, 16);
  }

  private isInteractable(object: THREE.Object3D): boolean {
    if (this.isDebugMode) {
      debugLog('InteractionSystem', 'Debug object', {
        name: object.name,
        type: object.type,
        isMesh: object instanceof THREE.Mesh,
        parent: object.parent?.name,
        currentMap: this.currentMap
      });
    }

    // Explicitly prevent interactions with body_Maraface parts
    if (object.name.includes('body_Maraface')) {
      return false;
    }

    // Check for turntable specifically
    if (object.name === 'SimpleTurntableFoot1_Bottom_0' || 
        object.name.toLowerCase().includes('turntable')) {
      if (this.isDebugMode) {
        debugLog('InteractionSystem', 'Found turntable', object.name);
      }
      return true;
    }

    // Check if it's a sphere part of a Tori
    if (object.name.startsWith('sphere')) {
      // Extract the base number (e.g., 10171 from sphere10171_21)
      const baseNumber = object.name.split('_')[0].replace('sphere', '');
      
      // Special handling for sphere10603 split between KITSUNE and TRIBAL1
      if (baseNumber === '10603') {
        const sphereNumber = parseInt(object.name.split('_')[1]);
        return !isNaN(sphereNumber); // Valid as long as we have a number
      }
      
      // Check for all Tori variants
      const toriBaseNumbers = [
        '10171',   // TNPR0-100
        '101812',  // THE FLAYED ONE
        '10876',   // GOJO
        '10245',   // TOOL
        '10199',   // DEATH MONARCH
        '10447',   // BAKI
        '10759',   // COSMIC GOLEM
        '10639',   // SHO NUFF
        '10678',   // KILL BILL
        '10315',   // AKALI
        '101692',  // HELLRAISER I
        '10135',   // DMT
        '101341',  // ABADDON
        '101873',  // THUNDER GOD
        '10564',   // OLIVA
        '10366',   // Y-M3 v1
        '101653',  // HELLRAISER II
        '101770',  // SAGE
        '10001',   // KITSUNE
        '10603',   // TRIBAL1
        '10904',   // TRIBAL2
        '10291',   // COTTAGE FAIRY
        '101076',  // DUALITY
        '101536',  // ASURA
        '101263',  // PAIN
        '101185',  // SECOND KING
        '10472',   // THE DISCIPLE
        '101156',  // RIDE
        '101109',  // RODTANG
        '101834',  // KING
        '10053',   // DEATH
        '101451',  // RED
        '10020',   // XIII ARCANUM
        '101025',  // ASSASSIN
        '101614',  // PICKLE
        '101011',  // ICE
        '101575',  // CRUSADER
        '10709',   // BIRDMAN
        '101731',   // ATLANTEAN
        '101497',  // MAD DEATH
        '10522',   // THE DUKE
        '10795',   // KIRITO
        '10837',   // GOKU
        '101419',  // HISOKA
        '101302',  // MOROHA
        '101380',  // MUMMY
        '101224',  // SAMURAI
      ];
      
      if (toriBaseNumbers.includes(baseNumber)) {
        return true;
      }
    }

    let current: THREE.Object3D | null = object;
    while (current) {
      // Check if this is a GCT-specific mesh - only trigger on Mesh_ parts
      if (current.name.startsWith('Mesh_')) {
        // Only allow interaction if we're in the GCT map
        return this.currentMap === 'gct';
      }

      // For other interactable objects
      if (INTERACTABLE_OBJECTS.includes(current.name)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private performUpdate() {
    if (!this.camera || !this.scene) return;

    // Debug mode logging
    if (this.isDebugMode) {
      debugLog('InteractionSystem', 'Debug mode active', {
        cameraPosition: this.camera.position,
        raycasterOrigin: this.raycaster.ray.origin
      });
    }

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObject(this.scene, true);

    if (this.isDebugMode && intersects.length > 0) {
      debugLog('InteractionSystem', 'Intersected objects', intersects.map(i => ({
        name: i.object.name,
        type: i.object.type,
        distance: i.distance
      })));
    }

    const interactableIntersect = intersects.find(intersect => {
      const isInteractable = this.isInteractable(intersect.object);
      if (this.isDebugMode) {
        debugLog('InteractionSystem', 'Checking interactable', {
          name: intersect.object.name,
          isInteractable
        });
      }
      return isInteractable;
    });
    
    const newHovered = interactableIntersect ? interactableIntersect.object : null;

    // Debug turntable specific interactions
    if (this.isDebugMode && newHovered) {
      debugLog('InteractionSystem', 'Hovering over', {
        name: newHovered.name,
        isTurntable: newHovered.name === 'SimpleTurntableFoot1_Bottom_0' || 
                    newHovered.name.toLowerCase().includes('turntable')
      });
    }

    if (this.lastHovered !== newHovered) {
      // Remove all previous highlights
      this.highlightOverlays.forEach((overlay) => {
        overlay.removeFromParent();
      });
      this.highlightOverlays.clear();

      // Add new highlights
      if (newHovered instanceof THREE.Mesh) {
        // Special handling for turntable
        if (newHovered.name === 'SimpleTurntableFoot1_Bottom_0' || 
            newHovered.name.toLowerCase().includes('turntable')) {
          const overlay = this.createHighlightOverlay(newHovered);
          this.highlightOverlays.set(newHovered, overlay);
          
          // Get turntable info and set it as hovered object
          const turntableInfo = getObjectInfo('SimpleTurntableFoot1_Bottom_0');
          const turntableObject = newHovered.clone();
          turntableObject.name = 'SimpleTurntableFoot1_Bottom_0';
          useInteractionStore.getState().setHoveredObject(turntableObject);
          
          if (this.isDebugMode) {
            console.log('Setting turntable as hovered object:', turntableInfo);
          }
        }
        // For Tori spheres, highlight all related spheres
        else if (newHovered.name.startsWith('sphere')) {
          const baseNumber = newHovered.name.split('_')[0].replace('sphere', '');
          
          // Special handling for sphere10603 split
          if (baseNumber === '10603') {
            const sphereNumber = parseInt(newHovered.name.split('_')[1]);
            const isKitsune = sphereNumber <= 38;
            const toriObject = newHovered.clone();
            toriObject.name = isKitsune ? 'KITSUNE' : 'TRIBAL1';
            useInteractionStore.getState().setHoveredObject(toriObject);
            
            // Find and highlight only spheres in the same group
            this.scene.traverse((object) => {
              if (object instanceof THREE.Mesh && 
                  object.name.startsWith(`sphere${baseNumber}`)) {
                const otherSphereNumber = parseInt(object.name.split('_')[1]);
                if ((sphereNumber <= 38 && otherSphereNumber <= 38) ||
                    (sphereNumber > 38 && otherSphereNumber > 38)) {
                  const overlay = this.createHighlightOverlay(object);
                  this.highlightOverlays.set(object, overlay);
                }
              }
            });
          } else {
            // Get the corresponding TORI info
            const sphereInfo = getObjectInfo(`sphere${baseNumber}`);
            if (sphereInfo.variant) {
              const toriObject = newHovered.clone();
              toriObject.name = sphereInfo.variant;
              useInteractionStore.getState().setHoveredObject(toriObject);
              
              // For all other Tori, highlight all related spheres
              this.scene.traverse((object) => {
                if (object instanceof THREE.Mesh && 
                    object.name.startsWith(`sphere${baseNumber}`)) {
                  const overlay = this.createHighlightOverlay(object);
                  this.highlightOverlays.set(object, overlay);
                }
              });
            }
          }
        }
        // Special handling for mannequin parts
        else if (this.isArtPiecePair(newHovered.name)) {
          // Find and highlight both parts of the pair
          this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh && this.isMatchingPair(newHovered.name, object.name)) {
              const overlay = this.createHighlightOverlay(object);
              this.highlightOverlays.set(object, overlay);
            }
          });
          useInteractionStore.getState().setHoveredObject(newHovered);
        }
        else if (this.isInteractable(newHovered)) {
          const overlay = this.createHighlightOverlay(newHovered);
          this.highlightOverlays.set(newHovered, overlay);
          useInteractionStore.getState().setHoveredObject(newHovered);
        }
      } else {
        useInteractionStore.getState().setHoveredObject(null);
      }

      this.lastHovered = newHovered;
    }
  }

  private isArtPiecePair(name: string): boolean {
    const pairs = [
      ['Mesh_0003', 'body_Maraface2_0010_4'],
      ['Mesh_0006', 'body_Maraface2_0014_4'],
      ['Mesh_0007', 'body_Maraface2_0011_4'],
      ['Mesh_0012', 'body_Maraface2_0012_4'],
      ['Mesh_0011', 'body_Maraface2_0013_4'],
      ['Mesh_0013', 'body_Maraface2_0005_4'],
      // Keep existing pairs
      ['Mesh_0001', 'body_Maraface2_0006'],
      ['Mesh_0008', 'body_Maraface2_0'],
      ['Mesh_0009', 'body_Maraface2_0019'],
      ['Mesh_0010', 'body_Maraface2_0021'],
      ['Mesh_0005', 'body_Maraface2_0004'],
      ['Mesh_0004', 'body_Maraface2_0008'],
      ['Mesh_0002', 'trova.003'],
      ['Mesh_0', 'body_Maraface2_0027']
    ];
    return pairs.some(pair => pair.includes(name));
  }

  private isMatchingPair(name1: string, name2: string): boolean {
    const pairs = [
      ['Mesh_0003', 'body_Maraface2_0010_4'],
      ['Mesh_0006', 'body_Maraface2_0014_4'],
      ['Mesh_0007', 'body_Maraface2_0011_4'],
      ['Mesh_0012', 'body_Maraface2_0012_4'],
      ['Mesh_0011', 'body_Maraface2_0013_4'],
      ['Mesh_0013', 'body_Maraface2_0005_4'],
      // Keep existing pairs
      ['Mesh_0001', 'body_Maraface2_0006'],
      ['Mesh_0008', 'body_Maraface2_0'],
      ['Mesh_0009', 'body_Maraface2_0019'],
      ['Mesh_0010', 'body_Maraface2_0021'],
      ['Mesh_0005', 'body_Maraface2_0004'],
      ['Mesh_0004', 'body_Maraface2_0008'],
      ['Mesh_0002', 'trova.003'],
      ['Mesh_0', 'body_Maraface2_0027']
    ];
    return pairs.some(pair => pair.includes(name1) && pair.includes(name2));
  }

  cleanup() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    window.removeEventListener('keydown', this.handleKeyDown);
    
    // Remove all highlight overlays
    this.highlightOverlays.forEach((overlay) => {
      overlay.removeFromParent();
    });
    this.highlightOverlays.clear();
    
    if (this.lastHovered) {
      useInteractionStore.getState().setHoveredObject(null);
      this.lastHovered = null;
    }
  }
}

export function isInteractableMesh(name: string): boolean {
  // Check if it's a sphere with any of our valid numbers
  if (name.startsWith('sphere')) {
    const baseNumber = name.split('_')[0].replace('sphere', '');
    const validNumbers = [
      '10171',   // TNPR0-100
      '101812',  // THE FLAYED ONE
      '10876',   // GOJO
      '10245',   // TOOL
      '10199',   // DEATH MONARCH
      '10447',   // BAKI
      '10759',   // COSMIC GOLEM
      '10639',   // SHO NUFF
      '10678',   // KILL BILL
      '10315',   // AKALI
      '101692',  // HELLRAISER I
      '10135',   // DMT
      '101341',  // ABADDON
      '101873',  // THUNDER GOD
      '10564',   // OLIVA
      '10366',   // Y-M3 v1
      '101653',  // HELLRAISER II
      '101770',  // SAGE
      '10001',   // KITSUNE
      '10603',   // TRIBAL1
      '10904',   // TRIBAL2
      '10291',   // COTTAGE FAIRY
      '101076',  // DUALITY
      '101536',  // ASURA
      '101263',  // PAIN
      '101185',  // SECOND KING
      '10472',   // THE DISCIPLE
      '101156',  // RIDE
      '101109',  // RODTANG
      '101834',  // KING
      '10053',   // DEATH
      '101451',  // RED
      '10020',   // XIII ARCANUM
      '101025',  // ASSASSIN
      '101614',  // PICKLE
      '101011',  // ICE
      '101575',  // CRUSADER
      '10709',   // BIRDMAN
      '101731',   // ATLANTEAN
      '101497',  // MAD DEATH
      '10522',   // THE DUKE
      '10795',   // KIRITO
      '10837',   // GOKU
      '101419',  // HISOKA
      '101302',  // MOROHA
      '101380',  // MUMMY
      '101224'   // SAMURAI
    ];
    return validNumbers.includes(baseNumber);
  }
  return name.startsWith('button') || name.startsWith('door');
}

export function getObjectGroup(name: string): string {
  if (name.startsWith('sphere10171') || name.startsWith('sphere101812')) {
    // Extract the base number (e.g., 10171 from sphere10171_21 or 101812 from sphere101812_21)
    const match = name.match(/sphere(\d+)/);
    if (match) {
      return `sphere${match[1]}`;
    }
  }
  return name;
}

export function getObjectInfo(name: string): InteractableInfo {
  const toriInfo: Record<string, InteractableInfo> = {
    '10171': {
      title: 'TNPR0-100',
      description: 'Made by Alejandro',
      subtitle: 'December 2024',
      showViewer: true,
      variant: 'TNPR0-100'
    },
    '101812': {
      title: 'THE FLAYED ONE',
      description: 'Made by Alejandro',
      subtitle: 'October 2024',
      showViewer: true,
      variant: 'THE FLAYED ONE'
    },
    '10876': {
      title: 'GOJO',
      description: 'Made by Alejandro',
      subtitle: 'October 2024',
      showViewer: true,
      variant: 'GOJO'
    },
    '10245': {
      title: 'TOOL',
      description: 'Made by Alejandro',
      subtitle: 'October 2024',
      showViewer: true,
      variant: 'TOOL'
    },
    '10199': {
      title: 'DEATH MONARCH',
      description: 'Made by Alejandro',
      subtitle: 'August 2022',
      showViewer: true,
      variant: 'DEATH MONARCH'
    },
    '10447': {
      title: 'BAKI',
      description: 'Made by Alejandro',
      subtitle: 'August 2022',
      showViewer: true,
      variant: 'BAKI'
    },
    '10759': {
      title: 'COSMIC GOLEM',
      description: 'Made by Alejandro',
      subtitle: 'September 2022',
      showViewer: true,
      variant: 'COSMIC GOLEM'
    },
    '10639': {
      title: 'SHO NUFF',
      description: 'Made by Alejandro',
      subtitle: 'September 2022',
      showViewer: true,
      variant: 'SHO NUFF'
    },
    '10678': {
      title: 'KILL BILL',
      description: 'Made by Alejandro',
      subtitle: 'September 2022',
      showViewer: true,
      variant: 'KILL BILL'
    },
    '10315': {
      title: 'AKALI',
      description: 'Made by Alejandro',
      subtitle: 'September 2022',
      showViewer: true,
      variant: 'AKALI'
    },
    '101692': {
      title: 'HELLRAISER I',
      description: 'Made by Alejandro',
      subtitle: 'November 2022',
      showViewer: true,
      variant: 'HELLRAISER I'
    },
    '10135': {
      title: 'DMT',
      description: 'Made by Alejandro',
      subtitle: 'November 2022',
      showViewer: true,
      variant: 'DMT'
    },
    '101341': {
      title: 'ABADDON',
      description: 'Made by Alejandro',
      subtitle: 'December 2022',
      showViewer: true,
      variant: 'ABADDON'
    },
    '101873': {
      title: 'THUNDER GOD',
      description: 'Made by Alejandro',
      subtitle: 'February 2023',
      showViewer: true,
      variant: 'THUNDER GOD'
    },
    '10564': {
      title: 'OLIVA',
      description: 'Made by Alejandro',
      subtitle: 'March 2023',
      showViewer: true,
      variant: 'OLIVA'
    },
    '10366': {
      title: 'Y-M3 v1',
      description: 'Made by Alejandro',
      subtitle: 'March 2023',
      showViewer: true,
      variant: 'Y-M3 v1'
    },
    '101653': {
      title: 'HELLRAISER II',
      description: 'Made by Alejandro',
      subtitle: 'February 2024',
      showViewer: true,
      variant: 'HELLRAISER II'
    },
    '101770': {
      title: 'SAGE',
      description: 'Made by Alejandro',
      subtitle: 'April 2023',
      showViewer: true,
      variant: 'SAGE'
    },
    '10001': {
      title: 'KITSUNE',
      description: 'Made by Alejandro',
      subtitle: 'April 2023',
      showViewer: true,
      variant: 'KITSUNE'
    },
    '10603': {
      title: 'TRIBAL1',
      description: 'Made by Alejandro',
      subtitle: 'May 2023',
      showViewer: true,
      variant: 'TRIBAL1'
    },
    '10904': {
      title: 'TRIBAL2',
      description: 'Made by Alejandro',
      subtitle: 'May 2023',
      showViewer: true,
      variant: 'TRIBAL2'
    },
    '10291': {
      title: 'COTTAGE FAIRY',
      description: 'Made by Alejandro',
      subtitle: 'June 2023',
      showViewer: true,
      variant: 'COTTAGE FAIRY'
    },
    '101076': {
      title: 'DUALITY',
      description: 'Made by Alejandro',
      subtitle: 'June 2023',
      showViewer: true,
      variant: 'DUALITY'
    },
    '101536': {
      title: 'ASURA',
      description: 'Made by Alejandro',
      subtitle: 'June 2023',
      showViewer: true,
      variant: 'ASURA'
    },
    '101263': {
      title: 'PAIN',
      description: 'Made by Alejandro',
      subtitle: 'July 2023',
      showViewer: true,
      variant: 'PAIN'
    },
    '101185': {
      title: 'SECOND KING',
      description: 'Made by Alejandro',
      subtitle: 'August 2023',
      showViewer: true,
      variant: 'SECOND KING'
    },
    '10472': {
      title: 'THE DISCIPLE',
      description: 'Made by Alejandro',
      subtitle: 'August 2023',
      showViewer: true,
      variant: 'THE DISCIPLE'
    },
    '101156': {
      title: 'RIDE',
      description: 'Made by Alejandro',
      subtitle: 'July 2023',
      showViewer: true,
      variant: 'RIDE'
    },
    '101109': {
      title: 'RODTANG',
      description: 'Made by Alejandro',
      subtitle: 'July 2023',
      showViewer: true,
      variant: 'RODTANG'
    },
    '101834': {
      title: 'KING',
      description: 'Made by Alejandro',
      subtitle: 'September 2023',
      showViewer: true,
      variant: 'KING'
    },
    '10053': {
      title: 'DEATH',
      description: 'Made by Alejandro',
      subtitle: 'October 2023',
      showViewer: true,
      variant: 'DEATH'
    },
    '101451': {
      title: 'RED',
      description: 'Made by Alejandro',
      subtitle: 'October 2023',
      showViewer: true,
      variant: 'RED'
    },
    '10020': {
      title: 'XIII ARCANUM',
      description: 'Made by Alejandro',
      subtitle: 'December 2023',
      showViewer: true,
      variant: 'XIII ARCANUM'
    },
    '101025': {
      title: 'ASSASSIN',
      description: 'Made by Alejandro',
      subtitle: 'December 2023',
      showViewer: true,
      variant: 'ASSASSIN'
    },
    '101614': {
      title: 'PICKLE',
      description: 'Made by Alejandro',
      subtitle: 'November 2023',
      showViewer: true,
      variant: 'PICKLE'
    },
    '101011': {
      title: 'ICE',
      description: 'Made by Alejandro',
      subtitle: 'November 2023',
      showViewer: true,
      variant: 'ICE'
    },
    '101575': {
      title: 'CRUSADER',
      description: 'Made by Alejandro',
      subtitle: 'October 2023',
      showViewer: true,
      variant: 'CRUSADER'
    },
    '10709': {
      title: 'BIRDMAN',
      description: 'Made by Alejandro',
      subtitle: 'January 2024',
      showViewer: true,
      variant: 'BIRDMAN'
    },
    '101731': {
      title: 'ATLANTEAN',
      description: 'Made by Alejandro',
      subtitle: 'February 2024',
      showViewer: true,
      variant: 'ATLANTEAN'
    },
    '101497': {
      title: 'MAD DEATH',
      description: 'Made by Alejandro',
      subtitle: 'June 2024',
      showViewer: true,
      variant: 'MAD DEATH'
    },
    '10522': {
      title: 'THE DUKE',
      description: 'Made by Alejandro',
      subtitle: 'May 2022',
      showViewer: true,
      variant: 'THE DUKE'
    },
    '10795': {
      title: 'KIRITO',
      description: 'Made by Alejandro',
      subtitle: 'April 2022',
      showViewer: true,
      variant: 'KIRITO'
    },
    '10837': {
      title: 'GOKU',
      description: 'Made by Alejandro',
      subtitle: 'June 2022',
      showViewer: true,
      variant: 'GOKU'
    },
    '101419': {
      title: 'HISOKA',
      description: 'Made by Alejandro',
      subtitle: 'July 2022',
      showViewer: true,
      variant: 'HISOKA'
    },
    '101302': {
      title: 'MOROHA',
      description: 'Made by Alejandro',
      subtitle: 'May 2022',
      showViewer: true,
      variant: 'MOROHA'
    },
    '101380': {
      title: 'MUMMY',
      description: 'Made by Alejandro',
      subtitle: 'July 2022',
      showViewer: true,
      variant: 'MUMMY'
    },
    '101224': {
      title: 'SAMURAI',
      description: 'Made by Alejandro',
      subtitle: 'May 2022',
      showViewer: true,
      variant: 'SAMURAI'
    },
    'SimpleTurntableFoot1_Bottom_0': {
      title: 'Music Player',
      description: 'Click to open music player',
      showViewer: false,
      isMusicPlayer: true
    }
  };

  // Special cases for unnamed objects
  if (name === 'unnamed016') {
    return {
      title: 'LAS TRES GRACIAS',
      description: 'January 2024',
      subtitle: 'Tattoo concept by hombrechivo',
      showViewer: true,
      variant: '3GRACIAS'
    };
  }
  if (name === 'unnamed015') {
    return {
      title: 'CABALLO',
      description: 'January 2024',
      subtitle: 'Tattoo concept by hombrechivo',
      showViewer: true,
      variant: 'CABALLO'
    };
  }
  if (name === 'unnamed014') {
    return {
      title: 'MARIA LIONZA',
      description: 'January 2024',
      subtitle: 'Tattoo concept by hombrechivo',
      showViewer: true,
      variant: 'MARIALIONZA'
    };
  }
  if (name === 'unnamed009') {
    return {
      title: "IT'S YOUR MOVE",
      description: 'January 2024',
      subtitle: 'Tattoo concept by hombrechivo',
      showViewer: true,
      variant: 'VAPORWAVE'
    };
  }
  if (name === 'unnamed010') {
    return {
      title: 'SELKNAM',
      description: 'January 2024',
      subtitle: 'Tattoo concept by hombrechivo',
      showViewer: true,
      variant: 'SELKNAM'
    };
  }
  if (name === 'unnamed011') {
    return {
      title: 'CARICUAO',
      description: 'January 2024',
      subtitle: 'Tattoo concept by hombrechivo',
      showViewer: true,
      variant: 'CARICUAO'
    };
  }

  // First, try to find direct match in toriInfo by variant name
  const directMatch = Object.values(toriInfo).find(info => info.variant === name);
  if (directMatch) {
    return directMatch;
  }

  // Check for new interactable meshes
  if (name === 'Mesh_0001' || name === 'body_Maraface2_0006') {
    return {
      title: 'HOMOSEXUAL',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'HOMOSEXUAL'
    };
  }

  // If no direct match, try the sphere number approach
  const baseNumber = name.startsWith('sphere') ? name.split('_')[0].replace('sphere', '') : name;
  
  // Special handling for sphere10603 split between KITSUNE and TRIBAL1
  if (baseNumber === '10603') {
    const sphereNumber = parseInt(name.split('_')[1]);
    // Make sure we have a valid sphere number and use it to determine the variant
    if (!isNaN(sphereNumber)) {
      const isKitsune = sphereNumber <= 38;
      return {
        title: isKitsune ? 'KITSUNE' : 'TRIBAL1',
        description: 'Made by Alejandro',
        subtitle: isKitsune ? 'April 2023' : 'May 2023',
        showViewer: true,
        variant: isKitsune ? 'KITSUNE' : 'TRIBAL1'
      };
    }
  }
  
  // Try to find by base number
  const result = toriInfo[baseNumber];
  if (result) {
    // Update description to simpler format
    return {
      ...result,
      description: 'Made by Alejandro'
    };
  }

  // Update turntable info
  if (name.toLowerCase().includes('turntable')) {
    return {
      title: 'Music Player',
      description: 'Click to open music player',
      showViewer: false,
      isMusicPlayer: true
    };
  }

  // Check for art piece pairs
  const artPieces: Record<string, InteractableInfo> = {
    'Mesh_0001': {
      title: 'HOMOSEXUAL',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'HOMOSEXUAL'
    },
    'body_Maraface2_0006': {
      title: 'HOMOSEXUAL',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'HOMOSEXUAL'
    },
    'Mesh_0008': {
      title: 'GRAN POLO PATRIOTA',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'GRAN POLO PATRIOTA'
    },
    'body_Maraface2_0': {
      title: 'GRAN POLO PATRIOTA',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'GRAN POLO PATRIOTA'
    },
    'Mesh_0009': {
      title: 'CHIRIPERO',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'CHIRIPERO'
    },
    'body_Maraface2_0019': {
      title: 'CHIRIPERO',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'CHIRIPERO'
    },
    'Mesh_0013': {
      title: 'DARIEN',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'DARIEN'
    },
    'body_Maraface2_0005_1': {
      title: 'DARIEN',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'DARIEN'
    },
    'Mesh_0010': {
      title: 'LIBEREN A DORANGEL',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'LIBEREN A DORANGEL'
    },
    'body_Maraface2_0021': {
      title: 'LIBEREN A DORANGEL',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'LIBEREN A DORANGEL'
    },
    'Mesh_0011': {
      title: 'LA RATA',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'LA RATA'
    },
    'body_Maraface2_0012_1': {
      title: 'LA RATA',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'LA RATA'
    },
    'Mesh_0012': {
      title: 'CUARTEL DE LA MONTANA',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'CUARTEL DE LA MONTANA'
    },
    'body_Maraface2_0011_1': {
      title: 'CUARTEL DE LA MONTANA',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'CUARTEL DE LA MONTANA'
    },
    'Mesh_0007': {
      title: 'EL ANGEL DE LA GUARDIA',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'EL ANGEL DE LA GUARDIA'
    },
    'body_Maraface2_0010_1': {
      title: 'EL ANGEL DE LA GUARDIA',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'EL ANGEL DE LA GUARDIA'
    },
    'Mesh_0006': {
      title: 'LOCOS',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'LOCOS'
    },
    'body_Maraface2_0013_1': {
      title: 'LOCOS',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'LOCOS'
    },
    'Mesh_0005': {
      title: 'SAN ISMAELITO',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'SAN ISMAELITO'
    },
    'body_Maraface2_0004': {
      title: 'SAN ISMAELITO',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'SAN ISMAELITO'
    },
    'Mesh_0004': {
      title: 'MOTOTAXI',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'MOTOTAXI'
    },
    'body_Maraface2_0008': {
      title: 'MOTOTAXI',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'MOTOTAXI'
    },
    'Mesh_0003': {
      title: 'LIFE OF HUGO',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'LIFE OF HUGO'
    },
    'Mesh_0002': {
      title: 'PODER',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'PODER'
    },
    'trova.003': {
      title: 'PODER',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'PODER'
    },
    'Mesh_0': {
      title: 'TOYOBOBO',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'TOYOBOBO'
    },
    'body_Maraface2_0027': {
      title: 'TOYOBOBO',
      description: 'ARTIST: GACETA OFFICIAL',
      showViewer: true,
      variant: 'TOYOBOBO'
    }
  };

  if (artPieces[name]) {
    const info = artPieces[name];
    return {
      ...info,
      variant: info.title // Use the title as the variant to match the .glb filename
    };
  }

  // Add BTR map info
  if (name === 'Plane__0024') {
    return {
      title: 'BTR',
      description: 'Teletransporte publico',
      showViewer: true,
      variant: 'map'
    };
  }

  // Default case - return a safe default object
  return {
    title: 'Unknown Object',
    description: 'No information available',
    showViewer: false
  };
} 