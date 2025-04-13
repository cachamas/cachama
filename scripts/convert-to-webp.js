import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supported image formats to convert
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg', '.tiff', '.bmp'];

// Function to convert image to WebP
async function convertToWebP(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .webp({ 
        quality: 90, 
        effort: 6, // Maximum compression effort
        lossless: false // Use lossy compression for better size reduction
      })
      .toFile(outputPath);
    
    // Get file sizes
    const originalSize = fs.statSync(inputPath).size;
    const webpSize = fs.statSync(outputPath).size;
    const savings = ((originalSize - webpSize) / originalSize * 100).toFixed(1);
    
    console.log(`Converted: ${inputPath} -> ${outputPath}`);
    console.log(`Size reduction: ${savings}% (${(originalSize / 1024).toFixed(1)}KB -> ${(webpSize / 1024).toFixed(1)}KB)`);
    
    // Delete original file after successful conversion
    fs.unlinkSync(inputPath);
    console.log(`Deleted original: ${inputPath}`);
    
    return true;
  } catch (error) {
    console.error(`Error converting ${inputPath}:`, error);
    return false;
  }
}

// Function to process directory recursively
async function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalSavings = 0;
  let totalOriginalSize = 0;
  let totalWebpSize = 0;
  let convertedCount = 0;
  let failedCount = 0;
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      const subDirStats = await processDirectory(fullPath);
      totalSavings += subDirStats.savings;
      totalOriginalSize += subDirStats.originalSize;
      totalWebpSize += subDirStats.webpSize;
      convertedCount += subDirStats.converted;
      failedCount += subDirStats.failed;
    } else {
      const ext = path.extname(file).toLowerCase();
      if (SUPPORTED_FORMATS.includes(ext)) {
        const webpPath = fullPath.replace(/\.[^.]+$/, '.webp');
        const success = await convertToWebP(fullPath, webpPath);
        
        if (success) {
          const originalSize = stat.size;
          const webpSize = fs.statSync(webpPath).size;
          totalSavings += ((originalSize - webpSize) / originalSize * 100);
          totalOriginalSize += originalSize;
          totalWebpSize += webpSize;
          convertedCount++;
        } else {
          failedCount++;
        }
      }
    }
  }
  
  return {
    savings: totalSavings,
    originalSize: totalOriginalSize,
    webpSize: totalWebpSize,
    converted: convertedCount,
    failed: failedCount
  };
}

// Start conversion from public directory
const publicDir = path.join(__dirname, '../public');
console.log('Starting image conversion to WebP...');
console.log('This will convert all images in the public directory and its subdirectories.');
console.log('Original files will be deleted after successful conversion.');
console.log('Supported formats:', SUPPORTED_FORMATS.join(', '));

processDirectory(publicDir).then((stats) => {
  console.log('\nConversion complete!');
  console.log(`Total files converted: ${stats.converted}`);
  console.log(`Failed conversions: ${stats.failed}`);
  console.log(`Total space saved: ${(stats.originalSize / 1024 / 1024).toFixed(2)}MB -> ${(stats.webpSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Average size reduction: ${(stats.savings / stats.converted).toFixed(1)}%`);
}); 