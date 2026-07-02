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
  'body_Maraface2_0027',
  // Add all vinyl records
  'Box001_Material_#25_0028',
  'Box001_Material_#25_0026',
  'Box001_Material_#25_0024',
  'Box001_Material_#25_0025',
  'Box001_Material_#25_0023',
  'Box001_Material_#25_0014',
  'Box001_Material_#25_0020',
  'Box001_Material_#25_0019',
  'Box001_Material_#25_0018',
  'Box001_Material_#25_0029',
  'Box001_Material_#25_0031',
  'Box001_Material_#25_0030',
  'Box001_Material_#25_0032',
  'Box001_Material_#25_0033',
  'Box001_Material_#25_0035',
  'Box001_Material_#25_0034',
  'Box001_Material_#25_0036',
  'Box001_Material_#25_0037',
  'Box001_Material_#25_0039',
  'Box001_Material_#25_0038',
  'Box001_Material_#25_0054',
  'Box001_Material_#25_0052',
  'Box001_Material_#25_0053',
  'Box001_Material_#25_0051',
  'Box001_Material_#25_0050',
  'Box001_Material_#25_0048',
  'Box001_Material_#25_0049',
  'Box001_Material_#25_0047',
  'Box001_Material_#25_0046',
  'Box001_Material_#25_0044',
  'Box001_Material_#25_0045',
  'Box001_Material_#25_0056',
  'Box001_Material_#25_0057',
  'Box001_Material_#25_0059',
  'Box001_Material_#25_0058',
  'Box001_Material_#25_0060',
  'Box001_Material_#25_0066',
  'Box001_Material_#25_0083',
  'Box001_Material_#25_0061',
  'Box001_Material_#25_0063',
  'Box001_Material_#25_0062',
  'Box001_Material_#25_0064',
  'Box001_Material_#25_0065',
  'Box001_Material_#25_0067',
  'Box001_Material_#25_0082',
  'Box001_Material_#25_0080',
  'Box001_Material_#25_0079',
  'Box001_Material_#25_0078',
  'Box001_Material_#25_0071',
  'Box001_Material_#25_0070',
  'Box001_Material_#25_0076',
  'Box001_Material_#25_0077',
  'Box001_Material_#25_0075',
  'Box001_Material_#25_0074',
  'Box001_Material_#25_0072',
  'Box001_Material_#25_0073',
  'Box001_Material_#25_0089',
  'Box001_Material_#25_0001',
  'Box001_Material_#25_0003',
  'Box001_Material_#25_0002',
  'Box001_Material_#25_0004',
  'Box001_Material_#25_0005',
  'Box001_Material_#25_0081',
  'Box001_Material_#25_0088',
  'Box001_Material_#25_0101',
  'Box001_Material_#25_0191',
  'Box001_Material_#25_0007',
  'Box001_Material_#25_0006',
  'Box001_Material_#25_0',
  'Box001_Material_#25_0008',
  'Box001_Material_#25_0009',
  'Box001_Material_#25_0011',
  'Box001_Material_#25_0010',
  'Box001_Material_#25_0012',
  'Box001_Material_#25_0013',
  'Box001_Material_#25_0195',
  'Box001_Material_#25_0194',
  'Box001_Material_#25_0192',
  'Box001_Material_#25_0193',
  'Box001_Material_#25_0190',
  'Box001_Material_#25_0277',
  'Box001_Material_#25_0189',
  'Box001_Material_#25_0187',
  'Box001_Material_#25_0186',
  'Box001_Material_#25_0184',
  'Box001_Material_#25_0185',
  'Box001_Material_#25_0183',
  'Box001_Material_#25_0182',
  'Box001_Material_#25_0168',
  'Box001_Material_#25_0169',
  'Box001_Material_#25_0281',
  'Box001_Material_#25_0170',
  'Box001_Material_#25_0172',
  'Box001_Material_#25_0173',
  'Box001_Material_#25_0175',
  'Box001_Material_#25_0174',
  'Box001_Material_#25_0176',
  'Box001_Material_#25_0177',
  'Box001_Material_#25_0179',
  'Box001_Material_#25_0178',
  'Box001_Material_#25_0180',
  'Box001_Material_#25_0181',
  'Box001_Material_#25_0167',
  'Box001_Material_#25_0166',
  'Box001_Material_#25_0164',
  'Box001_Material_#25_0165',
  'Box001_Material_#25_0163',
  'Box001_Material_#25_0162',
  'Box001_Material_#25_0160',
  'Box001_Material_#25_0161',
  'Box001_Material_#25_0159',
  'Box001_Material_#25_0158',
  'Box001_Material_#25_0156',
  'Box001_Material_#25_0157',
  'Box001_Material_#25_0155',
  'Box001_Material_#25_0154',
  'Box001_Material_#25_0140',
  'Box001_Material_#25_0141',
  'Box001_Material_#25_0143',
  'Box001_Material_#25_0142',
  'Box001_Material_#25_0144',
  'Box001_Material_#25_0145',
  'Box001_Material_#25_0147',
  'Box001_Material_#25_0146',
  'Box001_Material_#25_0148',
  'Box001_Material_#25_0149',
  'Box001_Material_#25_0151',
  'Box001_Material_#25_0150',
  'Box001_Material_#25_0152',
  'Box001_Material_#25_0153',
  'Box001_Material_#25_0126',
  'Box001_Material_#25_0125',
  'Box001_Material_#25_0124',
  'Box001_Material_#25_0122',
  'Box001_Material_#25_0123',
  'Box001_Material_#25_0121',
  'Box001_Material_#25_0120',
  'Box001_Material_#25_0118',
  'Box001_Material_#25_0119',
  'Box001_Material_#25_0117',
  'Box001_Material_#25_0116',
  'Box001_Material_#25_0114',
  'Box001_Material_#25_0115',
  'Box001_Material_#25_0113',
  'Box001_Material_#25_0112',
  'Box001_Material_#25_0209',
  'Box001_Material_#25_0208',
  'Box001_Material_#25_0206',
  'Box001_Material_#25_0207',
  'Box001_Material_#25_0205',
  'Box001_Material_#25_0204',
  'Box001_Material_#25_0202',
  'Box001_Material_#25_0203',
  'Box001_Material_#25_0201',
  'Box001_Material_#25_0200',
  'Box001_Material_#25_0210',
  'Box001_Material_#25_0211',
  'Box001_Material_#25_0213',
  'Box001_Material_#25_0212',
  'Box001_Material_#25_0214',
  'Box001_Material_#25_0215',
  'Box001_Material_#25_0217',
  'Box001_Material_#25_0216',
  'Box001_Material_#25_0027',
  'Box001_Material_#25_0017',
  'Box001_Material_#25_0055',
  'Box001_Material_#25_0097',
  'Box001_Material_#25_0096',
  'Box001_Material_#25_0094',
  'Box001_Material_#25_0095',
  'Box001_Material_#25_0093',
  'Box001_Material_#25_0092',
  'Box001_Material_#25_0090',
  'Box001_Material_#25_0091',
  'Box001_Material_#25_0098',
  'Box001_Material_#25_0099',
  'Box001_Material_#25_0101',
  'Box001_Material_#25_0100',
  'Box001_Material_#25_0102',
  'Box001_Material_#25_0103',
  'Box001_Material_#25_0105',
  'Box001_Material_#25_0104',
  'Box001_Material_#25_0106',
  'Box001_Material_#25_0107',
  'Box001_Material_#25_0086',
  'Box001_Material_#25_0085',
  'Box001_Material_#25_0084',
  'Box001_Material_#25_0087',
  'Box001_Material_#25_0127',
  'Box001_Material_#25_0129',
  'Box001_Material_#25_0128',
  'Box001_Material_#25_0130',
  'Box001_Material_#25_0131',
  'Box001_Material_#25_0133',
  'Box001_Material_#25_0132',
  'Box001_Material_#25_0134',
  'Box001_Material_#25_0135',
  'Box001_Material_#25_0137',
  'Box001_Material_#25_0136',
  'Box001_Material_#25_0138'
];

