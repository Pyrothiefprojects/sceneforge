const SceneManager = (() => {
    let scenes = [];
    let currentSceneId = null;

    function createScene(name, backgroundData, fileName) {
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
        const scene = {
            id,
            name,
            states: [{
                background: fileName || null,
                backgroundData: backgroundData || null,
                hotspots: []
            }],
            editingStateIndex: 0
        };
        scenes.push(scene);
        currentSceneId = id;
        return scene;
    }

    function removeScene(id) {
        scenes = scenes.filter(s => s.id !== id);
        if (currentSceneId === id) {
            currentSceneId = scenes.length > 0 ? scenes[0].id : null;
            const scene = getCurrentScene();
            if (scene) {
                const state = getCurrentState(scene);
                if (state && state.backgroundData) {
                    Canvas.loadImage(state.backgroundData);
                } else {
                    Canvas.render();
                }
            } else {
                Canvas.render();
            }
        }
    }

    function renameScene(id, newName) {
        const scene = getScene(id);
        if (scene) scene.name = newName;
    }

    function getCurrentScene() {
        return scenes.find(s => s.id === currentSceneId) || null;
    }

    function getScene(id) {
        return scenes.find(s => s.id === id) || null;
    }

    function getAllScenes() {
        return scenes;
    }

    // Get the active state for a scene (editor uses editingStateIndex)
    function getCurrentState(scene) {
        if (!scene || !scene.states || scene.states.length === 0) return null;
        const idx = scene.editingStateIndex || 0;
        return scene.states[idx] || scene.states[0];
    }

    // Get state by index for play mode
    function getState(scene, index) {
        if (!scene || !scene.states) return null;
        return scene.states[index] || scene.states[0];
    }

    function getStateCount(scene) {
        return scene && scene.states ? scene.states.length : 0;
    }

    function addState(sceneId, backgroundData, fileName) {
        const scene = getScene(sceneId);
        if (!scene) return;

        // Deep-copy hotspots from current state
        const currentState = getCurrentState(scene);
        const copiedHotspots = currentState
            ? JSON.parse(JSON.stringify(currentState.hotspots))
            : [];

        scene.states.push({
            background: fileName || null,
            backgroundData: backgroundData || null,
            hotspots: copiedHotspots
        });

        // Switch to the new state
        scene.editingStateIndex = scene.states.length - 1;
    }

    function removeState(sceneId, stateIndex) {
        const scene = getScene(sceneId);
        if (!scene || scene.states.length <= 1) return; // keep at least one
        scene.states.splice(stateIndex, 1);
        if (scene.editingStateIndex >= scene.states.length) {
            scene.editingStateIndex = scene.states.length - 1;
        }
    }

    function setEditingState(sceneId, index) {
        const scene = getScene(sceneId);
        if (!scene) return;
        if (index < 0 || index >= scene.states.length) return;
        scene.editingStateIndex = index;
        HotspotEditor.closePopover();
        const state = scene.states[index];
        if (state && state.backgroundData) {
            Canvas.loadImage(state.backgroundData);
        }
        Canvas.render();
    }

    function switchScene(id) {
        const scene = getScene(id);
        if (!scene) return;
        currentSceneId = id;
        HotspotEditor.closePopover();

        // In play mode, use runtime state; in edit mode, use editingStateIndex
        let stateIdx = scene.editingStateIndex || 0;
        if (typeof PlayMode !== 'undefined' && PlayMode.isActive()) {
            stateIdx = GameState.getSceneState(id);
        }
        const state = scene.states[stateIdx] || scene.states[0];
        if (state && state.backgroundData) {
            Canvas.loadImage(state.backgroundData);
        }
        Canvas.render();
        renderSceneList();
    }

    function renderSceneList() {
        const container = document.getElementById('scene-list');
        if (!container) return;

        if (scenes.length === 0) {
            container.innerHTML = '<span class="panel-label" style="color:var(--text-secondary); padding:8px 0;">No scenes loaded. Click "+ Add Scene" to get started.</span>';
            return;
        }

        container.innerHTML = scenes.map(s => {
            const stateIdx = s.editingStateIndex || 0;
            const state = s.states[stateIdx] || s.states[0];
            const stateCount = s.states.length;
            const hotspotCount = state ? state.hotspots.length : 0;

            return `
            <div class="scene-card ${s.id === currentSceneId ? 'active' : ''}" data-id="${s.id}" draggable="true">
                <div class="scene-thumb">
                    ${state && state.backgroundData
                        ? `<img src="${state.backgroundData}" alt="${s.name}" draggable="false">`
                        : '<span class="scene-thumb-empty">No image</span>'}
                </div>
                <div class="scene-card-info">
                    <input class="scene-card-name" value="${s.name}" data-id="${s.id}" spellcheck="false">
                    <span class="scene-card-meta">${hotspotCount} hotspot${hotspotCount !== 1 ? 's' : ''}${stateCount > 1 ? ' · State ' + (stateIdx + 1) + '/' + stateCount : ''}</span>
                    ${stateCount > 1 ? `
                    <div class="scene-state-nav">
                        <button class="scene-state-btn scene-state-prev" data-id="${s.id}" title="Previous state">&larr;</button>
                        <button class="scene-state-btn scene-state-next" data-id="${s.id}" title="Next state">&rarr;</button>
                        <button class="scene-state-btn scene-state-remove" data-id="${s.id}" title="Remove this state">&times;</button>
                    </div>` : ''}
                </div>
                <div class="scene-card-actions">
                    <button class="scene-card-edit-bg" data-id="${s.id}" title="Change background image">Edit</button>
                    <button class="scene-card-add-state" data-id="${s.id}" title="Add state">+State</button>
                    <button class="scene-card-delete" data-id="${s.id}" title="Remove scene">&times;</button>
                </div>
            </div>`;
        }).join('');

        // Drag and drop reordering
        let dragId = null;
        container.querySelectorAll('.scene-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                dragId = card.dataset.id;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                container.querySelectorAll('.scene-card').forEach(c => c.classList.remove('drag-over'));
                dragId = null;
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (card.dataset.id !== dragId) {
                    container.querySelectorAll('.scene-card').forEach(c => c.classList.remove('drag-over'));
                    card.classList.add('drag-over');
                }
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                if (!dragId || dragId === card.dataset.id) return;
                const fromIdx = scenes.findIndex(s => s.id === dragId);
                const toIdx = scenes.findIndex(s => s.id === card.dataset.id);
                if (fromIdx < 0 || toIdx < 0) return;
                const [moved] = scenes.splice(fromIdx, 1);
                scenes.splice(toIdx, 0, moved);
                renderSceneList();
            });
        });

        // Click card to switch scene
        container.querySelectorAll('.scene-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.scene-card-delete') ||
                    e.target.closest('.scene-card-add-state') ||
                    e.target.closest('.scene-card-edit-bg') ||
                    e.target.closest('.scene-state-nav') ||
                    e.target.classList.contains('scene-card-name')) return;
                switchScene(card.dataset.id);
            });
        });

        // Rename inline
        container.querySelectorAll('.scene-card-name').forEach(input => {
            input.addEventListener('change', () => {
                renameScene(input.dataset.id, input.value.trim());
            });
        });

        // Delete scene
        container.querySelectorAll('.scene-card-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                removeScene(btn.dataset.id);
                renderSceneList();
            });
        });

        // Add state
        container.querySelectorAll('.scene-card-add-state').forEach(btn => {
            btn.addEventListener('click', () => {
                const sceneId = btn.dataset.id;
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const path = 'assets/transitions/' + file.name;
                    addState(sceneId, path, file.name);
                    if (currentSceneId === sceneId) {
                        const scene = getScene(sceneId);
                        const state = getCurrentState(scene);
                        if (state && state.backgroundData) {
                            Canvas.loadImage(state.backgroundData);
                        }
                        Canvas.render();
                    }
                    renderSceneList();
                });
                input.click();
            });
        });

        // State navigation — previous
        container.querySelectorAll('.scene-state-prev').forEach(btn => {
            btn.addEventListener('click', () => {
                const scene = getScene(btn.dataset.id);
                if (!scene) return;
                const newIdx = (scene.editingStateIndex || 0) - 1;
                if (newIdx >= 0) {
                    setEditingState(scene.id, newIdx);
                    renderSceneList();
                }
            });
        });

        // State navigation — next
        container.querySelectorAll('.scene-state-next').forEach(btn => {
            btn.addEventListener('click', () => {
                const scene = getScene(btn.dataset.id);
                if (!scene) return;
                const newIdx = (scene.editingStateIndex || 0) + 1;
                if (newIdx < scene.states.length) {
                    setEditingState(scene.id, newIdx);
                    renderSceneList();
                }
            });
        });

        // Remove current state
        container.querySelectorAll('.scene-state-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const scene = getScene(btn.dataset.id);
                if (!scene || scene.states.length <= 1) return;
                removeState(scene.id, scene.editingStateIndex || 0);
                // Reload the now-active state's background
                const state = getCurrentState(scene);
                if (state && state.backgroundData) {
                    Canvas.loadImage(state.backgroundData);
                }
                Canvas.render();
                renderSceneList();
            });
        });

        // Edit background image for current state
        container.querySelectorAll('.scene-card-edit-bg').forEach(btn => {
            btn.addEventListener('click', () => {
                const scene = getScene(btn.dataset.id);
                if (!scene) return;
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const state = getCurrentState(scene);
                    if (!state) return;
                    const path = 'assets/transitions/' + file.name;
                    state.backgroundData = path;
                    state.background = file.name;
                    if (currentSceneId === scene.id) {
                        Canvas.loadImage(state.backgroundData);
                        Canvas.render();
                    }
                    renderSceneList();
                });
                input.click();
            });
        });
    }

    function exportJSON() {
        const data = {
            scenes: scenes.map(s => ({
                id: s.id,
                name: s.name,
                states: s.states,
                editingStateIndex: s.editingStateIndex || 0
            })),
            items: InventoryEditor.getAllItems(),
            puzzles: PuzzleEditor.getAllPuzzles(),
            gameState: GameState.getDefinedFlags(),
            progressionSteps: GameState.getSteps()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sceneforge-project.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importJSON(json) {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        if (data.scenes) {
            scenes = data.scenes.map(s => {
                // Migrate old format: no states array
                if (!s.states) {
                    return {
                        id: s.id,
                        name: s.name,
                        states: [{
                            background: s.background || null,
                            backgroundData: s.backgroundData || null,
                            hotspots: s.hotspots || []
                        }],
                        editingStateIndex: 0
                    };
                }
                return s;
            });
            if (scenes.length > 0) {
                switchScene(scenes[0].id);
            }
        }
        if (data.items) {
            InventoryEditor.loadItems(data.items);
        }
        if (data.puzzles) {
            PuzzleEditor.loadPuzzles(data.puzzles);
        }
        if (data.progressionSteps) {
            GameState.loadSteps(data.progressionSteps);
        }
        renderSceneList();
    }

    function initToolbar() {
        const addBtn = document.getElementById('scene-add');
        const fileInput = document.getElementById('scene-file-input');

        renderSceneList();

        addBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            const basePath = 'assets/transitions';

            let lastScene = null;
            files.forEach(file => {
                const name = file.name.replace(/\.[^.]+$/, '');
                const path = basePath + '/' + file.name;
                lastScene = createScene(name, path, file.name);
            });
            if (lastScene) {
                switchScene(lastScene.id);
                renderSceneList();
            }
            fileInput.value = '';
        });
    }

    return {
        createScene, removeScene, renameScene,
        getCurrentScene, getScene, getAllScenes,
        getCurrentState, getState, getStateCount,
        addState, removeState, setEditingState,
        switchScene, renderSceneList, exportJSON, importJSON, initToolbar
    };
})();
