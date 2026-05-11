// ===== MOTOR DEL JUEGO =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let width, height, score, gameState='idle', matchTime=0, matchTimerInterval=null, countdownValue=0, countdownInterval=null, goalTimeout=null;
let pixelScale = 1; // Factor de escala para jugadores/balón según resolución
let isTouchDevice = false;
window.addEventListener('touchstart', function onFirstTouch() {
    isTouchDevice = true;
    window.removeEventListener('touchstart', onFirstTouch);
}, { passive: true });
let isCharging=false, chargeStartTime=0, pendingKickTimeout=null, touchShootStart=0, lastPlayerChangeTime=0;
let currentPlayer=null, touchShootActive=false, currentPossessor=null, teamA_closest=null, teamB_closest=null, playerChangeCooldown=0, lastTapTime=0, lastTapX=0, lastTapY=0;
let goalScorer=null;
let ball, players=[], localTeamData=null, rivalTeamData=null, localStadium='';
const keys={w:false,a:false,s:false,d:false,arrowup:false,arrowleft:false,arrowdown:false,arrowright:false};
const touchState={joystickActive:false,joystickOrigin:{x:0,y:0},joystickCurrent:{x:0,y:0},joystickDir:{x:0,y:0}};
let currentGameMode='match', currentAiDiff=1.0, isSimulation=false;
let audioCtx=null;
function initAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)()}
function playSound(freq,dur,type='sine'){if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.3,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.01,audioCtx.currentTime+dur);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}
function playWhistle(){playSound(800,.15);setTimeout(()=>playSound(800,.15),200)}
let kickoffTeam = 0;
let localScorers = [];
let rivalScorers = [];
let possessionStats = { home: 0, away: 0 };
let bgMusic = null;
let goalSound = null;
let menuMusic = null;

function playAmbientMusic() {
    stopMenuMusic();
    if (!bgMusic) {
        bgMusic = new Audio(typeof AMBIENT_MUSIC_PATH !== 'undefined' ? AMBIENT_MUSIC_PATH : 'musica/ambiente.mp3');
        bgMusic.loop = true;
        bgMusic.volume = 0.4;
    }
    bgMusic.play().catch(e => console.log("Autoplay bloqueado o error de audio:", e));
}

function stopAmbientMusic() {
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
}

function playGoalSound() {
    if (!goalSound) {
        goalSound = new Audio(typeof GOAL_SOUND_PATH !== 'undefined' ? GOAL_SOUND_PATH : 'musica/gol.mp3');
        goalSound.loop = true;
        goalSound.volume = 0.6;
    }
    goalSound.play().catch(e => console.log("Error al reproducir sonido de gol:", e));
}

function stopGoalSound() {
    if (goalSound) {
        goalSound.pause();
        goalSound.currentTime = 0;
    }
}

function playMenuMusic() {
    if (gameState === 'playing' || gameState === 'goal' || gameState === 'countdown' || gameState === 'entrance') return;
    if (!menuMusic) {
        menuMusic = new Audio(typeof MENU_MUSIC_PATH !== 'undefined' ? MENU_MUSIC_PATH : 'musica/fondo.mp3');
        menuMusic.loop = true;
        menuMusic.volume = 0.3;
    }
    menuMusic.play().catch(e => console.log("Música de menú esperando interacción:", e));
}

function stopMenuMusic() {
    if (menuMusic) {
        menuMusic.pause();
        menuMusic.currentTime = 0;
    }
}

// Iniciar música de menú en la primera interacción
window.addEventListener('click', () => {
    if (gameState === 'idle') playMenuMusic();
}, { once: true });

window.addEventListener('touchstart', () => {
    if (gameState === 'idle') playMenuMusic();
}, { once: true });

// Screen Wake Lock API
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock was released');
            });
        }
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
    }
}

function stopGame(){ 
    gameState='idle'; 
    if(matchTimerInterval) clearInterval(matchTimerInterval); 
    matchTimerInterval=null; 
    if(goalTimeout) clearTimeout(goalTimeout);
    goalTimeout = null;
    stopAmbientMusic();
    if(gameState === 'idle') playMenuMusic();
    releaseWakeLock();
}

function pauseGame(){ if(gameState==='playing'||gameState==='countdown'){ gameState='paused' } }

class Ball{
    constructor(){
        this.baseRadius=5.5;
        this.radius=this.baseRadius * pixelScale;
        this.gravity=.3 * pixelScale;
        this.bounce=.6;
        this.frictionGround=.975;
        this.frictionAir=.99;
        this.reset();
    }
    reset(){
        this.radius = this.baseRadius * pixelScale;
        this.gravity = .3 * pixelScale;
        this.x=width/2;
        this.y=height/2;
        this.z=0;this.vx=0;this.vy=0;this.vz=0;
    }
    update(){
        const s = gameConfig.gameSpeed;
        this.x += this.vx * s;
        this.y += this.vy * s;
        this.z += this.vz * s;

        // Gravedad y Fricción
        if (this.z > 0) {
            this.vz -= this.gravity;
            this.vx *= this.frictionAir;
            this.vy *= this.frictionAir;
        } else {
            this.z = 0;
            this.vz *= -this.bounce;
            if (Math.abs(this.vz) < 1) this.vz = 0;
            this.vx *= this.frictionGround;
            this.vy *= this.frictionGround;
        }

        const m = this.radius;
        const pitchTop = 45;
        const pitchBottom = height - 45;
        
        // Colisión Superior / Inferior (Bandas)
        if (this.y < m + pitchTop) {
            this.vy *= -0.7;
            this.y = m + pitchTop;
        } else if (this.y > pitchBottom - m) {
            this.vy *= -0.7;
            this.y = pitchBottom - m;
        }

        const gw = 100, gt = height / 2 - gw / 2, gb = height / 2 + gw / 2;
        // Colisión Izquierda / Derecha (Fondo y Porterías)
        if (this.x < m) {
            if (this.y > gt && this.y < gb) {
                if (this.x < -this.radius && gameState === 'playing') scoreGoal(1);
            } else {
                this.vx *= -0.7;
                this.x = m;
                if(gameState === 'playing') triggerHaptic('light'); // Vibración al chocar con banda
            }
        } else if (this.x > width - m) {
            if (this.y > gt && this.y < gb) {
                if (this.x > width + this.radius && gameState === 'playing') scoreGoal(0);
            } else {
                this.vx *= -0.7;
                this.x = width - m;
            }
        }
    }
    draw(c){
        const ss=Math.max(.2,1-this.z*.01);
        c.beginPath();c.ellipse(this.x,this.y + 5 * pixelScale,this.radius*ss,(this.radius/2)*ss,0,0,Math.PI*2);c.fillStyle='rgba(0,0,0,0.3)';c.fill();
        c.beginPath();c.arc(this.x,this.y-this.z,this.radius,0,Math.PI*2);c.fillStyle='#fff';c.fill();c.strokeStyle='#000';c.lineWidth=0.5;c.stroke();c.lineWidth=1;
    }
}

function positionForKickoff() {
    if (!players.length || !ball) return;

    // Seleccionar al jugador más adelantado (el delantero) para el saque
    let candidates = players.filter(p => p.team === kickoffTeam && !p.isGoalie && !p.isEmergencyGoalkeeper);
    
    // Priorizar jugadores con rol de atacante si existen
    const strikers = candidates.filter(p => p.role === 'attacker' || p.role === 'forward');
    if (strikers.length > 0) candidates = strikers;

    let kickoffPlayer = null;
    if (kickoffTeam === 0) {
        // Para equipo local, el que tenga mayor baseRelX es el más adelantado
        kickoffPlayer = candidates.reduce((prev, curr) => (prev.baseRelX > curr.baseRelX) ? prev : curr);
    } else {
        // Para equipo rival, el que tenga menor baseRelX es el más adelantado
        kickoffPlayer = candidates.reduce((prev, curr) => (prev.baseRelX < curr.baseRelX) ? prev : curr);
    }

    players.forEach(p => {
        if (p.isGoalie || p.isEmergencyGoalkeeper) return;
        p.vx = 0;
        p.vy = 0;
        let newRelX = p.baseRelX;
        if (p.team === 0) {
            newRelX = Math.min(p.baseRelX, 0.45);
        } else {
            newRelX = Math.max(p.baseRelX, 0.55);
        }
        p.x = width * newRelX;
        p.y = height * p.baseRelY;
    });

    if (kickoffPlayer) {
        kickoffPlayer.x = width / 2;
        kickoffPlayer.y = height / 2;
        kickoffPlayer.vx = 0;
        kickoffPlayer.vy = 0;
    }
}

