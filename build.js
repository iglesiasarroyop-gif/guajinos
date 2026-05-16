/**
 * 🔨 Build Script - Super Liquid Soccer
 * 
 * Genera un único archivo HTML distribuible con todo el código
 * minificado y ofuscado.
 * 
 * Instalar dependencias: npm install terser javascript-obfuscator
 * Ejecutar: node build.js
 * Resultado: dist/super-liquid-soccer.html
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

async function build() {
    console.log('🔨 Iniciando build...\n');

    // 1. Leer todos los archivos fuente
    const css = fs.readFileSync('styles.css', 'utf8');
    const dataJs = fs.readFileSync('game-data.js', 'utf8');
    const uiJs = fs.readFileSync('game-ui.js', 'utf8');
    const engineJs = fs.readFileSync('game-engine.js', 'utf8');
    const leagueJs = fs.readFileSync('league-engine.js', 'utf8');
    const inlineJs = fs.readFileSync('equipos-inline.js', 'utf8');
    const html = fs.readFileSync('index.html', 'utf8');

    // 2. Embeber escudos como base64 en el JS inline
    console.log('🖼️  Embebiendo escudos como base64...');
    let inlineJsProcessed = inlineJs;
    const escudoRegex = /escudos\/[^"]+/g;
    const matches = inlineJs.match(escudoRegex) || [];
    const uniquePaths = [...new Set(matches)];
    let embedded = 0;

    uniquePaths.forEach(escudoPath => {
        const fullPath = path.join(__dirname, escudoPath);
        if (fs.existsSync(fullPath)) {
            const ext = path.extname(fullPath).toLowerCase().replace('.', '');
            const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml' };
            const mime = mimeMap[ext] || 'image/png';
            const b64 = fs.readFileSync(fullPath).toString('base64');
            const dataUri = `data:${mime};base64,${b64}`;
            inlineJsProcessed = inlineJsProcessed.split(escudoPath).join(dataUri);
            embedded++;
        }
    });
    console.log(`✅ ${embedded}/${uniquePaths.length} escudos embebidos`);

    // 3. Concatenar todo el JS
    let allJs = [inlineJsProcessed, dataJs, leagueJs, uiJs, engineJs].join('\n');
    
    // 3.1. Embeber música de ambiente como base64
    console.log('🎵 Embebiendo música de ambiente...');
    const musicPath = 'musica/ambiente.mp3';
    const fullMusicPath = path.join(__dirname, musicPath);
    if (fs.existsSync(fullMusicPath)) {
        const musicB64 = fs.readFileSync(fullMusicPath).toString('base64');
        const musicDataUri = `data:audio/mpeg;base64,${musicB64}`;
        // Reemplazar la ruta por el data URI en el código
        allJs = allJs.split(musicPath).join(musicDataUri);
        console.log('✅ Música de ambiente embebida');
    } else {
        console.warn(`⚠️  No se encontró el archivo de música en ${musicPath}`);
    }

    // 3.2. Embeber sonido de gol como base64
    console.log('⚽ Embebiendo sonido de gol...');
    const goalPath = 'musica/gol.mp3';
    const fullGoalPath = path.join(__dirname, goalPath);
    if (fs.existsSync(fullGoalPath)) {
        const goalB64 = fs.readFileSync(fullGoalPath).toString('base64');
        const goalDataUri = `data:audio/mpeg;base64,${goalB64}`;
        // Reemplazar la ruta por el data URI en el código
        allJs = allJs.split(goalPath).join(goalDataUri);
        console.log('✅ Sonido de gol embebido');
    } else {
        console.warn(`⚠️  No se encontró el archivo de sonido de gol en ${goalPath}`);
    }

    // 3.3. Embeber música de menú como base64
    console.log('🎹 Embebiendo música de menú...');
    const menuMusicPath = 'musica/fondo.mp3';
    const fullMenuPath = path.join(__dirname, menuMusicPath);
    if (fs.existsSync(fullMenuPath)) {
        const menuB64 = fs.readFileSync(fullMenuPath).toString('base64');
        const menuDataUri = `data:audio/mpeg;base64,${menuB64}`;
        // Reemplazar la ruta por el data URI en el código
        allJs = allJs.split(menuMusicPath).join(menuDataUri);
        console.log('✅ Música de menú embebida');
    } else {
        console.warn(`⚠️  No se encontró el archivo de música de menú en ${menuMusicPath}`);
    }

    // 3.4. Embeber pitido normal como base64
    console.log('🎺 Embebiendo pitido normal...');
    const whistlePath = 'musica/pitido.mp3';
    const fullWhistlePath = path.join(__dirname, whistlePath);
    if (fs.existsSync(fullWhistlePath)) {
        const whistleB64 = fs.readFileSync(fullWhistlePath).toString('base64');
        const whistleDataUri = `data:audio/mpeg;base64,${whistleB64}`;
        allJs = allJs.split(whistlePath).join(whistleDataUri);
        console.log('✅ Pitido normal embebido');
    }

    // 3.5. Embeber pitido final como base64
    console.log('🏁 Embebiendo pitido final...');
    const finalWhistlePath = 'musica/pitidoFinal.mp3';
    const fullFinalWhistlePath = path.join(__dirname, finalWhistlePath);
    if (fs.existsSync(fullFinalWhistlePath)) {
        const finalWhistleB64 = fs.readFileSync(fullFinalWhistlePath).toString('base64');
        const finalWhistleDataUri = `data:audio/mpeg;base64,${finalWhistleB64}`;
        allJs = allJs.split(finalWhistlePath).join(finalWhistleDataUri);
        console.log('✅ Pitido final embebido');
    }

    // 4. Minificar con Terser
    console.log('📦 Minificando JavaScript...');
    const minified = await minify(allJs, {
        compress: { drop_console: false, passes: 2 },
        mangle: { toplevel: false },
        format: { comments: false }
    });

    if (minified.error) {
        console.error('❌ Error de minificación:', minified.error);
        return;
    }

    // 5. Ofuscar (opcional)
    let finalJs = minified.code;
    try {
        const JavaScriptObfuscator = require('javascript-obfuscator');
        console.log('🔒 Ofuscando código...');
        const obfuscated = JavaScriptObfuscator.obfuscate(finalJs, {
            compact: true,
            controlFlowFlattening: false,
            stringArray: true,
            stringArrayThreshold: 0.5,
            rotateStringArray: true,
            selfDefending: false,
            identifierNamesGenerator: 'hexadecimal'
        });
        finalJs = obfuscated.getObfuscatedCode();
        console.log('✅ Código ofuscado');
    } catch(e) {
        console.log('⚠️  javascript-obfuscator no instalado, usando solo minificación');
    }

    // 6. Minificar CSS y embeber imágenes
    console.log('🎨 Embebiendo imágenes en CSS...');
    let processedCss = css;
    const cssImageRegex = /url\(['"]?([^'"]+)['"]?\)/g;
    let cssMatch;
    const cssImages = new Set();
    while ((cssMatch = cssImageRegex.exec(css)) !== null) {
        cssImages.add(cssMatch[1]);
    }

    cssImages.forEach(imgPath => {
        const fullPath = path.join(__dirname, imgPath);
        if (fs.existsSync(fullPath)) {
            const ext = path.extname(fullPath).toLowerCase().replace('.', '');
            const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml' };
            const mime = mimeMap[ext] || 'image/png';
            const b64 = fs.readFileSync(fullPath).toString('base64');
            const dataUri = `data:${mime};base64,${b64}`;
            processedCss = processedCss.split(imgPath).join(dataUri);
        }
    });

    const minCss = processedCss
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .trim();

    // 7. Generar Manifest PWA como Data URI
    console.log('📱 Generando Manifest PWA...');
    const manifest = {
        name: "Guajinos Soccer",
        short_name: "Guajinos",
        description: "Simulador de fútbol base",
        start_url: ".",
        display: "standalone",
        background_color: "#8bc34a",
        theme_color: "#1a2236",
        orientation: "landscape",
        icons: [
            {
                src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%231a2236'/><text y='.75em' x='5' font-size='80'>⚽</text></svg>",
                sizes: "192x192",
                type: "image/svg+xml"
            },
            {
                src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%231a2236'/><text y='.75em' x='5' font-size='80'>⚽</text></svg>",
                sizes: "512x512",
                type: "image/svg+xml"
            }
        ]
    };
    const manifestDataUri = 'data:application/json;base64,' + Buffer.from(JSON.stringify(manifest)).toString('base64');

    // 8. Construir HTML final
    const bodyMatch = html.match(/<body>([\s\S]*?)<script/);
    const bodyContent = bodyMatch ? bodyMatch[1].trim() : '';

    const finalHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no,viewport-fit=cover">
<title>Guajinos Soccer</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Guajinos">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#1a2236">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚽</text></svg>">
<link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%231a2236%22/><text y=%22.75em%22 x=%225%22 font-size=%2280%22>⚽</text></svg>">
<link rel="manifest" href="${manifestDataUri}">
<style>${minCss}</style>
</head>
<body>
${bodyContent}
<script>${finalJs}</script>
</body>
</html>`;

    // 8. Guardar
    if (!fs.existsSync('dist')) fs.mkdirSync('dist');
    const outFile = path.join('dist', 'super-liquid-soccer.html');
    fs.writeFileSync(outFile, finalHtml, 'utf8');

    const sizeKB = (Buffer.byteLength(finalHtml, 'utf8') / 1024).toFixed(1);
    const originalSize = (Buffer.byteLength(allJs + css, 'utf8') / 1024).toFixed(1);

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🏆 BUILD COMPLETADO`);
    console.log(`${'═'.repeat(50)}`);
    console.log(`📄 Archivo: ${outFile}`);
    console.log(`📏 Original: ${originalSize} KB → Final: ${sizeKB} KB`);
    console.log(`📦 TODO EN UN SOLO ARCHIVO (sin carpeta escudos)`);
    console.log(`\n💡 Abre ${outFile} con doble clic para jugar`);
}

build().catch(err => console.error('❌ Error:', err));
