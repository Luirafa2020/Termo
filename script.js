document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do DOM ---
    const gameBoard = document.getElementById('game-board');
    const messageArea = document.getElementById('message-area');
    const resetButton = document.getElementById('reset-button');
    const keyboardContainer = document.getElementById('keyboard');
    const loadingMessage = document.getElementById('loading-message');

    // --- Variáveis de Estado ---
    const NUM_TENTATIVAS = 6;
    const TAMANHO_PALAVRA = 5;
    let palavraSecreta = ''; // Armazenará a palavra COM acento, em MAIÚSCULAS
    let currentRowIndex = 0;
    let currentLetterIndex = 0;
    let jogoAcabou = false;
    let boardState = Array(NUM_TENTATIVAS).fill(null).map(() => Array(TAMANHO_PALAVRA).fill(''));
    let letterStatus = {};

    // *** NOVAS ESTRUTURAS DE DADOS PARA ACENTOS ***
    // Guarda TODAS as palavras válidas COM acento (lowercase)
    let listaPalavrasValidasComAcento = new Set();
    // Mapeia versão SEM acento para versão COM acento (lowercase)
    let mapaSemAcentoParaComAcento = new Map();
    // Guarda palavras de 5 letras COM acento para sorteio (lowercase)
    let listaPalavrasPossiveisSecreta = [];

    // --- Funções Auxiliares ---

    /**
     * Remove acentos de uma string.
     * @param {string} str A string para normalizar.
     * @returns {string} A string sem acentos.
     */
    function removerAcentos(str) {
        if (str === null || typeof str === 'undefined') {
             return '';
        }
        // NFD: Normalization Form Canonical Decomposition
        // \p{Diacritic}: Regex Unicode para marcas diacríticas (acentos)
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // --- Funções Principais ---

    /**
     * Carrega e processa o arquivo palavras_com_acento.txt.
     * Popula as estruturas de dados para validação e sorteio.
     */
    async function carregarPalavras() {
        loadingMessage.style.display = 'block';
        gameBoard.style.display = 'none';
        keyboardContainer.style.display = 'none';
        messageArea.textContent = '';

        try {
            // Carrega apenas o arquivo com acentos
            const response = await fetch('palavras_com_acento.txt');
            if (!response.ok) {
                throw new Error(`Erro ao carregar palavras_com_acento.txt: ${response.statusText} (Status: ${response.status})`);
            }
            const text = await response.text();
            const todasPalavras = text.split('\n');

            todasPalavras.forEach(palavra => {
                const palavraComAcento = palavra.trim().toLowerCase();

                if (palavraComAcento.length > 0) {
                    // Adiciona a versão COM acento à lista de válidas
                    listaPalavrasValidasComAcento.add(palavraComAcento);

                    // Cria a versão SEM acento
                    const palavraSemAcento = removerAcentos(palavraComAcento);

                    // Se forem diferentes, cria o mapeamento
                    if (palavraComAcento !== palavraSemAcento) {
                        // Mapeia sem acento -> com acento
                        mapaSemAcentoParaComAcento.set(palavraSemAcento, palavraComAcento);
                         // Adiciona também a versão sem acento como válida,
                         // caso a pessoa digite exatamente a versão sem acento de uma palavra
                         // que originalmente não tem acento mas coincide com uma que teria.
                         // Ex: 'para' (verbo) vs 'pará' (estado) - queremos que 'para' seja válido.
                         // listaPalavrasValidasComAcento.add(palavraSemAcento);
                         // Decisão: A validação principal vai checar a lista COM acento.
                         // O mapa serve para CORRIGIR a entrada do usuário.
                         // Então, apenas o mapa é necessário aqui.
                    }

                    // Adiciona à lista de sorteio se tiver 5 letras (COM acento)
                    // Ajuste a regex se precisar permitir outros caracteres além de letras e acentos
                    if (palavraComAcento.length === TAMANHO_PALAVRA && /^[a-zà-úç]+$/.test(palavraComAcento)) {
                        listaPalavrasPossiveisSecreta.push(palavraComAcento);
                    }
                }
            });

             // Adiciona palavras sem acento de 5 letras à lista de válidas também
             // para garantir que palavras como 'campo' sejam válidas.
             listaPalavrasPossiveisSecreta.forEach(p => {
                 const semAcento = removerAcentos(p);
                 if (semAcento.length === 5 && /^[a-z]+$/.test(semAcento)) {
                      if (!listaPalavrasValidasComAcento.has(semAcento)) {
                         // listaPalavrasValidasComAcento.add(semAcento);
                         // Melhor abordagem: A lista de palavras válidas DEVE ter todas as formas aceitáveis.
                         // O arquivo palavras_com_acento.txt deve conter tanto 'cacar' (se for palavra válida) quanto 'caçar'.
                         // Se não contiver, a validação falhará. Vamos assumir que o TXT é completo.
                      }
                 }
             });


            if (listaPalavrasPossiveisSecreta.length === 0) {
                 throw new Error("Nenhuma palavra de 5 letras (com acentos) válida encontrada em palavras_com_acento.txt para iniciar o jogo.");
            }

            console.log(`Palavras válidas (com acento) carregadas: ${listaPalavrasValidasComAcento.size}`);
            console.log(`Mapa sem->com acento: ${mapaSemAcentoParaComAcento.size} entradas`);
            console.log(`Palavras de ${TAMANHO_PALAVRA} letras (com acento) para sorteio: ${listaPalavrasPossiveisSecreta.length}`);
            return true;

        } catch (error) {
            console.error("Falha ao carregar ou processar palavras_com_acento.txt:", error);
            messageArea.textContent = `Erro crítico: Não foi possível carregar a lista de palavras. ${error.message}`;
            messageArea.className = 'message-area error';
            return false;
        } finally {
             loadingMessage.style.display = 'none';
        }
    }

    // Escolhe palavra COM acento da lista carregada e retorna em MAIÚSCULAS
    function escolherPalavraSecreta() {
        if (listaPalavrasPossiveisSecreta.length === 0) return "ERRO";
        const indice = Math.floor(Math.random() * listaPalavrasPossiveisSecreta.length);
        return listaPalavrasPossiveisSecreta[indice].toUpperCase(); // Retorna COM acento, maiúscula
    }

    // criarTabuleiro (sem alterações)
    function criarTabuleiro() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < NUM_TENTATIVAS; i++) {
            const row = document.createElement('div');
            row.classList.add('row');
            row.id = `row-${i}`;
            for (let j = 0; j < TAMANHO_PALAVRA; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.id = `cell-${i}-${j}`;
                row.appendChild(cell);
            }
            gameBoard.appendChild(row);
        }
         gameBoard.style.display = 'grid';
    }

     // criarTeclado (sem alterações)
    function criarTeclado() {
        keyboardContainer.innerHTML = '';
        const layoutTeclado = [
            "QWERTYUIOP",
            "ASDFGHJKL",
            "ENTER ZXC VBNM BACKSPACE"
        ];
        layoutTeclado.forEach(linha => {
            const rowDiv = document.createElement('div');
            rowDiv.classList.add('keyboard-row');
            const teclas = linha.split(' ');
            teclas.forEach(segmento => {
                if (segmento === "ENTER" || segmento === "BACKSPACE") {
                    const key = document.createElement('button'); key.classList.add('key', 'large'); key.textContent = segmento; key.dataset.key = segmento; rowDiv.appendChild(key);
                } else {
                    for (const letra of segmento) {
                        const key = document.createElement('button'); key.classList.add('key'); key.textContent = letra; key.dataset.key = letra; rowDiv.appendChild(key);
                    }
                }
            });
            keyboardContainer.appendChild(rowDiv);
        });
        keyboardContainer.style.display = 'flex';
    }


    // aplicarFeedbackVisual (sem alterações)
     function aplicarFeedbackVisual(feedbackCores) {
        const row = document.getElementById(`row-${currentRowIndex}`);
        const cells = row.children;
        for (let i = 0; i < TAMANHO_PALAVRA; i++) {
            const cell = cells[i];
             if (!cell) continue; // Segurança
            const letter = cell.textContent; // Já deve estar com acento aqui, se aplicável
            const status = feedbackCores[i];
            setTimeout(() => {
                if(!cell) return;
                cell.classList.add('reveal', status);
                const currentStatus = letterStatus[letter]; // Usa letra com acento se houver
                if (status === 'correct' || (status === 'present' && currentStatus !== 'correct') || (status === 'absent' && !currentStatus)) {
                    letterStatus[letter] = status;
                }
            }, i * 250);
        }
         setTimeout(atualizarCoresTeclado, TAMANHO_PALAVRA * 250 + 50);
    }

    // atualizarCoresTeclado (sem alterações)
    function atualizarCoresTeclado() {
        const keys = keyboardContainer.querySelectorAll('.key');
        keys.forEach(key => {
            const letra = key.dataset.key; // Teclado ainda usa letras base (sem acento)
            // Para a cor do teclado, usamos a versão SEM acento da letra correspondente no status
            // (Se 'Ç' for 'correct', a tecla 'C' fica verde) - Isso é complexo.
            // Simplificação: O status da letra no teclado reflete o último status daquela letra *base* (sem acento) encontrada.
            let letraBase = removerAcentos(letra).toUpperCase();
             let statusFinal = null;
             // Verifica se a letra base ou suas versões acentuadas têm status
             for(const l in letterStatus){
                 if(removerAcentos(l).toUpperCase() === letraBase){
                     const s = letterStatus[l];
                     if (s === 'correct') { statusFinal = 'correct'; break; } // Correct tem prioridade
                     if (s === 'present') statusFinal = 'present';
                     if (s === 'absent' && !statusFinal) statusFinal = 'absent';
                 }
             }

            key.classList.remove('correct', 'present', 'absent'); // Limpa antes
            if (statusFinal) {
                key.classList.add(statusFinal);
            }
        });
    }


    // *** PROCESSAR TENTATIVA COM LÓGICA DE AUTO-ACENTO ***
    function processarTentativa() {
        if (jogoAcabou) return;

        if (currentLetterIndex < TAMANHO_PALAVRA) {
            mostrarMensagem("Palavra incompleta!", 'error', 1200); agitarLinhaAtual(); return;
        }

        const palavraDigitada = boardState[currentRowIndex].join(''); // Uppercase, como digitado
        const palavraDigitadaLower = palavraDigitada.toLowerCase(); // Lowercase, como digitado

        messageArea.textContent = ''; messageArea.className = 'message-area';

        let palavraReal = ''; // Guarda a palavra final (com acento, se aplicável) em lowercase

        // 1. Verifica se a palavra digitada (com ou sem acento) é válida diretamente
        if (listaPalavrasValidasComAcento.has(palavraDigitadaLower)) {
            palavraReal = palavraDigitadaLower;
        }
        // 2. Se não for, tenta corrigir (procura versão sem acento no mapa)
        else {
            const palavraSemAcentoDigitada = removerAcentos(palavraDigitadaLower);
            if (mapaSemAcentoParaComAcento.has(palavraSemAcentoDigitada)) {
                const palavraCorrigida = mapaSemAcentoParaComAcento.get(palavraSemAcentoDigitada);
                // Confirma se a palavra corrigida existe na lista principal (deve existir)
                 if (listaPalavrasValidasComAcento.has(palavraCorrigida)) {
                     palavraReal = palavraCorrigida; // Usa a versão corrigida COM acento
                     console.log(`Auto-correção: ${palavraDigitadaLower} -> ${palavraReal}`);
                 }
            }
        }

        // 3. Se não encontrou palavra válida (nem digitada, nem corrigida)
        if (!palavraReal) {
            mostrarMensagem("Palavra não reconhecida!", 'error', 1500); agitarLinhaAtual(); return;
        }

        // *** Palavra Válida Encontrada (palavraReal) ***

        // 4. ATUALIZA O TABULEIRO VISUALMENTE com a palavraReal (COM acentos, se houver)
        const palavraRealUpper = palavraReal.toUpperCase();
        const currentRow = document.getElementById(`row-${currentRowIndex}`);
        if (currentRow) {
            const cells = currentRow.children;
            for (let i = 0; i < TAMANHO_PALAVRA; i++) {
                if (cells[i]) {
                    cells[i].textContent = palavraRealUpper[i]; // Atualiza a célula
                    boardState[currentRowIndex][i] = palavraRealUpper[i]; // Atualiza estado interno
                }
            }
        }

        // 5. Calcula feedback comparando palavraReal com palavraSecreta (ambas COM acentos, uppercase)
        const feedbackCores = calcularFeedback(palavraRealUpper, palavraSecreta);

        // 6. Aplica animação de flip e cores
        aplicarFeedbackVisual(feedbackCores);

        // 7. Verifica Vitória
        if (palavraRealUpper === palavraSecreta) {
            jogoAcabou = true;
            // Animação de dança (igual antes)
            const winningRow = document.getElementById(`row-${currentRowIndex}`);
            if (winningRow) { /* ... código da dança ... */
                const cells = winningRow.children;
                for (let i = 0; i < cells.length; i++) {
                    setTimeout(() => {
                        if(cells[i]) {
                             cells[i].style.setProperty('--dance-delay', `${i * 100}ms`);
                             cells[i].classList.add('dance');
                        }
                    }, TAMANHO_PALAVRA * 250);
                }
            }
            setTimeout(() => { mostrarMensagem('Parabéns, você acertou!', 'win'); finalizarJogo(); }, TAMANHO_PALAVRA * 250 + 700);
            return;
        }

        // 8. Avança para próxima tentativa
        currentRowIndex++;
        currentLetterIndex = 0;

        // 9. Verifica Derrota
        if (currentRowIndex >= NUM_TENTATIVAS) {
             jogoAcabou = true;
             setTimeout(() => { mostrarMensagem(`Fim de jogo! A palavra era: ${palavraSecreta}`, 'info'); finalizarJogo(); }, TAMANHO_PALAVRA * 250 + 100);
        }
    }

    // calcularFeedback (DEVE funcionar com acentos, JS compara strings corretamente)
    function calcularFeedback(palavraTentada, palavraSecreta) {
        // (Lógica inalterada, mas agora opera com strings que podem ter acentos)
        const feedback = Array(TAMANHO_PALAVRA).fill('absent');
        const letraUsadaSecreta = Array(TAMANHO_PALAVRA).fill(false);
        const contagemLetrasSecreta = {};

        // Conta letras na palavra secreta (com acentos)
        for (const letra of palavraSecreta) {
            contagemLetrasSecreta[letra] = (contagemLetrasSecreta[letra] || 0) + 1;
        }

        // Verifica corretas (com acentos)
        for (let i = 0; i < TAMANHO_PALAVRA; i++) {
            if (palavraTentada[i] === palavraSecreta[i]) {
                feedback[i] = 'correct';
                letraUsadaSecreta[i] = true;
                if (contagemLetrasSecreta[palavraTentada[i]]) {
                   contagemLetrasSecreta[palavraTentada[i]]--;
                }
            }
        }

        // Verifica presentes (com acentos)
        for (let i = 0; i < TAMANHO_PALAVRA; i++) {
            if (feedback[i] !== 'correct') {
                const letraTentada = palavraTentada[i];
                // Verifica se a letra (com acento) existe na secreta e ainda tem contagem
                if (palavraSecreta.includes(letraTentada) && contagemLetrasSecreta[letraTentada] > 0) {
                     feedback[i] = 'present';
                     contagemLetrasSecreta[letraTentada]--;
                }
            }
        }
        return feedback;
    }

    // adicionarLetra (sem alterações, adiciona o que foi digitado)
    function adicionarLetra(letra) {
        if (jogoAcabou || currentLetterIndex >= TAMANHO_PALAVRA) return;
        const row = document.getElementById(`row-${currentRowIndex}`);
        if (!row || !row.children[currentLetterIndex]) return;
        const cell = row.children[currentLetterIndex];
        letra = letra.toUpperCase();
        // Permite digitar ç diretamente se o teclado físico suportar
        if (/^[A-ZÇ]$/.test(letra)) { // Aceita A-Z e Ç
             cell.textContent = letra;
             cell.classList.add('filled');
             boardState[currentRowIndex][currentLetterIndex] = letra;
             currentLetterIndex++;
        }
    }


    // removerLetra (sem alterações)
    function removerLetra() {
        if (jogoAcabou || currentLetterIndex <= 0) return;
        currentLetterIndex--;
        const row = document.getElementById(`row-${currentRowIndex}`);
        if (!row || !row.children[currentLetterIndex]) return;
        const cell = row.children[currentLetterIndex];
        cell.textContent = '';
        cell.classList.remove('filled');
        boardState[currentRowIndex][currentLetterIndex] = '';
    }

    // finalizarJogo (sem alterações)
    function finalizarJogo() { resetButton.style.display = 'inline-block'; }

    // reiniciarJogo (sem alterações)
    function reiniciarJogo() {
        palavraSecreta = escolherPalavraSecreta();
        if (!palavraSecreta || palavraSecreta === "ERRO") { mostrarMensagem("Erro ao iniciar novo jogo.", 'error'); jogoAcabou = true; return; }
        currentRowIndex = 0; currentLetterIndex = 0; jogoAcabou = false;
        boardState = Array(NUM_TENTATIVAS).fill(null).map(() => Array(TAMANHO_PALAVRA).fill(''));
        letterStatus = {}; messageArea.textContent = ''; messageArea.className = 'message-area';
        resetButton.style.display = 'none';
        if (gameBoard) gameBoard.innerHTML = ''; if (keyboardContainer) keyboardContainer.innerHTML = '';
        criarTabuleiro(); criarTeclado(); atualizarCoresTeclado();
        // console.log("Nova palavra secreta (COM ACENTO):", palavraSecreta);
    }

    // mostrarMensagem (sem alterações)
    function mostrarMensagem(texto, tipo = 'info', duracao = null) { /* ...código ... */
        messageArea.textContent = texto;
        messageArea.className = `message-area ${tipo}`;
        if (duracao) {
            setTimeout(() => {
                if (messageArea.textContent === texto) {
                    messageArea.textContent = '';
                    messageArea.className = 'message-area';
                }
            }, duracao);
        }
    }

    // agitarLinhaAtual (sem alterações)
    function agitarLinhaAtual() { /* ...código ... */
        const row = document.getElementById(`row-${currentRowIndex}`);
        if (row) { row.classList.add('shake'); setTimeout(() => { row.classList.remove('shake'); }, 400); }
    }


    // --- Event Listeners ---
    // Modificado para aceitar Ç
    document.addEventListener('keydown', (event) => {
        if (jogoAcabou || listaPalavrasValidasComAcento.size === 0) return;
        const key = event.key.toUpperCase(); // Pega a tecla pressionada

        // Verifica se é uma letra válida (A-Z ou Ç)
        const isLetter = key.length === 1 && ( (key >= 'A' && key <= 'Z') || key === 'Ç');

        if (key === 'ENTER') {
            processarTentativa();
        } else if (key === 'BACKSPACE') {
            removerLetra();
        } else if (isLetter) { // Usa a verificação de letra
             adicionarLetra(key); // Passa a tecla original (pode ser 'Ç')
        }
    });

     keyboardContainer.addEventListener('click', (event) => { // Teclado virtual não tem Ç por padrão
        if (jogoAcabou || listaPalavrasValidasComAcento.size === 0) return;
        const target = event.target;
        if (target.classList.contains('key')) {
            const key = target.dataset.key;
            if (key === 'ENTER') processarTentativa();
            else if (key === 'BACKSPACE') removerLetra();
            else if (key.length === 1 && key >= 'A' && key <= 'Z') adicionarLetra(key); // Adiciona A-Z
        }
     });

    resetButton.addEventListener('click', reiniciarJogo);

    // --- Inicialização ---
    (async () => {
        const sucesso = await carregarPalavras();
        if (sucesso) {
            reiniciarJogo();
        }
    })();

});