interface InteractableInfo {
  title: string;
  description: string;
  subtitle?: string;
  showViewer?: boolean;
  variant?: string;
  isMusicPlayer?: boolean;
  floatingLabel?: string; // Add floatingLabel to the interface
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
  // Define album information for Box001_Material entries
  const albumInfo: Record<string, InteractableInfo> = {
    'Box001_Material_#25_0028': {
      title: 'Jazz At Preservation Hall Vol III',
      subtitle: 'Paul Barabrin / Punch Miller\'s Bunch / George Lewis, 1963',
      description: 'Jazz, Atlantic, SD 1410',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0026': {
      title: 'Living New Orleans - 1976',
      subtitle: 'Jim Robinson, 1976',
      description: 'Jazz, Smoky Mary Phonograph Company, SM 1976 J',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0024': {
      title: 'Viva Tirado',
      subtitle: 'El Chicano, 1970',
      description: 'Jazz, MCA Records, MAP/S 3122',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0025': {
      title: 'Chanson',
      subtitle: 'Edith Piaf',
      description: 'Pop, Odeon - EMI',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0023': {
      title: 'The Music Of Duke Ellington Played By Duke Ellington',
      subtitle: 'Duke Ellington, 1973',
      description: 'Jazz, Columbia Special Products, JCL 558',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0014': {
      title: 'This Is Duke Ellington',
      subtitle: 'Duke Ellington, 1970',
      description: 'Jazz, RCA Victor, VPM - 6042',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0020': {
      title: 'Then There Was Light (Volume 1)',
      subtitle: 'Hubert Laws, 1974',
      description: 'Jazz, CTI Records, CTI 6065',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0019': {
      title: 'Benny Goodman\'s Greatest Hits',
      subtitle: 'Benny Goodman, 1966',
      description: 'Jazz, Columbia, CL 2483',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0018': {
      title: 'Hot Cargo',
      subtitle: 'Ernestine Anderson, 1958',
      description: 'Jazz, Mercury, MG 20354',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0029': {
      title: 'Excerpts From The Belafonte Carnegie Hall',
      subtitle: 'Harry Belafonte, 1959',
      description: 'Pop, RCA, SVAS 1002',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0031': {
      title: 'Te Lo Prometo',
      subtitle: 'Rosa Virginia Chacin, 1980',
      description: 'Folklore, CADAFE',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0030': {
      title: 'Grandes Voces Femeninas de Venezuela',
      subtitle: 'Varios',
      description: 'Folklore, Saviluz, 3379',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0032': {
      title: 'Grandes Voces de Venezuela',
      subtitle: 'Varios, 1977',
      description: 'Folklore, Saviluz, 3377',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0033': {
      title: 'Grandes Voces de Venezuela, Vol II',
      subtitle: 'Varios',
      description: 'Folklore',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0035': {
      title: 'Canciones Criollas',
      subtitle: 'Simón Díaz, 1978',
      description: 'Folklore, Palacio, LPS - 66.384',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0034': {
      title: 'Venezuela Pura',
      subtitle: 'Nelson Hernandez',
      description: 'Folklore',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0036': {
      title: 'Voces de Oro de Venezuela',
      subtitle: 'Olga Teresa Machado',
      description: 'Folklore, VeneVox, BL-37',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0037': {
      title: 'Grupo Raíces de Venezuela',
      subtitle: 'Grupo Raíces, 1977',
      description: 'Folklore, Disqueras Unidas, LPS-001',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0039': {
      title: 'Navidades con Mercedes Sosa',
      subtitle: 'Mercedes Sosa, 1970',
      description: 'Folklore, Phillips, 6347015',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0038': {
      title: 'Grandes Golpes Tocuyanos de Venezuela',
      subtitle: 'Voces de Lara, 1977',
      description: 'Folklore, Saviluz, 3388',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0054': {
      title: 'Estudiantina AVIEM',
      subtitle: 'Estudiantina AVIEM',
      description: 'Folklore',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0052': {
      title: 'Nueva Dialéctica Folklorica Regional',
      subtitle: 'Grupo Collar de Perlas, 1975',
      description: 'Folklore, Polydor, 30177',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0053': {
      title: 'Las Grandes Voces Canta A Juan Vicente Torrealba Vol. I',
      subtitle: 'Varios, 1977',
      description: 'Folklore, Saviluz, 3387',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0051': {
      title: 'Instrumentales de Venezuela',
      subtitle: 'Varios',
      description: 'Folklore, Saviluz, LP - 3381',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0050': {
      title: 'Grupo Jarana',
      subtitle: 'Grupo Jarana',
      description: 'Folklore - Gaita',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0048': {
      title: 'Grandes Valses Populares de Venezuela',
      subtitle: 'Orquesta Galante de Venezuela, 1977',
      description: 'Folklore, Saviluz, 3383',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0049': {
      title: "I'll Never Fall In Love Again",
      subtitle: 'Dionne Warwick, 1970',
      description: 'Soul, Scepter Records, SPS 581',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0047': {
      title: 'Arpa Latina Bailable',
      subtitle: 'Varios',
      description: 'Folklore, Saviluz',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0046': {
      title: 'Roberta Flack & Donny Hathaway',
      subtitle: 'Roberta Flack & Donny Hathaway, 1972',
      description: 'Soul, Atlantic, SD 7216',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0044': {
      title: 'Arpa de Ensueño',
      subtitle: 'Recopilatorio',
      description: 'Folklore',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0045': {
      title: 'Newport In New York 72 - The Soul Sessions, Vol 6',
      subtitle: 'Varios, 1972',
      description: 'Soul, Cobblestone, CST - 9028',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0056': {
      title: 'Rimas y Cantos para la OPEP',
      subtitle: 'Coro de Conciertos Universidad Central de Venezuela',
      description: 'Folklore',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0057': {
      title: 'Grandes Merengues de Venezuela',
      subtitle: 'Freddy León, 1977',
      description: 'Folklore, Saviluz, 3385',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0059': {
      title: 'Benito Di Paula',
      subtitle: 'Benito Di Paula, 1982',
      description: 'Brazilian, Warner Bros, BR 26.070',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0058': {
      title: 'It Feels So Good',
      subtitle: 'Manhattans, 1977',
      description: 'Soul, Columbia, PC 34450',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0060': {
      title: 'Shaft',
      subtitle: 'Isaac Hayes, 1972',
      description: 'Soul, Stax, 100.102-2',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0066': {
      title: 'Belafonte Sings Of Love',
      subtitle: 'Harry Belafonte, 1968',
      description: 'Pop, RCA, LPVS - 7673',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0083': {
      title: 'Los hermanos Chirinos y su arpa latina',
      subtitle: 'Los hermanos Chirinos',
      description: 'Folklore',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0061': {
      title: 'Fast Car',
      subtitle: 'Tracy Chapman, 1989',
      description: 'Folk, Sonográfica, 960774-1',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0063': {
      title: 'Aretha Live at Fillmore West',
      subtitle: 'Aretha Franklin, 1971',
      description: 'Soul, Atlantic, SD 7205',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0062': {
      title: 'Gladys Knight & The Pips',
      subtitle: 'Gladys Knight & The Pips, 1975',
      description: 'Soul, Buddah Records, BDS 5639',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0064': {
      title: 'Writer: Carole King',
      subtitle: 'Carole King, 1970',
      description: 'Folk, A&M Records, LPS-77851',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0065': {
      title: 'Here I Am',
      subtitle: 'Dionne Warwick, 1965',
      description: 'Soul, Scepter Records, S531',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0067': {
      title: 'Aretha Franklin Spirit in the dark',
      subtitle: 'Aretha Franklin, 1982',
      description: 'Soul, Atlantic, SD 8265',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0082': {
      title: 'Roberto Carlos 1979',
      subtitle: 'Roberto Carlos, 1979',
      description: 'Pop, CBS, 230045',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0080': {
      title: 'Querido Pablo',
      subtitle: 'Pablo Milanes, 1985',
      description: 'Folk - Nueva Cancion, Egrem, LD-XD-302485-II',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0079': {
      title: 'Roberto Carlos e Erasmo Carlos',
      subtitle: 'Roberto Carlos & Erasmo Carlos',
      description: 'Pop, Brazil',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0078': {
      title: 'O Melhor De Altemar Dutra',
      subtitle: 'Altemar Dutra, 1982',
      description: 'Brazilian, Som Livre, 4036263',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0071': {
      title: 'Sambas De Enredo Das Escolas De Samba Do Grupo 1A - Carnaval 83',
      subtitle: 'Varios, 1982',
      description: 'Brazilian, Top Tape, 5036017',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0070': {
      title: 'Crossroads',
      subtitle: 'Tracy Chapman, 1989',
      description: 'Folk, Elektra, 55013',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0076': {
      title: '… Nothing Like The Sun',
      subtitle: 'Sting, 1987',
      description: 'Pop, A M Records, 500019-L',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0077': {
      title: 'Makeba!',
      subtitle: 'Miriam Makeba, 1968',
      description: 'Folk, Reprise Records, RS 6310',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0075': {
      title: 'Dyango',
      subtitle: 'Dyango, 1986',
      description: 'Pop, EMI, EMI-4564',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0074': {
      title: 'Dionne Warwick In Paris',
      subtitle: 'Dionne Warwick, 1966',
      description: 'Soul, Scepter Records, SRM 534',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0072': {
      title: 'Roberto Carlos',
      subtitle: 'Roberto Carlos, 1975',
      description: 'Pop, CBS, 230002',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0073': {
      title: 'The Best Of Buffy Sainte-Marie Vol II',
      subtitle: 'Buffy Sainte-Marie, 1971',
      description: 'Folk, Vanguard, VSD - 33/34',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0089': {
      title: 'Sambas De Enredo Das Escolas De Samba Do Grupo 1A - Carnaval 80',
      subtitle: 'Varios, 1979',
      description: 'Brazilian, Top Tape, 5036007',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0001': {
      title: 'Whitney Houston',
      subtitle: 'Whitney Houston, 1985',
      description: 'Disco, Arista, 7830',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0003': {
      title: 'Profana',
      subtitle: 'Gal Costa, 1985',
      description: 'Brazilian, RCA, 102-01932',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0002': {
      title: 'Palco Iluminado',
      subtitle: 'Maria Bethania, 1985',
      description: 'Brazilian, Phillips, 82667-1',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0004': {
      title: 'Joanna',
      subtitle: 'Joanna, 1986',
      description: 'Brazilian, RCA, 1030676',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0005': {
      title: 'Les Grandes Chansons de Mireille Mathieu Vol I',
      subtitle: 'Mireille Mathieu, 1982',
      description: 'Pop, Ariola, 102-13112',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0081': {
      title: 'Aretha\'s Gold',
      subtitle: 'Aretha Franklin, 1969',
      description: 'Soul, Atlantic, SD 8227',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0088': {
      title: 'Vidamor',
      subtitle: 'Joanna, 1982',
      description: 'Brazilian, RCA, 1030543',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0191': {
      title: 'The Sensitive Sound of Dionne Warwick',
      subtitle: 'Dionne Warwick, 1965',
      description: 'Soul, Scepter Records, (S) 528',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0007': {
      title: 'Rhymes & Reasons',
      subtitle: 'Carole King, 1972',
      description: 'Folk, A M Records, LPS - 88.050',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0006': {
      title: 'Diana! (Original TV Soundtrack)',
      subtitle: 'Diana Ross and various artists, 1971',
      description: 'Soul, Motown, MS 719',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0': {
      title: 'Un Momento Contigo',
      subtitle: 'Rosa Virginia Chacin - Chelique Sarabia, 1964',
      description: 'Folklore, Palacio, LP 6143',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0008': {
      title: 'Tapestry',
      subtitle: 'Carole King, 1974',
      description: 'Folk, Ode Records, LPS - 77.796',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0009': {
      title: 'This Girl\'s In Love With You',
      subtitle: 'Aretha Franklin, 1970',
      description: 'Soul, Atlantic, SD 8248',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0011': {
      title: 'De mi cuba para ti',
      subtitle: 'Caridad Cuervo, 1987',
      description: 'Salsa, Siboney, LD-343',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0010': {
      title: '100 Anos de Carnaval',
      subtitle: 'Banda Do Canecao, 1973',
      description: 'Brazilian, Polydor, 2939101, 3 LP Box Set',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0012': {
      title: 'Inspiración',
      subtitle: 'Lola Beltrán',
      description: 'Ranchera',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0013': {
      title: 'Lo Mejor de Lucha Reyes',
      subtitle: 'Lucha Reyes, 1964',
      description: 'Ranchera, Cofre, MKLA-35',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0195': {
      title: 'Los Tupamaros Cantan',
      subtitle: 'Los Tupamaros, 1972',
      description: 'Folk - Nueva Cancion, IRT(2), LMX - 38',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0194': {
      title: 'Llanto de Quenas',
      subtitle: 'Llanto de Quenas, 1972',
      description: 'Folklore, Phillips, 635 011',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0192': {
      title: 'Canciones de Patria Nueva / Corazón de Bandido',
      subtitle: 'Angel Parra, 1971',
      description: 'Folk - Nueva Cancion, Peña De Los Parra, DCP - 18',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0193': {
      title: 'I\'m Just a Prisoner',
      subtitle: 'Candi Staton',
      description: 'Soul, Capitol',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0190': {
      title: 'María Jiménez A Tu Cuerpo',
      subtitle: 'María Jiménez, 1992',
      description: 'Folklore, Coliseum, D-0191',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0277': {
      title: 'Olga Teresa Machado En la Dimensión de Venezuela',
      subtitle: 'Olga Teresa Machado',
      description: 'Folklore, Venezuela',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0189': {
      title: 'Los Discos De Oro',
      subtitle: 'Lucha Villa, 1974',
      description: 'Ranchera, Musart, 1636',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0187': {
      title: 'Dezembros',
      subtitle: 'Maria Bethânia, 1986',
      description: 'Brazilian, RCA Victor, 1100026',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0186': {
      title: 'Omara Canta el Son',
      subtitle: 'Omara Portuondo, 1983',
      description: 'Salsa, Areito, LD-4071',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0184': {
      title: 'Nostalgias',
      subtitle: 'Gina León, 1989',
      description: 'Salsa, Areito, LD-4603',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0185': {
      title: 'Plácido Paloma Por Fin Juntos! (En Vivo)',
      subtitle: 'Plácido Domingo & Paloma San Basilio, 1991',
      description: 'Pop, Hispa Vox',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0183': {
      title: 'Mel',
      subtitle: 'Maria Bethânia, 1979',
      description: 'Brazilian, Phillips, 6349433',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0182': {
      title: 'Así Solo',
      subtitle: 'Lola Beltrán, 1968',
      description: 'Ranchera, Peerless, 1570',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0168': {
      title: 'Inti-Illimani',
      subtitle: 'Inti-Illimani, 1969',
      description: 'Folk - Nueva Cancion, Jota Jota, JJL-05',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0169': {
      title: 'CUBA',
      subtitle: 'Various Artists',
      description: 'Folk - Nueva Cancion, Dicimoveca',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0281': {
      title: 'Comienzo El Día',
      subtitle: 'Noel Nicola, 1977',
      description: 'Folk - Nueva Cancion, Discos NCL, LP-0022',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0170': {
      title: 'Puro Norte Con Lucha Villa',
      subtitle: 'Lucha Villa, 1971',
      description: 'Ranchera, Musart, 1518',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0172': {
      title: 'La Reina de la Canción Ranchera',
      subtitle: 'Lola Beltrán, 1968',
      description: 'Ranchera, Peerless, AP-22',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0173': {
      title: 'Simone Ao Vivo (Show Gravado no Canecao em 30-12-79)',
      subtitle: 'Simone, 1980',
      description: 'Brazilian, EMI, 31C 064 422857',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0175': {
      title: 'Fruto e Raiz',
      subtitle: 'Alcione, 1986',
      description: 'Brazilian, RCA Victor, 7100673',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0174': {
      title: 'Canciones y Huapangos',
      subtitle: 'Lola Beltrán, 1964',
      description: 'Ranchera, Peerless',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0176': {
      title: 'Lola Beltran Concierto en Vivo',
      subtitle: 'Lola Beltrán, 1978',
      description: 'Ranchera, Disco Gas',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0177': {
      title: 'Chavela Vargas con Antonio Bribiesca',
      subtitle: 'Chavela Vargas, 1975',
      description: 'Ranchera, Orfeon, LP-JM-140',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0179': {
      title: 'Chavela Vargas',
      subtitle: 'Chavela Vargas, 1963',
      description: 'Ranchera, RCA Victor, MKL 1363',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0178': {
      title: 'Voz de México',
      subtitle: 'Maria de Lourdes, 1968',
      description: 'Ranchera, RCA Victor, MKL/S - 1775',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0180': {
      title: 'A Mexico',
      subtitle: 'Julio Iglesias, 1975',
      description: 'Ranchera, CBS, DCS 841',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0181': {
      title: 'La Canción, un Arma de La Revolución',
      subtitle: 'Varios',
      description: 'Folk - Nueva Cancion, Areito, LDS-3464',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0167': {
      title: 'Basta',
      subtitle: 'Quilapayún, 1969',
      description: 'Folk - Nueva Cancion, Jota Jota, JJL-07',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0166': {
      title: 'El Derecho de Vivir en Paz',
      subtitle: 'Victor Jara, 2016',
      description: 'Folk - Nueva Cancion, Jota Jota, JJL-11',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0164': {
      title: 'Victor Heredia Canta Pablo Neruda',
      subtitle: 'Victor Heredia, 1983',
      description: 'Folk - Nueva Cancion, Phillips, 81037115',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0165': {
      title: 'Poemas de Federico García Lorca y Luis De Gongora',
      subtitle: 'Paco Ibañez, 1972',
      description: 'Folk - Nueva Cancion, Polydor, 30037',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0163': {
      title: 'Mi Chile Lindo',
      subtitle: 'Varios, 1969',
      description: 'Folklore, RCA, CML-2763-X',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0162': {
      title: 'Sonerito',
      subtitle: 'Grupo Sierra Maestra, 1987',
      description: 'Salsa, Areito, LD-4204',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0160': {
      title: 'Se Acabo',
      subtitle: 'José De Molina, 1976',
      description: 'Folk - Nueva Cancion, Nueva Voz Latinoamericana, JS-07',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0161': {
      title: 'Neruda Relata: Cuando, Donde Y El Por Que De Sus Poemas',
      subtitle: 'Pablo Neruda',
      description: 'Audio, Groove, GL-80011',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0159': {
      title: 'La Maldición De Malinche',
      subtitle: 'Gabino Palomares, 1975',
      description: 'Folk - Nueva Cancion, Discos Pueblo, DP 1028',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0158': {
      title: '4 de noviembre de 1971: Primer año de Gobierno Popular',
      subtitle: 'Salvador Allende, 1971',
      description: 'Folk - Nueva Cancion, IRT, IL-101',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0156': {
      title: 'Versos de José Martí',
      subtitle: 'Pablo Milanes, 1976',
      description: 'Folk - Nueva Cancion, Discos Pueblo, DP 1018',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0157': {
      title: 'Grupo de Experimentación Sonora Del ICAIC',
      subtitle: 'Grupo de Experimentación Sonora Del ICAIC, 1973',
      description: 'Folk - Nueva Cancion, Areito, LD-3401',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0155': {
      title: 'Amaury Pérez',
      subtitle: 'Amaury Pérez, 1976',
      description: 'Folk - Nueva Cancion, Areito, MC 0967',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0154': {
      title: 'Vivir Como El',
      subtitle: 'Quilapayún, 1971',
      description: 'Folk - Nueva Cancion, Dicap, JJL-12',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0140': {
      title: 'Canto General',
      subtitle: 'Pablo Neruda, Aparcoa, Marés González, 1979',
      description: 'Folk - Nueva Cancion, Foton, LPF 005',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0141': {
      title: 'A Bayamo en coche',
      subtitle: 'Son 14, 1980',
      description: 'Salsa, Integra, EG - 13.039',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0143': {
      title: 'Conjunto De Musica Popular Tiempo Nuevo de Valparaiso',
      subtitle: 'Tiempo Nuevo, 1970',
      description: 'Folk - Nueva Cancion, DICAP, DCP - 10',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0142': {
      title: 'Cuando Amanece el Día',
      subtitle: 'Angel Parra, 1972',
      description: 'Folk - Nueva Cancion, Peña De Los Parra, DCP-36',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0144': {
      title: 'Oscar Chavéz Interpreta Canciones Originales de Rafael Elizondo',
      subtitle: 'Oscar Chavéz, 1976',
      description: 'Folklore, Polydor, LPR-16196',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0145': {
      title: 'Basta',
      subtitle: 'Quilapayún, 1969',
      description: 'Folk - Nueva Cancion, Promecin, LP-004',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0147': {
      title: 'A Ti',
      subtitle: 'Tito Fernández, 1973',
      description: 'Folk - Nueva Cancion, COLOR (4), CLRM - 1505',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0146': {
      title: 'Cantando Por Amor',
      subtitle: 'Isabel Parra, 1969',
      description: 'Folk - Nueva Cancion, Peña De Los Parra, Dicap-1',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0148': {
      title: 'Señor del Floklore',
      subtitle: 'Eduardo Falú',
      description: 'Folklore, Serie DM Difusión Musical, 70263',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0149': {
      title: 'La Nueva Canción Chilena',
      subtitle: 'Varios, 1972',
      description: 'Folk - Nueva Cancion, DICAP, DCP - 39',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0151': {
      title: 'Orquesta Ritmo Oriental (No se ahogo)',
      subtitle: 'Orquesta Ritmo Oriental, 1987',
      description: 'Salsa, Arieto, LD-4112',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0150': {
      title: 'Pancho Alonso y sus Pachucos',
      subtitle: 'Pancho Alonso y sus Pachucos, 1971',
      description: 'Salsa, Areito, LD-3337',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0152': {
      title: 'Música de Manuel Corona',
      subtitle: 'Duo Hermanas Martí',
      description: 'Folk - Nueva Cancion, Guamá, LDG-2011',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0153': {
      title: 'Santa María de Iquique',
      subtitle: 'Quilapayún',
      description: 'Folk - Nueva Cancion',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0126': {
      title: 'X Viet-Nam',
      subtitle: 'Quilapayún, 1968',
      description: 'Folk - Nueva Cancion, Jota Jota, JJL-01',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0125': {
      title: 'Pongo en tus manos abiertas',
      subtitle: 'Victor Jara, 1969',
      description: 'Folk - Nueva Cancion, Jota Jota, JJL-03',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0124': {
      title: 'Pasaporte',
      subtitle: 'Orquesta Broadway, 1976',
      description: 'Salsa, Coco Records, CLP 126',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0122': {
      title: 'Vivencias',
      subtitle: 'Charanga Tipica de Guillermo Rubalcaba, 1988',
      description: 'Salsa, Areito, LD-4435',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0123': {
      title: 'Cha Cha Cha',
      subtitle: 'Orquesta Aragón, 1978',
      description: 'Salsa, RCA, MILS-4316',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0121': {
      title: 'Los Van Van',
      subtitle: 'Los Van Van, 1987',
      description: 'Salsa, Areito, LD-4431',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0120': {
      title: 'Beny Moré Vol. XI',
      subtitle: 'Beny More, 1988',
      description: 'Salsa, Areito, LD-4064',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0118': {
      title: 'Tierra en trance',
      subtitle: 'Irakere, 1985',
      description: 'Salsa, Areito, LPS-99.856',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0119': {
      title: 'Pio Leiva Grupo Los Kimbos',
      subtitle: 'Pio Leiva Grupo Los Kimbos, 1988',
      description: 'Salsa, Areito, LD-4469',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0117': {
      title: 'Los Compadres',
      subtitle: 'Los Compadres, 1971',
      description: 'Salsa, Areito, LDA-3327',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0116': {
      title: 'Wednesday Morning, 3 A.M.',
      subtitle: 'Simon and Garfunkel, 1968',
      description: 'Folk, CBS, CS9049',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0114': {
      title: 'Abraxas',
      subtitle: 'Santana, 1970',
      description: 'Rock, CBS, CBS-10.028',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0115': {
      title: 'Jimi Hendrix 27 Nov',
      subtitle: 'Jimi Hendrix, 1971',
      description: 'Rock, Polydor, 7.202-2',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0113': {
      title: 'Isle of Wight',
      subtitle: 'Jimi Hendrix, 1971',
      description: 'Rock, Polydor, LP -7.233',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0112': {
      title: 'Hangin\' Out',
      subtitle: 'Joe Cuba Sextette, 1964',
      description: 'Salsa, Tico Records, LP-1112',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0209': {
      title: 'Beny Moré Vol. VII',
      subtitle: 'Beny Moré, 1977',
      description: 'Son, TH-Rodven, RLP-830',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0208': {
      title: 'Y Diez Años Van',
      subtitle: 'Carlos Puebla y sus Tradicionales, 1969',
      description: 'Folk - Nueva Cancion, Jota Jota, JJL-04',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0206': {
      title: 'Tito Rodriguez Returns to the Palladium',
      subtitle: 'Tito Rodriguez, 1961',
      description: 'Salsa, United Artists Records, UAL 3141',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0207': {
      title: 'Irakere',
      subtitle: 'Irakere, 1981',
      description: 'Salsa',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0205': {
      title: 'Tito Puente Swings / The Exciting Lupe Sings',
      subtitle: 'Tito Puentes / La Lupe, 1965',
      description: 'Salsa, Tico Records, SLP1121',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0204': {
      title: 'The Singer',
      subtitle: 'Cheo Feliciano, 1976',
      description: 'Salsa, Vaya Records ; FANIA Records, JMV48',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0202': {
      title: 'Roberto Carlos',
      subtitle: 'Roberto Carlos, 1982',
      description: 'Pop, CBS, 230075',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0203': {
      title: 'Jump Up Calypso',
      subtitle: 'Harry Belafonte, 1961',
      description: 'Pop, RCA, LSP 2388',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0201': {
      title: 'TELENORMA',
      subtitle: 'TELENORMA',
      description: 'Folklore',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0200': {
      title: 'Canciones de Venezuela y America',
      subtitle: 'Jesús Sevillano / Cuarteto Rafel Suarez, 1972',
      description: 'Folklore, Polydor',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0210': {
      title: 'El Diferente',
      subtitle: 'Ricardo Ray y Bobby Cruz, 1970',
      description: 'Salsa, UA Latino, LS 61054',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0211': {
      title: 'El Bestial Sonido de Ricardo Ray y Bobby Cruz',
      subtitle: 'Ricardo Ray y Bobby Cruz, 1971',
      description: 'Salsa, Vaya Records, VS-1',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0213': {
      title: 'Este es Ismael Miranda',
      subtitle: 'Ismael Miranda, 1975',
      description: 'Salsa, FANIA Records, LPS-88553',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0212': {
      title: 'Alicia Maguiña',
      subtitle: 'Alicia Maguiña, 1971',
      description: 'Folklore, Odeon, ELD - 2106',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0214': {
      title: 'La Síncopa Criolla',
      subtitle: 'La Síncopa Criolla',
      description: 'Folklore, La discoteca CA',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0215': {
      title: 'Light As A Feather',
      subtitle: 'Chick Corea And Return To Forever, 1973',
      description: 'Jazz, Polydor, PD-5525',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0217': {
      title: 'Benny Goodman\'s Greatest Hits',
      subtitle: 'Benny Goodman, 1966',
      description: 'Jazz, Columbia, CL 2483',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0216': {
      title: 'Motivos - Pto Cabello',
      subtitle: 'Italo Piazzolante',
      description: 'Folklore, Producciones JUNIOR CA',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0027': {
      title: 'The Happy Horns Of Clark Terry',
      subtitle: 'Clark Terry, 1964',
      description: 'Jazz, Impulse!, AS-64',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0017': {
      title: 'Nights At The Keystone',
      subtitle: 'Dexter Gordon, 1986',
      description: 'Jazz, Blue Note, BN - 26409',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0055': {
      title: 'Carnegie Hall Bird & Pres',
      subtitle: 'Charlie Parker & Lester Young',
      description: 'Jazz, Live at Carnegie Hall',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0097': {
      title: 'La música de un solo pueblo',
      subtitle: 'Un solo pueblo, 1981',
      description: 'Folklore, Promus, LPS - 202805',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0096': {
      title: 'Ka Ka Do Kofi',
      subtitle: 'African People, 1972',
      description: 'Soul, Polydor, 30009',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0094': {
      title: 'Sweet Hands',
      subtitle: 'David Liebman, 1975',
      description: 'Jazz, Horizon, SP-702',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0095': {
      title: 'Ten Cities',
      subtitle: 'Maurice Evans Reads From Life International, 1961',
      description: 'Audio, Time INC, Audio de una lectura',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0093': {
      title: 'Música, Poemas y Cantares',
      subtitle: 'Colegio de Ingenieros',
      description: 'Folklore, Buen Estado',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0092': {
      title: 'Acima de Tudo Música Brasileira',
      subtitle: 'Varios, 1978',
      description: 'Brazilian, Odeon, 31C 062 421191',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0090': {
      title: 'Agua Viva (Trilha Sonora Original Da Novela)',
      subtitle: 'Varios, 1980',
      description: 'Brazilian, Som Livre, 4036204',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0091': {
      title: 'Nossos Momentos',
      subtitle: 'Maria Bethania, 1982',
      description: 'Brazilian, Phillips, 6328 526',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0098': {
      title: 'Cantos de Venezuela',
      subtitle: 'Soledad Bravo, 1974',
      description: 'Folklore, Polydor, Polydor - 30 156',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0099': {
      title: 'Apenas Mulher',
      subtitle: 'Angela Maria, 1880',
      description: 'Brazilian, Odeon, 31C 062 421192',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0101': {
      title: 'The Blues Are Brewin',
      subtitle: 'Billie Holiday, 1958',
      description: 'Jazz, Decca, DL 8701',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0100': {
      title: 'Amparo Ochoa Vol 2',
      subtitle: 'Amparo Ochoa, 1977',
      description: 'Folklore, Discos Pueblo, DP - 1024',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0102': {
      title: 'Aretha Franklin Greatest Hits Vol II',
      subtitle: 'Aretha Franklin, 1968',
      description: 'Soul, Columbia, CS 9061',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0103': {
      title: 'Roberta Flack',
      subtitle: 'Roberta Flack, 1973',
      description: 'Soul, Atlantic, 50025',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0105': {
      title: 'Julian And John',
      subtitle: 'Julian Bream And John William, 1972',
      description: 'Música Clásica, RCA, LSC-3257',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0104': {
      title: 'Alibi',
      subtitle: 'Maria Bethania, 1978',
      description: 'Brazilian, Phillips, 6349405',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0106': {
      title: 'Fuego Del Ande',
      subtitle: 'Yma Sumac, 1959',
      description: 'Folklore, Capitol Records, T 1169',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0107': {
      title: "I'll Never Fall In Love Again",
      subtitle: 'Dionne Warwick, 1970',
      description: 'Soul, Scepter Records, SPS 581',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0086': {
      title: 'All directions',
      subtitle: 'The Temptations, 1972',
      description: 'Soul, Gordy, G 962L',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0085': {
      title: '2nd Anniversary',
      subtitle: 'Gladys Knight & The Pips, 1975',
      description: 'Soul, Buddah Records, BDS 5639',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0084': {
      title: 'Soul Men',
      subtitle: 'Sam And Dave, 1967',
      description: 'Soul, Stax, S 725',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0087': {
      title: 'Simone Ao Vivo (Show Gravado no Canecao em 30-12-79)',
      subtitle: 'Simone, 1980',
      description: 'Brazilian, EMI, 31C 064 422857',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0127': {
      title: 'Wanted Dead Or Alive (Bang! Bang! Push, Push, Push)',
      subtitle: 'Joe Cuba Sextette, 1966',
      description: 'Salsa, Tico Records, LP 1146',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0129': {
      title: 'Mi Chile Lindo Vol 2',
      subtitle: 'Varios',
      description: 'Folklore',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0128': {
      title: 'El Temucano',
      subtitle: 'Tito Fernández, 1971',
      description: 'Folk - Nueva Cancion, Peña De Los Parra, LPP-102',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0130': {
      title: 'La Población',
      subtitle: 'Victor Jara, 1972',
      description: 'Folk - Nueva Cancion, Dicap, JJL-14',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0131': {
      title: 'Se Acabo',
      subtitle: 'José De Molina, 1976',
      description: 'Folk - Nueva Cancion, Nueva Voz Latinoamericana, JS-07',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0133': {
      title: 'Los Curacas',
      subtitle: 'Curacas',
      description: 'Folk - Nueva Cancion, Promecin, LP-003',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0132': {
      title: 'Comin\' At You',
      subtitle: 'Joe Cuba Sextette, 1965',
      description: 'Salsa, SEECO Records, SCLP 9268',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0134': {
      title: 'Mucho mejor',
      subtitle: 'Ruben Blades, 1984',
      description: 'Salsa, FANIA Records, LPS-99.812',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0135': {
      title: 'De nuevo con rumbavana',
      subtitle: 'Rumbavana, 1988',
      description: 'Salsa, Sinboney, LD-414',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0137': {
      title: 'La época de oro del cha cha cha',
      subtitle: 'Los Macao, 1977',
      description: 'Salsa, Globo, GL 50025',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0136': {
      title: 'Sones-Boleros',
      subtitle: 'Conjunto Cyarey, 1987',
      description: 'Salsa, Sinboney, LD-264',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    },
    'Box001_Material_#25_0138': {
      title: 'Los mas grandes exitos bailables de siempre',
      subtitle: 'Varios, 1981',
      description: '',
      showViewer: true,
      variant: 'musicDisc',
      floatingLabel: 'bzk vinyl collection'
    }
  };

  if (albumInfo[name]) {
    return albumInfo[name];
  }

  // Rest of the existing getObjectInfo function logic
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
  '101228': {
    title: 'BAD BUNNY',
    description: 'Made by Alejandro',
    subtitle: 'March 2025',
    showViewer: true,
    variant: 'BAD BUNNY'
    },
  '101229': {
    title: 'SNACKS',
    description: 'Made by Alejandro',
    subtitle: 'April 2025',
    showViewer: true,
    variant: 'SNACKS'
    },
  '101230': {
    title: 'KAKASHI',
    description: 'Made by Alejandro',
    subtitle: 'April 2025',
    showViewer: true,
    variant: 'KAKASHI'
    },
  '101231': {
    title: 'DRUID TRAVELER',
    description: 'Made by Alejandro / Head by Haku',
    subtitle: 'May 2025/ Head by Haku)',
    showViewer: true,
    variant: 'DRUID TRAVELER'
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