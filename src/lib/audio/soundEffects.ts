import { Howl } from 'howler';

interface SoundEffect {
  id: string;
  howl: Howl;
}

class SoundEffectManager {
  private effects: Map<string, SoundEffect> = new Map();
  private volume: number = 0.5;

  constructor() {
    this.loadSoundEffects();
  }

  private loadSoundEffects() {
    // Add your sound effects here
    this.addEffect('footstep', '/audio/sfx/footstep.mp3');
    this.addEffect('jump', '/audio/sfx/jump.mp3');
    this.addEffect('land', '/audio/sfx/land.mp3');
    this.addEffect('shoot', '/audio/sfx/shoot.mp3');
    this.addEffect('reload', '/audio/sfx/reload.mp3');
    this.addEffect('hit', '/audio/sfx/hit.mp3');
  }

  private addEffect(id: string, src: string) {
    const howl = new Howl({
      src: [src],
      volume: this.volume,
      preload: true,
    });

    this.effects.set(id, { id, howl });
  }

  play(id: string) {
    const effect = this.effects.get(id);
    if (effect) {
      effect.howl.play();
    } else {
      console.warn(`Sound effect "${id}" not found`);
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.effects.forEach(effect => {
      effect.howl.volume(this.volume);
    });
  }

  stop(id: string) {
    const effect = this.effects.get(id);
    if (effect) {
      effect.howl.stop();
    }
  }

  stopAll() {
    this.effects.forEach(effect => {
      effect.howl.stop();
    });
  }
}

export const soundEffects = new SoundEffectManager(); 