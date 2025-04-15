import { debugLog } from '../stores/debugStore';

const viewmodelImages = [
  '/images/viewmodel/viewmodel1.webp',
  '/images/viewmodel/drink1.webp',
  '/images/viewmodel/drink2.webp',
  '/images/viewmodel/throw1.webp',
  '/images/viewmodel/throw2.webp'
];

let isPreloaded = false;

export function preloadViewmodelImages() {
  if (isPreloaded) {
    debugLog('ViewmodelPreloader', 'Images already preloaded');
    return;
  }

  debugLog('ViewmodelPreloader', 'Starting viewmodel preload');
  
  // Create a promise for each image
  const preloadPromises = viewmodelImages.map(src => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        debugLog('ViewmodelPreloader', `Loaded: ${src}`);
        resolve(src);
      };
      img.onerror = (error) => {
        debugLog('ViewmodelPreloader', `Error loading: ${src}`, error);
        reject(error);
      };
      img.src = src;
    });
  });

  // Wait for all images to load
  Promise.all(preloadPromises)
    .then(() => {
      debugLog('ViewmodelPreloader', 'All viewmodel images preloaded');
      isPreloaded = true;
    })
    .catch(error => {
      debugLog('ViewmodelPreloader', 'Error during preload', error);
    });
}

// Export a function to check if preloading is complete
export function isViewmodelPreloaded() {
  return isPreloaded;
} 