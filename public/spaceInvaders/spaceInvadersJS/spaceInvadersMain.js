/**
 * Configurações globais do jogo.
 * Centraliza "números mágicos" para facilitar o balanceamento.
 * @constant {Object}
 */
const GAME_CONFIG = {
    PLAYER: { WIDTH: 50, HEIGHT: 20, SPEED: 8, COLOR: "#00FF00", START_LIVES: 3 },
    ENEMY: { WIDTH: 40, HEIGHT: 30, ROWS: 5, COLS: 10, PADDING: 20, COLORS: ["#FF0000", "#FF9900", "#FFFF00", "#00FF00", "#00FFFF"], SPEED_INCREASE: 0.9, DROP_DISTANCE: 20 },
    BULLET: { WIDTH: 5, HEIGHT: 15, SPEED: 10, COLOR: "#FFFF00", COOLDOWN: 125, MAX: 4 },
    GAME: { LEVEL_SCORE: 1000 }
};

/**
 * Representa um projétil no jogo.
 */
class Bullet {
    /**
     * Cria um novo projétil.
     * @param {number} x - Posição horizontal inicial.
     * @param {number} y - Posição vertical inicial.
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = GAME_CONFIG.BULLET.WIDTH;
        this.height = GAME_CONFIG.BULLET.HEIGHT;
        this.active = true;
    }

    /**
     * Atualiza a posição do projétil.
     */
    update() {
        this.y -= GAME_CONFIG.BULLET.SPEED;
        if (this.y < 0) this.active = false;
    }

    /**
     * Desenha o projétil no canvas.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.fillStyle = GAME_CONFIG.BULLET.COLOR;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

/**
 * Representa um inimigo alienígena.
 */
class Enemy {
    /**
     * Cria um inimigo.
     * @param {number} x
     * @param {number} y
     * @param {string} color
     * @param {number} points
     */
    constructor(x, y, color, points) {
        this.x = x;
        this.y = y;
        this.width = GAME_CONFIG.ENEMY.WIDTH;
        this.height = GAME_CONFIG.ENEMY.HEIGHT;
        this.color = color;
        this.points = points;
        this.isAlive = true;
    }

    /**
     * Desenha o inimigo se estiver vivo.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        if (!this.isAlive) return;
        ctx.fillStyle = this.color;

        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, Math.PI, 0);

        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.75, this.y + this.height - 10);
        ctx.lineTo(this.x + this.width * 0.5, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.25, this.y + this.height - 10);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();

        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.3, this.y + this.height * 0.4, 4, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.7, this.y + this.height * 0.4, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Representa a nave do jogador.
 */
class Player {
    /**
     * Inicializa o jogador.
     * @param {HTMLCanvasElement} canvas - Referência ao canvas para limites.
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.width = GAME_CONFIG.PLAYER.WIDTH;
        this.height = GAME_CONFIG.PLAYER.HEIGHT;
        this.resetPosition();

        this.lives = GAME_CONFIG.PLAYER.START_LIVES;
        this.lastShotTime = 0;
        this.bulletsActive = 0; // Contador simples para limitar tiros na tela

        // Estado de movimento
        this.isMovingLeft = false;
        this.isMovingRight = false;
    }

    resetPosition() {
        this.x = this.canvas.width / 2 - this.width / 2;
        this.y = this.canvas.height - this.height - 20;
    }

    /**
     * Processa input e atualiza posição.
     */
    update() {
        if (this.isMovingLeft && this.x > 0) {
            this.x -= GAME_CONFIG.PLAYER.SPEED;
        }
        if (this.isMovingRight && this.x < this.canvas.width - this.width) {
            this.x += GAME_CONFIG.PLAYER.SPEED;
        }
    }

    /**
     * Tenta disparar um projétil.
     * @returns {Bullet|null} Retorna o objeto Bullet se o tiro foi bem sucedido, ou null.
     */
    shoot() {
        const now = Date.now();
        if (now - this.lastShotTime < GAME_CONFIG.BULLET.COOLDOWN ||
            this.bulletsActive >= GAME_CONFIG.BULLET.MAX) {
            return null;
        }

        this.lastShotTime = now;
        this.bulletsActive++;
        // Centraliza o tiro na nave
        return new Bullet(this.x + this.width / 2 - GAME_CONFIG.BULLET.WIDTH / 2, this.y);
    }

