// ============================================
// STAR BREAKER - Quebra-Tijolos Espacial (Campanha)
// ============================================

const CONFIG = {
    CANVAS_WIDTH: 1000,
    CANVAS_HEIGHT: 700,
    PADDLE: { WIDTH: 100, HEIGHT: 14, SPEED: 10, COLOR: '#00ffff' },
    BALL: { RADIUS: 7, SPEED: 7, COLOR: '#ffffff' },
    BRICK: {
        WIDTH: 52,
        HEIGHT: 18,
        PADDING: 4,
        OFFSET_TOP: 50,
        COLORS: ['#ff0055', '#ff6600', '#ffcc00', '#00ff88', '#00ccff', '#b100ff']
    },
    PARTICLE_COUNT: 8
};

// Limites máximos da grade para não encostar nas bordas ou no escudo
const MAX_ROWS = 14;
const MAX_COLS = 16;

let canvas, ctx;
let paddle;
let balls = [];
let bricks = [];
let particles = [];
let powerUps = [];
let score = 0;
let lives = 3;
let level = 1;

// Controle dinâmico da grade
let currentRows = 4;
let currentCols = 10;

let gameRunning = false;
let gamePaused = false;
let isVictory = false; // Flag para saber se ganhou o jogo
let animFrameId = null;

const keys = { left: false, right: false };

class Paddle {
    constructor() {
        this.width = CONFIG.PADDLE.WIDTH;
        this.height = CONFIG.PADDLE.HEIGHT;
        this.x = (CONFIG.CANVAS_WIDTH - this.width) / 2;
        this.y = CONFIG.CANVAS_HEIGHT - 35;
    }

    update() {
        if (keys.left && this.x > 0) this.x -= CONFIG.PADDLE.SPEED;
        if (keys.right && this.x + this.width < CONFIG.CANVAS_WIDTH) this.x += CONFIG.PADDLE.SPEED;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.PADDLE.COLOR;
        ctx.shadowColor = CONFIG.PADDLE.COLOR;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + 10, this.y + 2);
        ctx.lineTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width - 10, this.y + 2);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width - 10, this.y + this.height - 4);
        ctx.lineTo(this.x + 10, this.y + this.height - 4);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#b100ff';
        ctx.beginPath();
        ctx.roundRect(this.x + this.width / 2 - 15, this.y + this.height - 4, 30, 4, 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(this.x + 20, this.y + 4, this.width - 40, 2);
    }
}

class Ball {
    constructor(x, y, launched = false) {
        this.radius = CONFIG.BALL.RADIUS;
        this.x = x || (paddle ? paddle.x + paddle.width / 2 : CONFIG.CANVAS_WIDTH / 2);
        this.y = y || (paddle ? paddle.y - this.radius - 2 : CONFIG.CANVAS_HEIGHT - 55);
        this.launched = launched;

        const angle = (Math.random() * 80 + 50) * (Math.PI / 180);
        const speed = CONFIG.BALL.SPEED + (level - 1) * 0.4; // Fica mais rápido a cada level

        this.vx = speed * Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1);
        this.vy = -Math.abs(speed * Math.sin(angle));
        this.active = true;
    }

    update() {
        if (!this.launched) {
            this.x = paddle.x + paddle.width / 2;
            this.y = paddle.y - this.radius - 2;
            return;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Paredes
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.vx *= -1;
        } else if (this.x + this.radius >= CONFIG.CANVAS_WIDTH) {
            this.x = CONFIG.CANVAS_WIDTH - this.radius;
            this.vx *= -1;
        }

        // Teto
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.vy *= -1;
        }

        // Escudo (Paddle)
        if (
            this.vy > 0 &&
            this.y + this.radius >= paddle.y &&
            this.y - this.radius <= paddle.y + paddle.height &&
            this.x >= paddle.x &&
            this.x <= paddle.x + paddle.width
        ) {
            let hitPoint = this.x - (paddle.x + paddle.width / 2);
            hitPoint = hitPoint / (paddle.width / 2);

            const bounceAngle = hitPoint * (Math.PI / 3);

            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

            this.vx = speed * Math.sin(bounceAngle);
            this.vy = -speed * Math.cos(bounceAngle);

            if (Math.abs(this.vy) < 2) this.vy = -2;

            this.y = paddle.y - this.radius;
        }

        if (this.y - this.radius > CONFIG.CANVAS_HEIGHT) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.BALL.COLOR;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 30;
        this.height = 30;
        this.vy = 2.5;
        this.color = type === 5 ? '#00ff88' : '#ff00aa';
        this.active = true;
    }

    update() {
        this.y += this.vy;
        if (this.y > CONFIG.CANVAS_HEIGHT) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('x' + this.type, this.x + this.width / 2, this.y + 20);
        ctx.textAlign = 'start';
    }
}

