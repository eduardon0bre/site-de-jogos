document.addEventListener('DOMContentLoaded', () => {
    // Configurações iniciais
    let BOARD_SIZE = 17;
    let NUM_MINES = 40;

    // Variáveis de estado do jogo
    let board = [];
    let mines = [];
    let revealed = [];
    let flagged = [];
    let gameOver = false;
    let firstClick = true;
    let timer;
    let seconds = 0;

    // Elementos do DOM
    const boardElement = document.getElementById('board');
    const resetButton = document.getElementById('reset');
    const difficultySelect = document.getElementById('difficulty');
    const minesCounter = document.querySelector('.mines-counter');
    const timerDisplay = document.querySelector('.timer');
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    const modalTime = document.getElementById('modal-time');
    const playAgainButton = document.getElementById('play-again');

    // Event Listeners
    resetButton.addEventListener('click', resetGame);
    difficultySelect.addEventListener('change', resetGame);
    playAgainButton.addEventListener('click', resetGame);

    function resetGame() {
        hideModal();
        gameOver = true; // Impede cliques durante a inicialização

        // Define dificuldade
        switch (difficultySelect.value) {
            case 'easy': BOARD_SIZE = 11; NUM_MINES = 20; break;
            case 'medium': BOARD_SIZE = 17; NUM_MINES = 40; break;
            case 'hard': BOARD_SIZE = 21; NUM_MINES = 99; break;
        }

        // Reseta o estado
        board = Array(BOARD_SIZE * BOARD_SIZE).fill(0);
        mines = [];
        revealed = Array(BOARD_SIZE * BOARD_SIZE).fill(false);
        flagged = Array(BOARD_SIZE * BOARD_SIZE).fill(false);
        firstClick = true;
        seconds = 0;

        // Reseta o timer e contadores
        clearInterval(timer);
        updateTimer();
        updateMinesCounter();

        initializeBoard();
        renderBoard();
        gameOver = false; // Permite cliques após tudo pronto
    }

    function initializeBoard() {
        boardElement.innerHTML = '';
        boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 32px)`;
        for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.addEventListener('click', () => handleCellClick(i));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(i);
            });
            boardElement.appendChild(cell);
        }
    }

    // Função principal de clique na célula
    function handleCellClick(index) {
        if (gameOver || flagged[index]) return;

        // Se a célula já foi revelada, tenta o "Chord-Clicking"
        if (revealed[index]) {
            handleChordClick(index);
            return;
        }

        if (firstClick) {
            firstClick = false;
            placeMines(index);
            calculateNumbers();
            startTimer();
        }

        revealed[index] = true;

        if (board[index] === -1) {
            handleGameOver(false); // Perdeu
        } else if (board[index] === 0) {
            revealAdjacentCells(index);
        }

        if (!gameOver) {
            checkWinCondition();
        }
        renderBoard();
    }

    // Lógica para clicar em um número revelado e abrir vizinhos
    function handleChordClick(index) {
        if (board[index] <= 0) return;
        const adjacent = getAdjacentIndexes(index);
        const flaggedCount = adjacent.filter(i => flagged[i]).length;

        if (flaggedCount === board[index]) {
            adjacent.forEach(i => {
                if (!revealed[i] && !flagged[i]) {
                    handleCellClick(i);
                }
            });
        }
    }

    function handleRightClick(index) {
        if (gameOver || revealed[index]) return;

        flagged[index] = !flagged[index];
        updateMinesCounter();
        renderBoard();
    }

    function placeMines(firstClickIndex) {
        mines = [];
        const safeZone = getAdjacentIndexes(firstClickIndex);
        safeZone.push(firstClickIndex);

        let availableCells = [];
        for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
            if (!safeZone.includes(i)) {
                availableCells.push(i);
            }
        }

        for (let m = 0; m < NUM_MINES; m++) {
            if (availableCells.length === 0) break; // Evita loop infinito se não houver células
            const randomIndex = Math.floor(Math.random() * availableCells.length);
            const mineIndex = availableCells.splice(randomIndex, 1)[0];
            mines.push(mineIndex);
            board[mineIndex] = -1;
        }
    }

    function calculateNumbers() {
        for (let i = 0; i < board.length; i++) {
            if (board[i] === -1) continue;
            const adjacentMines = getAdjacentIndexes(i).filter(adj => mines.includes(adj)).length;
            board[i] = adjacentMines;
        }
    }

    function revealAdjacentCells(index) {
        const toReveal = [index];
        const processed = new Set([index]);

        while (toReveal.length > 0) {
            const current = toReveal.shift();

            if (board[current] === 0) {
                getAdjacentIndexes(current).forEach(adj => {
                    if (!revealed[adj] && !flagged[adj] && !processed.has(adj)) {
                        revealed[adj] = true;
                        processed.add(adj);
                        if (board[adj] === 0) {
                            toReveal.push(adj);
                        }
                    }
                });
            }
        }
    }

    function checkWinCondition() {
        const nonMineCells = BOARD_SIZE * BOARD_SIZE - NUM_MINES;
        // Conta quantas células não-mina foram reveladas
        let revealedSafeCount = 0;
        for (let i = 0; i < revealed.length; i++) {
            if (revealed[i] && board[i] !== -1) {
                revealedSafeCount++;
            }
        }

        if (revealedSafeCount === nonMineCells) {
            handleGameOver(true);
        }
    }

    function handleGameOver(isWin) {
        if (gameOver) return; // Evita que a função seja chamada múltiplas vezes
        gameOver = true;
        clearInterval(timer);

        if (isWin) {
            showModal('Você Venceu!', `Seu tempo foi: ${seconds} segundos`);
            // Coloca bandeira em todas as minas restantes
            mines.forEach(index => {
                if (!flagged[index]) flagged[index] = true;
            });
            updateMinesCounter();
        } else {
            showModal('Você Perdeu!', 'Você clicou em uma mina.');
            // Revela todas as minas
            mines.forEach(index => {
                if (!flagged[index]) revealed[index] = true;
            });
        }
        renderBoard(); // Renderiza uma última vez para mostrar o resultado final
    }

    function renderBoard() {
        const cells = boardElement.children;
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            cell.className = 'cell'; // Reseta as classes para evitar acúmulo
            cell.textContent = '';

            if (revealed[i]) {
                cell.classList.add('revealed');
                if (board[i] === -1) {
                    cell.classList.add('mine');
                    cell.textContent = '💣';
                } else if (board[i] > 0) {
                    cell.textContent = board[i];
                    cell.classList.add(`number-${board[i]}`); // Usa classe CSS para a cor
                }
            } else if (flagged[i]) {
                cell.classList.add('flagged');
                cell.textContent = '🚩';
            }
        }
    }

    // Funções utilitárias
    function getAdjacentIndexes(index) {
        const adjacent = [];
        const row = Math.floor(index / BOARD_SIZE);
        const col = index % BOARD_SIZE;
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                if (r === 0 && c === 0) continue;
                const newRow = row + r;
                const newCol = col + c;
                if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
                    adjacent.push(newRow * BOARD_SIZE + newCol);
                }
            }
        }
        return adjacent;
    }

    function startTimer() {
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
            seconds++;
            updateTimer();
        }, 1000);
    }

    function updateTimer() { timerDisplay.textContent = `⏳ ${seconds}`; }

    function updateMinesCounter() {
        const flagsPlaced = flagged.filter(f => f).length;
        minesCounter.textContent = `💣 ${NUM_MINES - flagsPlaced}`;
    }

    function showModal(message, timeText) {
        modalMessage.textContent = message;
        modalTime.textContent = timeText;
        modal.classList.remove('hidden');
    }

    function hideModal() {
        modal.classList.add('hidden');
    }

    resetGame();
});