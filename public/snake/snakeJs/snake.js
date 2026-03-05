/**
 * Configurações Principais do Jogo
 */
const CONFIG = {
    GRID_SIZE: 20,
    GAME_SPEED: 120,
    CANVAS_SIZE: 400
};

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.highScore = localStorage.getItem('cyberSnakeHighScore') || 0;
        this.highScoreElement.textContent = `High Score: ${this.highScore}`;

        this.bindEvents();
        this.reset();
    }

    reset() {
        this.snake = [
            { x: 200, y: 200 },
            { x: 180, y: 200 },
            { x: 160, y: 200 }
        ];

        this.dx = CONFIG.GRID_SIZE;
        this.dy = 0;
        this.moveQueue = [];

        this.score = 0;
        this.updateScore();
        this.placeFood();

        this.isPaused = true;
        this.isGameOver = false;
        this.isVictory = false;
        if (this.gameLoopTimeout) clearTimeout(this.gameLoopTimeout);
        this.draw();
        this.drawMessage("PRESSIONE ESPAÇO PARA INICIAR");
    }

    placeFood() {
        this.food = {
            x: Math.floor(Math.random() * (CONFIG.CANVAS_SIZE / CONFIG.GRID_SIZE)) * CONFIG.GRID_SIZE,
            y: Math.floor(Math.random() * (CONFIG.CANVAS_SIZE / CONFIG.GRID_SIZE)) * CONFIG.GRID_SIZE
        };

        for (let part of this.snake) {
            if (part.x === this.food.x && part.y === this.food.y) {
                this.placeFood();
                return;
            }
        }
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.key === 'Enter' || e.key === 'Escape' || e.key === 'p') {
                e.preventDefault();
                if (this.isGameOver || this.isVictory) {
                    this.reset();
                    this.isPaused = false;
                    this.loop();
                } else {
                    this.isPaused = !this.isPaused;
                    if (!this.isPaused) this.loop();
                    else this.drawMessage("PAUSADO");
                }
                return;
            }

            if (this.isPaused) return;

            const key = e.key.toLowerCase();

            let lastMove = this.moveQueue.length > 0
                ? this.moveQueue[this.moveQueue.length - 1]
                : { dx: this.dx, dy: this.dy };

            let newDx = lastMove.dx;
            let newDy = lastMove.dy;

            if ((key === 'arrowleft' || key === 'a') && lastMove.dx === 0) {
                newDx = -CONFIG.GRID_SIZE; newDy = 0;
            } else if ((key === 'arrowup' || key === 'w') && lastMove.dy === 0) {
                newDx = 0; newDy = -CONFIG.GRID_SIZE;
            } else if ((key === 'arrowright' || key === 'd') && lastMove.dx === 0) {
                newDx = CONFIG.GRID_SIZE; newDy = 0;
            } else if ((key === 'arrowdown' || key === 's') && lastMove.dy === 0) {
                newDx = 0; newDy = CONFIG.GRID_SIZE;
            }

            if ((newDx !== lastMove.dx || newDy !== lastMove.dy) && this.moveQueue.length < 2) {
                this.moveQueue.push({ dx: newDx, dy: newDy });
            }
        });
    }

    update() {
        if (this.moveQueue.length > 0) {
            const nextMove = this.moveQueue.shift();
            this.dx = nextMove.dx;
            this.dy = nextMove.dy;
        }

        const head = {
            x: this.snake[0].x + this.dx,
            y: this.snake[0].y + this.dy
        };

        if (head.x < 0 || head.x >= CONFIG.CANVAS_SIZE ||
            head.y < 0 || head.y >= CONFIG.CANVAS_SIZE) {
            this.gameOver();
            return;
        }

        for (let part of this.snake) {
            if (head.x === part.x && head.y === part.y) {
                this.gameOver();
                return;
            }
        }

        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScore();

            const maxCells = (CONFIG.CANVAS_SIZE / CONFIG.GRID_SIZE) * (CONFIG.CANVAS_SIZE / CONFIG.GRID_SIZE);
            if (this.snake.length === maxCells) {
                this.victory();
                return;
            }

            this.placeFood();
        } else {
            this.snake.pop();
        }
    }
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const cx = this.food.x + CONFIG.GRID_SIZE / 2;
        const cy = this.food.y + CONFIG.GRID_SIZE / 2;
        const radius = (CONFIG.GRID_SIZE / 2) - 2;

        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = "#ff0000";
        this.ctx.fillStyle = "#ff0000";
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = "#00ff00";
        this.ctx.beginPath();
        this.ctx.ellipse(cx + 2, cy - radius, 4, 2, -Math.PI / 4, 0, Math.PI * 2);
        this.ctx.fill();

        this.snake.forEach((part, index) => {
            if (index === 0) {
                this.ctx.shadowBlur = 10;
                this.ctx.fillStyle = "#00a2ff";
                this.ctx.shadowColor = "#ffffff";
                this.ctx.fillRect(part.x + 1, part.y + 1, CONFIG.GRID_SIZE - 2, CONFIG.GRID_SIZE - 2);

                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = "#000000";

                let eye1X, eye1Y, eye2X, eye2Y;
                const eyeSize = 4;
                const offset = 3;

                if (this.dx > 0) {
                    eye1X = part.x + CONFIG.GRID_SIZE - offset - eyeSize;
                    eye1Y = part.y + offset;
                    eye2X = part.x + CONFIG.GRID_SIZE - offset - eyeSize;
                    eye2Y = part.y + CONFIG.GRID_SIZE - offset - eyeSize;
                } else if (this.dx < 0) {
                    eye1X = part.x + offset;
                    eye1Y = part.y + offset;
                    eye2X = part.x + offset;
                    eye2Y = part.y + CONFIG.GRID_SIZE - offset - eyeSize;
                } else if (this.dy < 0) {
                    eye1X = part.x + offset;
                    eye1Y = part.y + offset;
                    eye2X = part.x + CONFIG.GRID_SIZE - offset - eyeSize;
                    eye2Y = part.y + offset;
                } else {
                    eye1X = part.x + offset;
                    eye1Y = part.y + CONFIG.GRID_SIZE - offset - eyeSize;
                    eye2X = part.x + CONFIG.GRID_SIZE - offset - eyeSize;
                    eye2Y = part.y + CONFIG.GRID_SIZE - offset - eyeSize;
                }

                this.ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
                this.ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);

            } else {
                this.ctx.shadowBlur = 10;
                this.ctx.fillStyle = "#00ffff";
                this.ctx.shadowColor = "#00ffff";
                this.ctx.fillRect(part.x + 1, part.y + 1, CONFIG.GRID_SIZE - 2, CONFIG.GRID_SIZE - 2);
            }
        });

        this.ctx.shadowBlur = 0;
    }

    drawMessage(text) {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "18px 'Courier New', Courier, monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    }

    updateScore() {
        if (this.scoreElement) this.scoreElement.textContent = `Score: ${this.score}`;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            if (this.highScoreElement) this.highScoreElement.textContent = `High Score: ${this.highScore}`;
            localStorage.setItem('cyberSnakeHighScore', this.highScore);
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.drawMessage("GAME OVER - ESPAÇO PARA REINICIAR");
    }

    victory() {
        this.isVictory = true;
        this.ctx.fillStyle = "rgba(0, 0, 50, 0.8)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = "#00ffff";
        this.ctx.font = "22px 'Orbitron', sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText("VITÓRIA TOTAL!", this.canvas.width / 2, this.canvas.height / 2 - 20);

        this.ctx.fillStyle = "#fff";
        this.ctx.font = "14px 'Orbitron', sans-serif";
        this.ctx.fillText("Espaço para jogar novamente", this.canvas.width / 2, this.canvas.height / 2 + 20);
    }

    loop() {
        if (this.isPaused || this.isGameOver || this.isVictory) return;

        this.update();
        if (!this.isGameOver && !this.isVictory) {
            this.draw();
            this.gameLoopTimeout = setTimeout(() => this.loop(), CONFIG.GAME_SPEED);
        }
    }
}

window.onload = () => {
    new Game();
};