// @ts-check
/**
 * 🕷️ Scraper de Equipos de Fútbol - Federación Asturiana (v3 - Optimizado)
 * 
 * Flujo optimizado:
 *   1. Listado de equipos → Obtiene codequipo de cada equipo
 *   2. URL directa a "Datos del Equipo" (salta página intermedia)
 *   3. Extrae jugadores, técnicos, equipación, escudo, etc.
 * 
 * Nota: Algunos equipos aparecen como "Pendiente de renovación"
 *       y no tienen datos disponibles en la web oficial.
 * 
 * Ejecutar: node scraper-futbol.js
 * Resultado: equipos.json
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURACIÓN
// ============================================================
const BASE_URL = 'https://www.asturfutbol.es';
const LISTA_EQUIPOS_URL = `${BASE_URL}/pnfg/NPcd/NFG_LstCompeticiones_Vis?cod_primaria=1000123&proxima_vez=1&codtemporada=21&Sch_Codigo_Tipo_Juego=&Sch_Codigo_Categoria=&Sch_Cod_Agrupacion=&codcompeticion=22191393&Sch_Grupo=22287266&codclub=&Club=&Sch_Nombre_Club=&Sch_Equipo=&Sch_Nombre_Equipo=`;
const OUTPUT_FILE = path.join(__dirname, 'equipos.json');
const DELAY_BETWEEN_TEAMS = 1500;

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  const time = new Date().toLocaleTimeString('es-ES');
  console.log(`[${time}] ${msg}`);
}

// ============================================================
// PASO 1: Obtener lista de equipos
// ============================================================
async function obtenerListaEquipos(page) {
  log('🌐 Navegando al listado de equipos...');
  await page.goto(LISTA_EQUIPOS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Aceptar cookies
  try {
    const cookieBtn = page.locator('button:has-text("Aceptar"), a:has-text("Aceptar todo"), .aceptar-cookies');
    await cookieBtn.first().click({ timeout: 3000 });
    log('🍪 Cookies aceptadas');
    await sleep(1000);
  } catch (e) { /* Sin popup */ }

  await page.waitForLoadState('networkidle');
  await sleep(1500);

  const equipos = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="NFG_VisCompeticiones_Equipo"]');
    return Array.from(links).map(link => {
      const row = link.closest('tr');
      const cells = row ? Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim()) : [];
      const href = link.getAttribute('href') || '';
      const match = href.match(/codequipo=(\d+)/);

      return {
        nombre: link.textContent.trim(),
        href: href,
        codequipo: match ? match[1] : '',
        club: cells.length > 3 ? cells[3] : '',
      };
    });
  });

  log(`✅ Encontrados ${equipos.length} equipos`);
  return equipos;
}

