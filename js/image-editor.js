const ImageEditor = (() => {
    let images = [];
    let activeId = null;

    function initToolbar() {
        const loadBtn = document.getElementById('image-load');
        const fileInput = document.getElementById('image-file-input');
        if (loadBtn && fileInput) {
            loadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                Array.from(e.target.files).forEach(file => {
                    const url = URL.createObjectURL(file);
                    const img = new Image();
                    img.onload = () => {
                        images.push({
                            id: 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                            name: file.name,
                            src: url,
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                            el: img
                        });
                        renderImageList();
                    };
                    img.src = url;
                });
                fileInput.value = '';
            });
        }
        renderImageList();
    }

    function renderImageList() {
        const container = document.getElementById('image-list');
        if (!container) return;

        if (images.length === 0) {
            container.innerHTML = '<span class="panel-label" style="color:var(--text-secondary); padding:8px 0;">No images loaded.</span>';
            return;
        }

        container.innerHTML = images.map(img => `
            <div class="scene-card ${img.id === activeId ? 'active' : ''}" data-id="${img.id}">
                <div class="scene-thumb">
                    <img src="${img.src}" alt="${img.name}">
                </div>
                <div class="scene-card-info">
                    <span class="scene-card-name" style="pointer-events:none">${img.name}</span>
                    <span class="scene-card-meta">${img.width} × ${img.height}</span>
                </div>
                <div class="scene-card-actions">
                    <button class="panel-btn image-crop-btn" data-id="${img.id}">Crop 16:9</button>
                </div>
                <button class="scene-card-delete" data-id="${img.id}">&times;</button>
            </div>
        `).join('');

        container.querySelectorAll('.scene-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('scene-card-delete') || e.target.classList.contains('image-crop-btn')) return;
                showImage(card.dataset.id);
            });
        });

        container.querySelectorAll('.scene-card-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const idx = images.findIndex(i => i.id === id);
                if (idx !== -1) {
                    URL.revokeObjectURL(images[idx].src);
                    images.splice(idx, 1);
                    if (activeId === id) activeId = null;
                    renderImageList();
                }
            });
        });

        container.querySelectorAll('.image-crop-btn').forEach(btn => {
            btn.addEventListener('click', () => openCropTool(btn.dataset.id));
        });
    }

    function showImage(id) {
        const img = images.find(i => i.id === id);
        if (!img) return;
        activeId = id;
        HotspotEditor.closePopover();
        Canvas.loadImage(img.src).then(() => Canvas.render());
        renderImageList();
    }

    function isActive() {
        return activeId !== null;
    }

    function deactivate() {
        if (activeId) {
            activeId = null;
            // Restore the current scene's background
            const scene = SceneManager.getCurrentScene();
            if (scene) {
                const stateIdx = scene.editingStateIndex || 0;
                const state = scene.states[stateIdx] || scene.states[0];
                if (state && state.backgroundData) Canvas.loadImage(state.backgroundData);
            }
        }
    }

    // ── Crop Tool ──

    function openCropTool(id) {
        const img = images.find(i => i.id === id);
        if (!img) return;

        const RATIO = 16 / 9;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;';

        // Canvas for crop
        const cropCanvas = document.createElement('canvas');
        cropCanvas.style.cssText = 'cursor:crosshair;border:1px solid #332820;border-radius:4px;';

        // Bottom bar
        const bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:10px;margin-top:12px;';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'panel-btn primary';
        saveBtn.textContent = 'Save Crop';
        saveBtn.style.minWidth = '100px';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'panel-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.minWidth = '100px';

        bar.appendChild(saveBtn);
        bar.appendChild(cancelBtn);
        overlay.appendChild(cropCanvas);
        overlay.appendChild(bar);
        document.body.appendChild(overlay);

        // Size the crop canvas to fit the viewport
        const maxW = window.innerWidth * 0.85;
        const maxH = window.innerHeight * 0.75;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const cw = Math.round(img.width * scale);
        const ch = Math.round(img.height * scale);
        cropCanvas.width = cw;
        cropCanvas.height = ch;

        const ctx = cropCanvas.getContext('2d');

        // Selection state (in display coords)
        let sel = null;    // { x, y, w, h }
        let drag = null;   // { type: 'draw'|'move'|'resize', startX, startY, origSel }
        const HANDLE = 10;

        function draw() {
            ctx.clearRect(0, 0, cw, ch);
            ctx.drawImage(img.el, 0, 0, cw, ch);

            if (sel) {
                // Dim outside
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(0, 0, cw, sel.y);
                ctx.fillRect(0, sel.y, sel.x, sel.h);
                ctx.fillRect(sel.x + sel.w, sel.y, cw - sel.x - sel.w, sel.h);
                ctx.fillRect(0, sel.y + sel.h, cw, ch - sel.y - sel.h);

                // Selection border
                ctx.strokeStyle = '#ff6b35';
                ctx.lineWidth = 2;
                ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);

                // Corner handles
                ctx.fillStyle = '#ff6b35';
                const corners = getCorners();
                corners.forEach(c => {
                    ctx.fillRect(c.x - HANDLE / 2, c.y - HANDLE / 2, HANDLE, HANDLE);
                });

                // Dimension label
                const cropW = Math.round(sel.w / scale);
                const cropH = Math.round(sel.h / scale);
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(sel.x, sel.y - 22, 120, 20);
                ctx.fillStyle = '#f5f5f5';
                ctx.font = '12px monospace';
                ctx.fillText(`${cropW} × ${cropH}`, sel.x + 4, sel.y - 7);
            }
        }

        function getCorners() {
            if (!sel) return [];
            return [
                { x: sel.x, y: sel.y, cursor: 'nwse-resize' },
                { x: sel.x + sel.w, y: sel.y, cursor: 'nesw-resize' },
                { x: sel.x, y: sel.y + sel.h, cursor: 'nesw-resize' },
                { x: sel.x + sel.w, y: sel.y + sel.h, cursor: 'nwse-resize' }
            ];
        }

        function hitCorner(mx, my) {
            if (!sel) return -1;
            const corners = getCorners();
            for (let i = 0; i < corners.length; i++) {
                if (Math.abs(mx - corners[i].x) < HANDLE && Math.abs(my - corners[i].y) < HANDLE) return i;
            }
            return -1;
        }

        function insideSel(mx, my) {
            return sel && mx >= sel.x && mx <= sel.x + sel.w && my >= sel.y && my <= sel.y + sel.h;
        }

        function clampSel() {
            if (!sel) return;
            if (sel.w < 32) sel.w = 32;
            sel.h = sel.w / RATIO;
            if (sel.x < 0) sel.x = 0;
            if (sel.y < 0) sel.y = 0;
            if (sel.x + sel.w > cw) sel.x = cw - sel.w;
            if (sel.y + sel.h > ch) sel.y = ch - sel.h;
        }

        cropCanvas.addEventListener('mousedown', (e) => {
            const rect = cropCanvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            const ci = hitCorner(mx, my);
            if (ci >= 0) {
                drag = { type: 'resize', corner: ci, startX: mx, startY: my, origSel: { ...sel } };
            } else if (insideSel(mx, my)) {
                drag = { type: 'move', startX: mx, startY: my, origSel: { ...sel } };
            } else {
                sel = { x: mx, y: my, w: 0, h: 0 };
                drag = { type: 'draw', startX: mx, startY: my };
            }
        });

        cropCanvas.addEventListener('mousemove', (e) => {
            const rect = cropCanvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            // Update cursor
            if (!drag) {
                const ci = hitCorner(mx, my);
                if (ci >= 0) {
                    cropCanvas.style.cursor = getCorners()[ci].cursor;
                } else if (insideSel(mx, my)) {
                    cropCanvas.style.cursor = 'move';
                } else {
                    cropCanvas.style.cursor = 'crosshair';
                }
            }

            if (!drag) return;

            if (drag.type === 'draw') {
                const dx = mx - drag.startX;
                const w = Math.abs(dx);
                const h = w / RATIO;
                sel.x = dx >= 0 ? drag.startX : drag.startX - w;
                sel.y = my > drag.startY ? drag.startY : drag.startY - h;
                sel.w = w;
                sel.h = h;
                clampSel();
            } else if (drag.type === 'move') {
                sel.x = drag.origSel.x + (mx - drag.startX);
                sel.y = drag.origSel.y + (my - drag.startY);
                clampSel();
            } else if (drag.type === 'resize') {
                const o = drag.origSel;
                const ci = drag.corner;
                let newW, anchorX, anchorY;

                if (ci === 0) { // top-left
                    newW = o.w - (mx - drag.startX);
                    anchorX = o.x + o.w;
                    anchorY = o.y + o.h;
                } else if (ci === 1) { // top-right
                    newW = o.w + (mx - drag.startX);
                    anchorX = o.x;
                    anchorY = o.y + o.h;
                } else if (ci === 2) { // bottom-left
                    newW = o.w - (mx - drag.startX);
                    anchorX = o.x + o.w;
                    anchorY = o.y;
                } else { // bottom-right
                    newW = o.w + (mx - drag.startX);
                    anchorX = o.x;
                    anchorY = o.y;
                }

                if (newW < 32) newW = 32;
                const newH = newW / RATIO;

                if (ci === 0 || ci === 2) {
                    sel.x = anchorX - newW;
                } else {
                    sel.x = anchorX;
                }
                if (ci === 0 || ci === 1) {
                    sel.y = anchorY - newH;
                } else {
                    sel.y = anchorY;
                }
                sel.w = newW;
                sel.h = newH;
                clampSel();
            }

            draw();
        });

        cropCanvas.addEventListener('mouseup', () => { drag = null; });
        cropCanvas.addEventListener('mouseleave', () => { drag = null; });

        cancelBtn.addEventListener('click', () => overlay.remove());

        saveBtn.addEventListener('click', () => {
            if (!sel || sel.w < 2) { overlay.remove(); return; }

            // Convert display coords to image coords
            const sx = Math.round(sel.x / scale);
            const sy = Math.round(sel.y / scale);
            const sw = Math.round(sel.w / scale);
            const sh = Math.round(sel.h / scale);

            // Crop to temp canvas
            const tmp = document.createElement('canvas');
            tmp.width = sw;
            tmp.height = sh;
            const tctx = tmp.getContext('2d');
            tctx.drawImage(img.el, sx, sy, sw, sh, 0, 0, sw, sh);

            // Download
            const link = document.createElement('a');
            const baseName = img.name.replace(/\.[^.]+$/, '');
            link.download = baseName + '_cropped.png';
            link.href = tmp.toDataURL('image/png');
            link.click();

            // Update the image in our list
            const newUrl = tmp.toDataURL('image/png');
            const newImg = new Image();
            newImg.onload = () => {
                URL.revokeObjectURL(img.src);
                img.src = newUrl;
                img.width = sw;
                img.height = sh;
                img.el = newImg;
                renderImageList();
                if (activeId === img.id) Canvas.loadImage(newUrl);
            };
            newImg.src = newUrl;

            overlay.remove();
        });

        // Initial draw
        draw();
    }

    return { initToolbar, renderImageList, isActive, deactivate };
})();