function refreshPlayersForTactic(lineupData, tactic, shirtColor, pantsColor) {
    if (!players.length) return;

    const formation = FORMATIONS[tactic] || FORMATIONS['2-2-2'];
    const positionsTeam0 = GAME_POS_TEAM0[tactic] || GAME_POS_TEAM0['2-2-2'];

    const localPlayers = players.filter(p => p.team === 0);
    const gk = localPlayers.find(p => p.isGoalie || p.isEmergencyGoalkeeper);
    const nonGkPlayers = localPlayers.filter(p => !p.isGoalie && !p.isEmergencyGoalkeeper);

    const requiredNames = formation.filter(s => s.role !== 'goalie' && s.role !== 'goalkeeper').map(s => getFirstName(lineupData[s.id])).filter(Boolean);
    const usedPlayers = new Set();

    formation.forEach(slot => {
        if (slot.role === 'goalkeeper' || slot.role === 'goalie') return;
        const playerName = lineupData[slot.id];
        if (!playerName) return;
        const targetName = getFirstName(playerName);
        
        let player = nonGkPlayers.find(p => p.name === targetName);
        if (!player) {
            player = nonGkPlayers.find(p => !requiredNames.includes(p.name) && !usedPlayers.has(p));
            if (player) {
                player.name = targetName;
                player.fullName = playerName;
            }
        }
        if (!player) return;
        usedPlayers.add(player);

        const posIndex = positionsTeam0.findIndex((pos, i) => {
            const role = slot.role || (slot.label === 'DEF' ? 'defender' : slot.label === 'MC' ? 'midfielder' : slot.label === 'DEL' ? 'attacker' : null);
            return pos.role === role && !pos._used;
        });
        const pos = positionsTeam0[posIndex];
        if (pos) {
            pos._used = true;
            player.baseRelX = pos.rx;
            player.baseRelY = pos.ry;
            player.x = width * pos.rx;
            player.y = height * pos.ry;
            player.vx = 0;
            player.vy = 0;
        }
    });

    if (shirtColor && pantsColor) {
        localPlayers.forEach(p => {
            if (!p.isGoalie && !p.isEmergencyGoalkeeper) {
                p.shirtColor = shirtColor;
                p.pantsColor = pantsColor;
            }
        });
    }

    positionsTeam0.forEach(p => delete p._used);

    if (gk) {
        if (lineupData['GK']) {
            gk.name = getFirstName(lineupData['GK']);
            gk.fullName = lineupData['GK'];
        }
        const gkPos = positionsTeam0.find(p => p.role === 'goalkeeper');
        if (gkPos) {
            gk.baseRelX = gkPos.rx;
            gk.baseRelY = gkPos.ry;
            gk.x = width * gkPos.rx;
            gk.y = height * gkPos.ry;
        }
    }

    // Recalcular displayNames para reflejar los cambios en los jugadores
    const nameCounts = {};
    localPlayers.forEach(p => {
        nameCounts[p.name] = (nameCounts[p.name] || 0) + 1;
    });
    localPlayers.forEach(p => {
        if (nameCounts[p.name] > 1 && p.fullName && p.fullName.includes(',')) {
            const lastName = p.fullName.split(',')[0].trim();
            p.displayName = p.name + " " + lastName.charAt(0) + ".";
        } else {
            p.displayName = p.name;
        }
    });
}

