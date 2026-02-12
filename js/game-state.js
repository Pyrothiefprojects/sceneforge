const GameState = (() => {
    let flags = {};
    let playerInventory = [];
    let progressionSteps = [];
    let itemUseCounts = {};
    let sceneStates = {};
    let puzzleStates = {};

    function setFlag(name, value = true) {
        flags[name] = value;
    }

    function getFlag(name) {
        return flags[name] || false;
    }

    function checkFlags(requiredFlags) {
        if (!requiredFlags || requiredFlags.length === 0) return true;
        return requiredFlags.every(f => flags[f]);
    }

    function addToInventory(itemId) {
        if (!playerInventory.includes(itemId)) {
            playerInventory.push(itemId);
        }
    }

    function removeFromInventory(itemId) {
        playerInventory = playerInventory.filter(id => id !== itemId);
    }

    function hasItem(itemId) {
        return playerInventory.includes(itemId);
    }

    function getInventory() {
        return [...playerInventory];
    }

    // -- Item Use Tracking --

    function useItem(itemId) {
        if (!itemUseCounts[itemId]) itemUseCounts[itemId] = 0;
        itemUseCounts[itemId]++;
        const item = InventoryEditor.getItem(itemId);
        if (!item) return;
        if (item.uses !== 'infinite' && itemUseCounts[itemId] >= (item.uses || 1)) {
            removeFromInventory(itemId);
        }
    }

    function reset() {
        flags = {};
        playerInventory = [];
        itemUseCounts = {};
        sceneStates = {};
        puzzleStates = {};
    }

    function setSceneState(sceneId, index) {
        sceneStates[sceneId] = index;
    }

    function getSceneState(sceneId) {
        return sceneStates[sceneId] || 0;
    }

    function setPuzzleState(puzzleId, index) {
        puzzleStates[puzzleId] = index;
    }

    function getPuzzleState(puzzleId) {
        return puzzleStates[puzzleId] || 0;
    }

    // -- Progression Steps --

    function addStep(flag, hint) {
        progressionSteps.push({ flag, hint });
    }

    function removeStep(index) {
        progressionSteps.splice(index, 1);
    }

    function moveStep(fromIdx, toIdx) {
        if (fromIdx < 0 || fromIdx >= progressionSteps.length) return;
        if (toIdx < 0 || toIdx >= progressionSteps.length) return;
        const [moved] = progressionSteps.splice(fromIdx, 1);
        progressionSteps.splice(toIdx, 0, moved);
    }

    function getSteps() {
        return progressionSteps;
    }

    function loadSteps(data) {
        progressionSteps = data || [];
    }

    function getNextHint() {
        for (const step of progressionSteps) {
            if (!flags[step.flag]) {
                return step.hint;
            }
        }
        return null;
    }

    function sanitizeName(str) {
        return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    }

    function getAutoFlag(hotspot) {
        if (!hotspot || !hotspot.action) return null;
        const name = sanitizeName(hotspot.name);
        if (!name) return null;

        switch (hotspot.action.type) {
            case 'clue':
                return 'examined_' + name;
            case 'navigate': {
                const target = hotspot.action.target ? SceneManager.getScene(hotspot.action.target) : null;
                return target ? 'visited_' + sanitizeName(target.name) : null;
            }
            case 'pickup': {
                const item = hotspot.action.itemId ? InventoryEditor.getItem(hotspot.action.itemId) : null;
                return item ? 'has_' + sanitizeName(item.name) : null;
            }
            case 'accepts_item': {
                const item = hotspot.action.requiredItemId ? InventoryEditor.getItem(hotspot.action.requiredItemId) : null;
                return item ? 'used_' + sanitizeName(item.name) + '_on_' + name : null;
            }
            case 'puzzle':
                return 'solved_' + name;
            default:
                return null;
        }
    }

    // -- Flag Discovery --

    function getDefinedFlags() {
        const allFlags = new Set();
        const scenes = SceneManager.getAllScenes();
        for (const scene of scenes) {
            for (const state of (scene.states || [])) {
                for (const hs of state.hotspots) {
                    const flag = getAutoFlag(hs);
                    if (flag) allFlags.add(flag);
                }
            }
        }
        // Scan puzzle assets and groups (all states)
        const puzzles = PuzzleEditor.getAllPuzzles();
        for (const puzzle of puzzles) {
            for (const state of (puzzle.states || [])) {
                for (const asset of (state.assets || [])) {
                    if (!asset.groupId) {
                        const flag = typeof PuzzleAssets !== 'undefined' ? PuzzleAssets.getAutoFlag(asset) : null;
                        if (flag) allFlags.add(flag);
                    }
                }
                for (const group of (state.assetGroups || [])) {
                    const flag = typeof PuzzleAssets !== 'undefined' ? PuzzleAssets.getGroupAutoFlag(group) : null;
                    if (flag) allFlags.add(flag);
                }
                for (const hotspot of (state.hotspots || [])) {
                    const f = getAutoFlag(hotspot);
                    if (f) allFlags.add(f);
                }
            }
        }
        return Array.from(allFlags);
    }

    // -- Rendering --

    function renderFlagsPanel() {
        const container = document.getElementById('flags-container');
        if (!container) return;

        const definedFlags = getDefinedFlags();
        if (definedFlags.length === 0) {
            container.innerHTML = '<span class="panel-label" style="color: var(--text-secondary)">No flags defined yet</span>';
            return;
        }

        container.innerHTML = definedFlags.map(f => `
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                <input type="checkbox" data-flag="${f}" ${flags[f] ? 'checked' : ''}
                       style="accent-color: var(--accent-orange);">
                <span style="font-size:12px; color:var(--accent-gold);">${f}</span>
            </label>
        `).join('');

        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                setFlag(cb.dataset.flag, cb.checked);
            });
        });
    }

    function renderProgressionPanel() {
        const container = document.getElementById('progression-container');
        if (!container) return;

        const definedFlags = getDefinedFlags();

        let html = '<div class="progression-header">';
        html += '<span class="panel-label">Steps</span>';
        html += '<button id="progression-add" class="panel-btn primary">+ Add</button>';
        html += '</div>';

        if (progressionSteps.length === 0) {
            html += '<span style="color:var(--text-secondary); font-size:11px;">No steps yet.</span>';
        } else {
            html += '<div class="progression-list">';
            html += progressionSteps.map((step, i) => `
                <div class="progression-step" data-index="${i}" draggable="true">
                    <span class="progression-num">${i + 1}</span>
                    <select class="panel-select progression-flag" data-index="${i}">
                        <option value="">-- Flag --</option>
                        ${definedFlags.map(f => `<option value="${f}" ${step.flag === f ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                    <input class="panel-input progression-hint" data-index="${i}" value="${step.hint}" placeholder="Hint text...">
                    <div class="progression-actions">
                        <button class="progression-move-up" data-index="${i}" title="Move up">&uarr;</button>
                        <button class="progression-move-down" data-index="${i}" title="Move down">&darr;</button>
                        <button class="progression-remove" data-index="${i}" title="Remove">&times;</button>
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }

        container.innerHTML = html;

        // Add step
        const addBtn = container.querySelector('#progression-add');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                addStep('', 'Try looking around...');
                renderProgressionPanel();
            });
        }

        // Flag select change
        container.querySelectorAll('.progression-flag').forEach(sel => {
            sel.addEventListener('change', () => {
                const idx = parseInt(sel.dataset.index);
                progressionSteps[idx].flag = sel.value;
            });
        });

        // Hint input change
        container.querySelectorAll('.progression-hint').forEach(input => {
            input.addEventListener('input', () => {
                const idx = parseInt(input.dataset.index);
                progressionSteps[idx].hint = input.value;
            });
        });

        // Move up
        container.querySelectorAll('.progression-move-up').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                if (idx > 0) {
                    moveStep(idx, idx - 1);
                    renderProgressionPanel();
                }
            });
        });

        // Move down
        container.querySelectorAll('.progression-move-down').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                if (idx < progressionSteps.length - 1) {
                    moveStep(idx, idx + 1);
                    renderProgressionPanel();
                }
            });
        });

        // Remove
        container.querySelectorAll('.progression-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                removeStep(idx);
                renderProgressionPanel();
            });
        });

        // Drag and drop reordering
        let dragIdx = null;
        container.querySelectorAll('.progression-step').forEach(step => {
            step.addEventListener('dragstart', (e) => {
                dragIdx = parseInt(step.dataset.index);
                step.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            step.addEventListener('dragend', () => {
                step.classList.remove('dragging');
                container.querySelectorAll('.progression-step').forEach(s => s.classList.remove('drag-over'));
                dragIdx = null;
            });
            step.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const targetIdx = parseInt(step.dataset.index);
                if (targetIdx !== dragIdx) {
                    container.querySelectorAll('.progression-step').forEach(s => s.classList.remove('drag-over'));
                    step.classList.add('drag-over');
                }
            });
            step.addEventListener('dragleave', () => {
                step.classList.remove('drag-over');
            });
            step.addEventListener('drop', (e) => {
                e.preventDefault();
                step.classList.remove('drag-over');
                const targetIdx = parseInt(step.dataset.index);
                if (dragIdx !== null && dragIdx !== targetIdx) {
                    moveStep(dragIdx, targetIdx);
                    renderProgressionPanel();
                }
            });
        });
    }

    function renderOverviewPanel() {
        const container = document.getElementById('overview-container');
        if (!container) return;

        const scenes = SceneManager.getAllScenes();
        const items = InventoryEditor.getAllItems();

        let html = '<span class="panel-label">Level Overview</span>';

        // Scenes + hotspots
        if (scenes.length === 0) {
            html += '<div class="overview-empty">No scenes defined.</div>';
        } else {
            html += '<div class="overview-scenes">';
            for (const scene of scenes) {
                html += `<div class="overview-scene">`;
                html += `<div class="overview-scene-name">${scene.name}${scene.states && scene.states.length > 1 ? ' <span class="overview-state-count">(' + scene.states.length + ' states)</span>' : ''}</div>`;
                const allHotspots = [];
                for (const state of (scene.states || [])) {
                    for (const hs of state.hotspots) {
                        if (!allHotspots.find(h => h.id === hs.id)) {
                            allHotspots.push(hs);
                        }
                    }
                }
                if (allHotspots.length === 0) {
                    html += '<div class="overview-detail">No hotspots</div>';
                } else {
                    html += '<div class="overview-hotspots">';
                    for (const hs of allHotspots) {
                        const actionLabel = formatActionLabel(hs.action);
                        const autoFlag = getAutoFlag(hs);
                        const flagInfo = [];
                        if (hs.requires && hs.requires.length > 0) flagInfo.push('req: ' + hs.requires.join(', '));
                        if (autoFlag) flagInfo.push('→ ' + autoFlag);
                        html += `<div class="overview-hotspot">`;
                        html += `<span class="overview-hotspot-name">${hs.name || '(unnamed)'}</span>`;
                        html += `<span class="overview-hotspot-action">${actionLabel}</span>`;
                        if (flagInfo.length > 0) {
                            html += `<span class="overview-hotspot-flags">${flagInfo.join(' | ')}</span>`;
                        }
                        html += `</div>`;
                    }
                    html += '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
        }

        // Items
        if (items.length > 0) {
            html += '<div class="overview-divider"></div>';
            html += '<span class="panel-label">Items</span>';
            html += '<div class="overview-items">';
            for (const item of items) {
                html += `<span class="overview-item">${item.image ? '<img src="' + item.image + '" class="overview-item-icon">' : ''}${item.name}</span>`;
            }
            html += '</div>';
        }

        // Puzzles
        const puzzles = PuzzleEditor.getAllPuzzles();
        if (puzzles.length > 0) {
            html += '<div class="overview-divider"></div>';
            html += '<span class="panel-label">Puzzles</span>';
            html += '<div class="overview-items">';
            for (const p of puzzles) {
                const tags = [];
                if (p.isClue) tags.push('Clue');
                if (p.rewardItemId) {
                    const item = InventoryEditor.getItem(p.rewardItemId);
                    tags.push(item ? item.name : 'Item');
                }
                if (p.rewardSceneState && p.rewardSceneState.sceneId) {
                    const scene = SceneManager.getScene(p.rewardSceneState.sceneId);
                    tags.push('→ ' + (scene ? scene.name : '?') + ' state ' + ((p.rewardSceneState.stateIndex || 0) + 1));
                }
                html += `<span class="overview-item">${p.name}${tags.length > 0 ? ' <span class="overview-puzzle-tags">[' + tags.join(', ') + ']</span>' : ''}</span>`;
            }
            html += '</div>';
        }

        container.innerHTML = html;
    }

    function formatActionLabel(action) {
        if (!action || action.type === 'none') return '—';
        switch (action.type) {
            case 'clue': return 'Clue' + (action.text ? ': "' + action.text.substring(0, 30) + (action.text.length > 30 ? '...' : '') + '"' : '');
            case 'navigate': {
                const target = action.target ? SceneManager.getScene(action.target) : null;
                return 'Navigate → ' + (target ? target.name : '?');
            }
            case 'pickup': {
                const item = action.itemId ? InventoryEditor.getItem(action.itemId) : null;
                return 'Pick up: ' + (item ? item.name : '?');
            }
            case 'accepts_item': {
                const item = action.requiredItemId ? InventoryEditor.getItem(action.requiredItemId) : null;
                return 'Accepts: ' + (item ? item.name : '?');
            }
            case 'puzzle': {
                const puzzle = action.puzzleId ? PuzzleEditor.getPuzzle(action.puzzleId) : null;
                return 'Puzzle: ' + (puzzle ? puzzle.name : '?');
            }
            default: return action.type;
        }
    }

    function initToolbar() {
        renderFlagsPanel();
        renderProgressionPanel();
        renderOverviewPanel();

        const resetBtn = document.getElementById('state-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                reset();
                renderFlagsPanel();
            });
        }
    }

    return {
        setFlag, getFlag, checkFlags,
        addToInventory, removeFromInventory, hasItem, getInventory,
        useItem, reset, getDefinedFlags, getAutoFlag, sanitizeName,
        setSceneState, getSceneState,
        setPuzzleState, getPuzzleState,
        renderFlagsPanel, initToolbar,
        addStep, removeStep, moveStep, getSteps, loadSteps, getNextHint
    };
})();
