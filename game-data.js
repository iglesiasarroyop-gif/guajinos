// ===== DATOS Y UTILIDADES =====
const COLOR_MAP = {
    'roja':'#e53935','rojo':'#e53935','rojas':'#e53935',
    'azul':'#1565c0','azules':'#1565c0',
    'blanca':'#f5f5f5','blanco':'#f5f5f5','blancas':'#f5f5f5',
    'verde':'#2e7d32','verdes':'#2e7d32',
    'negra':'#333','negro':'#333','negras':'#333',
    'amarilla':'#fdd835','amarillo':'#fdd835',
    '0':'#888','':'#888'
};

function mapColor(name) {
    if (!name) return '#888';
    return COLOR_MAP[name.toLowerCase()] || '#888';
}

function getFirstName(full) {
    if (!full) return '???';
    if (full.includes(',')) {
        const parts = full.split(',');
        if (parts[1]) {
            const firstNames = parts[1].trim().split(' ');
            return firstNames[0];
        }
        return parts[0].trim();
    }
    return full.split(' ')[0];
}

// Posiciones para fútbol 7 (en el campo de alineación, vertical, % del contenedor)
const FORMATION_SLOTS = [
    { id:'GK', label:'POR', x:85, y:88 },
    { id:'DF1', label:'DEF', x:25, y:70 },
    { id:'DF2', label:'DEF', x:75, y:70 },
    { id:'MF1', label:'MC', x:25, y:45 },
    { id:'MF2', label:'MC', x:75, y:45 },
    { id:'FW1', label:'DEL', x:30, y:20 },
    { id:'FW2', label:'DEL', x:70, y:20 }
];

const FORMATIONS = {
    '2-2-2': [
        { id:'GK', label:'POR', x:50, y:93, role:'goalkeeper' },
        { id:'DF1', label:'DEF', x:35, y:68 },
        { id:'DF2', label:'DEF', x:65, y:68 },
        { id:'MF1', label:'MC', x:35, y:42 },
        { id:'MF2', label:'MC', x:65, y:42 },
        { id:'FW1', label:'DEL', x:35, y:18 },
        { id:'FW2', label:'DEL', x:65, y:18 }
    ],
    '3-2-1': [
        { id:'GK', label:'POR', x:50, y:93, role:'goalkeeper' },
        { id:'DF1', label:'DEF', x:25, y:68 },
        { id:'DF2', label:'DEF', x:50, y:72 },
        { id:'DF3', label:'DEF', x:75, y:68 },
        { id:'MF1', label:'MC', x:35, y:45 },
        { id:'MF2', label:'MC', x:65, y:45 },
        { id:'FW1', label:'DEL', x:50, y:18 }
    ],
    '2-3-1': [
        { id:'GK', label:'POR', x:50, y:93, role:'goalkeeper' },
        { id:'DF1', label:'DEF', x:30, y:68 },
        { id:'DF2', label:'DEF', x:70, y:68 },
        { id:'MF1', label:'MC', x:20, y:45 },
        { id:'MF2', label:'MC', x:50, y:50 },
        { id:'MF3', label:'MC', x:80, y:45 },
        { id:'FW1', label:'DEL', x:50, y:18 }
    ]
};

// Posiciones en el juego real (horizontal, relativas) - deben coincidir con FORMATIONS
const GAME_POS_TEAM0 = {
    '2-2-2': [
        { role:'goalkeeper', rx:0.08, ry:0.50 },
        { role:'defender', rx:0.22, ry:0.68 },
        { role:'defender', rx:0.22, ry:0.32 },
        { role:'midfielder', rx:0.42, ry:0.68 },
        { role:'midfielder', rx:0.42, ry:0.32 },
        { role:'attacker', rx:0.60, ry:0.65 },
        { role:'attacker', rx:0.60, ry:0.35 }
    ],
    '3-2-1': [
        { role:'goalkeeper', rx:0.08, ry:0.50 },
        { role:'defender', rx:0.18, ry:0.68 },
        { role:'defender', rx:0.18, ry:0.32 },
        { role:'defender', rx:0.28, ry:0.50 },
        { role:'midfielder', rx:0.42, ry:0.68 },
        { role:'midfielder', rx:0.42, ry:0.32 },
        { role:'attacker', rx:0.60, ry:0.50 }
    ],
    '2-3-1': [
        { role:'goalkeeper', rx:0.08, ry:0.50 },
        { role:'defender', rx:0.22, ry:0.68 },
        { role:'defender', rx:0.22, ry:0.32 },
        { role:'midfielder', rx:0.38, ry:0.68 },
        { role:'midfielder', rx:0.38, ry:0.50 },
        { role:'midfielder', rx:0.38, ry:0.32 },
        { role:'attacker', rx:0.60, ry:0.50 }
    ]
};
const GAME_POS_TEAM1 = {
    '2-2-2': [
        { role:'goalkeeper', rx:0.92, ry:0.50 },
        { role:'defender', rx:0.78, ry:0.68 },
        { role:'defender', rx:0.78, ry:0.32 },
        { role:'midfielder', rx:0.58, ry:0.68 },
        { role:'midfielder', rx:0.58, ry:0.32 },
        { role:'attacker', rx:0.40, ry:0.65 },
        { role:'attacker', rx:0.40, ry:0.35 }
    ],
    '3-2-1': [
        { role:'goalkeeper', rx:0.92, ry:0.50 },
        { role:'defender', rx:0.82, ry:0.68 },
        { role:'defender', rx:0.82, ry:0.32 },
        { role:'defender', rx:0.72, ry:0.50 },
        { role:'midfielder', rx:0.58, ry:0.68 },
        { role:'midfielder', rx:0.58, ry:0.32 },
        { role:'attacker', rx:0.40, ry:0.50 }
    ],
    '2-3-1': [
        { role:'goalkeeper', rx:0.92, ry:0.50 },
        { role:'defender', rx:0.78, ry:0.68 },
        { role:'defender', rx:0.78, ry:0.32 },
        { role:'midfielder', rx:0.62, ry:0.68 },
        { role:'midfielder', rx:0.62, ry:0.50 },
        { role:'midfielder', rx:0.62, ry:0.32 },
        { role:'attacker', rx:0.40, ry:0.50 }
    ]
};

let teamsData = [];

const gameConfig = {
    gameSpeed: 0.5,
    matchDuration: 2,
    userShirtColor: null,
    userPantsColor: null,
    difficulty: 1.0
};

const AMBIENT_MUSIC_PATH = "musica/ambiente.mp3";
const GOAL_SOUND_PATH = "musica/gol.mp3";
const MENU_MUSIC_PATH = "musica/fondo.mp3";

async function loadTeams() {
    teamsData = EQUIPOS_INLINE.equipos.filter(e => e.jugadores && e.jugadores.length >= 7 && e.estado !== 'Pendiente de renovación');
    return teamsData;
}
