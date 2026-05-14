// ===== GESTIÓN DE PANTALLAS Y UI =====
function triggerHaptic(type = 'light') {
    if (!window.navigator || !window.navigator.vibrate) return;
    switch (type) {
        case 'light': window.navigator.vibrate(10); break;
        case 'medium': window.navigator.vibrate(30); break;
        case 'heavy': window.navigator.vibrate(80); break;
        case 'goal': window.navigator.vibrate([100, 50, 100]); break;
        case 'success': window.navigator.vibrate([20, 10, 20]); break;
    }
}
let currentScreen = 'menu';
let gameMode = 'match';
let selectedTeam = null;
let rivalTeam = null;
let lineup = {}; // {slotId: playerName}
let activeSlot = null;
let lastScreenBeforeSettings = 'menu';
let selectedTactic = '2-2-2';
let matchInProgress = false;

const PRESET_COLORS = [
    '#e53935', '#1565c0', '#f5f5f5', '#2e7d32', '#333333', 
    '#fdd835', '#fb8c00', '#8e24aa', '#00acc1', '#546e7a'
];

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('game-ui').classList.remove('active');
    const el = document.getElementById(id + '-screen');
    if (el) {
        el.classList.add('active');
        triggerHaptic('light');
    }
    currentScreen = id;
}

function goToMenu() {
    matchInProgress = false;
    updateMenuLeagueButtons();
    showScreen('menu');
    if (typeof stopGame === 'function') stopGame();
}

function showLoadGameScreen() {
    renderLoadGameList();
    showScreen('load-game');
}

function renderLoadGameList() {
    const list = document.getElementById('load-games-list');
    if (!list) return;
    
    const savedLeagues = typeof getAllSavedLeagues === 'function' ? getAllSavedLeagues() : [];
    list.innerHTML = '';

    if (savedLeagues.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:rgba(255,255,255,0.7);">No hay partidas guardadas</div>';
        return;
    }

    savedLeagues.forEach((league, idx) => {
        const row = document.createElement('div');
        row.style.position = 'relative';
        row.style.width = '100%';
        row.style.marginBottom = '15px';

        const btn = document.createElement('button');
        btn.className = 'premium-btn btn-gold';
        btn.style.height = '80px';
        
        const tData = teamsData.find(t => t.nombre === league.userTeamId);
        const badge = tData && tData.escudo ? `<img src="${tData.escudo}" style="width:40px;height:40px;margin-right:15px;vertical-align:middle;border:2px solid #000;border-radius:8px;background:#fff">` : '⚽ ';
        
        btn.innerHTML = `<span class="btn-text" style="display:flex; align-items:center; justify-content:center; width:100%">${badge}<div style="text-align:left"><div>${league.userTeamId.toUpperCase()}</div><div style="font-size:14px; opacity:0.8; font-family:Outfit, sans-serif;">JORNADA ${league.currentMatchday}</div></div></span>`;
        btn.onclick = () => {
            loadLeagueState(idx);
            renderLeagueHub();
            showScreen('league-hub');
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-league-btn';
        delBtn.innerHTML = '×';
        delBtn.style.width = '36px';
        delBtn.style.height = '36px';
        delBtn.style.top = '-5px';
        delBtn.style.right = '-5px';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`¿Borrar la partida con el ${league.userTeamId}?`)) {
                deleteLeagueState(idx);
                renderLoadGameList();
                updateMenuLeagueButtons();
            }
        };

        row.appendChild(btn);
        row.appendChild(delBtn);
        list.appendChild(row);
    });
}



function openSettings() {
    if (matchInProgress) {
        return; // No permitir ajustes durante el partido
    }
    lastScreenBeforeSettings = currentScreen;
    if (gameState === 'playing') {
        gameState = 'paused';
    }

    document.querySelectorAll('.segmented-control').forEach(sc => {
        if (sc.id === 'setting-speed') {
            currentVal = parseFloat(gameConfig.gameSpeed);
        } else if (sc.id === 'setting-difficulty') {
            currentVal = parseFloat(gameConfig.difficulty);
        } else {
            currentVal = parseInt(gameConfig.matchDuration);
        }
        sc.querySelectorAll('.segment').forEach(seg => {
            const segVal = sc.id === 'setting-duration' ? parseInt(seg.dataset.value) : parseFloat(seg.dataset.value);
            seg.classList.toggle('active', segVal === currentVal);
        });
    });

    showScreen('settings');
}

function renderColorGrid(type, onChangeCallback) {
    const gridId = type === 'shirt' ? 'shirt-color-grid' : 'pants-color-grid';
    const configKey = type === 'shirt' ? 'userShirtColor' : 'userPantsColor';
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    const currentColor = gameConfig[configKey];

    PRESET_COLORS.forEach(color => {
        const opt = document.createElement('div');
        opt.className = 'color-option' + (currentColor === color ? ' selected' : '');
        opt.style.backgroundColor = color;
        opt.addEventListener('click', () => {
            gameConfig[configKey] = color;
            renderColorGrid(type, onChangeCallback);
            if (onChangeCallback) onChangeCallback();
            
            // Apply immediately to active players if they exist
            if (typeof players !== 'undefined' && players.length > 0) {
                players.forEach(p => {
                    if (p.team === 0 && !p.isGoalie && !p.isEmergencyGoalkeeper) {
                        if (type === 'shirt') p.shirtColor = color;
                        if (type === 'pants') p.pantsColor = color;
                    }
                });
                if (type === 'shirt') {
                    const ph = document.getElementById('possession-home');
                    if (ph) ph.style.background = color;
                    const pth = document.getElementById('poss-text-home');
                    if (pth) pth.style.color = color;
                }
            }
        });
        grid.appendChild(opt);
    });
}

function saveSettings() {
    const speedControl = document.getElementById('setting-speed');
    const diffControl = document.getElementById('setting-difficulty');
    const durationControl = document.getElementById('setting-duration');

    const speedActive = speedControl.querySelector('.segment.active');
    const diffActive = diffControl.querySelector('.segment.active');
    const durationActive = durationControl.querySelector('.segment.active');

    gameConfig.gameSpeed = speedActive ? parseFloat(speedActive.dataset.value) : 1.0;
    gameConfig.difficulty = diffActive ? parseFloat(diffActive.dataset.value) : 1.0;
    gameConfig.matchDuration = durationActive ? parseInt(durationActive.dataset.value) : 2;

    if (typeof currentAiDiff !== 'undefined') currentAiDiff = gameConfig.difficulty;

    if (typeof players !== 'undefined' && players.length > 0) {
        players.forEach(p => {
            if (p.team === 0) {
                if (gameConfig.userShirtColor) p.shirtColor = gameConfig.userShirtColor;
                if (gameConfig.userPantsColor) p.pantsColor = gameConfig.userPantsColor;
            }
        });
    }

    if (lastScreenBeforeSettings === 'none') {
        showScreen('none');
        document.getElementById('game-ui').classList.add('active');
        if (gameState === 'paused') {
            gameState = 'playing';
        }
    } else {
        showScreen(lastScreenBeforeSettings);
    }
    triggerHaptic('success');
}

function startTeamSelect(mode) {
    gameMode = mode;
    selectedTeam = null;
    rivalTeam = null;
    lineup = {};
    gameConfig.userShirtColor = null;
    gameConfig.userPantsColor = null;
    renderTeamSelect('team-select');
    showScreen('team-select');
}

