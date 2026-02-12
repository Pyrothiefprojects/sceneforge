const Toolbar = (() => {
    let activeSection = null;
    const panel = document.getElementById('toolbar-panel');
    const toolbarEl = document.getElementById('toolbar');
    const modeToggle = document.getElementById('mode-toggle');
    const viewport = document.getElementById('viewport');
    const editorSections = document.getElementById('editor-sections');
    const playInventoryBtn = document.getElementById('play-inventory-btn');
    const playHintBtn = document.getElementById('play-hint-btn');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const exportBtn = document.getElementById('export-btn');
    const jsonInput = document.getElementById('json-file-input');

    const sectionButtons = document.querySelectorAll('.toolbar-btn[data-section]');

    const sections = {
        scene: {
            render() {
                return `
                    <div class="panel-section visible" data-panel="scene">
                        <div class="scene-panel-top">
                            <span class="panel-label">Scenes</span>
                            <button id="scene-add" class="panel-btn primary">+ Add Scene</button>
                            <input id="scene-file-input" type="file" accept="image/*" multiple style="display:none">
                        </div>
                        <div id="scene-list" class="scene-list"></div>
                    </div>
                `;
            },
            init() {
                SceneManager.initToolbar();
            }
        },
        hotspots: {
            render() {
                return `
                    <div class="panel-section visible" data-panel="hotspots">
                        <span class="panel-label">Hotspots</span>
                        <button id="hotspot-new" class="panel-btn primary">+ New Hotspot</button>
                        <button id="hotspot-undo" class="panel-btn">Undo Point</button>
                        <button id="hotspot-delete" class="panel-btn danger">Delete</button>
                        <div class="panel-divider"></div>
                        <span id="hotspot-status" class="panel-label" style="color: var(--text-secondary)">No hotspot selected</span>
                    </div>
                `;
            },
            init() {
                HotspotEditor.initToolbar();
            }
        },
        inventory: {
            render() {
                return `
                    <div class="panel-section visible" data-panel="inventory">
                        <div class="scene-panel-top">
                            <span class="panel-label">Items</span>
                            <input id="item-name" class="panel-input" type="text" placeholder="Item name...">
                            <button id="item-load-img" class="panel-btn">Load Icon</button>
                            <button id="item-add" class="panel-btn primary">+ Add Item</button>
                            <input id="item-file-input" type="file" accept="image/*" style="display:none">
                        </div>
                        <div id="item-list" class="scene-list"></div>
                    </div>
                `;
            },
            init() {
                InventoryEditor.initToolbar();
            }
        },
        puzzle: {
            render() {
                return `
                    <div class="panel-section visible" data-panel="puzzle">
                        <div class="scene-panel-top">
                            <span class="panel-label">Puzzles</span>
                            <input id="puzzle-name" class="panel-input" type="text" placeholder="Puzzle name...">
                            <button id="puzzle-load-bg" class="panel-btn">Load Background</button>
                            <button id="puzzle-add" class="panel-btn primary">+ Add Puzzle</button>
                            <input id="puzzle-file-input" type="file" accept="image/*" style="display:none">
                        </div>
                        <div id="puzzle-list" class="scene-list"></div>
                    </div>
                `;
            },
            init() {
                PuzzleEditor.initToolbar();
            }
        },
        gamestate: {
            render() {
                return `
                    <div class="panel-section visible" data-panel="gamestate">
                        <div class="gamestate-columns">
                            <div class="gamestate-col">
                                <div class="gamestate-col-header">
                                    <span class="panel-label">Flags</span>
                                    <button id="state-reset" class="panel-btn danger">Reset</button>
                                </div>
                                <div id="flags-container" class="flags-container"></div>
                            </div>
                            <div class="gamestate-col gamestate-col-wide">
                                <div id="progression-container"></div>
                            </div>
                            <div class="gamestate-col">
                                <div id="overview-container"></div>
                            </div>
                        </div>
                    </div>
                `;
            },
            init() {
                GameState.initToolbar();
            }
        }
    };

    function openSection(name) {
        if (activeSection === name) {
            closePanel();
            return;
        }

        HotspotEditor.stopDrawing();
        HotspotEditor.closePopover();
        Canvas.render();
        activeSection = name;
        sectionButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === name);
        });

        const section = sections[name];
        if (section) {
            panel.innerHTML = section.render();
            panel.classList.remove('hidden');
            section.init();
        }
    }

    function closePanel() {
        activeSection = null;
        HotspotEditor.stopDrawing();
        HotspotEditor.closePopover();
        Canvas.render();
        panel.classList.add('hidden');
        sectionButtons.forEach(btn => btn.classList.remove('active'));
    }

    function enterPlayMode() {
        closePanel();
        editorSections.classList.add('hidden');
        saveBtn.classList.add('hidden');
        loadBtn.classList.add('hidden');
        exportBtn.classList.add('hidden');
        playInventoryBtn.classList.remove('hidden');
        playHintBtn.classList.remove('hidden');
        modeToggle.textContent = 'Edit';
        viewport.classList.add('fullscreen');
        toolbarEl.classList.add('play-mode');
        PlayMode.enter();
    }

    function enterEditMode() {
        editorSections.classList.remove('hidden');
        saveBtn.classList.remove('hidden');
        loadBtn.classList.remove('hidden');
        exportBtn.classList.remove('hidden');
        playInventoryBtn.classList.add('hidden');
        playHintBtn.classList.add('hidden');
        modeToggle.textContent = 'Play';
        viewport.classList.remove('fullscreen');
        toolbarEl.classList.remove('play-mode');
        PlayMode.exit();
    }

    function isEditMode() {
        return !toolbarEl.classList.contains('play-mode');
    }

    function init() {
        sectionButtons.forEach(btn => {
            btn.addEventListener('click', () => openSection(btn.dataset.section));
        });

        modeToggle.addEventListener('click', () => {
            if (isEditMode()) {
                enterPlayMode();
            } else {
                enterEditMode();
            }
        });

        // Save/Load JSON (global)
        saveBtn.addEventListener('click', () => SceneManager.exportJSON());
        loadBtn.addEventListener('click', () => jsonInput.click());

        // Export as project-data.js (path-based, lightweight)
        function stripDataUrls(obj) {
            if (typeof obj === 'string') return obj.startsWith('data:') ? null : obj;
            if (Array.isArray(obj)) return obj.map(stripDataUrls).filter(v => v !== null);
            if (obj && typeof obj === 'object') {
                const out = {};
                for (const k in obj) out[k] = stripDataUrls(obj[k]);
                return out;
            }
            return obj;
        }

        exportBtn.addEventListener('click', () => {
            const data = {
                scenes: SceneManager.getAllScenes().map(s => ({
                    id: s.id,
                    name: s.name,
                    states: s.states,
                    editingStateIndex: s.editingStateIndex || 0,
                    music: s.music || null
                })),
                items: InventoryEditor.getAllItems(),
                puzzles: PuzzleEditor.getAllPuzzles(),
                gameState: GameState.getDefinedFlags(),
                progressionSteps: GameState.getSteps()
            };
            const clean = stripDataUrls(data);
            const js = 'window.SCENEFORGE_PROJECT = ' + JSON.stringify(clean, null, 2) + ';\n';
            const blob = new Blob([js], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'project-data.js';
            a.click();
            URL.revokeObjectURL(url);
        });
        jsonInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => SceneManager.importJSON(evt.target.result);
            reader.readAsText(file);
            jsonInput.value = '';
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !isEditMode()) {
                enterEditMode();
            }
        });
    }

    return { init, openSection, closePanel, isEditMode, enterEditMode, enterPlayMode };
})();