class Player{
    constructor(name,role,relX,relY,team,isGoalie,shirtColor,pantsColor,headColor){
        this.name=name;this.fullName = name;
        this.role=role;this.baseRelX=relX;this.baseRelY=relY;
        this.radius=11 * pixelScale;
        this.team=team;this.shirtColor=shirtColor||'#4dabf7';this.pantsColor=pantsColor||'#0b2b5e';
        
        const skinColors = ['#ffccaa', '#f1c27d', '#e0ac69', '#8d5524', '#c68642'];
        this.headColor=skinColors[Math.floor(Math.random()*skinColors.length)];
        
        this.isGoalie=isGoalie;this.isUser=false;this.isEmergencyGoalkeeper=false;
        this.baseMaxSpeed=(isGoalie?2.2:3.8) * pixelScale;
        this.walkPhase=0;
        this.tears = [];
        this.speechBubble = null;
        this.speechTimer = 0;
        // Bias boots toward black (4 out of 6 chances)
        const bootColors=['#111111','#111111','#111111','#111111','#ff9800','#ffeb3b'];
        this.bootColor=bootColors[Math.floor(Math.random()*bootColors.length)];
        this.reset();
    }
    get maxSpeed(){
        if(this.team===1&&!this.isUser)return this.baseMaxSpeed*currentAiDiff;
        if((this.team===0)&&(this.isGoalie||this.isEmergencyGoalkeeper))return this.baseMaxSpeed*0.85;
        return this.baseMaxSpeed;
    }
    reset(){
        this.radius = 11 * pixelScale;
        this.baseMaxSpeed = (this.isGoalie ? 2.2 : 3.8) * pixelScale;
        this.x=width*this.baseRelX;this.y=height*this.baseRelY;this.vx=0;this.vy=0;this.angle=this.team===0?0:Math.PI;
    }
    getHomePosition(teamHasBall){
        let sx=teamHasBall?.1:-.05,rx=this.baseRelX+(this.team===0?sx:-sx);
        rx=Math.max(.1,Math.min(.9,rx));
        let ry=this.baseRelY+(ball.y/height-.5)*.4;ry=Math.max(.1,Math.min(.9,ry));
        return{x:width*rx,y:height*ry};
    }
    kick(b,power,tv=null){
        let kx,ky;
        if(tv){kx=tv.x;ky=tv.y}else{const dx=b.x-this.x,dy=b.y-this.y,d=Math.hypot(dx,dy)||1;kx=dx/d;ky=dy/d}
        const hp=6+power*14;b.vx=kx*hp+this.vx*.4;b.vy=ky*hp+this.vy*.4;b.vz=power>.3?power*8:2;
        
        // Efectos PWA/Mobile
        if(this.isUser) {
            triggerHaptic(power > 0.6 ? 'medium' : 'light');
            playSound(150 + power * 100, 0.1, 'sine'); // Sonido de patada
        }
    }
    update(b){
        let dx=0,dy=0,moving=false;
        if(this.isUser){
            if(keys.w||keys.arrowup)dy-=1;if(keys.s||keys.arrowdown)dy+=1;
            if(keys.a||keys.arrowleft)dx-=1;if(keys.d||keys.arrowright)dx+=1;
            if(touchState.joystickActive){dx+=touchState.joystickDir.x;dy+=touchState.joystickDir.y}
            const l=Math.hypot(dx,dy);if(l>0){dx/=l;dy/=l;moving=true}
        }else if(this.isGoalie||(this.isEmergencyGoalkeeper&&!this.isUser)){
            const gt=height/2-60,gb=height/2+60,baseX=this.team===0?0.05:0.95;
            let ty=Math.max(gt,Math.min(gb,b.y)),tx=width*baseX;
            const d2b=Math.hypot(b.x-this.x,b.y-this.y);
            if(d2b<width*.25){tx+=(this.team===0?1:-1)*width*.08;ty=b.y}
            this.angle=this.team===0?0:Math.PI;dx=tx-this.x;dy=ty-this.y;
            const l=Math.hypot(dx,dy);if(l>5){dx/=l;dy/=l;moving=true}
        }else if(this.isEmergencyGoalkeeper&&this.isUser){
            const gt=height/2-60,gb=height/2+60;let ty=Math.max(gt,Math.min(gb,b.y)),tx=width*0.05;
            const d2b=Math.hypot(b.x-this.x,b.y-this.y);
            if(d2b<width*.25){tx=width*0.15;ty=b.y}
            this.angle=0;dx=tx-this.x;dy=ty-this.y;
            const l=Math.hypot(dx,dy);if(l>5){dx/=l;dy/=l;moving=true}
        }else{
            let tx=this.x,ty=this.y;
            const isC=(this.team===0&&this===teamA_closest)||(this.team===1&&this===teamB_closest);
            const thb=currentPossessor&&currentPossessor.team===this.team;
            if(this===currentPossessor){
                const gx=this.team===0?width:0,d2g=Math.hypot(gx-this.x,height/2-this.y);
                const tm=players.filter(p=>p.team===this.team&&p!==this&&!p.isGoalie);
                const fw=tm.filter(t=>this.team===0?t.x>this.x+30:t.x<this.x-30);
                let passed=false;
                if(fw.length>0&&Math.random()<.02*currentAiDiff){
                    const tg=fw[Math.floor(Math.random()*fw.length)],a=Math.atan2(tg.y-this.y,tg.x-this.x);
                    this.kick(b,.5,{x:Math.cos(a),y:Math.sin(a)});passed=true;
                }
                if(!passed){if(d2g<width*.4&&Math.random()<.04*currentAiDiff){
                    const a=Math.atan2(height/2-this.y+(Math.random()*40-20),gx-this.x);
                    this.kick(b,.8,{x:Math.cos(a),y:Math.sin(a)});
                }else{tx=gx;ty=height/2}}
            }else if(isC&&!thb){tx=b.x+b.vx*15;ty=b.y+b.vy*15}
            else{const h=this.getHomePosition(thb);tx=h.x;ty=h.y}
            dx=tx-this.x;dy=ty-this.y;const l=Math.hypot(dx,dy);if(l>5){dx/=l;dy/=l;moving=true}
        }
        const acc=.45,fr=.85;
        if(moving){this.vx+=dx*acc;this.vy+=dy*acc;if(!this.isGoalie||this.isUser)this.angle=Math.atan2(dy,dx)}
        this.vx*=fr;this.vy*=fr;
        const cs=Math.hypot(this.vx,this.vy);
        if(cs>this.maxSpeed){this.vx=this.vx/cs*this.maxSpeed;this.vy=this.vy/cs*this.maxSpeed}
        const s = gameConfig.gameSpeed;
        this.x+=this.vx*s;this.y+=this.vy*s;
        
        // Update animation phase
        const speed = Math.hypot(this.vx, this.vy);
        if (speed > 0.1) {
            this.walkPhase += speed * 0.25 * s;
        } else {
            this.walkPhase *= 0.9; // Smoothly return to standing still
        }

        if(this.isGoalie){
            const minX=this.team===0?this.radius+5:width*0.85-this.radius;
            const maxX=this.team===0?width*0.15+this.radius:width-this.radius-5;
            const goalBoxH=70;
            const minY=height/2-goalBoxH+this.radius;
            const maxY=height/2+goalBoxH-this.radius;
            this.x=Math.max(minX,Math.min(maxX,this.x));
            this.y=Math.max(minY,Math.min(maxY,this.y));
        }else{
            this.x=Math.max(this.radius,Math.min(width-this.radius,this.x));
        }
        this.y=Math.max(this.radius,Math.min(height-this.radius,this.y));
        const d2b=Math.hypot(this.x-b.x,this.y-b.y);
        if(currentPossessor===this&&b.z<10&&d2b<this.radius+b.radius+15){
            const sp=Math.hypot(this.vx,this.vy);
            if(sp>.8){
                const ma=Math.atan2(this.vy,this.vx);
                const bx=(b.x-this.x)/d2b,by=(b.y-this.y)/d2b,mx=Math.cos(ma),my=Math.sin(ma);
                if(bx*mx+by*my>.3){
                    const sx=this.x+mx*(this.radius+b.radius+3),sy=this.y+my*(this.radius+b.radius+3);
                    b.vx+=(sx-b.x)*.15;b.vy+=(sy-b.y)*.15;
                }
            }
            b.vx+=(this.vx-b.vx)*.08;b.vy+=(this.vy-b.vy)*.08;
        }
    }
    draw(c){
        const anim = Math.sin(this.walkPhase);
        const animCos = Math.cos(this.walkPhase);
        const isLoser = gameState === 'end_celebration' && ((score[0] > score[1] && this.team === 1) || (score[1] > score[0] && this.team === 0));
        
        // Sombra base
        c.beginPath();c.ellipse(this.x,this.y + 10 * pixelScale,this.radius,4 * pixelScale,0,0,Math.PI*2);c.fillStyle='rgba(0,0,0,0.2)';c.fill();
        
        // Indicador de selección
        if(this.isUser){
            c.beginPath();c.ellipse(this.x,this.y + 12 * pixelScale, 16 * pixelScale, 7 * pixelScale,0,0,Math.PI*2);
            c.fillStyle='rgba(255,255,255,0.3)';c.fill();
            c.strokeStyle='rgba(255,255,255,0.8)';c.lineWidth=2;c.stroke();
        }
        
        const scoredTeam = gameState === 'goal' ? (kickoffTeam === 1 ? 0 : 1) : -1;
        const winnerTeam = (gameState === 'end_celebration') ? (score[0] > score[1] ? 0 : (score[1] > score[0] ? 1 : -1)) : -1;
        const isCelebrating = (this.team === scoredTeam) || (this.team === winnerTeam);
        const jumpY = isCelebrating ? Math.abs(Math.sin(Date.now() * 0.015)) * 10 * pixelScale : 0;

        c.save();
        c.translate(this.x, this.y - jumpY + 5 * pixelScale);
        c.scale(0.66, 0.66);
        c.rotate(this.angle);
        c.lineWidth = 1.5;
        c.strokeStyle = '#000';
        
        const actualRadius = this.radius;
        this.radius = 16 * pixelScale;

        // Pies flotantes - Botas Adidas Negras
        const footY = 10;
        const footOsc = isLoser ? Math.sin(Date.now()*0.01)*2 : anim * 10;
        
        const drawAdidasBootTopDown = (bx, by) => {
            c.save();
            c.translate(bx, by);
            c.fillStyle = '#000';
            c.beginPath(); c.ellipse(0, 0, 7, 4.5, 0, 0, Math.PI*2); c.fill(); c.stroke();
            // 3 Rayas Adidas
            c.strokeStyle = '#fff'; c.lineWidth = 1;
            for(let i=0; i<3; i++) {
                c.beginPath();
                c.moveTo(-2 + i*2, -2);
                c.lineTo(-3 + i*2, 2);
                c.stroke();
            }
            c.restore();
        };

        drawAdidasBootTopDown(footOsc, -footY);
        drawAdidasBootTopDown(-footOsc, footY);

        // Manos flotantes
        const handY = 14;
        const handX = 4;
        const handOsc = isLoser ? Math.cos(Date.now()*0.01)*2 : animCos * 6;
        c.fillStyle = this.headColor;
        c.beginPath(); c.ellipse(handX + handOsc, -handY, 4.5, 4.5, 0, 0, Math.PI*2); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(handX - handOsc, handY, 4.5, 4.5, 0, 0, Math.PI*2); c.fill(); c.stroke();

        // Cuerpo principal (Camiseta de bebé)
        c.fillStyle = this.shirtColor;
        c.beginPath();
        c.arc(0, 0, this.radius * 0.95, 0, Math.PI*2);
        c.fill();
        c.stroke();
        
        // Pañal (Mitad trasera del cuerpo - Un poco más grande)
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(0, 0, this.radius * 0.95, Math.PI * 0.65, Math.PI * 1.35); 
        c.fill();
        c.stroke();


        // Cabeza (Bebé)
        c.fillStyle = this.headColor;


        // Pelitos de bebé (3 mechones curvos)
        c.strokeStyle = '#333';
        c.lineWidth = 1;
        for(let i=-1; i<=1; i++) {
            c.beginPath();
            c.moveTo(this.radius*0.2, i*3);
            c.quadraticCurveTo(0, i*5 - 10, -this.radius*0.3, i*3 - 5);
            c.stroke();
        }

        c.lineWidth = 1.5;
        c.strokeStyle = '#000';
        c.beginPath();
        c.arc(this.radius * 0.3, 0, this.radius * 0.75, 0, Math.PI*2);
        c.fill();
        c.stroke();
        
        // Cara (VISTA CENITAL: Desde arriba)
        const eyeR = 2.2; 
        const eyeSep = this.radius * 0.28; 
        c.lineWidth = 0.5; // Borde más pequeño para los ojos
        // Ojo 1
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(this.radius * 0.55, -eyeSep, eyeR, 0, Math.PI*2); c.fill(); c.stroke();
        c.fillStyle = '#000';
        c.beginPath(); c.arc(this.radius * 0.55, -eyeSep, eyeR * 0.6, 0, Math.PI*2); c.fill();
        // Ojo 2
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(this.radius * 0.55, eyeSep, eyeR, 0, Math.PI*2); c.fill(); c.stroke();
        c.fillStyle = '#000';
        c.beginPath(); c.arc(this.radius * 0.55, eyeSep, eyeR * 0.6, 0, Math.PI*2); c.fill();
        c.lineWidth = 1.5; // Reset




        if (isLoser) {
            // Lágrimas: salen de los ojos (vistos desde arriba)
            if (Math.random() < 0.2) {
                const side = Math.random() > 0.5 ? 1 : -1;
                this.tears.push({
                    rx: this.radius * 0.55, 
                    ry: side * eyeSep, 
                    life: 1
                });
            }
        }
        
        // Dibujar lágrimas (Dentro del contexto rotado)
        this.tears = this.tears.filter(t => t.life > 0);
        c.fillStyle = 'rgba(77, 171, 247, 0.8)';
        this.tears.forEach(t => {
            c.beginPath();
            c.arc(t.rx, t.ry, 2.2, 0, Math.PI*2);
            c.fill();
            t.rx += 0.8; // Deslizan hacia adelante (frente de la cara)
            t.life -= 0.03;
        });
        
        // Chupete visto desde arriba (sobresale un poco por el frente)
        const pacColor = this.team === 0 ? (gameConfig.userShirtColor || this.shirtColor) : this.shirtColor;
        c.fillStyle = pacColor;
        c.beginPath(); c.arc(this.radius * 0.85, 0, 3.5, 0, Math.PI*2); c.fill(); c.stroke(); 
        c.beginPath(); c.arc(this.radius * 1.0, 0, 2, 0, Math.PI*2); c.stroke(); // Anilla plana desde arriba

        // Cabeza (Bebé)
        c.restore();
        c.save();
        c.translate(this.x, this.y);
        c.rotate(this.angle);

        c.fillStyle = this.headColor;
        // Ricito propio de bebé (Nace desde arriba/centro)
        c.strokeStyle = '#333';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(this.radius * 0.2, 0); // Centro coronilla
        c.bezierCurveTo(this.radius * 0.4, -this.radius * 0.3, this.radius * 0.6, 0, this.radius * 0.4, this.radius * 0.2);
        c.stroke();

        // Bocadillo de cómic
        if (this.speechBubble) {
            c.restore(); // Salimos del rotate para que el texto no esté girado
            c.save();
            c.translate(this.x, this.y - 45);
            
            c.fillStyle = '#fff';
            c.strokeStyle = '#000';
            c.lineWidth = 1.5;
            
            // Globo
            const txt = this.speechBubble;
            const tw = c.measureText(txt).width + 10;
            c.beginPath();
            c.ellipse(0, 0, tw, 12, 0, 0, Math.PI * 2);
            c.fill(); c.stroke();
            
            // Pico
            c.beginPath();
            c.moveTo(-5, 10); c.lineTo(0, 18); c.lineTo(5, 10);
            c.fill(); c.stroke();
            
            c.fillStyle = '#000';
            c.font = 'bold 12px sans-serif';
            c.textAlign = 'center';
            c.fillText(txt, 0, 4);
            c.save(); // dummy save para el restore final
        }

        c.restore();
        this.radius = actualRadius;

        // (Eliminada la sección de dibujo de lágrimas de aquí, movida arriba al contexto rotado)
        
        // Etiqueta de nombre
        let displayName = this.displayName || this.name || "Jugador";
        if (typeof displayName !== 'string') displayName = String(displayName);
        c.font = '8px "Luckiest Guy", cursive';
        c.textAlign = 'center';
        const txtWidth = c.measureText(displayName).width;
        const rectW = txtWidth + 10;
        const rectH = 12;
        const rectX = this.x - rectW / 2;
        const rectY = this.y - this.radius - 18;

        // Fondo Diferente por equipo y borde Negro
        c.fillStyle = this.team === 0 ? '#FFCB05' : '#4dabf7'; 
        c.fillRect(rectX, rectY, rectW, rectH);
        c.strokeStyle = '#000';
        c.lineWidth = 2;
        c.strokeRect(rectX, rectY, rectW, rectH);

        c.fillStyle = '#000';
        c.textBaseline = 'middle';
        c.fillText(displayName, this.x, rectY + rectH / 2 + 1);
        
        // Barra de carga
        if(this.isUser&&isCharging){
            const bw=40,bh=6;c.fillStyle='rgba(0,0,0,0.5)';c.fillRect(this.x-bw/2,this.y-45,bw,bh);
            let cp=Math.min(1,(Date.now()-chargeStartTime)/700);
            const r=Math.min(255,Math.floor(510*cp)),g=Math.min(255,Math.floor(510*(1-cp)));
            c.fillStyle=`rgb(${r},${g},0)`;c.fillRect(this.x-bw/2,this.y-45,bw*cp,bh);
        }
    }
}

