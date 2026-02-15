/* ========================================
   CYBER GRAFFITI: CLEAN-UP LOGIC
   Complete Game Logic
   ======================================== */

// ============================================
// LEVEL DATA
// ============================================
const LEVEL_DATA = [
    { id: 1,  name: 'THE SLUMS',      subtitle: 'Multiplication x2',  table: 2,  questions: 5, timeLimit: 120 },
    { id: 2,  name: 'NEON MARKET',     subtitle: 'Multiplication x3',  table: 3,  questions: 5, timeLimit: 110 },
    { id: 3,  name: 'DATA STREAM',     subtitle: 'Multiplication x4',  table: 4,  questions: 5, timeLimit: 100 },
    { id: 4,  name: 'THE SPIRE',       subtitle: 'Multiplication x5',  table: 5,  questions: 5, timeLimit: 100 },
    { id: 5,  name: 'CORE LOGIC',      subtitle: 'Multiplication x6',  table: 6,  questions: 6, timeLimit: 100 },
    { id: 6,  name: 'SYNTH GARDEN',    subtitle: 'Multiplication x7',  table: 7,  questions: 6, timeLimit: 90  },
    { id: 7,  name: 'GHOST WIRE',      subtitle: 'Multiplication x8',  table: 8,  questions: 6, timeLimit: 90  },
    { id: 8,  name: 'DEEP NET',        subtitle: 'Multiplication x9',  table: 9,  questions: 7, timeLimit: 90  },
    { id: 9,  name: 'CYBER VOID',      subtitle: 'Multiplication x10', table: 10, questions: 7, timeLimit: 80  },
    { id: 10, name: 'FINAL EXAM',      subtitle: 'All Tables Mixed',   table: 0,  questions: 10, timeLimit: 180 },
];

const GRAFFITI_COLORS = ['#39ff14', '#ff00ff', '#ffff00'];

const PRAISE_MESSAGES = [
    { text: 'AWESOME!', sub: 'You\'re on fire! 🔥' },
    { text: 'GENIUS!', sub: 'Math wizard detected!' },
    { text: 'UNSTOPPABLE!', sub: 'Keep it going!' },
    { text: 'INCREDIBLE!', sub: 'Your brain is a supercomputer!' },
    { text: 'FANTASTIC!', sub: 'Nothing can stop you!' },
    { text: 'LEGEND!', sub: 'Pure clean-up machine!' },
    { text: 'BRILLIANT!', sub: 'Einstein would be proud!' },
    { text: 'PERFECT!', sub: 'Flawless technique!' },
    { text: 'SUPERSTAR!', sub: 'The city is getting cleaner!' },
    { text: 'HEROIC!', sub: 'Graffiti fears you!' },
];

// ============================================
// PROGRESS MANAGER (localStorage)
// ============================================
class ProgressManager {
    constructor() {
        this.KEY = 'cyberGraffiti_v1';
        this.data = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* reset */ }
        return this.defaults();
    }

    defaults() {
        return {
            highestUnlocked: 1,
            levels: {},
            totalScore: 0,
            settings: { sfxVolume: 0.8, musicVolume: 0.5, sensitivity: 5 }
        };
    }

    save() {
        try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {}
    }

    completeLevel(id, score, timeSec) {
        const stars = timeSec < 30 && score >= 800 ? 3 : score >= 400 ? 2 : 1;
        const prev = this.data.levels[id] || {};
        this.data.levels[id] = {
            completed: true,
            stars: Math.max(stars, prev.stars || 0),
            bestScore: Math.max(score, prev.bestScore || 0),
            bestTime: prev.bestTime ? Math.min(timeSec, prev.bestTime) : timeSec
        };
        if (id >= this.data.highestUnlocked && id < 10) {
            this.data.highestUnlocked = id + 1;
        }
        this.data.totalScore = Object.values(this.data.levels).reduce((s, l) => s + (l.bestScore || 0), 0);
        this.save();
        return stars;
    }

    getLevelInfo(id) {
        return this.data.levels[id] || { completed: false, stars: 0, bestScore: 0, bestTime: 0 };
    }

    isUnlocked(id) { return id <= this.data.highestUnlocked; }
}

// ============================================
// AUDIO MANAGER (Web Audio API)
// ============================================
class AudioManager {
    constructor() {
        this.ctx = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.waterSource = null;
        this.isWaterPlaying = false;
        this.musicOscillators = [];
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.8;
            this.sfxGain.connect(this.masterGain);
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.3;
            this.musicGain.connect(this.masterGain);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio not available');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    setSfxVolume(v) { if (this.sfxGain) this.sfxGain.gain.value = v; }
    setMusicVolume(v) { if (this.musicGain) this.musicGain.gain.value = v; }

    startWater() {
        if (!this.ctx || this.isWaterPlaying) return;
        this.isWaterPlaying = true;
        const bufSize = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;

        this.waterSource = this.ctx.createBufferSource();
        this.waterSource.buffer = buf;
        this.waterSource.loop = true;

        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 3500;
        bp.Q.value = 0.8;

        this.waterGain = this.ctx.createGain();
        this.waterGain.gain.value = 0;
        this.waterGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.1);

        this.waterSource.connect(bp);
        bp.connect(this.waterGain);
        this.waterGain.connect(this.sfxGain);
        this.waterSource.start();
    }

