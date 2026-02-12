const TransitionPlayer = (() => {
    let currentAnimation = null;

    function play(frames, options) {
        cancel();

        if (!frames || frames.length === 0) return Promise.resolve();

        const duration = (options && options.frameDuration) || 100;
        const targetType = (options && options.target) || 'canvas';
        const imgEl = (options && options.imgEl) || null;

        return new Promise((resolve) => {
            const anim = { cancelled: false, timer: null };
            currentAnimation = anim;

            // Use cached images from Preloader, fallback to loading
            const images = [];
            let pending = 0;

            for (let j = 0; j < frames.length; j++) {
                const cached = Preloader.getImage(frames[j]);
                if (cached) {
                    images[j] = cached;
                } else {
                    pending++;
                    const img = new Image();
                    img.onload = img.onerror = () => {
                        pending--;
                        if (pending === 0) startPlayback();
                    };
                    img.src = frames[j];
                    images[j] = img;
                }
            }

            function startPlayback() {
                let i = 0;

                function showNext() {
                    if (anim.cancelled || i >= images.length) {
                        if (currentAnimation === anim) currentAnimation = null;
                        resolve();
                        return;
                    }

                    const frameUrl = frames[i];
                    const img = images[i];
                    i++;

                    if (targetType === 'canvas') {
                        Canvas.loadImage(frameUrl).then(() => {
                            if (anim.cancelled) { resolve(); return; }
                            anim.timer = setTimeout(showNext, duration);
                        });
                    } else if (targetType === 'img' && imgEl) {
                        imgEl.src = img.src;
                        anim.timer = setTimeout(showNext, duration);
                    }
                }

                showNext();
            }

            // If all images were cached, start immediately
            if (pending === 0) startPlayback();
        });
    }

    function playVideo(videoSrc, options) {
        cancel();

        if (!videoSrc) return Promise.resolve();

        const targetType = (options && options.target) || 'canvas';

        return new Promise((resolve) => {
            const anim = { cancelled: false, timer: null };
            currentAnimation = anim;

            const video = document.createElement('video');
            video.src = videoSrc;
            video.muted = true;
            video.playsInline = true;
            video.className = 'transition-video-overlay';
            video.style.visibility = 'hidden';

            video.addEventListener('loadeddata', () => {
                video.style.visibility = 'visible';
            }, { once: true });

            let container;
            if (targetType === 'canvas') {
                const canvasEl = Canvas.getCanvasElement();
                container = canvasEl.parentElement;
                const rect = canvasEl.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                video.style.position = 'absolute';
                video.style.left = (rect.left - containerRect.left) + 'px';
                video.style.top = (rect.top - containerRect.top) + 'px';
                video.style.width = rect.width + 'px';
                video.style.height = rect.height + 'px';
                video.style.objectFit = 'contain';
                video.style.zIndex = '10';
                video.style.background = '#0a0a0a';
            } else if (targetType === 'img' && options && options.imgEl) {
                container = options.imgEl.parentElement;
                video.style.position = 'absolute';
                video.style.top = '0';
                video.style.left = '0';
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'contain';
                video.style.zIndex = '10';
            }

            if (!container) { resolve(); return; }

            function cleanup() {
                if (video.parentElement) video.remove();
                if (currentAnimation === anim) currentAnimation = null;
            }

            anim.videoEl = video;

            video.addEventListener('ended', () => {
                if (anim.cancelled) return;
                cleanup();
                resolve();
            }, { once: true });

            video.addEventListener('error', () => {
                cleanup();
                resolve();
            }, { once: true });

            container.appendChild(video);

            video.play().catch(() => {
                cleanup();
                resolve();
            });
        });
    }

    function cancel() {
        if (currentAnimation) {
            currentAnimation.cancelled = true;
            if (currentAnimation.timer) clearTimeout(currentAnimation.timer);
            if (currentAnimation.videoEl) {
                currentAnimation.videoEl.pause();
                if (currentAnimation.videoEl.parentElement) currentAnimation.videoEl.remove();
            }
            currentAnimation = null;
        }
    }

    function isPlaying() {
        return currentAnimation !== null;
    }

    return { play, playVideo, cancel, isPlaying };
})();