    draw(ctx) {
        ctx.fillStyle = GAME_CONFIG.PLAYER.COLOR;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

/**
 * Gerenciador principal do jogo (Game Engine).
 */
class Game {
    /**
     * @param {HTMLCanvasElement} canvas 
     * @param {Object} uiElements
     */
    constructor(canvas, uiElements) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ui = uiElements;

        this.player = new Player(canvas);
        this.bullets = [];
        this.enemies = [];

        this.score = 0;
        this.level = 1;
        this.enemySpeed = 1;
        this.enemyDirection = 1;

        this.isGameOver = false;
        this.isPaused = false;
        this.animationId = null;

        this.bindEvents();
    }

    bindEvents() {
        this._keydownHandler = (e) => this.handleInput(e, true);
        this._keyupHandler = (e) => this.handleInput(e, false);

        document.addEventListener("keydown", this._keydownHandler);
        document.addEventListener("keyup", this._keyupHandler);
    }

    handleInput(e, isKeyDown) {
        const key = e.key.toLowerCase();

        if (this.isGameOver && isKeyDown && key === "r") {
            this.restart();
            return;
        }

        if (isKeyDown && (key === "p" || key === "escape")) {
            this.togglePause();

            const btn = document.getElementById('pauseBtn');
            btn.textContent = this.isPaused ? "Continuar" : "Pausar";
            return;
        }

        if (this.isPaused || this.isGameOver) return;

        switch (key) {
            case "arrowleft": case "a": this.player.isMovingLeft = isKeyDown; break;
            case "arrowright": case "d": this.player.isMovingRight = isKeyDown; break;
            case " ":
                if (isKeyDown) {
                    e.preventDefault();
                    const bullet = this.player.shoot();
                    if (bullet) this.bullets.push(bullet);
                }
                break;
        }
    }

    /**
     * Inicializa ou reinicia a grade de inimigos.
     */
    initEnemies() {
        this.enemies = [];
        const { COLS, ROWS, WIDTH, HEIGHT, PADDING, COLORS } = GAME_CONFIG.ENEMY;

        const totalWidth = COLS * WIDTH + (COLS - 1) * PADDING;
        const startX = (this.canvas.width - totalWidth) / 2;

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const x = startX + c * (WIDTH + PADDING);
                const y = 50 + r * (HEIGHT + PADDING);
                const color = COLORS[r % COLORS.length];
                const points = (ROWS - r) * 100;
                this.enemies.push(new Enemy(x, y, color, points));
            }
        }
    }

    /**
     * Loop principal de atualização lógica.
     */
    update() {
        if (this.isPaused || this.isGameOver) return;

        this.player.update();

        let moveDown = false;
        let activeEnemies = 0;

        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;
            activeEnemies++;

            enemy.x += this.enemySpeed * this.enemyDirection;

            if (enemy.x <= 0 || enemy.x + enemy.width >= this.canvas.width) {
                moveDown = true;
            }

            if (enemy.y + enemy.height >= this.player.y) {
                this.handlePlayerHit();
                return;
            }
        }

        if (moveDown) {
            this.enemyDirection *= -1;
            this.enemies.forEach(e => { if (e.isAlive) e.y += GAME_CONFIG.ENEMY.DROP_DISTANCE });
        }

        if (activeEnemies === 0) this.nextLevel();

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();

            if (!bullet.active) {
                this.bullets.splice(i, 1);
                this.player.bulletsActive--;
                continue;
            }

