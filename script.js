document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos e Variáveis (sem alterações iniciais) ---
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
    let letterStatus = {}; // Armazenará status usando LETRA BASE como chave (e.g., 'A')
    let listaPalavrasValidasComAcento = new Set();
    let mapaSemAcentoParaComAcento = new Map();
    let listaPalavrasPossiveisSecreta = [];

    // --- Funções Auxiliares ---
    function removerAcentos(str) { if (str === null || typeof str === 'undefined') return ''; return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

    // --- Funções Principais ---

    // carregarPalavras (Inalterada - com filtro de conflito)
    async function carregarPalavras() {
        loadingMessage.style.display = 'block';
        gameBoard.style.display = 'none'; keyboardContainer.style.display = 'none';
        messageArea.textContent = '';
        try {
            const response = await fetch('palavras_com_acento.txt');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            const text = await response.text();
            const todasPalavras = text.split('\n').map(p => p.trim().toLowerCase()).filter(p => p.length > 0);
            listaPalavrasValidasComAcento = new Set(todasPalavras);
            mapaSemAcentoParaComAcento.clear(); listaPalavrasPossiveisSecreta = [];
            const palavrasBaseConflitantes = new Set(); const mapaTemporarioBaseParaOriginais = new Map();
            for (const pComAcento of todasPalavras) {
                const pBase = removerAcentos(pComAcento);
                if (!mapaTemporarioBaseParaOriginais.has(pBase)) { mapaTemporarioBaseParaOriginais.set(pBase, new Set()); }
                mapaTemporarioBaseParaOriginais.get(pBase).add(pComAcento);
                if (mapaTemporarioBaseParaOriginais.get(pBase).size > 1) { palavrasBaseConflitantes.add(pBase); }
                if (pComAcento !== pBase) { mapaSemAcentoParaComAcento.set(pBase, pComAcento); }
            }
            for (const pComAcento of todasPalavras) {
                if (pComAcento.length === TAMANHO_PALAVRA && /^[a-zà-úç]+$/.test(pComAcento)) {
                    const pBase = removerAcentos(pComAcento);
                    if (!palavrasBaseConflitantes.has(pBase)) { listaPalavrasPossiveisSecreta.push(pComAcento); }
                }
            }
            if (listaPalavrasPossiveisSecreta.length === 0) throw new Error("Nenhuma palavra SEGURA de 5 letras encontrada para sorteio.");
            console.log(`Válidas: ${listaPalavrasValidasComAcento.size}, Mapa: ${mapaSemAcentoParaComAcento.size}, Conflitantes: ${palavrasBaseConflitantes.size}, Seguras Sorteio: ${listaPalavrasPossiveisSecreta.length}`);
            return true;
        } catch (error) { console.error("Falha ao carregar/processar palavras:", error); messageArea.textContent = `Erro crítico: ${error.message}`; messageArea.className = 'message-area error'; return false;
        } finally { loadingMessage.style.display = 'none'; }
    }

    // escolherPalavraSecreta (Inalterada)
    function escolherPalavraSecreta() { if (listaPalavrasPossiveisSecreta.length === 0) return "ERRO"; const i = Math.floor(Math.random() * listaPalavrasPossiveisSecreta.length); return listaPalavrasPossiveisSecreta[i].toUpperCase(); }

    // criarTabuleiro (Inalterada)
    function criarTabuleiro() { gameBoard.innerHTML = ''; for (let i = 0; i < NUM_TENTATIVAS; i++) { const r = document.createElement('div'); r.classList.add('row'); r.id = `row-${i}`; for (let j = 0; j < TAMANHO_PALAVRA; j++) { const c = document.createElement('div'); c.classList.add('cell'); c.id = `cell-${i}-${j}`; r.appendChild(c); } gameBoard.appendChild(r); } gameBoard.style.display = 'grid'; }

    // criarTeclado (Inalterada)
    function criarTeclado() { keyboardContainer.innerHTML = ''; const l = [ "QWERTYUIOP", "ASDFGHJKL", "BACKSPACE ZXC VBNM ENTER" ]; l.forEach(ln => { const rd = document.createElement('div'); rd.classList.add('keyboard-row'); const t = ln.split(' '); t.forEach(s => { if (s === "ENTER" || s === "BACKSPACE") { const k=document.createElement('button'); k.classList.add('key', 'large'); k.textContent=s; k.dataset.key=s; rd.appendChild(k); } else { for (const lt of s) { const k=document.createElement('button'); k.classList.add('key'); k.textContent=lt; k.dataset.key=lt; rd.appendChild(k); } } }); keyboardContainer.appendChild(rd); }); keyboardContainer.style.display = 'flex'; }


    /**
     * *** aplicarFeedbackVisual CORRIGIDO ***
     * Aplica estilos às células e atualiza o letterStatus usando a LETRA BASE como chave.
     */
    function aplicarFeedbackVisual(feedbackCores) {
        const row = document.getElementById(`row-${currentRowIndex}`);
        const cells = row.children;
        for (let i = 0; i < TAMANHO_PALAVRA; i++) {
            const cell = cells[i]; if (!cell) continue;
            const letterDisplayed = cell.textContent; // Letra COM acento, se houver (e.g., 'Á')
            const letterBase = removerAcentos(letterDisplayed).toUpperCase(); // Letra BASE (e.g., 'A')
            const status = feedbackCores[i]; // 'correct', 'present', ou 'absent'

            setTimeout(() => {
                if (!cell) return;
                cell.classList.add('reveal', status);

                // --- Atualiza letterStatus usando a LETRA BASE ---
                const currentBaseStatus = letterStatus[letterBase]; // Pega status atual da letra BASE

                // Aplica prioridade: Correct > Present > Absent
                if (status === 'correct' ||
                   (status === 'present' && currentBaseStatus !== 'correct') ||
                   (status === 'absent' && !currentBaseStatus) // Só atualiza para absent se não houver status melhor
                   ) {
                    letterStatus[letterBase] = status; // Armazena o novo status para a LETRA BASE
                }
                // -------------------------------------------------

            }, i * 250);
        }
        // Chama a atualização do teclado DEPOIS que os timeouts forem iniciados
        setTimeout(atualizarCoresTeclado, TAMANHO_PALAVRA * 250 + 50);
    }


    /**
     * *** atualizarCoresTeclado CORRIGIDO E SIMPLIFICADO ***
     * Lê o status diretamente do letterStatus usando a letra base da tecla.
     */
    function atualizarCoresTeclado() {
        const keys = keyboardContainer.querySelectorAll('.key');
        keys.forEach(key => {
            const keyLetter = key.dataset.key; // Letra base da tecla (e.g., 'A', 'B', 'C')
            if (keyLetter === "ENTER" || keyLetter === "BACKSPACE") return; // Ignora Enter/Backspace

            // --- Busca direta no letterStatus pela letra base ---
            const status = letterStatus[keyLetter];
            // ---------------------------------------------------

            key.classList.remove('correct', 'present', 'absent'); // Limpa classes antigas
            if (status) {
                key.classList.add(status); // Aplica a classe correspondente ao status encontrado
            }
        });
    }


    // processarTentativa (Inalterada - usa auto-correção)
    function processarTentativa() {
        if (jogoAcabou) return; if (currentLetterIndex < TAMANHO_PALAVRA) { mostrarMensagem("Palavra incompleta!", 'error', 1200); agitarLinhaAtual(); return; }
        const pDigitada = boardState[currentRowIndex].join(''); const pDigitadaLower = pDigitada.toLowerCase();
        messageArea.textContent = ''; messageArea.className = 'message-area'; let pReal = '';
        if (listaPalavrasValidasComAcento.has(pDigitadaLower)) { pReal = pDigitadaLower; } else { const pBase = removerAcentos(pDigitadaLower); if (mapaSemAcentoParaComAcento.has(pBase)) { const pCorrigida = mapaSemAcentoParaComAcento.get(pBase); if (listaPalavrasValidasComAcento.has(pCorrigida)) { pReal = pCorrigida; console.log(`Corrigido: ${pDigitadaLower} -> ${pReal}`); } } }
        if (!pReal) { mostrarMensagem("Palavra não reconhecida!", 'error', 1500); agitarLinhaAtual(); return; }
        const pRealUpper = pReal.toUpperCase(); const currentRow = document.getElementById(`row-${currentRowIndex}`);
        if (currentRow) { const cells = currentRow.children; for (let i = 0; i < TAMANHO_PALAVRA; i++) { if (cells[i]) { cells[i].textContent = pRealUpper[i]; boardState[currentRowIndex][i] = pRealUpper[i]; } } }
        const feedback = calcularFeedback(pRealUpper, palavraSecreta);
        aplicarFeedbackVisual(feedback); // Chama a função corrigida
        if (pRealUpper === palavraSecreta) { jogoAcabou = true; const wr = document.getElementById(`row-${currentRowIndex}`); if (wr) { const c = wr.children; for (let i=0; i<c.length; i++) { setTimeout(() => { if(c[i]) { c[i].style.setProperty('--dance-delay', `${i*100}ms`); c[i].classList.add('dance');}}, TAMANHO_PALAVRA*250);}} setTimeout(() => { mostrarMensagem('Parabéns, você acertou!', 'win'); finalizarJogo(); }, TAMANHO_PALAVRA*250+700); return; }
        currentRowIndex++; currentLetterIndex = 0;
        if (currentRowIndex >= NUM_TENTATIVAS) { jogoAcabou = true; setTimeout(() => { mostrarMensagem(`Fim de jogo! A palavra era: ${palavraSecreta}`, 'info'); finalizarJogo(); }, TAMANHO_PALAVRA*250+100); }
    }

    // calcularFeedback (Inalterada - versão flexível com acento)
    function calcularFeedback(palavraTentadaUpper, palavraSecretaUpper) {
        const feedback = Array(TAMANHO_PALAVRA).fill('absent');
        const palavraTentadaBase = removerAcentos(palavraTentadaUpper).split('');
        const palavraSecretaBase = removerAcentos(palavraSecretaUpper).split('');
        const contagemLetrasSecretaBase = {};
        for (const letraBase of palavraSecretaBase) { contagemLetrasSecretaBase[letraBase] = (contagemLetrasSecretaBase[letraBase] || 0) + 1; }
        for (let i = 0; i < TAMANHO_PALAVRA; i++) { if (palavraTentadaBase[i] === palavraSecretaBase[i]) { feedback[i] = 'correct'; if (contagemLetrasSecretaBase[palavraTentadaBase[i]] > 0) { contagemLetrasSecretaBase[palavraTentadaBase[i]]--; } } }
        for (let i = 0; i < TAMANHO_PALAVRA; i++) { if (feedback[i] !== 'correct') { const letraTentadaBase = palavraTentadaBase[i]; if (contagemLetrasSecretaBase[letraTentadaBase] > 0) { feedback[i] = 'present'; contagemLetrasSecretaBase[letraTentadaBase]--; } } }
        return feedback;
    }

    // adicionarLetra (Inalterada)
    function adicionarLetra(l) { if (jogoAcabou || currentLetterIndex >= TAMANHO_PALAVRA) return; const r = document.getElementById(`row-${currentRowIndex}`); if (!r || !r.children[currentLetterIndex]) return; const c = r.children[currentLetterIndex]; l = l.toUpperCase(); if (/^[A-ZÇ]$/.test(l)) { c.textContent = l; c.classList.add('filled'); boardState[currentRowIndex][currentLetterIndex] = l; currentLetterIndex++; } }

    // removerLetra (Inalterada)
    function removerLetra() { if (jogoAcabou || currentLetterIndex <= 0) return; currentLetterIndex--; const r = document.getElementById(`row-${currentRowIndex}`); if (!r || !r.children[currentLetterIndex]) return; const c = r.children[currentLetterIndex]; c.textContent = ''; c.classList.remove('filled'); boardState[currentRowIndex][currentLetterIndex] = ''; }

    // finalizarJogo (Inalterada)
    function finalizarJogo() { resetButton.style.display = 'inline-block'; }

    // reiniciarJogo (Inalterada)
    function reiniciarJogo() { palavraSecreta = escolherPalavraSecreta(); if (!palavraSecreta || palavraSecreta === "ERRO") { mostrarMensagem("Erro ao iniciar novo jogo.", 'error'); jogoAcabou = true; return; } currentRowIndex = 0; currentLetterIndex = 0; jogoAcabou = false; boardState = Array(NUM_TENTATIVAS).fill(null).map(() => Array(TAMANHO_PALAVRA).fill('')); letterStatus = {}; messageArea.textContent = ''; messageArea.className = 'message-area'; resetButton.style.display = 'none'; if (gameBoard) gameBoard.innerHTML = ''; if (keyboardContainer) keyboardContainer.innerHTML = ''; criarTabuleiro(); criarTeclado(); atualizarCoresTeclado(); }

    // mostrarMensagem (Inalterada)
    function mostrarMensagem(t, tipo='info', dur=null) { messageArea.textContent = t; messageArea.className = `message-area ${tipo}`; if (dur) { setTimeout(() => { if (messageArea.textContent === t) { messageArea.textContent = ''; messageArea.className = 'message-area';}}, dur);} }

    // agitarLinhaAtual (Inalterada)
    function agitarLinhaAtual() { const r = document.getElementById(`row-${currentRowIndex}`); if (r) { r.classList.add('shake'); setTimeout(() => { r.classList.remove('shake'); }, 400); } }

    // --- Event Listeners (Inalterados) ---
    document.addEventListener('keydown', (e) => { if (jogoAcabou || listaPalavrasValidasComAcento.size === 0) return; const key = e.key.toUpperCase(); const isL = key.length === 1 && ((key >= 'A' && key <= 'Z') || key === 'Ç'); if (key === 'ENTER') processarTentativa(); else if (key === 'BACKSPACE') removerLetra(); else if (isL) adicionarLetra(key); });
    keyboardContainer.addEventListener('click', (e) => { if (jogoAcabou || listaPalavrasValidasComAcento.size === 0) return; const t = e.target; if (t.classList.contains('key')) { const key = t.dataset.key; if (key === 'ENTER') processarTentativa(); else if (key === 'BACKSPACE') removerLetra(); else if (key.length === 1 && key >= 'A' && key <= 'Z') adicionarLetra(key); } });
    resetButton.addEventListener('click', reiniciarJogo);

    // --- Inicialização ---
    (async () => { if (await carregarPalavras()) { reiniciarJogo(); } })();
});