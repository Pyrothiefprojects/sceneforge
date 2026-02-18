const ActionConfig = (() => {

    function renderDropdown(target, idPrefix) {
        const type = target.action ? target.action.type : 'none';
        return `
            <div class="popover-field">
                <label>Action</label>
                <select class="panel-select" id="${idPrefix}-action-type">
                    <option value="none" ${type === 'none' ? 'selected' : ''}>No Action</option>
                    <option value="clue" ${type === 'clue' ? 'selected' : ''}>Clue</option>
                    <option value="navigate" ${type === 'navigate' ? 'selected' : ''}>Navigate</option>
                    <option value="pickup" ${type === 'pickup' ? 'selected' : ''}>Pick Up Item</option>
                    <option value="accepts_item" ${type === 'accepts_item' ? 'selected' : ''}>Accepts Item</option>
                    <option value="puzzle" ${type === 'puzzle' ? 'selected' : ''}>Trigger Puzzle</option>
                    <option value="solve_puzzle" ${type === 'solve_puzzle' ? 'selected' : ''}>Solve Puzzle</option>
                </select>
            </div>
            <div id="${idPrefix}-action-config"></div>`;
    }

    function bindDropdown(popoverEl, target, idPrefix, onUpdate) {
        const actionSelect = popoverEl.querySelector(`#${idPrefix}-action-type`);
        if (!actionSelect) return;
        actionSelect.addEventListener('change', () => {
            target.action = { type: actionSelect.value };
            renderConfig(popoverEl, target, idPrefix, onUpdate);
            if (onUpdate) onUpdate();
        });
        renderConfig(popoverEl, target, idPrefix, onUpdate);
    }

    function renderConfig(popoverEl, target, idPrefix, onUpdate) {
        const container = popoverEl.querySelector(`#${idPrefix}-action-config`);
        if (!container) return;

        const scenes = SceneManager.getAllScenes();
        const items = InventoryEditor.getAllItems();
        const puzzles = PuzzleEditor.getAllPuzzles();
        const clues = PuzzleEditor.getClues();

        let html = '';
        switch (target.action.type) {
            case 'none':
                break;
            case 'clue':
                html = `
                    <div class="popover-field">
                        <label>Text</label>
                        <input class="panel-input" id="${idPrefix}-clue-text" value="${target.action.text || ''}" placeholder="What the player sees...">
                    </div>
                    <div class="popover-field">
                        <label>Visual</label>
                        <select class="panel-select" id="${idPrefix}-clue-id">
                            <option value="">-- None --</option>
                            ${clues.map(c => `<option value="${c.id}" ${target.action.clueId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                        </select>
                    </div>`;
                break;
            case 'navigate':
                html = `
                    <div class="popover-field">
                        <label>Target Scene</label>
                        <select class="panel-select" id="${idPrefix}-nav-target">
                            <option value="">-- Select --</option>
                            ${scenes.map(s => `<option value="${s.id}" ${target.action.target === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>`;
                break;
            case 'pickup':
                html = `
                    <div class="popover-field">
                        <label>Item</label>
                        <select class="panel-select" id="${idPrefix}-pickup-item">
                            <option value="">-- Select --</option>
                            ${items.map(i => `<option value="${i.id}" ${target.action.itemId === i.id ? 'selected' : ''}>${i.name}</option>`).join('')}
                        </select>
                    </div>`;
                break;
            case 'accepts_item':
                html = `
                    <div class="popover-field">
                        <label>Required Item</label>
                        <select class="panel-select" id="${idPrefix}-accepts-item">
                            <option value="">-- Select --</option>
                            ${items.map(i => `<option value="${i.id}" ${target.action.requiredItemId === i.id ? 'selected' : ''}>${i.name}</option>`).join('')}
                        </select>
                    </div>`;
                break;
            case 'puzzle':
                html = `
                    <div class="popover-field">
                        <label>Puzzle</label>
                        <select class="panel-select" id="${idPrefix}-puzzle-id">
                            <option value="">-- Select --</option>
                            ${puzzles.map(p => `<option value="${p.id}" ${target.action.puzzleId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                        </select>
                    </div>`;
                break;
            case 'solve_puzzle':
                html = `
                    <div class="popover-field">
                        <label>Text</label>
                        <input class="panel-input" id="${idPrefix}-solve-text" value="${target.action.text || ''}" placeholder="Success message (optional)">
                    </div>`;
                break;
        }

        container.innerHTML = html;

        const clueText = container.querySelector(`#${idPrefix}-clue-text`);
        if (clueText) clueText.addEventListener('input', () => { target.action.text = clueText.value; });

        const clueId = container.querySelector(`#${idPrefix}-clue-id`);
        if (clueId) clueId.addEventListener('change', () => { target.action.clueId = clueId.value; });

        const navTarget = container.querySelector(`#${idPrefix}-nav-target`);
        if (navTarget) navTarget.addEventListener('change', () => {
            target.action.target = navTarget.value;
            if (onUpdate) onUpdate();
        });

        const pickupItem = container.querySelector(`#${idPrefix}-pickup-item`);
        if (pickupItem) pickupItem.addEventListener('change', () => {
            target.action.itemId = pickupItem.value;
            if (onUpdate) onUpdate();
        });

        const acceptsItem = container.querySelector(`#${idPrefix}-accepts-item`);
        if (acceptsItem) acceptsItem.addEventListener('change', () => {
            target.action.requiredItemId = acceptsItem.value;
            if (onUpdate) onUpdate();
        });

        const puzzleId = container.querySelector(`#${idPrefix}-puzzle-id`);
        if (puzzleId) puzzleId.addEventListener('change', () => {
            target.action.puzzleId = puzzleId.value;
            if (onUpdate) onUpdate();
        });

        const solveText = container.querySelector(`#${idPrefix}-solve-text`);
        if (solveText) solveText.addEventListener('input', () => { target.action.text = solveText.value; });
    }

    function renderStateChangeToggle(target, idPrefix, states) {
        if (!states || states.length === 0) return '';
        const sc = target.stateChange;
        const frameCount = sc && sc.frames ? sc.frames.length : 0;
        const frameDuration = sc && sc.frameDuration ? sc.frameDuration : 100;
        const hasVideo = sc && sc.video;
        const effect = sc ? (sc.effect || '') : '';
        return `
            <div class="popover-field state-change-toggle">
                <label>
                    <input type="checkbox" id="${idPrefix}-state-change" ${sc ? 'checked' : ''}>
                    State Change
                </label>
                <select class="panel-select" id="${idPrefix}-state-idx" ${sc ? '' : 'disabled'}>
                    ${states.map((s, i) => `<option value="${i}" ${sc && sc.stateIndex === i ? 'selected' : ''}>${SceneManager.getStateName(s, i)}</option>`).join('')}
                </select>
            </div>
            <div class="popover-field state-change-frames ${sc ? '' : 'hidden'}" id="${idPrefix}-frames-section">
                <div class="state-change-frames-row">
                    <label>Effect</label>
                    <select class="panel-select" id="${idPrefix}-state-effect" style="width:auto">
                        <option value="" ${effect === '' ? 'selected' : ''}>None</option>
                        <option value="fade" ${effect === 'fade' ? 'selected' : ''}>Fade</option>
                    </select>
                </div>
                <label>Transition</label>
                <div class="state-change-frames-row">
                    <button class="panel-btn" id="${idPrefix}-load-frames">${frameCount > 0 ? frameCount + ' frames' : 'Load Frames'}</button>
                    <input type="file" id="${idPrefix}-frames-input" webkitdirectory style="display:none">
                    ${frameCount > 0 ? `<button class="panel-btn danger" id="${idPrefix}-clear-frames" title="Clear frames">&times;</button>` : ''}
                </div>
                ${frameCount > 0 ? `
                <div class="state-change-speed-row">
                    <label>Speed</label>
                    <input type="range" id="${idPrefix}-frame-duration" min="30" max="500" step="10" value="${frameDuration}" class="frame-duration-slider">
                    <span id="${idPrefix}-frame-duration-label">${frameDuration}ms</span>
                </div>
                <div class="state-change-speed-row">
                    <label><input type="checkbox" id="${idPrefix}-reverse" ${sc && sc.reverse ? 'checked' : ''}> Reverse frames</label>
                </div>` : ''}
                <div class="state-change-frames-row" style="margin-top:4px;">
                    <button class="panel-btn" id="${idPrefix}-load-video">${hasVideo ? 'Video loaded' : 'Load Video'}</button>
                    <input type="file" id="${idPrefix}-video-input" accept="video/mp4,video/webm" style="display:none">
                    ${hasVideo ? `<button class="panel-btn danger" id="${idPrefix}-clear-video" title="Clear video">&times;</button>` : ''}
                </div>
            </div>`;
    }

    function bindStateChangeToggle(popoverEl, target, idPrefix) {
        const cb = popoverEl.querySelector(`#${idPrefix}-state-change`);
        const idx = popoverEl.querySelector(`#${idPrefix}-state-idx`);
        const framesSection = popoverEl.querySelector(`#${idPrefix}-frames-section`);
        const loadBtn = popoverEl.querySelector(`#${idPrefix}-load-frames`);
        const fileInput = popoverEl.querySelector(`#${idPrefix}-frames-input`);
        const clearBtn = popoverEl.querySelector(`#${idPrefix}-clear-frames`);
        const durationSlider = popoverEl.querySelector(`#${idPrefix}-frame-duration`);
        const durationLabel = popoverEl.querySelector(`#${idPrefix}-frame-duration-label`);

        if (!cb || !idx) return;

        const effectSel = popoverEl.querySelector(`#${idPrefix}-state-effect`);

        cb.addEventListener('change', () => {
            if (cb.checked) {
                target.stateChange = { stateIndex: parseInt(idx.value) || 0, frames: [], frameDuration: 100, video: null, effect: effectSel ? effectSel.value || null : null };
                idx.disabled = false;
                if (framesSection) framesSection.classList.remove('hidden');
            } else {
                target.stateChange = null;
                idx.disabled = true;
                if (framesSection) framesSection.classList.add('hidden');
            }
        });

        idx.addEventListener('change', () => {
            if (target.stateChange) {
                target.stateChange.stateIndex = parseInt(idx.value) || 0;
            }
        });

        if (effectSel) {
            effectSel.addEventListener('change', () => {
                if (target.stateChange) {
                    target.stateChange.effect = effectSel.value || null;
                }
            });
        }

        if (loadBtn && fileInput) {
            loadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files).filter(f => /\.(png|jpe?g|webp)$/i.test(f.name));
                if (files.length === 0) return;
                files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                const paths = files.map(f => 'assets/transitions/' + f.webkitRelativePath);
                if (target.stateChange) {
                    target.stateChange.frames = paths;
                }
                loadBtn.textContent = paths.length + ' frames';
                fileInput.value = '';
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (target.stateChange) {
                    target.stateChange.frames = [];
                    target.stateChange.frameDuration = 100;
                }
                if (loadBtn) loadBtn.textContent = 'Load Frames';
                clearBtn.remove();
                const speedRow = popoverEl.querySelector(`#${idPrefix}-frame-duration`);
                if (speedRow) speedRow.closest('.state-change-speed-row').remove();
            });
        }

        if (durationSlider && durationLabel) {
            durationSlider.addEventListener('input', () => {
                const val = parseInt(durationSlider.value);
                durationLabel.textContent = val + 'ms';
                if (target.stateChange) {
                    target.stateChange.frameDuration = val;
                }
            });
        }

        const reverseCb = popoverEl.querySelector(`#${idPrefix}-reverse`);
        if (reverseCb) {
            reverseCb.addEventListener('change', () => {
                if (target.stateChange) {
                    target.stateChange.reverse = reverseCb.checked;
                }
            });
        }

        // Video loading
        const loadVideoBtn = popoverEl.querySelector(`#${idPrefix}-load-video`);
        const videoInput = popoverEl.querySelector(`#${idPrefix}-video-input`);
        const clearVideoBtn = popoverEl.querySelector(`#${idPrefix}-clear-video`);

        if (loadVideoBtn && videoInput) {
            loadVideoBtn.addEventListener('click', () => videoInput.click());
            videoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (target.stateChange) {
                    target.stateChange.video = 'assets/transitions/' + file.name;
                }
                loadVideoBtn.textContent = 'Video loaded';
                videoInput.value = '';
            });
        }

        if (clearVideoBtn) {
            clearVideoBtn.addEventListener('click', () => {
                if (target.stateChange) {
                    target.stateChange.video = null;
                }
                if (loadVideoBtn) loadVideoBtn.textContent = 'Load Video';
                clearVideoBtn.remove();
            });
        }
    }

    function renderLoopToggle(target, idPrefix) {
        const lp = target.loop;
        const frameCount = lp && lp.frames ? lp.frames.length : 0;
        const frameDuration = lp && lp.frameDuration ? lp.frameDuration : 150;
        return `
            <div class="popover-field state-change-toggle">
                <label>
                    <input type="checkbox" id="${idPrefix}-loop" ${lp ? 'checked' : ''}>
                    Loop Animation
                </label>
            </div>
            <div class="popover-field state-change-frames ${lp ? '' : 'hidden'}" id="${idPrefix}-loop-section">
                <label>Frames</label>
                <div class="state-change-frames-row">
                    <button class="panel-btn" id="${idPrefix}-loop-load">${frameCount > 0 ? frameCount + ' frames' : 'Load Frames'}</button>
                    <input type="file" id="${idPrefix}-loop-input" webkitdirectory style="display:none">
                    ${frameCount > 0 ? `<button class="panel-btn danger" id="${idPrefix}-loop-clear" title="Clear frames">&times;</button>` : ''}
                </div>
                ${frameCount > 0 ? `
                <div class="state-change-speed-row">
                    <label>Speed</label>
                    <input type="range" id="${idPrefix}-loop-duration" min="30" max="500" step="10" value="${frameDuration}" class="frame-duration-slider">
                    <span id="${idPrefix}-loop-duration-label">${frameDuration}ms</span>
                </div>
                <div class="state-change-speed-row">
                    <label><input type="checkbox" id="${idPrefix}-loop-reverse" ${lp && lp.reverse ? 'checked' : ''}> Reverse frames</label>
                </div>
                <div class="state-change-speed-row">
                    <label>Scale</label>
                    <input type="range" id="${idPrefix}-loop-scale" min="5" max="200" step="1" value="${lp && lp.scale != null ? Math.round(lp.scale * 100) : 100}" class="frame-duration-slider">
                    <span id="${idPrefix}-loop-scale-label">${lp && lp.scale != null ? Math.round(lp.scale * 100) : 100}%</span>
                </div>
                <div class="state-change-frames-row" style="margin-top:4px;">
                    <button class="panel-btn" id="${idPrefix}-loop-place">${lp && lp.x != null ? 'Reposition' : 'Place'}</button>
                    ${lp && lp.x != null ? '<span class="auto-flag-name" style="margin-left:6px;">Placed</span>' : ''}
                </div>` : ''}
            </div>`;
    }

    function bindLoopToggle(popoverEl, target, idPrefix) {
        const cb = popoverEl.querySelector(`#${idPrefix}-loop`);
        const section = popoverEl.querySelector(`#${idPrefix}-loop-section`);
        const loadBtn = popoverEl.querySelector(`#${idPrefix}-loop-load`);
        const fileInput = popoverEl.querySelector(`#${idPrefix}-loop-input`);
        const clearBtn = popoverEl.querySelector(`#${idPrefix}-loop-clear`);
        const durationSlider = popoverEl.querySelector(`#${idPrefix}-loop-duration`);
        const durationLabel = popoverEl.querySelector(`#${idPrefix}-loop-duration-label`);
        const scaleSlider = popoverEl.querySelector(`#${idPrefix}-loop-scale`);
        const scaleLabel = popoverEl.querySelector(`#${idPrefix}-loop-scale-label`);

        if (!cb) return;

        cb.addEventListener('change', () => {
            if (cb.checked) {
                target.loop = { frames: [], frameDuration: 150 };
                if (section) section.classList.remove('hidden');
            } else {
                target.loop = null;
                if (section) section.classList.add('hidden');
            }
        });

        if (loadBtn && fileInput) {
            loadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files).filter(f => /\.(png|jpe?g|webp)$/i.test(f.name));
                if (files.length === 0) return;
                files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                const paths = files.map(f => 'assets/transitions/' + f.webkitRelativePath);
                if (target.loop) {
                    target.loop.frames = paths;
                }
                loadBtn.textContent = paths.length + ' frames';
                fileInput.value = '';
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (target.loop) {
                    target.loop.frames = [];
                    target.loop.frameDuration = 150;
                }
                if (loadBtn) loadBtn.textContent = 'Load Frames';
                clearBtn.remove();
                const speedRow = popoverEl.querySelector(`#${idPrefix}-loop-duration`);
                if (speedRow) speedRow.closest('.state-change-speed-row').remove();
            });
        }

        if (durationSlider && durationLabel) {
            durationSlider.addEventListener('input', () => {
                const val = parseInt(durationSlider.value);
                durationLabel.textContent = val + 'ms';
                if (target.loop) {
                    target.loop.frameDuration = val;
                }
            });
        }

        const loopReverseCb = popoverEl.querySelector(`#${idPrefix}-loop-reverse`);
        if (loopReverseCb) {
            loopReverseCb.addEventListener('change', () => {
                if (target.loop) {
                    target.loop.reverse = loopReverseCb.checked;
                }
            });
        }

        if (scaleSlider && scaleLabel) {
            scaleSlider.addEventListener('input', () => {
                const pct = parseInt(scaleSlider.value);
                scaleLabel.textContent = pct + '%';
                if (target.loop) {
                    target.loop.scale = pct / 100;
                }
            });
        }
    }

    function renderSoundToggle(target, idPrefix) {
        const snd = target.sound;
        const label = snd ? snd.split('/').pop() : 'No sound selected';
        return `
            <div class="popover-field state-change-toggle">
                <label>
                    <input type="checkbox" id="${idPrefix}-sound-toggle" ${snd ? 'checked' : ''}>
                    Sound Effect
                </label>
            </div>
            <div class="popover-field state-change-frames ${snd ? '' : 'hidden'}" id="${idPrefix}-sound-section">
                <div class="state-change-frames-row">
                    <button class="panel-btn" id="${idPrefix}-sound-load">${snd ? 'Change Sound' : 'Load Sound'}</button>
                    <input type="file" id="${idPrefix}-sound-input" accept="audio/*,.enc" style="display:none">
                    ${snd ? `<button class="panel-btn danger" id="${idPrefix}-sound-clear" title="Clear sound">&times;</button>` : ''}
                </div>
                <span id="${idPrefix}-sound-label" class="panel-label" style="font-size:10px; color:var(--text-secondary);">${label}</span>
                <label class="requires-option" style="margin-top:4px;">
                    <input type="checkbox" id="${idPrefix}-sound-loop" ${target.soundLoop ? 'checked' : ''}>
                    Loop
                </label>
            </div>`;
    }

    function bindSoundToggle(popoverEl, target, idPrefix) {
        const cb = popoverEl.querySelector(`#${idPrefix}-sound-toggle`);
        const section = popoverEl.querySelector(`#${idPrefix}-sound-section`);
        const loadBtn = popoverEl.querySelector(`#${idPrefix}-sound-load`);
        const fileInput = popoverEl.querySelector(`#${idPrefix}-sound-input`);
        const clearBtn = popoverEl.querySelector(`#${idPrefix}-sound-clear`);
        const label = popoverEl.querySelector(`#${idPrefix}-sound-label`);

        if (!cb) return;

        cb.addEventListener('change', () => {
            if (cb.checked) {
                if (section) section.classList.remove('hidden');
            } else {
                target.sound = null;
                if (section) section.classList.add('hidden');
                if (label) label.textContent = 'No sound selected';
            }
        });

        if (loadBtn && fileInput) {
            loadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                target.sound = 'assets/audio/' + file.name;
                if (loadBtn) loadBtn.textContent = 'Change Sound';
                if (label) label.textContent = file.name;
                fileInput.value = '';
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                target.sound = null;
                if (loadBtn) loadBtn.textContent = 'Load Sound';
                if (label) label.textContent = 'No sound selected';
                clearBtn.remove();
            });
        }

        const loopCb = popoverEl.querySelector(`#${idPrefix}-sound-loop`);
        if (loopCb) {
            loopCb.addEventListener('change', () => {
                target.soundLoop = loopCb.checked;
            });
        }
    }

    function renderAssetChangeToggle(target, idPrefix) {
        const ac = target.assetChange;
        const mode = ac ? (ac.mode || 'hide') : 'hide';
        const scenes = SceneManager.getAllScenes();
        const allAssets = [];
        for (const scene of scenes) {
            for (const asset of (scene.sceneAssets || [])) {
                allAssets.push({ id: asset.id, label: scene.name + ' / ' + asset.name });
            }
        }
        return `
            <div class="popover-field state-change-toggle">
                <label>
                    <input type="checkbox" id="${idPrefix}-asset-change" ${ac ? 'checked' : ''}>
                    Asset Change
                </label>
                <select class="panel-select" id="${idPrefix}-asset-change-mode" ${ac ? '' : 'disabled'} style="width:auto">
                    <option value="hide" ${mode === 'hide' ? 'selected' : ''}>Hide</option>
                    <option value="show" ${mode === 'show' ? 'selected' : ''}>Show</option>
                </select>
                <select class="panel-select" id="${idPrefix}-asset-change-target" ${ac ? '' : 'disabled'}>
                    <option value="">-- Select --</option>
                    ${allAssets.map(a => `<option value="${a.id}" ${ac && ac.assetId === a.id ? 'selected' : ''}>${a.label}</option>`).join('')}
                </select>
            </div>`;
    }

    function bindAssetChangeToggle(popoverEl, target, idPrefix) {
        const cb = popoverEl.querySelector(`#${idPrefix}-asset-change`);
        const modeSel = popoverEl.querySelector(`#${idPrefix}-asset-change-mode`);
        const sel = popoverEl.querySelector(`#${idPrefix}-asset-change-target`);
        if (!cb || !sel) return;

        cb.addEventListener('change', () => {
            if (cb.checked) {
                target.assetChange = { assetId: sel.value || '', mode: modeSel ? modeSel.value : 'hide' };
                sel.disabled = false;
                if (modeSel) modeSel.disabled = false;
            } else {
                target.assetChange = null;
                sel.disabled = true;
                if (modeSel) modeSel.disabled = true;
            }
        });

        sel.addEventListener('change', () => {
            if (target.assetChange) {
                target.assetChange.assetId = sel.value;
            }
        });

        if (modeSel) {
            modeSel.addEventListener('change', () => {
                if (target.assetChange) {
                    target.assetChange.mode = modeSel.value;
                }
            });
        }
    }

    function renderMoveAssetToggle(target, idPrefix) {
        const ma = target.moveAsset;
        const scenes = SceneManager.getAllScenes();
        const allAssets = [];
        for (const scene of scenes) {
            for (const asset of (scene.sceneAssets || [])) {
                allAssets.push({ id: asset.id, label: scene.name + ' / ' + asset.name });
            }
        }
        return `
            <div class="popover-field state-change-toggle">
                <label>
                    <input type="checkbox" id="${idPrefix}-move-asset" ${ma ? 'checked' : ''}>
                    Move Asset
                </label>
                <select class="panel-select" id="${idPrefix}-move-asset-target" ${ma ? '' : 'disabled'}>
                    <option value="">-- Select --</option>
                    ${allAssets.map(a => `<option value="${a.id}" ${ma && ma.assetId === a.id ? 'selected' : ''}>${a.label}</option>`).join('')}
                </select>
            </div>`;
    }

    function bindMoveAssetToggle(popoverEl, target, idPrefix) {
        const cb = popoverEl.querySelector(`#${idPrefix}-move-asset`);
        const sel = popoverEl.querySelector(`#${idPrefix}-move-asset-target`);
        if (!cb || !sel) return;

        cb.addEventListener('change', () => {
            if (cb.checked) {
                target.moveAsset = { assetId: sel.value || '' };
                sel.disabled = false;
            } else {
                target.moveAsset = null;
                sel.disabled = true;
            }
        });

        sel.addEventListener('change', () => {
            if (target.moveAsset) {
                target.moveAsset.assetId = sel.value;
            }
        });
    }

    return {
        renderDropdown, bindDropdown, renderConfig,
        renderStateChangeToggle, bindStateChangeToggle,
        renderLoopToggle, bindLoopToggle,
        renderSoundToggle, bindSoundToggle,
        renderAssetChangeToggle, bindAssetChangeToggle,
        renderMoveAssetToggle, bindMoveAssetToggle
    };
})();
