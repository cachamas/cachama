import pkg from 'xlsx';
const { readFile, utils } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to format material ID
function formatMaterialId(id) {
    // Convert from "Box001_Material #25_0.027" to "Box001_Material_#25_0027"
    return id
        .replace(/\s+/g, '_')  // Replace spaces with underscores
        .replace(/\.(\d+)$/, (_, num) => num.padStart(4, '0')); // Pad numbers with zeros
}

// Function to format title
function formatTitle(title) {
    // Capitalize first letter of each word, except for prepositions and articles
    const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 'on', 'or', 'the', 'to', 'up', 'yet'];
    
    return title
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            if (index === 0 || !smallWords.includes(word)) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word;
        })
        .join(' ');
}

// Function to format image numbers
function formatImageNumbers(num) {
    if (!num) return '';
    return `${num}front ${num}back`;
}

// Read and process the text file
function processTextFile() {
    const textPath = path.join(__dirname, '../public/docs/information.txt');
    const content = fs.readFileSync(textPath, 'utf-8');
    
    const entries = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length; i += 3) {
        if (i + 2 >= lines.length) break;
        
        const materialId = lines[i].trim();
        const title = lines[i + 1].trim();
        const imageNum = lines[i + 2].trim();
        
        entries.push({
            materialId: formatMaterialId(materialId),
            title: formatTitle(title),
            images: formatImageNumbers(imageNum),
            originalId: materialId // Keep original for matching with Excel
        });
    }
    
    return entries;
}

// Read and process the Excel file
function processExcelFile() {
    const excelPath = path.join(__dirname, '../public/docs/Catálogo discos-2.xlsx');
    const workbook = readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = utils.sheet_to_json(worksheet);
    
    return data.map(row => ({
        title: row['Título'] || '',
        artist: row['Artista'] || '',
        year: row['Año'] || '',
        genre: row['Género'] || '',
        recordCompany: row['Discográfica'] || ''
    }));
}

// Main function to process and combine data
function processVinylData() {
    const textEntries = processTextFile();
    const excelData = processExcelFile();
    
    // Combine the data
    const combinedData = textEntries.map(entry => {
        // Try to find matching Excel entry by title
        const excelEntry = excelData.find(e => 
            e.title.toLowerCase() === entry.title.toLowerCase()
        );
        
        return {
            ...entry,
            artist: excelEntry?.artist || '',
            year: excelEntry?.year || '',
            genre: excelEntry?.genre || '',
            recordCompany: excelEntry?.recordCompany || '',
            description: `${excelEntry?.genre || ''}${excelEntry?.recordCompany ? ` • ${excelEntry.recordCompany}` : ''}`
        };
    });
    
    // Write the processed data to a JSON file
    const outputPath = path.join(__dirname, '../public/data/vinyl-collection.json');
    fs.writeFileSync(outputPath, JSON.stringify(combinedData, null, 2));
    
    console.log(`Processed ${combinedData.length} vinyl records`);
    console.log(`Data written to ${outputPath}`);
}

// Run the script
processVinylData(); 