    stopWater() {
        if (!this.isWaterPlaying) return;
        this.isWaterPlaying = false;
        if (this.waterGain) {
            this.waterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
        }
        const src = this.waterSource;
        setTimeout(() => { try { src.stop(); } catch (e) {} }, 200);
        this.waterSource = null;
    }

    playVictory() {
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.frequency.value = freq;
            osc.type = 'sine';
            const g = this.ctx.createGain();
            g.gain.value = 0;
            const t = this.ctx.currentTime + i * 0.15;
            g.gain.linearRampToValueAtTime(0.15, t + 0.05);
            g.gain.linearRampToValueAtTime(0, t + 0.4);
            osc.connect(g);
            g.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.5);
        });
    }

    playWrong() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.frequency.value = 200;
        osc.type = 'sawtooth';
        const g = this.ctx.createGain();
        g.gain.value = 0.15;
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.5);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playClick() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.frequency.value = 800;
        osc.type = 'sine';
        const g = this.ctx.createGain();
        g.gain.value = 0.08;
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playSplash() {
        if (!this.ctx) return;
        const bufSize = this.ctx.sampleRate * 0.15;
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2000;
        const g = this.ctx.createGain();
        g.gain.value = 0.06;
        src.connect(hp);
        hp.connect(g);
        g.connect(this.sfxGain);
        src.start();
    }

    startMusic() {
        if (!this.ctx) return;
        this.stopMusic();
        // Simple ambient pad
        const chords = [
            [130.81, 164.81, 196.00], // C3, E3, G3
            [110.00, 138.59, 164.81], // A2, C#3, E3
        ];
        const chord = chords[0];
        chord.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.detune.value = (Math.random() - 0.5) * 10;
            const g = this.ctx.createGain();
            g.gain.value = 0.06;
            osc.connect(g);
            g.connect(this.musicGain);
            osc.start();
            this.musicOscillators.push({ osc, gain: g });
        });
        // Sub bass
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = 65.41;
        const sg = this.ctx.createGain();
        sg.gain.value = 0.08;
        sub.connect(sg);
        sg.connect(this.musicGain);
        sub.start();
        this.musicOscillators.push({ osc: sub, gain: sg });
    }

    stopMusic() {
        this.musicOscillators.forEach(({ osc, gain }) => {
            try {
                gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
                setTimeout(() => { try { osc.stop(); } catch (e) {} }, 600);
            } catch (e) {}
        });
        this.musicOscillators = [];
    }
}

// ============================================
// INPUT MANAGER
// ============================================
class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.aimX = 0;
        this.aimY = 0;
        this.isShooting = false;
        this.isTouch = 'ontouchstart' in window;

        canvas.addEventListener('mousemove', (e) => {
            const r = canvas.getBoundingClientRect();
            this.aimX = (e.clientX - r.left) * (canvas.width / r.width);
            this.aimY = (e.clientY - r.top) * (canvas.height / r.height);
        });
        canvas.addEventListener('mousedown', (e) => { if (e.button === 0) this.isShooting = true; });
        canvas.addEventListener('mouseup', (e) => { if (e.button === 0) this.isShooting = false; });
        canvas.addEventListener('mouseleave', () => { this.isShooting = false; });

        // Touch: direct touch on canvas = aim + shoot
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.updateTouchPos(e);
            this.isShooting = true;
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.updateTouchPos(e);
        }, { passive: false });
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isShooting = false;
        }, { passive: false });

        // Mobile fire button
        const fireBtn = document.getElementById('btn-fire');
        if (fireBtn) {
            fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.isShooting = true; }, { passive: false });
            fireBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.isShooting = false; }, { passive: false });
        }
    }

    updateTouchPos(e) {
        if (e.touches.length === 0) return;
        const t = e.touches[0];
        const r = this.canvas.getBoundingClientRect();
        this.aimX = (t.clientX - r.left) * (this.canvas.width / r.width);
        this.aimY = (t.clientY - r.top) * (this.canvas.height / r.height);
    }
}

// ============================================
// WALL RENDERER (procedural bricks)
// ============================================
class WallRenderer {
    constructor(w, h) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = w;
        this.canvas.height = h;
        this.render();
    }

    render() {
        const ctx = this.canvas.getContext('2d');
        // Base fill
        ctx.fillStyle = '#2a2a32';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const bW = 55, bH = 22, gap = 2;
        for (let y = 0; y < this.canvas.height + bH; y += bH + gap) {
            const row = Math.floor(y / (bH + gap));
            const offset = (row % 2) * (bW / 2);
            for (let x = -bW; x < this.canvas.width + bW; x += bW + gap) {
                const v = Math.random() * 12;
                const r = 32 + v, g = 28 + v, b = 36 + v;
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x + offset, y, bW, bH);
                // Mortar lines
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                ctx.lineWidth = gap;
                ctx.strokeRect(x + offset, y, bW, bH);
            }
        }

        // Grime overlay
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < 20; i++) {
            const gx = Math.random() * this.canvas.width;
            const gy = Math.random() * this.canvas.height;
            const gr = 20 + Math.random() * 80;
            const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
            grad.addColorStop(0, 'rgba(0,0,0,0.2)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
        }

        // Subtle color stains (existing graffiti remnants)
        const stainColors = ['rgba(37,71,244,0.03)', 'rgba(244,37,176,0.02)', 'rgba(37,244,230,0.02)'];
        for (let i = 0; i < 5; i++) {
            const sx = Math.random() * this.canvas.width;
            const sy = Math.random() * this.canvas.height;
            const sr = 40 + Math.random() * 100;
            ctx.fillStyle = stainColors[i % stainColors.length];
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    resize(w, h) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.render();
    }
}

