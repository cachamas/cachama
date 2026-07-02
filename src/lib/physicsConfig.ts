import * as THREE from 'three';

export const MOVE_SPEED = 40;
export const ROTATION_SPEED = 0.085;
export const JUMP_FORCE = 18;
export const JUMP_COOLDOWN = 250;
export const GRAVITY_ARRAY: [number, number, number] = [0, -40, 0];

export const PLAYER_HEIGHT = 1.5;
export const PLAYER_RADIUS = 1.0;
export const PLAYER_CAMERA_OFFSET = 1.5;
export const MAX_VERTICAL_ANGLE = Math.PI / 2.1;

export const SHOOT_COOLDOWN = 250;

export const FALL_THRESHOLD = 45;
export const MUSIC_FALL_THRESHOLD = 30;
export const OVERWORLD_FALL_THRESHOLD = 14;

export const CONCUSSION_MOVEMENT_PENALTY = 0.2;

export const SPAWN_HEIGHT_OFFSET = 2;
export const LOAD_PROTECTION_TIME = 2000;

export const MOBILE_LOOK_SENSITIVITY = 0.25;
export const MOBILE_HORIZONTAL_SENSITIVITY_MULTIPLIER = 1.3;
export const MOBILE_DEADZONE = 0.1;

export const PLAYER_MASS = 1;


export const PROJECTILE_VELOCITY = 35;
export const PROJECTILE_BOUNCE = 0.5;
export const PROJECTILE_SPREAD = 0.1;
export const PROJECTILE_LIFETIME = 3;
export const PROJECTILE_COLLIDER_HEIGHT = 0.2;
export const PROJECTILE_COLLIDER_RADIUS = 0.3;
export const PROJECTILE_FRICTION = 0.2;
export const PROJECTILE_SCALE = 0.9;

export const HEAVY_MAPS = ['toris', 'gct', 'overworld', 'central'];
export const INITIAL_LOADED_MAP = 'central';

export const TELEPORT_COOLDOWN = 2000;

export const TRIGGER_SIZE: [number, number, number] = [3, 3, 3];
export const GALLERY_RETURN_TRIGGER_SIZE: [number, number, number] = [3, 3, 23];
export const ELEVATOR_POSITION: [number, number, number] = [58.75, 266.27, 25.54];
export const OVERWORLD_RETURN_TRIGGER_POSITION: [number, number, number] = [-92.10, -1.86, -1.13];
export const OVERWORLD_RETURN_TRIGGER_SIZE: [number, number, number] = [2, 3, 2];

export const RETURN_TELEPORTER_POSITIONS = {
  music: [13.62, 42.91, -51.34],
  toris: [-193, -233, 64],
  gct: [-74.95, 39.32, -3.18],
  gallery: [118.02, 4.94, -6.5],
} as const;

export const TELEPORT_TRIGGERS = {
  gallery: [4.84, -2.66, 67.37],
  music: [98.08, -2.66, -0.29],
  toris: [74.85, -3.98, -72.22],
  gct: [4.31, -2.66, -68.89],
} as const;

export const CENTRAL_ENEMY_SPAWNS = [
  { position: [-35, -5, 35], modelIndex: 0 },
  { position: [-27, -8, -32], modelIndex: 1 },
  { position: [38, -8, -33], modelIndex: 2 },
  { position: [36, -8, 31], modelIndex: 3 },
] as const;

export const AMBIENT_LIGHT_COLOR = 0xffffff;
export const AMBIENT_LIGHT_INTENSITY = 0.5;
export const DIRECTIONAL_LIGHT_COLOR = 0xffffff;
export const DIRECTIONAL_LIGHT_INTENSITY = 1;
export const DIRECTIONAL_LIGHT_POSITION: [number, number, number] = [10, 10, 5];

export const INITIAL_VOLUME = 2.0;

export const CENTRAL_TARGET = new THREE.Vector3(3.58, 7.26, -0.04);

export interface SpawnPoint {
  position: [number, number, number];
  rotation: [number, number, number];
}

export const INITIAL_SPAWN_POINTS: Record<string, SpawnPoint> = {
  overworld: {
    position: [-11.28, 262.44, 79.57],
    rotation: [43.48 - 26.48, -43.02 + 25.28, 0],
  },
  central: {
    position: [-85.41, 10, -0.43],
    rotation: [18.22, 269.36, 0],
  },
  gallery: {
    position: [112.01, 7.31, 4.09],
    rotation: [23.14, 64.62 + 180, 0],
  },
  music: {
    position: [8.66, 43.61, -47.84],
    rotation: [11.75, 130.87 + 180, 0],
  },
  toris: {
    position: [-203, -232, 73],
    rotation: [-3.12, 45.85 + 180, 0],
  },
  gct: {
    position: [-67.17, 43.98, -1.00],
    rotation: [15.82, 270.28 + 180, 0],
  },
};

export interface ReturnSpawnPoint {
  position: [number, number, number];
  rotation: [number, number, number];
}

export const RETURN_TO_CENTRAL_SPAWN_POINTS: Record<string, ReturnSpawnPoint> = {
  gallery: {
    position: [4.70, -1.32, 61.82],
    rotation: [21.66, 0.75 + 180, 0],
  },
  music: {
    position: [88.33, -1.31, 0.17],
    rotation: [17.02, 89.96 + 180, 0],
  },
  toris: {
    position: [71.16, -2.57, -66.73],
    rotation: [15.30, 134.82 + 180, 0],
  },
  gct: {
    position: [3.31, -1.32, -61.08],
    rotation: [17.82, 179.85 + 180, 0],
  },
};

export interface PlayerSpawnPoint {
  position: [number, number, number];
  default: { x: number; y: number };
  fromCentral?: { x: number; y: number };
}

export const PLAYER_INITIAL_SPAWN_POINTS: Record<string, PlayerSpawnPoint> = {
  overworld: {
    position: [-81.36, 3.01, -3.32],
    default: { x: 33.40, y: 307.41 },
    fromCentral: { x: 0.68, y: 121.71 },
  },
  central: {
    position: [-81.36, 3.01, -3.32],
    default: { x: 25.84, y: 267.47 },
  },
  gallery: {
    position: [5.10, 8.0, 57.96],
    default: { x: 6.99, y: 71.63 },
  },
  music: {
    position: [91.48, 4.0, 0.60],
    default: { x: 11.75, y: 130.87 },
  },
  toris: {
    position: [-203, -232, 73],
    default: { x: 3.43, y: 134.61 },
  },
  gct: {
    position: [-62.27, 39.12, -2.01],
    default: { x: 15.82, y: 270.28 },
  },
};

export const POST_LOADING_FALL_TOLERANCE = 10;
export const GROUNDED_VELOCITY_THRESHOLD = 0.1;
export const MOUSE_SENSITIVITY_MULTIPLIER = 0.0065;

export const MOBILE_LOOK_ACTIVATION_THRESHOLD = 0.05;
export const MOBILE_LOOK_ROTATION_DELTA_MIN = 0.001;
export const MOBILE_STUCK_CHECK_LIMIT = 10;


