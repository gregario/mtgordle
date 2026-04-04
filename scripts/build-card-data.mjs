#!/usr/bin/env node
/**
 * MTGordle — Scryfall bulk data pipeline
 *
 * Downloads Oracle Cards bulk data from Scryfall (public, no API key required),
 * curates 4 pools (365 simple daily, 365 cryptic daily, 100 simple practice,
 * 100 cryptic practice), and writes:
 *   public/data/card-details.json     — 930-card curated pool array
 *   public/data/autocomplete-index.json — sorted unique Oracle card names (~30K)
 *
 * Cache: .scryfall-cache/oracle-cards.json (reused if < 7 days old)
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CACHE_DIR = path.join(ROOT, '.scryfall-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'oracle-cards.json');
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const OUT_DIR = path.join(ROOT, 'public', 'data');
const CARD_DETAILS_FILE = path.join(OUT_DIR, 'card-details.json');
const AUTOCOMPLETE_FILE = path.join(OUT_DIR, 'autocomplete-index.json');

const BULK_DATA_LIST_URL = 'https://api.scryfall.com/bulk-data';

// ─── Set era mapping ──────────────────────────────────────────────────────────
function getSetEra(releasedAt) {
  if (!releasedAt) return 'Unknown';
  const year = parseInt(releasedAt.slice(0, 4), 10);
  if (year < 2000) return 'Classic (1990s)';
  if (year <= 2003) return 'Odyssey era (2000s)';
  if (year <= 2007) return 'Kamigawa/Ravnica era';
  if (year <= 2013) return 'Zendikar/Return era';
  if (year <= 2019) return 'Modern era';
  return 'Recent (2020s)';
}

// ─── HTTP fetch helper ────────────────────────────────────────────────────────
const SCRYFALL_HEADERS = {
  'User-Agent': 'MTGordle/0.1 (build script; contact: mtgordle@example.com)',
  'Accept': 'application/json',
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: SCRYFALL_HEADERS }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
  });
}

// ─── Large file download helper (handles gzip content-encoding) ───────────────
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: SCRYFALL_HEADERS }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
      }
      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let receivedBytes = 0;
      const tmpPath = destPath + '.tmp';
      const out = fs.createWriteStream(tmpPath);

      // Scryfall bulk data is served gzip-encoded; decompress on the fly
      const encoding = res.headers['content-encoding'];
      let stream = res;
      if (encoding === 'gzip') {
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        stream = gunzip;
      }

      res.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (totalBytes > 0) {
          const pct = ((receivedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(`\r  Downloading... ${pct}% compressed (${(receivedBytes / 1024 / 1024).toFixed(1)} MB)`);
        } else {
          process.stdout.write(`\r  Downloading... ${(receivedBytes / 1024 / 1024).toFixed(1)} MB received`);
        }
      });

      stream.pipe(out);
      out.on('finish', () => {
        process.stdout.write('\n');
        fs.renameSync(tmpPath, destPath);
        resolve();
      });
      out.on('error', reject);
      stream.on('error', reject);
    });
    req.on('error', reject);
  });
}

// ─── Sleep helper (rate limiting) ─────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Card filter ─────────────────────────────────────────────────────────────
function isEligible(card) {
  if (!card) return false;
  // English only
  if (card.lang && card.lang !== 'en') return false;
  // Must have image URIs
  if (!card.image_uris) return false;
  // Exclude tokens, emblems, art cards, etc.
  const excluded = ['token', 'emblem', 'art_series', 'memorabilia', 'minigame', 'vanguard', 'scheme', 'plane', 'phenomenon', 'conspiracy'];
  if (excluded.includes(card.layout)) return false;
  // Must have a type_line
  if (!card.type_line) return false;
  // Exclude basic lands
  if (card.type_line.startsWith('Basic Land')) return false;
  // Exclude tokens in type line
  if (card.type_line.includes('Token')) return false;
  return true;
}

// ─── Card shape extractor ─────────────────────────────────────────────────────
function extractCard(raw, pool) {
  const oracleText = raw.oracle_text || '';
  const firstLine = oracleText.split('\n')[0] || '';
  const flavText = raw.flavor_text || null;
  const loreBlurb = flavText || `${raw.name} is a ${raw.type_line} from the world of Magic: The Gathering.`;

  return {
    oracle_id: raw.oracle_id,
    name: raw.name,
    mana_cost: raw.mana_cost || '',
    color_identity: raw.color_identity || [],
    type_line: raw.type_line,
    oracle_text: oracleText,
    oracle_text_first_line: firstLine,
    flavor_text: flavText,
    rarity: raw.rarity,
    set: raw.set,
    set_name: raw.set_name,
    artist: raw.artist || '',
    image_uri: raw.image_uris?.normal || '',
    art_crop_uri: raw.image_uris?.art_crop || '',
    set_era: getSetEra(raw.released_at),
    lore_blurb: loreBlurb,
    nicknames: [],
    pool,
  };
}

// ─── Curation scoring ─────────────────────────────────────────────────────────
const ICONIC_SETS = new Set([
  'lea', 'leb', '2ed', '3ed', 'arn', 'atq', 'leg', 'drk', 'fem', 'ice', 'all', 'mir',
  'vis', 'wth', 'tmp', 'sth', 'exo', 'usg', 'ulg', 'uds', 'mmq', 'nem', 'pcy',
  'inv', 'pls', 'apc', 'ody', 'tor', 'jud', 'ons', 'lgn', 'scg',
  'mrd', 'dst', 'fth', 'chk', 'bok', 'sok', 'rav', 'gpt', 'dis',
  'csp', 'tsp', 'plc', 'fut', 'lrw', 'mor', 'shm', 'eve',
  'ala', 'con', 'arb', 'zen', 'wwk', 'roe',
  'som', 'mbs', 'nph', 'isd', 'dka', 'avr',
  'rtr', 'gtc', 'dgm', 'ths', 'bng', 'jou',
  'ktk', 'frf', 'dtk', 'bfz', 'ogw', 'soi', 'emn',
  'kld', 'aer', 'akh', 'hou', 'xln', 'rix', 'dom',
  'grn', 'rna', 'war', 'eld', 'thb', 'iko',
  'znr', 'khm', 'stx', 'afr', 'mid', 'vow',
  'neo', 'snc', 'dmu', 'bro', 'one', 'mom', 'lci', 'mkm', 'otj', 'blb', 'dsk',
]);

function simpleScore(card) {
  // Lower = better candidate for Simple tier
  let score = card.edhrec_rank ?? 999999;
  // Boost iconic sets slightly
  if (ICONIC_SETS.has(card.set)) score = Math.max(0, score - 2000);
  // Bonus for having both flavor text and oracle text
  if (card.flavor_text && card.oracle_text) score = Math.max(0, score - 500);
  return score;
}

function crypticScore(card) {
  // Higher edhrec_rank = more obscure = better for Cryptic
  return -(card.edhrec_rank ?? 0);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('MTGordle — Scryfall data pipeline\n');

  // Ensure output directories exist
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ── Step 1: Get/use cached raw data ─────────────────────────────────────────
  let rawCards;
  const cacheExists = fs.existsSync(CACHE_FILE);
  const cacheAge = cacheExists ? Date.now() - fs.statSync(CACHE_FILE).mtimeMs : Infinity;

  if (cacheExists && cacheAge < CACHE_MAX_AGE_MS) {
    console.log(`Using cached Scryfall data (${(cacheAge / 3600000).toFixed(1)}h old)`);
    const text = fs.readFileSync(CACHE_FILE, 'utf8');
    rawCards = JSON.parse(text);
  } else {
    console.log('Fetching Scryfall bulk data list...');
    await sleep(100);
    const bulkList = await fetchJSON(BULK_DATA_LIST_URL);
    const oracleBulk = bulkList.data?.find((b) => b.type === 'oracle_cards');
    if (!oracleBulk) throw new Error('Could not find oracle_cards entry in Scryfall bulk data list');
    const downloadUri = oracleBulk.download_uri;
    if (!downloadUri) throw new Error('No download_uri in Scryfall oracle_cards bulk data entry');
    console.log(`Downloading oracle cards (~100MB) from:\n  ${downloadUri}`);
    await sleep(100);
    await downloadFile(downloadUri, CACHE_FILE);
    console.log('Download complete. Parsing JSON...');
    const text = fs.readFileSync(CACHE_FILE, 'utf8');
    rawCards = JSON.parse(text);
    console.log(`Parsed ${rawCards.length.toLocaleString()} raw cards.`);
  }

  // ── Step 2: Filter eligible cards ───────────────────────────────────────────
  console.log('\nFiltering eligible cards...');
  const eligible = rawCards.filter(isEligible);
  console.log(`  ${eligible.length.toLocaleString()} eligible cards after filtering`);

  // ── Step 3: Build autocomplete index ────────────────────────────────────────
  console.log('\nBuilding autocomplete index...');
  const allNames = [...new Set(rawCards.map((c) => c.name).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' })
  );
  fs.writeFileSync(AUTOCOMPLETE_FILE, JSON.stringify(allNames));
  const autocompleteSizeKB = (fs.statSync(AUTOCOMPLETE_FILE).size / 1024).toFixed(1);
  console.log(`  ${allNames.length.toLocaleString()} unique names → ${autocompleteSizeKB} KB (uncompressed)`);
  // Warn if > 500 KB uncompressed (gzip will be ~40% of this)
  if (parseFloat(autocompleteSizeKB) > 1300) {
    console.warn('  WARNING: autocomplete index may exceed 500KB gzipped');
  }

  // ── Step 4: Curate pools ─────────────────────────────────────────────────────
  console.log('\nCurating card pools...');

  // Sort candidates for Simple (ascending score = most popular)
  const simpleCandidates = eligible
    .filter((c) => c.edhrec_rank != null || true) // all eligible
    .sort((a, b) => simpleScore(a) - simpleScore(b));

  // Pick top 465 for Simple (365 daily + 100 practice), tracking oracle_ids
  const usedOracleIds = new Set();
  const simplePicked = [];

  for (const card of simpleCandidates) {
    if (simplePicked.length >= 465) break;
    if (usedOracleIds.has(card.oracle_id)) continue;
    simplePicked.push(card);
    usedOracleIds.add(card.oracle_id);
  }

  const simpleDaily = simplePicked.slice(0, 365);
  const simplePractice = simplePicked.slice(365, 465);
  console.log(`  Simple daily: ${simpleDaily.length}, Simple practice: ${simplePractice.length}`);

  // Sort remaining candidates for Cryptic (descending score = most obscure)
  const crypticCandidates = eligible
    .filter((c) => !usedOracleIds.has(c.oracle_id))
    .sort((a, b) => crypticScore(a) - crypticScore(b));

  const crypticPicked = [];
  for (const card of crypticCandidates) {
    if (crypticPicked.length >= 465) break;
    if (usedOracleIds.has(card.oracle_id)) continue;
    crypticPicked.push(card);
    usedOracleIds.add(card.oracle_id);
  }

  const crypticDaily = crypticPicked.slice(0, 365);
  const crypticPractice = crypticPicked.slice(365, 465);
  console.log(`  Cryptic daily: ${crypticDaily.length}, Cryptic practice: ${crypticPractice.length}`);

  // ── Step 5: Validate no overlap ──────────────────────────────────────────────
  const allPicked = [...simpleDaily, ...simplePractice, ...crypticDaily, ...crypticPractice];
  const pickIds = allPicked.map((c) => c.oracle_id);
  const uniquePickIds = new Set(pickIds);
  if (uniquePickIds.size !== pickIds.length) {
    throw new Error(`OVERLAP DETECTED: ${pickIds.length - uniquePickIds.size} duplicates across pools`);
  }
  console.log(`  No overlaps detected across ${allPicked.length} picked cards ✓`);

  // ── Step 6: Write card-details.json ──────────────────────────────────────────
  console.log('\nWriting card-details.json...');
  const cardDetails = [
    ...simpleDaily.map((c) => extractCard(c, 'simple-daily')),
    ...simplePractice.map((c) => extractCard(c, 'simple-practice')),
    ...crypticDaily.map((c) => extractCard(c, 'cryptic-daily')),
    ...crypticPractice.map((c) => extractCard(c, 'cryptic-practice')),
  ];
  fs.writeFileSync(CARD_DETAILS_FILE, JSON.stringify(cardDetails, null, 2));
  const detailsSizeKB = (fs.statSync(CARD_DETAILS_FILE).size / 1024).toFixed(1);
  console.log(`  ${cardDetails.length} cards written (${detailsSizeKB} KB)`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\n─── Build complete ───────────────────────────────────────');
  console.log(`  public/data/card-details.json    : ${cardDetails.length} cards, ${detailsSizeKB} KB`);
  console.log(`  public/data/autocomplete-index.json : ${allNames.length.toLocaleString()} names, ${autocompleteSizeKB} KB`);
  console.log('  Pool breakdown:');
  console.log(`    simple-daily    : ${simpleDaily.length}`);
  console.log(`    simple-practice : ${simplePractice.length}`);
  console.log(`    cryptic-daily   : ${crypticDaily.length}`);
  console.log(`    cryptic-practice: ${crypticPractice.length}`);
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
