
content_to_append = """

/* ============================================================
   💎 SKILL: PREMIUM INTERFACE DESIGN (Lineup Screen)
   Para volver atrás, borra este bloque completo.
   ============================================================ */

:root {
    --premium-glass: rgba(255, 255, 255, 0.08);
    --premium-glass-border: rgba(255, 255, 255, 0.15);
    --premium-gold: linear-gradient(180deg, #ffd43b 0%, #fab005 100%);
    --premium-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    --premium-text-primary: #f8f9fa;
    --premium-text-secondary: rgba(255, 255, 255, 0.6);
}

/* Redefinición de la Pantalla de Alineación */
#lineup-screen {
    background: radial-gradient(circle at center, #1a2236 0%, #0a0e17 100%) !important;
}

.lineup-header-bar {
    background: transparent !important;
    border-bottom: 1px solid var(--premium-glass-border) !important;
    height: 80px;
    padding: 0 30px;
}

.lineup-team-pill {
    background: var(--premium-glass) !important;
    backdrop-filter: blur(10px);
    border: 1px solid var(--premium-glass-border) !important;
    box-shadow: var(--premium-shadow);
}

.lineup-team-name {
    color: #fff !important;
    text-shadow: 0 2px 10px rgba(0,0,0,0.5) !important;
    -webkit-text-stroke: 0px !important;
}

/* Paneles Laterales (Ahora son de "Cristal") */
.team-info-panel, .players-panel {
    background: var(--premium-glass) !important;
    backdrop-filter: blur(12px);
    border: 1px solid var(--premium-glass-border) !important;
    border-radius: 24px !important;
    box-shadow: var(--premium-shadow);
    color: var(--premium-text-primary);
}

.players-panel h3 {
    color: var(--secondary-yellow) !important;
    letter-spacing: 2px;
    font-size: 14px !important;
    margin-bottom: 15px !important;
}

.team-info-panel div[style*="font-weight:900"] {
    color: var(--premium-text-secondary) !important;
    letter-spacing: 2px !important;
    font-weight: 700 !important;
}

/* El Campo de Juego (Más profundo) */
.field-container {
    background: linear-gradient(180deg, #134e1f 0%, #1e6b2e 100%) !important;
    border: 2px solid rgba(255,255,255,0.1) !important;
    box-shadow: inset 0 0 50px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.4);
}

/* Los Slots de Jugadores */
.pos-circle {
    background: rgba(0,0,0,0.4) !important;
    border: 2px solid rgba(255,255,255,0.3) !important;
    box-shadow: 0 0 15px rgba(0,0,0,0.3) !important;
}

.position-slot.filled .pos-circle {
    background: var(--primary-blue) !important;
    border-color: #fff !important;
}

.position-slot .pos-player, .position-slot .pos-player-top {
    background: #fff !important;
    color: #000 !important;
    border: none !important;
    border-radius: 4px !important;
    font-family: 'Outfit', sans-serif !important;
    font-weight: 800 !important;
    font-size: 10px !important;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
}

/* Items de la lista de jugadores */
.player-item {
    background: rgba(255,255,255,0.05) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    color: #fff !important;
    font-family: 'Outfit', sans-serif !important;
    font-weight: 600 !important;
    border-radius: 10px !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.player-item:hover {
    background: rgba(255,255,255,0.15) !important;
    transform: translateX(5px) !important;
    border-color: var(--secondary-yellow) !important;
}

.player-item.used {
    background: rgba(255,255,255,0.02) !important;
    opacity: 0.3 !important;
}

/* Controles segmentados premium */
.segmented-control {
    background: rgba(0,0,0,0.2) !important;
    border: 1px solid var(--premium-glass-border) !important;
}

.segmented-control .segment.active {
    background: var(--premium-gold) !important;
    color: #000 !important;
    box-shadow: 0 4px 15px rgba(250, 176, 5, 0.3);
}

/* Botón de Jugar (Final Boss) */
.btn-start-match {
    background: var(--premium-gold) !important;
    border: none !important;
    color: #000 !important;
    font-family: 'Luckiest Guy', cursive !important;
    font-size: 24px !important;
    letter-spacing: 2px !important;
    border-radius: 50px !important;
    box-shadow: 0 10px 20px rgba(250, 176, 5, 0.2) !important;
    text-shadow: none !important;
    transition: all 0.4s !important;
}

.btn-start-match.ready:hover {
    transform: translateY(-3px) scale(1.05) !important;
    box-shadow: 0 15px 30px rgba(250, 176, 5, 0.4) !important;
}

/* Iconos de cabecera */
.icon-btn {
    background: var(--premium-glass) !important;
    border: 1px solid var(--premium-glass-border) !important;
    border-radius: 12px !important;
}
"""

with open('styles.css', 'a', encoding='utf-8') as f:
    f.write(content_to_append)