function renderTeamSelect(screenId) {
    const grid = document.querySelector('#' + screenId + '-screen .teams-grid');
    const title = document.querySelector('#' + screenId + '-screen .screen-title');
    grid.innerHTML = '';

    if (screenId === 'rival-select') {
        title.textContent = 'ELIGE EQUIPO RIVAL';
    } else {
        title.textContent = 'ELIGE TU EQUIPO';
    }

    teamsData.forEach((team, idx) => {
        if (screenId === 'rival-select' && team === selectedTeam) return;

        const card = document.createElement('div');
        card.className = 'team-card';
        card.tabIndex = 0;

        let badgeHTML;
        if (team.escudo) {
            badgeHTML = `<img src="${team.escudo}" alt="${team.nombre}">`;
        } else {
            const initial = team.nombre.charAt(0).toUpperCase();
            badgeHTML = `<div class="placeholder-badge" style="width:72px;height:72px;border-radius:50%;background:#e0e0e0;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:var(--neutral-dark);border:2px solid var(--neutral-dark)">${initial}</div>`;
        }

        const camisetaColor = mapColor(team.equipacion?.camiseta);
        const pantalonColor = mapColor(team.equipacion?.pantalon);

        card.innerHTML = `
            ${badgeHTML}
            <span class="team-name">${team.nombre}</span>
            <div class="team-colors">
                <span class="color-dot" style="background:${camisetaColor}"></span>
                <span class="color-dot" style="background:${pantalonColor}"></span>
            </div>
        `;

        // Usar click pero asegurar que sea rápido y funcione en móviles
        card.addEventListener('click', (e) => {
            if (screenId === 'rival-select') {
                rivalTeam = team;
                showPreMatchScreen();
            } else if (gameMode === 'league') {
                try {
                    selectedTeam = team;
                    const leagueCombo = document.getElementById('league-select-combo');
                    const leagueId = leagueCombo ? leagueCombo.value : 'infantil_asturias';
                    
                    if (typeof createLeague !== 'function') {
                        throw new Error("createLeague no está definido. ¿Se ha incluido league-engine.js?");
                    }
                    
                    createLeague(leagueId, team.nombre, teamsData);
                    
                    // Al crear liga, ir directamente a la alineación del primer partido si existe
                    const currentMdMatches = leagueState.schedule.find(m => m.matchday === 1);
                    const userMatch = currentMdMatches ? currentMdMatches.matches.find(m => m.home.trim() === team.nombre.trim() || m.away.trim() === team.nombre.trim()) : null;
                    
                    if (userMatch) {
                        gameMode = 'league_match';
                        const rivalName = (userMatch.home.trim() === team.nombre.trim() ? userMatch.away : userMatch.home);
                        rivalTeam = teamsData.find(t => t.nombre.trim() === rivalName.trim());
                        openLineup();
                    } else {
                        renderLeagueHub();
                        showScreen('league-hub');
                    }
                } catch (error) {
                    console.error("Error al crear la liga:", error);
                    alert("Hubo un error al iniciar la liga. Por favor, inténtalo de nuevo.");
                }
            } else {
                selectedTeam = team;
                openLineup();
            }
        });
        grid.appendChild(card);
    });
}

function openLineup() {
    showScreen('lineup');
    lineup = {};
    activeSlot = null;
    const tacticSelect = document.getElementById('tactic-select');
    if (tacticSelect) {
        tacticSelect.value = selectedTactic;
    }
    renderLineup();
}

function renderLineup() {
    if (!selectedTeam) {
        goToMenu();
        return;
    }
    const topInfoPanel = document.getElementById('lineup-top-info');
    const fieldEl = document.getElementById('lineup-field');
    const playersPanel = document.getElementById('players-list');
    const startBtn = document.getElementById('btn-start');
    const backBtnLineup = document.querySelector('#lineup-screen .back-btn');

    if (backBtnLineup) {
        if (gameMode === 'league_match' || gameMode === 'league') {
            backBtnLineup.style.display = 'none';
        } else {
            backBtnLineup.style.display = 'inline-block';
        }
    }

    const durContainer = document.getElementById('duration-container-wrapper');
    if (durContainer) {
        if (matchInProgress) {
            durContainer.style.opacity = '0.5';
            durContainer.style.pointerEvents = 'none';
        } else {
            durContainer.style.opacity = '1';
            durContainer.style.pointerEvents = 'auto';
        }
    }

    const currentFormation = FORMATIONS[selectedTactic] || FORMATIONS['2-2-2'];
    const shirtColor = gameConfig.userShirtColor || (selectedTeam ? mapColor(selectedTeam.equipacion?.camiseta) : '#4dabf7');
    const pantsColor = gameConfig.userPantsColor || (selectedTeam ? mapColor(selectedTeam.equipacion?.pantalon) : '#0b2b5e');

    // Info del equipo en panel superior
    if (topInfoPanel) {
        let displayName = selectedTeam.nombre;
        if (displayName.length > 40) {
            displayName = displayName.substring(0, 37) + '...';
        }
        
        topInfoPanel.innerHTML = `
            <div class="lineup-team-pill">
                <img src="${selectedTeam.escudo || ''}" style="display:${selectedTeam.escudo?'block':'none'}">
                <div class="lineup-team-name">${displayName}</div>
                <div class="lineup-team-cat">${selectedTeam.categoria || ''}</div>
            </div>
        `;
    }

    // Posiciones en el campo
    fieldEl.innerHTML = `
        <div class="field-center-dot"></div>
        <div class="field-area-top"></div>
        <div class="field-area-bottom"></div>
        <div class="field-goal-top"></div>
        <div class="field-goal-bottom"></div>
        <div style="position:absolute;bottom:10px;left:10px;z-index:10">
            <span style="font-size:11px;color:rgba(255,255,255,.5);margin-right:4px">Táctica:</span>
            <select id="tactic-select" style="background:#1a2236;color:#ffd43b;border:1px solid rgba(255,215,59,.3);padding:4px 8px;border-radius:6px;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;cursor:pointer">
                <option value="2-2-2">2-2-2</option>
                <option value="3-2-1">3-2-1</option>
                <option value="2-3-1">2-3-1</option>
            </select>
        </div>
        <div id="field-status" style="position:absolute;bottom:10px;right:10px;z-index:10;font-size:12px;color:rgba(255,255,255,.6);background:rgba(0,0,0,.4);padding:4px 10px;border-radius:6px"></div>
    `;

    const fieldStatus = document.getElementById('field-status');

    const ts = document.getElementById('tactic-select');
    if (ts) {
        ts.value = selectedTactic;
        ts.onchange = () => {
            const oldLineup = { ...lineup };
            const oldTactic = selectedTactic;
            selectedTactic = ts.value;
            const oldFormation = FORMATIONS[oldTactic] || FORMATIONS['2-2-2'];
            const newFormation = FORMATIONS[selectedTactic] || FORMATIONS['2-2-2'];

            const oldHasGK = oldFormation.some(s => s.role === 'goalkeeper');
            const newHasGK = newFormation.some(s => s.role === 'goalkeeper');
            const gkWasFilled = oldHasGK && oldLineup['GK'];

            lineup = {};
            activeSlot = null;

            if (gkWasFilled && newHasGK) {
                lineup['GK'] = oldLineup['GK'];
            }

            const oldNonGkByLabel = {};
            oldFormation.filter(s => s.role !== 'goalkeeper').forEach(s => {
                if (!oldNonGkByLabel[s.label]) oldNonGkByLabel[s.label] = [];
                oldNonGkByLabel[s.label].push(s);
            });

            const usedOldSlots = new Set();
            newFormation.filter(s => s.role !== 'goalkeeper').forEach(newSlot => {
                const oldSlots = oldNonGkByLabel[newSlot.label] || [];
                for (const oldSlot of oldSlots) {
                    if (oldLineup[oldSlot.id] && !lineup[newSlot.id] && !usedOldSlots.has(oldSlot.id)) {
                        lineup[newSlot.id] = oldLineup[oldSlot.id];
                        usedOldSlots.add(oldSlot.id);
                        break;
                    }
                }
            });

            renderLineup();
            if (matchInProgress && typeof refreshPlayersForTactic === 'function') {
                const shirtColor = gameConfig.userShirtColor || (selectedTeam ? mapColor(selectedTeam.equipacion?.camiseta) : '#4dabf7');
                const pantsColor = gameConfig.userPantsColor || (selectedTeam ? mapColor(selectedTeam.equipacion?.pantalon) : '#0b2b5e');
                refreshPlayersForTactic(lineup, selectedTactic, shirtColor, pantsColor);
            }
        };
    }

    const btnSettings = document.getElementById('btn-settings-lineup');
    if (btnSettings) {
        btnSettings.style.display = matchInProgress ? 'none' : 'block';
    }

    const lineupNames = Object.values(lineup);
    const firstNameCounts = {};
    lineupNames.forEach(fullName => {
        const firstName = getFirstName(fullName);
        firstNameCounts[firstName] = (firstNameCounts[firstName] || 0) + 1;
    });

    currentFormation.forEach(slot => {
        const el = document.createElement('div');
        el.className = 'position-slot' + (lineup[slot.id] ? ' filled' : '') + (activeSlot === slot.id ? ' active' : '');
        el.style.left = slot.x + '%';
        el.style.top = slot.y + '%';

        if (lineup[slot.id]) {
            const fullName = lineup[slot.id];
            const firstName = getFirstName(fullName);
            let displayName = firstName;
            
            if (firstNameCounts[firstName] > 1 && fullName.includes(',')) {
                const lastName = fullName.split(',')[0].trim();
                displayName = firstName + " " + lastName.charAt(0) + ".";
            }
            
            const playerShirtColor = slot.role === 'goalie' || slot.role === 'goalkeeper' ? '#aaaaaa' : shirtColor;
            const playerPantsColor = slot.role === 'goalie' || slot.role === 'goalkeeper' ? '#555555' : pantsColor;
            el.innerHTML = `<div class="pos-circle" style="background:${playerShirtColor};border:3px solid ${playerPantsColor};"><span class="pos-label">${slot.label}</span></div><div class="pos-player">${displayName}</div>`;
        } else {
            el.innerHTML = `<div class="pos-circle"><span class="pos-label">${slot.label}</span></div>`;
        }

        el.addEventListener('click', () => {
            if (lineup[slot.id]) {
                delete lineup[slot.id];
                activeSlot = null;
            } else {
                activeSlot = (activeSlot === slot.id) ? null : slot.id;
            }
            renderLineup();
        });
        fieldEl.appendChild(el);
    });

    // Lista de jugadores
    const usedPlayers = new Set(Object.values(lineup));
    playersPanel.innerHTML = '<h3>Jugadores</h3>';

    selectedTeam.jugadores.forEach(name => {
        const el = document.createElement('div');
        const used = usedPlayers.has(name);
        el.className = 'player-item' + (used ? ' used' : '') + (activeSlot && !used ? ' highlight' : '');
        el.textContent = name;
        el.title = name;

        if (!used) {
            el.addEventListener('click', () => {
                if (activeSlot) {
                    lineup[activeSlot] = name;
                    const nextEmpty = currentFormation.find(s => !lineup[s.id] && s.id !== activeSlot);
                    activeSlot = nextEmpty ? nextEmpty.id : null;
                    renderLineup();
                }
            });
        }
        playersPanel.appendChild(el);
    });

    // Estado
    const filled = Object.keys(lineup).length;
    const total = currentFormation.length;
    if (fieldStatus) fieldStatus.textContent = `${filled}/${total}`;

    if (filled === total) {
        startBtn.classList.add('ready');
        let btnText = 'COMENZAR ▶';
        if (matchInProgress) {
            btnText = 'REANUDAR PARTIDO ▶';
        } else if (gameMode === 'match') {
            btnText = 'ELEGIR RIVAL ▶';
        }
        startBtn.textContent = btnText;
    } else {
        startBtn.classList.remove('ready');
        const gkSlot = currentFormation.find(s => s.role === 'goalie');
        const gkFilled = gkSlot && lineup['GK'];
        if (gkSlot && !gkFilled) {
            startBtn.textContent = 'Selecciona POR';
        } else {
            startBtn.textContent = `${total - filled} posiciones por cubrir`;
        }
    }

    renderColorGrid('shirt', renderLineupCircleColors);
    renderColorGrid('pants', renderLineupCircleColors);
}