// ===== GAME INIT =====
function initGame(team, lineupData, rival, rivalLineup, mode, diff, tactic, simulate=false) {
    localTeamData = team;
    rivalTeamData = rival;
    currentGameMode = mode;
    currentAiDiff = diff;
    isSimulation = simulate;
    localStadium = team.terrenoJuego || '';
    score = [0, 0];
    localScorers = [];
    rivalScorers = [];
    possessionStats = { home: 0, away: 0 };
    matchTime = 0;
    gameState = 'entrance';
    entranceTimer = 0;
    kickoffTeam = 0;
    countdownValue = 3;

    resize();
    initAudio();
    playAmbientMusic();
    requestWakeLock();
    ball = new Ball();
    players = [];
    if (simulate) positionForKickoff();

    const sc = gameConfig.userShirtColor || mapColor(team.equipacion?.camiseta);
    const pc = gameConfig.userPantsColor || mapColor(team.equipacion?.pantalon);
    const hc = mapColor(team.equipacion?.medias);

    const formation = FORMATIONS[tactic] || FORMATIONS['2-2-2'];
    const positionsTeam0 = GAME_POS_TEAM0[tactic] || GAME_POS_TEAM0['2-2-2'];
    const rivalTactics = ['2-2-2', '3-2-1', '2-3-1'];
    const rivalTactic = rivalTactics[Math.floor(Math.random() * rivalTactics.length)];
    const positionsTeam1 = GAME_POS_TEAM1[rivalTactic] || GAME_POS_TEAM1['2-2-2'];

    const nonGkSlots = formation.filter(s => s.role !== 'goalie' && s.role !== 'goalkeeper');
    nonGkSlots.forEach((slot) => {
        const posIndex = positionsTeam0.findIndex(p => {
            const role = slot.role || (slot.label === 'DEF' ? 'defender' : slot.label === 'MC' ? 'midfielder' : slot.label === 'DEL' ? 'attacker' : null);
            return p.role === role && !p._used;
        });
        const pos = positionsTeam0[posIndex];
        if (pos) pos._used = true;
        let fullName = lineupData[slot.id];
        if (!fullName) {
            // Fallback: usar el jugador por defecto del equipo para esa posición
            const teamPlayers = selectedTeam.jugadores || [];
            fullName = teamPlayers[players.length % teamPlayers.length] || "Bebé";
        }
        const name = getFirstName(fullName);
        const isGoalie = false;
        const shirtColor = sc;
        const pantsColor = pc;
        const player = new Player(name, pos.role, pos.rx, pos.ry, 0, isGoalie, shirtColor, pantsColor, hc);
        player.fullName = fullName; // Guardar el nombre completo real
        if (simulate) player.isUser = false;
        players.push(player);
    });

    const gkSlot = formation.find(s => s.role === 'goalie' || s.role === 'goalkeeper');
    if (gkSlot) {
        const gkPos = positionsTeam0.find(p => p.role === 'goalkeeper' && !p._used);
        if (gkPos) gkPos._used = true;
        const fullNameGK = lineupData['GK'] || (selectedTeam.jugadores && selectedTeam.jugadores[0]) || "Portero";
        const gkName = getFirstName(fullNameGK);
        const neonColors = ['#ccff00', '#ff003c', '#00ff48', '#00e5ff', '#ff00aa'];
        const gkShirt = neonColors[Math.floor(Math.random()*neonColors.length)];
        const gk = new Player(gkName, 'goalkeeper', gkPos.rx, gkPos.ry, 0, true, gkShirt, '#111111', hc);
        gk.fullName = fullNameGK;
        if (simulate) gk.isUser = false;
        players.push(gk);
    }

    // Clean up _used flags
    positionsTeam0.forEach(p => delete p._used);

    // Equipo rival
    if ((mode === 'match' || mode === 'league_match') && rival && rivalLineup) {
        const rsc = mapColor(rival.equipacion?.camiseta);
        const rpc = mapColor(rival.equipacion?.pantalon);
        const rhc = mapColor(rival.equipacion?.medias);
        const rivalFormation = FORMATIONS[rivalTactic] || FORMATIONS['2-2-2'];
        const rivalNonGkSlots = rivalFormation.filter(s => s.role !== 'goalie' && s.role !== 'goalkeeper');
        
        const availableRivalNames = rivalLineup ? Object.values(rivalLineup) : [];
        let nameIndex = 0;

        rivalNonGkSlots.forEach((slot) => {
            const posIndex = positionsTeam1.findIndex(p => {
                const role = slot.role || (slot.label === 'DEF' ? 'defender' : slot.label === 'MC' ? 'midfielder' : slot.label === 'DEL' ? 'attacker' : null);
                return p.role === role && !p._used;
            });
            const pos = positionsTeam1[posIndex];
            if (pos) pos._used = true;
            
            let fullName = rivalLineup[slot.id];
            if (!fullName && availableRivalNames.length > 0) {
                fullName = availableRivalNames[nameIndex % availableRivalNames.length];
                nameIndex++;
            }
            const name = getFirstName(fullName || 'Rival');
            const isGoalie = false;
            const shirtColor = rsc;
            const pantsColor = rpc;
            const player = new Player(name, pos.role, pos.rx, pos.ry, 1, isGoalie, shirtColor, pantsColor, rhc);
            player.fullName = fullName; // Guardar el nombre completo real
            if (simulate) player.isUser = false;
            players.push(player);
        });

        const rivalGkSlot = rivalFormation.find(s => s.role === 'goalie' || s.role === 'goalkeeper');
        if (rivalGkSlot) {
            const gkPos1 = positionsTeam1.find(p => p.role === 'goalkeeper' && !p._used);
            if (gkPos1) gkPos1._used = true;
            const rivalGkName = rivalLineup && rivalLineup['GK'] ? getFirstName(rivalLineup['GK']) : 'POR';
            const neonColors = ['#ccff00', '#ff003c', '#00ff48', '#00e5ff', '#ff00aa'];
            const rivalGkShirt = neonColors[Math.floor(Math.random()*neonColors.length)];
            const gk1 = new Player(rivalGkName, 'goalkeeper', gkPos1.rx, gkPos1.ry, 1, true, rivalGkShirt, '#111111', rhc);
            if (simulate) gk1.isUser = false;
            players.push(gk1);
        }

        positionsTeam1.forEach(p => delete p._used);
    }

    // LÓGICA DE NOMBRES DUPLICADOS
    const tIds = [0, 1];
    tIds.forEach(tId => {
        const teamPlayers = players.filter(p => p.team === tId);
        const nameCounts = {};
        teamPlayers.forEach(p => {
            nameCounts[p.name] = (nameCounts[p.name] || 0) + 1;
        });

        teamPlayers.forEach(p => {
            if (nameCounts[p.name] > 1 && p.fullName && p.fullName.includes(',')) {
                const lastName = p.fullName.split(',')[0].trim();
                p.displayName = p.name + " " + lastName.charAt(0) + ".";
            } else {
                p.displayName = p.name;
            }
        });
    });

    players.forEach(p => { p.tacticX = p.x; p.tacticY = p.y; });
    const lineA = players.filter(p => p.team === 0).sort((a,b) => (b.isGoalie?1:0) - (a.isGoalie?1:0));
    const lineB = players.filter(p => p.team === 1).sort((a,b) => (b.isGoalie?1:0) - (a.isGoalie?1:0));
    lineA.forEach((p, i) => { p.x = width/2 - 20; p.y = height + 30 + i*40; p.angle = -Math.PI/2; });
    lineB.forEach((p, i) => { p.x = width/2 + 20; p.y = height + 30 + i*40; p.angle = -Math.PI/2; });

    // UI del marcador
    const sbA = document.getElementById('sb-team-a');
    const sbB = document.getElementById('sb-team-b');
    document.getElementById('score-a').textContent = '0';
    document.getElementById('score-b').textContent = '0';
    document.getElementById('match-time').textContent = "00'";
    document.getElementById('stadium-label').textContent = localStadium;

    // Badge A
    const badgeA = document.getElementById('badge-a');
    if (team.escudo) { badgeA.src = team.escudo; badgeA.style.display = 'inline'; }
    else badgeA.style.display = 'none';
    document.getElementById('name-a').textContent = team.nombre.split('"')[0].trim();

    // Badge B y visibilidad
    const pWidget = document.getElementById('possession-widget');
    if ((mode === 'match' || mode === 'league_match') && rival) {
        const badgeB = document.getElementById('badge-b');
        if (rival.escudo) { badgeB.src = rival.escudo; badgeB.style.display = 'inline'; }
        else badgeB.style.display = 'none';
        document.getElementById('name-b').textContent = rival.nombre.split('"')[0].trim();
        sbB.style.display = 'flex';
        document.getElementById('sb-sep').style.display = 'inline';
        if (pWidget) {
            pWidget.style.display = 'flex';
            document.getElementById('possession-home').style.background = sc || '#4dabf7';
            document.getElementById('possession-away').style.background = mapColor(rival.equipacion?.camiseta) || '#e53935';
            document.getElementById('poss-text-home').style.color = sc || '#4dabf7';
            document.getElementById('poss-text-away').style.color = mapColor(rival.equipacion?.camiseta) || '#e53935';
            document.getElementById('possession-home').style.width = '50%';
            document.getElementById('possession-away').style.width = '50%';
            document.getElementById('poss-text-home').textContent = '50%';
            document.getElementById('poss-text-away').textContent = '50%';
        }
    } else {
        document.getElementById('sb-team-b').style.display = 'none';
        document.getElementById('sb-sep').style.display = 'none';
        if (pWidget) pWidget.style.display = 'none';
    }

    // Timer
    if (matchTimerInterval) clearInterval(matchTimerInterval);
    matchTimerInterval = setInterval(() => {
        if (gameState === 'playing') {
            matchTime++;
            const mins = Math.floor(matchTime / 60);
            const secs = matchTime % 60;
            document.getElementById('match-time').textContent = mins + "'" + (secs < 10 ? "0" + secs : secs);
            if (matchTime >= gameConfig.matchDuration * 60) {
                clearInterval(matchTimerInterval);
                endMatchCountdown();
            }
        }
    }, 1000);

    // Countdown logic
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        if (gameState === 'countdown') {
            countdownValue--;
            if (countdownValue <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                document.getElementById('countdown-display').style.display = 'none';
                gameState = 'playing';
            }
        }
    }, 1000);
}

