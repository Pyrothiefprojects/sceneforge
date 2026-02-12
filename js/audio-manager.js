const AudioManager = (() => {
    let musicEl = null;
    let currentMusicUrl = null;
    let unlocked = false;
    let pendingMusic = null;
    let loopingSounds = [];
    const _cache = {};
    const _k = 'pyrothief-sf-2025';
    let _dk = null;

    async function _getKey() {
        if (_dk) return _dk;
        const raw = new TextEncoder().encode(_k);
        const km = await crypto.subtle.importKey('raw', raw, 'PBKDF2', false, ['deriveKey']);
        _dk = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: new TextEncoder().encode('sceneforge-audio'), iterations: 100000, hash: 'SHA-256' },
            km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
        );
        return _dk;
    }

    async function _resolve(url) {
        if (!url) return url;
        if (_cache[url]) return _cache[url];
        try {
            const resp = await fetch(url);
            const buf = await resp.arrayBuffer();
            if (buf.byteLength < 29) return url;
            const iv = buf.slice(0, 12);
            const tag = buf.slice(12, 28);
            const ct = buf.slice(28);
            const dk = await _getKey();
            const combined = new Uint8Array(ct.byteLength + tag.byteLength);
            combined.set(new Uint8Array(ct), 0);
            combined.set(new Uint8Array(tag), ct.byteLength);
            const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv), tagLength: 128 }, dk, combined);
            const blob = new Blob([dec], { type: 'audio/mpeg' });
            _cache[url] = URL.createObjectURL(blob);
            return _cache[url];
        } catch (e) {
            return url;
        }
    }

    function unlock() {
        if (unlocked) return;
        unlocked = true;
        if (pendingMusic) {
            playMusic(pendingMusic);
            pendingMusic = null;
        }
    }

    function playMusic(url) {
        if (!url) { stopMusic(); return; }
        if (url === currentMusicUrl && musicEl && !musicEl.paused) return;

        if (!unlocked) {
            pendingMusic = url;
            return;
        }

        // Fade out old track
        if (musicEl) {
            const old = musicEl;
            fadeOut(old, 500, () => { old.pause(); old.remove(); });
        }

        currentMusicUrl = url;
        _resolve(url).then(src => {
            if (currentMusicUrl !== url) return;
            musicEl = new Audio(src);
            musicEl.loop = true;
            musicEl.volume = 0;
            musicEl.play().then(() => {
                fadeIn(musicEl, 500);
            }).catch(e => console.warn('Music play blocked:', e));
        }).catch(e => console.error('Music resolve failed:', e));
    }

    function stopMusic() {
        if (musicEl) {
            const el = musicEl;
            fadeOut(el, 300, () => { el.pause(); el.remove(); });
            musicEl = null;
        }
        currentMusicUrl = null;
        pendingMusic = null;
    }

    function playSound(url, loop) {
        if (!url) return;
        _resolve(url).then(src => {
            const audio = new Audio(src);
            if (loop) {
                audio.loop = true;
                loopingSounds.push(audio);
            } else {
                audio.addEventListener('ended', () => audio.remove());
            }
            audio.addEventListener('error', () => audio.remove());
            audio.play().catch(e => console.warn('Sound play blocked:', e));
        }).catch(e => console.error('Sound resolve failed:', e));
    }

    function stopSounds() {
        for (const el of loopingSounds) {
            el.pause();
            el.remove();
        }
        loopingSounds = [];
    }

    function stop() {
        if (musicEl) { musicEl.pause(); musicEl.remove(); musicEl = null; }
        currentMusicUrl = null;
        pendingMusic = null;
        unlocked = false;
        stopSounds();
    }

    function fadeIn(el, ms) {
        if (!el) return;
        el.volume = 0;
        const step = 50;
        const inc = step / ms;
        const timer = setInterval(() => {
            const v = Math.min(1, el.volume + inc);
            el.volume = v;
            if (v >= 1) clearInterval(timer);
        }, step);
    }

    function fadeOut(el, ms, onDone) {
        if (!el) { if (onDone) onDone(); return; }
        const step = 50;
        const dec = step / ms;
        const timer = setInterval(() => {
            const v = Math.max(0, el.volume - dec);
            el.volume = v;
            if (v <= 0) {
                clearInterval(timer);
                if (onDone) onDone();
            }
        }, step);
    }

    return { unlock, playMusic, stopMusic, playSound, stopSounds, stop, _resolve };
})();
