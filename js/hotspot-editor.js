const HotspotEditor = (() => {
    let drawing = false;
    let currentPoints = [];
    let selectedHotspot = null;
    let draggingPoint = null;
    let popoverEl = null;

    // Loop placement mode
    let placingLoopTarget = null;
    let loopGhostEl = null;

    // Connect mode
    let connecting = false;
    let connectSelection = new Set();

    function getHotspots() {
        const scene = SceneManager.getCurrentScene();
        if (!scene || !scene.states) return [];
        // In play mode, use runtime state; in edit mode, use editingStateIndex
        let stateIdx = scene.editingStateIndex || 0;
        if (typeof PlayMode !== 'undefined' && PlayMode.isActive()) {
            stateIdx = GameState.getSceneState(scene.id);
        }
        const state = scene.states[stateIdx] || scene.states[0];
        return state ? state.hotspots : [];
    }

    function startDrawing() {
        drawing = true;
        currentPoints = [];
        selectedHotspot = null;
        closePopover();
        updateStatus('Click to place points. Double-click or click near start to close.');
    }

    function stopDrawing() {
        drawing = false;
        currentPoints = [];
    }

    function addPoint(imageX, imageY) {
        if (!drawing) return;

        // Close polygon if clicking near first point
        if (currentPoints.length >= 3) {
            const first = currentPoints[0];
            const dist = Math.hypot(imageX - first[0], imageY - first[1]);
            if (dist < 15) {
                finishPolygon();
                return;
            }
        }

        currentPoints.push([Math.round(imageX), Math.round(imageY)]);
        Canvas.render();
    }

    function undoPoint() {
        if (drawing && currentPoints.length > 0) {
            currentPoints.pop();
            Canvas.render();
        }
    }

    function finishPolygon() {
        if (currentPoints.length < 3) {
            stopDrawing();
            return;
        }

        const scene = SceneManager.getCurrentScene();
        if (!scene) return;
        const state = SceneManager.getCurrentState(scene);
        if (!state) return;

        const id = 'hotspot_' + Date.now();
        const hotspot = {
            id,
            name: '',
            points: [...currentPoints],
            action: { type: 'clue', text: '' },
            requires: []
        };

        state.hotspots.push(hotspot);
        stopDrawing();
        selectHotspot(hotspot);
        Canvas.render();
        updateStatus(`Hotspot created. ${state.hotspots.length} total.`);
    }

    function selectHotspot(hotspot) {
        selectedHotspot = hotspot;
        Canvas.render();
        if (hotspot) {
            showPopover(hotspot);
        }
    }

    function deleteSelected() {
        if (!selectedHotspot) return;
        const scene = SceneManager.getCurrentScene();
        if (!scene) return;
        const state = SceneManager.getCurrentState(scene);
        if (!state) return;
        state.hotspots = state.hotspots.filter(h => h.id !== selectedHotspot.id);
        selectedHotspot = null;
        closePopover();
        Canvas.render();
        updateStatus('Hotspot deleted.');
    }

    function hitTest(imageX, imageY) {
        const hotspots = getHotspots();
        for (let i = hotspots.length - 1; i >= 0; i--) {
            if (pointInPolygon(imageX, imageY, hotspots[i].points)) {
                return hotspots[i];
            }
        }
        return null;
    }

    function pointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i][0], yi = points[i][1];
            const xj = points[j][0], yj = points[j][1];
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function findNearPoint(imageX, imageY, hotspot) {
        if (!hotspot) return -1;
        for (let i = 0; i < hotspot.points.length; i++) {
            const dist = Math.hypot(imageX - hotspot.points[i][0], imageY - hotspot.points[i][1]);
            if (dist < 10) return i;
        }
        return -1;
    }

    // -- Loop Placement --

    function startLoopPlacement(hotspot) {
        stopLoopPlacement();
        placingLoopTarget = hotspot;
        closePopover();
        createLoopGhost(hotspot);
        Canvas.getCanvasElement().style.cursor = 'none';
    }

    function stopLoopPlacement() {
        placingLoopTarget = null;
        removeLoopGhost();
        Canvas.getCanvasElement().style.cursor = '';
    }

    function isLoopPlacing() {
        return placingLoopTarget !== null;
    }

    function createLoopGhost(hotspot) {
        removeLoopGhost();
        if (!hotspot.loop || !hotspot.loop.frames || hotspot.loop.frames.length === 0) return;
        const src = hotspot.loop.frames[0];
        loopGhostEl = document.createElement('div');
        loopGhostEl.className = 'loop-ghost';
        const img = document.createElement('img');
        img.src = src;
        img.draggable = false;
        loopGhostEl.appendChild(img);
        document.getElementById('viewport').appendChild(loopGhostEl);
    }

    function removeLoopGhost() {
        if (loopGhostEl) {
            loopGhostEl.remove();
            loopGhostEl = null;
        }
    }

    // -- Connect Mode --

    function startConnecting() {
        stopDrawing();
        closePopover();
        connecting = true;
        connectSelection = new Set();
        // Enable overlay so all states' hotspots are visible
        Canvas.setOverlayMode(true, { hotspots: true, assets: false });
        Canvas.render();
    }

    function stopConnecting() {
        connecting = false;
        connectSelection = new Set();
        Canvas.setOverlayMode(false, { hotspots: false, assets: false });
        Canvas.render();
    }

    function isConnecting() {
        return connecting;
    }

    function getConnectSelection() {
        return connectSelection;
    }

    function confirmConnection() {
        const scene = SceneManager.getCurrentScene();
        if (!scene) return;
        if (connectSelection.size < 2) return;
        SceneManager.addConnection(scene.id, Array.from(connectSelection));
        stopConnecting();
    }

    function getAllHotspotsAllStates() {
        const scene = SceneManager.getCurrentScene();
        if (!scene || !scene.states) return [];
        const result = [];
        for (let si = 0; si < scene.states.length; si++) {
            const state = scene.states[si];
            if (!state.hotspots) continue;
            for (const hs of state.hotspots) {
                result.push({ hotspot: hs, stateIndex: si });
            }
        }
        return result;
    }

    function hitTestAllStates(imageX, imageY) {
        const all = getAllHotspotsAllStates();
        for (let i = all.length - 1; i >= 0; i--) {
            if (pointInPolygon(imageX, imageY, all[i].hotspot.points)) {
                return all[i];
            }
        }
        return null;
    }

    // -- Rendering --

    function renderHotspots(ctx, scale, offsetX, offsetY) {
        const STATE_COLORS = ['#ff6b35','#4fc3f7','#66bb6a','#ab47bc','#ef5350','#ffee58'];

        if (connecting) {
            // Connect mode: draw all states' hotspots with per-state colors
            const scene = SceneManager.getCurrentScene();
            if (scene && scene.states) {
                for (let si = 0; si < scene.states.length; si++) {
                    const color = STATE_COLORS[si % STATE_COLORS.length];
                    const state = scene.states[si];
                    if (!state.hotspots) continue;
                    for (const hs of state.hotspots) {
                        const isSelected = connectSelection.has(hs.id);
                        drawPolygonColored(ctx, hs.points, scale, offsetX, offsetY,
                            isSelected ? '#4fc3f7' : color, isSelected, hs.name);
                    }
                }
            }
        } else {
            // Normal mode: draw current state hotspots
            const hotspots = getHotspots();
            for (const hs of hotspots) {
                drawPolygon(ctx, hs.points, scale, offsetX, offsetY,
                    hs === selectedHotspot);
            }
        }

        // Draw in-progress polygon
        if (drawing && currentPoints.length > 0) {
            drawPolygon(ctx, currentPoints, scale, offsetX, offsetY, true, true);
        }
    }

    function drawPolygon(ctx, points, scale, ox, oy, highlight, open) {
        if (points.length === 0) return;

        ctx.beginPath();
        const sx = points[0][0] * scale + ox;
        const sy = points[0][1] * scale + oy;
        ctx.moveTo(sx, sy);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0] * scale + ox, points[i][1] * scale + oy);
        }

        if (!open) ctx.closePath();

        ctx.fillStyle = highlight
            ? 'rgba(255, 107, 53, 0.25)'
            : 'rgba(255, 107, 53, 0.1)';
        if (!open) ctx.fill();

        ctx.strokeStyle = highlight ? '#ffa500' : '#ff6b35';
        ctx.lineWidth = highlight ? 2 : 1;
        ctx.setLineDash(open ? [6, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw points
        if (highlight) {
            for (const p of points) {
                ctx.beginPath();
                ctx.arc(p[0] * scale + ox, p[1] * scale + oy, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ffa500';
                ctx.fill();
                ctx.strokeStyle = '#0a0a0a';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }

    function drawPolygonColored(ctx, points, scale, ox, oy, color, highlight, label) {
        if (points.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(points[0][0] * scale + ox, points[0][1] * scale + oy);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0] * scale + ox, points[i][1] * scale + oy);
        }
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.globalAlpha = highlight ? 0.3 : 0.12;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = color;
        ctx.lineWidth = highlight ? 2.5 : 1.5;
        ctx.stroke();

        // Points
        if (highlight) {
            for (const p of points) {
                ctx.beginPath();
                ctx.arc(p[0] * scale + ox, p[1] * scale + oy, 4, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#0a0a0a';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // Label
        if (label) {
            let cx = 0, cy = 0;
            for (const p of points) { cx += p[0]; cy += p[1]; }
            cx /= points.length; cy /= points.length;
            ctx.fillStyle = color;
            ctx.font = '10px sans-serif';
            ctx.globalAlpha = 0.8;
            ctx.fillText(label, cx * scale + ox - 10, cy * scale + oy + 3);
            ctx.globalAlpha = 1;
        }
    }

    // -- Popover --

    function showPopover(hotspot) {
        closePopover();

        const centroid = getCentroid(hotspot.points);
        const screen = Canvas.imageToScreen(centroid.x, centroid.y);
        const canvasRect = Canvas.getCanvasElement().getBoundingClientRect();

        popoverEl = document.createElement('div');
        popoverEl.className = 'hotspot-popover';
        popoverEl.style.position = 'fixed';
        popoverEl.style.left = (canvasRect.left + screen.x + 20) + 'px';
        popoverEl.style.top = (canvasRect.top + 10) + 'px';

        const scene = SceneManager.getCurrentScene();
        const sceneStates = scene ? scene.states || [] : [];

        popoverEl.innerHTML = `
            <div class="popover-header">
                <span class="popover-title">Hotspot Config</span>
                <button class="popover-close">&times;</button>
            </div>
            <div class="popover-field">
                <label>Name</label>
                <input class="panel-input" id="pop-name" value="${hotspot.name}" placeholder="hotspot_name">
            </div>
            ${ActionConfig.renderDropdown(hotspot, 'pop')}
            <div id="pop-auto-flag" class="auto-flag-label"></div>
            ${ActionConfig.renderStateChangeToggle(hotspot, 'pop', sceneStates)}
            ${ActionConfig.renderLoopToggle(hotspot, 'pop')}
            ${ActionConfig.renderSoundToggle(hotspot, 'pop')}
            ${ActionConfig.renderAssetChangeToggle(hotspot, 'pop')}
            <div class="popover-field">
                <label><input type="checkbox" id="pop-clear-after" ${hotspot.clearAfterClick ? 'checked' : ''}> Clear after click</label>
                <label><input type="checkbox" id="pop-clear-group" ${hotspot.clearGroup ? 'checked' : ''}> Clear group</label>
            </div>
            ${ActionConfig.renderMoveAssetToggle(hotspot, 'pop')}
            <button id="pop-delete-hotspot" class="panel-btn danger" style="width:100%; margin-top:8px">Delete</button>
        `;

        document.getElementById('hotspot-overlay').appendChild(popoverEl);

        // Event listeners
        popoverEl.querySelector('.popover-close').addEventListener('click', closePopover);

        const nameInput = popoverEl.querySelector('#pop-name');
        nameInput.addEventListener('input', () => {
            hotspot.name = nameInput.value;
            updateAutoFlagLabel(hotspot);
        });

        ActionConfig.bindDropdown(popoverEl, hotspot, 'pop', () => updateAutoFlagLabel(hotspot));
        ActionConfig.bindStateChangeToggle(popoverEl, hotspot, 'pop');
        ActionConfig.bindLoopToggle(popoverEl, hotspot, 'pop');
        ActionConfig.bindSoundToggle(popoverEl, hotspot, 'pop');
        ActionConfig.bindAssetChangeToggle(popoverEl, hotspot, 'pop');

        const clearCb = popoverEl.querySelector('#pop-clear-after');
        if (clearCb) {
            clearCb.addEventListener('change', () => { hotspot.clearAfterClick = clearCb.checked; });
        }
        const clearGroupCb = popoverEl.querySelector('#pop-clear-group');
        if (clearGroupCb) {
            clearGroupCb.addEventListener('change', () => { hotspot.clearGroup = clearGroupCb.checked; });
        }

        ActionConfig.bindMoveAssetToggle(popoverEl, hotspot, 'pop');

        const deleteBtn = popoverEl.querySelector('#pop-delete-hotspot');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteSelected());
        }

        // Loop placement button
        const loopPlaceBtn = popoverEl.querySelector('#pop-loop-place');
        if (loopPlaceBtn) {
            loopPlaceBtn.addEventListener('click', () => {
                startLoopPlacement(hotspot);
            });
        }

        updateAutoFlagLabel(hotspot);

        // Keep on screen
        requestAnimationFrame(() => {
            if (!popoverEl) return;
            const popRect = popoverEl.getBoundingClientRect();
            if (popRect.right > window.innerWidth) {
                popoverEl.style.left = Math.max(10, canvasRect.left + screen.x - popRect.width - 20) + 'px';
            }
            if (popRect.bottom > window.innerHeight) {
                popoverEl.style.top = Math.max(10, window.innerHeight - popRect.height - 10) + 'px';
            }
        });
    }

    function updateAutoFlagLabel(hotspot) {
        const el = document.getElementById('pop-auto-flag');
        if (!el) return;
        const flag = GameState.getAutoFlag(hotspot);
        if (flag) {
            el.innerHTML = `<span class="auto-flag-arrow">&rarr;</span> sets: <span class="auto-flag-name">${flag}</span>`;
            el.classList.remove('hidden');
        } else {
            el.innerHTML = '<span style="color:var(--text-secondary)">Name the hotspot to generate a flag</span>';
        }
    }

    function closePopover() {
        if (popoverEl) {
            popoverEl.remove();
            popoverEl = null;
        }
    }

    function getCentroid(points) {
        let cx = 0, cy = 0;
        for (const p of points) { cx += p[0]; cy += p[1]; }
        return { x: cx / points.length, y: cy / points.length };
    }

    function updateStatus(text) {
        const el = document.getElementById('hotspot-status');
        if (el) el.textContent = text;
    }

    function updateConnectStatus() {
        const statusEl = document.getElementById('hotspot-connect-status');
        if (statusEl) statusEl.textContent = connectSelection.size + ' hotspot' + (connectSelection.size !== 1 ? 's' : '') + ' selected';
        const confirmBtn = document.getElementById('hotspot-connect-confirm');
        if (confirmBtn) confirmBtn.disabled = connectSelection.size < 2;
    }

    // -- Input handling --

    function handleCanvasClick(e) {
        if (!Toolbar.isEditMode()) return;

        const rect = Canvas.getCanvasElement().getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const img = Canvas.screenToImage(sx, sy);

        // Connect mode: toggle hotspot selection
        if (connecting) {
            const hit = hitTestAllStates(img.x, img.y);
            if (hit) {
                const id = hit.hotspot.id;
                if (connectSelection.has(id)) {
                    connectSelection.delete(id);
                } else {
                    connectSelection.add(id);
                }
                Canvas.render();
                updateConnectStatus();
            }
            return;
        }

        // Loop placement mode
        if (placingLoopTarget) {
            placingLoopTarget.loop.x = Math.round(img.x);
            placingLoopTarget.loop.y = Math.round(img.y);
            const placed = placingLoopTarget;
            stopLoopPlacement();
            selectHotspot(placed);
            return;
        }

        if (drawing) {
            addPoint(img.x, img.y);
            return;
        }

        // Check if clicking a point handle on selected hotspot
        if (selectedHotspot) {
            const ptIdx = findNearPoint(img.x, img.y, selectedHotspot);
            if (ptIdx >= 0) {
                draggingPoint = { hotspot: selectedHotspot, index: ptIdx };
                return;
            }
        }

        // Check if clicking on a hotspot
        const hit = hitTest(img.x, img.y);
        if (hit) {
            selectHotspot(hit);
        } else {
            selectedHotspot = null;
            closePopover();
            Canvas.render();
        }
    }

    function handleCanvasDblClick(e) {
        if (drawing) {
            finishPolygon();
        }
    }

    function handleCanvasMouseMove(e) {
        const rect = Canvas.getCanvasElement().getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        // Loop ghost follows mouse
        if (placingLoopTarget && loopGhostEl) {
            const { scale } = Canvas.getTransform();
            const loopScale = placingLoopTarget.loop && placingLoopTarget.loop.scale != null ? placingLoopTarget.loop.scale : 1;
            const ghostImg = loopGhostEl.querySelector('img');
            if (ghostImg && ghostImg.naturalWidth) {
                loopGhostEl.style.width = (ghostImg.naturalWidth * scale * loopScale) + 'px';
                loopGhostEl.style.height = (ghostImg.naturalHeight * scale * loopScale) + 'px';
            }
            loopGhostEl.style.left = sx + 'px';
            loopGhostEl.style.top = sy + 'px';
            loopGhostEl.style.display = 'block';
            return;
        }

        if (!draggingPoint) return;

        const img = Canvas.screenToImage(sx, sy);
        draggingPoint.hotspot.points[draggingPoint.index] = [Math.round(img.x), Math.round(img.y)];
        Canvas.render();
    }

    function handleCanvasMouseUp() {
        if (draggingPoint) {
            draggingPoint = null;
            if (selectedHotspot) showPopover(selectedHotspot);
        }
    }

    function isDrawing() {
        return drawing;
    }

    function getSelected() {
        return selectedHotspot;
    }

    function initToolbar() {
        const newBtn = document.getElementById('hotspot-new');
        const undoBtn = document.getElementById('hotspot-undo');

        newBtn.addEventListener('click', startDrawing);
        undoBtn.addEventListener('click', undoPoint);

        // Connect tool
        const connectBtn = document.getElementById('hotspot-connect');
        const connectStatus = document.getElementById('hotspot-connect-status');
        const connectConfirm = document.getElementById('hotspot-connect-confirm');
        const connectCancel = document.getElementById('hotspot-connect-cancel');

        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                if (connecting) {
                    stopConnecting();
                    connectBtn.classList.remove('active');
                    connectStatus.style.display = 'none';
                    connectConfirm.style.display = 'none';
                    connectCancel.style.display = 'none';
                } else {
                    startConnecting();
                    connectBtn.classList.add('active');
                    connectStatus.style.display = '';
                    connectConfirm.style.display = '';
                    connectCancel.style.display = '';
                    updateConnectStatus();
                }
            });
        }

        if (connectConfirm) {
            connectConfirm.addEventListener('click', () => {
                confirmConnection();
                connectBtn.classList.remove('active');
                connectStatus.style.display = 'none';
                connectConfirm.style.display = 'none';
                connectCancel.style.display = 'none';
                updateStatus('Connection created.');
            });
        }

        if (connectCancel) {
            connectCancel.addEventListener('click', () => {
                stopConnecting();
                connectBtn.classList.remove('active');
                connectStatus.style.display = 'none';
                connectConfirm.style.display = 'none';
                connectCancel.style.display = 'none';
            });
        }
    }

    function handleContextMenu(e) {
        e.preventDefault();
        if (connecting) {
            stopConnecting();
            Canvas.render();
            return;
        }
        if (placingLoopTarget) {
            stopLoopPlacement();
            return;
        }
        if (drawing) {
            stopDrawing();
            Canvas.render();
        } else if (selectedHotspot) {
            selectedHotspot = null;
            closePopover();
            Canvas.render();
        }
    }

    function init() {
        const canvas = Canvas.getCanvasElement();
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('dblclick', handleCanvasDblClick);
        canvas.addEventListener('mousemove', handleCanvasMouseMove);
        canvas.addEventListener('mouseup', handleCanvasMouseUp);
        canvas.addEventListener('contextmenu', handleContextMenu);
    }

    return {
        init, initToolbar, renderHotspots, hitTest, hitTestAllStates, pointInPolygon,
        getSelected, isDrawing, stopDrawing, selectHotspot, closePopover,
        startLoopPlacement, stopLoopPlacement, isLoopPlacing, getHotspots,
        startConnecting, stopConnecting, isConnecting, getConnectSelection, confirmConnection,
        getAllHotspotsAllStates
    };
})();