            for (const enemy of this.enemies) {
                if (enemy.isAlive && this.checkCollision(bullet, enemy)) {
                    enemy.isAlive = false;
                    bullet.active = false; 
                    this.addScore(enemy.points);
                    break;
                }
            }
        }
    }

    /**
     * Utilitário para detecção de colisão AABB (Axis-Aligned Bounding Box).
     */
    checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    handlePlayerHit() {
        this.player.lives--;
        this.updateUi();

        if (this.player.lives <= 0) {
            this.isGameOver = true;
            this.drawGameOver();
        } else {
            this.player.resetPosition();
            this.bullets = [];
            this.player.bulletsActive = 0;
            // Pequeno delay ou invencibilidade poderia ser adicionado aqui
        }
    }

    nextLevel() {
        this.level++;
        this.enemySpeed += GAME_CONFIG.ENEMY.SPEED_INCREASE;
        this.addScore(GAME_CONFIG.GAME.LEVEL_SCORE);
        this.initEnemies();
        this.updateUi();
    }

    addScore(points) {
        this.score += points;
        this.ui.scoreDisplay.textContent = `Score: ${this.score}`;
    }

    updateUi() {
        this.ui.levelDisplay.textContent = `Level: ${this.level}`;
        this.ui.livesDisplay.textContent = `Lives: ${this.player.lives}`;
    }

    /**
     * Renderização gráfica.
     */
    draw() {
        if (this.isPaused && !this.isGameOver) return;

        this.ctx.fillStyle = "#000020";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.player.draw(this.ctx);
        this.enemies.forEach(e => e.draw(this.ctx));
        this.bullets.forEach(b => b.draw(this.ctx));

        if (this.isGameOver) this.drawGameOver();
    }

    drawPauseScreen() {
        this.ctx.fillStyle = "rgba(0,0,0,0.7)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#FFF";
        this.ctx.font = "48px Orbitron, sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);
    }

    drawGameOver() {
        this.ctx.fillStyle = "rgba(0,0,0,0.8)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#F00";
        this.ctx.font = "48px Orbitron, sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2 - 50);
        this.ctx.fillStyle = "#FFF";
        this.ctx.font = "36px Orbitron, sans-serif";
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.font = "24px Orbitron, sans-serif";
        this.ctx.fillText("Press R to Restart", this.canvas.width / 2, this.canvas.height / 2 + 80);
    }

    togglePause() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            this.drawPauseScreen();
        } else {
            if (!this.animationId) {
                this.loop();
            }
        }
    }

    loop() {
        if (this.isGameOver) return;

        if (!this.isPaused) {
            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(() => this.loop());
        }
    }

    restart() {
        this.isGameOver = false;
        this.isPaused = false;
        this.score = 0;
        this.level = 1;
        this.enemySpeed = 1;
        this.enemyDirection = 1;
        this.bullets = [];
        this.player.lives = 3;
        this.player.resetPosition();
        this.player.bulletsActive = 0;

        this.updateUi();
        this.initEnemies();

        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.loop();
    }

    /**
     * Inicia o jogo pela primeira vez.
     */
    start() {
        this.isGameOver = false;
        this.isPaused = false;
        this.setupCanvasDimensions();
        this.initEnemies();
        this.updateUi();

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.loop();
    }

    setupCanvasDimensions() {
        const maxWidth = Math.min(window.innerWidth, 1000);
        const maxHeight = Math.min(window.innerHeight, 700);
        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight - 150;
        this.player.resetPosition();
    }

    loop() {
        if (this.isGameOver) return;
        this.update();
        if (!this.isPaused) {
            this.draw();
            this.animationId = requestAnimationFrame(() => this.loop());
        }
    }

    destroy() {
        this.isGameOver = true;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        document.removeEventListener("keydown", this._keydownHandler);
        document.removeEventListener("keyup", this._keyupHandler);
        console.log("Jogo destruído e eventos removidos.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-button');
    const lobbyContainer = document.getElementById('lobby-container');
    const gameScreen = document.getElementById('game-screen');
    const canvas = document.getElementById('game-canvas');

    const uiElements = {
        scoreDisplay: document.getElementById('score'),
        levelDisplay: document.getElementById('level'),
        livesDisplay: document.getElementById('lives')
    };

    let gameInstance = null;

    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const closeBtn = document.querySelector('.close-button');

    function showModal(title, bodyHtml) {
        modalTitle.textContent = title;
        modalBody.innerHTML = bodyHtml;
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
    }

    function hideModal() {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }

    closeBtn.addEventListener('click', hideModal);
    window.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });

    document.getElementById('instructionsBtn').addEventListener('click', () => {
        showModal("Instruções de Voo", `
            <div style="text-align: left; line-height: 1.6;">
                <p><strong>Objetivo:</strong> Defenda a Terra das ondas de invasores alienígenas!</p>
                <ul style="list-style: none; padding: 0;">
                    <li>⬅️ <strong>Setas / A-D:</strong> Mover Nave</li>
                    <li>🚀 <strong>Espaço:</strong> Disparar Laser</li>
                    <li>⏸️ <strong>P / ESC:</strong> Pausar Jogo</li>
                    <li>🔄 <strong>R:</strong> Reiniciar (após Game Over)</li>
                </ul>
            </div>`);
    });

    document.getElementById('exitBtm').addEventListener('click', () => {
        window.location.href = "index.html";
    });

    startButton.addEventListener('click', () => {
        startButton.blur();
        lobbyContainer.classList.add('hide');
        gameScreen.style.display = 'flex';

        if (gameInstance) {
            gameInstance.destroy();
        }

        gameInstance = new Game(canvas, uiElements);
        gameInstance.start();
        window.focus();
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        if (gameInstance) {
            gameInstance.destroy();
            gameInstance = null;
        }
        gameScreen.style.display = 'none';
        lobbyContainer.classList.remove('hide');
    });

    document.getElementById('pauseBtn').addEventListener('click', () => {
        if (gameInstance && !gameInstance.isGameOver) {
            gameInstance.togglePause();
            document.getElementById('pauseBtn').textContent = gameInstance.isPaused ? "▶️ Continuar" : "⏸️ Pausar";
        }
    });

    window.addEventListener('resize', () => {
        if (gameInstance) gameInstance.setupCanvasDimensions();
    });
});