function endMatch() {
    gameState = 'idle';
    if (matchTimerInterval) clearInterval(matchTimerInterval);
    if (countdownInterval) clearInterval(countdownInterval);
    if (goalTimeout) clearTimeout(goalTimeout);
    goalTimeout = null;
    stopAmbientMusic();
    playMenuMusic();
    clearScorersDisplay();
    document.getElementById('game-ui').classList.remove('active');
    const rs = document.getElementById('result-screen');
    document.getElementById('result-score-text').textContent = score[0] + ' - ' + score[1];
    const rn1 = document.getElementById('result-name-a');
    const rn2 = document.getElementById('result-name-b');
    if (rn1 && localTeamData) rn1.textContent = localTeamData.nombre;
    if (rn2 && rivalTeamData) rn2.textContent = rivalTeamData.nombre;
    else if (rn2) rn2.textContent = '';

    let msg = '¡FIN DEL PARTIDO!';
    if (score[0] > score[1]) msg = '¡VICTORIA!';
    else if (score[0] < score[1]) msg = 'DERROTA';
    else msg = 'EMPATE';
    
    // Mostrar goleadores agregados en la pantalla de resultados
    const aggregateScorers = (list) => {
        const counts = {};
        list.forEach(name => counts[name] = (counts[name] || 0) + 1);
        return Object.entries(counts).map(([name, count]) => `<div>${name} ⚽${count > 1 ? ' x' + count : ''}</div>`).join('');
    };

    const resScorersA = document.getElementById('result-scorers-a');
    const resScorersB = document.getElementById('result-scorers-b');
    if (resScorersA && resScorersB) {
        resScorersA.innerHTML = aggregateScorers(localScorers);
        resScorersB.innerHTML = aggregateScorers(rivalScorers);
    }
    
    document.getElementById('result-title').textContent = msg;

    if (currentGameMode === 'league_match' && typeof leagueState !== 'undefined' && leagueState) {
        const mDay = leagueState.schedule.find(d => d.matchday === leagueState.currentMatchday);
        if (mDay) {
            const match = mDay.matches.find(m => m.home === leagueState.userTeamId || m.away === leagueState.userTeamId);
            if (match && !match.played) {
                const mappedScorers = [];
                if (match.home === leagueState.userTeamId) {
                    match.homeScore = score[0];
                    match.awayScore = score[1];
                    localScorers.forEach(name => mappedScorers.push({ team: 'home', name }));
                    rivalScorers.forEach(name => mappedScorers.push({ team: 'away', name }));
                } else {
                    match.homeScore = score[1];
                    match.awayScore = score[0];
                    localScorers.forEach(name => mappedScorers.push({ team: 'away', name }));
                    rivalScorers.forEach(name => mappedScorers.push({ team: 'home', name }));
                }
                match.scorers = mappedScorers;
                match.played = true;
                if (typeof updateStandings === 'function') updateStandings();
            }
        }
    }

    showScreen('result');
}

function endMatchCountdown() {
    gameState = 'countdown';
    countdownValue = 3;
    const cd = document.getElementById('countdown-display');
    cd.style.display = 'block';
    cd.textContent = '3';
    playWhistle();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue > 0) {
            cd.textContent = countdownValue;
        } else {
            clearInterval(countdownInterval);
            countdownInterval = null;
            cd.style.display = 'none';
            playWhistle();
            setTimeout(playWhistle, 500);
            setTimeout(playWhistle, 1000);
            gameState = 'end_celebration';
            setTimeout(endMatch, 8000); // Aumentado a 8 segundos para que se vea bien la celebración y el llanto
        }
    }, 1000);
}

function scoreGoal(teamIndex) {
    if (currentGameMode === 'training' && teamIndex === 1) return;
    if (gameState === 'goal') return;
    gameState = 'goal';
    score[teamIndex]++;
    triggerHaptic('goal');
    playGoalSound();

    players.forEach(p => { p.vx = 0; p.vy = 0; });
    goalScorer = currentPossessor && currentPossessor.team === teamIndex ? currentPossessor : players.filter(p => p.team === teamIndex && !p.isGoalie).reduce((best, p) => (!best || Math.hypot(p.x - ball.x, p.y - ball.y) < Math.hypot(best.x - ball.x, best.y - ball.y) ? p : best), null);

    if (goalScorer) {
        if (teamIndex === 0) {
            localScorers.push(goalScorer.name);
        } else {
            rivalScorers.push(goalScorer.name);
        }
    }

    document.getElementById('score-a').textContent = score[0];
    document.getElementById('score-b').textContent = score[1];
    updateScorersDisplay();
    const msgEl = document.getElementById('game-message');
    msgEl.style.display = 'block';
    kickoffTeam = teamIndex === 0 ? 1 : 0;
    if (goalTimeout) clearTimeout(goalTimeout);
    goalTimeout = setTimeout(() => {
        if (gameState !== 'goal') return;
        msgEl.style.display = 'none';
        stopGoalSound();
        players.forEach(p => p.reset());
        ball.reset();
        positionForKickoff();
        gameState = 'countdown';
        countdownValue = 3;
        playWhistle();
        const cd = document.getElementById('countdown-display');
        cd.style.display = 'block';
        cd.textContent = '3';
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            if (gameState !== 'countdown') {
                clearInterval(countdownInterval);
                return;
            }
            countdownValue--;
            if (countdownValue > 0) {
                cd.textContent = countdownValue;
            } else {
                clearInterval(countdownInterval);
                countdownInterval = null;
                cd.style.display = 'none';
                gameState = 'playing';
            }
        }, 1000);
        goalTimeout = null;
    }, 4000);
}

