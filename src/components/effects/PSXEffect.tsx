import { EffectComposer } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const CMYKMaterial = shaderMaterial(
  {
    tDiffuse: null,
  },
  // vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
  `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Convert to strict CMYK-like palette
      float brightness = max(max(color.r, color.g), color.b);
      vec3 normalized = color.rgb / (brightness + 0.00001);
      
      vec3 KLEIN_BLUE = vec3(0.0, 0.47, 0.75);
      vec3 CYAN = vec3(0.0, 1.0, 1.0);
      vec3 MAGENTA = vec3(1.0, 0.0, 1.0);
      vec3 YELLOW = vec3(1.0, 1.0, 0.0);
      
      vec3 finalColor;
      
      // Blue tones
      if (normalized.b > 0.7 && normalized.b > normalized.r && normalized.b > normalized.g) {
        finalColor = mix(KLEIN_BLUE, CYAN, step(0.8, brightness));
      }
      // Magenta tones
      else if (normalized.r > 0.6 && normalized.b > 0.6 && normalized.g < 0.5) {
        finalColor = MAGENTA;
      }
      // Yellow tones
      else if (normalized.r > 0.6 && normalized.g > 0.6 && normalized.b < 0.5) {
        finalColor = YELLOW;
      }
      // Black and white
      else {
        finalColor = vec3(step(0.5, brightness));
      }
      
      // Add dithering
      float dither = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
      finalColor *= 0.95 + dither * 0.1;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ CMYKMaterial });

// Add this custom JSX type declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      cmykMaterial: any;
    }
  }
}

export function PSXEffects() {
  return (
    <EffectComposer>
      <mesh>
        <planeGeometry args={[2, 2]} />
        <cmykMaterial blending={BlendFunction.NORMAL} />
      </mesh>
    </EffectComposer>
  );
} 