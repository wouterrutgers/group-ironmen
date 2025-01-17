const child_process = require('child_process');
const fs = require('fs');
const xml2js = require('xml2js');
const glob = require('glob');
const nAsync = require('async');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
// NOTE: sharp will keep some files open and prevent them from being deleted
sharp.cache(false);

const xmlParser = new xml2js.Parser();
const xmlBuilder = new xml2js.Builder();

const runelitePath = './runelite';
const cacheProjectPath = `${runelitePath}/cache`;
const apiProjectPath = `${runelitePath}/runelite-api`;
const clientProjectPath = `${runelitePath}/runelite-client`;
const apiPomPath = `${apiProjectPath}/pom.xml`;
const osrsCacheDirectory = path.resolve('./cache/cache');
const siteItemDataPath = '../site/public/data/item_data.json';
const siteMapIconMetaPath = '../site/public/data/map_icons.json';
const siteMapLabelMetaPath = '../site/public/data/map_labels.json';
const siteItemImagesPath = '../site/public/icons/items';
const siteMapImagesPath = '../site/public/map';
const siteMapLabelsPath = '../site/public/map/labels';
const siteMapIconPath = '../site/public/map/icons/map_icons.webp';
const siteQuestMapping = path.resolve('../site/scripts/quest-mapping.json');
const tileSize = 256;