function renderLineupCircleColors() {
    const fieldEl = document.getElementById('lineup-field');
    if (!fieldEl) return;
    const currentFormation = FORMATIONS[selectedTactic] || FORMATIONS['2-2-2'];
    const shirtColor = gameConfig.userShirtColor || (selectedTeam ? mapColor(selectedTeam.equipacion?.camiseta) : '#4dabf7');
    const pantsColor = gameConfig.userPantsColor || (selectedTeam ? mapColor(selectedTeam.equipacion?.pantalon) : '#0b2b5e');

    fieldEl.querySelectorAll('.position-slot').forEach((el, i) => {
        const slot = currentFormation[i];
        if (slot && lineup[slot.id]) {
            const playerShirtColor = slot.role === 'goalie' || slot.role === 'goalkeeper' ? '#ccff00' : shirtColor;
            const playerPantsColor = slot.role === 'goalie' || slot.role === 'goalkeeper' ? '#111111' : pantsColor;
            const circleEl = el.querySelector('div');
            if (circleEl) {
                circleEl.style.backgroundColor = playerShirtColor;
                circleEl.style.borderColor = playerPantsColor;
            }
        }
    });
}

function onStartBtnClick() {
    if (!selectedTeam) return;
    const currentFormation = FORMATIONS[selectedTactic] || FORMATIONS['2-2-2'];
    const filled = Object.keys(lineup).length;
    const total = currentFormation.length;

    if (filled < total) {
        alert("¡Alineación incompleta! Faltan " + (total - filled) + " jugadores por asignar.");
        return;
    }

    if (matchInProgress) {
        resumeMatch();
    } else if (gameMode === 'league_match') {
        if (!rivalTeam) {
            alert("Error: No hay rival definido para este partido de liga.");
            return;
        }
        showPreMatchScreen();
    } else {
        // Modo match (amistoso) o cualquier otro: seleccionar rival primero
        gameMode = 'match'; // Asegurar modo amistoso si venimos de otro estado
        renderTeamSelect('rival-select');
        showScreen('rival-select');
    }
}

function randomFillLineup() {
    const currentFormation = FORMATIONS[selectedTactic] || FORMATIONS['2-2-2'];
    const shuffled = [...selectedTeam.jugadores].sort(() => Math.random() - 0.5);
    lineup = {};
    currentFormation.forEach((slot, i) => {
        lineup[slot.id] = shuffled[i % shuffled.length];
    });
    activeSlot = null;
    renderLineup();
}

function autoFillRivalLineup() {
    const rivalLineup = {};
    const shuffled = [...rivalTeam.jugadores].sort(() => Math.random() - 0.5);
    const formation = FORMATIONS[selectedTactic] || FORMATIONS['2-2-2'];
    formation.forEach((slot, i) => {
        rivalLineup[slot.id] = shuffled[i] || shuffled[i % shuffled.length];
    });
    return rivalLineup;
}

function quickSimMatch() {
    if (!selectedTeam) return;
    if (!rivalTeam && gameMode !== 'league_match') {
        alert("Elegir un rival primero.");
        return;
    }
    
    // Si es liga, asegurar que tenemos rival
    if (gameMode === 'league_match' && !rivalTeam) {
        const currentMdMatches = leagueState.schedule.find(m => m.matchday === leagueState.currentMatchday);
        const userMatch = currentMdMatches ? currentMdMatches.matches.find(m => m.home.trim() === selectedTeam.nombre.trim() || m.away.trim() === selectedTeam.nombre.trim()) : null;
        if (userMatch) {
            const rivalName = (userMatch.home.trim() === selectedTeam.nombre.trim() ? userMatch.away : userMatch.home);
            rivalTeam = teamsData.find(t => t.nombre.trim() === rivalName.trim());
        }
    }

    if (!rivalTeam) {
        alert("No se pudo determinar el rival.");
        return;
    }

    const sim = simulateMatch(selectedTeam.nombre, rivalTeam.nombre);
    
    // Configurar variables globales del motor de juego para mostrar en el resumen
    score = [sim.homeScore, sim.awayScore];
    localScorers = sim.scorers.filter(s => s.team === 'home').map(s => s.name);
    rivalScorers = sim.scorers.filter(s => s.team === 'away').map(s => s.name);
    
    // Cambiar orden si el usuario es visitante en liga
    if (gameMode === 'league_match') {
        const currentMdMatches = leagueState.schedule.find(m => m.matchday === leagueState.currentMatchday);
        const userMatch = currentMdMatches ? currentMdMatches.matches.find(m => m.home.trim() === selectedTeam.nombre.trim() || m.away.trim() === selectedTeam.nombre.trim()) : null;
        if (userMatch && userMatch.away.trim() === selectedTeam.nombre.trim()) {
            // Usuario es Away
            score = [sim.awayScore, sim.homeScore];
            localScorers = sim.scorers.filter(s => s.team === 'away').map(s => s.name);
            rivalScorers = sim.scorers.filter(s => s.team === 'home').map(s => s.name);
        }
    }

    // Usar la función endMatch del motor para procesar resultados de liga y mostrar pantalla
    if (typeof endMatch === 'function') {
        // Necesitamos asegurar que localTeamData y rivalTeamData estén puestos
        localTeamData = selectedTeam;
        rivalTeamData = rivalTeam;
        currentGameMode = gameMode;
        
        // Simular posesión aleatoria para el resumen
        possessionStats = { home: 45 + Math.random()*10, away: 45 + Math.random()*10 };
        
        endMatch();
    } else {
        alert("Error: No se pudo finalizar el partido simulado.");
    }
}

