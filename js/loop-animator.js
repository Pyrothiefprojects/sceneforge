const LoopAnimator = (() => {
    let entries = [];
    let mode = null;

    function startScene(hotspots) {
        stop();
        if (!hotspots || hotspots.length === 0) return;

        mode = 'scene';
        const viewport = document.getElementById('viewport');

        for (const hs of hotspots) {
            if (!hs.loop || !hs.loop.frames || hs.loop.frames.length === 0) continue;
            if (hs.loop.x == null || hs.loop.y == null) continue;
            createEntry(hs, viewport, true);
        }
    }

    function startPuzzle(hotspots, bgWrap) {
        if (!hotspots || hotspots.length === 0 || !bgWrap) return;

        for (const hs of hotspots) {
            if (!hs.loop || !hs.loop.frames || hs.loop.frames.length === 0) continue;
            if (hs.loop.x == null || hs.loop.y == null) continue;
            createEntry(hs, bgWrap, false);
        }
    }

    function createEntry(hotspot, container, isScene) {
        const loop = hotspot.loop;
        const duration = loop.frameDuration || 150;

        // Preload frame images
        const images = [];
        let loaded = 0;
        const total = loop.frames.length;

        const el = document.createElement('div');
        el.className = 'loop-overlay';
        const img = document.createElement('img');
        img.draggable = false;
        el.appendChild(img);
        container.appendChild(el);

        const entry = {
            hotspot,
            el,
            img,
            images,
            frameIndex: 0,
            timer: null,
            isScene,
            ready: false
        };
        entries.push(entry);

        // Preload all frames, then start cycling
        for (let i = 0; i < total; i++) {
            const frame = new Image();
            frame.onload = frame.onerror = () => {
                loaded++;
                if (loaded === total) {
                    if (loop.reverse) images.reverse();
                    entry.ready = true;
                    img.src = images[0] ? images[0].src : loop.frames[0];
                    reposition(entry);
                    entry.timer = setInterval(() => tick(entry), duration);
                }
            };
            frame.src = loop.frames[i];
            images[i] = frame;
        }
    }

    function tick(entry) {
        if (!entry.ready) return;
        entry.frameIndex = (entry.frameIndex + 1) % entry.images.length;
        entry.img.src = entry.images[entry.frameIndex].src;

        // Reposition on every tick to handle resize / async canvas load
        if (entry.isScene) reposition(entry);
    }

    function reposition(entry) {
        const loop = entry.hotspot.loop;
        if (!loop || loop.x == null || loop.y == null) {
            entry.el.style.display = 'none';
            return;
        }

        if (entry.isScene) {
            const { scale } = Canvas.getTransform();
            const screen = Canvas.imageToScreen(loop.x, loop.y);
            const refImg = entry.images[0];
            const loopScale = loop.scale != null ? loop.scale : 1;
            const w = refImg && refImg.naturalWidth ? refImg.naturalWidth * scale * loopScale : 0;
            const h = refImg && refImg.naturalHeight ? refImg.naturalHeight * scale * loopScale : 0;
            if (w <= 0 || h <= 0) { entry.el.style.display = 'none'; return; }

            entry.el.style.display = '';
            entry.el.style.left = screen.x + 'px';
            entry.el.style.top = screen.y + 'px';
            entry.el.style.width = w + 'px';
            entry.el.style.height = h + 'px';
        } else {
            // Puzzle mode — position at stored pixel coords
            entry.el.style.left = loop.x + 'px';
            entry.el.style.top = loop.y + 'px';
            // Use natural image size with loop scale
            const refImg = entry.images[0];
            const loopScale = loop.scale != null ? loop.scale : 1;
            if (refImg && refImg.naturalWidth) {
                entry.el.style.width = (refImg.naturalWidth * loopScale) + 'px';
                entry.el.style.height = (refImg.naturalHeight * loopScale) + 'px';
            }
        }
    }

    function stopPuzzle() {
        const keep = [];
        for (const entry of entries) {
            if (!entry.isScene) {
                if (entry.timer) clearInterval(entry.timer);
                if (entry.el.parentElement) entry.el.remove();
            } else {
                keep.push(entry);
            }
        }
        entries = keep;
    }

    function stop() {
        for (const entry of entries) {
            if (entry.timer) clearInterval(entry.timer);
            if (entry.el.parentElement) entry.el.remove();
        }
        entries = [];
        mode = null;
    }

    return { startScene, startPuzzle, stop, stopPuzzle };
})();