// ============================================================
// PASO 2: Extraer datos del equipo (acceso directo)
// ============================================================
async function extraerDatosEquipo(page, codequipo) {
  // URL directa a la página de datos del equipo
  const url = `${BASE_URL}/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=${codequipo}`;

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await sleep(1500);

  const datos = await page.evaluate(() => {
    const result = {
      nombre: '',
      escudo: '',
      categoria: '',
      camiseta: '',
      pantalon: '',
      medias: '',
      terrenoJuego: '',
      tecnicos: [],
      jugadores: [],
      pendienteRenovacion: false,
    };

    // Comprobar si está pendiente de renovación
    const bodyText = document.body.innerText;
    if (bodyText.includes('Pendiente de renovación') || bodyText.includes('pendiente de renovación')) {
      result.pendienteRenovacion = true;
    }

    // --- Nombre del equipo ---
    const titulos = document.querySelectorAll('h1, h2, h3, h4, .la_roja_regular_titulo1');
    for (const t of titulos) {
      const text = t.textContent.trim();
      if (text && text.length > 2 && !text.includes('Datos') && !text.includes('Competici') && !text.includes('DATOS')) {
        result.nombre = text;
        break;
      }
    }

    // --- Escudo ---
    const escudoImg = document.querySelector('img[src*="/pnfg/pimg/Clubes/"]');
    if (escudoImg) {
      const src = escudoImg.getAttribute('src') || '';
      result.escudo = src.startsWith('http') ? src : window.location.origin + src;
    }

    // --- Metadatos (h5 con strong o directamente) ---
    const h5Elements = document.querySelectorAll('h5');
    h5Elements.forEach(h5 => {
      const text = h5.textContent.trim();
      if (text.includes('Categoría')) result.categoria = text.replace(/.*Categoría\s*:\s*/i, '').trim();
      if (text.includes('Camiseta')) result.camiseta = text.replace(/.*Camiseta\s*:\s*/i, '').trim();
      if (text.includes('Pantalón')) result.pantalon = text.replace(/.*Pantalón\s*:\s*/i, '').trim();
      if (text.includes('Medias')) result.medias = text.replace(/.*Medias\s*:\s*/i, '').trim();
      if (text.includes('Terreno de juego')) result.terrenoJuego = text.replace(/.*Terreno de juego\s*:\s*/i, '').trim();
    });

    // Fallback: terreno desde enlace
    if (!result.terrenoJuego) {
      const campoLink = document.querySelector('a[href*="NFG_VisCampos"]');
      if (campoLink) result.terrenoJuego = campoLink.textContent.trim();
    }

    // --- Tablas: Jugadores y Técnicos ---
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const firstRow = table.querySelector('tr:first-child');
      const headerText = firstRow ? firstRow.textContent.trim().toLowerCase() : '';
      const rows = table.querySelectorAll('tr');

      if (headerText.includes('jugador')) {
        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll('td');
          if (cells.length > 0) {
            const nombre = cells[0].textContent.trim();
            if (nombre && nombre.length > 2) result.jugadores.push(nombre);
          }
        }
      } else if (headerText.includes('técnico') || headerText.includes('tecnico')) {
        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll('td');
          if (cells.length > 0) {
            const nombre = cells[0].textContent.trim();
            if (nombre && nombre.length > 2) result.tecnicos.push(nombre);
          }
        }
      }
    });

    // Fallback: si no encontramos jugadores con la búsqueda por header,
    // intentar encontrar tablas por posición (primera = jugadores, segunda = técnicos)
    if (result.jugadores.length === 0 && tables.length >= 1) {
      // Buscar la primera tabla que tenga más de 5 filas (probablemente jugadores)
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        if (rows.length > 5) {
          for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length > 0) {
              const nombre = cells[0].textContent.trim();
              if (nombre && nombre.length > 3 && !nombre.toLowerCase().includes('jugador')) {
                result.jugadores.push(nombre);
              }
            }
          }
          break;
        }
      }
    }

    return result;
  });

  return datos;
}