function startMatch(simulate=false) {
    matchInProgress = true;
    showScreen('none');
    
    // Forzar visibilidad del canvas y UI para evitar pantalla negra
    const canvas = document.getElementById('gameCanvas');
    const gameUi = document.getElementById('game-ui');
    if (canvas) canvas.style.display = 'block';
    if (gameUi) {
        gameUi.style.display = 'block';
        gameUi.classList.add('active');
    }
    
    const btnTactic = document.getElementById('btn-tactic-game');
    if (btnTactic) btnTactic.style.display = 'flex';

    const rivalLineupData = (gameMode === 'match' || gameMode === 'league_match') ? autoFillRivalLineup() : null;
    initGame(selectedTeam, lineup, rivalTeam, rivalLineupData, gameMode, gameConfig.difficulty, selectedTactic, simulate);
}

function resumeMatch() {
    if (typeof refreshPlayersForTactic === 'function') {
        const shirtColor = gameConfig.userShirtColor || (selectedTeam ? mapColor(selectedTeam.equipacion?.camiseta) : '#4dabf7');
        const pantsColor = gameConfig.userPantsColor || (selectedTeam ? mapColor(selectedTeam.equipacion?.pantalon) : '#0b2b5e');
        refreshPlayersForTactic(lineup, selectedTactic, shirtColor, pantsColor);
    }
    if (gameState === 'paused') {
        gameState = 'playing';
    }
    showScreen('none');
    document.getElementById('game-ui').classList.add('active');
    document.getElementById('btn-tactic-game').style.display = 'flex';
}

function showPreMatchScreen() {
    const teamAShield = selectedTeam.escudo || '';
    const teamBShield = rivalTeam.escudo || '';
    const teamAName = selectedTeam.nombre;
    const teamBName = rivalTeam.nombre;

    const shieldA = teamAShield
        ? `<img src="${teamAShield}" alt="${teamAName}" style="width:60px;height:60px;object-fit:contain">`
        : `<div style="width:60px;height:60px;background:#333;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff">${teamAName.charAt(0)}</div>`;
    const shieldB = teamBShield
        ? `<img src="${teamBShield}" alt="${teamBName}" style="width:60px;height:60px;object-fit:contain">`
        : `<div style="width:60px;height:60px;background:#333;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff">${teamBName.charAt(0)}</div>`;

    const overlay = document.createElement('div');
    overlay.id = 'pre-match-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#e53935;z-index:2000;display:flex;overflow-y:auto;color:#fff;font-family:Outfit,sans-serif;box-sizing:border-box;';
    
    const shirtColorA = gameConfig.userShirtColor || mapColor(selectedTeam.equipacion?.camiseta);
    const pantsColorA = gameConfig.userPantsColor || mapColor(selectedTeam.equipacion?.pantalon);
    const shirtColorB = mapColor(rivalTeam.equipacion?.camiseta);
    const pantsColorB = mapColor(rivalTeam.equipacion?.pantalon);

    overlay.innerHTML = `
        <div style="margin:auto; display:flex; flex-direction:column; align-items:center; gap:5px; padding:10px; width:100%; max-width:800px;">
        <div class="pre-match-header-pill" style="position:static; transform:none; margin-bottom:5px; pointer-events:none;">
            <div class="team-unit">
                <img src="${teamAShield}" style="display:${teamAShield?'block':'none'}">
                <span>${teamAName}</span>
            </div>
            <div class="vs-divider">VS</div>
            <div class="team-unit">
                <span>${teamBName}</span>
                <img src="${teamBShield}" style="display:${teamBShield?'block':'none'}">
            </div>
        </div>

        <div style="display:flex; align-items:center; gap:20px">
            <div style="text-align:center; display:flex; flex-direction:column; align-items:center">
                <canvas id="matchup-baby-local" width="300" height="400" style="background:#4CAF50; border-radius:20px; border:4px solid #000; box-shadow: 0 4px 0 #000; width: 140px; height: 180px; image-rendering: auto;"></canvas>
            </div>

            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:180px; margin-top: 0px;">
                <div style="font-size:50px; font-family:'Luckiest Guy', cursive; color:var(--secondary-yellow); -webkit-text-stroke: 2px var(--primary-blue); text-shadow: 4px 4px 0 var(--primary-blue)">VS</div>
            </div>

            <div style="text-align:center; display:flex; flex-direction:column; align-items:center">
                <canvas id="matchup-baby-rival" width="300" height="400" style="background:#4CAF50; border-radius:20px; border:4px solid #000; box-shadow: 0 4px 0 #000; width: 140px; height: 180px; image-rendering: auto;"></canvas>
            </div>
        </div>

        <div style="display:flex; gap:20px; margin-top:15px">
            <button id="btn-play-match" class="premium-btn btn-gold" style="height:80px; padding:0 40px; font-size:24px; border:4px solid #fff; box-shadow:0 8px 0 #c79204;"><span class="btn-text">COMENZAR ▶</span></button>
            <button id="btn-simulate-match-pre" class="premium-btn" style="height:80px; padding:0 40px; font-size:24px; background:#ab47bc; border:4px solid #fff; box-shadow:0 8px 0 #7b1fa2;"><span class="btn-text">RESULTADO 🤖</span></button>
        </div>
        <button id="btn-back-to-rival" style="background:transparent; border:none; color:rgba(255,255,255,0.8); padding:15px 30px; font-size:16px; cursor:pointer; text-decoration:underline; text-transform:uppercase; font-weight:900; font-family: Outfit, sans-serif;">← VOLVER A ALINEACIÓN</button>
        </div>
    `;

    document.body.appendChild(overlay);

    let animReq;
    const drawPreviews = () => {
        const ctxA = document.getElementById('matchup-baby-local')?.getContext('2d');
        const ctxB = document.getElementById('matchup-baby-rival')?.getContext('2d');
        if (!ctxA || !ctxB) return;

        const time = Date.now() / 1000;
        
        const skinA = '#ffccaa'; 
        const skinB = '#f1c27d';

        drawBabyFront(ctxA, shirtColorA, pantsColorA, skinA, time, '#63472b'); // Forzar marrón
        drawBabyFront(ctxB, shirtColorB, pantsColorB, skinB, time + 0.5);
        
        animReq = requestAnimationFrame(drawPreviews);
    };

    requestAnimationFrame(drawPreviews);

    document.getElementById('btn-play-match').addEventListener('click', () => {
        cancelAnimationFrame(animReq);
        overlay.remove();
        startMatch(false);
    });

    document.getElementById('btn-simulate-match-pre').addEventListener('click', () => {
        cancelAnimationFrame(animReq);
        overlay.remove();
        quickSimMatch();
    });

    document.getElementById('btn-back-to-rival').addEventListener('click', () => {
        cancelAnimationFrame(animReq);
        overlay.remove();
    });
}