function updateScorersDisplay() {
    const el = document.getElementById('scorers-display');
    if (!el) return;
    
    const aggregate = (list) => {
        const counts = {};
        list.forEach(name => counts[name] = (counts[name] || 0) + 1);
        return Object.entries(counts).map(([name, count]) => `<span>${name}${count > 1 ? ' (x' + count + ')' : ''}</span>`).join('');
    };

    let html = '<div class="scorers-col scorers-local">' + aggregate(localScorers) + '</div>';
    html += '<div class="scorers-col scorers-rival">' + aggregate(rivalScorers) + '</div>';
    el.innerHTML = html;
}

function clearScorersDisplay() {
    const el = document.getElementById('scorers-display');
    if (el) el.innerHTML = '';
}

// ===== INPUT =====
function startAction(){
    if(pendingKickTimeout){clearTimeout(pendingKickTimeout);pendingKickTimeout=null;isCharging=false;executePass();return}
    isCharging=true;chargeStartTime=Date.now();
}
function endAction(){
    if(!isCharging)return;const cd=Date.now()-chargeStartTime;let pw=Math.min(1,cd/700);isCharging=false;
    if(cd<200){executeShortTapPass();pendingKickTimeout=null}
    else executeUserKick(pw);
}
function executeShortTapPass(){
    if(!currentPlayer||!ball)return;
    const d=Math.hypot(currentPlayer.x-ball.x,currentPlayer.y-ball.y);
    if(d>currentPlayer.radius+ball.radius+25)return;
    const tm=players.filter(p=>p.team===currentPlayer.team&&p!==currentPlayer&&!p.isGoalie&&!p.isEmergencyGoalkeeper);
    if(!tm.length)return;
    const toBall=Math.atan2(ball.y-currentPlayer.y,ball.x-currentPlayer.x);
    let best=null,bestScore=-Infinity;
    tm.forEach(t=>{
        const dx=t.x-currentPlayer.x,dy=t.y-currentPlayer.y,dist=Math.hypot(dx,dy);
        if(dist<30)return;
        const angleToTarget=Math.atan2(dy,dx);
        let angleDiff=Math.abs(toBall-angleToTarget);
        if(angleDiff>Math.PI)angleDiff=2*Math.PI-angleDiff;
        const inFront=angleDiff<Math.PI*0.5;
        const score=(inFront?100:0)-dist*0.5;
        if(score>bestScore){bestScore=score;best=t}
    });
    if(best){
        const a=Math.atan2(best.y-currentPlayer.y,best.x-currentPlayer.x);
        ball.vx=Math.cos(a)*12+currentPlayer.vx*.2;
        ball.vy=Math.sin(a)*12+currentPlayer.vy*.2;
        ball.vz=1.5
    }
}
function executePass(){
    if(!currentPlayer)return;
    const d=Math.hypot(currentPlayer.x-ball.x,currentPlayer.y-ball.y);
    if(d>currentPlayer.radius+ball.radius+20)return;
    const tm=players.filter(p=>p.team===currentPlayer.team&&p!==currentPlayer&&!p.isGoalie);
    let best=null,bs=-Infinity;
    tm.forEach(t=>{const dx=t.x-currentPlayer.x,dy=t.y-currentPlayer.y,dist=Math.hypot(dx,dy);
        const nx=dx/dist,ny=dy/dist,dot=Math.cos(currentPlayer.angle)*nx+Math.sin(currentPlayer.angle)*ny;
        if(dot>0){const s=dot*100-dist*.1;if(s>bs){bs=s;best=t}}});
    if(best){const a=Math.atan2(best.y-currentPlayer.y,best.x-currentPlayer.x);
        ball.vx=Math.cos(a)*10+currentPlayer.vx*.2;ball.vy=Math.sin(a)*10+currentPlayer.vy*.2;ball.vz=1}
    else if(currentPlayer)currentPlayer.kick(ball,.1);
}
function executeUserKick(pw){
    if(!currentPlayer)return;
    if(Math.hypot(currentPlayer.x-ball.x,currentPlayer.y-ball.y)<currentPlayer.radius+ball.radius+20)currentPlayer.kick(ball,pw);
}

window.addEventListener('keydown',e=>{if(gameState!=='playing'||isSimulation)return;const k=e.key.toLowerCase();keys[k]=true;if(e.key===' '&&!e.repeat)startAction()});
window.addEventListener('keyup',e=>{if(gameState!=='playing'||isSimulation)return;const k=e.key.toLowerCase();keys[k]=false;if(e.key===' ')endAction()});
canvas.addEventListener('touchstart',handleTouch);canvas.addEventListener('touchmove',handleTouch);
canvas.addEventListener('touchend',handleTouchEnd);canvas.addEventListener('touchcancel',handleTouchEnd);

function handleTouch(e){
    e.preventDefault();if(gameState!=='playing'||isSimulation)return;let jf=false,sf=false;
    for(let i=0;i<e.touches.length;i++){const t=e.touches[i];if(t.clientY<60)continue;
        if(t.clientX<width/2){if(!touchState.joystickActive){touchState.joystickActive=true;touchState.joystickOrigin={x:t.clientX,y:t.clientY}}
            touchState.joystickCurrent={x:t.clientX,y:t.clientY};
            const jdx=touchState.joystickCurrent.x-touchState.joystickOrigin.x;
            const jdy=touchState.joystickCurrent.y-touchState.joystickOrigin.y;
            const jdist=Math.hypot(jdx,jdy);
            touchState.joystickDir=jdist>10?{x:jdx/jdist,y:jdy/jdist}:{x:0,y:0};
            jf=true}
        else{
            const now=Date.now();
            const dx=t.clientX-lastTapX,dy=t.clientY-lastTapY,dist=Math.hypot(dx,dy);
            if(touchShootActive&&now-lastTapTime<300&&dist<50){
                executeShortTapPass();touchShootActive=false;lastTapTime=0;sf=false;
            } else {
                if(!touchShootActive){touchShootStart=now}
                touchShootActive=true;lastTapTime=now;lastTapX=t.clientX;lastTapY=t.clientY;
            }
            sf=true;
        }}
    if(!jf){touchState.joystickActive=false;touchState.joystickDir={x:0,y:0}}
    if(!sf&&touchShootActive){
        const holdTime=Date.now()-touchShootStart;
        if(holdTime<=500&&playerChangeCooldown<=0){
            const localPlayers=players.filter(p=>p.team===0&&!p.isGoalie);
            if(localPlayers.length){
                localPlayers.sort((a,b)=>{
                    const da=Math.hypot(a.x-ball.x,a.y-ball.y);
                    const db=Math.hypot(b.x-ball.x,b.y-ball.y);
                    return da-db;
                });
                const nearest=localPlayers[0];
                if(nearest&&nearest!==currentPlayer){
                    currentPlayer.isUser=false;currentPlayer=nearest;currentPlayer.isUser=true;playerChangeCooldown=15}
            }
        }
        touchShootActive=false;endAction()
    }
}
function handleTouchEnd(e){e.preventDefault();handleTouch(e)}

