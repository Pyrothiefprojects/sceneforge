PuzzleAssets.registerType({
    type: 'console_terminal',
    label: 'Console Terminal',

    create(x, y) {
        return {
            id: 'asset_' + Date.now(),
            type: 'console_terminal',
            x, y,
            name: '',
            correctCommand: '',
            promptText: '>',
            errorText: 'ACCESS DENIED',
            successText: 'ACCESS GRANTED',
            action: { type: 'clue', text: '' },
            requires: []
        };
    },

    render(asset, editMode) {
        const solved = asset._solved || false;

        if (editMode) {
            return `
                <div class="console-terminal edit-mode">
                    <div class="console-terminal-screen">
                        <div class="console-terminal-output">SYSTEM READY</div>
                        <div class="console-terminal-prompt">
                            <span class="console-terminal-prompt-char">${asset.promptText || '>'}</span>
                            <span class="console-terminal-cursor">_</span>
                        </div>
                    </div>
                    <div class="console-terminal-label">${asset.name || 'terminal'}</div>
                </div>`;
        }

        return `
            <div class="console-terminal ${solved ? 'solved' : ''}">
                <div class="console-terminal-screen">
                    <div class="console-terminal-history"></div>
                    <div class="console-terminal-prompt" ${solved ? 'style="display:none"' : ''}>
                        <span class="console-terminal-prompt-char">${asset.promptText || '>'}</span>
                        <input class="console-terminal-input" type="text" autocomplete="off" spellcheck="false" ${solved ? 'disabled' : ''}>
                    </div>
                </div>
            </div>`;
    },

    bindPlay(el, asset) {
        const input = el.querySelector('.console-terminal-input');
        const history = el.querySelector('.console-terminal-history');
        if (!input || !history) return;

        // Focus input when clicking anywhere on the terminal
        el.querySelector('.console-terminal-screen').addEventListener('click', (e) => {
            e.stopPropagation();
            if (!asset._solved) input.focus();
        });

        input.addEventListener('click', (e) => e.stopPropagation());

        input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.stopPropagation();

            const cmd = input.value.trim();
            if (!cmd) return;
            input.value = '';

            // Add command to history
            const line = document.createElement('div');
            line.className = 'console-terminal-line';
            line.textContent = (asset.promptText || '>') + ' ' + cmd;
            history.appendChild(line);

            // Check if correct
            if (cmd.toLowerCase() === (asset.correctCommand || '').toLowerCase()) {
                const success = document.createElement('div');
                success.className = 'console-terminal-line console-terminal-success';
                success.textContent = asset.successText || 'ACCESS GRANTED';
                history.appendChild(success);
                asset._solved = true;
                input.disabled = true;
                input.closest('.console-terminal-prompt').style.display = 'none';
            } else {
                const err = document.createElement('div');
                err.className = 'console-terminal-line console-terminal-error';
                err.textContent = asset.errorText || 'ACCESS DENIED';
                history.appendChild(err);
            }

            // Scroll to bottom
            history.scrollTop = history.scrollHeight;
        });
    },

    checkSolved(asset) {
        return asset._solved || false;
    },

    markSolved(el, asset) {
        const terminal = el.querySelector('.console-terminal');
        if (terminal) terminal.classList.add('solved');
        const input = el.querySelector('.console-terminal-input');
        if (input) input.disabled = true;
    },

    resetRuntime(asset) {
        delete asset._solved;
    },

    popoverFields(asset) {
        return `
            <div class="popover-field">
                <label>Correct Command</label>
                <input class="panel-input" id="asset-pop-command" value="${asset.correctCommand || ''}" placeholder="e.g. UNLOCK">
            </div>
            <div class="popover-field">
                <label>Prompt Character</label>
                <input class="panel-input" id="asset-pop-prompt" value="${asset.promptText || '>'}" placeholder=">">
            </div>
            <div class="popover-field">
                <label>Error Text</label>
                <input class="panel-input" id="asset-pop-error" value="${asset.errorText || ''}" placeholder="ACCESS DENIED">
            </div>
            <div class="popover-field">
                <label>Success Text</label>
                <input class="panel-input" id="asset-pop-success" value="${asset.successText || ''}" placeholder="ACCESS GRANTED">
            </div>`;
    },

    bindPopover(popoverEl, asset, getEl) {
        const cmdInput = popoverEl.querySelector('#asset-pop-command');
        const promptInput = popoverEl.querySelector('#asset-pop-prompt');
        const errorInput = popoverEl.querySelector('#asset-pop-error');
        const successInput = popoverEl.querySelector('#asset-pop-success');

        if (cmdInput) {
            cmdInput.addEventListener('input', () => {
                asset.correctCommand = cmdInput.value;
            });
        }

        if (promptInput) {
            promptInput.addEventListener('input', () => {
                asset.promptText = promptInput.value;
                const assetEl = getEl();
                if (assetEl) {
                    const p = assetEl.querySelector('.console-terminal-prompt-char');
                    if (p) p.textContent = promptInput.value || '>';
                }
            });
        }

        if (errorInput) {
            errorInput.addEventListener('input', () => {
                asset.errorText = errorInput.value;
            });
        }

        if (successInput) {
            successInput.addEventListener('input', () => {
                asset.successText = successInput.value;
            });
        }

        // Keep label in sync
        const nameInput = popoverEl.querySelector('#asset-pop-name');
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                const assetEl = getEl();
                if (assetEl) {
                    const label = assetEl.querySelector('.console-terminal-label');
                    if (label) label.textContent = asset.name || 'terminal';
                }
            });
        }
    }
});