let isAudioOn = true;
function toggleAudio() {
    isAudioOn = !isAudioOn;
    const btns = [document.getElementById('btn-music-toggle'), document.getElementById('btn-music-toggle-lineup')];
    btns.forEach(b => {
        if (b) b.textContent = isAudioOn ? '🔊' : '🔇';
    });
    
    if (typeof setGameMute === 'function') {
        setGameMute(!isAudioOn);
    }
    
    if (typeof Howler !== 'undefined') {
        Howler.mute(!isAudioOn);
    }
}

// Inicialización de botones nuevos
document.addEventListener('DOMContentLoaded', () => {
    const btnLoad = document.getElementById('btn-load-game');
    if (btnLoad) btnLoad.addEventListener('click', showLoadGameScreen);

    const btnQuick = document.getElementById('btn-quick-result');
    if (btnQuick) btnQuick.addEventListener('click', quickSimMatch);
    
    const backBtns = document.querySelectorAll('#load-game-screen .back-btn');
    backBtns.forEach(b => b.addEventListener('click', goToMenu));

    const btnMusic = document.getElementById('btn-music-toggle');
    if (btnMusic) btnMusic.addEventListener('click', toggleAudio);

    const btnMusicL = document.getElementById('btn-music-toggle-lineup');
    if (btnMusicL) btnMusicL.addEventListener('click', toggleAudio);
});

// ===== LIGA UI =====
function updateMenuLeagueButtons() {
    // Esta función ya no necesita mostrar nada en el menú principal
    // ya que hemos movido la lógica a la pantalla de CARGAR PARTIDA.
    // Solo la mantenemos por si otras partes del código la llaman.
    const btnContinueRow = document.getElementById('league-continue-container');
    if (btnContinueRow) btnContinueRow.style.display = 'none';
}

function renderLeagueHub() {
    if (!leagueState) return;
    document.getElementById('league-hub-subtitle').textContent = `JORNADA Nº ${leagueState.currentMatchday}`;
    document.getElementById('league-schedule-title').textContent = `JORNADA Nº ${leagueState.currentMatchday}`;
    
    // Clasificación
    const tbody = document.getElementById('league-standings-body');
    tbody.innerHTML = '';
    leagueState.standings.forEach((s, idx) => {
        const tr = document.createElement('tr');
        if (s.teamId === leagueState.userTeamId) {
            tr.style.backgroundColor = 'rgba(255,215,59,0.2)';
            tr.style.fontWeight = 'bold';
        }
        const tData = teamsData.find(t => t.nombre === s.teamId);
        const badgeSrc = tData && tData.escudo ? `<img src="${tData.escudo}" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;margin-right:8px">` : '';
        tr.innerHTML = `
            <td style="padding:8px 4px; font-weight:900; color:#757575">${idx + 1}</td>
            <td style="padding:8px 4px; display:flex; align-items:center; font-weight:900; color:#000; text-transform:uppercase">${badgeSrc}${s.teamId.toUpperCase()}</td>
            <td style="padding:8px 4px; text-align:center; font-weight:900; color:#f57c00">${s.pts}</td>
            <td style="padding:8px 4px; text-align:center; font-weight:900; color:#000">${s.pld}</td>
            <td style="padding:8px 4px; text-align:center; font-weight:900; color:#000">${s.w}</td>
            <td style="padding:8px 4px; text-align:center; font-weight:900; color:#000">${s.d}</td>
            <td style="padding:8px 4px; text-align:center; font-weight:900; color:#000">${s.l}</td>
            <td style="padding:8px 4px; text-align:center; font-weight:900; color:#000">${s.gf}</td>
            <td style="padding:8px 4px; text-align:center; font-weight:900; color:#000">${s.ga}</td>
        `;
        tbody.appendChild(tr);
    });

    renderLeagueSchedule(leagueState.currentMatchday);

    // Top Scorers (Pichichi)
    const scorersMap = {};
    leagueState.schedule.forEach(day => {
        day.matches.forEach(m => {
            if (m.played && m.scorers) {
                m.scorers.forEach(s => {
                    const teamName = s.team === 'home' ? m.home : m.away;
                    const key = `${s.name}|${teamName}`;
                    if (!scorersMap[key]) {
                        scorersMap[key] = { name: s.name, team: teamName, goals: 0 };
                    }
                    scorersMap[key].goals++;
                });
            }
        });
    });
    
    const topScorers = Object.values(scorersMap).sort((a,b) => b.goals - a.goals || a.name.localeCompare(b.name));
    const tbodyScorers = document.getElementById('league-scorers-body');
    if (tbodyScorers) {
        tbodyScorers.innerHTML = '';
        topScorers.slice(0, 10).forEach((s, idx) => {
            const tData = teamsData.find(t => t.nombre === s.team);
            const badgeSrc = tData && tData.escudo ? `<img src="${tData.escudo}" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:6px">` : '';
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.innerHTML = `
                <td style="padding:8px 4px; color:#757575; font-weight:900">${idx + 1}</td>
                <td style="padding:8px 4px; font-weight:900; color:#000; text-transform:uppercase">${s.name}</td>
                <td style="padding:8px 4px; font-size:11px; color:#424242; font-weight:900; display:flex; align-items:center; text-transform:uppercase">${badgeSrc}${s.team.split('"')[0].trim()}</td>
                <td style="padding:8px 4px; text-align:center; color:#f57c00; font-weight:900">${s.goals}</td>
            `;
            tbodyScorers.appendChild(tr);
        });
    }

    // Equipo menos goleado
    const concededMap = {};
    leagueState.standings.forEach(s => {
        if(s.pld > 0) {
            concededMap[s.teamId] = { team: s.teamId, gc: s.ga };
        }
    });
    
    const concededRanking = Object.values(concededMap).sort((a,b) => a.gc - b.gc || a.team.localeCompare(b.team));
    const tbodyZamora = document.getElementById('league-zamora-body');
    if (tbodyZamora) {
        const headerZamora = document.querySelector('.league-panel h3#league-zamora-title') || document.querySelector('.league-panel h3[id="league-zamora-title"]');
        // Let's assume there is a way to find the header. I'll just update the content.
        tbodyZamora.innerHTML = '';
        concededRanking.slice(0, 10).forEach((z, idx) => {
            const tData = teamsData.find(t => t.nombre === z.team);
            const badgeSrc = tData && tData.escudo ? `<img src="${tData.escudo}" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:6px">` : '';
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.innerHTML = `
                <td style="padding:8px 4px; color:#757575; font-weight:900">${idx + 1}</td>
                <td style="padding:8px 4px; font-size:11px; color:#424242; font-weight:900; display:flex; align-items:center; justify-content:center;">${badgeSrc}</td>
                <td style="padding:8px 4px; font-weight:900; color:#000; text-transform:uppercase">${z.team}</td>
                <td style="padding:8px 4px; text-align:center; color:#e53935; font-weight:900">${z.gc}</td>
            `;
            tbodyZamora.appendChild(tr);
        });
    }
}

