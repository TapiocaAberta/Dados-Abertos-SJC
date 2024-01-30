import fs from 'fs/promises';

async function sortAndRemoveDuplicates(inputFile, outputFile) {
    try {
        console.log(`Reading data from the input JSON file: ${inputFile}`);
        
        // Read data from the input JSON file
        const rawData = await fs.readFile(inputFile, 'utf8');
        const data = JSON.parse(rawData);

        console.log("Sorting data based on the 'id' key...");
        // Sort the data based on the 'id' key
        const sortedData = data.sort((a, b) => a.id - b.id);

        console.log("Removing duplicates based on the 'id' key...");
        // Remove duplicates based on the 'id' key
        const uniqueData = [sortedData[0], ...sortedData.slice(1).filter((item, index) => item.id !== sortedData[index].id)];

        console.log(`Writing sorted and deduplicated data to the output JSON file: ${outputFile}`);
        // Write the sorted and deduplicated data to the output JSON file
        await fs.writeFile(outputFile, JSON.stringify(uniqueData, null, 2));

        console.log(`Script executed successfully. Sorted and deduplicated data written to ${outputFile}`);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

// Read command line arguments
const [, , inputFilename, outputFilename] = process.argv;

// Check if both input and output filenames are provided
if (!inputFilename || !outputFilename) {
    console.error("Usage: node dedup_data.js <inputFilename> <outputFilename>");
    process.exit(1);
}

sortAndRemoveDuplicates(inputFilename, outputFilename);
