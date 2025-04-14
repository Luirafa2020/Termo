document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos e Variáveis (sem alterações iniciais) ---
    const gameBoard = document.getElementById('game-board');
    const messageArea = document.getElementById('message-area');
    const resetButton = document.getElementById('reset-button');
    const keyboardContainer = document.getElementById('keyboard');
    const loadingMessage = document.getElementById('loading-message');
    const NUM_TENTATIVAS = 6;
    const TAMANHO_PALAVRA = 5;
    let palavraSecreta = ''; // Uppercase, com acento
    let currentRowIndex = 0, currentLetterIndex = 0, jogoAcabou = false;
    let boardState = Array(NUM_TENTATIVAS).fill(null).map(() => Array(TAMANHO_PALAVRA).fill(''));
    let letterStatus = {};
    let listaPalavrasValidasComAcento = new Set();
    let mapaSemAcentoParaComAcento = new Map();
    let listaPalavrasPossiveisSecreta = [];

    // --- Funções Auxiliares ---
    function removerAcentos(str) { /* ... (sem alterações) ... */
        if (str === null || typeof str === 'undefined') return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // --- Funções Principais ---

    // carregarPalavras (sem alterações)
    async function carregarPalavras() { /* ... (sem alterações) ... */
        loadingMessage.style.display = 'block';
        gameBoard.style.display = 'none'; keyboardContainer.style.display = 'none';
        messageArea.textContent = '';
        try {
            const response = await fetch('palavras_com_acento.txt');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            const text = await response.text();
            const todasPalavras = text.split('\n');
            listaPalavrasValidasComAcento.clear(); mapaSemAcentoParaComAcento.clear(); listaPalavrasPossiveisSecreta = [];
            todasPalavras.forEach(palavra => {
                const pComAcento = palavra.trim().toLowerCase();
                if (pComAcento.length > 0) {
                    listaPalavrasValidasComAcento.add(pComAcento);
                    const pSemAcento = removerAcentos(pComAcento);
                    if (pComAcento !== pSemAcento && !mapaSemAcentoParaComAcento.has(pSemAcento)) { mapaSemAcentoParaComAcento.set(pSemAcento, pComAcento); }
                    if (pComAcento.length === TAMANHO_PALAVRA && /^[a-zà-úç]+$/.test(pComAcento)) { listaPalavrasPossiveisSecreta.push(pComAcento); }
                }
            });
            if (listaPalavrasPossiveisSecreta.length === 0) throw new Error("Nenhuma palavra de 5 letras válida encontrada.");
            console.log(`Palavras válidas: ${listaPalavrasValidasComAcento.size}, Mapa: ${mapaSemAcentoParaComAcento.size}, Sorteio: ${listaPalavrasPossiveisSecreta.length}`);
            return true;
        } catch (error) { console.error("Falha ao carregar palavras:", error); messageArea.textContent = `Erro crítico: ${error.message}`; messageArea.className = 'message-area error'; return false;
        } finally { loadingMessage.style.display = 'none'; }
    }


    // escolherPalavraSecreta (sem alterações)
    function escolherPalavraSecreta() { /* ... (sem alterações) ... */
        if (listaPalavrasPossiveisSecreta.length === 0) return "ERRO";
        const indice = Math.floor(Math.random() * listaPalavrasPossiveisSecreta.length);
        return listaPalavrasPossiveisSecreta[indice].toUpperCase();
     }

    // criarTabuleiro (sem alterações)
    function criarTabuleiro() { /* ... (sem alterações) ... */
         gameBoard.innerHTML = '';
        for (let i = 0; i < NUM_TENTATIVAS; i++) { const row = document.createElement('div'); row.classList.add('row'); row.id = `row-${i}`; for (let j = 0; j < TAMANHO_PALAVRA; j++) { const cell = document.createElement('div'); cell.classList.add('cell'); cell.id = `cell-${i}-${j}`; row.appendChild(cell); } gameBoard.appendChild(row); } gameBoard.style.display = 'grid';
    }

    // criarTeclado (sem alterações - já invertido)
    function criarTeclado() { /* ... (sem alterações - layout já invertido) ... */
        keyboardContainer.innerHTML = '';
        const layoutTeclado = [ "QWERTYUIOP", "ASDFGHJKL", "BACKSPACE ZXC VBNM ENTER" ];
        layoutTeclado.forEach(linha => { const rowDiv = document.createElement('div'); rowDiv.classList.add('keyboard-row'); const teclas = linha.split(' '); teclas.forEach(segmento => { if (segmento === "ENTER" || segmento === "BACKSPACE") { const key = document.createElement('button'); key.classList.add('key', 'large'); key.textContent = segmento; key.dataset.key = segmento; rowDiv.appendChild(key); } else { for (const letra of segmento) { const key = document.createElement('button'); key.classList.add('key'); key.textContent = letra; key.dataset.key = letra; rowDiv.appendChild(key); } } }); keyboardContainer.appendChild(rowDiv); }); keyboardContainer.style.display = 'flex';
     }

    // aplicarFeedbackVisual (sem alterações)
    function aplicarFeedbackVisual(feedbackCores) { /* ... (sem alterações) ... */
        const row = document.getElementById(`row-${currentRowIndex}`); const cells = row.children;
        for (let i = 0; i < TAMANHO_PALAVRA; i++) { const cell = cells[i]; if (!cell) continue; const letter = cell.textContent; const status = feedbackCores[i]; setTimeout(() => { if(!cell) return; cell.classList.add('reveal', status); const currentStatus = letterStatus[letter]; if (status === 'correct' || (status === 'present' && currentStatus !== 'correct') || (status === 'absent' && !currentStatus)) { letterStatus[letter] = status; } }, i * 250); }
        setTimeout(atualizarCoresTeclado, TAMANHO_PALAVRA * 250 + 50);
    }

    // atualizarCoresTeclado (sem alterações)
    function atualizarCoresTeclado() { /* ... (sem alterações) ... */
         const keys = keyboardContainer.querySelectorAll('.key');
        keys.forEach(key => { const letra = key.dataset.key; if (letra === "ENTER" || letra === "BACKSPACE") return; let letraBase = removerAcentos(letra).toUpperCase(); let statusFinal = null; for(const l in letterStatus){ if(removerAcentos(l).toUpperCase() === letraBase){ const s = letterStatus[l]; if (s === 'correct') { statusFinal = 'correct'; break; } if (s === 'present') statusFinal = 'present'; if (s === 'absent' && !statusFinal) statusFinal = 'absent'; } } key.classList.remove('correct', 'present', 'absent'); if (statusFinal) { key.classList.add(statusFinal); } });
    }

    // processarTentativa (sem alterações na lógica principal, chama o novo calcularFeedback)
    function processarTentativa() { /* ... (sem alterações, mas chama o novo calcularFeedback) ... */
        if (jogoAcabou) return; if (currentLetterIndex < TAMANHO_PALAVRA) { mostrarMensagem("Palavra incompleta!", 'error', 1200); agitarLinhaAtual(); return; }
        const palavraDigitada = boardState[currentRowIndex].join(''); const palavraDigitadaLower = palavraDigitada.toLowerCase();
        messageArea.textContent = ''; messageArea.className = 'message-area';
        let palavraReal = ''; if (listaPalavrasValidasComAcento.has(palavraDigitadaLower)) { palavraReal = palavraDigitadaLower; } else { const palavraSemAcentoDigitada = removerAcentos(palavraDigitadaLower); if (mapaSemAcentoParaComAcento.has(palavraSemAcentoDigitada)) { const palavraCorrigida = mapaSemAcentoParaComAcento.get(palavraSemAcentoDigitada); if (listaPalavrasValidasComAcento.has(palavraCorrigida)) { palavraReal = palavraCorrigida; } } }
        if (!palavraReal) { mostrarMensagem("Palavra não reconhecida!", 'error', 1500); agitarLinhaAtual(); return; }
        const palavraRealUpper = palavraReal.toUpperCase(); const currentRow = document.getElementById(`row-${currentRowIndex}`);
        if (currentRow) { const cells = currentRow.children; for (let i = 0; i < TAMANHO_PALAVRA; i++) { if (cells[i]) { cells[i].textContent = palavraRealUpper[i]; boardState[currentRowIndex][i] = palavraRealUpper[i]; } } }
        // Chama a função refatorada
        const feedbackCores = calcularFeedback(palavraRealUpper, palavraSecreta);
        aplicarFeedbackVisual(feedbackCores);
        if (palavraRealUpper === palavraSecreta) { jogoAcabou = true; const winningRow = document.getElementById(`row-${currentRowIndex}`); if (winningRow) { const cells = winningRow.children; for (let i = 0; i < cells.length; i++) { setTimeout(() => { if(cells[i]) { cells[i].style.setProperty('--dance-delay', `${i * 100}ms`); cells[i].classList.add('dance');}}, TAMANHO_PALAVRA * 250);} } setTimeout(() => { mostrarMensagem('Parabéns, você acertou!', 'win'); finalizarJogo(); }, TAMANHO_PALAVRA * 250 + 700); return; }
        currentRowIndex++; currentLetterIndex = 0;
        if (currentRowIndex >= NUM_TENTATIVAS) { jogoAcabou = true; setTimeout(() => { mostrarMensagem(`Fim de jogo! A palavra era: ${palavraSecreta}`, 'info'); finalizarJogo(); }, TAMANHO_PALAVRA * 250 + 100); }
    }

    /**
     * *** LÓGICA DE FEEDBACK REFEITA (ROBUSTA PARA DUPLICATAS E ACENTOS) ***
     * Compara as letras exatas (com acentos) e gerencia a contagem
     * de letras na palavra secreta para determinar verdes e amarelos corretamente.
     */
    function calcularFeedback(palavraTentadaUpper, palavraSecretaUpper) {
        const feedback = Array(TAMANHO_PALAVRA).fill('absent'); // Inicia tudo como cinza
        const palavraSecretaArray = palavraSecretaUpper.split(''); // Array da secreta
        const palavraTentadaArray = palavraTentadaUpper.split(''); // Array da tentativa

        // Contagem precisa das letras EXATAS na palavra secreta
        const contagemLetrasSecreta = {};
        for (const letra of palavraSecretaArray) {
            contagemLetrasSecreta[letra] = (contagemLetrasSecreta[letra] || 0) + 1;
        }

        // 1ª Passada: Marcar VERDES (posição e letra exatas)
        for (let i = 0; i < TAMANHO_PALAVRA; i++) {
            if (palavraTentadaArray[i] === palavraSecretaArray[i]) {
                feedback[i] = 'correct';
                // Decrementa a contagem da letra EXATA correspondente na secreta
                if (contagemLetrasSecreta[palavraTentadaArray[i]] > 0) {
                     contagemLetrasSecreta[palavraTentadaArray[i]]--;
                } else {
                     // Isso não deveria acontecer em uma lógica correta, mas é um aviso
                     console.warn(`Contagem da letra ${palavraTentadaArray[i]} já era zero ao marcar verde.`);
                }
            }
        }

        // 2ª Passada: Marcar AMARELOS (letra existe, mas fora da posição verde)
        for (let i = 0; i < TAMANHO_PALAVRA; i++) {
            // Só processa se NÃO for verde
            if (feedback[i] !== 'correct') {
                const letraTentada = palavraTentadaArray[i];
                // Verifica se a letra EXATA existe na contagem RESTANTE da palavra secreta
                if (contagemLetrasSecreta[letraTentada] > 0) {
                    feedback[i] = 'present';
                    // Decrementa a contagem ao usar para amarelo
                    contagemLetrasSecreta[letraTentada]--;
                }
                // Se a letra não existe mais na contagem (ou nunca existiu),
                // ela permanece 'absent' (cinza), que é o valor padrão inicial.
            }
        }

        return feedback; // Retorna o array final de cores
    }


    // adicionarLetra (sem alterações)
    function adicionarLetra(letra) { /* ... (sem alterações) ... */
        if (jogoAcabou || currentLetterIndex >= TAMANHO_PALAVRA) return; const row = document.getElementById(`row-${currentRowIndex}`); if (!row || !row.children[currentLetterIndex]) return; const cell = row.children[currentLetterIndex]; letra = letra.toUpperCase(); if (/^[A-ZÇ]$/.test(letra)) { cell.textContent = letra; cell.classList.add('filled'); boardState[currentRowIndex][currentLetterIndex] = letra; currentLetterIndex++; }
     }

    // removerLetra (sem alterações)
    function removerLetra() { /* ... (sem alterações) ... */
        if (jogoAcabou || currentLetterIndex <= 0) return; currentLetterIndex--; const row = document.getElementById(`row-${currentRowIndex}`); if (!row || !row.children[currentLetterIndex]) return; const cell = row.children[currentLetterIndex]; cell.textContent = ''; cell.classList.remove('filled'); boardState[currentRowIndex][currentLetterIndex] = '';
     }

    // finalizarJogo (sem alterações)
    function finalizarJogo() { /* ... (sem alterações) ... */ resetButton.style.display = 'inline-block'; }

    // reiniciarJogo (sem alterações)
    function reiniciarJogo() { /* ... (sem alterações) ... */
         palavraSecreta = escolherPalavraSecreta(); if (!palavraSecreta || palavraSecreta === "ERRO") { mostrarMensagem("Erro ao iniciar novo jogo.", 'error'); jogoAcabou = true; return; } currentRowIndex = 0; currentLetterIndex = 0; jogoAcabou = false; boardState = Array(NUM_TENTATIVAS).fill(null).map(() => Array(TAMANHO_PALAVRA).fill('')); letterStatus = {}; messageArea.textContent = ''; messageArea.className = 'message-area'; resetButton.style.display = 'none'; if (gameBoard) gameBoard.innerHTML = ''; if (keyboardContainer) keyboardContainer.innerHTML = ''; criarTabuleiro(); criarTeclado(); atualizarCoresTeclado();
    }

    // mostrarMensagem (sem alterações)
    function mostrarMensagem(texto, tipo = 'info', duracao = null) { /* ... (sem alterações) ... */ messageArea.textContent = texto; messageArea.className = `message-area ${tipo}`; if (duracao) { setTimeout(() => { if (messageArea.textContent === texto) { messageArea.textContent = ''; messageArea.className = 'message-area';}}, duracao);} }

    // agitarLinhaAtual (sem alterações)
    function agitarLinhaAtual() { /* ... (sem alterações) ... */ const row = document.getElementById(`row-${currentRowIndex}`); if (row) { row.classList.add('shake'); setTimeout(() => { row.classList.remove('shake'); }, 400); } }

    // --- Event Listeners (sem alterações) ---
    document.addEventListener('keydown', (event) => { if (jogoAcabou || listaPalavrasValidasComAcento.size === 0) return; const key = event.key.toUpperCase(); const isLetter = key.length === 1 && ((key >= 'A' && key <= 'Z') || key === 'Ç'); if (key === 'ENTER') processarTentativa(); else if (key === 'BACKSPACE') removerLetra(); else if (isLetter) adicionarLetra(key); });
    keyboardContainer.addEventListener('click', (event) => { if (jogoAcabou || listaPalavrasValidasComAcento.size === 0) return; const target = event.target; if (target.classList.contains('key')) { const key = target.dataset.key; if (key === 'ENTER') processarTentativa(); else if (key === 'BACKSPACE') removerLetra(); else if (key.length === 1 && key >= 'A' && key <= 'Z') adicionarLetra(key); } });
    resetButton.addEventListener('click', reiniciarJogo);

    // --- Inicialização ---
    (async () => { if (await carregarPalavras()) { reiniciarJogo(); } })();
});