function renderLeagueSchedule(day) {
    if (!leagueState) return;
    const scheduleDiv = document.getElementById('league-schedule-list');
    scheduleDiv.innerHTML = '';
    document.getElementById('league-schedule-title').textContent = `Jornada ${day}`;

    const matchday = leagueState.schedule.find(m => m.matchday === day);
    if (!matchday) return;

    matchday.matches.forEach(m => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.background = '#f5f5f5';
        div.style.padding = '8px 12px';
        div.style.borderRadius = '12px';
        div.style.border = '2px solid #000';
        div.style.boxShadow = '0 3px 0 #000';
        div.style.marginBottom = '4px';
        div.style.color = '#000';
        div.style.fontWeight = '900';
        
        const isUserMatch = (m.home === leagueState.userTeamId || m.away === leagueState.userTeamId);
        if (isUserMatch) {
            div.style.background = '#fff9c4';
            div.style.borderColor = '#fbc02d';
        }

        let scoreText = m.played ? `${m.homeScore} - ${m.awayScore}` : 'vs';
        
        const tHome = teamsData.find(t => t.nombre === m.home);
        const tAway = teamsData.find(t => t.nombre === m.away);
        
        const homeBadgeSrc = tHome && tHome.escudo ? `<img src="${tHome.escudo}" style="width:24px;height:24px;object-fit:contain;vertical-align:middle;margin-left:8px">` : '';
        const awayBadgeSrc = tAway && tAway.escudo ? `<img src="${tAway.escudo}" style="width:24px;height:24px;object-fit:contain;vertical-align:middle;margin-right:8px">` : '';
        
        let homeScorersHtml = '';
        let awayScorersHtml = '';
        if (m.played && m.scorers && m.scorers.length > 0) {
            const homeScorers = m.scorers.filter(s => s.team === 'home');
            const awayScorers = m.scorers.filter(s => s.team === 'away');
            
            const formatScorers = (list) => {
                const counts = {};
                list.forEach(s => counts[s.name] = (counts[s.name] || 0) + 1);
                return Object.entries(counts).map(([name, count]) => count > 1 ? `${name} (x${count})` : name).join(', ');
            };

            if (homeScorers.length > 0) {
                homeScorersHtml = `<div style="font-size:10px; color:#757575; text-align:right; margin-top:4px">${formatScorers(homeScorers)} ⚽</div>`;
            }
            if (awayScorers.length > 0) {
                awayScorersHtml = `<div style="font-size:10px; color:#757575; text-align:left; margin-top:4px">⚽ ${formatScorers(awayScorers)}</div>`;
            }
        }

        div.innerHTML = `
            <div style="flex:1; display:flex; flex-direction:column;">
                <div style="display:flex; align-items:center; justify-content:flex-end; text-transform:uppercase;">${m.home}${homeBadgeSrc}</div>
                ${homeScorersHtml}
            </div>
            <div style="width:60px; text-align:center; font-weight:bold; color:${m.played ? '#f57c00' : '#bdbdbd'}">${scoreText}</div>
            <div style="flex:1; display:flex; flex-direction:column;">
                <div style="display:flex; align-items:center; justify-content:flex-start; text-transform:uppercase;">${awayBadgeSrc}${m.away}</div>
                ${awayScorersHtml}
            </div>
        `;
        scheduleDiv.appendChild(div);
    });

    const currentMdMatches = leagueState.schedule.find(m => m.matchday === day);
    // Usar trim para comparar nombres de equipos y evitar fallos por espacios en blanco
    const userMatch = currentMdMatches ? currentMdMatches.matches.find(m => m.home.trim() === leagueState.userTeamId.trim() || m.away.trim() === leagueState.userTeamId.trim()) : null;
    const btnPlayNext = document.getElementById('btn-league-play-next');
    
    // Si es la jornada actual y el usuario tiene partido
    if (day === leagueState.currentMatchday && userMatch && !userMatch.played) {
        btnPlayNext.style.display = 'block';
        btnPlayNext.textContent = 'Preparar Partido ▶';
        btnPlayNext.onclick = () => {
            gameMode = 'league_match';
            selectedTeam = teamsData.find(t => t.nombre.trim() === leagueState.userTeamId.trim());
            const rivalName = (userMatch.home.trim() === leagueState.userTeamId.trim() ? userMatch.away : userMatch.home);
            rivalTeam = teamsData.find(t => t.nombre.trim() === rivalName.trim());
            
            if (!selectedTeam || !rivalTeam) {
                console.error("Error cargando equipos liga:", {user: leagueState.userTeamId, rival: rivalName});
                alert("Error técnico: No se pudo cargar la información del equipo rival (" + rivalName + ").");
                return;
            }
            openLineup();
        };
    } else if (day === leagueState.currentMatchday && !userMatch) {
        // Jornada de descanso para el usuario
        const byeMsg = document.createElement('div');
        byeMsg.style.textAlign = 'center';
        byeMsg.style.padding = '10px';
        byeMsg.style.background = '#fff3e0';
        byeMsg.style.color = '#e65100';
        byeMsg.style.borderRadius = '8px';
        byeMsg.style.marginBottom = '10px';
        byeMsg.style.fontWeight = 'bold';
        byeMsg.textContent = '✨ JORNADA DE DESCANSO ✨';
        scheduleDiv.prepend(byeMsg);

        if (currentMdMatches && !currentMdMatches.matches.every(m => m.played)) {
            btnPlayNext.style.display = 'block';
            btnPlayNext.textContent = 'Simular Jornada de Descanso 🤖';
            btnPlayNext.onclick = () => {
                currentMdMatches.matches.forEach(m => {
                    if (!m.played) {
                        const sim = simulateMatch(m.home, m.away);
                        m.homeScore = sim.homeScore;
                        m.awayScore = sim.awayScore;
                        m.scorers = sim.scorers;
                        m.played = true;
                    }
                });
                updateStandings();
                renderLeagueHub();
            };
        } else {
            // Todos los partidos jugados, permitir avanzar
            btnPlayNext.style.display = 'block';
            btnPlayNext.textContent = 'Siguiente Jornada ▶';
            btnPlayNext.onclick = () => {
                leagueState.currentMatchday++;
                saveLeagueState();
                renderLeagueHub();
            };
        }
    } else if (currentMdMatches && !currentMdMatches.matches.every(m => m.played)) {
        btnPlayNext.style.display = 'block';
        btnPlayNext.textContent = 'Simular Resto de Jornada 🤖';
        btnPlayNext.onclick = () => {
            currentMdMatches.matches.forEach(m => {
                if (!m.played) {
                    const sim = simulateMatch(m.home, m.away);
                    m.homeScore = sim.homeScore;
                    m.awayScore = sim.awayScore;
                    m.scorers = sim.scorers;
                    m.played = true;
                }
            });
            updateStandings();
            renderLeagueHub();
        };
    } else {
        if (leagueState.currentMatchday < leagueState.schedule.length) {
            btnPlayNext.style.display = 'block';
            btnPlayNext.textContent = 'Avanzar Siguiente Jornada ▶';
            btnPlayNext.onclick = () => {
                leagueState.currentMatchday++;
                saveLeagueState();
                renderLeagueHub();
            };
        } else {
            btnPlayNext.style.display = 'block';
            btnPlayNext.textContent = 'Fin de Temporada';
            btnPlayNext.onclick = () => {
                showEndSeasonScreen();
            };
        }
    }
}

function showEndSeasonScreen() {
    const champion = leagueState.standings[0];
    const champData = teamsData.find(t => t.nombre === champion.teamId);
    
    document.getElementById('champion-name').textContent = champion.teamId;
    const badgeEl = document.getElementById('champion-badge');
    if (champData && champData.escudo) {
        badgeEl.src = champData.escudo;
        badgeEl.style.display = 'inline-block';
    } else {
        badgeEl.style.display = 'none';
    }
    
    // Animation for champion
    badgeEl.animate([
        { transform: 'scale(1) rotate(0deg)' },
        { transform: 'scale(1.2) rotate(10deg)' },
        { transform: 'scale(1) rotate(-10deg)' },
        { transform: 'scale(1) rotate(0deg)' }
    ], { duration: 1000, iterations: Infinity });
    
    showScreen('end-season');
    
    document.getElementById('btn-end-season-ok').onclick = () => {
        deleteLeagueState();
        updateMenuLeagueButtons();
        goToMenu();
    };
}

// Fullscreen y Orientación
async function requestFullscreenAndLandscape() {
    try {
        const docEl = document.documentElement;
        
        // 1. Activar Pantalla Completa
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
            if (requestFS) await requestFS.call(docEl);
        }

        // 2. Bloquear Orientación (Solo funciona tras interacción de usuario y usualmente en fullscreen)
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape').catch(err => {
                console.warn("No se pudo bloquear la orientación:", err);
            });
        } else if (screen.lockOrientation) {
            screen.lockOrientation('landscape');
        } else if (screen.webkitLockOrientation) {
            screen.webkitLockOrientation('landscape');
        } else if (screen.mozLockOrientation) {
            screen.mozLockOrientation('landscape');
        }
    } catch (err) {
        console.error("Error en requestFullscreenAndLandscape:", err);
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        requestFullscreenAndLandscape();
    } else {
        document.exitFullscreen().catch(() => {});
    }
}