class Brick {
    constructor(x, y, color, points) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.BRICK.WIDTH;
        this.height = CONFIG.BRICK.HEIGHT;
        this.color = color;
        this.points = points;
        this.alive = true;
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, this.height / 3);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = Math.random() * 0.04 + 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

function checkCollision(objA, objB) {
    const aX = objA.radius ? objA.x - objA.radius : objA.x;
    const aY = objA.radius ? objA.y - objA.radius : objA.y;
    const aW = objA.radius ? objA.radius * 2 : objA.width;
    const aH = objA.radius ? objA.radius * 2 : objA.height;

    return (
        aX + aW > objB.x &&
        aX < objB.x + objB.width &&
        aY + aH > objB.y &&
        aY < objB.y + objB.height
    );
}

function createBricks() {
    bricks = [];
    const offsetLeft = (CONFIG.CANVAS_WIDTH - (currentCols * (CONFIG.BRICK.WIDTH + CONFIG.BRICK.PADDING) - CONFIG.BRICK.PADDING)) / 2;

    for (let row = 0; row < currentRows; row++) {
        for (let col = 0; col < currentCols; col++) {
            const x = offsetLeft + col * (CONFIG.BRICK.WIDTH + CONFIG.BRICK.PADDING);
            const y = CONFIG.BRICK.OFFSET_TOP + row * (CONFIG.BRICK.HEIGHT + CONFIG.BRICK.PADDING);
            const color = CONFIG.BRICK.COLORS[row % CONFIG.BRICK.COLORS.length];
            const points = (currentRows - row) * 10;
            bricks.push(new Brick(x, y, color, points));
        }
    }
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function activatePowerUp(multiplier) {
    let startX = paddle.x + paddle.width / 2;
    let startY = paddle.y - 15;

    if (balls.length > 50) return;

    for (let i = 0; i < multiplier - 1; i++) {
        balls.push(new Ball(startX, startY, true));
    }
}

const stars = [];
for (let i = 0; i < 40; i++) {
    stars.push({
        x: Math.random() * CONFIG.CANVAS_WIDTH,
        y: Math.random() * CONFIG.CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1.5 + 0.5
    });
}

function updateHUD() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('lives').textContent = `Vidas: ${lives}`;
    document.getElementById('level').textContent = `Level: ${level}`;
}

function drawBackground() {
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    for (const star of stars) {
        if (gameRunning && !gamePaused && !isVictory) {
            star.y += star.speed;
        }
        if (star.y > CONFIG.CANVAS_HEIGHT) {
            star.y = 0;
            star.x = Math.random() * CONFIG.CANVAS_WIDTH;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.speed / 3})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawMessage(text, subtitle) {
    ctx.fillStyle = 'rgba(0, 5, 20, 0.8)';
    ctx.fillRect(0, CONFIG.CANVAS_HEIGHT / 2 - 60, CONFIG.CANVAS_WIDTH, 120);

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 32px Orbitron';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fillText(text, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 5);
    ctx.shadowBlur = 0;

    if (subtitle) {
        ctx.fillStyle = '#a0d0ff';
        ctx.font = '16px Orbitron';
        ctx.fillText(subtitle, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 30);
    }
    ctx.textAlign = 'start';
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animFrameId);
    drawBackground();
    bricks.forEach(b => b.draw(ctx));
    paddle.draw(ctx);
    drawMessage('GAME OVER', `Score final: ${score}  |  ESPAÇO para reiniciar`);
}

function victory() {
    isVictory = true;
    gameRunning = false;
    cancelAnimationFrame(animFrameId);
    drawBackground();
    paddle.draw(ctx);
    drawMessage('VITÓRIA TOTAL!', `Vocêl limpou todo o espaço! Score: ${score} | ESPAÇO para reiniciar`);
}