// ============================================
// GRAFFITI ANSWER
// ============================================
class GraffitiAnswer {
    constructor(text, x, y, color, isCorrect, canvasW, canvasH) {
        this.text = String(text);
        this.x = x;
        this.y = y;
        this.color = color;
        this.isCorrect = isCorrect;
        this.rotation = (Math.random() - 0.5) * 0.15;
        this.width = 200;
        this.height = 130;
        this.washProgress = 0;
        this.isWashed = false;
        this.WASH_THRESHOLD = 0.85;

        // Track pixel coverage of the graffiti text itself
        this.textPixelCount = 0;
        this.erasedPixelCount = 0;

        // Offscreen canvas for the graffiti paint
        this.graffitiCanvas = document.createElement('canvas');
        this.graffitiCanvas.width = this.width;
        this.graffitiCanvas.height = this.height;

        // Eraser mask: tracks which pixels have been washed
        this.maskData = new Uint8Array(this.width * this.height);
        this.maskData.fill(255); // 255 = fully painted, 0 = washed away

        // Cached output canvas (reused every frame)
        this.outputCanvas = document.createElement('canvas');
        this.outputCanvas.width = this.width;
        this.outputCanvas.height = this.height;
        this.dirty = true;

        this.renderGraffiti();
        this.countTextPixels();
        this.updateOutput();
    }

    renderGraffiti() {
        const ctx = this.graffitiCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.font = "bold 72px 'Permanent Marker', cursive";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cx = this.width / 2;
        const cy = this.height / 2 - 5;

        // Black outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round';
        ctx.strokeText(this.text, cx, cy);

        // Colored fill with glow
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillText(this.text, cx, cy);
        ctx.shadowBlur = 0;
        ctx.fillText(this.text, cx, cy);
    }

    // Cache graffiti alpha channel and count VISIBLE text pixels (not faint glow)
    countTextPixels() {
        const ctx = this.graffitiCanvas.getContext('2d');
        const data = ctx.getImageData(0, 0, this.width, this.height).data;
        this.graffitiAlpha = new Uint8Array(this.width * this.height);
        this.textPixelCount = 0;
        for (let i = 0; i < this.width * this.height; i++) {
            this.graffitiAlpha[i] = data[i * 4 + 3];
            // Only count pixels with strong alpha (actual text, not faint glow)
            if (data[i * 4 + 3] > 80) this.textPixelCount++;
        }
        if (this.textPixelCount === 0) this.textPixelCount = 1;
    }

    applyWater(hitX, hitY, radius) {
        // Convert world coords to local graffiti coords
        const localX = hitX - (this.x - this.width / 2);
        const localY = hitY - (this.y - this.height / 2);

        // Range check
        if (localX < -radius || localX > this.width + radius ||
            localY < -radius || localY > this.height + radius) return false;

        // Erase a circle in the mask array
        const r2 = radius * radius;
        const minX = Math.max(0, Math.floor(localX - radius));
        const maxX = Math.min(this.width - 1, Math.ceil(localX + radius));
        const minY = Math.max(0, Math.floor(localY - radius));
        const maxY = Math.min(this.height - 1, Math.ceil(localY + radius));

        let changed = false;
        for (let py = minY; py <= maxY; py++) {
            for (let px = minX; px <= maxX; px++) {
                const dx = px - localX;
                const dy = py - localY;
                const d2 = dx * dx + dy * dy;
                if (d2 <= r2) {
                    const idx = py * this.width + px;
                    if (this.maskData[idx] > 0) {
                        const dist = Math.sqrt(d2) / radius;
                        const erosion = Math.floor(150 * (1 - dist * 0.6));
                        this.maskData[idx] = Math.max(0, this.maskData[idx] - erosion);
                        // Snap to zero — no ghost traces
                        if (this.maskData[idx] < 30) this.maskData[idx] = 0;
                        changed = true;
                    }
                }
            }
        }

        if (changed) {
            this.dirty = true;
            this.recalcWash();
        }
        return true;
    }

    recalcWash() {
        // Count erased visible text pixels (alpha > 80 = actual text, not glow)
        let erased = 0;
        const total = this.width * this.height;
        for (let i = 0; i < total; i++) {
            if (this.graffitiAlpha[i] > 80 && this.maskData[i] < 60) {
                erased++;
            }
        }
        this.washProgress = erased / this.textPixelCount;
        if (this.washProgress >= this.WASH_THRESHOLD && !this.isWashed) {
            this.isWashed = true;
            // Wipe entire mask — no remnants
            this.maskData.fill(0);
            this.dirty = true;
        }
    }

    updateOutput() {
        if (!this.dirty) return;

        // Cache graffiti pixel data once
        if (!this._graffitiPixels) {
            const ctx = this.graffitiCanvas.getContext('2d');
            this._graffitiPixels = ctx.getImageData(0, 0, this.width, this.height).data;
        }
        const pixels = this._graffitiPixels;
        const outCtx = this.outputCanvas.getContext('2d');
        const outData = outCtx.createImageData(this.width, this.height);

        for (let i = 0; i < this.width * this.height; i++) {
            const pi = i * 4;
            const maskVal = this.maskData[i];
            outData.data[pi] = pixels[pi];         // R
            outData.data[pi + 1] = pixels[pi + 1]; // G
            outData.data[pi + 2] = pixels[pi + 2]; // B
            outData.data[pi + 3] = (pixels[pi + 3] * maskVal) >> 8; // A * mask / 256
        }

        outCtx.putImageData(outData, 0, 0);
        this.dirty = false;
    }

