// @ts-check
/**
 * 📥 Descarga todos los escudos de los equipos y actualiza equipos.json
 *   - Guarda los archivos en ./escudos/
 *   - Cambia la propiedad `escudo` a la ruta relativa "escudos/<filename>"
 */

const fs = require('fs');
const https = require('https');
const path = require('path');
const { URL } = require('url');

const DATA_PATH = path.join(__dirname, 'equipos.json');
const ESCUDO_DIR = path.join(__dirname, 'escudos');

// Leer JSON
const raw = fs.readFileSync(DATA_PATH, 'utf8');
const data = JSON.parse(raw);

// Crear carpeta si falta
if (!fs.existsSync(ESCUDO_DIR)) {
  fs.mkdirSync(ESCUDO_DIR);
  console.log('📁 Carpeta "escudos" creada.');
}

/**
 * Descarga una URL a un archivo local.
 * @param {string} urlStr
 * @param {string} dest
 * @returns {Promise<void>}
 */
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

/**
 * Ejecuta la descarga y actualiza el JSON.
 */
(async () => {
  for (const equipo of data.equipos) {
    if (equipo.escudo && typeof equipo.escudo === 'string' && equipo.escudo.startsWith('http')) {
      const filename = path.basename(new URL(equipo.escudo).pathname);
      const destPath = path.join(ESCUDO_DIR, filename);
      try {
        await download(equipo.escudo, destPath);
        // Cambiar la ruta a relativa (uso de '/' para que sea portable)
        equipo.escudo = `escudos/${filename}`;
        console.log(`✅ ${equipo.nombre} → ${destPath}`);
      } catch (e) {
        console.error(`⚠️ Error al descargar ${equipo.escudo}: ${e.message}`);
      }
    }
  }

  // Guardar JSON actualizado
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('📝 equipos.json actualizado con rutas relativas.');
})();
