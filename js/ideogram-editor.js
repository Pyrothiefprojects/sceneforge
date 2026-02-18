const IdeogramEditor = (() => {
    // ========== STATE ==========
    let active = false;
    let ideograms = [];
    let currentIdeogramId = null;
    let ruinLibrary = [];
    let placedRuins = [];
    let selectedRuin = null;
    let activeTool = 'select'; // 'select' | 'addRuin' | 'color' | 'cut' | 'text' | 'createIdeogram'
    let viewport = { offsetX: 0, offsetY: 0, zoom: 1.0 };
    let draggingRuin = null;
    let rotationDialEl = null;
    let radialWheelEl = null;
    let pendingRuinPlacement = null;
    let ruinWheelOpen = false;
    let toolsPanelDrag = null;
    let colorPopoverEl = null;
    let resizing = null;      // { elem, handle, startX, startY, origX, origY, origW, origH }
    let cutSelection = null;  // { startX, startY, currentX, currentY } — actively drawing
    let cutBox = null;        // { x, y, w, h } — finalized box awaiting action
    let cutBoxDragging = null; // { startMouseX, startMouseY, startX, startY } — moving the box
    let cutMenuEl = null;     // DOM element for cut context menu
    let cutStamp = null;      // { canvas, width, height }
    let cutStampPos = null;   // { x, y } world-space tracking
    let clearRects = [];      // [{ x, y, w, h }] areas cleared by cut
    let showGrid = false;     // grid visibility toggle (default off)
    let lockAspect = true;    // aspect ratio lock for resize (default on)
    let textElements = [];    // [{ id, x, y, width, height, text, fontSize, color }]
    let textDrawing = null;   // { startX, startY, currentX, currentY } drag to define text area
    let textInputEl = null;   // DOM overlay for text input
    let selectedText = null;  // currently selected text element
    let draggingText = null;  // { te, startMouseX, startMouseY, startX, startY }
    let selectMouseDown = null; // { elem, type: 'ruin'|'text', startMouseX, startMouseY }
    let isomarkPlateImage = null;  // Image element for the selected plate background
    let isomarkPlatePath = '';     // image path string
    let isomarkRuinId = null;      // ruin ID overlaid on the plate
    let drawnShapes = [];        // [{ id, type: 'line'|'circle', ... }]
    let selectedShape = null;
    let draggingShape = null;    // { shape, startMouseX/Y, startX/Y, ... }
    let activeSubTool = 'line';  // 'line' | 'circle'
    let shapeDrawing = null;     // { startX, startY, currentX, currentY }
    let gridWasShown = false;    // saved grid state before createIdeogram activated
    let cutPolygonPoints = [];   // polygon vertices being built
    let cutPolygon = null;       // finalized polygon: [{ x, y }, ...]
    let cutPolygonDragging = null; // { startMouseX/Y, points: [...] }
    let cutMouseStart = null;    // { mx, my } to distinguish click vs drag for cut
    let scrollbarHEl = null;  // horizontal scrollbar track
    let scrollbarVEl = null;  // vertical scrollbar track
    let scrollDragging = null; // { axis: 'h'|'v', startMouse, startOffset }

    // ========== CONSTANTS ==========
    const GRID_SIZE = 40;
    const GRID_COLOR = '#cccccc';
    const GRID_BG = '#ffffff';
    const DEFAULT_RUIN_SIZE = 120; // fallback if image dimensions unknown
    const HANDLE_SIZE = 8;

    // ========== CANVAS ==========
    let canvas = null;
    let ctx = null;
    let toolsetEl = null;
    let imageCache = {};

    function _onMouseDown(e) { if (e.button === 0) handleMouseDown(e); }
    function _onMouseMove(e) { handleMouseMove(e); }
    function _onMouseUp(e) { if (e.button === 0) handleMouseUp(e); }
    function _onContextMenu(e) {
        e.preventDefault();
        if (activeTool !== 'select') {
            selectTool('select');
            render();
        }
    }
    function _onWheel(e) {
        e.preventDefault();
        viewport.offsetX -= e.deltaX;
        viewport.offsetY -= e.deltaY;
        viewport.offsetX = clampOffset('h');
        viewport.offsetY = clampOffset('v');
        updateScrollbars();
        render();
    }
    function _onKeyDown(e) {
        if (!active) return;
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedShape && document.activeElement === document.body) {
                e.preventDefault();
                drawnShapes = drawnShapes.filter(s => s !== selectedShape);
                selectedShape = null;
                render();
            }
        }
        if (e.key === 'Escape') {
            if (cutPolygonPoints.length > 0) { cutPolygonPoints = []; render(); }
            if (shapeDrawing) { shapeDrawing = null; render(); }
        }
    }

    function initCanvas() {
        canvas = document.getElementById('blueprint-canvas');
        if (!canvas) return false;
        ctx = canvas.getContext('2d');
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        canvas.addEventListener('mousedown', _onMouseDown);
        canvas.addEventListener('mousemove', _onMouseMove);
        canvas.addEventListener('mouseup', _onMouseUp);
        canvas.addEventListener('wheel', _onWheel, { passive: false });
        canvas.addEventListener('contextmenu', _onContextMenu);
        return true;
    }

    // ========== ACTIVATION / DEACTIVATION ==========
    function activate() {
        if (active) return;
        if (typeof BlueprintEditor !== 'undefined' && BlueprintEditor.isActive()) {
            BlueprintEditor.deactivate();
        }
        active = true;
        document.getElementById('game-canvas').classList.add('hidden');
        document.getElementById('blueprint-canvas').classList.remove('hidden');
        if (!canvas) { if (!initCanvas()) return; }
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        showToolset();
        createScrollbars();
        document.addEventListener('keydown', _onKeyDown);
        render();
    }

    function deactivate() {
        if (!active) return;
        active = false;
        document.removeEventListener('keydown', _onKeyDown);
        if (canvas) {
            canvas.removeEventListener('mousedown', _onMouseDown);
            canvas.removeEventListener('mousemove', _onMouseMove);
            canvas.removeEventListener('mouseup', _onMouseUp);
            canvas.removeEventListener('wheel', _onWheel);
            canvas = null; ctx = null;
        }
        document.getElementById('blueprint-canvas').classList.add('hidden');
        document.getElementById('game-canvas').classList.remove('hidden');
        hideToolset();
        removeScrollbars();
        removeCreateIdeogramSubTools();
        closeRotationDial();
        closeColorPopover();
        closeTextInput();
        closeCutMenu();
        closeRuinRadialWheel();
        selectedRuin = null;
        selectedText = null;
        selectedShape = null;
        draggingRuin = null;
        draggingText = null;
        draggingShape = null;
        shapeDrawing = null;
        resizing = null;
        selectMouseDown = null;
        cutSelection = null;
        cutBox = null;
        cutBoxDragging = null;
        cutStamp = null;
        cutStampPos = null;
        textDrawing = null;
        if (typeof Canvas !== 'undefined') Canvas.resize();
    }

    function isActive() { return active; }

    // ========== GRID RENDERING ==========
    // Draws grid in world coordinates (called inside the zoom transform)
    function renderGrid() {
        if (!showGrid) return;
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1 / viewport.zoom; // keep lines visually thin at all zoom levels
        ctx.setLineDash([2, 4]);
        // Calculate visible world bounds
        const worldLeft = -viewport.offsetX / viewport.zoom;
        const worldTop = -viewport.offsetY / viewport.zoom;
        const worldRight = worldLeft + canvas.width / viewport.zoom;
        const worldBottom = worldTop + canvas.height / viewport.zoom;
        const startX = Math.floor(worldLeft / GRID_SIZE) * GRID_SIZE;
        const startY = Math.floor(worldTop / GRID_SIZE) * GRID_SIZE;
        for (let x = startX; x <= worldRight; x += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(x, worldTop); ctx.lineTo(x, worldBottom); ctx.stroke();
        }
        for (let y = startY; y <= worldBottom; y += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(worldLeft, y); ctx.lineTo(worldRight, y); ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    function snapToGrid(value) {
        if (!showGrid) return value;
        return Math.round(value / GRID_SIZE) * GRID_SIZE;
    }

    // ========== SHAPE HELPERS ==========
    function computeLineBBox(shape) {
        const half = shape.thickness / 2;
        shape.x = Math.min(shape.x1, shape.x2) - half;
        shape.y = Math.min(shape.y1, shape.y2) - half;
        shape.width = Math.abs(shape.x2 - shape.x1) + shape.thickness;
        shape.height = Math.abs(shape.y2 - shape.y1) + shape.thickness;
    }

    function computeCircleBBox(shape) {
        const outer = shape.radius + shape.thickness / 2;
        shape.x = shape.cx - outer;
        shape.y = shape.cy - outer;
        shape.width = outer * 2;
        shape.height = outer * 2;
    }

    function constrainLineAngle(x1, y1, rawX2, rawY2) {
        const dx = rawX2 - x1;
        const dy = rawY2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return { x: x1, y: y1 };
        const angle = Math.atan2(dy, dx);
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const projectedDist = snapToGrid(dist) || GRID_SIZE;
        return {
            x: snapToGrid(x1 + Math.cos(snapAngle) * projectedDist),
            y: snapToGrid(y1 + Math.sin(snapAngle) * projectedDist)
        };
    }

    function pointToSegmentDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.sqrt((px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2);
    }

    function hitTestShape(mx, my) {
        for (let i = drawnShapes.length - 1; i >= 0; i--) {
            const s = drawnShapes[i];
            if (mx < s.x || mx > s.x + s.width || my < s.y || my > s.y + s.height) continue;
            if (s.type === 'line') {
                if (pointToSegmentDist(mx, my, s.x1, s.y1, s.x2, s.y2) <= s.thickness / 2 + 5) return s;
            } else if (s.type === 'circle') {
                const d = Math.sqrt((mx - s.cx) ** 2 + (my - s.cy) ** 2);
                const half = s.thickness / 2;
                if (d >= s.radius - half - 5 && d <= s.radius + half + 5) return s;
            }
        }
        return null;
    }

    function pointInPolygon(px, py, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    function updateLineFromBBox(shape) {
        const half = shape.thickness / 2;
        const innerW = Math.max(0, shape.width - shape.thickness);
        const innerH = Math.max(0, shape.height - shape.thickness);
        shape.x1 = shape.x + half + (shape.dirX < 0 ? innerW : 0);
        shape.y1 = shape.y + half + (shape.dirY < 0 ? innerH : 0);
        shape.x2 = shape.x + half + (shape.dirX < 0 ? 0 : innerW);
        shape.y2 = shape.y + half + (shape.dirY < 0 ? 0 : innerH);
    }

    function updateCircleFromBBox(shape) {
        shape.cx = shape.x + shape.width / 2;
        shape.cy = shape.y + shape.height / 2;
        const outerR = Math.min(shape.width, shape.height) / 2;
        shape.radius = Math.max(GRID_SIZE, outerR - shape.thickness / 2);
        computeCircleBBox(shape);
    }

    // ========== ZOOM SCROLLBARS ==========
    const SCROLL_PADDING = 200; // extra world-space padding beyond content bounds

    function getContentBounds() {
        let minX = 0, minY = 0, maxX = 0, maxY = 0;
        // Include canvas origin area
        if (canvas) {
            maxX = canvas.width / viewport.zoom;
            maxY = canvas.height / viewport.zoom;
        }
        placedRuins.forEach(r => {
            const w = r.width || DEFAULT_RUIN_SIZE;
            const h = r.height || DEFAULT_RUIN_SIZE;
            if (r.x < minX) minX = r.x;
            if (r.y < minY) minY = r.y;
            if (r.x + w > maxX) maxX = r.x + w;
            if (r.y + h > maxY) maxY = r.y + h;
        });
        textElements.forEach(t => {
            if (t.x < minX) minX = t.x;
            if (t.y < minY) minY = t.y;
            if (t.x + (t.width || 100) > maxX) maxX = t.x + (t.width || 100);
            if (t.y + (t.height || 20) > maxY) maxY = t.y + (t.height || 20);
        });
        clearRects.forEach(c => {
            if (c.x < minX) minX = c.x;
            if (c.y < minY) minY = c.y;
            if (c.x + c.w > maxX) maxX = c.x + c.w;
            if (c.y + c.h > maxY) maxY = c.y + c.h;
        });
        drawnShapes.forEach(s => {
            if (s.x < minX) minX = s.x;
            if (s.y < minY) minY = s.y;
            if (s.x + s.width > maxX) maxX = s.x + s.width;
            if (s.y + s.height > maxY) maxY = s.y + s.height;
        });
        return {
            minX: minX - SCROLL_PADDING,
            minY: minY - SCROLL_PADDING,
            maxX: maxX + SCROLL_PADDING,
            maxY: maxY + SCROLL_PADDING
        };
    }

    function clampOffset(axis) {
        const bounds = getContentBounds();
        const viewW = canvas.width / viewport.zoom;
        const viewH = canvas.height / viewport.zoom;
        if (axis === 'h') {
            const maxOff = -bounds.minX * viewport.zoom;
            const minOff = -(bounds.maxX - viewW) * viewport.zoom;
            return Math.max(Math.min(minOff, maxOff), Math.min(maxOff, viewport.offsetX));
        } else {
            const maxOff = -bounds.minY * viewport.zoom;
            const minOff = -(bounds.maxY - viewH) * viewport.zoom;
            return Math.max(Math.min(minOff, maxOff), Math.min(maxOff, viewport.offsetY));
        }
    }

    function createScrollbars() {
        removeScrollbars();
        const overlay = document.getElementById('hotspot-overlay');
        if (!overlay) return;

        scrollbarHEl = document.createElement('div');
        scrollbarHEl.className = 'ideogram-scrollbar ideogram-scrollbar-h';
        scrollbarHEl.innerHTML = '<div class="ideogram-scrollbar-thumb"></div>';
        overlay.appendChild(scrollbarHEl);

        scrollbarVEl = document.createElement('div');
        scrollbarVEl.className = 'ideogram-scrollbar ideogram-scrollbar-v';
        scrollbarVEl.innerHTML = '<div class="ideogram-scrollbar-thumb"></div>';
        overlay.appendChild(scrollbarVEl);

        const hThumb = scrollbarHEl.querySelector('.ideogram-scrollbar-thumb');
        const vThumb = scrollbarVEl.querySelector('.ideogram-scrollbar-thumb');

        hThumb.addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.preventDefault();
            scrollDragging = { axis: 'h', startMouse: e.clientX, startOffset: viewport.offsetX };
        });
        vThumb.addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.preventDefault();
            scrollDragging = { axis: 'v', startMouse: e.clientY, startOffset: viewport.offsetY };
        });

        // Track click to jump
        scrollbarHEl.addEventListener('mousedown', (e) => {
            if (e.target === scrollbarHEl) {
                e.stopPropagation();
                const r = scrollbarHEl.getBoundingClientRect();
                const ratio = (e.clientX - r.left) / r.width;
                const bounds = getContentBounds();
                const worldX = bounds.minX + ratio * (bounds.maxX - bounds.minX);
                viewport.offsetX = -(worldX - (canvas.width / viewport.zoom) / 2) * viewport.zoom;
                viewport.offsetX = clampOffset('h');
                updateScrollbars(); render();
            }
        });
        scrollbarVEl.addEventListener('mousedown', (e) => {
            if (e.target === scrollbarVEl) {
                e.stopPropagation();
                const r = scrollbarVEl.getBoundingClientRect();
                const ratio = (e.clientY - r.top) / r.height;
                const bounds = getContentBounds();
                const worldY = bounds.minY + ratio * (bounds.maxY - bounds.minY);
                viewport.offsetY = -(worldY - (canvas.height / viewport.zoom) / 2) * viewport.zoom;
                viewport.offsetY = clampOffset('v');
                updateScrollbars(); render();
            }
        });

        // Global drag handlers (only install once)
        if (!window._ideogramScrollHandler) {
            document.addEventListener('mousemove', (e) => {
                if (!scrollDragging) return;
                const bounds = getContentBounds();
                if (scrollDragging.axis === 'h') {
                    const trackW = scrollbarHEl.getBoundingClientRect().width;
                    const delta = e.clientX - scrollDragging.startMouse;
                    const contentW = (bounds.maxX - bounds.minX) * viewport.zoom;
                    viewport.offsetX = scrollDragging.startOffset - (delta / trackW) * contentW;
                    viewport.offsetX = clampOffset('h');
                } else {
                    const trackH = scrollbarVEl.getBoundingClientRect().height;
                    const delta = e.clientY - scrollDragging.startMouse;
                    const contentH = (bounds.maxY - bounds.minY) * viewport.zoom;
                    viewport.offsetY = scrollDragging.startOffset - (delta / trackH) * contentH;
                    viewport.offsetY = clampOffset('v');
                }
                updateScrollbars(); render();
            });
            document.addEventListener('mouseup', () => { scrollDragging = null; });
            window._ideogramScrollHandler = true;
        }

        updateScrollbars();
    }

    function updateScrollbars() {
        if (!scrollbarHEl || !scrollbarVEl || !canvas) return;
        const bounds = getContentBounds();
        const contentW = bounds.maxX - bounds.minX;
        const contentH = bounds.maxY - bounds.minY;
        const viewW = canvas.width / viewport.zoom;
        const viewH = canvas.height / viewport.zoom;

        const showH = contentW > viewW;
        const showV = contentH > viewH;
        scrollbarHEl.style.display = showH ? 'block' : 'none';
        scrollbarVEl.style.display = showV ? 'block' : 'none';

        if (showH) {
            const hThumb = scrollbarHEl.querySelector('.ideogram-scrollbar-thumb');
            const thumbPct = Math.max(5, (viewW / contentW) * 100);
            const scrollPos = (-viewport.offsetX / viewport.zoom - bounds.minX) / contentW * 100;
            hThumb.style.width = thumbPct + '%';
            hThumb.style.left = Math.max(0, Math.min(100 - thumbPct, scrollPos)) + '%';
        }

        if (showV) {
            const vThumb = scrollbarVEl.querySelector('.ideogram-scrollbar-thumb');
            const thumbPct = Math.max(5, (viewH / contentH) * 100);
            const scrollPos = (-viewport.offsetY / viewport.zoom - bounds.minY) / contentH * 100;
            vThumb.style.height = thumbPct + '%';
            vThumb.style.top = Math.max(0, Math.min(100 - thumbPct, scrollPos)) + '%';
        }
    }

    function removeScrollbars() {
        if (scrollbarHEl) { scrollbarHEl.remove(); scrollbarHEl = null; }
        if (scrollbarVEl) { scrollbarVEl.remove(); scrollbarVEl = null; }
        scrollDragging = null;
    }

    // ========== RENDER ==========
    function render() {
        if (!ctx) return;

        // Clear canvas in screen space
        ctx.fillStyle = GRID_BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Apply zoom transform — all subsequent drawing is in world coordinates
        ctx.save();
        ctx.translate(viewport.offsetX, viewport.offsetY);
        ctx.scale(viewport.zoom, viewport.zoom);

        renderGrid();
        placedRuins.forEach(ruin => renderPlacedRuin(ruin));
        textElements.forEach(te => renderTextElement(te));
        drawnShapes.forEach(shape => renderDrawnShape(shape));
        renderShapePreview();

        // Polygon cut preview
        if (cutPolygonPoints.length > 0 || cutPolygon) {
            ctx.save();
            ctx.strokeStyle = '#ff6b35';
            ctx.lineWidth = 2 / viewport.zoom;
            const pts = cutPolygon || cutPolygonPoints;
            if (pts.length > 0) {
                if (cutPolygon) {
                    // Finalized polygon — solid stroke + fill
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(255, 107, 53, 0.1)';
                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].y);
                    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                } else {
                    // In-progress — dashed lines between points
                    ctx.setLineDash([6, 4]);
                    ctx.fillStyle = 'rgba(255, 107, 53, 0.08)';
                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].y);
                    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
                    ctx.stroke();
                    // Close indicator dot on first point
                    ctx.fillStyle = '#ff6b35';
                    ctx.beginPath();
                    ctx.arc(pts[0].x, pts[0].y, 5 / viewport.zoom, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Cut selection preview (actively drawing)
        if (cutSelection) {
            const sx = Math.min(cutSelection.startX, cutSelection.currentX);
            const sy = Math.min(cutSelection.startY, cutSelection.currentY);
            const sw = Math.abs(cutSelection.currentX - cutSelection.startX);
            const sh = Math.abs(cutSelection.currentY - cutSelection.startY);
            ctx.save();
            ctx.strokeStyle = '#ff6b35';
            ctx.lineWidth = 2 / viewport.zoom;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(sx, sy, sw, sh);
            ctx.fillStyle = 'rgba(255, 107, 53, 0.08)';
            ctx.fillRect(sx, sy, sw, sh);
            ctx.restore();
        }

        // Finalized cut box (awaiting move/cut action)
        if (cutBox) {
            ctx.save();
            ctx.strokeStyle = '#ff6b35';
            ctx.lineWidth = 2 / viewport.zoom;
            ctx.setLineDash([]);
            ctx.strokeRect(cutBox.x, cutBox.y, cutBox.w, cutBox.h);
            ctx.fillStyle = 'rgba(255, 107, 53, 0.1)';
            ctx.fillRect(cutBox.x, cutBox.y, cutBox.w, cutBox.h);
            ctx.restore();
        }

        // Text area drawing preview
        if (textDrawing) {
            const tx = Math.min(textDrawing.startX, textDrawing.currentX);
            const ty = Math.min(textDrawing.startY, textDrawing.currentY);
            const tw = Math.abs(textDrawing.currentX - textDrawing.startX);
            const th = Math.abs(textDrawing.currentY - textDrawing.startY);
            ctx.save();
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1 / viewport.zoom;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(tx, ty, tw, th);
            ctx.fillStyle = 'rgba(51, 51, 51, 0.05)';
            ctx.fillRect(tx, ty, tw, th);
            ctx.restore();
        }

        ctx.restore(); // end zoom transform

        // Screen-space overlays (drawn after zoom restore)

        // Resize handles (constant size regardless of zoom) — shown on any selected element
        const selElem = getSelectedElement();
        if (selElem) {
            drawResizeHandles(selElem);
        }

        // Cut stamp following cursor (screen space)
        if (cutStamp && cutStampPos) {
            ctx.globalAlpha = 0.6;
            ctx.drawImage(cutStamp.canvas,
                cutStampPos.x * viewport.zoom + viewport.offsetX,
                cutStampPos.y * viewport.zoom + viewport.offsetY,
                cutStamp.width * viewport.zoom,
                cutStamp.height * viewport.zoom);
            ctx.globalAlpha = 1.0;
        }
    }

    function renderPlacedRuin(ruin) {
        const img = imageCache[ruin.ruinId];
        if (!img) return;
        // Skip if it's an Image element that hasn't loaded yet (Canvas elements are always ready)
        if (img.complete === false) return;

        const w = ruin.width || DEFAULT_RUIN_SIZE;
        const h = ruin.height || DEFAULT_RUIN_SIZE;
        const x = ruin.x;
        const y = ruin.y;
        const isSelected = ruin === selectedRuin;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const colorMode = ruin.colorMode || 'none';

        // Build the ruin image (potentially with color effects)
        let drawSource = img;
        if (colorMode === 'tint' || colorMode === 'fullcolor') {
            const offscreen = document.createElement('canvas');
            offscreen.width = w;
            offscreen.height = h;
            const oCtx = offscreen.getContext('2d');
            oCtx.drawImage(img, 0, 0, w, h);
            if (colorMode === 'tint') {
                oCtx.globalCompositeOperation = 'multiply';
                oCtx.fillStyle = ruin.color || '#ff0000';
                oCtx.fillRect(0, 0, w, h);
                oCtx.globalCompositeOperation = 'destination-in';
                oCtx.drawImage(img, 0, 0, w, h);
            } else {
                oCtx.globalCompositeOperation = 'source-in';
                oCtx.fillStyle = ruin.color || '#ff0000';
                oCtx.fillRect(0, 0, w, h);
            }
            drawSource = offscreen;
        }

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((ruin.rotation * Math.PI) / 180);
        if (ruin.mirrored) ctx.scale(-1, 1);

        // Background color mode
        if (colorMode === 'background') {
            ctx.fillStyle = ruin.color || '#ff0000';
            ctx.fillRect(-w / 2, -h / 2, w, h);
        }

        // Transparency mode
        if (colorMode === 'transparency') {
            ctx.globalAlpha = ruin.opacity != null ? ruin.opacity : 1.0;
        }

        ctx.drawImage(drawSource, -w / 2, -h / 2, w, h);
        ctx.globalAlpha = 1.0;

        // Selection border (drawn in rotated space so it wraps the image)
        if (isSelected) {
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 3 / viewport.zoom;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
        }

        ctx.restore();

    }

    // ========== RESIZE HANDLES ==========
    function getSelectedElement() {
        if (selectedRuin) return selectedRuin;
        if (selectedText) return selectedText;
        if (selectedShape) return selectedShape;
        return null;
    }

    // Returns handle positions in screen space (accounts for zoom, offset, AND rotation)
    function getResizeHandles(elem) {
        const w = elem.width || DEFAULT_RUIN_SIZE;
        const h = elem.height || DEFAULT_RUIN_SIZE;
        const rot = (elem.rotation || 0) * Math.PI / 180;
        const cx = (elem.x + w / 2) * viewport.zoom + viewport.offsetX;
        const cy = (elem.y + h / 2) * viewport.zoom + viewport.offsetY;
        const sw = w * viewport.zoom;
        const sh = h * viewport.zoom;
        const hs = HANDLE_SIZE;

        // Local offsets from center (unrotated)
        const locals = [
            { id: 'tl', lx: -sw/2, ly: -sh/2 },
            { id: 't',  lx: 0,     ly: -sh/2 },
            { id: 'tr', lx: sw/2,  ly: -sh/2 },
            { id: 'r',  lx: sw/2,  ly: 0 },
            { id: 'br', lx: sw/2,  ly: sh/2 },
            { id: 'b',  lx: 0,     ly: sh/2 },
            { id: 'bl', lx: -sw/2, ly: sh/2 },
            { id: 'l',  lx: -sw/2, ly: 0 }
        ];

        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        return locals.map(h => ({
            id: h.id,
            x: cx + h.lx * cosR - h.ly * sinR - hs/2,
            y: cy + h.lx * sinR + h.ly * cosR - hs/2
        }));
    }

    function drawResizeHandles(ruin) {
        const handles = getResizeHandles(ruin);
        ctx.fillStyle = '#00e5ff';
        ctx.strokeStyle = '#005566';
        ctx.lineWidth = 1;
        handles.forEach(h => {
            ctx.fillRect(h.x, h.y, HANDLE_SIZE, HANDLE_SIZE);
            ctx.strokeRect(h.x, h.y, HANDLE_SIZE, HANDLE_SIZE);
        });
    }

    function hitTestHandle(mx, my) {
        const selElem = getSelectedElement();
        if (!selElem) return null;
        const handles = getResizeHandles(selElem);
        const hs = HANDLE_SIZE;
        // Convert world coords to screen space for comparison with screen-space handles
        const sx = mx * viewport.zoom + viewport.offsetX;
        const sy = my * viewport.zoom + viewport.offsetY;
        for (const h of handles) {
            // Check distance from handle center (works for rotated handles)
            const hcx = h.x + hs / 2;
            const hcy = h.y + hs / 2;
            if (Math.abs(sx - hcx) <= hs / 2 && Math.abs(sy - hcy) <= hs / 2) {
                return h.id;
            }
        }
        return null;
    }

    // ========== IMAGE CACHE ==========
    // Load image via fetch → blob URL to avoid tainting the canvas on export
    function loadImageClean(src, callback) {
        if (!src) return;
        if (src.startsWith('data:') || src.startsWith('blob:')) {
            const img = new Image();
            img.onload = () => callback(img);
            img.src = src;
            return;
        }
        fetch(src)
            .then(r => r.blob())
            .then(blob => {
                const img = new Image();
                img.onload = () => callback(img);
                img.src = URL.createObjectURL(blob);
            })
            .catch(() => {
                // Fallback: load directly (may taint canvas)
                const img = new Image();
                img.onload = () => callback(img);
                img.src = src;
            });
    }

    function loadRuinImage(ruinId) {
        const ruinDef = ruinLibrary.find(r => r.id === ruinId);
        if (!ruinDef || imageCache[ruinId]) return;
        loadImageClean(ruinDef.image, (img) => {
            imageCache[ruinId] = img;
            render();
        });
    }

    function preloadAllRuinImages() {
        ruinLibrary.forEach(r => loadRuinImage(r.id));
    }

    // ========== TOOLSET UI ==========
    function showToolset() {
        const panel = document.getElementById('ideogram-tools-panel');
        const body = document.getElementById('ideogram-tools-body');
        if (!panel || !body) return;

        body.innerHTML = `
            <div class="blueprint-tool-grid">
                <button class="blueprint-tool" data-tool="addRuin" title="Add Asset">
                    <span class="tool-icon">&#x25C6;</span>
                    <span class="tool-label">Asset</span>
                </button>
                <button class="blueprint-tool" data-tool="color" title="Color">
                    <span class="tool-icon">&#x25CF;</span>
                    <span class="tool-label">Color</span>
                </button>
                <button class="blueprint-tool" data-tool="cut" title="Cut">
                    <span class="tool-icon">&#x2702;</span>
                    <span class="tool-label">Cut</span>
                </button>
                <button class="blueprint-tool" data-tool="text" title="Text">
                    <span class="tool-icon">T</span>
                    <span class="tool-label">Text</span>
                </button>
                <button class="blueprint-tool" data-tool="createIdeogram" title="Create Ideogram">
                    <span class="tool-icon">&#x270E;</span>
                    <span class="tool-label">Ideogram</span>
                </button>
            </div>
            <div id="ideogram-subtool-row" class="ideogram-subtool-row" style="display:none;"></div>
            <div style="display:flex; align-items:center; gap:8px; padding:4px 0;">
                <label style="font-size:11px; color:var(--text-secondary); display:flex; align-items:center; gap:4px; cursor:pointer;">
                    <input type="checkbox" id="ideogram-grid-toggle"${showGrid ? ' checked' : ''} style="accent-color:var(--accent-orange);">
                    Show Grid
                </label>
                <label style="font-size:11px; color:var(--text-secondary); display:flex; align-items:center; gap:4px; cursor:pointer;">
                    <input type="checkbox" id="ideogram-aspect-toggle"${lockAspect ? ' checked' : ''} style="accent-color:var(--accent-orange);">
                    Lock Aspect
                </label>
            </div>
            <div style="display:flex; align-items:center; gap:6px; padding:4px 0;">
                <label style="font-size:11px; color:var(--text-secondary); white-space:nowrap;">Zoom</label>
                <input type="range" id="ideogram-zoom-slider" min="0.25" max="4" step="0.05" value="${viewport.zoom}" style="flex:1; accent-color:var(--accent-orange);">
                <span id="ideogram-zoom-val" style="font-size:10px; color:var(--accent-gold); min-width:32px; text-align:right;">${Math.round(viewport.zoom * 100)}%</span>
            </div>
            <div class="panel-divider-h"></div>
            <div class="ideogram-ruin-library">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                    <span class="panel-label">Asset Codex</span>
                    <div style="display:flex; gap:4px;">
                        <button class="panel-btn primary" id="ideogram-add-ruin-lib">+ Add</button>
                        <button class="panel-btn" id="ideogram-save-ruin" title="Save selected asset as PNG">Save</button>
                    </div>
                    <input type="file" id="ideogram-ruin-file" accept="image/png,image/*" multiple style="display:none">
                </div>
                <div id="ideogram-ruin-list" class="ideogram-ruin-list"></div>
            </div>
            <div class="panel-divider-h"></div>
            <div class="ideogram-isomark-section">
                <span class="panel-label">IsoMark</span>
                <div style="margin-top:6px; display:flex; gap:4px; align-items:center;">
                    <button class="panel-btn" id="isomark-plate-upload">Set Plate</button>
                    <span id="isomark-plate-label" style="font-size:10px; color:var(--text-secondary);">No plate set</span>
                    <input type="file" id="isomark-plate-file" accept="image/png,image/*" style="display:none">
                </div>
                <div style="margin-top:8px;">
                    <canvas id="isomark-preview" width="200" height="200" style="border:1px solid var(--accent-rust); border-radius:4px; background:#1a1a1a; display:block; width:100%; height:auto;"></canvas>
                </div>
                <div style="margin-top:4px; font-size:10px; color:var(--text-secondary);">Click a ruin to overlay on plate.</div>
                <div style="margin-top:6px; display:flex; gap:4px;">
                    <button class="panel-btn primary" id="isomark-save" disabled>Save Plate</button>
                    <button class="panel-btn" id="isomark-clear">Clear</button>
                </div>
            </div>
        `;

        body.querySelectorAll('.blueprint-tool').forEach(btn => {
            btn.addEventListener('click', () => selectTool(btn.dataset.tool));
        });

        const closeBtn = document.getElementById('ideogram-tools-close');
        if (closeBtn) closeBtn.addEventListener('click', hideToolset);

        const gridToggle = document.getElementById('ideogram-grid-toggle');
        if (gridToggle) {
            gridToggle.addEventListener('change', () => {
                showGrid = gridToggle.checked;
                render();
            });
        }

        const aspectToggle = document.getElementById('ideogram-aspect-toggle');
        if (aspectToggle) {
            aspectToggle.addEventListener('change', () => {
                lockAspect = aspectToggle.checked;
            });
        }

        const zoomSlider = document.getElementById('ideogram-zoom-slider');
        const zoomVal = document.getElementById('ideogram-zoom-val');
        if (zoomSlider) {
            zoomSlider.addEventListener('input', () => {
                viewport.zoom = parseFloat(zoomSlider.value);
                zoomVal.textContent = Math.round(viewport.zoom * 100) + '%';
                updateScrollbars();
                render();
            });
        }

        const addBtn = document.getElementById('ideogram-add-ruin-lib');
        const fileInput = document.getElementById('ideogram-ruin-file');
        if (addBtn && fileInput) {
            addBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                for (const file of e.target.files) {
                    const name = file.name.replace(/\.[^.]+$/, '').replace(/^ruin_/, '').replace(/_/g, ' ');
                    const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
                    const imagePath = 'assets/puzzles/' + file.name;
                    addRuinToLibrary(capitalName, imagePath);
                }
                fileInput.value = '';
            });
        }

        const saveBtn = document.getElementById('ideogram-save-ruin');
        if (saveBtn) saveBtn.addEventListener('click', saveSelectedRuinAsPng);

        const header = panel.querySelector('.float-panel-header');
        if (header) {
            header.addEventListener('mousedown', (e) => {
                if (e.target.closest('.float-panel-close')) return;
                const rect = panel.getBoundingClientRect();
                toolsPanelDrag = {
                    startX: e.clientX, startY: e.clientY,
                    origLeft: rect.left, origTop: rect.top
                };
                panel.style.right = 'auto';
                panel.style.left = rect.left + 'px';
                panel.style.top = rect.top + 'px';
                e.preventDefault();
            });
        }

        if (!window.ideogramToolsDragHandlersAdded) {
            document.addEventListener('mousemove', (e) => {
                if (!toolsPanelDrag) return;
                const p = document.getElementById('ideogram-tools-panel');
                if (!p) return;
                p.style.left = (toolsPanelDrag.origLeft + e.clientX - toolsPanelDrag.startX) + 'px';
                p.style.top = (toolsPanelDrag.origTop + e.clientY - toolsPanelDrag.startY) + 'px';
            });
            document.addEventListener('mouseup', () => { toolsPanelDrag = null; });
            window.ideogramToolsDragHandlersAdded = true;
        }

        // IsoMark bindings
        const isoUploadBtn = document.getElementById('isomark-plate-upload');
        const isoFileInput = document.getElementById('isomark-plate-file');
        if (isoUploadBtn && isoFileInput) {
            isoUploadBtn.addEventListener('click', () => isoFileInput.click());
            isoFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        isomarkPlateImage = img;
                        isomarkPlatePath = ev.target.result;
                        renderIsomarkPreview();
                        updateIsomarkSaveBtn();
                        const label = document.getElementById('isomark-plate-label');
                        if (label) label.textContent = file.name;
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
                isoFileInput.value = '';
            });
        }
        const isoSaveBtn = document.getElementById('isomark-save');
        if (isoSaveBtn) isoSaveBtn.addEventListener('click', saveIsomarkPlate);
        const isoClearBtn = document.getElementById('isomark-clear');
        if (isoClearBtn) isoClearBtn.addEventListener('click', clearIsomark);

        panel.classList.remove('hidden');
        toolsetEl = body;
        renderRuinLibraryList();
    }

    function hideToolset() {
        const panel = document.getElementById('ideogram-tools-panel');
        if (panel) panel.classList.add('hidden');
        toolsetEl = null;
    }

    function selectTool(toolName) {
        // Close any tool-specific UI when switching
        closeRotationDial();
        closeColorPopover();
        closeTextInput();
        closeCutMenu();
        if (cutStamp) { cutStamp = null; cutStampPos = null; }
        cutSelection = null;
        cutBox = null;
        cutBoxDragging = null;
        cutPolygonPoints = [];
        cutPolygon = null;
        cutPolygonDragging = null;
        cutMouseStart = null;
        textDrawing = null;
        selectedText = null;
        resizing = null;
        selectMouseDown = null;
        shapeDrawing = null;
        selectedShape = null;
        draggingShape = null;

        // Restore grid when leaving createIdeogram
        if (activeTool === 'createIdeogram') {
            showGrid = gridWasShown;
            const gridToggle = document.getElementById('ideogram-grid-toggle');
            if (gridToggle) gridToggle.checked = showGrid;
            removeCreateIdeogramSubTools();
        }

        if (activeTool === toolName) {
            activeTool = 'select';
            if (toolsetEl) toolsetEl.querySelectorAll('.blueprint-tool').forEach(btn => btn.classList.remove('active'));
        } else {
            activeTool = toolName;
            if (toolsetEl) {
                toolsetEl.querySelectorAll('.blueprint-tool').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tool === toolName);
                });
            }
            // Auto-show grid when entering createIdeogram
            if (toolName === 'createIdeogram') {
                gridWasShown = showGrid;
                showGrid = true;
                const gridToggle = document.getElementById('ideogram-grid-toggle');
                if (gridToggle) gridToggle.checked = true;
                showCreateIdeogramSubTools();
            }
        }
        render();
    }

    // ========== RUIN LIBRARY MANAGEMENT ==========
    function addRuinToLibrary(name, imagePath) {
        const id = 'ruin_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        ruinLibrary.push({ id, name, image: imagePath });
        loadRuinImage(id);
        renderRuinLibraryList();
        return id;
    }

    function removeRuinFromLibrary(id) {
        ruinLibrary = ruinLibrary.filter(r => r.id !== id);
        delete imageCache[id];
        renderRuinLibraryList();
    }

    async function saveSelectedRuinAsPng() {
        // Handle saving a drawn shape
        if (selectedShape) {
            return saveSelectedShapeAsPng();
        }
        if (!selectedRuin) { alert('Select an asset on the canvas first.'); return; }

        const ruin = selectedRuin;
        const img = imageCache[ruin.ruinId];
        if (!img) { alert('Ruin image not loaded.'); return; }

        const w = ruin.width || DEFAULT_RUIN_SIZE;
        const h = ruin.height || DEFAULT_RUIN_SIZE;
        const colorMode = ruin.colorMode || 'none';

        // Render the ruin to an offscreen canvas (with color effects, rotation, mirror)
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const oCtx = offscreen.getContext('2d');

        // Build color-affected source
        let drawSource = img;
        if (colorMode === 'tint' || colorMode === 'fullcolor') {
            const fx = document.createElement('canvas');
            fx.width = w; fx.height = h;
            const fCtx = fx.getContext('2d');
            fCtx.drawImage(img, 0, 0, w, h);
            if (colorMode === 'tint') {
                fCtx.globalCompositeOperation = 'multiply';
                fCtx.fillStyle = ruin.color || '#ff0000';
                fCtx.fillRect(0, 0, w, h);
                fCtx.globalCompositeOperation = 'destination-in';
                fCtx.drawImage(img, 0, 0, w, h);
            } else {
                fCtx.globalCompositeOperation = 'source-in';
                fCtx.fillStyle = ruin.color || '#ff0000';
                fCtx.fillRect(0, 0, w, h);
            }
            drawSource = fx;
        }

        oCtx.save();
        oCtx.translate(w / 2, h / 2);
        oCtx.rotate((ruin.rotation * Math.PI) / 180);
        if (ruin.mirrored) oCtx.scale(-1, 1);

        if (colorMode === 'background') {
            oCtx.fillStyle = ruin.color || '#ff0000';
            oCtx.fillRect(-w / 2, -h / 2, w, h);
        }
        if (colorMode === 'transparency') {
            oCtx.globalAlpha = ruin.opacity != null ? ruin.opacity : 1.0;
        }
        oCtx.drawImage(drawSource, -w / 2, -h / 2, w, h);
        oCtx.restore();

        // Prompt for a name
        const ruinDef = ruinLibrary.find(r => r.id === ruin.ruinId);
        const defaultName = ruinDef ? ruinDef.name : 'ruin';
        const ruinName = prompt('Name for this ruin:', defaultName);
        if (!ruinName) return; // cancelled

        const fileName = ruinName.toLowerCase().replace(/\s+/g, '_') + '.png';
        const dataUrl = offscreen.toDataURL('image/png');

        // Convert to blob for file download
        const byteString = atob(dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: 'image/png' });

        // Try File System Access API for save-as dialog
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } catch (err) {
                if (err.name === 'AbortError') return; // user cancelled
            }
        } else {
            // Fallback: download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }

        // Add to library with data URL so it's immediately usable
        addRuinToLibrary(ruinName, dataUrl);
    }

    async function saveSelectedShapeAsPng() {
        const shape = selectedShape;
        if (!shape) return;

        // Use the selected shape's bounding box as the capture region
        const pad = GRID_SIZE;
        const sx = shape.x;
        const sy = shape.y;
        const cw = Math.ceil(shape.width);
        const ch = Math.ceil(shape.height);
        const offW = cw + pad * 2;
        const offH = ch + pad * 2;
        const offscreen = document.createElement('canvas');
        offscreen.width = offW; offscreen.height = offH;
        const oCtx = offscreen.getContext('2d');

        // Offset so the capture region starts at (pad, pad)
        const ox = -sx + pad;
        const oy = -sy + pad;

        // Draw ALL ruins that overlap the bounding box
        placedRuins.forEach(ruin => {
            const img = imageCache[ruin.ruinId];
            if (!img || img.complete === false) return;
            const rw = ruin.width || DEFAULT_RUIN_SIZE;
            const rh = ruin.height || DEFAULT_RUIN_SIZE;
            if (ruin.x + rw < sx || ruin.x > sx + cw || ruin.y + rh < sy || ruin.y > sy + ch) return;
            oCtx.save();
            oCtx.translate(ruin.x + rw / 2 + ox, ruin.y + rh / 2 + oy);
            oCtx.rotate((ruin.rotation * Math.PI) / 180);
            if (ruin.mirrored) oCtx.scale(-1, 1);
            oCtx.drawImage(img, -rw / 2, -rh / 2, rw, rh);
            oCtx.restore();
        });

        // Draw ALL text elements that overlap
        textElements.forEach(te => {
            const tx = te.x + ox, ty = te.y + oy;
            if (te.x + te.width < sx || te.x > sx + cw || te.y + te.height < sy || te.y > sy + ch) return;
            oCtx.save();
            oCtx.font = (te.fontSize || 14) + 'px sans-serif';
            oCtx.fillStyle = te.color || '#333333';
            oCtx.textBaseline = 'top';
            const words = (te.text || '').split(' ');
            let line = '';
            let lineY = ty + 4;
            const maxWidth = te.width - 8;
            for (let i = 0; i < words.length; i++) {
                const testLine = line + (line ? ' ' : '') + words[i];
                if (oCtx.measureText(testLine).width > maxWidth && line) {
                    oCtx.fillText(line, tx + 4, lineY);
                    line = words[i];
                    lineY += (te.fontSize || 14) + 2;
                    if (lineY > ty + te.height - 4) break;
                } else { line = testLine; }
            }
            if (lineY <= ty + te.height - 4) oCtx.fillText(line, tx + 4, lineY);
            oCtx.restore();
        });

        // Draw ALL shapes that overlap
        drawnShapes.forEach(s => {
            if (s.x + s.width < sx || s.x > sx + cw || s.y + s.height < sy || s.y > sy + ch) return;
            oCtx.save();
            const rot = (s.rotation || 0) * Math.PI / 180;
            const scx = s.x + s.width / 2 + ox;
            const scy = s.y + s.height / 2 + oy;
            oCtx.translate(scx, scy);
            oCtx.rotate(rot);
            if (s.mirrored) oCtx.scale(-1, 1);
            oCtx.translate(-scx, -scy);
            oCtx.strokeStyle = s.color || '#000000';
            oCtx.lineWidth = s.thickness || 80;
            oCtx.lineCap = 'round';
            oCtx.lineJoin = 'round';
            if (s.type === 'line') {
                oCtx.beginPath();
                oCtx.moveTo(s.x1 + ox, s.y1 + oy);
                oCtx.lineTo(s.x2 + ox, s.y2 + oy);
                oCtx.stroke();
            } else if (s.type === 'circle') {
                oCtx.beginPath();
                oCtx.arc(s.cx + ox, s.cy + oy, s.radius, 0, Math.PI * 2);
                oCtx.stroke();
            }
            oCtx.restore();
        });

        const shapeName = prompt('Name for this asset:', 'Ideogram');
        if (!shapeName) return;

        const dataUrl = offscreen.toDataURL('image/png');
        const fileName = shapeName.toLowerCase().replace(/\s+/g, '_') + '.png';
        const byteString = atob(dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: 'image/png' });

        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = fileName; a.click();
            URL.revokeObjectURL(url);
        }

        // Add to library with data URL so it's immediately usable
        addRuinToLibrary(shapeName, dataUrl);
    }

    function renderRuinLibraryList() {
        const container = document.getElementById('ideogram-ruin-list');
        if (!container) return;
        if (ruinLibrary.length === 0) {
            container.innerHTML = '<span style="font-size:11px; color:var(--text-secondary); padding:4px 0;">No ruins loaded.</span>';
            return;
        }
        container.innerHTML = ruinLibrary.map(r => `
            <div class="ideogram-ruin-item" data-id="${r.id}">
                <img src="${r.image}" alt="${r.name}">
                <span class="ideogram-ruin-item-name">${r.name}</span>
                <button class="ideogram-ruin-remove" data-id="${r.id}">&times;</button>
            </div>
        `).join('');
        container.querySelectorAll('.ideogram-ruin-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeRuinFromLibrary(btn.dataset.id);
            });
        });
        // Click ruin item to set as IsoMark overlay
        container.querySelectorAll('.ideogram-ruin-item').forEach(item => {
            item.addEventListener('click', () => {
                const ruinId = item.dataset.id;
                isomarkRuinId = ruinId;
                // Highlight the selected ruin
                container.querySelectorAll('.ideogram-ruin-item').forEach(el => el.classList.remove('isomark-selected'));
                item.classList.add('isomark-selected');
                renderIsomarkPreview();
                updateIsomarkSaveBtn();
            });
        });
    }

    // ========== COLOR POPOVER ==========
    function showColorPopover(ruin) {
        closeColorPopover();
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const w = ruin.width || DEFAULT_RUIN_SIZE;
        const px = canvasRect.left + (ruin.x + w) * viewport.zoom + viewport.offsetX + 12;
        const py = canvasRect.top + ruin.y * viewport.zoom + viewport.offsetY;

        colorPopoverEl = document.createElement('div');
        colorPopoverEl.className = 'ideogram-color-popover';
        colorPopoverEl.style.position = 'fixed';
        colorPopoverEl.style.left = px + 'px';
        colorPopoverEl.style.top = py + 'px';

        const currentMode = ruin.colorMode || 'none';
        const currentColor = ruin.color || '#ff0000';
        const currentOpacity = ruin.opacity != null ? ruin.opacity : 1.0;

        colorPopoverEl.innerHTML = `
            <div style="margin-bottom:8px;">
                <input type="color" id="ideo-color-pick" value="${currentColor}" style="width:100%; height:30px; border:none; cursor:pointer;">
            </div>
            <div class="ideogram-color-modes">
                <label><input type="radio" name="ideo-color-mode" value="none" ${currentMode === 'none' ? 'checked' : ''}> None</label>
                <label><input type="radio" name="ideo-color-mode" value="transparency" ${currentMode === 'transparency' ? 'checked' : ''}> Transparency</label>
                <label><input type="radio" name="ideo-color-mode" value="background" ${currentMode === 'background' ? 'checked' : ''}> Background</label>
                <label><input type="radio" name="ideo-color-mode" value="tint" ${currentMode === 'tint' ? 'checked' : ''}> Tint</label>
                <label><input type="radio" name="ideo-color-mode" value="fullcolor" ${currentMode === 'fullcolor' ? 'checked' : ''}> Full Color</label>
            </div>
            <div id="ideo-opacity-row" style="margin-top:8px; ${currentMode === 'transparency' ? '' : 'display:none;'}">
                <label style="font-size:11px; color:var(--text-secondary);">Opacity</label>
                <input type="range" id="ideo-opacity-slider" min="0" max="1" step="0.05" value="${currentOpacity}" style="width:100%; accent-color:var(--accent-orange);">
                <span id="ideo-opacity-val" style="font-size:10px; color:var(--accent-gold);">${Math.round(currentOpacity * 100)}%</span>
            </div>
        `;

        document.getElementById('hotspot-overlay').appendChild(colorPopoverEl);

        // Prevent clicks inside popover from reaching the canvas
        colorPopoverEl.addEventListener('mousedown', (e) => e.stopPropagation());

        // Bind events
        const colorInput = colorPopoverEl.querySelector('#ideo-color-pick');
        const modeRadios = colorPopoverEl.querySelectorAll('input[name="ideo-color-mode"]');
        const opacityRow = colorPopoverEl.querySelector('#ideo-opacity-row');
        const opacitySlider = colorPopoverEl.querySelector('#ideo-opacity-slider');
        const opacityVal = colorPopoverEl.querySelector('#ideo-opacity-val');

        colorInput.addEventListener('input', () => {
            ruin.color = colorInput.value;
            render();
        });

        modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                ruin.colorMode = radio.value;
                opacityRow.style.display = radio.value === 'transparency' ? '' : 'none';
                render();
            });
        });

        opacitySlider.addEventListener('input', () => {
            ruin.opacity = parseFloat(opacitySlider.value);
            opacityVal.textContent = Math.round(ruin.opacity * 100) + '%';
            render();
        });
    }

    function closeColorPopover() {
        if (colorPopoverEl) { colorPopoverEl.remove(); colorPopoverEl = null; }
    }

    // ========== CUT MENU ==========
    function showCutMenu(screenX, screenY) {
        closeCutMenu();
        const overlay = document.getElementById('hotspot-overlay');
        if (!overlay) return;

        const menu = document.createElement('div');
        menu.className = 'ideogram-cut-menu';
        menu.style.position = 'absolute';
        menu.style.left = screenX + 'px';
        menu.style.top = screenY + 'px';

        const moveBtn = document.createElement('button');
        moveBtn.textContent = 'Move';
        moveBtn.className = 'ideogram-cut-menu-btn';
        moveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeCutMenu();
            // Box stays — next mouseDown inside it will start dragging
        });

        const cutBtn = document.createElement('button');
        cutBtn.textContent = 'Cut';
        cutBtn.className = 'ideogram-cut-menu-btn';
        cutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeCutMenu();
            executeCut();
        });

        menu.appendChild(moveBtn);
        menu.appendChild(cutBtn);
        menu.addEventListener('mousedown', (e) => e.stopPropagation());
        overlay.appendChild(menu);
        cutMenuEl = menu;
    }

    function closeCutMenu() {
        if (cutMenuEl) { cutMenuEl.remove(); cutMenuEl = null; }
    }

    function executeCut() {
        // Determine cut region — rect box or polygon
        let sx, sy, cw, ch, polyClip = null;
        if (cutPolygon && cutPolygon.length >= 3) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            cutPolygon.forEach(p => {
                if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
            });
            sx = minX; sy = minY;
            cw = Math.round(maxX - minX); ch = Math.round(maxY - minY);
            polyClip = cutPolygon;
        } else if (cutBox) {
            sx = cutBox.x; sy = cutBox.y; cw = Math.round(cutBox.w); ch = Math.round(cutBox.h);
        } else { return; }

        if (cw < 2 || ch < 2) return;

        const offscreen = document.createElement('canvas');
        offscreen.width = cw; offscreen.height = ch;
        const oCtx = offscreen.getContext('2d');

        // Apply polygon clipping if polygon cut
        if (polyClip) {
            oCtx.beginPath();
            oCtx.moveTo(polyClip[0].x - sx, polyClip[0].y - sy);
            for (let i = 1; i < polyClip.length; i++) oCtx.lineTo(polyClip[i].x - sx, polyClip[i].y - sy);
            oCtx.closePath();
            oCtx.clip();
        }

        // Draw ruins
        placedRuins.forEach(ruin => {
            const img = imageCache[ruin.ruinId];
            if (!img || img.complete === false) return;
            const rw = ruin.width || DEFAULT_RUIN_SIZE;
            const rh = ruin.height || DEFAULT_RUIN_SIZE;
            const rx = ruin.x - sx, ry = ruin.y - sy;
            if (rx + rw < 0 || rx > cw || ry + rh < 0 || ry > ch) return;
            oCtx.save();
            oCtx.translate(rx + rw / 2, ry + rh / 2);
            oCtx.rotate((ruin.rotation * Math.PI) / 180);
            if (ruin.mirrored) oCtx.scale(-1, 1);
            oCtx.drawImage(img, -rw / 2, -rh / 2, rw, rh);
            oCtx.restore();
        });

        // Draw text elements
        textElements.forEach(te => {
            const tx = te.x - sx, ty = te.y - sy;
            if (tx + te.width < 0 || tx > cw || ty + te.height < 0 || ty > ch) return;
            oCtx.save();
            oCtx.font = (te.fontSize || 14) + 'px sans-serif';
            oCtx.fillStyle = te.color || '#333333';
            oCtx.textBaseline = 'top';
            const words = (te.text || '').split(' ');
            let line = '';
            let lineY = ty + 4;
            const maxWidth = te.width - 8;
            for (let i = 0; i < words.length; i++) {
                const testLine = line + (line ? ' ' : '') + words[i];
                if (oCtx.measureText(testLine).width > maxWidth && line) {
                    oCtx.fillText(line, tx + 4, lineY);
                    line = words[i];
                    lineY += (te.fontSize || 14) + 2;
                    if (lineY > ty + te.height - 4) break;
                } else { line = testLine; }
            }
            if (lineY <= ty + te.height - 4) oCtx.fillText(line, tx + 4, lineY);
            oCtx.restore();
        });

        // Draw shapes
        drawnShapes.forEach(shape => {
            oCtx.save();
            const rot = (shape.rotation || 0) * Math.PI / 180;
            const scx = shape.x + shape.width / 2 - sx;
            const scy = shape.y + shape.height / 2 - sy;
            oCtx.translate(scx, scy);
            oCtx.rotate(rot);
            if (shape.mirrored) oCtx.scale(-1, 1);
            oCtx.translate(-scx, -scy);
            oCtx.strokeStyle = shape.color || '#000000';
            oCtx.lineWidth = shape.thickness || 80;
            oCtx.lineCap = 'round';
            oCtx.lineJoin = 'round';
            if (shape.type === 'line') {
                oCtx.beginPath();
                oCtx.moveTo(shape.x1 - sx, shape.y1 - sy);
                oCtx.lineTo(shape.x2 - sx, shape.y2 - sy);
                oCtx.stroke();
            } else if (shape.type === 'circle') {
                oCtx.beginPath();
                oCtx.arc(shape.cx - sx, shape.cy - sy, shape.radius, 0, Math.PI * 2);
                oCtx.stroke();
            }
            oCtx.restore();
        });

        cutStamp = { canvas: offscreen, width: cw, height: ch };
        cutStampPos = { x: sx, y: sy };
        cutBox = null;
        cutPolygon = null;
        render();
    }

    // ========== TEXT TOOL ==========
    function renderTextElement(te) {
        const x = te.x;
        const y = te.y;
        const w = te.width;
        const h = te.height;
        const fontSize = te.fontSize || 14;
        const color = te.color || '#333333';

        ctx.save();
        ctx.font = fontSize + 'px sans-serif';
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';

        // Word-wrap text within the box
        const words = (te.text || '').split(' ');
        let line = '';
        let lineY = y + 4;
        const maxWidth = w - 8;

        for (let i = 0; i < words.length; i++) {
            const testLine = line + (line ? ' ' : '') + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line) {
                ctx.fillText(line, x + 4, lineY);
                line = words[i];
                lineY += fontSize + 2;
                if (lineY > y + h - 4) break;
            } else {
                line = testLine;
            }
        }
        if (lineY <= y + h - 4) {
            ctx.fillText(line, x + 4, lineY);
        }
        ctx.restore();

        // Selection border
        if (te === selectedText) {
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
        }
    }

    function hitTestText(mx, my) {
        for (let i = textElements.length - 1; i >= 0; i--) {
            const te = textElements[i];
            if (mx >= te.x && mx <= te.x + te.width && my >= te.y && my <= te.y + te.height) {
                return te;
            }
        }
        return null;
    }

    function showTextInput(te) {
        closeTextInput();
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const px = canvasRect.left + te.x * viewport.zoom + viewport.offsetX;
        const py = canvasRect.top + te.y * viewport.zoom + viewport.offsetY;

        textInputEl = document.createElement('div');
        textInputEl.className = 'ideogram-text-input';
        textInputEl.style.position = 'fixed';
        textInputEl.style.left = px + 'px';
        textInputEl.style.top = py + 'px';
        textInputEl.style.width = (te.width * viewport.zoom) + 'px';
        textInputEl.style.minHeight = (te.height * viewport.zoom) + 'px';

        const textarea = document.createElement('textarea');
        textarea.value = te.text || '';
        textarea.style.cssText = 'width:100%; min-height:' + te.height + 'px; background:var(--bg-input); border:1px solid var(--accent-orange); color:var(--text-primary); font-size:' + (te.fontSize || 14) + 'px; font-family:sans-serif; padding:4px; resize:none; outline:none; border-radius:4px;';
        textarea.placeholder = 'Enter text...';

        const controls = document.createElement('div');
        controls.style.cssText = 'display:flex; gap:4px; margin-top:4px; align-items:center;';
        controls.innerHTML = `
            <label style="font-size:10px; color:var(--text-secondary);">Size</label>
            <input type="number" id="ideo-text-size" value="${te.fontSize || 14}" min="8" max="72" step="1" style="width:48px; background:var(--bg-input); border:1px solid var(--accent-rust); color:var(--text-primary); font-size:11px; padding:2px 4px; border-radius:3px;">
            <input type="color" id="ideo-text-color" value="${te.color || '#333333'}" style="width:24px; height:24px; border:none; cursor:pointer;">
            <button id="ideo-text-done" style="margin-left:auto; background:var(--accent-rust); color:#fff; border:none; padding:3px 10px; border-radius:4px; cursor:pointer; font-size:11px;">Done</button>
            <button id="ideo-text-delete" style="background:#661111; color:#ff4444; border:none; padding:3px 8px; border-radius:4px; cursor:pointer; font-size:11px;">&#x2716;</button>
        `;

        textInputEl.appendChild(textarea);
        textInputEl.appendChild(controls);
        document.getElementById('hotspot-overlay').appendChild(textInputEl);

        // Prevent clicks inside text input from reaching the canvas
        textInputEl.addEventListener('mousedown', (e) => e.stopPropagation());

        textarea.focus();

        // Live update
        textarea.addEventListener('input', () => {
            te.text = textarea.value;
            render();
        });

        const sizeInput = controls.querySelector('#ideo-text-size');
        sizeInput.addEventListener('input', () => {
            te.fontSize = parseInt(sizeInput.value) || 14;
            textarea.style.fontSize = te.fontSize + 'px';
            render();
        });

        const colorInput = controls.querySelector('#ideo-text-color');
        colorInput.addEventListener('input', () => {
            te.color = colorInput.value;
            render();
        });

        controls.querySelector('#ideo-text-done').addEventListener('click', () => {
            closeTextInput();
            render();
        });

        controls.querySelector('#ideo-text-delete').addEventListener('click', () => {
            textElements = textElements.filter(t => t !== te);
            if (selectedText === te) selectedText = null;
            closeTextInput();
            render();
        });
    }

    function closeTextInput() {
        if (textInputEl) { textInputEl.remove(); textInputEl = null; }
    }

    // ========== CREATE IDEOGRAM TOOL ==========
    function renderDrawnShape(shape) {
        ctx.save();
        const rot = (shape.rotation || 0) * Math.PI / 180;
        const scx = shape.x + shape.width / 2;
        const scy = shape.y + shape.height / 2;
        ctx.translate(scx, scy);
        ctx.rotate(rot);
        if (shape.mirrored) ctx.scale(-1, 1);
        ctx.translate(-scx, -scy);
        ctx.strokeStyle = shape.color || '#000000';
        ctx.lineWidth = shape.thickness || 80;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (shape.type === 'line') {
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
        } else if (shape.type === 'circle') {
            ctx.beginPath();
            ctx.arc(shape.cx, shape.cy, shape.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (shape === selectedShape) {
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 3 / viewport.zoom;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            ctx.setLineDash([]);
        }
        ctx.restore();
    }

    function renderShapePreview() {
        if (!shapeDrawing || activeTool !== 'createIdeogram') return;
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = GRID_SIZE * 2;
        ctx.lineCap = 'round';
        ctx.setLineDash([6, 6]);
        if (activeSubTool === 'line') {
            const c = constrainLineAngle(shapeDrawing.startX, shapeDrawing.startY, shapeDrawing.currentX, shapeDrawing.currentY);
            ctx.beginPath();
            ctx.moveTo(shapeDrawing.startX, shapeDrawing.startY);
            ctx.lineTo(c.x, c.y);
            ctx.stroke();
        } else if (activeSubTool === 'circle') {
            const dx = shapeDrawing.currentX - shapeDrawing.startX;
            const dy = shapeDrawing.currentY - shapeDrawing.startY;
            const radius = snapToGrid(Math.sqrt(dx * dx + dy * dy));
            if (radius > 0) {
                ctx.beginPath();
                ctx.arc(shapeDrawing.startX, shapeDrawing.startY, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.setLineDash([]);
        ctx.restore();
    }

    function showCreateIdeogramSubTools() {
        const row = document.getElementById('ideogram-subtool-row');
        if (!row) return;
        row.style.display = 'flex';
        row.innerHTML = `
            <button class="ideogram-subtool${activeSubTool === 'line' ? ' active' : ''}" data-subtool="line" title="Line">
                <span class="tool-icon">&#x2571;</span><span class="tool-label">Line</span>
            </button>
            <button class="ideogram-subtool${activeSubTool === 'circle' ? ' active' : ''}" data-subtool="circle" title="Circle">
                <span class="tool-icon">&#x25CB;</span><span class="tool-label">Circle</span>
            </button>
        `;
        row.querySelectorAll('.ideogram-subtool').forEach(btn => {
            btn.addEventListener('click', () => {
                if (activeSubTool === btn.dataset.subtool) {
                    // Toggle off — deselect sub-tool
                    activeSubTool = null;
                    row.querySelectorAll('.ideogram-subtool').forEach(b => b.classList.remove('active'));
                } else {
                    activeSubTool = btn.dataset.subtool;
                    row.querySelectorAll('.ideogram-subtool').forEach(b => b.classList.toggle('active', b.dataset.subtool === activeSubTool));
                }
                shapeDrawing = null;
                render();
            });
        });
    }

    function removeCreateIdeogramSubTools() {
        const row = document.getElementById('ideogram-subtool-row');
        if (row) { row.style.display = 'none'; row.innerHTML = ''; }
    }

    function showShapeColorPopover(shape) {
        closeColorPopover();
        if (!canvas) return;
        const canvasRect = canvas.getBoundingClientRect();
        const px = canvasRect.left + (shape.x + shape.width) * viewport.zoom + viewport.offsetX + 12;
        const py = canvasRect.top + shape.y * viewport.zoom + viewport.offsetY;

        colorPopoverEl = document.createElement('div');
        colorPopoverEl.className = 'ideogram-color-popover';
        colorPopoverEl.style.position = 'fixed';
        colorPopoverEl.style.left = px + 'px';
        colorPopoverEl.style.top = py + 'px';
        colorPopoverEl.innerHTML = `
            <div style="margin-bottom:8px;">
                <input type="color" id="ideo-shape-color-pick" value="${shape.color || '#000000'}" style="width:100%; height:30px; border:none; cursor:pointer;">
            </div>
            <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
                <label>Thickness</label>
                <input type="range" id="ideo-shape-thickness" min="${GRID_SIZE}" max="${GRID_SIZE * 5}" step="${GRID_SIZE}" value="${shape.thickness || GRID_SIZE * 2}" style="width:100%; accent-color:var(--accent-orange);">
                <span id="ideo-shape-thickness-val" style="font-size:10px; color:var(--accent-gold);">${shape.thickness || GRID_SIZE * 2}px</span>
            </div>
        `;
        document.getElementById('hotspot-overlay').appendChild(colorPopoverEl);
        colorPopoverEl.addEventListener('mousedown', (e) => e.stopPropagation());

        colorPopoverEl.querySelector('#ideo-shape-color-pick').addEventListener('input', (e) => {
            shape.color = e.target.value;
            render();
        });
        const thicknessSlider = colorPopoverEl.querySelector('#ideo-shape-thickness');
        const thicknessVal = colorPopoverEl.querySelector('#ideo-shape-thickness-val');
        thicknessSlider.addEventListener('input', () => {
            shape.thickness = parseInt(thicknessSlider.value);
            thicknessVal.textContent = shape.thickness + 'px';
            if (shape.type === 'line') computeLineBBox(shape);
            else if (shape.type === 'circle') computeCircleBBox(shape);
            render();
        });
    }

    // ========== ISOMARK COMPOSITOR ==========
    // Build an offscreen canvas of a placed ruin with all effects (color, rotation, mirror, opacity)
    function buildRuinComposite(ruin) {
        const img = imageCache[ruin.ruinId];
        if (!img || img.complete === false) return null;
        const w = ruin.width || DEFAULT_RUIN_SIZE;
        const h = ruin.height || DEFAULT_RUIN_SIZE;
        const colorMode = ruin.colorMode || 'none';

        let drawSource = img;
        if (colorMode === 'tint' || colorMode === 'fullcolor') {
            const fx = document.createElement('canvas');
            fx.width = w; fx.height = h;
            const fCtx = fx.getContext('2d');
            fCtx.drawImage(img, 0, 0, w, h);
            if (colorMode === 'tint') {
                fCtx.globalCompositeOperation = 'multiply';
                fCtx.fillStyle = ruin.color || '#ff0000';
                fCtx.fillRect(0, 0, w, h);
                fCtx.globalCompositeOperation = 'destination-in';
                fCtx.drawImage(img, 0, 0, w, h);
            } else {
                fCtx.globalCompositeOperation = 'source-in';
                fCtx.fillStyle = ruin.color || '#ff0000';
                fCtx.fillRect(0, 0, w, h);
            }
            drawSource = fx;
        }

        const offscreen = document.createElement('canvas');
        offscreen.width = w; offscreen.height = h;
        const oCtx = offscreen.getContext('2d');
        oCtx.save();
        oCtx.translate(w / 2, h / 2);
        oCtx.rotate((ruin.rotation * Math.PI) / 180);
        if (ruin.mirrored) oCtx.scale(-1, 1);
        if (colorMode === 'background') {
            oCtx.fillStyle = ruin.color || '#ff0000';
            oCtx.fillRect(-w / 2, -h / 2, w, h);
        }
        if (colorMode === 'transparency') {
            oCtx.globalAlpha = ruin.opacity != null ? ruin.opacity : 1.0;
        }
        oCtx.drawImage(drawSource, -w / 2, -h / 2, w, h);
        oCtx.restore();
        return offscreen;
    }

    function renderIsomarkPreview() {
        const cvs = document.getElementById('isomark-preview');
        if (!cvs) return;
        const pCtx = cvs.getContext('2d');
        pCtx.clearRect(0, 0, cvs.width, cvs.height);

        if (!isomarkPlateImage) return;

        // Draw plate scaled to fit preview, centered
        const pw = isomarkPlateImage.naturalWidth || isomarkPlateImage.width;
        const ph = isomarkPlateImage.naturalHeight || isomarkPlateImage.height;
        const scale = Math.min(cvs.width / pw, cvs.height / ph);
        const sw = pw * scale;
        const sh = ph * scale;
        const sx = (cvs.width - sw) / 2;
        const sy = (cvs.height - sh) / 2;
        pCtx.drawImage(isomarkPlateImage, sx, sy, sw, sh);

        // Draw selected ruin overlay centered on plate, sized proportionally
        if (isomarkRuinId && selectedRuin && selectedRuin.ruinId === isomarkRuinId) {
            const composite = buildRuinComposite(selectedRuin);
            if (composite) {
                // Use ruin's canvas size relative to plate's natural size
                const drw = (composite.width / pw) * sw;
                const drh = (composite.height / ph) * sh;
                const drx = sx + (sw - drw) / 2;
                const dry = sy + (sh - drh) / 2;
                pCtx.drawImage(composite, drx, dry, drw, drh);
            }
        } else if (isomarkRuinId) {
            // Fallback: raw library image (no placed ruin selected)
            const ruinImg = imageCache[isomarkRuinId];
            if (ruinImg && ruinImg.complete !== false) {
                const rw = ruinImg.naturalWidth || ruinImg.width;
                const rh = ruinImg.naturalHeight || ruinImg.height;
                // Scale to fit 70% of plate area as default
                const maxW = sw * 0.7;
                const maxH = sh * 0.7;
                const rScale = Math.min(maxW / rw, maxH / rh, 1);
                const drw = rw * rScale;
                const drh = rh * rScale;
                const drx = sx + (sw - drw) / 2;
                const dry = sy + (sh - drh) / 2;
                pCtx.drawImage(ruinImg, drx, dry, drw, drh);
            }
        }
    }

    function updateIsomarkSaveBtn() {
        const btn = document.getElementById('isomark-save');
        if (btn) btn.disabled = !(isomarkPlateImage && isomarkRuinId);
    }

    async function saveIsomarkPlate() {
        if (!isomarkPlateImage || !isomarkRuinId) return;

        const plateName = prompt('Name for this plate:', 'IsoMarked Plate');
        if (!plateName) return;

        try {
            const pw = isomarkPlateImage.naturalWidth || isomarkPlateImage.width;
            const ph = isomarkPlateImage.naturalHeight || isomarkPlateImage.height;

            const offscreen = document.createElement('canvas');
            offscreen.width = pw;
            offscreen.height = ph;
            const oCtx = offscreen.getContext('2d');

            // Draw plate
            oCtx.drawImage(isomarkPlateImage, 0, 0, pw, ph);

            // Draw ruin centered (with effects if a placed ruin is selected)
            let ruinSource = null;
            if (selectedRuin && selectedRuin.ruinId === isomarkRuinId) {
                ruinSource = buildRuinComposite(selectedRuin);
            }
            if (!ruinSource) {
                const ruinImg = imageCache[isomarkRuinId];
                if (ruinImg && ruinImg.complete !== false) ruinSource = ruinImg;
            }
            if (ruinSource) {
                let drw, drh;
                if (selectedRuin && selectedRuin.ruinId === isomarkRuinId) {
                    drw = selectedRuin.width || DEFAULT_RUIN_SIZE;
                    drh = selectedRuin.height || DEFAULT_RUIN_SIZE;
                } else {
                    const rw = ruinSource.naturalWidth || ruinSource.width;
                    const rh = ruinSource.naturalHeight || ruinSource.height;
                    const maxW = pw * 0.7;
                    const maxH = ph * 0.7;
                    const rScale = Math.min(maxW / rw, maxH / rh, 1);
                    drw = rw * rScale;
                    drh = rh * rScale;
                }
                const drx = (pw - drw) / 2;
                const dry = (ph - drh) / 2;
                oCtx.drawImage(ruinSource, drx, dry, drw, drh);
            }

            const dataUrl = offscreen.toDataURL('image/png');

            const fileName = plateName.toLowerCase().replace(/\s+/g, '_') + '.png';

            // Save as file — convert data URL to blob for File System Access API
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            const blob = new Blob([ab], { type: mimeString });

            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
            }

            // Add to ruin library
            addRuinToLibrary(plateName, dataUrl);

        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('IsoMark save failed:', err);
            alert('PNG export requires a local server.\n\nRun in project folder:\n  python3 -m http.server\n\nThen open http://localhost:8000');
        }
    }

    function clearIsomark() {
        isomarkPlateImage = null;
        isomarkPlatePath = '';
        isomarkRuinId = null;
        const label = document.getElementById('isomark-plate-label');
        if (label) label.textContent = 'No plate set';
        const container = document.getElementById('ideogram-ruin-list');
        if (container) container.querySelectorAll('.ideogram-ruin-item').forEach(el => el.classList.remove('isomark-selected'));
        renderIsomarkPreview();
        updateIsomarkSaveBtn();
    }

    // ========== RADIAL WHEEL ==========
    function openRuinRadialWheel(clientX, clientY, gridX, gridY) {
        closeRuinRadialWheel();
        if (ruinLibrary.length === 0) return;
        pendingRuinPlacement = { x: gridX, y: gridY };

        radialWheelEl = document.createElement('div');
        radialWheelEl.className = 'radial-wheel';
        radialWheelEl.id = 'ideogram-radial-wheel';

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'radial-wheel-items';

        const padding = 80;
        const cx = Math.max(padding, Math.min(window.innerWidth - padding, clientX));
        const cy = Math.max(padding, Math.min(window.innerHeight - padding, clientY));
        const radius = ruinLibrary.length === 1 ? 0 : Math.max(70, ruinLibrary.length * 18);
        const angleStep = (2 * Math.PI) / ruinLibrary.length;
        const startAngle = -Math.PI / 2;

        ruinLibrary.forEach((ruin, i) => {
            const angle = startAngle + angleStep * i;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;

            const el = document.createElement('div');
            el.className = 'radial-wheel-item';
            el.style.left = x + 'px';
            el.style.top = y + 'px';

            if (ruin.image) {
                const img = document.createElement('img');
                img.src = ruin.image;
                img.alt = ruin.name;
                el.appendChild(img);
            }
            const nameEl = document.createElement('span');
            nameEl.className = 'radial-wheel-item-name';
            nameEl.textContent = ruin.name;
            el.appendChild(nameEl);

            el.addEventListener('click', (e) => { e.stopPropagation(); handleRuinSelection(ruin.id); });
            el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); closeRuinRadialWheel(); });
            itemsContainer.appendChild(el);
        });

        radialWheelEl.appendChild(itemsContainer);
        document.body.appendChild(radialWheelEl);
        ruinWheelOpen = true;

        radialWheelEl.addEventListener('click', (e) => {
            if (!e.target.closest('.radial-wheel-item')) closeRuinRadialWheel();
        });
    }

    function closeRuinRadialWheel() {
        if (radialWheelEl) { radialWheelEl.remove(); radialWheelEl = null; }
        ruinWheelOpen = false;
        pendingRuinPlacement = null;
    }

    function handleRuinSelection(ruinId) {
        if (!pendingRuinPlacement) { closeRuinRadialWheel(); return; }
        const { x, y } = pendingRuinPlacement;
        // Use the image's natural dimensions instead of grid-based sizing
        const img = imageCache[ruinId];
        const natW = (img && img.naturalWidth) ? img.naturalWidth : 120;
        const natH = (img && img.naturalHeight) ? img.naturalHeight : 120;
        const placed = {
            id: 'placed_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            ruinId,
            x, y,
            width: natW,
            height: natH,
            rotation: 0,
            mirrored: false,
            colorMode: 'none',
            color: '#ff0000',
            opacity: 1.0
        };
        placedRuins.push(placed);
        selectRuin(placed);
        render();
        closeRuinRadialWheel();
    }

    // ========== MOUSE INTERACTION ==========
    function handleMouseDown(e) {
        if (ruinWheelOpen) return;

        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left - viewport.offsetX) / viewport.zoom;
        const my = (e.clientY - rect.top - viewport.offsetY) / viewport.zoom;

        // Cut stamp placement
        if (cutStamp) {
            const ruinName = prompt('Name for this ruin:', 'Cutout');
            if (!ruinName) { cutStamp = null; cutStampPos = null; render(); return; }

            const cutoutId = 'cutout_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

            // Store the stamp canvas directly in imageCache (works with drawImage)
            imageCache[cutoutId] = cutStamp.canvas;

            // Try to get a data URL for persistence (may fail if canvas is tainted)
            let imageUrl = '';
            try { imageUrl = cutStamp.canvas.toDataURL(); } catch (e) { /* tainted canvas */ }

            ruinLibrary.push({ id: cutoutId, name: ruinName, image: imageUrl });

            const placed = {
                id: 'placed_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                ruinId: cutoutId,
                x: snapToGrid(mx - cutStamp.width / 2),
                y: snapToGrid(my - cutStamp.height / 2),
                width: cutStamp.width,
                height: cutStamp.height,
                rotation: 0, mirrored: false,
                colorMode: 'none', color: '#ff0000', opacity: 1.0
            };
            placedRuins.push(placed);
            cutStamp = null;
            cutStampPos = null;
            renderRuinLibraryList();
            render();
            return;
        }

        // Add Ruin tool (never snaps — places at exact click position)
        if (activeTool === 'addRuin') {
            openRuinRadialWheel(e.clientX, e.clientY, mx, my);
            return;
        }

        // Cut tool — polygon or rectangle selection
        if (activeTool === 'cut') {
            closeCutMenu();
            // Finalized polygon — check inside for drag, outside to discard
            if (cutPolygon) {
                if (pointInPolygon(mx, my, cutPolygon)) {
                    cutPolygonDragging = { startMouseX: mx, startMouseY: my, points: cutPolygon.map(p => ({ ...p })) };
                    return;
                }
                cutPolygon = null;
                cutPolygonDragging = null;
            }
            // Building polygon — add point or close
            if (cutPolygonPoints.length > 0) {
                const first = cutPolygonPoints[0];
                const closeDist = Math.sqrt((mx - first.x) ** 2 + (my - first.y) ** 2);
                if (cutPolygonPoints.length >= 3 && closeDist < 15 / viewport.zoom) {
                    // Close the polygon
                    cutPolygon = cutPolygonPoints.slice();
                    cutPolygonPoints = [];
                    render();
                    showCutMenu(e.clientX, e.clientY);
                } else {
                    cutPolygonPoints.push({ x: snapToGrid(mx), y: snapToGrid(my) });
                    render();
                }
                return;
            }
            // Finalized rect box — drag or discard
            if (cutBox) {
                if (mx >= cutBox.x && mx <= cutBox.x + cutBox.w &&
                    my >= cutBox.y && my <= cutBox.y + cutBox.h) {
                    cutBoxDragging = { startMouseX: mx, startMouseY: my, startX: cutBox.x, startY: cutBox.y };
                    return;
                }
                cutBox = null;
                cutBoxDragging = null;
            }
            // Record start for click vs drag detection
            cutMouseStart = { mx: snapToGrid(mx), my: snapToGrid(my), rawMx: mx, rawMy: my };
            cutSelection = { startX: snapToGrid(mx), startY: snapToGrid(my), currentX: snapToGrid(mx), currentY: snapToGrid(my) };
            return;
        }

        // Color tool - click ruin or shape to show popover
        if (activeTool === 'color') {
            const hit = hitTestRuin(mx, my);
            if (hit) {
                selectRuin(hit);
                showColorPopover(hit);
            } else {
                const hitShape = hitTestShape(mx, my);
                if (hitShape) {
                    selectedShape = hitShape;
                    selectedRuin = null;
                    selectedText = null;
                    showShapeColorPopover(hitShape);
                    render();
                } else {
                    closeColorPopover();
                    deselectRuin();
                    selectedShape = null;
                }
            }
            return;
        }

        // Text tool - click existing text to edit, or start drawing new text area
        if (activeTool === 'text') {
            const hitTe = hitTestText(mx, my);
            if (hitTe) {
                selectedText = hitTe;
                showTextInput(hitTe);
                render();
            } else {
                closeTextInput();
                selectedText = null;
                textDrawing = { startX: snapToGrid(mx), startY: snapToGrid(my), currentX: snapToGrid(mx), currentY: snapToGrid(my) };
            }
            return;
        }

        // Create Ideogram tool — only draw when a sub-tool is selected
        if (activeTool === 'createIdeogram' && activeSubTool) {
            closeRotationDial();
            selectedShape = null;
            shapeDrawing = { startX: snapToGrid(mx), startY: snapToGrid(my), currentX: snapToGrid(mx), currentY: snapToGrid(my) };
            render();
            return;
        }

        // Select mode (default) — handle hit first, then body hit, click vs drag

        // 1. Check resize handle hit on any selected element
        const selElem = getSelectedElement();
        if (selElem) {
            const handleId = hitTestHandle(mx, my);
            if (handleId) {
                resizing = {
                    elem: selElem,
                    handle: handleId,
                    startX: mx, startY: my,
                    origX: selElem.x, origY: selElem.y,
                    origW: selElem.width || DEFAULT_RUIN_SIZE,
                    origH: selElem.height || DEFAULT_RUIN_SIZE
                };
                closeRotationDial();
                closeTextInput();
                return;
            }
        }

        // 2. Hit test ruins
        const hit = hitTestRuin(mx, my);
        if (hit) {
            if (hit === selectedRuin) {
                draggingRuin = {
                    ruin: hit,
                    startMouseX: mx, startMouseY: my,
                    startX: hit.x, startY: hit.y
                };
                selectMouseDown = { elem: hit, type: 'ruin', startMouseX: mx, startMouseY: my };
                closeRotationDial();
                closeColorPopover();
            } else {
                if (selectedText) { selectedText = null; closeTextInput(); }
                if (selectedShape) { selectedShape = null; }
                selectRuin(hit);
            }
            return;
        }

        // 3. Hit test text elements
        const hitTe = hitTestText(mx, my);
        if (hitTe) {
            if (hitTe === selectedText) {
                draggingText = {
                    te: hitTe,
                    startMouseX: mx, startMouseY: my,
                    startX: hitTe.x, startY: hitTe.y
                };
                selectMouseDown = { elem: hitTe, type: 'text', startMouseX: mx, startMouseY: my };
                closeTextInput();
            } else {
                if (selectedRuin) deselectRuin();
                if (selectedShape) { selectedShape = null; }
                selectedText = hitTe;
                render();
            }
            return;
        }

        // 3.5. Hit test drawn shapes
        const hitSh = hitTestShape(mx, my);
        if (hitSh) {
            if (hitSh === selectedShape) {
                closeRotationDial();
                selectMouseDown = { startMouseX: mx, startMouseY: my };
                draggingShape = {
                    shape: hitSh, startMouseX: mx, startMouseY: my,
                    startX: hitSh.x, startY: hitSh.y,
                    startX1: hitSh.x1, startY1: hitSh.y1,
                    startX2: hitSh.x2, startY2: hitSh.y2,
                    startCx: hitSh.cx, startCy: hitSh.cy
                };
            } else {
                closeRotationDial();
                if (selectedRuin) deselectRuin();
                if (selectedText) { selectedText = null; closeTextInput(); }
                selectedShape = hitSh;
            }
            render();
            return;
        }

        // 4. Click on empty space — deselect all
        closeRotationDial();
        if (selectedRuin) deselectRuin();
        if (selectedText) { selectedText = null; closeTextInput(); render(); }
        if (selectedShape) { selectedShape = null; render(); }
    }

    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left - viewport.offsetX) / viewport.zoom;
        const my = (e.clientY - rect.top - viewport.offsetY) / viewport.zoom;

        // Cut stamp following cursor (track in world coords)
        if (cutStamp) {
            cutStampPos = {
                x: mx - cutStamp.width / 2,
                y: my - cutStamp.height / 2
            };
            render();
            return;
        }

        // Cut selection drag (drawing new box)
        if (cutSelection) {
            cutSelection.currentX = snapToGrid(mx);
            cutSelection.currentY = snapToGrid(my);
            render();
            return;
        }

        // Cut box dragging (moving finalized box)
        if (cutBoxDragging) {
            cutBox.x = snapToGrid(cutBoxDragging.startX + (mx - cutBoxDragging.startMouseX));
            cutBox.y = snapToGrid(cutBoxDragging.startY + (my - cutBoxDragging.startMouseY));
            render();
            return;
        }

        // Cut polygon dragging
        if (cutPolygonDragging) {
            const dx = mx - cutPolygonDragging.startMouseX;
            const dy = my - cutPolygonDragging.startMouseY;
            cutPolygon = cutPolygonDragging.points.map(p => ({ x: snapToGrid(p.x + dx), y: snapToGrid(p.y + dy) }));
            render();
            return;
        }

        // Shape drawing preview
        if (shapeDrawing && activeTool === 'createIdeogram') {
            shapeDrawing.currentX = snapToGrid(mx);
            shapeDrawing.currentY = snapToGrid(my);
            render();
            return;
        }

        // Shape dragging
        if (draggingShape) {
            const dx = snapToGrid(mx - draggingShape.startMouseX);
            const dy = snapToGrid(my - draggingShape.startMouseY);
            const s = draggingShape.shape;
            if (s.type === 'line') {
                s.x1 = draggingShape.startX1 + dx;
                s.y1 = draggingShape.startY1 + dy;
                s.x2 = draggingShape.startX2 + dx;
                s.y2 = draggingShape.startY2 + dy;
                computeLineBBox(s);
            } else if (s.type === 'circle') {
                s.cx = draggingShape.startCx + dx;
                s.cy = draggingShape.startCy + dy;
                computeCircleBBox(s);
            }
            render();
            return;
        }

        // Resize drag
        if (resizing) {
            const deltaX = mx - resizing.startX;
            const deltaY = my - resizing.startY;
            const r = resizing.elem;
            const h = resizing.handle;

            let newX = resizing.origX;
            let newY = resizing.origY;
            let newW = resizing.origW;
            let newH = resizing.origH;

            const MIN_SIZE = 10;
            const snap = (v) => showGrid ? snapToGrid(v) : v;
            const aspect = resizing.origW / resizing.origH;

            // Lines: constrain resize to length dimension only
            const isLine = r.type === 'line';
            if (isLine) {
                const isHoriz = (r.dirY === 0);
                const isVert = (r.dirX === 0);
                if (isHoriz) {
                    // Horizontal line — only width changes, ignore vertical handles
                    if (h.includes('r')) { newW = Math.max(MIN_SIZE, snap(resizing.origW + deltaX)); }
                    if (h.includes('l')) {
                        const dx = snap(deltaX);
                        newX = resizing.origX + dx;
                        newW = Math.max(MIN_SIZE, resizing.origW - dx);
                    }
                    // Height stays locked at thickness
                } else if (isVert) {
                    // Vertical line — only height changes, ignore horizontal handles
                    if (h.includes('b')) { newH = Math.max(MIN_SIZE, snap(resizing.origH + deltaY)); }
                    if (h.includes('t')) {
                        const dy = snap(deltaY);
                        newY = resizing.origY + dy;
                        newH = Math.max(MIN_SIZE, resizing.origH - dy);
                    }
                    // Width stays locked at thickness
                } else {
                    // Diagonal line — both dimensions change proportionally
                    if (h.includes('r')) { newW = Math.max(MIN_SIZE, snap(resizing.origW + deltaX)); }
                    if (h.includes('l')) {
                        const dx = snap(deltaX);
                        newX = resizing.origX + dx;
                        newW = Math.max(MIN_SIZE, resizing.origW - dx);
                    }
                    if (h.includes('b')) { newH = Math.max(MIN_SIZE, snap(resizing.origH + deltaY)); }
                    if (h.includes('t')) {
                        const dy = snap(deltaY);
                        newY = resizing.origY + dy;
                        newH = Math.max(MIN_SIZE, resizing.origH - dy);
                    }
                    // Force aspect ratio to preserve 45° angle
                    const dw = Math.abs(newW - resizing.origW);
                    const dh = Math.abs(newH - resizing.origH);
                    if (dw >= dh) {
                        newH = newW / aspect;
                    } else {
                        newW = newH * aspect;
                    }
                    if (h.includes('l')) newX = resizing.origX + resizing.origW - newW;
                    if (h.includes('t')) newY = resizing.origY + resizing.origH - newH;
                }
            } else {
                if (h.includes('r')) { newW = Math.max(MIN_SIZE, snap(resizing.origW + deltaX)); }
                if (h.includes('l')) {
                    const dx = snap(deltaX);
                    newX = resizing.origX + dx;
                    newW = Math.max(MIN_SIZE, resizing.origW - dx);
                }
                if (h.includes('b')) { newH = Math.max(MIN_SIZE, snap(resizing.origH + deltaY)); }
                if (h.includes('t')) {
                    const dy = snap(deltaY);
                    newY = resizing.origY + dy;
                    newH = Math.max(MIN_SIZE, resizing.origH - dy);
                }
            }

            // Enforce aspect ratio when locked (non-line elements)
            if (lockAspect && !isLine) {
                if (h === 'r' || h === 'l') {
                    newH = newW / aspect;
                } else if (h === 'b' || h === 't') {
                    newW = newH * aspect;
                } else {
                    // Corner handle — use whichever dimension changed more
                    const dw = Math.abs(newW - resizing.origW);
                    const dh = Math.abs(newH - resizing.origH);
                    if (dw >= dh) {
                        newH = newW / aspect;
                    } else {
                        newW = newH * aspect;
                    }
                }
                // Adjust position for left/top handles
                if (h.includes('l')) newX = resizing.origX + resizing.origW - newW;
                if (h.includes('t')) newY = resizing.origY + resizing.origH - newH;
            }

            r.x = newX;
            r.y = newY;
            r.width = newW;
            r.height = newH;
            render();
            if (isomarkPlateImage && r === selectedRuin && selectedRuin.ruinId === isomarkRuinId) {
                renderIsomarkPreview();
            }
            return;
        }

        // Text area drawing
        if (textDrawing) {
            textDrawing.currentX = snapToGrid(mx);
            textDrawing.currentY = snapToGrid(my);
            render();
            return;
        }

        // Drag text
        if (draggingText) {
            draggingText.te.x = snapToGrid(draggingText.startX + (mx - draggingText.startMouseX));
            draggingText.te.y = snapToGrid(draggingText.startY + (my - draggingText.startMouseY));
            render();
            return;
        }

        // Drag ruin
        if (draggingRuin) {
            draggingRuin.ruin.x = snapToGrid(draggingRuin.startX + (mx - draggingRuin.startMouseX));
            draggingRuin.ruin.y = snapToGrid(draggingRuin.startY + (my - draggingRuin.startMouseY));
            render();
            return;
        }
    }

    function handleMouseUp(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left - viewport.offsetX) / viewport.zoom;
        const my = (e.clientY - rect.top - viewport.offsetY) / viewport.zoom;

        // Finalize cut box drag — show menu at release point
        if (cutBoxDragging) {
            cutBoxDragging = null;
            showCutMenu(e.clientX, e.clientY);
            return;
        }

        // Finalize cut polygon drag — show menu
        if (cutPolygonDragging) {
            cutPolygonDragging = null;
            showCutMenu(e.clientX, e.clientY);
            return;
        }

        // Finalize cut selection → cutBox or polygon point
        if (cutSelection) {
            const sx = Math.min(cutSelection.startX, cutSelection.currentX);
            const sy = Math.min(cutSelection.startY, cutSelection.currentY);
            const sw = Math.abs(cutSelection.currentX - cutSelection.startX);
            const sh = Math.abs(cutSelection.currentY - cutSelection.startY);
            cutSelection = null;

            if (sw > 4 && sh > 4) {
                // Dragged → rectangle selection
                cutMouseStart = null;
                cutBox = { x: sx, y: sy, w: sw, h: sh };
                render();
                showCutMenu(e.clientX, e.clientY);
            } else if (cutMouseStart) {
                // Click (no drag) → start/continue polygon
                cutPolygonPoints.push({ x: cutMouseStart.mx, y: cutMouseStart.my });
                cutMouseStart = null;
                render();
            } else {
                render();
            }
            return;
        }

        // Finalize shape drawing
        if (shapeDrawing && activeTool === 'createIdeogram') {
            const startX = shapeDrawing.startX;
            const startY = shapeDrawing.startY;
            if (activeSubTool === 'line') {
                const c = constrainLineAngle(startX, startY, shapeDrawing.currentX, shapeDrawing.currentY);
                const dist = Math.sqrt((c.x - startX) ** 2 + (c.y - startY) ** 2);
                if (dist >= GRID_SIZE) {
                    const shape = {
                        id: 'shape_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                        type: 'line', x1: startX, y1: startY, x2: c.x, y2: c.y,
                        thickness: GRID_SIZE * 2, color: '#000000',
                        dirX: Math.sign(c.x - startX) || 1, dirY: Math.sign(c.y - startY) || 0
                    };
                    computeLineBBox(shape);
                    drawnShapes.push(shape);
                }
            } else if (activeSubTool === 'circle') {
                const dx = shapeDrawing.currentX - startX;
                const dy = shapeDrawing.currentY - startY;
                const radius = snapToGrid(Math.sqrt(dx * dx + dy * dy));
                if (radius >= GRID_SIZE) {
                    const shape = {
                        id: 'shape_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                        type: 'circle', cx: startX, cy: startY, radius: radius,
                        thickness: GRID_SIZE * 2, color: '#000000'
                    };
                    computeCircleBBox(shape);
                    drawnShapes.push(shape);
                }
            }
            shapeDrawing = null;
            render();
            return;
        }

        // Finalize shape drag
        if (draggingShape) {
            const wasClick = selectMouseDown && Math.abs(mx - selectMouseDown.startMouseX) < 3 && Math.abs(my - selectMouseDown.startMouseY) < 3;
            draggingShape = null;
            selectMouseDown = null;
            render();
            if (wasClick && selectedShape) showRotationDial(selectedShape);
            return;
        }

        // Finalize text area drawing
        if (textDrawing) {
            const startX = textDrawing.startX;
            const startY = textDrawing.startY;
            let tx = Math.min(startX, textDrawing.currentX);
            let ty = Math.min(startY, textDrawing.currentY);
            let tw = Math.abs(textDrawing.currentX - startX);
            let th = Math.abs(textDrawing.currentY - startY);
            textDrawing = null;

            // If just a click (no drag), create a default-size text box at click position
            if (tw < 10 || th < 10) {
                tx = startX;
                ty = startY;
                tw = GRID_SIZE * 5;
                th = GRID_SIZE;
            }

            const te = {
                id: 'text_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                x: tx,
                y: ty,
                width: Math.max(tw, GRID_SIZE * 2),
                height: Math.max(th, GRID_SIZE),
                text: '',
                fontSize: 14,
                color: '#333333'
            };
            textElements.push(te);
            selectedText = te;
            render();
            showTextInput(te);
            return;
        }

        // Finalize resize
        if (resizing) {
            const wasElem = resizing.elem;
            resizing = null;
            if (wasElem.type === 'line') updateLineFromBBox(wasElem);
            else if (wasElem.type === 'circle') updateCircleFromBBox(wasElem);
            render();
            if (isomarkPlateImage && wasElem === selectedRuin && selectedRuin && selectedRuin.ruinId === isomarkRuinId) {
                renderIsomarkPreview();
            }
            return;
        }

        // Finalize text drag — click vs drag
        if (draggingText) {
            const wasClick = selectMouseDown && Math.abs(mx - selectMouseDown.startMouseX) < 3 && Math.abs(my - selectMouseDown.startMouseY) < 3;
            draggingText = null;
            selectMouseDown = null;
            render();
            if (wasClick && selectedText) showTextInput(selectedText);
            return;
        }

        // Finalize ruin drag — click vs drag
        if (draggingRuin) {
            const wasClick = selectMouseDown && Math.abs(mx - selectMouseDown.startMouseX) < 3 && Math.abs(my - selectMouseDown.startMouseY) < 3;
            draggingRuin = null;
            selectMouseDown = null;
            render();
            if (wasClick && selectedRuin) showRotationDial(selectedRuin);
        }
    }

    function hitTestRuin(mx, my) {
        for (let i = placedRuins.length - 1; i >= 0; i--) {
            const r = placedRuins[i];
            const w = r.width || DEFAULT_RUIN_SIZE;
            const h = r.height || DEFAULT_RUIN_SIZE;
            if (mx >= r.x && mx <= r.x + w && my >= r.y && my <= r.y + h) {
                return r;
            }
        }
        return null;
    }

    // ========== SELECTION ==========
    function selectRuin(ruin) {
        selectedRuin = ruin;
        render();
        // Config menu (rotation dial) shown on click of already-selected ruin, not on first select
        // Update IsoMark preview if a plate is active
        if (isomarkPlateImage && ruin) {
            isomarkRuinId = ruin.ruinId;
            renderIsomarkPreview();
            updateIsomarkSaveBtn();
        }
    }

    function deselectRuin() {
        selectedRuin = null;
        isomarkRuinId = null;
        closeRotationDial();
        closeColorPopover();
        renderIsomarkPreview();
        updateIsomarkSaveBtn();
        render();
    }

    // ========== ROTATION DIAL ==========
    function showRotationDial(elem) {
        closeRotationDial();
        if (!canvas) return;

        const isShape = elem.type === 'line' || elem.type === 'circle';
        const w = elem.width || DEFAULT_RUIN_SIZE;
        const h = elem.height || DEFAULT_RUIN_SIZE;
        const canvasRect = canvas.getBoundingClientRect();
        const cx = canvasRect.left + (elem.x + w / 2) * viewport.zoom + viewport.offsetX;
        const cy = canvasRect.top + (elem.y + h / 2) * viewport.zoom + viewport.offsetY;

        rotationDialEl = document.createElement('div');
        rotationDialEl.className = 'ideogram-rotation-dial';
        rotationDialEl.style.position = 'fixed';
        rotationDialEl.style.left = cx + 'px';
        rotationDialEl.style.top = cy + 'px';
        rotationDialEl.style.transform = 'translate(-50%, -50%)';

        const dialRadius = Math.max(w, h) * viewport.zoom / 2 + 30;

        [{ angle: 0, value: 0 }, { angle: 90, value: 90 }, { angle: 180, value: 180 }, { angle: 270, value: 270 }].forEach(rot => {
            const btn = document.createElement('button');
            btn.className = 'ideogram-dial-btn' + ((elem.rotation || 0) === rot.value ? ' active' : '');
            const rad = (rot.angle - 90) * Math.PI / 180;
            btn.style.position = 'absolute';
            btn.style.left = (Math.cos(rad) * dialRadius) + 'px';
            btn.style.top = (Math.sin(rad) * dialRadius) + 'px';
            btn.style.transform = 'translate(-50%, -50%)';
            btn.textContent = rot.value + '\u00B0';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                elem.rotation = rot.value;
                render();
                showRotationDial(elem);
            });
            rotationDialEl.appendChild(btn);
        });

        // Mirror
        const mirrorBtn = document.createElement('button');
        mirrorBtn.className = 'ideogram-dial-btn ideogram-mirror-btn' + (elem.mirrored ? ' active' : '');
        mirrorBtn.style.cssText = `position:absolute; left:0px; top:${dialRadius + 30}px; transform:translate(-50%,-50%);`;
        mirrorBtn.textContent = '\u21C4';
        mirrorBtn.title = 'Mirror';
        mirrorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elem.mirrored = !elem.mirrored;
            render();
            showRotationDial(elem);
        });
        rotationDialEl.appendChild(mirrorBtn);

        // Delete
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'ideogram-dial-btn ideogram-delete-btn';
        deleteBtn.style.cssText = `position:absolute; left:0px; top:${-dialRadius - 30}px; transform:translate(-50%,-50%);`;
        deleteBtn.textContent = '\u2715';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isShape) {
                drawnShapes = drawnShapes.filter(s => s !== elem);
                selectedShape = null;
            } else {
                const idx = placedRuins.indexOf(elem);
                if (idx !== -1) placedRuins.splice(idx, 1);
            }
            closeRotationDial();
            deselectRuin();
        });
        rotationDialEl.appendChild(deleteBtn);

        document.getElementById('hotspot-overlay').appendChild(rotationDialEl);
    }

    function closeRotationDial() {
        if (rotationDialEl) { rotationDialEl.remove(); rotationDialEl = null; }
    }

    // ========== IDEOGRAM CRUD ==========
    function createIdeogram(name) {
        saveCurrentIdeogram();
        const id = 'ideogram_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const ideogram = {
            id, name: name || 'Untitled',
            placedRuins: [],
            clearRects: [],
            textElements: [],
            drawnShapes: [],
            viewport: { offsetX: 0, offsetY: 0, zoom: 1 },
            metadata: { created: Date.now(), modified: Date.now() }
        };
        ideograms.push(ideogram);
        switchIdeogram(id);
        return ideogram;
    }

    function switchIdeogram(id) {
        saveCurrentIdeogram();
        const ig = ideograms.find(i => i.id === id);
        if (!ig) return;
        currentIdeogramId = id;
        placedRuins = (ig.placedRuins || []).map(p => ({ ...p }));
        clearRects = (ig.clearRects || []).map(c => ({ ...c }));
        textElements = (ig.textElements || []).map(t => ({ ...t }));
        drawnShapes = (ig.drawnShapes || []).map(s => ({ ...s }));
        viewport = { ...(ig.viewport || { offsetX: 0, offsetY: 0, zoom: 1 }) };
        selectedRuin = null;
        selectedText = null;
        selectedShape = null;
        closeRotationDial();
        closeColorPopover();
        closeTextInput();
        if (active) render();
        refreshSidebarList();
    }

    function saveCurrentIdeogram() {
        if (!currentIdeogramId) return;
        const ig = ideograms.find(i => i.id === currentIdeogramId);
        if (!ig) return;
        ig.placedRuins = placedRuins.map(p => ({ ...p }));
        ig.clearRects = clearRects.map(c => ({ ...c }));
        ig.textElements = textElements.map(t => ({ ...t }));
        ig.drawnShapes = drawnShapes.map(s => ({ ...s }));
        ig.viewport = { ...viewport };
        ig.metadata.modified = Date.now();
    }

    function deleteIdeogram(id) {
        ideograms = ideograms.filter(i => i.id !== id);
        if (currentIdeogramId === id) {
            currentIdeogramId = null;
            if (ideograms.length > 0) {
                switchIdeogram(ideograms[0].id);
            } else {
                placedRuins = [];
                clearRects = [];
                textElements = [];
                drawnShapes = [];
                selectedRuin = null;
                selectedText = null;
                selectedShape = null;
                closeRotationDial();
                closeColorPopover();
                closeTextInput();
                if (active) render();
            }
        }
        refreshSidebarList();
    }

    function refreshSidebarList() {
        if (typeof Toolbar !== 'undefined' && Toolbar.refreshIdeogramList) {
            Toolbar.refreshIdeogramList();
        }
    }

    // ========== DATA PERSISTENCE ==========
    function getIdeogramData() {
        saveCurrentIdeogram();
        return {
            ruinLibrary: ruinLibrary.map(r => ({ ...r })),
            ideograms: ideograms.map(ig => ({
                ...ig,
                placedRuins: (ig.placedRuins || []).map(p => ({ ...p })),
                clearRects: (ig.clearRects || []).map(c => ({ ...c })),
                textElements: (ig.textElements || []).map(t => ({ ...t })),
                drawnShapes: (ig.drawnShapes || []).map(s => ({ ...s })),
                viewport: { ...(ig.viewport || { offsetX: 0, offsetY: 0, zoom: 1 }) },
                metadata: { ...(ig.metadata || { created: Date.now(), modified: Date.now() }) }
            }))
        };
    }

    function loadIdeogramData(data) {
        if (!data) return;
        ruinLibrary = (data.ruinLibrary || []).map(r => ({ ...r }));
        ideograms = (data.ideograms || []).map(ig => ({
            ...ig,
            placedRuins: (ig.placedRuins || []).map(p => ({ ...p })),
            clearRects: (ig.clearRects || []).map(c => ({ ...c })),
            textElements: (ig.textElements || []).map(t => ({ ...t })),
            drawnShapes: (ig.drawnShapes || []).map(s => ({ ...s })),
            viewport: { ...(ig.viewport || { offsetX: 0, offsetY: 0, zoom: 1 }) },
            metadata: { ...(ig.metadata || { created: Date.now(), modified: Date.now() }) }
        }));
        preloadAllRuinImages();
        if (ideograms.length > 0 && !currentIdeogramId) {
            switchIdeogram(ideograms[0].id);
        }
    }

    function getAllIdeograms() {
        saveCurrentIdeogram();
        return ideograms;
    }

    function getCurrentIdeogramId() {
        return currentIdeogramId;
    }

    // ========== PUBLIC API ==========
    return {
        activate, deactivate, isActive,
        getIdeogramData, loadIdeogramData,
        getAllIdeograms, getCurrentIdeogramId,
        switchIdeogram, createIdeogram, deleteIdeogram,
        refreshSidebarList
    };
})();
