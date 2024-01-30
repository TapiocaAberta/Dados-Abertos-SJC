import puppeteer from 'puppeteer';
import fs from 'fs';
import { updateProgress } from './utils';


const getTreeData = async (id, browser) => {
  try {

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', async (req) => {
      if (req.headers()['accept'].indexOf('text/html') < 0) {
        await req.abort();
      } else {
        await req.continue();
      }
    });

    page.on('console', msg => {
      for (let i = 0; i < msg.args.length; ++i)
        console.log(`${i}: ${msg.args[i]}`);
    });

    const url = `https://arvores.sjc.sp.gov.br/${id}`;
    // console.log(`Navigating to /${id}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });


    let treeData = await page.evaluate(() => {
      const keyMapping = {
        "Nome Popular": "common_name",
        "Laudos": "reports",
        "Nome Científico": "cientific_name",
        "DAP (Diâmetro à altura do peito)": "dap",
        "Altura": "height",
        "Comentário": "comment",
        "Data da Coleta": "collected_at",
      };
      
      const valueChanges = {
        "common_name": (value, item = null) => {
          return value.split(',').map(val => val.trim())
        },
        "cientific_name": (value, item = null) => {
          return value.split(',').map(val => val.trim())
        },
        "collected_at": (value, item = null) => {
          return value.split('/').reverse().join('-')
        },
        "reports": (value, item = null) => {
          let links = item.querySelectorAll('a')
          let reports = [];
          links.forEach((link) => {
            reports.push({
              href: link.href,
              alt: link.alt,
              label: link.innerText,
            })
          });
          return reports;
        },
      };

      const prepareInfoData = (key, value, item) => {
        if (key in keyMapping === false) return [null, null]
        let next_key = keyMapping[key];
        let next_value = next_key in valueChanges ? valueChanges[next_key](value, item) : value;
        return [next_key, next_value]
      };

      if (!document.querySelector("#div_corpo div.panel-body")) {
        return {failed: true}
      }

      const _info = document.querySelectorAll("#div_corpo div.panel-body div.col-md-4:nth-child(1) p") || [];
      const _map = document.querySelector("#div_corpo div.panel-body div.col-md-4:nth-child(2)");
      const _photos = document.querySelectorAll("#div_corpo div.panel-body div.col-md-4:nth-child(3) img");

      let point = {
        gmaps_url: _map.querySelector('a').href,
      };
      
      let info = {};

      _info.forEach((item) => {
        const innerText = item.innerText;
        let [key, value] = innerText.split(':').map(val => val.trim())

        if (key == 'Latitude') {
          point['lat'] = value.replace(' / Longitude', '');
          point['lon'] = innerText.toString().split('Longitude: ')[1]

          return
        }

        [key, value] = prepareInfoData(key, value, item);

        // "common_name"  # Nome Popular
        // "cientific_name"  # Nome Científico
        // "dap"  # DAP (Diâmetro à altura do peito)
        // "height"  # Altura
        // "collected_at"  # Data da Coleta

        if (!key || !value) return
        info[key] = value;
      })

      let photos = [];
      _photos.forEach((img) => {
        photos.push({
          src: img.src,
          alt: img.alt
        })
      })

      return { info, point, photos }
    });

    treeData['id'] = id;

    // console.log(`treeData: ${JSON.stringify(treeData).substring(0, 50)}...}\n`);
  //  if (process.stdout.isTTY) {
  //     process.stdout.clearLine(0);
  //     process.stdout.clearLine(1);
  //     process.stdout.cursorTo(0);
  //  }

    await page.close();

    return Promise.resolve(treeData);
  } catch (error) {
    console.error(`Error while scraping data for ID ${id}:`, error);
    return Promise.resolve({ id, failed: true, error: true });
  }
};

const scrapeAndSaveData = async (initialId, limitId, browser) => {
  const filename = 'data.json';

  try {
    // Read the existing data from the file if it exists
    let existingData = [];

    try {
      existingData = JSON.parse(fs.readFileSync(filename, 'utf-8'));
    } catch (err) {
      // If the file doesn't exist or is not valid JSON, ignore the error
    }

    const newContent = [];
    let treeData = {};
    let index = 1;
    let total = limitId + 1 - initialId;
    for (let id = initialId; id <= limitId; id++) {
      
      // console.log(`--> Getting tree data #${index} of ${total} total`);
      // if (process.stdout.isTTY) {
      //     process.stdout.write(`--> Getting tree data #${index} of ${total} total`);
      //     // process.stdout.write("\n"); // end the line
      // }
      updateProgress(`--> Getting tree data #${index} of ${total} total`);

      treeData = await getTreeData(id, browser);
      newContent.push(treeData);
      index += 1;
    }

    // Concatenate the new content with the existing data
    const updatedData = existingData.concat(newContent);

    // Write the updated data back to the file
    fs.writeFileSync(filename, JSON.stringify(updatedData));
    console.log(` - Data for IDs ${initialId} to ${limitId} saved successfully.\n`);
  } catch (error) {
    console.error('Error while scraping and saving data:', error);
  }
};

const scrapeAndSaveDataInRange = async (startId, endId, batchSize, browser) => {
  // Iterate over the range in batches
  for (let i = startId; i <= endId; i += batchSize) {
    const initialId = i;
    const limitId = Math.min(i + batchSize - 1, endId);

    // Call the function to scrape and save data for the current batch
    console.log(`=== Getting pages from ${initialId} to ${limitId} ===`);
    
    if (!process.stdout.isTTY) {
      console.log(`\nThere will be not progress update with TTY (outside VS Code, attach a debug server if you would like to)\n`);
    }

    await scrapeAndSaveData(initialId, limitId, browser);
  }
};

// main block
(async () => {  
  // Validate command line arguments
  if (process.argv.length !== 5) {
    console.error('Usage: node index.js <totalPages> <startId> <batchSize>');
    process.exit(1);
  }
  
  // Parse command line arguments
  const totalPages = parseInt(process.argv[2]);
  const startId = parseInt(process.argv[3]);
  const batchSize = parseInt(process.argv[4]);
  
  // Validate numeric values
  if (isNaN(totalPages) || isNaN(startId) || isNaN(batchSize)) {
    console.error('Invalid numeric input. Please provide valid numeric values for totalPages, startId, and batchSize.');
    process.exit(1);
  }
  
  // Calculate the total range
  const endId = startId + (totalPages * batchSize) - 1;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath: puppeteer.executablePath(),
    protocolTimeout: 540000,
    // headless: false,
    // slowMo: 1250, // slow down by 250ms
    defaultViewport: null,
    // devtools: true,
    timeout: 0
  });
  await scrapeAndSaveDataInRange(startId, endId, batchSize, browser);
  await browser.close();
})();
