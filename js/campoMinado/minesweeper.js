/**
 * CAMPO MINADO - Implementação em JavaScript
 * 
 * Este código implementa o jogo Campo Minado com as seguintes características:
 * - Diferentes níveis de dificuldade
 * - Geração de minas apenas após o primeiro clique
 * - Garantia de área segura no primeiro clique
 * - Interface responsiva
 */

// Aguarda o carregamento completo do DOM antes de executar o código
document.addEventListener('DOMContentLoaded', () => {
    // Variáveis de configuração do jogo
    let TAMANHO_TABULEIRO = 10;      // Tamanho padrão do tabuleiro (10x10)
    let NUMERO_MINAS = 15;            // Número padrão de minas
    let tabuleiro = [];               // Array que representa o tabuleiro lógico
    let minas = [];                   // Array com as posições das minas
    let reveladas = [];               // Array que controla quais células foram reveladas
    let bandeiras = [];               // Array que controla quais células foram marcadas com bandeira
    let jogoAcabou = false;           // Flag que indica se o jogo terminou
    let primeiroClique = true;         // Flag para identificar o primeiro clique do jogador

    // Elementos da interface
    const elementoTabuleiro = document.getElementById('board');
    const botaoReiniciar = document.getElementById('reset');
    const elementoMensagem = document.getElementById('message');
    const seletorDificuldade = document.getElementById('difficulty');

    // Event listeners
    botaoReiniciar.addEventListener('click', reiniciarJogo);
    seletorDificuldade.addEventListener('change', reiniciarJogo);

    /**
     * Reinicia o jogo com as configurações atuais
     */
    function reiniciarJogo() {
        // Configura o jogo baseado na dificuldade selecionada
        switch(seletorDificuldade.value) {
            case 'easy':
                TAMANHO_TABULEIRO = 8;
                NUMERO_MINAS = 10;
                break;
            case 'medium':
                TAMANHO_TABULEIRO = 10;
                NUMERO_MINAS = 15;
                break;
            case 'hard':
                TAMANHO_TABULEIRO = 12;
                NUMERO_MINAS = 25;
                break;
            default:
                TAMANHO_TABULEIRO = 10;
                NUMERO_MINAS = 15;
        }

        // Reinicia todas as variáveis do jogo
        tabuleiro = [];
        minas = [];
        reveladas = Array(TAMANHO_TABULEIRO * TAMANHO_TABULEIRO).fill(false);
        bandeiras = Array(TAMANHO_TABULEIRO * TAMANHO_TABULEIRO).fill(false);
        jogoAcabou = false;
        primeiroClique = true;
        elementoMensagem.textContent = '';

        // Inicializa o tabuleiro
        inicializarTabuleiro();
        renderizarTabuleiro();
    }

    /**
     * Inicializa o tabuleiro HTML e a estrutura de dados lógica
     */
    function inicializarTabuleiro() {
        // Limpa o tabuleiro anterior
        elementoTabuleiro.innerHTML = '';
        // Configura o grid CSS com o tamanho correto
        elementoTabuleiro.style.gridTemplateColumns = `repeat(${TAMANHO_TABULEIRO}, 30px)`;

        // Cria cada célula do tabuleiro
        for (let i = 0; i < TAMANHO_TABULEIRO * TAMANHO_TABULEIRO; i++) {
            const celula = document.createElement('div');
            celula.className = 'cell';
            celula.dataset.indice = i;  // Armazena o índice da célula como atributo
            
            // Adiciona os event listeners para clique esquerdo e direito
            celula.addEventListener('click', () => manipularCliqueCelula(i));
            celula.addEventListener('contextmenu', (e) => {
                e.preventDefault();  // Previne o menu de contexto padrão
                manipularCliqueDireito(i);
            });

            elementoTabuleiro.appendChild(celula);
            tabuleiro[i] = 0;  // Inicializa todas as células com 0 (sem minas ao redor)
        }
    }

    /**
     * Posiciona as minas no tabuleiro após o primeiro clique
     * @param {number} indicePrimeiroClique - Índice da célula do primeiro clique
     */
    function posicionarMinas(indicePrimeiroClique) {
        minas = [];
        let minasPosicionadas = 0;
        
        // Determina uma área segura ao redor do primeiro clique (células adjacentes)
        const zonaSegura = obterIndicesAdjacentes(indicePrimeiroClique);
        zonaSegura.push(indicePrimeiroClique);  // Inclui a própria célula clicada

        // Gera as minas aleatoriamente, evitando a área segura
        while (minasPosicionadas < NUMERO_MINAS) {
            const indiceAleatorio = Math.floor(Math.random() * TAMANHO_TABULEIRO * TAMANHO_TABULEIRO);
            
            // Verifica se a posição é válida para colocar uma mina
            if (!minas.includes(indiceAleatorio) && !zonaSegura.includes(indiceAleatorio)) {
                minas.push(indiceAleatorio);
                minasPosicionadas++;
            }
        }
        
        // Calcula os números para todas as células
        calcularNumeros();
    }

    /**
     * Obtém os índices das células adjacentes a uma determinada posição
     * @param {number} indice - Índice da célula central
     * @returns {Array} - Array com os índices das células adjacentes
     */
    function obterIndicesAdjacentes(indice) {
        const linha = Math.floor(indice / TAMANHO_TABULEIRO);
        const coluna = indice % TAMANHO_TABULEIRO;
        const adjacentes = [];
        
        // Verifica todas as 8 células ao redor (incluindo diagonais)
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                if (r === 0 && c === 0) continue;  // Ignora a própria célula
                
                const novaLinha = linha + r;
                const novaColuna = coluna + c;
                
                // Verifica se a posição está dentro dos limites do tabuleiro
                if (novaLinha >= 0 && novaLinha < TAMANHO_TABULEIRO && novaColuna >= 0 && novaColuna < TAMANHO_TABULEIRO) {
                    adjacentes.push(novaLinha * TAMANHO_TABULEIRO + novaColuna);
                }
            }
        }
        
        return adjacentes;
    }

    /**
     * Calcula os números que indicam quantas minas estão ao redor de cada célula
     */
    function calcularNumeros() {
        for (let i = 0; i < TAMANHO_TABULEIRO * TAMANHO_TABULEIRO; i++) {
            if (minas.includes(i)) {
                tabuleiro[i] = -1;  // -1 representa uma mina
                continue;
            }
            
            const linha = Math.floor(i / TAMANHO_TABULEIRO);
            const coluna = i % TAMANHO_TABULEIRO;
            let contagem = 0;
            
            // Conta quantas minas existem nas células adjacentes
            for (let r = -1; r <= 1; r++) {
                for (let c = -1; c <= 1; c++) {
                    if (r === 0 && c === 0) continue;
                    
                    const novaLinha = linha + r;
                    const novaColuna = coluna + c;
                    
                    if (novaLinha >= 0 && novaLinha < TAMANHO_TABULEIRO && novaColuna >= 0 && novaColuna < TAMANHO_TABULEIRO) {
                        const indiceVizinho = novaLinha * TAMANHO_TABULEIRO + novaColuna;
                        if (minas.includes(indiceVizinho)) {
                            contagem++;
                        }
                    }
                }
            }
            
            tabuleiro[i] = contagem;  // Armazena o número de minas vizinhas
        }
    }

    /**
     * Manipula o clique em uma célula
     * @param {number} indice - Índice da célula clicada
     */
    function manipularCliqueCelula(indice) {
        if (jogoAcabou || bandeiras[indice]) return;  // Ignora se o jogo acabou ou célula está marcada
        
        // Primeiro clique do jogo
        if (primeiroClique) {
            primeiroClique = false;
            posicionarMinas(indice);  // Gera as minas após o primeiro clique
            
            // Garante que o primeiro clique sempre revele uma área vazia
            if (tabuleiro[indice] !== 0) {
                ajustarTabuleiroParaPrimeiroClique(indice);  // Ajusta o tabuleiro se necessário
            }
            
            revelarCelulasAdjacentes(indice);  // Revela a área segura
            renderizarTabuleiro();
            return;
        }
        
        if (reveladas[indice]) return;  // Ignora células já reveladas
        
        reveladas[indice] = true;  // Marca a célula como revelada
        
        // Verifica se o jogador clicou em uma mina
        if (tabuleiro[indice] === -1) {
            jogoAcabou = true;
            revelarTodasMinas();  // Mostra todas as minas
            elementoMensagem.textContent = 'Game Over! Você perdeu.';
        } else if (tabuleiro[indice] === 0) {
            // Se for uma célula vazia, revela recursivamente as vizinhas
            revelarCelulasAdjacentes(indice);
        }
        
        verificarCondicaoVitoria();  // Verifica se o jogador venceu
        renderizarTabuleiro();
    }

    /**
     * Ajusta o tabuleiro para garantir que o primeiro clique seja em uma área vazia
     * @param {number} indice - Índice do primeiro clique
     */
    function ajustarTabuleiroParaPrimeiroClique(indice) {
        // Encontra minas adjacentes ao primeiro clique
        const minasAdjacentes = obterIndicesAdjacentes(indice).filter(i => minas.includes(i));
        
        // Remove essas minas
        minas = minas.filter(mina => !minasAdjacentes.includes(mina));
        
        // Adiciona novas minas em lugares seguros (não adjacentes ao primeiro clique)
        let minasParaAdicionar = minasAdjacentes.length;
        let adicionadas = 0;
        
        while (adicionadas < minasParaAdicionar) {
            const indiceAleatorio = Math.floor(Math.random() * TAMANHO_TABULEIRO * TAMANHO_TABULEIRO);
            
            // Verifica se a nova posição é segura
            const ehSegura = !obterIndicesAdjacentes(indice).includes(indiceAleatorio) && 
                          indiceAleatorio !== indice && 
                          !minas.includes(indiceAleatorio);
            
            if (ehSegura) {
                minas.push(indiceAleatorio);
                adicionadas++;
            }
        }
        
        // Recalcula os números após mover as minas
        calcularNumeros();
        
        // Garante que a célula clicada seja zero
        tabuleiro[indice] = 0;
    }

    /**
     * Manipula o clique com o botão direito (marcar/desmarcar bandeira)
     * @param {number} indice - Índice da célula clicada
     */
    function manipularCliqueDireito(indice) {
        if (jogoAcabou || reveladas[indice] || primeiroClique) return;  // Ignora em certas condições
        
        bandeiras[indice] = !bandeiras[indice];  // Alterna o estado da bandeira
        renderizarTabuleiro();
    }

    /**
     * Revela recursivamente as células adjacentes a uma célula vazia
     * @param {number} indice - Índice da célula inicial
     */
    function revelarCelulasAdjacentes(indice) {
        const linha = Math.floor(indice / TAMANHO_TABULEIRO);
        const coluna = indice % TAMANHO_TABULEIRO;
        
        // Verifica todas as 8 células ao redor
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                if (r === 0 && c === 0) continue;  // Ignora a célula central
                
                const novaLinha = linha + r;
                const novaColuna = coluna + c;
                
                // Verifica os limites do tabuleiro
                if (novaLinha >= 0 && novaLinha < TAMANHO_TABULEIRO && novaColuna >= 0 && novaColuna < TAMANHO_TABULEIRO) {
                    const indiceVizinho = novaLinha * TAMANHO_TABULEIRO + novaColuna;
                    
                    // Revela apenas células não reveladas e não marcadas
                    if (!reveladas[indiceVizinho] && !bandeiras[indiceVizinho]) {
                        reveladas[indiceVizinho] = true;
                        
                        // Se for outra célula vazia, continua a expansão
                        if (tabuleiro[indiceVizinho] === 0) {
                            revelarCelulasAdjacentes(indiceVizinho);
                        }
                    }
                }
            }
        }
    }

    /**
     * Revela todas as minas quando o jogador perde
     */
    function revelarTodasMinas() {
        minas.forEach(indice => {
            reveladas[indice] = true;  // Marca todas as minas como reveladas
        });
    }

    /**
     * Verifica se o jogador venceu o jogo
     */
    function verificarCondicaoVitoria() {
        // Calcula quantas células sem minas foram reveladas
        const celulasSemMinas = TAMANHO_TABULEIRO * TAMANHO_TABULEIRO - NUMERO_MINAS;
        let celulasReveladas = 0;
        
        for (let i = 0; i < reveladas.length; i++) {
            if (reveladas[i] && !minas.includes(i)) {
                celulasReveladas++;
            }
        }
        
        // Se todas as células seguras foram reveladas, o jogador venceu
        if (celulasReveladas === celulasSemMinas) {
            jogoAcabou = true;
            elementoMensagem.textContent = 'Parabéns! Você venceu!';
            // Marca automaticamente todas as minas com bandeiras
            bandeiras = bandeiras.map((bandeira, indice) => minas.includes(indice) ? true : bandeira);
        }
    }

    /**
     * Renderiza o tabuleiro na interface
     */
    function renderizarTabuleiro() {
        const celulas = document.querySelectorAll('.cell');
        
        celulas.forEach((celula, indice) => {
            celula.className = 'cell';  // Reseta as classes
            
            if (reveladas[indice]) {
                celula.classList.add('revealed');
                
                // Mostra mina ou número
                if (tabuleiro[indice] === -1) {
                    celula.classList.add('mine');
                    celula.textContent = '💣';
                } else if (tabuleiro[indice] > 0) {
                    celula.textContent = tabuleiro[indice];
                    // Cores diferentes para diferentes números
                    const cores = ['', 'blue', 'green', 'red', 'darkblue', 'brown', 'teal', 'black', 'gray'];
                    celula.style.color = cores[tabuleiro[indice]];
                }
            } else if (bandeiras[indice]) {
                celula.classList.add('flagged');
                celula.textContent = '🚩';
            } else {
                celula.textContent = '';  // Célula não revelada
            }
        });
    }

    // Inicia o jogo quando a página carrega
    reiniciarJogo();
});