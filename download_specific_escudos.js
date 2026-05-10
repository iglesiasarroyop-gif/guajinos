// @ts-check
/**
 * 📥 Download escudos for the 4 teams that were missing.
 *   - Uses Playwright to load the "Datos del Equipo" page (URL provided by the user).
 *   - Extracts the <img> whose src contains "/pnfg/pimg/Clubes/" (the escudo).
 *   - Saves the image to ./escudos/ and updates equipos.json with the relative path.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { chromium } = require('playwright');
const { URL } = require('url');

const DATA_PATH = path.join(__dirname, 'equipos.json');
const ESCUDO_DIR = path.join(__dirname, 'escudos');

// Mapping of team name (exact as in JSON) to URL of its "Datos del Equipo" page
const TEAM_URLS = {
  'Real Oviedo SAD "B"': 'https://www.asturfutbol.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=4080',
  'S.D. Narcea "A"': 'https://www.asturfutbol.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=4151',
  'S.D.C.R. La Corredoria "A"': 'https://www.asturfutbol.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=3473',
  'U.D. Llanera "A"': 'https://www.asturfutbol.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=3098',
};

// Load JSON
const raw = fs.readFileSync(DATA_PATH, 'utf8');
const data = JSON.parse(raw);

if (!fs.existsSync(ESCUDO_DIR)) {
  fs.mkdirSync(ESCUDO_DIR);
  console.log('📁 Created escudos folder');
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
    const url = TEAM_URLS[equipo.nombre];
    if (!url) continue; // only process the four specified teams

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // Find escudo image
      const imgSrc = await page.evaluate(() => {
        const img = document.querySelector('img[src*="/pnfg/pimg/Clubes/"]');
        return img ? img.getAttribute('src') : null;
      });

      if (!imgSrc) {
        console.warn(`⚠️ No escudo image found for ${equipo.nombre}`);
        continue;
      }

      const fullUrl = imgSrc.startsWith('http') ? imgSrc : `https://www.asturfutbol.es${imgSrc}`;
      const filename = path.basename(new URL(fullUrl).pathname);
      const destPath = path.join(ESCUDO_DIR, filename);
      await download(fullUrl, destPath);
      equipo.escudo = `escudos/${filename}`;
      console.log(`✅ ${equipo.nombre} → ${destPath}`);
    } catch (e) {
      console.error(`❌ Error processing ${equipo.nombre}: ${e.message}`);
    }
  }

  await browser.close();

  // Save updated JSON
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('📝 equipos.json actualizado con los escudos de los 4 equipos.');
})();
