// @ts-check
/**
 * 📥 Download missing escudos (those with an empty string) using Playwright.
 *   - For each team without escudo, navigate to its detail page.
 *   - Extract the <img> whose src contains '/pnfg/pimg/Clubes/'.
 *   - Download the image to ./escudos/ and update the JSON with the relative path.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { chromium } = require('playwright');
const { URL } = require('url');

const DATA_PATH = path.join(__dirname, 'equipos.json');
const ESCUDO_DIR = path.join(__dirname, 'escudos');
const BASE_URL = 'https://www.asturfutbol.es';

// Load JSON
const raw = fs.readFileSync(DATA_PATH, 'utf8');
const data = JSON.parse(raw);

if (!fs.existsSync(ESCUDO_DIR)) {
  fs.mkdirSync(ESCUDO_DIR);
  console.log('📁 Created "escudos" folder');
}

/** Download a file via HTTPS */
function download(urlStr, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(urlStr, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`❌ ${urlStr} → ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  for (const equipo of data.equipos) {
    if (!equipo.escudo || equipo.escudo === '') {
      const url = `${BASE_URL}/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=${equipo.codequipo}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('networkidle');
        // Try to locate the escudo image
        const imgSrc = await page.evaluate(() => {
          const img = document.querySelector('img[src*="/pnfg/pimg/Clubes/"]');
          return img ? img.getAttribute('src') : null;
        });
        if (imgSrc) {
          const fullUrl = imgSrc.startsWith('http') ? imgSrc : `${BASE_URL}${imgSrc}`;
          const filename = path.basename(new URL(fullUrl).pathname);
          const destPath = path.join(ESCUDO_DIR, filename);
          await download(fullUrl, destPath);
          equipo.escudo = `escudos/${filename}`;
          console.log(`✅ ${equipo.nombre} → ${destPath}`);
        } else {
          console.warn(`⚠️ No escudo found for ${equipo.nombre}`);
        }
      } catch (e) {
        console.error(`❌ Error processing ${equipo.nombre}: ${e.message}`);
      }
    }
  }

  await browser.close();

  // Save updated JSON
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('📝 equipos.json actualizado con los escudos faltantes.');
})();