// ===== GAME LOOP =====
function updateGameState(){
    const upd=(tid,cc)=>{const fp=players.filter(p=>p.team===tid&&!p.isGoalie);if(!fp.length)return null;
        if(!cc)cc=fp[0];let b=cc,md=Math.hypot(cc.x-ball.x,cc.y-ball.y);
        let candidates=[b];
        for(const p of fp){
            if (p === cc) continue;
            const d=Math.hypot(p.x-ball.x,p.y-ball.y);
            const diff=d-md;
            if(diff<-20){md=d;b=p;candidates=[p]}
            else if(Math.abs(diff)<=20){candidates.push(p)}
        }
        if(candidates.length>1){
            if(candidates.includes(cc)) b = cc;
            else b=candidates[Math.floor(Math.random()*candidates.length)];
        }
        return b};
    if(isSimulation){
        teamA_closest=upd(0,teamA_closest);
        teamB_closest=upd(1,teamB_closest);
    }else{
        teamA_closest=upd(0,teamA_closest);teamB_closest=upd(1,teamB_closest);
        if(playerChangeCooldown>0)playerChangeCooldown--;

        players.forEach(p=>{
            if(p.isGoalie){p.isEmergencyGoalkeeper=false;return;}
            const hasGoalkeeper=players.some(g=>g.team===p.team&&g.isGoalie);
            if(hasGoalkeeper){p.isEmergencyGoalkeeper=false;return;}
            const goalX=p.team===0?0:width;
            const mostBack=players.filter(pl=>pl.team===p.team&&!pl.isGoalie)
                .reduce((best,pl)=>(p.team===0?pl.x<best.x:pl.x>best.x)?pl:best,players.filter(pl=>pl.team===p.team&&!pl.isGoalie)[0]);
            p.isEmergencyGoalkeeper=(p===mostBack&&Math.hypot(ball.x-goalX,ball.y-height/2)<width*0.4);
        });

        if(currentPlayer)currentPlayer.isUser=false;
        if(teamA_closest&&(!currentPlayer||teamA_closest!==currentPlayer)){
            const dCur=currentPlayer?Math.hypot(currentPlayer.x-ball.x,currentPlayer.y-ball.y):Infinity;
            const dNew=Math.hypot(teamA_closest.x-ball.x,teamA_closest.y-ball.y);
            if(dNew<dCur-20)currentPlayer=teamA_closest;
        }
        if(currentPlayer)currentPlayer.isUser=true;
    }
    let md=Infinity,co=null;
    for(const p of players){
        if(p.isGoalie||p.isEmergencyGoalkeeper)continue;
        if(!isSimulation&&p.team===0&&p!==currentPlayer)continue;
        let d=Math.hypot(p.x-ball.x,p.y-ball.y);
        if(p === currentPossessor) d -= 5;
        if(d<md){md=d;co=p}
    }
    currentPossessor=co&&(Math.hypot(co.x-ball.x,co.y-ball.y)<50)?co:null;
    if (currentPossessor && gameState === 'playing') {
        if (currentPossessor.team === 0) possessionStats.home++;
        else possessionStats.away++;
    }

    if (gameState === 'end_celebration') {
        const winner = score[0] > score[1] ? 0 : (score[1] > score[0] ? 1 : -1);
        if (winner !== -1) {
            // Punto central para que los ganadores se junten
            const targetX = winner === 0 ? width * 0.3 : width * 0.7;
            const targetY = height / 2;

            players.forEach((p, idx) => {
                if (p.team === winner && !p.isGoalie) {
                    let dx = targetX - p.x;
                    let dy = targetY - p.y;
                    let dist = Math.hypot(dx, dy);
                    if (dist > 40) {
                        p.vx += (dx / dist) * 1.5;
                        p.vy += (dy / dist) * 1.5;
                        p.angle = Math.atan2(dy, dx);
                    }
                    if (Math.random() < 0.01 && !p.speechBubble) {
                        p.speechBubble = "oe oe oe!";
                        setTimeout(() => p.speechBubble = null, 3000);
                    }
                } else if (p.team !== winner && !p.isGoalie) {
                    // Los perdedores se quedan quietos llorando
                    p.vx *= 0.5; p.vy *= 0.5;
                    if (Math.random() < 0.01 && !p.speechBubble) {
                        p.speechBubble = "buahhh";
                        setTimeout(() => p.speechBubble = null, 3000);
                    }
                }
                p.vx *= 0.85; p.vy *= 0.85;
                p.x += p.vx * gameConfig.gameSpeed;
                p.y += p.vy * gameConfig.gameSpeed;
            });
        }
        return;
    }
}