function exec(command, options) {
  console.log(command);
  options = options || {};
  options.stdio = 'inherit';
  try {
    child_process.execSync(command, options);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

async function retry(fn, skipLast) {
  const attempts = 10;
  for (let i = 0; i < attempts; ++i) {
    try {
      await fn();
      return;
    } catch (ex) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (i === (attempts - 1) && skipLast) {
        console.error(ex);
      }
    }
  }

  if (! skipLast) {
    fn();
  }
}

function execRuneliteCache(mainClass, arguments) {
  exec(`MAVEN_OPTS="-Xmx8000m" mvn compile exec:java -Dexec.mainClass="${mainClass}" -Dexec.args="${arguments}"`, { cwd: cacheProjectPath });

  exec(`git clean -ffdx .; git checkout HEAD -- .`, { cwd: cacheProjectPath });
}

function execRuneliteApi(mainClass, arguments) {
  exec(`mvn compile exec:java -Dexec.mainClass="${mainClass}" -Dexec.args="${arguments}"`, { cwd: apiProjectPath });

  exec(`git clean -ffdx .; git checkout HEAD -- .`, { cwd: apiProjectPath });
}

async function addDependencyInApiPom(groupId, artifactId, version) {
  xmlParser.reset();
  const apiPomData = fs.readFileSync(apiPomPath, 'utf8');
  const apiPom = await xmlParser.parseStringPromise(apiPomData);

  const dependencies = apiPom.project.dependencies;
  dependencies[0].dependency.push({ groupId: groupId, artifactId: artifactId, version: version });

  const apiPomResult = xmlBuilder.buildObject(apiPom);
  fs.writeFileSync(apiPomPath, apiPomResult);
}

async function readAllItemFiles() {
  const itemFiles = glob.sync(`${path.resolve('./item-data')}/*.json`);
  const result = {};

  const q = nAsync.queue((itemFile, callback) => {
    fs.promises.readFile(itemFile, 'utf8').then((itemFileData) => {
      const item = JSON.parse(itemFileData);
      if (isNaN(item.id)) console.log(item);
      result[item.id] = item;

      callback();
    });
  }, 50);

  for (const itemFile of itemFiles) {
    q.push(itemFile);
  }

  await q.drain();

  return result;
}

async function dumpItemData() {
  console.log('\nStep: Unpacking item data from cache');
  execRuneliteCache('net.runelite.cache.Cache', `-c ${osrsCacheDirectory} -items ${path.resolve('./item-data')}`);

  fs.mkdirSync(`${apiProjectPath}/src/main/java/net/runelite/client/game/`, { recursive: true });
  fs.mkdirSync(`${apiProjectPath}/src/main/resources`);

  fs.copyFileSync(`${clientProjectPath}/src/main/java/net/runelite/client/game/ItemMapping.java`, `${apiProjectPath}/src/main/java/net/runelite/client/game/ItemMapping.java`);
  fs.copyFileSync(`${clientProjectPath}/src/main/java/net/runelite/client/game/ItemVariationMapping.java`, `${apiProjectPath}/src/main/java/net/runelite/client/game/ItemVariationMapping.java`);
  fs.copyFileSync(`${clientProjectPath}/src/main/resources/item_variations.json`, `${apiProjectPath}/src/main/resources/item_variations.json`);
  fs.copyFileSync('./ItemDumper.java', `${apiProjectPath}/src/main/java/net/runelite/api/ItemDumper.java`);

  await addDependencyInApiPom('com.fasterxml.jackson.core', 'jackson-databind', '2.17.0');
  await addDependencyInApiPom('com.google.guava', 'guava', '33.3.1-jre');
  await addDependencyInApiPom('com.google.code.gson', 'gson', '2.11.0');

  execRuneliteApi('net.runelite.api.ItemDumper', path.resolve(`./item-data`));
}

async function getNonAlchableItemNames() {
  console.log('\nStep: Fetching unalchable items from wiki');
  const nonAlchableItemNames = new Set();
  let cmcontinue = '';
  do {
    const url = `https://oldschool.runescape.wiki/api.php?cmtitle=Category:Items_that_cannot_be_alchemised&action=query&list=categorymembers&format=json&cmlimit=500&cmcontinue=${cmcontinue}`;
    const response = await axios.get(url);
    const itemNames = response.data.query.categorymembers.map((member) => member.title).filter((title) => ! title.startsWith('File:') && ! title.startsWith('Category:'));
    itemNames.forEach((name) => nonAlchableItemNames.add(name));
    cmcontinue = response.data?.continue?.cmcontinue || null;
  } while (cmcontinue);

  return nonAlchableItemNames;
}

async function buildItemDataJson() {
  console.log('\nStep: Build item_data.json');
  const items = await readAllItemFiles();
  const includedItems = {};
  const allIncludedItemIds = new Set();
  for (const [itemId, item] of Object.entries(items)) {
    if (item.name && item.name.trim().toLowerCase() !== 'null') {
      includedItem = {
        name: item.name,
        highalch: Math.floor(item.cost * 0.6),
        mapping: item.mapping,
      };

      const stackedList = [];
      if (item.countCo && item.countObj && item.countCo.length > 0 && item.countObj.length > 0) {
        for (let i = 0; i < item.countCo.length; ++i) {
          const stackBreakPoint = item.countCo[i];
          const stackedItemId = item.countObj[i];

          if (stackBreakPoint > 0 && stackedItemId === 0) {
            console.log(`${itemId}: Item has a stack breakpoint without an associated item id for that stack.`);
          } else if (stackBreakPoint > 0 && stackedItemId > 0) {
            allIncludedItemIds.add(stackedItemId);
            stackedList.push([stackBreakPoint, stackedItemId]);
          }
        }

        if (stackedList.length > 0) {
          includedItem.stacks = stackedList;
        }
      }

      allIncludedItemIds.add(item.id);
      includedItems[itemId] = includedItem;
    }
  }

  const nonAlchableItemNames = await getNonAlchableItemNames();

  let itemsMadeNonAlchable = 0;
  for (const item of Object.values(includedItems)) {
    const itemName = item.name;
    if (nonAlchableItemNames.has(itemName)) {
      // NOTE: High alch value = 0 just means unalchable in the context of this program
      item.highalch = 0;
      itemsMadeNonAlchable++;
    }

    // NOTE: The wiki data does not list every variant of an item such as 'Abyssal lantern (yew logs)'
    // which is also not alchable. So this step is to handle that case by searching for the non variant item.
    if (itemName.trim().endsWith(')') && itemName.indexOf('(') !== -1) {
      const nonVariantItemName = itemName.substring(0, itemName.indexOf('(')).trim();
      if (nonAlchableItemNames.has(nonVariantItemName)) {
        item.highalch = 0;
        itemsMadeNonAlchable++;
      }
    }
  }
  console.log(`${itemsMadeNonAlchable} items were updated to be unalchable`);
  fs.writeFileSync('./item_data.json', JSON.stringify(includedItems, null, 2));

  return allIncludedItemIds;
}

async function dumpItemImages(allIncludedItemIds) {
  // TODO: Zoom on holy symbol is incorrect
  console.log('\nStep: Extract item model images');

  console.log(`Generating images for ${allIncludedItemIds.size} items`);
  fs.writeFileSync('items_need_images.csv', Array.from(allIncludedItemIds.values()).join(','));
  const imageDumperDriver = fs.readFileSync('./Cache.java', 'utf8');
  fs.writeFileSync(`${cacheProjectPath}/src/main/java/net/runelite/cache/Cache.java`, imageDumperDriver);
  const itemSpriteFactory = fs.readFileSync('./ItemSpriteFactory.java', 'utf8');
  fs.writeFileSync(`${cacheProjectPath}/src/main/java/net/runelite/cache/item/ItemSpriteFactory.java`, itemSpriteFactory);
  execRuneliteCache('net.runelite.cache.Cache', `-c ${osrsCacheDirectory} -ids ${path.resolve('./items_need_images.csv')} -output ${path.resolve('./item-images')}`);

  const itemImages = glob.sync(`./item-images/*.png`);
  let p = [];
  for (const itemImage of itemImages) {
    p.push(new Promise(async (resolve) => {
      const itemImageData = await sharp(itemImage).webp({ lossless: true }).toBuffer();
      fs.unlinkSync(itemImage);
      await sharp(itemImageData).webp({ lossless: true, effort: 6 }).toFile(itemImage.replace('.png', '.webp')).then(resolve);
    }));
  }
  await Promise.all(p);
}

async function convertXteasToRuneliteFormat() {
  const xteas = JSON.parse(fs.readFileSync(`${osrsCacheDirectory}/../xteas.json`, 'utf8'));
  let result = xteas.map((region) => ({
    region: region.mapsquare,
    keys: region.key,
  }));

  const location = `${osrsCacheDirectory}/../xteas-runelite.json`;
  fs.writeFileSync(location, JSON.stringify(result));

  return location;
}

async function dumpMapData(xteasLocation) {
  console.log('\nStep: Dumping map data');
  const mapImageDumper = fs.readFileSync('./MapImageDumper.java', 'utf8');
  fs.writeFileSync(`${cacheProjectPath}/src/main/java/net/runelite/cache/MapImageDumper.java`, mapImageDumper);
  execRuneliteCache('net.runelite.cache.MapImageDumper', `--cachedir ${osrsCacheDirectory} --xteapath ${xteasLocation} --outputdir ${path.resolve('./map-data')}`);
}

async function dumpMapLabels() {
  console.log('\nStep: Dumping map labels');
  const mapLabelDumper = fs.readFileSync('./MapLabelDumper.java', 'utf8');
  fs.writeFileSync(`${cacheProjectPath}/src/main/java/net/runelite/cache/MapLabelDumper.java`, mapLabelDumper);
  execRuneliteCache('net.runelite.cache.MapLabelDumper', `--cachedir ${osrsCacheDirectory} --outputdir ${path.resolve('./map-data/labels')}`);

  const mapLabels = glob.sync('./map-data/labels/*.png');
  let p = [];
  for (const mapLabel of mapLabels) {
    p.push(new Promise(async (resolve) => {
      const mapLabelImageData = await sharp(mapLabel).webp({ lossless: true }).toBuffer();
      fs.unlinkSync(mapLabel);
      await sharp(mapLabelImageData).webp({ lossless: true, effort: 6 }).toFile(mapLabel.replace('.png', '.webp')).then(resolve);
    }));
  }
  await Promise.all(p);
}

async function dumpCollectionLog() {
  console.log('\nStep: Dumping collection log');
  const collectionLogDumper = fs.readFileSync('./CollectionLogDumper.java', 'utf8');
  fs.writeFileSync(`${cacheProjectPath}/src/main/java/net/runelite/cache/CollectionLogDumper.java`, collectionLogDumper);
  execRuneliteCache('net.runelite.cache.CollectionLogDumper', `--cachedir ${osrsCacheDirectory} --outputdir ${path.resolve('../server')}`);
}

async function tilePlane(plane) {
  await retry(() => fs.rmSync('./output_files', { recursive: true, force: true }));
  const planeImage = sharp(`./map-data/img-${plane}.png`, { limitInputPixels: false }).flip();
  await planeImage.webp({ lossless: true }).tile({
    size: tileSize,
    depth: 'one',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    skipBlanks: 0,
  }).toFile('output.dz');
}

async function outputTileImage(s, plane, x, y) {
  return s.flatten({ background: '#000' })
    .webp({ lossless: true, alphaQuality: 0, effort: 6 })
    .toFile(`./map-data/tiles/${plane}_${x}_${y}.webp`);
}

async function finalizePlaneTiles(plane, previousTiles) {
  const tileImages = glob.sync('./output_files/0/*.webp');

  for (const tileImage of tileImages) {
    const filename = path.basename(tileImage, '.webp');
    const [x, y] = filename.split('_').map((coord) => parseInt(coord, 10));

    const finalX = x + (4608 / tileSize);
    const finalY = y + (4864 / tileSize);

    let s;
    if (plane > 0) {
      const backgroundPath = `./map-data/tiles/${plane - 1}_${finalX}_${finalY}.webp`;
      const backgroundExists = fs.existsSync(backgroundPath);

      if (backgroundExists) {
        const tile = await sharp(tileImage).flip().webp({ lossless: true }).toBuffer();
        const background = await sharp(backgroundPath).linear(0.5).webp({ lossless: true }).toBuffer();
        s = sharp(background)
          .composite([
            { input: tile },
          ]);
      }
    }

    if (! s) {
      s = sharp(tileImage).flip();
    }

    previousTiles.add(`${plane}_${finalX}_${finalY}`);
    await outputTileImage(s, plane, finalX, finalY);
  }

  // NOTE: This is just so the plane will have a darker version of the tile below it
  // even if the plane does not have its own image for a tile.
  if (plane > 0) {
    const belowTiles = [...previousTiles].filter(x => x.startsWith(plane - 1));
    for (const belowTile of belowTiles) {
      const [belowPlane, x, y] = belowTile.split('_');
      const lookup = `${plane}_${x}_${y}`;
      if (! previousTiles.has(lookup)) {
        const outputPath = `./map-data/tiles/${plane}_${x}_${y}.webp`;
        if (fs.existsSync(outputPath) === true) {
          throw new Error(`Filling tile ${outputPath} but it already exists!`);
        }

        const s = sharp(`./map-data/tiles/${belowTile}.webp`).linear(0.5);
        previousTiles.add(lookup);
        await outputTileImage(s, plane, x, y);
      }
    }
  }
}

async function generateMapTiles() {
  console.log('\nStep: Generate map tiles');
  fs.rmSync('./map-data/tiles', { recursive: true, force: true });
  fs.mkdirSync('./map-data/tiles');

  const previousTiles = new Set();
  const planes = 4;
  for (let i = 0; i < planes; ++i) {
    console.log(`Tiling map plane ${i + 1}/${planes}`);
    await tilePlane(i);
    console.log(`Finalizing map plane ${i + 1}/${planes}`);
    await finalizePlaneTiles(i, previousTiles);
  }
}

async function moveFiles(globSource, destination) {
  const files = glob.sync(globSource);
  for (file of files) {
    const base = path.parse(file).base;
    if (base) {
      await retry(() => fs.renameSync(file, `${destination}/${base}`), true);
    }
  }
}

async function moveResults() {
  console.log('\nStep: Moving results to site');
  await retry(() => fs.renameSync('./item_data.json', siteItemDataPath), true);

  await moveFiles('./item-images/*.webp', siteItemImagesPath);
  await moveFiles('./map-data/tiles/*.webp', siteMapImagesPath);
  await moveFiles('./map-data/labels/*.webp', siteMapLabelsPath);

  // Create a tile sheet of the map icons
  const mapIcons = glob.sync('./map-data/icons/*.png');
  let mapIconsCompositeOpts = [];
  const iconIdToSpriteMapIndex = {};
  for (let i = 0; i < mapIcons.length; ++i) {
    mapIconsCompositeOpts.push({
      input: mapIcons[i],
      left: 15 * i,
      top: 0,
    });

    iconIdToSpriteMapIndex[path.basename(mapIcons[i], '.png')] = i;
  }
  await sharp({
    create: {
      width: 15 * mapIcons.length,
      height: 15,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(mapIconsCompositeOpts).webp({ lossless: true, effort: 6 }).toFile(siteMapIconPath);

  // Convert the output of the map-icons locations to be keyed by the X an Y of the regions
  // that they are in. This is done so that the canvas map component can quickly lookup
  // all of the icons in each of the regions that are being shown.
  const mapIconsMeta = JSON.parse(fs.readFileSync('./map-data/icons/map-icons.json', 'utf8'));
  const locationByRegion = {};

  for (const [iconId, coordinates] of Object.entries(mapIconsMeta)) {
    for (let i = 0; i < coordinates.length; i += 2) {
      const x = coordinates[i] + 128;
      const y = coordinates[i + 1] + 1;

      const regionX = Math.floor(x / 64);
      const regionY = Math.floor(y / 64);

      const spriteMapIndex = iconIdToSpriteMapIndex[iconId];
      if (spriteMapIndex === undefined) {
        throw new Error('Could not find sprite map index for map icon: ' + iconId);
      }

      locationByRegion[regionX] = locationByRegion[regionX] || {};
      locationByRegion[regionX][regionY] = locationByRegion[regionX][regionY] || {};
      locationByRegion[regionX][regionY][spriteMapIndex] = locationByRegion[regionX][regionY][spriteMapIndex] || [];

      locationByRegion[regionX][regionY][spriteMapIndex].push(x, y);
    }
  }

  fs.writeFileSync(siteMapIconMetaPath, JSON.stringify(locationByRegion, null, 2));

  // Do the same for map labels
  const mapLabelsMeta = JSON.parse(fs.readFileSync('./map-data/labels/map-labels.json', 'utf8'));
  const labelByRegion = {};

  for (let i = 0; i < mapLabelsMeta.length; ++i) {
    const coordinates = mapLabelsMeta[i];
    const x = coordinates[0] + 128;
    const y = coordinates[1] + 1;
    const z = coordinates[2];

    const regionX = Math.floor(x / 64);
    const regionY = Math.floor(y / 64);

    labelByRegion[regionX] = labelByRegion[regionX] || {};
    labelByRegion[regionX][regionY] = labelByRegion[regionX][regionY] || {};
    labelByRegion[regionX][regionY][z] = labelByRegion[regionX][regionY][z] || [];

    labelByRegion[regionX][regionY][z].push(x, y, i);
  }

  fs.writeFileSync(siteMapLabelMetaPath, JSON.stringify(labelByRegion, null, 2));
}

async function dumpQuestMapping() {
  await addDependencyInApiPom('com.fasterxml.jackson.core', 'jackson-databind', '2.17.0');
  fs.copyFileSync('./QuestDumper.java', `${apiProjectPath}/src/main/java/net/runelite/api/QuestDumper.java`);

  execRuneliteApi('net.runelite.api.QuestDumper', siteQuestMapping);
}

(async () => {
  await dumpItemData();
  const allIncludedItemIds = await buildItemDataJson();
  await dumpItemImages(allIncludedItemIds);
  const xteasLocation = await convertXteasToRuneliteFormat();
  await dumpMapData(xteasLocation);
  await generateMapTiles();
  await dumpMapLabels();
  await dumpCollectionLog();
  await moveResults();

  await dumpQuestMapping();
})();
