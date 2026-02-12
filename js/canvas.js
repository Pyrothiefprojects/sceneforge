const Canvas = (() => {
    const canvasEl = document.getElementById('game-canvas');
    const ctx = canvasEl.getContext('2d');
    let backgroundImage = null;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    function resize() {
        const parent = canvasEl.parentElement;
        canvasEl.width = parent.clientWidth;
        canvasEl.height = parent.clientHeight;
        render();
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                backgroundImage = img;
                calcFit();
                render();
                resolve(img);
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    function calcFit() {
        if (!backgroundImage) return;
        const cw = canvasEl.width;
        const ch = canvasEl.height;
        const iw = backgroundImage.width;
        const ih = backgroundImage.height;
        scale = Math.min(cw / iw, ch / ih);
        offsetX = (cw - iw * scale) / 2;
        offsetY = (ch - ih * scale) / 2;
    }

    function render() {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

        if (backgroundImage) {
            ctx.drawImage(
                backgroundImage,
                offsetX, offsetY,
                backgroundImage.width * scale,
                backgroundImage.height * scale
            );
        }

        if (Toolbar.isEditMode()) {
            HotspotEditor.renderHotspots(ctx, scale, offsetX, offsetY);
        }
    }

    // Convert screen coords to image coords
    function screenToImage(sx, sy) {
        return {
            x: (sx - offsetX) / scale,
            y: (sy - offsetY) / scale
        };
    }

    // Convert image coords to screen coords
    function imageToScreen(ix, iy) {
        return {
            x: ix * scale + offsetX,
            y: iy * scale + offsetY
        };
    }

    function getCanvasElement() {
        return canvasEl;
    }

    function getContext() {
        return ctx;
    }

    function getTransform() {
        return { scale, offsetX, offsetY };
    }

    function hasImage() {
        return backgroundImage !== null;
    }

    function init() {
        resize();
        window.addEventListener('resize', () => {
            resize();
            calcFit();
            render();
        });
    }

    return {
        init, loadImage, render, resize,
        screenToImage, imageToScreen,
        getCanvasElement, getContext, getTransform, hasImage
    };
})();