function drawField(){
    ctx.fillStyle='#2b8a3e';ctx.fillRect(0,0,width,height);
    
    // Gradas con cabezas
    const t = Date.now() * 0.005;
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(0,0,width,45); 
    
    const skinColors = ['#ffccaa', '#f1c27d', '#e0ac69', '#8d5524', '#c68642'];
    const scoredTeam = gameState === 'goal' ? (kickoffTeam === 1 ? 0 : 1) : -1;
    const endWinner = gameState === 'end_celebration' ? (score[0] > score[1] ? 0 : (score[1] > score[0] ? 1 : -1)) : -1;

    // Top stands (reducido a 2 filas)
    for(let row=0; row<2; row++) {
        const yBase = 12 + row * 15;
        for(let i=20 + (row%2)*15; i<width; i+=30) {
            const isLocal = i < width / 2;
            const teamIndex = isLocal ? 0 : 1;
            const isCelebrating = (scoredTeam === teamIndex) || (endWinner === teamIndex);
            
            const color = teamIndex === 0 
                ? (players.find(p=>p.team===0&&!p.isGoalie)?.shirtColor || (localTeamData ? mapColor(localTeamData.equipacion?.camiseta) : '#4dabf7')) 
                : (players.find(p=>p.team===1&&!p.isGoalie)?.shirtColor || (rivalTeamData ? mapColor(rivalTeamData.equipacion?.camiseta) : '#e53935'));
            const waveTop = isCelebrating ? (Math.sin(t*3 + i + row) > 0 ? -12 : 0) : (Math.sin(t + i + row) > 0 ? -4 : 0);
            const skinColor = skinColors[(i * 3 + row * 7) % skinColors.length];
            
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(i, yBase + 6 + waveTop, 7, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = skinColor;
            ctx.beginPath(); ctx.arc(i, yBase + waveTop, 5, 0, Math.PI*2); ctx.fill();
        }
    }

    // Bottom stands
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(0, height - 45, width, 45);
    for(let row=0; row<2; row++) {
        const yBase = height - 45 + 12 + row * 15;
        for(let i=20 + (row%2)*15; i<width; i+=30) {
            const teamIndex = i < width / 2 ? 0 : 1;
            const isCelebrating = (scoredTeam === teamIndex) || (endWinner === teamIndex);
            const color = teamIndex === 0 
                ? (players.find(p=>p.team===0&&!p.isGoalie)?.shirtColor || (localTeamData ? mapColor(localTeamData.equipacion?.camiseta) : '#4dabf7')) 
                : (players.find(p=>p.team===1&&!p.isGoalie)?.shirtColor || (rivalTeamData ? mapColor(rivalTeamData.equipacion?.camiseta) : '#e53935'));
            const waveTop = isCelebrating ? (Math.sin(t*3 + i + row) > 0 ? -12 : 0) : (Math.sin(t + i + row) > 0 ? -4 : 0);
            const skinColor = skinColors[(i * 3 + row * 7) % skinColors.length];
            
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(i, yBase + 6 + waveTop, 7, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = skinColor;
            ctx.beginPath(); ctx.arc(i, yBase + waveTop, 5, 0, Math.PI*2); ctx.fill();
        }
    }
    
    ctx.fillStyle='rgba(0,0,0,0.05)';for(let i=0;i<width;i+=60){if((i/60)%2===0)ctx.fillRect(i,0,60,height)}
    
    // Field lines
    const pitchTop = 45;
    const pitchBottom = height - 45;
    const pitchHeight = pitchBottom - pitchTop;
    
    ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=4;
    
    // Pitch border
    ctx.strokeRect(0, pitchTop, width, pitchHeight);
    
    // Corner arcs
    ctx.beginPath(); ctx.arc(0, pitchTop, 15, 0, Math.PI/2); ctx.stroke();
    ctx.beginPath(); ctx.arc(width, pitchTop, 15, Math.PI/2, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, pitchBottom, 15, -Math.PI/2, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(width, pitchBottom, 15, Math.PI, -Math.PI/2); ctx.stroke();

    ctx.beginPath();ctx.moveTo(width/2, pitchTop);ctx.lineTo(width/2, pitchBottom);ctx.stroke(); // Midline
    ctx.beginPath();ctx.arc(width/2, height/2, Math.min(width,height)*.15, 0, Math.PI*2);ctx.stroke(); // Center circle
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();ctx.arc(width/2,height/2,5,0,Math.PI*2);ctx.fill(); // Center dot

    const aw=width*.15,ah=height*.45;
    ctx.strokeRect(0,height/2-ah/2,aw,ah);ctx.strokeRect(width-aw,height/2-ah/2,aw,ah); // Penalty boxes
    
    // Áreas pequeñas
    const saw=width*.05,sah=height*.30;
    ctx.strokeRect(0,height/2-sah/2,saw,sah);ctx.strokeRect(width-saw,height/2-sah/2,saw,sah);
    
    // Puntos de penalti y medias lunas
    const pSpotX = aw * 0.75;
    const rArc = Math.min(width,height)*0.15;
    const theta = Math.acos(Math.max(-1, Math.min(1, (aw - pSpotX) / rArc)));
    
    ctx.beginPath(); ctx.arc(pSpotX, height/2, rArc, -theta, theta); ctx.stroke();
    ctx.beginPath(); ctx.arc(width - pSpotX, height/2, rArc, Math.PI - theta, Math.PI + theta); ctx.stroke();
    
    ctx.beginPath(); ctx.arc(pSpotX, height/2, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(width - pSpotX, height/2, 5, 0, Math.PI*2); ctx.fill();

    const gw=100,gd=30;
    
    // Función para dibujar portería con red
    const drawGoal = (x, y, w, h, isLeft) => {
        ctx.fillStyle='rgba(255,255,255,0.2)';
        ctx.fillRect(x, y, w, h);
        
        // Dibujar Red
        ctx.strokeStyle='rgba(255,255,255,0.7)';
        ctx.lineWidth=1;
        const step = 8;
        // Líneas horizontales
        for(let j=step; j<h; j+=step) {
            ctx.beginPath(); ctx.moveTo(x, y+j); ctx.lineTo(x+w, y+j); ctx.stroke();
        }
        // Líneas verticales/diagonales para efecto de red
        for(let i=step; i<w; i+=step) {
            ctx.beginPath(); ctx.moveTo(x+i, y); ctx.lineTo(x+i, y+h); ctx.stroke();
        }
        
        // Postes
        ctx.strokeStyle='#fff';
        ctx.lineWidth=5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if(isLeft) {
            ctx.moveTo(x+w, y); ctx.lineTo(x, y); ctx.lineTo(x, y+h); ctx.lineTo(x+w, y+h);
        } else {
            ctx.moveTo(x, y); ctx.lineTo(x+w, y); ctx.lineTo(x+w, y+h); ctx.lineTo(x, y+h);
        }
        ctx.stroke();
    };

    drawGoal(0, height/2-gw/2, gd, gw, true);
    drawGoal(width-gd, height/2-gw/2, gd, gw, false);
}

function drawTouchUI(){
    if(touchState.joystickActive){
        ctx.beginPath();ctx.arc(touchState.joystickOrigin.x,touchState.joystickOrigin.y,50,0,Math.PI*2);
        ctx.fillStyle='rgba(255,255,255,0.15)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.stroke();
        ctx.beginPath();ctx.arc(touchState.joystickCurrent.x,touchState.joystickCurrent.y,25,0,Math.PI*2);
        ctx.fillStyle='rgba(255,255,255,0.6)';ctx.fill();
    }
    if(isTouchDevice){
        // Botón de ACCIÓN eliminado por petición del usuario
    }
}

let entranceTimer = 0;
function update(){
    if(gameState==='entrance'){
        entranceTimer += gameConfig.gameSpeed;
        let allInPosition = true;
        players.forEach(p => {
            let tx, ty;
            let tm = players.filter(pl=>pl.team===p.team).sort((a,b)=>(b.isGoalie?1:0)-(a.isGoalie?1:0));
            let idx = tm.indexOf(p);
            
            if(entranceTimer < 200) {
                tx = width/2 + (p.team===0 ? -20 : 20);
                ty = height/2 + (idx - 3) * 35;
                p.angle = -Math.PI/2;
            } else if(entranceTimer < 300) {
                tx = width/2 + (p.team===0 ? -20 : 20);
                ty = height/2 + (idx - 3) * 35;
                p.angle = -Math.PI/2 + Math.sin(entranceTimer*0.1)*0.4;
            } else {
                tx = p.tacticX; ty = p.tacticY;
                if(p.team===0 && tx > width/2 && !p.isGoalie) tx = width/2 - 40;
                if(p.team===1 && tx < width/2 && !p.isGoalie) tx = width/2 + 40;
                
                const kickoffPlayer = players.find(kp => kp.team === kickoffTeam && !kp.isGoalie && !kp.isEmergencyGoalkeeper);
                if (p === kickoffPlayer) { tx = width/2; ty = height/2; }
            }
            
            const dx = tx - p.x; const dy = ty - p.y; const dist = Math.hypot(dx,dy);
            const speed = 2.5 * pixelScale;
            if(dist > 5){
                p.vx = (dx/dist)*speed; p.vy = (dy/dist)*speed; p.x+=p.vx; p.y+=p.vy;
                if(entranceTimer < 200 || entranceTimer >= 300) p.angle = Math.atan2(dy,dx);
                allInPosition = false;
            } else {
                p.vx = 0; p.vy = 0;
                if(entranceTimer >= 300) p.angle = p.team===0 ? 0 : Math.PI;
            }
        });
        
        for(let iter=0;iter<3;iter++){
            for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
                const p1=players[i],p2=players[j];let dx=p2.x-p1.x,dy=p2.y-p1.y,dist=Math.hypot(dx,dy),md=p1.radius+p2.radius;
                if(dist<md){if(dist===0){dx=Math.random()-0.5;dy=Math.random()-0.5;dist=Math.hypot(dx,dy);}
                const ov=(md-dist)/2,nx=dx/dist,ny=dy/dist;
                p1.x-=nx*ov;p1.y-=ny*ov;p2.x+=nx*ov;p2.y+=ny*ov;}
            }
        }
        
        if(entranceTimer > 350 && (allInPosition || entranceTimer > 800)) {
            positionForKickoff();
            gameState = 'countdown';
            countdownValue = 3;
            playWhistle();
            const cd = document.getElementById('countdown-display');
            if (cd) {
                cd.style.display = 'block'; 
                cd.textContent = '3';
            }
        }
        return;
    }
    
    if(gameState === 'goal') {
        if(goalScorer) {
            players.forEach(p => {
                if (p.team === goalScorer.team && p !== goalScorer && !p.isGoalie) {
                    let dx = goalScorer.x - p.x;
                    let dy = goalScorer.y - p.y;
                    let dist = Math.hypot(dx, dy);
                    if (dist > 15) {
                        p.vx += (dx / dist) * 2.5;
                        p.vy += (dy / dist) * 2.5;
                        p.angle = Math.atan2(dy, dx);
                    }
                    p.vx *= 0.85; p.vy *= 0.85;
                    p.x += p.vx * gameConfig.gameSpeed;
                    p.y += p.vy * gameConfig.gameSpeed;
                    const speed = Math.hypot(p.vx, p.vy);
                    if (speed > 0.1) p.walkPhase += speed * 0.4 * gameConfig.gameSpeed;
                }
            });
        }
        return;
    }
    
    if(gameState!=='playing')return;updateGameState();ball.update();players.forEach(p=>p.update(ball));
    for(let p of players){const dx=ball.x-p.x,dy=ball.y-p.y,dist=Math.hypot(dx,dy),md=p.radius+ball.radius;
        if(dist<md&&dist>0){const ov=md-dist,nx=dx/dist,ny=dy/dist;ball.x+=nx*ov*.85;ball.y+=ny*ov*.85;p.x-=nx*ov*.15;p.y-=ny*ov*.15;
            const rv=ball.vx-p.vx,rvy=ball.vy-p.vy,sp=rv*nx+rvy*ny;
            if(sp<0){
                const r=p===currentPossessor?.05:.6;
                ball.vx-=nx*sp*(1+r) + (Math.random()-0.5)*0.3;
                ball.vy-=ny*sp*(1+r) + (Math.random()-0.5)*0.3;
            }
        }
    }
    for(let iter=0;iter<3;iter++){
        for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
            const p1=players[i],p2=players[j];let dx=p2.x-p1.x,dy=p2.y-p1.y,dist=Math.hypot(dx,dy),md=p1.radius+p2.radius;
            if(dist<md){
                if(dist===0){dx=Math.random()-0.5;dy=Math.random()-0.5;dist=Math.hypot(dx,dy);}
                const ov=(md-dist)/2,nx=dx/dist,ny=dy/dist;
                
                // Evitar bloqueos frontales añadiendo un pequeño "empujón" lateral aleatorio
                const nudge = (Math.random() - 0.5) * 0.2;
                p1.x -= nx * ov + (ny * nudge);
                p1.y -= ny * ov - (nx * nudge);
                p2.x += nx * ov + (ny * nudge);
                p2.y += ny * ov - (nx * nudge);

                if(iter===0){
                    const kickBack = 2.0;
                    p1.vx -= nx * kickBack; p1.vy -= ny * kickBack;
                    p2.vx += nx * kickBack; p2.vy += ny * kickBack;
                }
            }
        }
    }
}

function draw(){
    ctx.clearRect(0,0,width,height);if(gameState==='idle')return;
    drawField();ball.draw(ctx);[...players].sort((a,b)=>a.y-b.y).forEach(p=>p.draw(ctx));drawTouchUI();
    if(gameState==='countdown'){
        const cd=document.getElementById('countdown-display');
        cd.style.display='block';cd.textContent=countdownValue>0?countdownValue:'¡YA!';
    }
    if(gameState==='playing'){
        const totalPoss = possessionStats.home + possessionStats.away;
        if (totalPoss > 0 && totalPoss % 10 === 0) {
            const homePct = Math.round((possessionStats.home / totalPoss) * 100);
            const awayPct = 100 - homePct;
            document.getElementById('possession-home').style.width = homePct + '%';
            document.getElementById('possession-away').style.width = awayPct + '%';
            document.getElementById('poss-text-home').textContent = homePct + '%';
            document.getElementById('poss-text-away').textContent = awayPct + '%';
        }
    }
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    
    // Calcular escala dinámica optimizada para PC y Tablet
    // Limitamos la escala en pantallas muy grandes para que no se vea "gigante"
    pixelScale = Math.max(1.0, Math.min(2.2, height / 450));
    
    // Actualizar objetos existentes si los hay
    if (ball) ball.reset();
    players.forEach(p => p.reset());
}
function loop(){update();draw();requestAnimationFrame(loop)}
window.addEventListener('resize',resize);resize();loop();
