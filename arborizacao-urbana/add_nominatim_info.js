import { promises as fs } from 'fs';
import axios from 'axios';
import pLimit from 'p-limit';
import { updateProgress } from 'utils';

// Function to enhance JSON collection with Nominatim reverse geocoding data
async function enhanceWithReverseGeocoding(jsonCollection, saveInterval, processedIds) {
  const limit = pLimit(10); // Adjust the concurrency level as needed
  let processedCount = 0;
  let enhancedCollection = [];

  const processItem = async (item) => {
    let { lat, lon, id } = item.point;

    [lat, lon] = [lat, lon].map((coord) => parseFloat(coord.replace(',', '.')));

    // Skip if the ID has already been processed
    if (processedIds.includes(id)) {
      processedCount++;
      updateProgress(processedCount, jsonCollection.length, false);
      return;
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;

    try {
      const response = await axios.get(nominatimUrl);
      const address = response.data.address;

      item['location'] = {};

      item['location']['lat'] = lat;
      item['location']['lon'] = lon;
      item['location']['address'] = address;

      delete item['point'];

      const newItem = { ...item };

      if ((processedCount !== 0 && processedCount % saveInterval === 0) || processedCount === jsonCollection.length) {
        await savePartialEnhancedCollection(enhancedCollection, processedIds)
      }

      processedCount++;

      updateProgress(processedCount, jsonCollection.length, true);
      enhancedCollection.push(newItem)

      return newItem;
    } catch (error) {
      console.error(`Error fetching reverse geocoding data for lat: ${lat}, lon: ${lon}`);
      console.error(error);
      return item;
    }
  };

  const promises = jsonCollection.map((item) => limit(() => processItem(item)));
  enhancedCollection = await Promise.all(promises);

  return enhancedCollection;
}

// Function to save partial enhanced collection to file
async function savePartialEnhancedCollection(partialCollection, alreadyProcessedIds) {
  const outputFilePath = `data/partial/data.enhanced-nominatim.json`;
  await writeEnhancedCollectionToFile(outputFilePath, partialCollection);
  await writeProcessedIdsToFile(
    processedIdsFilePath,
    alreadyProcessedIds.concat(partialCollection.map((item) => item['id'])));
}

// Read processed IDs from file
async function readProcessedIdsFromFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File does not exist, create an empty array and write to the file
      await writeProcessedIdsToFile(filePath, []);
      return [];
    }
    console.error(`Error reading processed IDs from file: ${error.message}`);
    return [];
  }
}

// Write processed IDs to file
async function writeProcessedIdsToFile(filePath, processedIds) {
  try {
    await fs.writeFile(filePath, JSON.stringify(processedIds));
  } catch (error) {
    console.error(`Error writing processed IDs to file: ${error.message}`);
  }
}

// Write enhanced JSON collection to file
async function writeEnhancedCollectionToFile(filePath, enhancedCollection) {
  try {
    await fs.writeFile(filePath, JSON.stringify(enhancedCollection));
    console.log(` - Enhanced collection saved to: ${filePath}`);
  } catch (error) {
    console.error(`Error writing enhanced collection to file: ${error.message}`);
  }
}

// Read JSON collection from file
async function readJsonCollectionFromFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading JSON collection from file: ${error.message}`);
    return [];
  }
}

// Example JSON file path
const jsonFilePath = 'data/data.json';
const outputFilePath = 'data/data.enhanced-nominatim.json';
const processedIdsFilePath = '/tmp/arvores.sjc.sp.gov.br-processed-ids.json';
const saveInterval = 500; // Adjust the interval as needed

// Read processed IDs from file
readProcessedIdsFromFile(processedIdsFilePath)
  .then((processedIds) => {
    // Read JSON collection from file
    return readJsonCollectionFromFile(jsonFilePath)
      .then((jsonCollection) => {
        // Enhance the JSON collection with reverse geocoding data
        return enhanceWithReverseGeocoding(jsonCollection, saveInterval, processedIds);
      })
      .then((enhancedCollection) => {
        // Write the final enhanced JSON collection to file
        return writeEnhancedCollectionToFile(outputFilePath, enhancedCollection);
      });
  })
  .catch((error) => {
    console.error('Error:', error);
  });