// Event listeners para el menú
document.addEventListener('DOMContentLoaded', async () => {
    await loadTeams();
    document.getElementById('btn-new-game')?.addEventListener('click', () => {
        requestFullscreenAndLandscape();
        startTeamSelect('match');
    });
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
        startBtn.addEventListener('click', onStartBtnClick);
    }
    document.getElementById('btn-random')?.addEventListener('click', randomFillLineup);
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentScreen === 'team-select') {
                if (gameMode === 'league') showScreen('league-create');
                else goToMenu();
            }
            else if (currentScreen === 'lineup') {
                if (gameMode === 'league_match') {
                    renderLeagueHub();
                    showScreen('league-hub');
                } else {
                    startTeamSelect(gameMode);
                }
            }
            else if (currentScreen === 'rival-select') openLineup();
        });
    });
    // Usar 'pointerdown' para máxima respuesta en móviles y escritorio
    document.getElementById('btn-result-menu')?.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        matchInProgress = false;
        if (typeof stopGame === 'function') stopGame();
        
        // Auto-simular resto de jornada si es liga
        if (gameMode === 'league_match' && leagueState) {
            const currentMdMatches = leagueState.schedule.find(m => m.matchday === leagueState.currentMatchday);
            if (currentMdMatches) {
                currentMdMatches.matches.forEach(m => {
                    if (!m.played) {
                        const sim = simulateMatch(m.home, m.away);
                        m.homeScore = sim.homeScore;
                        m.awayScore = sim.awayScore;
                        m.scorers = sim.scorers;
                        m.played = true;
                    }
                });
                if (typeof updateStandings === 'function') updateStandings();
            }
            renderLeagueHub();
            showScreen('league-hub');
        } else {
            goToMenu();
        }
    });
    document.getElementById('btn-fullscreen-menu')?.addEventListener('click', toggleFullscreen);
    document.getElementById('btn-fullscreen-game')?.addEventListener('click', toggleFullscreen);

    // Configuración — desde lineup y desde partido
    document.getElementById('btn-settings-lineup')?.addEventListener('click', openSettings);
    document.getElementById('btn-settings-icon')?.addEventListener('click', openSettings);
    document.getElementById('btn-settings-back')?.addEventListener('click', saveSettings);

    // Botón cerrar modal en menú (ocultar interfaz para ver fondo)
    document.querySelector('.modal-close-btn')?.addEventListener('click', () => {
        const modal = document.querySelector('.glass-modal');
        if (modal) {
            modal.style.transition = 'all 0.5s ease';
            modal.style.opacity = '0';
            modal.style.pointerEvents = 'none';
            modal.style.transform = 'translateY(20px) scale(0.95)';
            
            // Crear un botón flotante para recuperar el menú
            if (!document.getElementById('btn-show-menu')) {
                const btn = document.createElement('button');
                btn.id = 'btn-show-menu';
                btn.innerHTML = 'MOSTRAR MENÚ';
                btn.className = 'premium-btn btn-blue';
                btn.style.cssText = 'position:fixed; bottom:100px; width:auto; padding:0 40px; left:50%; transform:translateX(-50%); z-index:100; animation: fadeIn 0.5s ease;';
                btn.onclick = () => {
                    modal.style.opacity = '1';
                    modal.style.pointerEvents = 'auto';
                    modal.style.transform = 'translateY(0) scale(1)';
                    btn.remove();
                };
                document.body.appendChild(btn);
            }
        }
    });

    document.querySelectorAll('.segmented-control').forEach(sc => {
        sc.querySelectorAll('.segment').forEach(seg => {
            seg.addEventListener('click', () => {
                if (matchInProgress && sc.id === 'setting-duration') return; // Bloquear duración en partido
                sc.querySelectorAll('.segment').forEach(s => s.classList.remove('active'));
                seg.classList.add('active');
                
                if (sc.id === 'setting-speed') {
                    gameConfig.gameSpeed = parseFloat(seg.dataset.value);
                } else if (sc.id === 'setting-duration') {
                    gameConfig.matchDuration = parseInt(seg.dataset.value);
                } else if (sc.id === 'setting-difficulty') {
                    gameConfig.difficulty = parseFloat(seg.dataset.value);
                    if (typeof currentAiDiff !== 'undefined') currentAiDiff = gameConfig.difficulty;
                }
            });
        });
    });

    document.getElementById('btn-tactic-game')?.addEventListener('click', () => {
        if (typeof pauseGame === 'function') pauseGame();
        showScreen('lineup');
        renderLineup();
    });

    // Eventos Liga
    document.getElementById('btn-league-new')?.addEventListener('click', () => {
        showScreen('league-create');
    });
    document.getElementById('btn-league-delete')?.addEventListener('click', () => {
        if (confirm("¿Estás seguro de borrar la liga actual? Se perderá todo el progreso.")) {
            deleteLeagueState();
            updateMenuLeagueButtons();
        }
    });
    document.getElementById('btn-league-continue')?.addEventListener('click', () => {
        requestFullscreenAndLandscape();
        renderLeagueHub();
        showScreen('league-hub');
    });
    document.getElementById('league-create-screen')?.querySelector('.back-btn')?.addEventListener('click', () => {
        showScreen('menu');
    });
    document.getElementById('btn-league-select-team')?.addEventListener('click', () => {
        startTeamSelect('league');
    });
    document.getElementById('btn-league-hub-back')?.addEventListener('click', () => {
        updateMenuLeagueButtons();
        showScreen('menu');
    });

    // El listener de btn-league-play-next se gestiona dinámicamente en renderLeagueSchedule


    let viewingMatchday = 1;
    document.getElementById('btn-league-prev-day').addEventListener('click', () => {
        if (!leagueState) return;
        viewingMatchday = document.getElementById('league-schedule-title').textContent.replace('Jornada ', '');
        viewingMatchday = parseInt(viewingMatchday) - 1;
        if (viewingMatchday < 1) viewingMatchday = 1;
        renderLeagueSchedule(viewingMatchday);
    });
    document.getElementById('btn-league-next-day').addEventListener('click', () => {
        if (!leagueState) return;
        viewingMatchday = document.getElementById('league-schedule-title').textContent.replace('Jornada ', '');
        viewingMatchday = parseInt(viewingMatchday) + 1;
        if (viewingMatchday > leagueState.schedule.length) viewingMatchday = leagueState.schedule.length;
        renderLeagueSchedule(viewingMatchday);
    });

    loadLeagueState();
    updateMenuLeagueButtons();
    initMenuBackground();
    showScreen('menu');
});