// ============================================================
// MAIN
// ============================================================
(async () => {
  log('🎭 Iniciando Playwright...');

  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  // Bloquear anuncios y recursos pesados
  await context.route('**/*google*/**', route => route.abort());
  await context.route('**/*doubleclick*/**', route => route.abort());
  await context.route('**/*adsense*/**', route => route.abort());
  await context.route('**/*analytics*/**', route => route.abort());
  await context.route('**/*googlesyndication*/**', route => route.abort());
  await context.route('**/*googletagmanager*/**', route => route.abort());
  await context.route('**/*facebook*/**', route => route.abort());

  const page = await context.newPage();

  try {
    // PASO 1: Lista de equipos
    const listaEquipos = await obtenerListaEquipos(page);

    if (listaEquipos.length === 0) {
      log('❌ No se encontraron equipos.');
      return;
    }

    // PASO 2: Scrapear cada equipo (acceso directo, sin página intermedia)
    const resultados = [];

    for (let i = 0; i < listaEquipos.length; i++) {
      const equipo = listaEquipos[i];
      log(`\n📋 [${i + 1}/${listaEquipos.length}] Procesando: ${equipo.nombre}...`);

      if (!equipo.codequipo) {
        log(`  ⚠️ Sin código de equipo`);
        resultados.push({ nombre: equipo.nombre, club: equipo.club, error: 'Sin código de equipo' });
        continue;
      }

      try {
        const datos = await extraerDatosEquipo(page, equipo.codequipo);

        if (datos.pendienteRenovacion) {
          log(`  📝 Pendiente de renovación (sin datos disponibles en la web)`);
          resultados.push({
            nombre: datos.nombre || equipo.nombre,
            club: equipo.club,
            codequipo: equipo.codequipo,
            escudo: datos.escudo,
            estado: 'Pendiente de renovación',
            jugadores: [],
            totalJugadores: 0,
          });
        } else {
          const equipoCompleto = {
            nombre: datos.nombre || equipo.nombre,
            club: equipo.club,
            codequipo: equipo.codequipo,
            escudo: datos.escudo,
            categoria: datos.categoria,
            equipacion: {
              camiseta: datos.camiseta,
              pantalon: datos.pantalon,
              medias: datos.medias,
            },
            terrenoJuego: datos.terrenoJuego,
            tecnicos: datos.tecnicos,
            jugadores: datos.jugadores,
            totalJugadores: datos.jugadores.length,
          };
          resultados.push(equipoCompleto);

          log(`  ✅ ${datos.jugadores.length} jugadores, ${datos.tecnicos.length} técnico(s)`);
          if (datos.camiseta) log(`  🎽 ${datos.camiseta}/${datos.pantalon}/${datos.medias}`);
          if (datos.terrenoJuego) log(`  🏟️  ${datos.terrenoJuego}`);
        }
      } catch (err) {
        log(`  ❌ Error: ${err.message}`);
        resultados.push({ nombre: equipo.nombre, club: equipo.club, codequipo: equipo.codequipo, error: err.message });
      }

      if (i < listaEquipos.length - 1) await sleep(DELAY_BETWEEN_TEAMS);
    }

    // PASO 3: Guardar JSON
    const output = {
      metadata: {
        fechaScraping: new Date().toISOString(),
        urlOrigen: LISTA_EQUIPOS_URL,
        totalEquipos: resultados.length,
        equiposConJugadores: resultados.filter(e => e.totalJugadores > 0).length,
        equiposPendientes: resultados.filter(e => e.estado === 'Pendiente de renovación').length,
        equiposConError: resultados.filter(e => e.error).length,
        totalJugadores: resultados.reduce((sum, e) => sum + (e.totalJugadores || 0), 0),
      },
      equipos: resultados,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

    // Generar también el JS inline para que el juego funcione sin servidor
    const INLINE_FILE = path.join(__dirname, 'equipos-inline.js');
    fs.writeFileSync(INLINE_FILE, 'const EQUIPOS_INLINE = ' + JSON.stringify(output, null, 2) + ';', 'utf-8');

    log(`\n${'═'.repeat(60)}`);
    log(`🏆 SCRAPING COMPLETADO`);
    log(`${'═'.repeat(60)}`);
    log(`📊 Equipos procesados: ${resultados.length}`);
    log(`✅ Con jugadores: ${output.metadata.equiposConJugadores}`);
    log(`📝 Pendientes renovación: ${output.metadata.equiposPendientes}`);
    log(`⚠️  Con error: ${output.metadata.equiposConError}`);
    log(`⚽ Total jugadores: ${output.metadata.totalJugadores}`);
    log(`💾 JSON: ${OUTPUT_FILE}`);
    log(`💾 JS inline: ${INLINE_FILE}`);

  } catch (error) {
    log(`❌ Error general: ${error.message}`);
    console.error(error);
  } finally {
    await context.close();
    await browser.close();
    log('🔒 Navegador cerrado.');
  }
})();
