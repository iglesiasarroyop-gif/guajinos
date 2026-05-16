
content_to_append = """

/* ============================================================
   💎 SKILL: PREMIUM INTERFACE DESIGN (Match Screen)
   Para volver atrás, borra este bloque completo.
   ============================================================ */

:root {
    --match-ui-bg: rgba(26, 34, 54, 0.85);
    --match-ui-border: rgba(255, 255, 255, 0.1);
    --match-accent: #FFCB05;
}

/* El Marcador (Scoreboard) - Estilo TV Broadcast */
.scoreboard {
    background: var(--match-ui-bg) !important;
    backdrop-filter: blur(8px);
    border: 1px solid var(--match-ui-border) !important;
    border-radius: 50px !important;
    height: 48px !important;
    padding: 0 25px !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.4) !important;
    top: 20px !important;
    transform: translateX(-50%) !important; /* Quitar el scale 0.9 para que se vea nítido */
}

.scoreboard .sb-name {
    font-family: 'Outfit', sans-serif !important;
    font-weight: 800 !important;
    font-size: 14px !important;
    letter-spacing: 1px !important;
    color: #fff !important;
}

.scoreboard .sb-score {
    background: #000 !important;
    padding: 2px 12px !important;
    border-radius: 8px !important;
    color: var(--match-accent) !important;
    -webkit-text-stroke: 0px !important;
    text-shadow: none !important;
    font-size: 28px !important;
    margin: 0 10px !important;
}

/* Tiempo de Juego */
.match-time-bottom {
    background: var(--match-ui-bg) !important;
    backdrop-filter: blur(8px);
    border: 1px solid var(--match-ui-border) !important;
    border-radius: 30px !important;
    top: 20px !important;
    left: 20px !important;
    opacity: 1 !important;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3) !important;
}

/* Widget de Posesión - Más limpio */
#possession-widget {
    background: var(--match-ui-bg) !important;
    backdrop-filter: blur(8px);
    border: 1px solid var(--match-ui-border) !important;
    border-radius: 15px !important;
    bottom: 20px !important;
    box-shadow: 0 5px 20px rgba(0,0,0,0.3) !important;
}

.poss-bar-bg {
    height: 6px !important;
    background: rgba(255,255,255,0.1) !important;
    border: none !important;
    border-radius: 10px !important;
}

/* Mensaje de GOL */
#game-message {
    font-size: clamp(80px, 12vw, 150px) !important;
    -webkit-text-stroke: 2px #fff !important;
    text-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
}

/* Botones de control en partido */
.game-btn-group .btn-game-sound, 
.game-btn-group .btn-tactic-game, 
.game-btn-group .btn-end-match {
    background: var(--match-ui-bg) !important;
    backdrop-filter: blur(8px);
    border: 1px solid var(--match-ui-border) !important;
    border-radius: 12px !important;
    opacity: 1 !important;
    width: 40px !important;
    height: 40px !important;
}

.game-btn-group .btn-end-match {
    background: rgba(229, 57, 53, 0.8) !important;
}
"""

with open('styles.css', 'a', encoding='utf-8') as f:
    f.write(content_to_append)