function initMenuBackground() {
    const canvas = document.getElementById('menu-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function drawComposition() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Crear una "foto de equipo" estática
        const babyCount = 8;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const proxyCtx = {
            canvas: { width: 150, height: 200 },
            clearRect: () => {},
            save: () => ctx.save(),
            restore: () => ctx.restore(),
            translate: (x, y) => ctx.translate(x, y),
            rotate: (a) => ctx.rotate(a),
            scale: (x, y) => ctx.scale(x, y),
            beginPath: () => ctx.beginPath(),
            moveTo: (x, y) => ctx.moveTo(x, y),
            lineTo: (x, y) => ctx.lineTo(x, y),
            quadraticCurveTo: (cp1x, cp1y, x, y) => ctx.quadraticCurveTo(cp1x, cp1y, x, y),
            bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y),
            arc: (x, y, r, s, e, a) => ctx.arc(x, y, r, s, e, a),
            ellipse: (x, y, rx, ry, rot, s, e) => ctx.ellipse(x, y, rx, ry, rot, s, e),
            fill: () => ctx.fill(),
            stroke: () => ctx.stroke(),
            closePath: () => ctx.closePath(),
            clip: () => ctx.clip(),
            drawImage: (img, dx, dy) => ctx.drawImage(img, dx, dy),
            measureText: (txt) => ctx.measureText(txt),
            fillText: (txt, x, y) => ctx.fillText(txt, x, y),
            set fillStyle(val) { ctx.fillStyle = val; },
            set strokeStyle(val) { ctx.strokeStyle = val; },
            set lineWidth(val) { ctx.lineWidth = val; },
            set font(val) { ctx.font = val; },
            set textAlign(val) { ctx.textAlign = val; },
            set textBaseline(val) { ctx.textBaseline = val; },
            set imageSmoothingEnabled(val) { ctx.imageSmoothingEnabled = val; },
            set imageSmoothingQuality(val) { ctx.imageSmoothingQuality = val; }
        };

        for (let i = 0; i < babyCount; i++) {
            // Posicionamiento artístico: algunos a los lados, otros más al fondo
            const side = i % 2 === 0 ? -1 : 1;
            const row = Math.floor(i / 2);
            const bx = centerX + (side * (200 + row * 100));
            const by = canvas.height - (100 + row * 80);
            const bScale = 0.8 - (row * 0.15);
            
            ctx.save();
            ctx.translate(bx, by);
            ctx.scale(bScale, bScale);
            ctx.translate(-75, -100);
            
            const shirt = `hsl(${i * 45}, 70%, 50%)`;
            const pants = `hsl(${(i * 45) + 20}, 60%, 40%)`;
            const skin = ['#ffdbac', '#f1c27d', '#e0ac69', '#8d5524'][i % 4];
            
            drawBabyFront(proxyCtx, shirt, pants, skin, i);
            ctx.restore();
        }
    }

    window.addEventListener('resize', drawComposition);
    drawComposition();
}

function drawBabyFront(ctx, shirtColor, pantsColor, headColor, time = 0, forcedHairColor = null) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // Suavizado para evitar pixelación
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Escala base (ahora considerando que el canvas interno es el doble)
    const baseScale = w / 150; // Debería ser 2 si el canvas es 300
    const scale = 0.95 * baseScale;
    const cx = w / 2;
    const cy = h / 2 + (20 * scale);

    // Semilla para "aleatoriedad" estable
    const seed = shirtColor.length + (shirtColor.charCodeAt(1) || 0);
    
    // Color de pelo alterno
    const hairColor = forcedHairColor || ((seed % 2 === 0) ? '#FFD700' : '#63472b');

    // Animación de saltitos más intensa
    const jumpOsc = Math.max(0, Math.sin(time * 8 + seed));
    const jumpYOffset = jumpOsc * 30 * scale;

    // Animación de balanceo suave pero más pronunciado
    const swing = Math.sin(time * 4) * 0.1;
    const eyeLookUp = (Math.sin(time * 3) * 4 - 4) * scale; 
    
    ctx.save();
    ctx.translate(cx, cy - jumpYOffset); 
    ctx.rotate(swing);
    ctx.translate(-cx, -cy + jumpYOffset);

    // CUERPO
    const bodyY = cy + (10 * scale);
    
    // Pies - Botas Negras
    const drawPlainBoot = (bx, by, flip = false) => {
        ctx.save();
        ctx.translate(bx, by);
        if(flip) ctx.scale(-1, 1);
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14 * scale, 9 * scale, Math.PI/6, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();
        ctx.restore();
    };
    drawPlainBoot(cx - (35 * scale), cy + (25 * scale));
    drawPlainBoot(cx + (35 * scale), cy + (25 * scale), true);

    // Pañal
    ctx.fillStyle = '#fff'; // Pañal blanco original
    ctx.beginPath();
    ctx.ellipse(cx, bodyY + (10 * scale), 22 * scale, 15 * scale, 0, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();

    // Tronco/Camiseta
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.moveTo(cx - (15 * scale), cy - (8 * scale));
    ctx.quadraticCurveTo(cx - (20 * scale), cy + (15 * scale), cx - (12 * scale), cy + (22 * scale));
    ctx.lineTo(cx + (12 * scale), cy + (22 * scale));
    ctx.quadraticCurveTo(cx + (20 * scale), cy + (15 * scale), cx + (15 * scale), cy - (8 * scale));
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Brazos
    const drawArm = (ax, ay, flip = false) => {
        ctx.save();
        ctx.translate(ax, ay);
        if(flip) ctx.scale(-1, 1);
        ctx.fillStyle = headColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-8 * scale, 15 * scale, -4 * scale, 25 * scale);
        ctx.lineTo(4 * scale, 25 * scale);
        ctx.quadraticCurveTo(8 * scale, 15 * scale, 0, 0);
        ctx.fill(); ctx.stroke();
        // Manitas
        for(let i=0; i<4; i++) {
            ctx.beginPath(); ctx.arc((-3 + i*2) * scale, 25 * scale, 2 * scale, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    };
    
    drawArm(cx - (12 * scale), cy + (4 * scale)); 
    drawArm(cx + (12 * scale), cy + (4 * scale), true);

    // CABEZA
    const hy = cy - (35 * scale);
    const hr = 40 * scale;
    ctx.fillStyle = headColor;
    ctx.beginPath(); ctx.ellipse(cx - hr + (4 * scale), hy, 9 * scale, 11 * scale, -0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + hr - (4 * scale), hy, 9 * scale, 11 * scale, 0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, hy, hr, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    // PELO
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(cx - (22 * scale), hy - hr + (4 * scale));
    ctx.bezierCurveTo(cx - (8 * scale), hy - hr - (22 * scale), cx + (38 * scale), hy - hr - (8 * scale), cx + (8 * scale), hy - hr + (11 * scale));
    ctx.quadraticCurveTo(cx - (4 * scale), hy - hr + (4 * scale), cx - (22 * scale), hy - hr + (4 * scale));
    ctx.fill(); ctx.stroke();

    // OJOS
    const drawBigEye = (ex, ey) => {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(ex, ey, 16 * scale, 18 * scale, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.save();
        ctx.beginPath(); ctx.ellipse(ex, ey, 16 * scale, 18 * scale, 0, 0, Math.PI*2); ctx.clip();
        ctx.fillStyle = '#63472b'; ctx.beginPath(); ctx.arc(ex, ey + eyeLookUp, 11 * scale, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey + eyeLookUp, 7 * scale, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + (3 * scale), ey + eyeLookUp - (3 * scale), 4 * scale, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    };

    drawBigEye(cx - (18 * scale), hy - (4 * scale));
    drawBigEye(cx + (18 * scale), hy - (4 * scale));

    // CHUPETE
    const pacY = hy + (25 * scale);
    const pacSwing = Math.sin(time * 6) * 5;
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.arc(cx, pacY, 9 * scale, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.translate(cx, pacY);
    ctx.rotate(pacSwing * Math.PI / 180);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * scale;
    ctx.beginPath(); ctx.arc(0, 7 * scale, 6 * scale, 0, Math.PI * 2); ctx.stroke(); 
    ctx.restore();

    ctx.restore();
}

// Iniciar estado PWA y volver al menú
window.addEventListener('load', () => {

    console.log("⚽ Guajinos V2.4.5 - Sistema de lanzamiento optimizado");
    // El splash inicial se gestiona ahora directamente en index.html mediante launchFullscreenGame()
    // para asegurar que la interacción del usuario dispare correctamente las APIs de Fullscreen y Orientation.

    // Lógica del Modal de Abandono
    const btnEndMatch = document.getElementById('btn-end-match');
    const abandonModal = document.getElementById('abandon-modal');
    const btnAbandonYes = document.getElementById('btn-abandon-yes');
    const btnAbandonNo = document.getElementById('btn-abandon-no');

    if (btnEndMatch && abandonModal) {
        btnEndMatch.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerHaptic('heavy');
            abandonModal.style.display = 'flex';
        });
    }

    if (btnAbandonYes) {
        btnAbandonYes.addEventListener('click', () => {
            abandonModal.style.display = 'none';
            stopGame();
            goToMenu();
        });
    }

    if (btnAbandonNo) {
        btnAbandonNo.addEventListener('click', () => {
            abandonModal.style.display = 'none';
        });
    }

    // Inicializar estado final
    goToMenu();
});