function nextLevel() {
    level++;

    currentRows = Math.min(currentRows + 2, MAX_ROWS);
    currentCols = Math.min(currentCols + 2, MAX_COLS);

    balls = [new Ball()];
    powerUps = [];
    createBricks();
    updateHUD();

    gameRunning = false;
    cancelAnimationFrame(animFrameId);
    drawBackground();
    bricks.forEach(b => b.draw(ctx));
    paddle.draw(ctx);
    balls.forEach(b => b.draw(ctx));
    drawMessage(`LEVEL ${level}`, 'Pressione ESPAÇO para continuar');
}

function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    currentRows = 4;
    currentCols = 10;
    particles = [];
    powerUps = [];
    paddle = new Paddle();
    balls = [new Ball()];
    createBricks();
    updateHUD();
    gameRunning = false;
    gamePaused = false;
    isVictory = false;
}

function gameLoop() {
    if (!gameRunning || gamePaused || isVictory) return;

    animFrameId = requestAnimationFrame(gameLoop);

    paddle.update();

    powerUps.forEach(p => {
        p.update();
        if (p.active && checkCollision(p, paddle)) {
            p.active = false;
            activatePowerUp(p.type);
        }
    });
    powerUps = powerUps.filter(p => p.active);

    balls.forEach(ball => {
        ball.update();
        for (const brick of bricks) {
            if (!brick.alive) continue;
            if (checkCollision(ball, brick)) {
                brick.alive = false;
                score += brick.points;
                updateHUD();
                spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);

                if (Math.random() < 0.25) {
                    const type = Math.random() < 0.8 ? 5 : 10;
                    powerUps.push(new PowerUp(brick.x + brick.width / 2 - 15, brick.y, type));
                }

                const prevY = ball.y - ball.vy;
                const hitFromTopOrBottom = prevY + ball.radius <= brick.y || prevY - ball.radius >= brick.y + brick.height;

                if (hitFromTopOrBottom) ball.vy *= -1;
                else ball.vx *= -1;

                break;
            }
        }
    });

    balls = balls.filter(ball => ball.active);

    if (balls.length === 0) {
        lives--;
        updateHUD();
        powerUps = [];
        if (lives <= 0) {
            gameOver();
            return;
        } else {
            balls = [new Ball()];
        }
    }

    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => p.update());

    if (bricks.every(b => !b.alive)) {
        if (currentRows >= MAX_ROWS && currentCols >= MAX_COLS) {
            victory();
        } else {
            nextLevel();
        }
        return;
    }

    drawBackground();
    bricks.forEach(b => b.draw(ctx));
    powerUps.forEach(p => p.draw(ctx));
    particles.forEach(p => p.draw(ctx));
    paddle.draw(ctx);
    balls.forEach(b => b.draw(ctx));
}

function setupControls() {
    // 1. Controles de Teclado (Pressionar)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;

        if (e.key === ' ' || e.key === 'Escape' || e.key === 'Enter' || e.key === 'p') {
            e.preventDefault();

            if (!gameRunning) {
                // Se o jogo acabou ou o cara venceu, zera para começar de novo
                if (lives <= 0 || isVictory) resetGame();
                gameRunning = true;
                if (e.key === ' ' || e.key === 'Enter') balls.forEach(b => b.launched = true);
                gameLoop();
            } else if (balls.some(b => !b.launched) && (e.key === ' ' || e.key === 'Enter')) {
                balls.forEach(b => b.launched = true);
            } else {
                gamePaused = !gamePaused;
                if (!gamePaused) gameLoop();
                else drawMessage('PAUSADO', 'Pressione ESPAÇO ou ESC para continuar');
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!gameRunning || gamePaused || isVictory) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        paddle.x = mouseX - paddle.width / 2;
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > CONFIG.CANVAS_WIDTH) paddle.x = CONFIG.CANVAS_WIDTH - paddle.width;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (!gameRunning) {
                if (lives <= 0 || isVictory) resetGame();
                gameRunning = true;
                balls.forEach(b => b.launched = true);
                gameLoop();
            } else if (balls.some(b => !b.launched)) {
                balls.forEach(b => b.launched = true);
            }
        }
    });
}

function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;

    resetGame();
    setupControls();

    drawBackground();
    bricks.forEach(b => b.draw(ctx));
    paddle.draw(ctx);
    balls.forEach(b => b.draw(ctx));
    drawMessage('STAR BREAKER', 'Pressione ESPAÇO para iniciar');
}

window.addEventListener('DOMContentLoaded', init);