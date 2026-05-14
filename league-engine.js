// ===== MOTOR DE LIGA =====
let leagueState = null;
let currentSaveSlot = 0;

function getAllSavedLeagues() {
    const saved = localStorage.getItem('superLiquidSoccer_leagues_list');
    return saved ? JSON.parse(saved) : [];
}

function loadLeagueState(slotIndex = 0) {
    const leagues = getAllSavedLeagues();
    leagueState = leagues[slotIndex] || null;
    currentSaveSlot = slotIndex;
    return leagueState;
}

function saveLeagueState() {
    if (!leagueState) return;
    const leagues = getAllSavedLeagues();
    leagues[currentSaveSlot] = leagueState;
    localStorage.setItem('superLiquidSoccer_leagues_list', JSON.stringify(leagues));
    
    // Mantener compatibilidad con el sistema anterior por si acaso
    localStorage.setItem('superLiquidSoccer_league', JSON.stringify(leagueState));
}

function deleteLeagueState(slotIndex = 0) {
    const leagues = getAllSavedLeagues();
    leagues.splice(slotIndex, 1);
    localStorage.setItem('superLiquidSoccer_leagues_list', JSON.stringify(leagues));
    if (currentSaveSlot === slotIndex) leagueState = null;
    
    // Si borramos todo, borrar también la clave antigua
    if (leagues.length === 0) localStorage.removeItem('superLiquidSoccer_league');
}

function createLeague(leagueId, userTeamId, teams) {
    // Generate Round Robin Fixture
    const schedule = generateFixture(teams);
    
    // Initialize Standings
    const standings = teams.map(t => ({
        teamId: t.nombre,
        pts: 0, pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0
    }));

    leagueState = {
        leagueId: leagueId,
        userTeamId: userTeamId,
        currentMatchday: 1,
        standings: standings,
        schedule: schedule,
        createdAt: new Date().toISOString()
    };
    
    // Buscar un slot libre o añadir al final
    const leagues = getAllSavedLeagues();
    currentSaveSlot = leagues.length;
    saveLeagueState();
    return leagueState;
}

function generateFixture(teamsArray) {
    const teams = teamsArray.map(t => t.nombre);
    if (teams.length % 2 !== 0) {
        teams.push(null); // Bye
    }
    const numDays = teams.length - 1;
    const halfSize = teams.length / 2;
    const schedule = [];

    const teamsCopy = [...teams];
    teamsCopy.splice(0, 1);

    for (let day = 0; day < numDays; day++) {
        const matchday = { matchday: day + 1, matches: [] };
        const teamIdx = day % teamsCopy.length;
        
        let home = teams[0];
        let away = teamsCopy[teamIdx];
        if (day % 2 === 0) {
            home = teamsCopy[teamIdx];
            away = teams[0];
        }
        if (home !== null && away !== null) {
            matchday.matches.push({ home, away, played: false, homeScore: null, awayScore: null, scorers: [] });
        }

        for (let idx = 1; idx < halfSize; idx++) {
            const firstTeam = (day + idx) % teamsCopy.length;
            const secondTeam = (day  + teamsCopy.length - idx) % teamsCopy.length;
            if (teamsCopy[firstTeam] !== null && teamsCopy[secondTeam] !== null) {
                matchday.matches.push({
                    home: teamsCopy[firstTeam],
                    away: teamsCopy[secondTeam],
                    played: false, homeScore: null, awayScore: null, scorers: []
                });
            }
        }
        schedule.push(matchday);
    }
    return schedule;
}

function updateStandings() {
    if (!leagueState) return;
    
    // Reset standings
    leagueState.standings.forEach(s => {
        s.pts = 0; s.pld = 0; s.w = 0; s.d = 0; s.l = 0; s.gf = 0; s.ga = 0; s.gd = 0;
    });

    leagueState.schedule.forEach(day => {
        day.matches.forEach(m => {
            if (m.played) {
                const homeStats = leagueState.standings.find(s => s.teamId === m.home);
                const awayStats = leagueState.standings.find(s => s.teamId === m.away);
                
                if (homeStats && awayStats) {
                    homeStats.pld++; awayStats.pld++;
                    homeStats.gf += m.homeScore; homeStats.ga += m.awayScore;
                    awayStats.gf += m.awayScore; awayStats.ga += m.homeScore;
                    
                    if (m.homeScore > m.awayScore) {
                        homeStats.w++; awayStats.l++; homeStats.pts += 3;
                    } else if (m.homeScore < m.awayScore) {
                        awayStats.w++; homeStats.l++; awayStats.pts += 3;
                    } else {
                        homeStats.d++; awayStats.d++; homeStats.pts += 1; awayStats.pts += 1;
                    }
                    
                    homeStats.gd = homeStats.gf - homeStats.ga;
                    awayStats.gd = awayStats.gf - awayStats.ga;
                }
            }
        });
    });

    // Recalcular forma (últimos 5 partidos)
    leagueState.standings.forEach(s => {
        const teamResults = [];
        // Recorrer todas las jornadas hasta la actual
        leagueState.schedule.forEach(day => {
            if (day.matchday < leagueState.currentMatchday) {
                const match = day.matches.find(m => m.home === s.teamId || m.away === s.teamId);
                if (match && match.played) {
                    const isHome = match.home === s.teamId;
                    const teamScore = isHome ? match.homeScore : match.awayScore;
                    const rivalScore = isHome ? match.awayScore : match.homeScore;
                    if (teamScore > rivalScore) teamResults.push('V');
                    else if (teamScore < rivalScore) teamResults.push('D');
                    else teamResults.push('E');
                } else if (!match) {
                    // El equipo descansó esta jornada
                    teamResults.push('R');
                }
            }
        });
        // Quedarse con los últimos 5
        s.form = teamResults.slice(-5);
    });

    // Sort standings
    leagueState.standings.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });
    
    saveLeagueState();
}

function simulateMatch(homeTeamName, awayTeamName) {
    const homeScore = Math.floor(Math.random() * 4);
    const awayScore = Math.floor(Math.random() * 4);
    const matchScorers = [];

    const homeTeam = typeof teamsData !== 'undefined' ? teamsData.find(t => t.nombre === homeTeamName) : null;
    const awayTeam = typeof teamsData !== 'undefined' ? teamsData.find(t => t.nombre === awayTeamName) : null;

    for (let i = 0; i < homeScore; i++) {
        const player = homeTeam && homeTeam.jugadores.length ? homeTeam.jugadores[Math.floor(Math.random() * homeTeam.jugadores.length)] : 'Local';
        matchScorers.push({ team: 'home', name: player.split(',')[0].trim() });
    }
    for (let i = 0; i < awayScore; i++) {
        const player = awayTeam && awayTeam.jugadores.length ? awayTeam.jugadores[Math.floor(Math.random() * awayTeam.jugadores.length)] : 'Visitante';
        matchScorers.push({ team: 'away', name: player.split(',')[0].trim() });
    }

    return { homeScore, awayScore, scorers: matchScorers };
}
