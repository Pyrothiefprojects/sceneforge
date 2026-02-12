PuzzleAssets.registerType({
    type: 'combo_lock',
    label: 'Combo Lock',

    create(x, y) {
        return {
            id: 'asset_' + Date.now(),
            type: 'combo_lock',
            x, y,
            name: '',
            correctValue: 0,
            action: { type: 'clue', text: '' },
            requires: []
        };
    },

    render(asset, editMode) {
        const val = asset._currentValue != null ? asset._currentValue : 0;
        const solved = asset._solved || false;

        if (editMode) {
            return `
                <div class="combo-lock edit-mode">
                    <div class="combo-lock-dial">
                        <button class="combo-lock-arrow" disabled>&lsaquo;</button>
                        <span class="combo-lock-number">${asset.correctValue}</span>
                        <button class="combo-lock-arrow" disabled>&rsaquo;</button>
                    </div>
                    <div class="combo-lock-label">${asset.name || 'combo lock'}</div>
                </div>`;
        }

        return `
            <div class="combo-lock ${solved ? 'solved' : ''}">
                <div class="combo-lock-dial">
                    <button class="combo-lock-arrow combo-lock-left" data-asset="${asset.id}" ${solved ? 'disabled' : ''}>&lsaquo;</button>
                    <span class="combo-lock-number">${val}</span>
                    <button class="combo-lock-arrow combo-lock-right" data-asset="${asset.id}" ${solved ? 'disabled' : ''}>&rsaquo;</button>
                </div>
            </div>`;
    },

    bindPlay(el, asset) {
        const leftBtn = el.querySelector('.combo-lock-left');
        const rightBtn = el.querySelector('.combo-lock-right');
        const numDisplay = el.querySelector('.combo-lock-number');

        if (asset._currentValue == null) asset._currentValue = 0;

        leftBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (asset._solved) return;
            asset._currentValue = (asset._currentValue - 1 + 10) % 10;
            numDisplay.textContent = asset._currentValue;
        });

        rightBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (asset._solved) return;
            asset._currentValue = (asset._currentValue + 1) % 10;
            numDisplay.textContent = asset._currentValue;
        });
    },

    checkSolved(asset) {
        const current = asset._currentValue != null ? asset._currentValue : 0;
        return current === asset.correctValue;
    },

    markSolved(el, asset) {
        const lock = el.querySelector('.combo-lock');
        if (lock) lock.classList.add('solved');
        el.querySelectorAll('.combo-lock-arrow').forEach(btn => btn.disabled = true);
    },

    resetRuntime(asset) {
        delete asset._currentValue;
    },

    popoverFields(asset) {
        return `
            <div class="popover-field">
                <label>Correct Value (0-9)</label>
                <input class="panel-input" id="asset-pop-value" type="number" min="0" max="9" value="${asset.correctValue}">
            </div>`;
    },

    bindPopover(popoverEl, asset, getEl) {
        const valueInput = popoverEl.querySelector('#asset-pop-value');
        if (!valueInput) return;

        valueInput.addEventListener('input', () => {
            const v = parseInt(valueInput.value);
            if (v >= 0 && v <= 9) {
                asset.correctValue = v;
                const assetEl = getEl();
                if (assetEl) {
                    const num = assetEl.querySelector('.combo-lock-number');
                    if (num) num.textContent = v;
                }
            }
        });

        // Also keep the label in sync with the name input
        const nameInput = popoverEl.querySelector('#asset-pop-name');
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                const assetEl = getEl();
                if (assetEl) {
                    const label = assetEl.querySelector('.combo-lock-label');
                    if (label) label.textContent = asset.name || 'combo lock';
                }
            });
        }
    }
});
