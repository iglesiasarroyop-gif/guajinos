// @ts-check
/**
 * Ejemplo básico de Web Scraping con Playwright
 * 
 * Ejecutar con: node scraper-ejemplo.js
 * 
 * Este script demuestra las capacidades principales de Playwright
 * para scraping: navegación, extracción de datos, screenshots, 
 * espera de elementos y ejecución de JS en el contexto del navegador.
 */

const { chromium } = require('playwright');

(async () => {
  // =============================================
  // 1. LANZAR NAVEGADOR
  // =============================================
  // headless: true  → Sin ventana (más rápido, ideal para producción)
  // headless: false → Con ventana visible (útil para depurar)
  const browser = await chromium.launch({
    headless: true,
    // slowMo: 100,  // Descomenta para ver las acciones más lento
  });

  // Crear un contexto (equivalente a una sesión de navegador aislada)
  const context = await browser.newContext({
    // Puedes emular dispositivos:
    // ...devices['iPhone 13'],
    
    // O configurar viewport personalizado:
    viewport: { width: 1280, height: 720 },
    
    // User-Agent personalizado (útil para evitar bloqueos):
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  // Crear una nueva pestaña/página
  const page = await context.newPage();

  try {
    // =============================================
    // 2. NAVEGAR A UNA WEB
    // =============================================
    console.log('🌐 Navegando a example.com...');
    await page.goto('https://example.com/', {
      waitUntil: 'domcontentloaded', // Opciones: 'load', 'domcontentloaded', 'networkidle'
      timeout: 30000,                // Timeout en ms
    });

    // =============================================
    // 3. EXTRAER DATOS CON LOCATORS (Método recomendado)
    // =============================================
    // Los Locators son la forma moderna y recomendada de buscar elementos
    
    // Obtener texto de un elemento
    const titulo = await page.locator('h1').textContent();
    console.log(`📄 Título: ${titulo}`);

    // Obtener todos los párrafos
    const parrafos = await page.locator('p').allTextContents();
    console.log(`📝 Párrafos encontrados: ${parrafos.length}`);
    parrafos.forEach((p, i) => console.log(`   [${i}] ${p.substring(0, 80)}...`));

    // Obtener atributos de enlaces
    const enlaces = await page.locator('a').all();
    console.log(`🔗 Enlaces encontrados: ${enlaces.length}`);
    for (const enlace of enlaces) {
      const href = await enlace.getAttribute('href');
      const text = await enlace.textContent();
      console.log(`   → ${text?.trim()} (${href})`);
    }

    // =============================================
    // 4. EJECUTAR JAVASCRIPT EN EL CONTEXTO DEL NAVEGADOR
    // =============================================
    // page.evaluate() ejecuta código JS directamente en el navegador
    const datosExtraidos = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || 'N/A',
        totalElementos: document.querySelectorAll('*').length,
      };
    });
    console.log('\n📊 Datos extraídos con evaluate():');
    console.log(JSON.stringify(datosExtraidos, null, 2));

    // =============================================
    // 5. CAPTURAR SCREENSHOT
    // =============================================
    await page.screenshot({
      path: 'screenshot-ejemplo.png',
      fullPage: true, // Captura toda la página, no solo lo visible
    });
    console.log('\n📸 Screenshot guardado como screenshot-ejemplo.png');

    // =============================================
    // 6. ESPERAR POR ELEMENTOS (Fundamental para SPAs)
    // =============================================
    // Playwright auto-espera por defecto, pero puedes ser explícito:
    // await page.waitForSelector('.mi-clase', { timeout: 5000 });
    // await page.waitForLoadState('networkidle');
    // await page.waitForURL('**/pagina-destino');

    // =============================================
    // 7. INTERACCIÓN (clicks, formularios, etc.)
    // =============================================
    // await page.locator('button#submit').click();
    // await page.locator('input[name="search"]').fill('término de búsqueda');
    // await page.locator('select#category').selectOption('valor');
    // await page.keyboard.press('Enter');

    console.log('\n✅ Scraping completado exitosamente!');

  } catch (error) {
    console.error('❌ Error durante el scraping:', error.message);
  } finally {
    // =============================================
    // 8. CERRAR NAVEGADOR (SIEMPRE en finally)
    // =============================================
    await context.close();
    await browser.close();
    console.log('🔒 Navegador cerrado.');
  }
})();