    draw(ctx) {
        this.updateOutput();
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.drawImage(this.outputCanvas, -this.width / 2, -this.height / 2);

        // Draw wash progress bar while actively washing
        if (this.washProgress > 0.02 && !this.isWashed) {
            const barW = 60;
            const barH = 5;
            const barX = -barW / 2;
            const barY = -this.height / 2 - 14;

            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            const pct = Math.min(1, this.washProgress / this.WASH_THRESHOLD);
            ctx.fillStyle = pct < 0.5 ? '#ff4444' : pct < 0.85 ? '#ffaa00' : '#44ff44';
            ctx.fillRect(barX, barY, barW * pct, barH);

            ctx.font = "bold 10px 'Space Grotesk', sans-serif";
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(Math.floor(pct * 100) + '%', 0, barY - 3);
        }

        ctx.restore();
    }

    containsPoint(px, py) {
        const dx = Math.abs(px - this.x);
        const dy = Math.abs(py - this.y);
        return dx < this.width / 2 + 20 && dy < this.height / 2 + 20;
    }
}

// ============================================
// WATER SYSTEM
// ============================================
class WaterSystem {
    constructor() {
        this.particles = [];
        this.drips = [];
        this.MAX_PARTICLES = 80;
        this.MAX_DRIPS = 40;
        this.nozzleX = 0;
        this.nozzleY = 0;
    }

    setNozzle(x, y) {
        this.nozzleX = x;
        this.nozzleY = y;
    }

    update(dt, aimX, aimY, isShooting) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 300 * dt; // gravity
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Update drips
        for (let i = this.drips.length - 1; i >= 0; i--) {
            const d = this.drips[i];
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vy += 150 * dt;
            d.life -= dt;
            if (d.life <= 0) this.drips.splice(i, 1);
        }

