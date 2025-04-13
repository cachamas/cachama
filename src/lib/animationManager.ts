import { AnimationClip, AnimationMixer, Group, LoopRepeat } from 'three';
import { GLTF } from 'three-stdlib';

export const ENEMY_ANIMATIONS = {
  IDLE: 'rifleidle',
  WALK: 'riflewalk',
  RUN: 'runforward',
  SHOOT: 'shootrifle',
  DEATH: 'dying',
  STRAFE: 'strafing',
} as const;

export const ANIMATION_FILES = {
  [ENEMY_ANIMATIONS.IDLE]: '/animations/rifleidle.glb',
  [ENEMY_ANIMATIONS.WALK]: '/animations/riflewalk.glb',
  [ENEMY_ANIMATIONS.RUN]: '/animations/runforward.glb',
  [ENEMY_ANIMATIONS.SHOOT]: '/animations/shootrifle.glb',
  [ENEMY_ANIMATIONS.DEATH]: '/animations/dying.glb',
  [ENEMY_ANIMATIONS.STRAFE]: '/animations/strafing.glb',
} as const;

type AnimationCache = {
  [key: string]: AnimationClip;
};

class AnimationManager {
  private static instance: AnimationManager;
  private animationCache: AnimationCache = {};
  private mixers: Map<string, AnimationMixer> = new Map();
  private currentActions: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    return AnimationManager.instance;
  }

  async preloadAnimations(loadGLTF: (path: string) => Promise<GLTF>) {
    try {
      const loadPromises = Object.entries(ANIMATION_FILES).map(async ([name, path]) => {
        const gltf = await loadGLTF(path);
        if (gltf.animations[0]) {
          this.animationCache[name] = gltf.animations[0].clone();
        }
      });

      await Promise.all(loadPromises);
      console.log('All animations preloaded successfully');
    } catch (error) {
      console.error('Error preloading animations:', error);
    }
  }

  createMixerForEnemy(id: string, model: Group): AnimationMixer {
    const mixer = new AnimationMixer(model);
    this.mixers.set(id, mixer);
    return mixer;
  }

  playAnimation(id: string, animationName: string, fadeTime = 0.2) {
    const mixer = this.mixers.get(id);
    if (!mixer || !this.animationCache[animationName]) return;

    // Stop current animation
    const currentAnim = this.currentActions.get(id);
    if (currentAnim === animationName) return; // Already playing

    // Create and play new animation
    const clip = this.animationCache[animationName];
    const action = mixer.clipAction(clip);
    
    action.reset()
      .setLoop(LoopRepeat, Infinity)
      .fadeIn(fadeTime)
      .play();

    // Fade out previous animation
    if (currentAnim) {
      const prevAction = mixer.clipAction(this.animationCache[currentAnim]);
      prevAction.fadeOut(fadeTime);
    }

    this.currentActions.set(id, animationName);
  }

  update(delta: number) {
    this.mixers.forEach(mixer => mixer.update(delta));
  }

  cleanupEnemy(id: string) {
    const mixer = this.mixers.get(id);
    if (mixer) {
      mixer.stopAllAction();
      this.mixers.delete(id);
      this.currentActions.delete(id);
    }
  }
}

export const animationManager = AnimationManager.getInstance(); 