// @ts-check
/**
 * 📊 Scrape missing data (players, kit, etc.) for specific teams.
 *   - Uses the URLs provided by the user (Datos del Equipo pages).
 *   - Extracts: categoria, equipación, terreno de juego, técnicos y jugadores.
 *   - Updates equipos.json with the gathered information.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { chromium } = require('playwright');
const { URL } = require('url');

const DATA_PATH = path.join(__dirname, 'equipos.json');

// Mapping of team name (exact JSON entry) → URL of its "Datos del Equipo" page
const TEAM_URLS = {
  'Real Oviedo SAD "B"': 'https://www.asturfutbol.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=4080',
  'S.D. Narcea "A"': 'https://www.asturfutbol.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=4151',
  'S.D.C.R. La Corredoria "A"': 'https://www.asturfutbol.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=3473',
  'U.D. Llanera "A"': 'https://www.asturfutbol.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=3098',
};

// Load current JSON
const raw = fs.readFileSync(DATA_PATH, 'utf8');
const data = JSON.parse(raw);

/** Helper to download an image (used for escudo if missing) */
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
    // Process only those with empty data and that we have a URL for
    if ((equipo.jugadores?.length === 0 || !equipo.categoria) && TEAM_URLS[equipo.nombre]) {
      const url = TEAM_URLS[equipo.nombre];
      console.log(`🔎 Scraping ${equipo.nombre} from ${url}`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await new Promise(r => setTimeout(r, 1500)); // slight wait for dynamic content

        const extracted = await page.evaluate(() => {
          const result = {
            categoria: '',
            camiseta: '',
            pantalon: '',
            medias: '',
            terrenoJuego: '',
            tecnicos: [],
            jugadores: [],
            escudo: ''
          };

          // Escudo image
          const escudoImg = document.querySelector('img[src*="/pnfg/pimg/Clubes/"]');
          if (escudoImg) result.escudo = escudoImg.getAttribute('src') || '';

          // H5 metadata (categoría, equipación, terreno)
          document.querySelectorAll('h5').forEach(h5 => {
            const txt = h5.textContent.trim();
            if (/categoría/i.test(txt)) result.categoria = txt.replace(/.*Categoría\s*[:]?\s*/i, '').trim();
            if (/camiseta/i.test(txt)) result.camiseta = txt.replace(/.*Camiseta\s*[:]?\s*/i, '').trim();
            if (/pantalón/i.test(txt)) result.pantalon = txt.replace(/.*Pantalón\s*[:]?\s*/i, '').trim();
            if (/medias/i.test(txt)) result.medias = txt.replace(/.*Medias\s*[:]?\s*/i, '').trim();
            if (/terreno de juego/i.test(txt)) result.terrenoJuego = txt.replace(/.*Terreno de juego\s*[:]?\s*/i, '').trim();
          });

          // Fallback: terreno via link
          if (!result.terrenoJuego) {
            const campo = document.querySelector('a[href*="NFG_VisCampos"]');
            if (campo) result.terrenoJuego = campo.textContent.trim();
          }

          // Tables: detect players and technicians
          const tables = document.querySelectorAll('table');
          tables.forEach(table => {
            const header = (table.querySelector('tr:first-child')?.textContent || '').toLowerCase();
            const rows = table.querySelectorAll('tr');
            if (header.includes('jugador')) {
              rows.forEach((r, idx) => {
                if (idx === 0) return; // skip header row
                const cells = r.querySelectorAll('td');
                if (cells.length) {
                  const name = cells[0].textContent.trim();
                  if (name) result.jugadores.push(name);
                }
              });
            } else if (header.includes('técnico') || header.includes('tecnico')) {
              rows.forEach((r, idx) => {
                if (idx === 0) return;
                const cells = r.querySelectorAll('td');
                if (cells.length) {
                  const name = cells[0].textContent.trim();
                  if (name) result.tecnicos.push(name);
                }
              });
            }
          });

          return result;
        });

        // Update escudo path if we got one and it's not already stored locally
        if (extracted.escudo) {
          const escudoUrl = extracted.escudo.startsWith('http') ? extracted.escudo : `https://www.asturfutbol.es${extracted.escudo}`;
          const filename = path.basename(new URL(escudoUrl).pathname);
          const escudoDest = path.join(__dirname, 'escudos', filename);
          try {
            await download(escudoUrl, escudoDest);
            equipo.escudo = `escudos/${filename}`;
            console.log(`✅ Escudo saved for ${equipo.nombre}`);
          } catch (e) {
            console.warn(`⚠️ Failed to download escudo for ${equipo.nombre}: ${e.message}`);
          }
        }

        // Fill in the extracted fields (only overwrite if we have data)
        if (extracted.categoria) equipo.categoria = extracted.categoria;
        if (extracted.camiseta) equipo.equipacion.camiseta = extracted.camiseta;
        if (extracted.pantalon) equipo.equipacion.pantalon = extracted.pantalon;
        if (extracted.medias) equipo.equipacion.medias = extracted.medias;
        if (extracted.terrenoJuego) equipo.terrenoJuego = extracted.terrenoJuego;
        if (extracted.tecnicos?.length) equipo.tecnicos = extracted.tecnicos;
        if (extracted.jugadores?.length) {
          equipo.jugadores = extracted.jugadores;
          equipo.totalJugadores = extracted.jugadores.length;
        }

        console.log(`✅ Data updated for ${equipo.nombre}`);
      } catch (err) {
        console.error(`❌ Error scraping ${equipo.nombre}: ${err.message}`);
      }
    }
  }

  await browser.close();

  // Write back the JSON
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('📝 equipos.json fully updated with missing team data.');
})();