        // Spawn spray at impact
        if (isShooting) {
            for (let i = 0; i < 3; i++) {
                if (this.particles.length < this.MAX_PARTICLES) {
                    this.particles.push({
                        x: aimX + (Math.random() - 0.5) * 20,
                        y: aimY + (Math.random() - 0.5) * 20,
                        vx: (Math.random() - 0.5) * 150,
                        vy: -50 - Math.random() * 100,
                        radius: 1 + Math.random() * 3,
                        life: 0.3 + Math.random() * 0.5,
                        maxLife: 0.8,
                        color: `rgba(${150 + Math.random() * 105},${200 + Math.random() * 55},255,`,
                        paintColor: null
                    });
                }
            }
        }
    }

    spawnColoredDrips(x, y, color) {
        for (let i = 0; i < 2; i++) {
            if (this.drips.length < this.MAX_DRIPS) {
                this.drips.push({
                    x: x + (Math.random() - 0.5) * 15,
                    y: y,
                    vx: (Math.random() - 0.5) * 8,
                    vy: 30 + Math.random() * 80,
                    width: 1.5 + Math.random() * 2.5,
                    length: 8 + Math.random() * 16,
                    life: 1.5 + Math.random() * 2,
                    color: color,
                    alpha: 0.5 + Math.random() * 0.3
                });
            }
        }
    }

    renderStream(ctx, aimX, aimY, isShooting) {
        if (!isShooting) return;

        const nx = this.nozzleX;
        const ny = this.nozzleY;
        const wobble = Math.sin(Date.now() * 0.01) * 3;

        // Glow layer
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.quadraticCurveTo(
            nx + wobble, (ny + aimY) / 2 - 30,
            aimX + wobble * 0.5, aimY
        );
        ctx.strokeStyle = 'rgba(37, 71, 244, 0.15)';
        ctx.lineWidth = 14;
        ctx.filter = 'blur(6px)';
        ctx.stroke();
        ctx.filter = 'none';
        ctx.restore();

        // Main stream
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.quadraticCurveTo(
            nx + wobble, (ny + aimY) / 2 - 30,
            aimX + wobble * 0.5, aimY
        );
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();

        // White highlight
        ctx.beginPath();
        ctx.moveTo(nx + 1, ny);
        ctx.quadraticCurveTo(
            nx + wobble + 1, (ny + aimY) / 2 - 30,
            aimX + wobble * 0.5 + 1, aimY
        );
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Impact splash circle
        ctx.save();
        const splashR = 12 + Math.sin(Date.now() * 0.015) * 4;
        ctx.beginPath();
        ctx.arc(aimX, aimY, splashR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 200, 255, 0.12)';
        ctx.fill();
        ctx.restore();
    }

    renderParticles(ctx) {
        // Spray particles
        for (const p of this.particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color + alpha.toFixed(2) + ')';
            ctx.fill();
        }

        // Drips
        for (const d of this.drips) {
            const alpha = Math.min(d.alpha, d.life / 1.5);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.ellipse(d.x, d.y, d.width / 2, d.length / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    clear() {
        this.particles = [];
        this.drips = [];
    }
}

// ============================================
// LEVEL MANAGER
// ============================================
class LevelManager {
    generateQuestion(levelData) {
        let a;
        if (levelData.table === 0) {
            a = 2 + Math.floor(Math.random() * 9); // 2..10
        } else {
            a = levelData.table;
        }
        const b = 1 + Math.floor(Math.random() * 10); // 1..10
        const correct = a * b;
        const wrongs = this.generateWrongs(correct, a, b);

        const answers = this.shuffle([
            { value: correct, isCorrect: true },
            { value: wrongs[0], isCorrect: false },
            { value: wrongs[1], isCorrect: false }
        ]);

        return { text: `${a} × ${b} = ?`, a, b, correct, answers };
    }

    generateWrongs(correct, a, b) {
        const candidates = new Set();
        candidates.add(a * (b + 1));
        candidates.add(a * (b - 1));
        candidates.add((a + 1) * b);
        candidates.add((a - 1) * b);
        candidates.add(correct + a);
        candidates.add(correct - a);
        candidates.add(correct + 10);
        candidates.add(correct - 10);
        candidates.add(correct + 1);
        candidates.add(correct - 1);
        candidates.delete(correct);
        // Remove non-positive
        for (const c of candidates) {
            if (c <= 0) candidates.delete(c);
        }
        const arr = [...candidates];
        this.shuffle(arr);
        return arr.slice(0, 2);
    }

    placeAnswers(answers, canvasW, canvasH) {
        const wallTop = canvasH * 0.25;
        const wallBottom = canvasH * 0.72;
        const wallLeft = canvasW * 0.12;
        const wallRight = canvasW * 0.88;

        const zones = [
            { x: wallLeft + (wallRight - wallLeft) * 0.2, y: wallTop + (wallBottom - wallTop) * 0.55 },
            { x: wallLeft + (wallRight - wallLeft) * 0.5, y: wallTop + (wallBottom - wallTop) * 0.35 },
            { x: wallLeft + (wallRight - wallLeft) * 0.8, y: wallTop + (wallBottom - wallTop) * 0.65 },
        ];
        this.shuffle(zones);

        const colors = [...GRAFFITI_COLORS];
        this.shuffle(colors);

        return answers.map((ans, i) => new GraffitiAnswer(
            String(ans.value),
            zones[i].x + (Math.random() - 0.5) * 20,
            zones[i].y + (Math.random() - 0.5) * 15,
            colors[i],
            ans.isCorrect,
            canvasW, canvasH
        ));
    }

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

// ============================================
// CROSSHAIR RENDERER
// ============================================
function renderCrosshair(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = 'rgba(100,200,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#2547f4';
    ctx.shadowBlur = 8;

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Cross lines
    const gap = 6, len = 12;
    ctx.beginPath();
    ctx.moveTo(x - gap - len, y); ctx.lineTo(x - gap, y);
    ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + len, y);
    ctx.moveTo(x, y - gap - len); ctx.lineTo(x, y - gap);
    ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + len);
    ctx.stroke();

    // Center dot
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ============================================
// MAIN GAME CLASS
// ============================================
class Game {
    constructor() {
        this.state = 'loading';
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.progress = new ProgressManager();
        this.audio = new AudioManager();
        this.input = new InputManager(this.canvas);
        this.levelManager = new LevelManager();
        this.waterSystem = new WaterSystem();
        this.wall = null;

        this.currentLevelId = 1;
        this.currentLevelData = null;
        this.question = null;
        this.graffitiAnswers = [];
        this.questionsCompleted = 0;
        this.elapsedTime = 0;
        this.score = 0;
        this.isPaused = false;
        this.lastTimestamp = 0;
        this.questionTransition = false;
        this.transitionTimer = 0;
        this.gameEnded = false;

        this.setupButtons();
        this.startLoading();
    }

    // ---- State Management ----
    setState(newState) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const map = {
            loading: 'screen-loading',
            menu: 'screen-menu',
            levels: 'screen-levels',
            gameplay: 'screen-gameplay',
            victory: 'screen-victory',
            gameover: 'screen-gameover',
            settings: 'screen-settings',
            help: 'screen-help'
        };
        const el = document.getElementById(map[newState]);
        if (el) el.classList.add('active');
        this.state = newState;

        if (newState === 'levels') this.renderLevelSelect();
        if (newState === 'gameplay') this.onEnterGameplay();
        if (newState !== 'gameplay') {
            this.audio.stopWater();
            this.input.isShooting = false;
        }
    }

    // ---- Loading ----
    startLoading() {
        const bar = document.getElementById('loading-bar-fill');
        const txt = document.getElementById('loading-text');
        let pct = 0;
        const steps = [
            { pct: 30, msg: 'LOADING TEXTURES...' },
            { pct: 60, msg: 'CALIBRATING WATER PRESSURE...' },
            { pct: 85, msg: 'SCANNING GRAFFITI...' },
            { pct: 100, msg: 'SYSTEM READY' },
        ];

        const advance = (i) => {
            if (i >= steps.length) {
                setTimeout(() => this.setState('menu'), 300);
                return;
            }
            const step = steps[i];
            bar.style.width = step.pct + '%';
            txt.textContent = step.msg;
            setTimeout(() => advance(i + 1), 400 + Math.random() * 300);
        };

        // Wait for fonts
        document.fonts.ready.then(() => {
            advance(0);
        });
    }

    // ---- Button Setup ----
    setupButtons() {
        const click = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => { this.audio.init(); this.audio.resume(); this.audio.playClick(); fn(); });
        };

        // Menu
        click('btn-play', () => this.setState('levels'));
        click('btn-settings', () => this.setState('settings'));
        click('btn-help', () => this.setState('help'));

        // Level select
        click('btn-levels-back', () => this.setState('menu'));
        click('nav-home', () => this.setState('menu'));

        // Settings
        click('btn-settings-back', () => this.setState('menu'));

        // Help
        click('btn-help-back', () => this.setState('menu'));
        click('btn-got-it', () => this.setState('menu'));

        // Victory
        click('btn-next-level', () => {
            if (this.currentLevelId < 10) {
                this.currentLevelId++;
                this.startLevel(this.currentLevelId);
            } else {
                this.setState('menu');
            }
        });
        click('btn-victory-menu', () => this.setState('menu'));

        // Game Over
        click('btn-retry', () => this.startLevel(this.currentLevelId));
        click('btn-gameover-menu', () => this.setState('menu'));

        // Pause
        click('btn-pause', () => this.togglePause());
        click('btn-resume', () => this.togglePause());
        click('btn-restart', () => {
            this.hidePause();
            this.startLevel(this.currentLevelId);
        });
        click('btn-quit', () => {
            this.hidePause();
            this.setState('menu');
        });

        // Settings sliders
        const sfxSlider = document.getElementById('slider-sfx');
        const musicSlider = document.getElementById('slider-music');
        if (sfxSlider) {
            sfxSlider.value = this.progress.data.settings.sfxVolume * 100;
            sfxSlider.addEventListener('input', (e) => {
                const v = e.target.value / 100;
                this.progress.data.settings.sfxVolume = v;
                this.audio.setSfxVolume(v);
                this.progress.save();
            });
        }
        if (musicSlider) {
            musicSlider.value = this.progress.data.settings.musicVolume * 100;
            musicSlider.addEventListener('input', (e) => {
                const v = e.target.value / 100;
                this.progress.data.settings.musicVolume = v;
                this.audio.setMusicVolume(v);
                this.progress.save();
            });
        }
    }

    // ---- Level Select ----
    renderLevelSelect() {
        const list = document.getElementById('levels-list');
        const totalScore = document.getElementById('total-score-display');
        totalScore.textContent = this.progress.data.totalScore.toLocaleString();

        list.innerHTML = '';
        LEVEL_DATA.forEach((lvl) => {
            const info = this.progress.getLevelInfo(lvl.id);
            const unlocked = this.progress.isUnlocked(lvl.id);
            const isCurrent = unlocked && !info.completed;
            const isCompleted = info.completed;

            const card = document.createElement('div');
            card.className = 'level-card';
            if (isCompleted) card.classList.add('level-card--completed');
            else if (isCurrent || (unlocked && !isCompleted)) card.classList.add('level-card--current');
            else card.classList.add('level-card--locked');

            let badgeText = '';
            if (isCompleted) badgeText = 'Cleared';
            else if (isCurrent || unlocked) badgeText = 'Current Target';
            else badgeText = 'Locked';

            let starsHTML = '';
            if (isCompleted) {
                for (let s = 0; s < 3; s++) {
                    starsHTML += `<span class="material-icons level-card-star ${s < info.stars ? '' : 'level-card-star--empty'}">star</span>`;
                }
            }

            let extraHTML = '';
            if ((isCurrent || unlocked) && !isCompleted) {
                extraHTML = `
                    <div class="level-card-progress">
                        <div class="level-card-progress-bar"><div class="level-card-progress-fill"></div></div>
                        <div class="level-card-progress-labels"><span>Progress</span><span>0%</span></div>
                    </div>
                    <button class="level-card-play-btn" data-level="${lvl.id}">INJECT CODE</button>
                `;
            }

            if (!unlocked) {
                card.innerHTML = `
                    <div class="level-card-lock"><span class="material-icons">lock</span></div>
                    <div style="padding:1rem;display:flex;align-items:center;gap:1rem">
                        <div style="width:50px;height:50px;border-radius:0.5rem;background:#1a1e33;border:1px solid rgba(255,255,255,0.05);flex-shrink:0"></div>
                        <div style="flex:1">
                            <div class="level-card-title" style="color:#555">${lvl.name}</div>
                            <div class="level-card-subtitle" style="color:var(--neon-red);opacity:0.6">Clear Sector ${lvl.id - 1} to Unlock</div>
                        </div>
                        <div class="level-card-number" style="color:#333">${String(lvl.id).padStart(2, '0')}</div>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div class="level-card-image">
                        <div class="level-card-image-gradient"></div>
                        <div class="level-card-badge">${badgeText}</div>
                    </div>
                    <div class="level-card-body">
                        <div style="display:flex;justify-content:space-between;align-items:flex-end">
                            <div>
                                <div class="level-card-title">${lvl.name}</div>
                                <div class="level-card-subtitle">${lvl.subtitle}</div>
                            </div>
                            <div class="level-card-number">${String(lvl.id).padStart(2, '0')}</div>
                        </div>
                        ${starsHTML ? `<div class="level-card-stars">${starsHTML}</div>` : ''}
                        ${extraHTML}
                    </div>
                `;

                card.addEventListener('click', () => {
                    this.audio.playClick();
                    this.startLevel(lvl.id);
                });
            }

            list.appendChild(card);
        });
    }

    // ---- Gameplay ----
    startLevel(levelId) {
        this.currentLevelId = levelId;
        this.currentLevelData = LEVEL_DATA.find(l => l.id === levelId);
        this.questionsCompleted = 0;
        this.score = 0;
        this.elapsedTime = 0;
        this.gameEnded = false;
        this.questionTransition = false;
        this.waterSystem.clear();

        this.setState('gameplay');

        this.audio.init();
        this.audio.resume();
        this.audio.startMusic();
        this.audio.setSfxVolume(this.progress.data.settings.sfxVolume);
        this.audio.setMusicVolume(this.progress.data.settings.musicVolume);

        this.resizeCanvas();
        this.nextQuestion();
        this.updateHUD();
    }

    onEnterGameplay() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        if (!this._loopStarted) {
            this._loopStarted = true;
            this.lastTimestamp = performance.now();
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    resizeCanvas() {
        const container = document.getElementById('screen-gameplay');
        if (!container) return;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        // Rebuild wall
        this.wall = new WallRenderer(this.canvas.width, this.canvas.height);

        // Set nozzle position (top of cannon barrel)
        this.waterSystem.setNozzle(this.canvas.width / 2, this.canvas.height - 180);
    }

    nextQuestion() {
        if (!this.currentLevelData) return;
        this.question = this.levelManager.generateQuestion(this.currentLevelData);
        this.graffitiAnswers = this.levelManager.placeAnswers(
            this.question.answers,
            this.canvas.width,
            this.canvas.height
        );
    }

    updateHUD() {
        if (!this.currentLevelData) return;
        const name = document.getElementById('hud-level-name');
        const sub = document.getElementById('hud-level-subtitle');
        const timer = document.getElementById('hud-timer');
        const dots = document.getElementById('hud-progress-dots');

        if (name) name.textContent = `LEVEL ${String(this.currentLevelId).padStart(2, '0')}`;
        if (sub) sub.textContent = `${this.currentLevelData.subtitle.toUpperCase()} // SECTOR ${this.currentLevelId}`;

        // Progress dots
        if (dots) {
            dots.innerHTML = '';
            const total = this.currentLevelData.questions;
            for (let i = 0; i < total; i++) {
                const dot = document.createElement('div');
                dot.className = 'hud-progress-dot';
                if (i < this.questionsCompleted) dot.classList.add('filled');
                else if (i === this.questionsCompleted) dot.classList.add('current');
                dots.appendChild(dot);
            }
        }

        this.updateTimer();
    }

    updateTimer() {
        const timer = document.getElementById('hud-timer');
        if (!timer) return;
        const mins = Math.floor(this.elapsedTime / 60);
        const secs = Math.floor(this.elapsedTime % 60);
        timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const overlay = document.getElementById('pause-overlay');
        if (this.isPaused) {
            overlay.classList.add('visible');
            this.audio.stopWater();
        } else {
            overlay.classList.remove('visible');
            this.lastTimestamp = performance.now();
        }
    }

    hidePause() {
        this.isPaused = false;
        document.getElementById('pause-overlay').classList.remove('visible');
    }

    // ---- Game Loop ----
    gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
        this.lastTimestamp = timestamp;

        if (this.state === 'gameplay' && !this.isPaused && !this.gameEnded) {
            this.update(dt);
            this.render();
        } else if (this.state === 'gameplay') {
            this.render(); // still render when paused (just no update)
        }

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        this.elapsedTime += dt;
        this.updateTimer();

        // Question transition delay
        if (this.questionTransition) {
            this.transitionTimer -= dt;
            if (this.transitionTimer <= 0) {
                this.questionTransition = false;
                this.nextQuestion();
                this.updateHUD();
            }
            // Still update water visuals during transition
            this.waterSystem.update(dt, this.input.aimX, this.input.aimY, false);
            return;
        }

        // Water
        const shooting = this.input.isShooting;
        this.waterSystem.update(dt, this.input.aimX, this.input.aimY, shooting);

        // Audio
        if (shooting && !this.audio.isWaterPlaying) this.audio.startWater();
        else if (!shooting && this.audio.isWaterPlaying) this.audio.stopWater();

        // Muzzle flash
        const muzzle = document.getElementById('cannon-muzzle-flash');
        if (muzzle) {
            if (shooting) muzzle.classList.add('active');
            else muzzle.classList.remove('active');
        }

        // Hit detection
        if (shooting) {
            const sensitivity = this.progress.data.settings.sensitivity || 5;
            const radius = 18 + sensitivity * 2;
            for (const answer of this.graffitiAnswers) {
                if (answer.isWashed) continue;
                if (answer.containsPoint(this.input.aimX, this.input.aimY)) {
                    const hit = answer.applyWater(this.input.aimX, this.input.aimY, radius);
                    if (hit) {
                        this.waterSystem.spawnColoredDrips(this.input.aimX, this.input.aimY, answer.color);
                        if (Math.random() < 0.1) this.audio.playSplash();
                    }
                }
            }
        }

        // Check win/lose
        this.checkConditions();
    }

    checkConditions() {
        // Check if correct answer was washed
        for (const answer of this.graffitiAnswers) {
            if (answer.isWashed && answer.isCorrect) {
                this.gameEnded = true;
                this.audio.stopWater();
                this.audio.stopMusic();
                this.audio.playWrong();

                const el = document.getElementById('gameover-answer');
                if (el) el.textContent = this.question.correct;

                setTimeout(() => this.setState('gameover'), 1200);
                return;
            }
        }

        // Check if both wrong answers washed
        const wrongsWashed = this.graffitiAnswers.filter(a => a.isWashed && !a.isCorrect).length;
        if (wrongsWashed === 2) {
            this.questionsCompleted++;
            this.score += this.calcScore();
            this.audio.stopWater();

            if (this.questionsCompleted >= this.currentLevelData.questions) {
                // Level complete!
                this.gameEnded = true;
                this.audio.stopMusic();
                this.audio.playVictory();

                const stars = this.progress.completeLevel(this.currentLevelId, this.score, this.elapsedTime);
                this.showVictory(stars);
            } else {
                // Next question
                this.questionTransition = true;
                // Every 2 answers — show praise (longer pause)
                if (this.questionsCompleted % 2 === 0 && this.questionsCompleted > 0) {
                    this.praiseMessage = PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];
                    this.transitionTimer = 2.2;
                } else {
                    this.praiseMessage = null;
                    this.transitionTimer = 1.2;
                }
            }
        }
    }

    calcScore() {
        return 100 + Math.max(0, Math.floor((20 - this.elapsedTime) * 5));
    }

    showVictory(stars) {
        setTimeout(() => {
            document.getElementById('victory-level-label').textContent =
                `LEVEL ${String(this.currentLevelId).padStart(2, '0')} COMPLETE`;
            document.getElementById('victory-answer').textContent = this.question.correct;

            const mins = Math.floor(this.elapsedTime / 60);
            const secs = Math.floor(this.elapsedTime % 60);
            document.getElementById('victory-time').textContent = `${mins}:${String(secs).padStart(2, '0')}`;
            document.getElementById('victory-score').textContent = this.score.toLocaleString();
            document.getElementById('victory-stars').textContent = `${stars}/3`;

            // Hide next level button if last level
            const nextBtn = document.getElementById('btn-next-level');
            if (nextBtn) nextBtn.style.display = this.currentLevelId >= 10 ? 'none' : '';

            this.setState('victory');
        }, 1000);
    }

    // ---- Render ----
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Background wall
        if (this.wall) {
            ctx.drawImage(this.wall.canvas, 0, 0, w, h);
        }

        // Dark gradient at top and bottom
        const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.15);
        topGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, w, h * 0.15);

        const botGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
        botGrad.addColorStop(0, 'rgba(0,0,0,0)');
        botGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, h * 0.75, w, h * 0.25);

        // Math problem (stenciled on wall)
        if (this.question && !this.questionTransition) {
            ctx.save();
            ctx.font = "bold 36px 'Black Ops One', cursive";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const qx = w / 2;
            const qy = h * 0.15;

            // Problem box
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 3;
            const textW = ctx.measureText(this.question.text).width + 40;
            ctx.save();
            ctx.translate(qx, qy);
            ctx.rotate(-0.02);
            ctx.strokeRect(-textW / 2, -28, textW, 56);
            ctx.restore();

            // Text
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText(this.question.text, qx, qy);
            ctx.restore();

            // Hint text: wash the WRONG answers
            ctx.save();
            ctx.font = "bold 14px 'Space Grotesk', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 0, 60, 0.9)';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            const hintY = qy + 42;
            ctx.fillText('⚠ WASH AWAY THE WRONG ANSWERS! LEAVE THE CORRECT ONE!', qx, hintY);
            ctx.restore();
        }

        // Graffiti answers
        for (const answer of this.graffitiAnswers) {
            answer.draw(ctx);
        }

        // Water stream + particles
        this.waterSystem.renderStream(ctx, this.input.aimX, this.input.aimY, this.input.isShooting);
        this.waterSystem.renderParticles(ctx);

        // Crosshair (only on non-touch)
        if (!this.input.isTouch) {
            renderCrosshair(ctx, this.input.aimX, this.input.aimY);
        }

        // Transition flash + praise
        if (this.questionTransition) {
            const duration = this.praiseMessage ? 2.2 : 1.2;
            const progress = 1 - this.transitionTimer / duration;
            // Fade in then fade out
            const alpha = progress < 0.3 ? progress / 0.3 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
            const a = Math.max(0, Math.min(1, alpha));

            // Background overlay
            ctx.fillStyle = `rgba(16,19,34,${a * 0.6})`;
            ctx.fillRect(0, 0, w, h);

            if (this.praiseMessage) {
                // Big praise text
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Main praise word
                ctx.font = "bold 52px 'Space Grotesk', sans-serif";
                ctx.fillStyle = `rgba(57,255,20,${a})`;
                ctx.shadowColor = 'rgba(57,255,20,0.6)';
                ctx.shadowBlur = 20;
                ctx.fillText(this.praiseMessage.text, w / 2, h / 2 - 25);

                // Sub text
                ctx.font = "500 18px 'Space Grotesk', sans-serif";
                ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`;
                ctx.shadowBlur = 0;
                ctx.fillText(this.praiseMessage.sub, w / 2, h / 2 + 20);

                // Score bonus
                ctx.font = "bold 14px monospace";
                ctx.fillStyle = `rgba(250,255,0,${a * 0.9})`;
                ctx.fillText('+' + this.calcScore() + ' PTS', w / 2, h / 2 + 50);

                ctx.restore();
            } else {
                // Simple "CORRECT!" text
                ctx.save();
                ctx.font = "bold 36px 'Space Grotesk', sans-serif";
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = `rgba(57,255,20,${a})`;
                ctx.shadowColor = 'rgba(57,255,20,0.5)';
                ctx.shadowBlur = 15;
                ctx.fillText('CORRECT!', w / 2, h / 2);
                ctx.restore();
            }
        }
    }
}

// ============================================
// START THE GAME
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
