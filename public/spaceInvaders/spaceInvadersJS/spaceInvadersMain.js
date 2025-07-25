document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const startButton = document.getElementById('start-button');
    const lobbyContainer = document.getElementById('lobby-container'); // Corrigido
    const gameScreen = document.getElementById('game-screen');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('score');
    const levelDisplay = document.getElementById('level');
    const livesDisplay = document.getElementById('lives');
    const pauseBtn = document.getElementById('pauseBtn');
    const backBtn = document.getElementById('backBtn');
    const briefingBtn = document.getElementById('briefingBtn');
    const highscoresBtn = document.getElementById('highscoresBtn');
    const instructionsBtn = document.getElementById('instructionsBtn');
    const levelMapBtn = document.getElementById('levelMapBtn');
    const modal = document.getElementById('aiModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const closeBtn = document.querySelector('.close-button');

    // Configuração do canvas
    function setupCanvas() {
        const maxWidth = Math.min(window.innerWidth, 1000);
        const maxHeight = Math.min(window.innerHeight, 700);
        canvas.width = maxWidth;
        canvas.height = maxHeight - 150;
        if (gameState) {
            gameState.player.x = canvas.width / 2 - gameState.player.width / 2;
            gameState.player.y = canvas.height - gameState.player.height - 20;
        }
    }

    // Constantes do jogo
    const GAME_CONFIG = {
        PLAYER: { WIDTH: 50, HEIGHT: 20, SPEED: 8, COLOR: "#00FF00", START_LIVES: 3 },
        ENEMY: { WIDTH: 40, HEIGHT: 30, ROWS: 5, COLS: 10, PADDING: 20, COLORS: ["#FF0000", "#FF9900", "#FFFF00", "#00FF00", "#00FFFF"], SPEED_INCREASE: 0.9, DROP_DISTANCE: 20 },
        BULLET: { WIDTH: 5, HEIGHT: 15, SPEED: 10, COLOR: "#FFFF00", COOLDOWN: 150, MAX: 3 },
        GAME: { FPS: 60, LEVEL_SCORE: 1000 }
    };

    let gameState = null;

    // Lógica principal do jogo (reset, initEnemies, update, draw, etc.)
    function resetGame() {
        if (gameState && gameState.animationId) cancelAnimationFrame(gameState.animationId);
        gameState = {
            player: { x: canvas.width / 2 - GAME_CONFIG.PLAYER.WIDTH / 2, y: canvas.height - GAME_CONFIG.PLAYER.HEIGHT - 20, width: GAME_CONFIG.PLAYER.WIDTH, height: GAME_CONFIG.PLAYER.HEIGHT, speed: GAME_CONFIG.PLAYER.SPEED, color: GAME_CONFIG.PLAYER.COLOR, isMovingLeft: false, isMovingRight: false, lives: GAME_CONFIG.PLAYER.START_LIVES, lastShot: 0, bulletsActive: 0 },
            enemies: [], bullets: [],
            enemyDirection: 1, enemySpeed: 1,
            score: 0, level: 1,
            gameOver: false, paused: false,
            animationId: null
        };
        updateScore(); updateLevel(); updateLives();
        initEnemies();
        gameLoop();
    }

    function initEnemies() {
        gameState.enemies = [];
        const startX = (canvas.width - (GAME_CONFIG.ENEMY.COLS * GAME_CONFIG.ENEMY.WIDTH + (GAME_CONFIG.ENEMY.COLS - 1) * GAME_CONFIG.ENEMY.PADDING)) / 2;
        for (let r = 0; r < GAME_CONFIG.ENEMY.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.ENEMY.COLS; c++) {
                gameState.enemies.push({ x: startX + c * (GAME_CONFIG.ENEMY.WIDTH + GAME_CONFIG.ENEMY.PADDING), y: 50 + r * (GAME_CONFIG.ENEMY.HEIGHT + GAME_CONFIG.ENEMY.PADDING), width: GAME_CONFIG.ENEMY.WIDTH, height: GAME_CONFIG.ENEMY.HEIGHT, color: GAME_CONFIG.ENEMY.COLORS[r % GAME_CONFIG.ENEMY.COLORS.length], isAlive: true, points: (GAME_CONFIG.ENEMY.ROWS - r) * 100 });
            }
        }
    }

    function handleKeyDown(e) {
        if (gameState.gameOver) { if (e.key.toLowerCase() === "r") resetGame(); return; }
        if (!gameState.paused) {
            switch (e.key.toLowerCase()) {
                case "arrowleft": case "a": gameState.player.isMovingLeft = true; break;
                case "arrowright": case "d": gameState.player.isMovingRight = true; break;
                case " ": shootBullet(); break;
            }
        }
        if (e.key.toLowerCase() === "p" || e.key.toLowerCase() === "escape") togglePause();
    }

    function handleKeyUp(e) {
        switch (e.key.toLowerCase()) {
            case "arrowleft": case "a": gameState.player.isMovingLeft = false; break;
            case "arrowright": case "d": gameState.player.isMovingRight = false; break;
        }
    }

    function setupControls() { document.addEventListener("keydown", handleKeyDown); document.addEventListener("keyup", handleKeyUp); }
    function removeControls() { document.removeEventListener("keydown", handleKeyDown); document.removeEventListener("keyup", handleKeyUp); }

    function shootBullet() {
        const now = Date.now();
        if (now - gameState.player.lastShot < GAME_CONFIG.BULLET.COOLDOWN || gameState.player.bulletsActive >= GAME_CONFIG.BULLET.MAX) return;
        gameState.bullets.push({ x: gameState.player.x + gameState.player.width / 2 - GAME_CONFIG.BULLET.WIDTH / 2, y: gameState.player.y, width: GAME_CONFIG.BULLET.WIDTH, height: GAME_CONFIG.BULLET.HEIGHT, color: GAME_CONFIG.BULLET.COLOR, speed: GAME_CONFIG.BULLET.SPEED });
        gameState.player.lastShot = now; gameState.player.bulletsActive++;
    }

    function update() {
        if (gameState.paused || gameState.gameOver) return;
        if (gameState.player.isMovingLeft && gameState.player.x > 0) gameState.player.x -= gameState.player.speed;
        if (gameState.player.isMovingRight && gameState.player.x < canvas.width - gameState.player.width) gameState.player.x += gameState.player.speed;
        let moveDown = false, anyEnemyAlive = false;
        for (const enemy of gameState.enemies) {
            if (!enemy.isAlive) continue;
            anyEnemyAlive = true; enemy.x += gameState.enemySpeed * gameState.enemyDirection;
            if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) moveDown = true;
            if (enemy.y + enemy.height >= gameState.player.y) { playerHit(); return; }
        }
        if (moveDown) { gameState.enemyDirection *= -1; for (const enemy of gameState.enemies) if (enemy.isAlive) enemy.y += GAME_CONFIG.ENEMY.DROP_DISTANCE; }
        for (let i = gameState.bullets.length - 1; i >= 0; i--) {
            const bullet = gameState.bullets[i]; bullet.y -= bullet.speed;
            if (bullet.y < 0) { gameState.bullets.splice(i, 1); gameState.player.bulletsActive--; continue; }
            for (const enemy of gameState.enemies) {
                if (enemy.isAlive && checkCollision(bullet, enemy)) {
                    enemy.isAlive = false; gameState.score += enemy.points; gameState.bullets.splice(i, 1);
                    gameState.player.bulletsActive--; updateScore(); break;
                }
            }
        }
        if (!anyEnemyAlive) nextLevel();
    }

    function checkCollision(o1, o2) { return o1.x < o2.x + o2.width && o1.x + o1.width > o2.x && o1.y < o2.y + o2.height && o1.y + o1.height > o2.y; }
    function playerHit() { gameState.player.lives--; updateLives(); if (gameState.player.lives <= 0) gameOver(); else { gameState.player.x = canvas.width / 2 - gameState.player.width / 2; gameState.player.y = canvas.height - gameState.player.height - 20; gameState.bullets = []; gameState.player.bulletsActive = 0; } }
    function nextLevel() { gameState.level++; gameState.enemySpeed += GAME_CONFIG.ENEMY.SPEED_INCREASE; gameState.score += GAME_CONFIG.GAME.LEVEL_SCORE; updateLevel(); updateScore(); initEnemies(); }
    function gameOver() { gameState.gameOver = true; cancelAnimationFrame(gameState.animationId); drawGameOver(); }
    function togglePause() { gameState.paused = !gameState.paused; if (gameState.paused) { cancelAnimationFrame(gameState.animationId); drawPauseScreen(); } else { gameLoop(); } }
    function updateScore() { scoreDisplay.textContent = `Score: ${gameState.score}`; }
    function updateLevel() { levelDisplay.textContent = `Level: ${gameState.level}`; }
    function updateLives() { livesDisplay.textContent = `Lives: ${gameState.player.lives}`; }

    function draw() {
        ctx.fillStyle = "#000020"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = gameState.player.color; ctx.fillRect(gameState.player.x, gameState.player.y, gameState.player.width, gameState.player.height);
        for (const e of gameState.enemies) if (e.isAlive) { ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, e.width, e.height); }
        for (const b of gameState.bullets) { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.width, b.height); }
    }
    function drawPauseScreen() { ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#FFF"; ctx.font = "48px Orbitron"; ctx.textAlign = "center"; ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2); }
    function drawGameOver() { ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#F00"; ctx.font = "48px Orbitron"; ctx.textAlign = "center"; ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 50); ctx.fillStyle = "#FFF"; ctx.font = "36px Orbitron"; ctx.fillText(`Final Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 20); ctx.font = "24px Orbitron"; ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 80); }

    function gameLoop() { if (gameState.gameOver) return; update(); draw(); if (!gameState.paused) gameState.animationId = requestAnimationFrame(gameLoop); }

    // Funções de controle de tela
    function startGame() {
        lobbyContainer.classList.add('hide'); // Usa classe para animação
        gameScreen.style.display = 'flex';
        setupCanvas(); setupControls(); resetGame();
    }
    
    function backToMenu() {
        if (gameState && gameState.animationId) { cancelAnimationFrame(gameState.animationId); gameState.gameOver = true; }
        removeControls();
        gameScreen.style.display = 'none';
        lobbyContainer.classList.remove('hide'); // Usa classe para animação
    }
    
    // --- Funções do Modal e IA ---
    function showModal(title, bodyHtml) {
        modalTitle.textContent = title;
        modalBody.innerHTML = bodyHtml;
        modal.style.display = 'flex';
    }

    async function callGemini(prompt) {
        showModal("Aguardando Transmissão...", '<div class="loader"></div>');
        const apiKey = window._GEMINI_API_KEY;
        if (!apiKey) { showModal("Erro", "Chave de API não encontrada."); return; }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const result = await response.json();
            const text = result.candidates[0].content.parts[0].text;
            showModal("Instruções da Missão", `<p>${text}</p>`);
        } catch (error) {
            console.error("Falha na chamada da API Gemini:", error);
            showModal("Falha na Transmissão", `<p>Erro: ${error.message}.</p>`);
        }
    }
    
    function getMissionBriefing() {
        const prompt = "Você é um comandante de frota espacial grisalho. Escreva um briefing de missão curto e dramático, de um parágrafo, para um piloto prestes a enfrentar uma espécie alienígena insetóide implacável em um jogo de tiro clássico de arcade. O tom deve ser urgente e épico. Não use markdown.";
        callGemini(prompt);
    }

    // Event listeners
    startButton.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    backBtn.addEventListener('click', backToMenu);
    briefingBtn.addEventListener('click', getMissionBriefing);
    
    highscoresBtn.addEventListener('click', () => {
        showModal("Recordes", "<p>Funcionalidade em desenvolvimento!</p>");
    });

    instructionsBtn.addEventListener('click', () => {
        showModal("Instruções", `
            <p><strong>Controles:</strong></p>
            <ul>
                <li><strong>← → ou A/D:</strong> Mover a nave</li>
                <li><strong>ESPAÇO:</strong> Atirar</li>
                <li><strong>P ou ESC:</strong> Pausar</li>
                <li><strong>R:</strong> Reiniciar (após Game Over)</li>
            </ul>
            <p><strong>Objetivo:</strong> Destrua todos os alienígenas para avançar de nível.</p>
        `);
    });
    
    levelMapBtn.addEventListener('click', () => {
        showModal("Mapa de Níveis", `
            <p><strong>Progressão:</strong></p>
            <ul>
                <li><strong>Níveis 1-5:</strong> Batedores</li>
                <li><strong>Níveis 6-10:</strong> Caças</li>
                <li><strong>Níveis 11-15:</strong> Bombardeiros</li>
                <li><strong>Níveis 16+:</strong> Armada Alienígena</li>
            </ul>
        `);
    });

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });
    
    window.addEventListener('resize', setupCanvas);
    setupCanvas();
});