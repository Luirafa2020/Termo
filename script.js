document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos e Variáveis ---
    const gameBoard = document.getElementById('game-board');
    const messageArea = document.getElementById('message-area');
    const resetButton = document.getElementById('reset-button');
    const keyboardContainer = document.getElementById('keyboard');
    const loadingMessage = document.getElementById('loading-message');
    const NUM_TENTATIVAS = 6;
    const TAMANHO_PALAVRA = 5;
    let palavraSecreta = ''; // Uppercase, com acento, e "segura"
    let currentRowIndex = 0, currentLetterIndex = 0, jogoAcabou = false;
    let boardState = Array(NUM_TENTATIVAS).fill(null).map(() => Array(TAMANHO_PALAVRA).fill(''));
    let letterStatus = {};

    // Estruturas de dados
    let listaPalavrasValidasComAcento = new Set(); // Todas as palavras válidas (com/sem acento)
    let mapaSemAcentoParaComAcento = new Map(); // Mapeia base -> com acento (para correção)
    let listaPalavrasPossiveisSecreta = []; // Palavras SEGURAS para sorteio (com acento)

    // --- Funções Auxiliares ---
    function removerAcentos(str) {
        if (str === null || typeof str === 'undefined') return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // --- Funções Principais ---

    /**
     * Carrega palavras, identifica conflitos e filtra lista para sorteio.
     * Reabilita o mapa de correção.
     */
    async function carregarPalavras() {
        loadingMessage.style.display = 'block';
        gameBoard.style.display = 'none'; keyboardContainer.style.display = 'none';
        messageArea.textContent = '';
        try {
            const response = await fetch('palavras_com_acento.txt');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            const text = await response.text();
            const todasPalavras = text.split('\n')
                                     .map(p => p.trim().toLowerCase())
                                     .filter(p => p.length > 0); // Limpa e filtra vazias

            listaPalavrasValidasComAcento = new Set(todasPalavras); // Guarda todas válidas
            mapaSemAcentoParaComAcento.clear();
            listaPalavrasPossiveisSecreta = [];

            // 1. Identificar conflitos e popular mapa
            const palavrasBaseVistas = new Set();
            const palavrasBaseConflitantes = new Set();
            const mapaTemporarioBaseParaOriginais = new Map(); // Guarda todas originais para cada base

            for (const pComAcento of todasPalavras) {
                const pBase = removerAcentos(pComAcento);

                // Registra todas as formas originais para essa base
                if (!mapaTemporarioBaseParaOriginais.has(pBase)) {
                    mapaTemporarioBaseParaOriginais.set(pBase, new Set());
                }
                mapaTemporarioBaseParaOriginais.get(pBase).add(pComAcento);

                // Detecta conflito se a base já foi vista E a palavra atual é DIFERENTE da(s) anterior(es) para essa base
                // Ou mais simples: se o set para essa base agora tem mais de um elemento.
                if (mapaTemporarioBaseParaOriginais.get(pBase).size > 1) {
                     palavrasBaseConflitantes.add(pBase);
                    // console.warn(`Conflito detectado para base "${pBase}": ${[...mapaTemporarioBaseParaOriginais.get(pBase)].join(', ')}`);
                }

                 // Popula mapa de correção (base -> com acento) - última palavra com acento vence se houver múltiplas para mesma base
                 // Só mapeia se houver acento
                 if (pComAcento !== pBase) {
                     mapaSemAcentoParaComAcento.set(pBase, pComAcento);
                 }
            }

            // 2. Filtrar lista para sorteio
            for (const pComAcento of todasPalavras) {
                 // Considera apenas palavras de 5 letras para sorteio
                 if (pComAcento.length === TAMANHO_PALAVRA && /^[a-zà-úç]+$/.test(pComAcento)) {
                     const pBase = removerAcentos(pComAcento);
                     // Adiciona à lista de sorteio APENAS SE a base NÃO for conflitante
                     if (!palavrasBaseConflitantes.has(pBase)) {
                         listaPalavrasPossiveisSecreta.push(pComAcento);
                     }
                 }
            }


            if (listaPalavrasPossiveisSecreta.length === 0) throw new Error("Nenhuma palavra SEGURA de 5 letras encontrada para sorteio.");

            console.log(`Palavras válidas carregadas: ${listaPalavrasValidasComAcento.size}`);
            console.log(`Mapa sem->com acento: ${mapaSemAcentoParaComAcento.size}`);
            console.log(`Palavras base conflitantes: ${palavrasBaseConflitantes.size}`);
            console.log(`Palavras SEGURAS para sorteio: ${listaPalavrasPossiveisSecreta.length}`);
            return true;
        } catch (error) {
            console.error("Falha ao carregar/processar palavras:", error);
            messageArea.textContent = `Erro crítico: ${error.message}`; messageArea.className = 'message-area error';
            return false;
        } finally {
             loadingMessage.style.display = 'none';
        }
    }

    // escolherPalavraSecreta (escolhe da lista SEGURA)
    function escolherPalavraSecreta() {
        if (listaPalavrasPossiveisSecreta.length === 0) return "ERRO";
        const indice = Math.floor(Math.random() * listaPalavrasPossiveisSecreta.length);
        return listaPalavrasPossiveisSecreta[indice].toUpperCase(); // Retorna palavra SEGURA (com acento) em maiúsculas
    }

    // criarTabuleiro (sem alterações)
    function criarTabuleiro() { /* ... */ gameBoard.innerHTML = ''; for (let i = 0; i < NUM_TENTATIVAS; i++) { const row = document.createElement('div'); row.classList.add('row'); row.id = `row-${i}`; for (let j = 0; j < TAMANHO_PALAVRA; j++) { const cell = document.createElement('div'); cell.classList.add('cell'); cell.id = `cell-${i}-${j}`; row.appendChild(cell); } gameBoard.appendChild(row); } gameBoard.style.display = 'grid'; }

    // criarTeclado (sem alterações)
    function criarTeclado() { /* ... */ keyboardContainer.innerHTML = ''; const layoutTeclado = [ "QWERTYUIOP", "ASDFGHJKL", "BACKSPACE ZXC VBNM ENTER" ]; layoutTeclado.forEach(linha => { const rowDiv = document.createElement('div'); rowDiv.classList.add('keyboard-row'); const teclas = linha.split(' '); teclas.forEach(segmento => { if (segmento === "ENTER" || segmento === "BACKSPACE") { const key = document.createElement('button'); key.classList.add('key', 'large'); key.textContent = segmento; key.dataset.key = segmento; rowDiv.appendChild(key); } else { for (const letra of segmento) { const key = document.createElement('button'); key.classList.add('key'); key.textContent = letra; key.dataset.key = letra; rowDiv.appendChild(key); } } }); keyboardContainer.appendChild(rowDiv); }); keyboardContainer.style.display = 'flex'; }

    // aplicarFeedbackVisual (sem alterações)
    function aplicarFeedbackVisual(feedbackCores) { /* ... */ const row = document.getElementById(`row-${currentRowIndex}`); const cells = row.children; for (let i = 0; i < TAMANHO_PALAVRA; i++) { const cell = cells[i]; if (!cell) continue; const letter = cell.textContent; const status = feedbackCores[i]; setTimeout(() => { if(!cell) return; cell.classList.add('reveal', status); const currentStatus = letterStatus[letter]; if (status === 'correct' || (status === 'present' && currentStatus !== 'correct') || (status === 'absent' && !currentStatus)) { letterStatus[letter] = status; } }, i * 250); } setTimeout(atualizarCoresTeclado, TAMANHO_PALAVRA * 250 + 50); }

    // atualizarCoresTeclado (sem alterações)
    function atualizarCoresTeclado() { /* ... */ const keys = keyboardContainer.querySelectorAll('.key'); keys.forEach(key => { const letra = key.dataset.key; if (letra === "ENTER" || letra === "BACKSPACE") return; let letraBase = removerAcentos(letra).toUpperCase(); let statusFinal = null; for(const l in letterStatus){ if(removerAcentos(l).toUpperCase() === letraBase){ const s = letterStatus[l]; if (s === 'correct') { statusFinal = 'correct'; break; } if (s === 'present') statusFinal = 'present'; if (s === 'absent' && !statusFinal) statusFinal = 'absent'; } } key.classList.remove('correct', 'present', 'absent'); if (statusFinal) { key.classList.add(statusFinal); } }); }


    /**
     * *** PROCESSAR TENTATIVA COM AUTO-CORREÇÃO RESTAURADA ***
     * Valida digitado, se falhar, tenta corrigir acento e valida de novo.
     */
    function processarTentativa() {
        if (jogoAcabou) return;
        if (currentLetterIndex < TAMANHO_PALAVRA) { mostrarMensagem("Palavra incompleta!", 'error', 1200); agitarLinhaAtual(); return; }

        const palavraDigitada = boardState[currentRowIndex].join(''); // Uppercase, como digitado
        const palavraDigitadaLower = palavraDigitada.toLowerCase(); // Lowercase, como digitado

        messageArea.textContent = ''; messageArea.className = 'message-area';

        let palavraReal = ''; // Guarda a palavra final (lowercase, com acento se corrigido)

        // 1. Tenta validar EXATAMENTE o que foi digitado
        if (listaPalavrasValidasComAcento.has(palavraDigitadaLower)) {
            palavraReal = palavraDigitadaLower;
        }
        // 2. Se falhou, tenta CORRIGIR o acento usando o mapa
        else {
            const palavraBaseDigitada = removerAcentos(palavraDigitadaLower);
            // Verifica se a versão SEM acento existe no mapa de correção
            if (mapaSemAcentoParaComAcento.has(palavraBaseDigitada)) {
                // Pega a versão COM acento sugerida pelo mapa
                const palavraCorrigida = mapaSemAcentoParaComAcento.get(palavraBaseDigitada);
                // IMPORTANTE: Confirma se essa versão corrigida é REALMENTE válida
                if (listaPalavrasValidasComAcento.has(palavraCorrigida)) {
                    palavraReal = palavraCorrigida; // Usa a versão corrigida
                    console.log(`Auto-correção: ${palavraDigitadaLower} -> ${palavraReal}`);
                }
                // Se a palavra corrigida não estiver na lista (improvável, mas seguro verificar),
                // palavraReal continua vazia, resultando em erro.
            }
             // Se não achou nem direto nem no mapa, palavraReal continua vazia.
        }

        // 3. Se não encontrou palavra válida (nem digitada, nem corrigida)
        if (!palavraReal) {
            mostrarMensagem("Palavra não reconhecida!", 'error', 1500);
            agitarLinhaAtual();
            return;
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

        // 5. Calcula feedback comparando palavraRealUpper com palavraSecreta (ambas uppercase, com acentos)
        const feedbackCores = calcularFeedback(palavraRealUpper, palavraSecreta);

        // 6. Aplica animação de flip e cores
        aplicarFeedbackVisual(feedbackCores);

        // 7. Lógica de vitória/derrota/próxima linha (inalterada)
        if (palavraRealUpper === palavraSecreta) { /* ... Vitória ... */ jogoAcabou = true; const winningRow = document.getElementById(`row-${currentRowIndex}`); if (winningRow) { const cells = winningRow.children; for (let i = 0; i < cells.length; i++) { setTimeout(() => { if(cells[i]) { cells[i].style.setProperty('--dance-delay', `${i * 100}ms`); cells[i].classList.add('dance');}}, TAMANHO_PALAVRA * 250);} } setTimeout(() => { mostrarMensagem('Parabéns, você acertou!', 'win'); finalizarJogo(); }, TAMANHO_PALAVRA * 250 + 700); return; }
        currentRowIndex++; currentLetterIndex = 0;
        if (currentRowIndex >= NUM_TENTATIVAS) { /* ... Derrota ... */ jogoAcabou = true; setTimeout(() => { mostrarMensagem(`Fim de jogo! A palavra era: ${palavraSecreta}`, 'info'); finalizarJogo(); }, TAMANHO_PALAVRA * 250 + 100); }
    }


    // calcularFeedback (sem alterações - versão robusta mantida)
    function calcularFeedback(palavraTentadaUpper, palavraSecretaUpper) { /* ... (versão anterior robusta) ... */
        const feedback = Array(TAMANHO_PALAVRA).fill('absent'); const palavraSecretaArray = palavraSecretaUpper.split(''); const palavraTentadaArray = palavraTentadaUpper.split(''); const contagemLetrasSecreta = {}; for (const letra of palavraSecretaArray) { contagemLetrasSecreta[letra] = (contagemLetrasSecreta[letra] || 0) + 1; }
        for (let i = 0; i < TAMANHO_PALAVRA; i++) { if (palavraTentadaArray[i] === palavraSecretaArray[i]) { feedback[i] = 'correct'; if (contagemLetrasSecreta[palavraTentadaArray[i]] > 0) { contagemLetrasSecreta[palavraTentadaArray[i]]--; } } }
        for (let i = 0; i < TAMANHO_PALAVRA; i++) { if (feedback[i] !== 'correct') { const letraTentada = palavraTentadaArray[i]; if (contagemLetrasSecreta[letraTentada] > 0) { feedback[i] = 'present'; contagemLetrasSecreta[letraTentada]--; } } } return feedback;
    }

    // adicionarLetra (sem alterações)
    function adicionarLetra(letra) { /* ... */ if (jogoAcabou || currentLetterIndex >= TAMANHO_PALAVRA) return; const row = document.getElementById(`row-${currentRowIndex}`); if (!row || !row.children[currentLetterIndex]) return; const cell = row.children[currentLetterIndex]; letra = letra.toUpperCase(); if (/^[A-ZÇ]$/.test(letra)) { cell.textContent = letra; cell.classList.add('filled'); boardState[currentRowIndex][currentLetterIndex] = letra; currentLetterIndex++; } }

    // removerLetra (sem alterações)
    function removerLetra() { /* ... */ if (jogoAcabou || currentLetterIndex <= 0) return; currentLetterIndex--; const row = document.getElementById(`row-${currentRowIndex}`); if (!row || !row.children[currentLetterIndex]) return; const cell = row.children[currentLetterIndex]; cell.textContent = ''; cell.classList.remove('filled'); boardState[currentRowIndex][currentLetterIndex] = ''; }

    // finalizarJogo (sem alterações)
    function finalizarJogo() { /* ... */ resetButton.style.display = 'inline-block'; }

    // reiniciarJogo (sem alterações)
    function reiniciarJogo() { /* ... */ palavraSecreta = escolherPalavraSecreta(); if (!palavraSecreta || palavraSecreta === "ERRO") { mostrarMensagem("Erro ao iniciar novo jogo.", 'error'); jogoAcabou = true; return; } currentRowIndex = 0; currentLetterIndex = 0; jogoAcabou = false; boardState = Array(NUM_TENTATIVAS).fill(null).map(() => Array(TAMANHO_PALAVRA).fill('')); letterStatus = {}; messageArea.textContent = ''; messageArea.className = 'message-area'; resetButton.style.display = 'none'; if (gameBoard) gameBoard.innerHTML = ''; if (keyboardContainer) keyboardContainer.innerHTML = ''; criarTabuleiro(); criarTeclado(); atualizarCoresTeclado(); }

    // mostrarMensagem (sem alterações)
    function mostrarMensagem(texto, tipo = 'info', duracao = null) { /* ... */ messageArea.textContent = texto; messageArea.className = `message-area ${tipo}`; if (duracao) { setTimeout(() => { if (messageArea.textContent === texto) { messageArea.textContent = ''; messageArea.className = 'message-area';}}, duracao);} }

    // agitarLinhaAtual (sem alterações)
    function agitarLinhaAtual() { /* ... */ const row = document.getElementById(`row-${currentRowIndex}`); if (row) { row.classList.add('shake'); setTimeout(() => { row.classList.remove('shake'); }, 400); } }

    // --- Event Listeners (sem alterações) ---
    document.addEventListener('keydown', (event) => { if (jogoAcabou || listaPalavrasValidasComAcento.size === 0) return; const key = event.key.toUpperCase(); const isLetter = key.length === 1 && ((key >= 'A' && key <= 'Z') || key === 'Ç'); if (key === 'ENTER') processarTentativa(); else if (key === 'BACKSPACE') removerLetra(); else if (isLetter) adicionarLetra(key); });
    keyboardContainer.addEventListener('click', (event) => { if (jogoAcabou || listaPalavrasValidasComAcento.size === 0) return; const target = event.target; if (target.classList.contains('key')) { const key = target.dataset.key; if (key === 'ENTER') processarTentativa(); else if (key === 'BACKSPACE') removerLetra(); else if (key.length === 1 && key >= 'A' && key <= 'Z') adicionarLetra(key); } });
    resetButton.addEventListener('click', reiniciarJogo);

    // --- Inicialização ---
    (async () => { if (await carregarPalavras()) { reiniciarJogo(); } })();
});