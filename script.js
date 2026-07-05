/**
 * Aura Design Studio - Interactive & Physics Scripts
 * Core Features: Constellation Canvas, Lightning Flash, Custom Cursor trails,
 * 3D Holographic Sphere, Waterfall Energy, Intersection Observer, and Proximity Icons.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check user preference for motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    /* ==========================================================================
       Global Mouse Coordinator
       ========================================================================== */
    const mouse = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        targetX: window.innerWidth / 2,
        targetY: window.innerHeight / 2,
        out: true,
        moving: false
    };

    let mouseMoveTimeout;
    window.addEventListener('mousemove', (e) => {
        mouse.targetX = e.clientX;
        mouse.targetY = e.clientY;
        mouse.out = false;
        mouse.moving = true;

        // Reset moving flag after delay
        clearTimeout(mouseMoveTimeout);
        mouseMoveTimeout = setTimeout(() => {
            mouse.moving = false;
        }, 150);
    });

    window.addEventListener('mouseleave', () => {
        mouse.out = true;
        mouse.moving = false;
    });

    /* ==========================================================================
       Background Stars & Constellation Canvas
       ========================================================================== */
    const bgCanvas = document.getElementById('bg-canvas');
    const bgCtx = bgCanvas?.getContext('2d');
    
    let stars = [];
    let planets = [];
    let shootingStars = [];
    let cursorParticles = [];
    let starBrightnessSurge = 0; // boosted by thunder, decays to 0
    const maxStarsCount = isMobile ? 50 : 130;
    const connectionRadius = 120;
    
    // Physics constants for spring connection
    const springStiffness = 0.005;
    const damping = 0.92;
    const attractionRadius = 160;
    const attractionStrength = 0.04;

    function resizeBgCanvas() {
        if (!bgCanvas) return;
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    }
    resizeBgCanvas();
    window.addEventListener('resize', resizeBgCanvas);

    // Initialize Star coordinates
    class Star {
        constructor() {
            this.x = Math.random() * window.innerWidth;
            this.y = Math.random() * window.innerHeight;
            this.baseX = this.x;
            this.baseY = this.y;
            this.vx = 0;
            this.vy = 0;
            this.radius = Math.random() * 1.5 + 0.5;
            this.color = '#4fd8ff';
            
            // Slow background drift
            this.driftX = (Math.random() - 0.5) * 0.15;
            this.driftY = (Math.random() - 0.5) * 0.15;
            this.pulseSpeed = Math.random() * 0.02 + 0.005;
            this.pulseAlpha = Math.random();
        }

        update() {
            // Background drift
            this.baseX += this.driftX;
            this.baseY += this.driftY;

            // Wrap around boundaries
            if (this.baseX < 0) this.baseX = window.innerWidth;
            if (this.baseX > window.innerWidth) this.baseX = 0;
            if (this.baseY < 0) this.baseY = window.innerHeight;
            if (this.baseY > window.innerHeight) this.baseY = 0;

            if (!prefersReducedMotion && !isMobile) {
                // Spring physics to return to base positions
                let dxHome = this.baseX - this.x;
                let dyHome = this.baseY - this.y;
                
                this.vx += dxHome * springStiffness;
                this.vy += dyHome * springStiffness;

                // Mouse attraction drag force
                if (!mouse.out) {
                    let dxMouse = mouse.x - this.x;
                    let dyMouse = mouse.y - this.y;
                    let dist = Math.hypot(dxMouse, dyMouse);

                    if (dist < attractionRadius) {
                        let force = (attractionRadius - dist) / attractionRadius;
                        // Pull particle toward mouse coordinates
                        this.vx += (dxMouse / dist) * force * attractionStrength;
                        this.vy += (dyMouse / dist) * force * attractionStrength;
                    }
                }

                // Apply friction damping
                this.vx *= damping;
                this.vy *= damping;

                this.x += this.vx;
                this.y += this.vy;
            } else {
                // Simplified motion for low-spec/mobile
                this.x = this.baseX;
                this.y = this.baseY;
            }

            // Alpha pulsation + thunder surge brightening
            this.pulseAlpha += this.pulseSpeed;
            this.opacity = Math.min(1.0, Math.abs(Math.sin(this.pulseAlpha)) * 0.6 + 0.2 + starBrightnessSurge * 0.75);
        }

        draw() {
            if (!bgCtx) return;
            const r = this.radius * (1 + starBrightnessSurge * 0.6);
            bgCtx.beginPath();
            bgCtx.arc(this.x, this.y, r, 0, Math.PI * 2);
            bgCtx.fillStyle = `rgba(79, 216, 255, ${this.opacity})`;
            bgCtx.shadowBlur = r * (3 + starBrightnessSurge * 10);
            bgCtx.shadowColor = '#4fd8ff';
            bgCtx.fill();
        }
    }

    // Spawn stars
    function initStars() {
        stars = [];
        for (let i = 0; i < maxStarsCount; i++) {
            stars.push(new Star());
        }
    }
    initStars();

    /* ==========================================================================
       PLANET CLASS — glowing orbs with rings floating in the star field
       ========================================================================== */
    class Planet {
        constructor(x, y, radius, hexColor, hasRing) {
            this.x = x; this.y = y; this.baseY = y;
            this.radius = radius;
            this.hexColor = hexColor;
            this.hasRing = hasRing;
            this.floatPhase = Math.random() * Math.PI * 2;
            this.floatSpeed = 0.0006 + Math.random() * 0.0004;
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.pulseSpeed = 0.004;
        }
        update() {
            this.floatPhase += this.floatSpeed;
            this.pulsePhase += this.pulseSpeed;
            this.y = this.baseY + Math.sin(this.floatPhase) * 10;
        }
        draw() {
            if (!bgCtx) return;
            const pulse = 0.85 + Math.sin(this.pulsePhase) * 0.15;
            const surge = starBrightnessSurge;
            // Outer atmospheric halo
            const halo = bgCtx.createRadialGradient(this.x, this.y, this.radius * 0.6, this.x, this.y, this.radius * 3);
            halo.addColorStop(0, 'rgba(79,216,255,0.12)');
            halo.addColorStop(1, 'rgba(79,216,255,0)');
            bgCtx.beginPath();
            bgCtx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
            bgCtx.fillStyle = halo;
            bgCtx.fill();
            // Body
            const body = bgCtx.createRadialGradient(this.x - this.radius*0.3, this.y - this.radius*0.3, 1, this.x, this.y, this.radius * pulse);
            body.addColorStop(0, 'rgba(126,232,255,0.7)');
            body.addColorStop(0.5, 'rgba(79,216,255,0.35)');
            body.addColorStop(1, 'rgba(10,30,60,0.05)');
            bgCtx.beginPath();
            bgCtx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
            bgCtx.fillStyle = body;
            bgCtx.shadowBlur = 18 + surge * 25;
            bgCtx.shadowColor = '#4fd8ff';
            bgCtx.fill();
            bgCtx.shadowBlur = 0;
            // Ring
            if (this.hasRing) {
                bgCtx.save();
                bgCtx.translate(this.x, this.y);
                bgCtx.scale(1, 0.3);
                bgCtx.beginPath();
                bgCtx.arc(0, 0, this.radius * 1.8, 0, Math.PI * 2);
                bgCtx.strokeStyle = `rgba(79,216,255,${0.25 + surge * 0.3})`;
                bgCtx.lineWidth = this.radius * 0.2;
                bgCtx.shadowBlur = 8;
                bgCtx.shadowColor = '#4fd8ff';
                bgCtx.stroke();
                bgCtx.restore();
            }
        }
    }

    function initPlanets() {
        planets = [];
        const W = window.innerWidth, H = window.innerHeight;
        // Large ringed gas giant — top right
        planets.push(new Planet(W * 0.84, H * 0.17, isMobile ? 26 : 50, '#4fd8ff', true));
        // Small moon — bottom left
        planets.push(new Planet(W * 0.07, H * 0.75, isMobile ? 15 : 28, '#7ee8ff', false));
        if (!isMobile) {
            // Medium planet — mid right
            planets.push(new Planet(W * 0.93, H * 0.55, 20, '#3ab8d8', false));
        }
    }
    initPlanets();
    window.addEventListener('resize', initPlanets);

    /* ==========================================================================
       SHOOTING STAR CLASS — streaks across the sky periodically
       ========================================================================== */
    class ShootingStar {
        constructor() { this.reset(); }
        reset() {
            const W = window.innerWidth, H = window.innerHeight;
            this.x = Math.random() * W * 0.7;
            this.y = Math.random() * H * 0.35;
            const a = (20 + Math.random() * 25) * Math.PI / 180;
            const sp = 9 + Math.random() * 9;
            this.vx = Math.cos(a) * sp;
            this.vy = Math.sin(a) * sp;
            this.len = 90 + Math.random() * 110;
            this.alpha = 0;
            this.maxAlpha = 0.55 + Math.random() * 0.4;
            this.life = 0;
            this.maxLife = 55 + Math.random() * 35;
            this.active = false;
        }
        update() {
            if (!this.active) return;
            this.x += this.vx; this.y += this.vy; this.life++;
            const t = this.life / this.maxLife;
            if (t < 0.2) this.alpha = (t / 0.2) * this.maxAlpha;
            else if (t < 0.65) this.alpha = this.maxAlpha;
            else this.alpha = ((1 - t) / 0.35) * this.maxAlpha;
            if (this.life >= this.maxLife) { this.active = false; this.reset(); }
        }
        draw() {
            if (!bgCtx || !this.active || this.alpha < 0.01) return;
            const spd = Math.hypot(this.vx, this.vy);
            const tx = this.x - this.vx * (this.len / spd);
            const ty = this.y - this.vy * (this.len / spd);
            const g = bgCtx.createLinearGradient(tx, ty, this.x, this.y);
            g.addColorStop(0, 'rgba(79,216,255,0)');
            g.addColorStop(0.6, `rgba(126,232,255,${this.alpha * 0.5})`);
            g.addColorStop(1, `rgba(255,255,255,${this.alpha})`);
            bgCtx.beginPath();
            bgCtx.moveTo(tx, ty);
            bgCtx.lineTo(this.x, this.y);
            bgCtx.strokeStyle = g;
            bgCtx.lineWidth = 1.8;
            bgCtx.shadowBlur = 5;
            bgCtx.shadowColor = '#7ee8ff';
            bgCtx.stroke();
            bgCtx.shadowBlur = 0;
            bgCtx.beginPath();
            bgCtx.arc(this.x, this.y, 2.2, 0, Math.PI * 2);
            bgCtx.fillStyle = `rgba(255,255,255,${this.alpha})`;
            bgCtx.fill();
        }
    }

    // Spawn shooting stars and trigger them randomly
    if (!isMobile && !prefersReducedMotion) {
        for (let i = 0; i < 2; i++) shootingStars.push(new ShootingStar());
        setInterval(() => {
            const idle = shootingStars.find(s => !s.active);
            if (idle) { idle.reset(); idle.active = true; }
        }, 3500);
        // Trigger first one after 2 s
        setTimeout(() => { if (shootingStars[0]) shootingStars[0].active = true; }, 2000);
    }

    /* ==========================================================================
       Custom Cursor physics and particles
       ========================================================================== */
    const cursorDot = document.getElementById('custom-cursor');
    const cursorRing = document.getElementById('custom-cursor-ring');
    
    let ringPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    if (!isMobile && cursorDot && cursorRing) {
        // Show cursor elements
        cursorDot.style.opacity = '1';
        cursorRing.style.opacity = '1';
    }

    class CursorParticle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 1.5 + 0.5;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.size = Math.random() * 3.5 + 1.5;
            this.alpha = 1.0;
            this.decay = Math.random() * 0.02 + 0.015;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.decay;
            this.size *= 0.96;
        }

        draw() {
            if (!bgCtx) return;
            bgCtx.beginPath();
            bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            bgCtx.fillStyle = `rgba(126, 232, 255, ${this.alpha})`;
            bgCtx.fill();
        }
    }

    // Spawn particle at coordinates
    function spawnCursorParticles(x, y, count = 1) {
        if (prefersReducedMotion || isMobile) return;
        for (let i = 0; i < count; i++) {
            cursorParticles.push(new CursorParticle(x, y));
        }
    }

    /* ==========================================================================
       Thunder / Lightning Flash System
       — Page-load burst: dramatic 3-flash strike on every page refresh
       — Background cycle: repeats every 5 seconds with randomised sweep origin
       ========================================================================== */
    const flash = document.getElementById('lightning-flash');

    // Star brightness surge — called every time thunder fires
    function triggerStarSurge() {
        starBrightnessSurge = 1.0;
        const decay = setInterval(() => {
            starBrightnessSurge = Math.max(0, starBrightnessSurge - 0.07);
            if (starBrightnessSurge <= 0) clearInterval(decay);
        }, 45);
    }

    // Helper: randomise the radial gradient origin for varied thunder positions
    function setFlashOrigin(xPct, yPct) {
        if (!flash) return;
        flash.style.background = `radial-gradient(ellipse 90% 70% at ${xPct}% ${yPct}%,
            rgba(79, 216, 255, 0.28) 0%,
            rgba(79, 216, 255, 0.10) 40%,
            transparent 72%)`;
    }

    // ── PAGE-LOAD THUNDER BURST ──────────────────────────────────────────────
    // Fires once ~400ms after page load — dramatic opening strike on refresh.
    function triggerLoadThunder() {
        if (prefersReducedMotion || !flash) return;

        // Bloom centred at top for a dramatic downward opening strike
        setFlashOrigin(50, 0);

        // Add CSS animation class (handles the rapid multi-flicker via keyframes)
        flash.classList.add('thunder-burst');

        // Remove class after animation completes so it can fire again next refresh
        flash.addEventListener('animationend', () => {
            flash.classList.remove('thunder-burst');
            flash.style.opacity = '0';
        }, { once: true });
    }

    // Trigger on every page load after short delay — also surges star field
    function triggerLoadThunder() {
        if (prefersReducedMotion || !flash) return;
        setFlashOrigin(50, 0);
        flash.classList.add('thunder-burst');
        triggerStarSurge();
        flash.addEventListener('animationend', () => {
            flash.classList.remove('thunder-burst');
            flash.style.opacity = '0';
        }, { once: true });
    }
    setTimeout(triggerLoadThunder, 500);

    // ── REPEATING BACKGROUND THUNDER (every 5 seconds) ──────────────────────
    function triggerBackgroundThunder() {
        if (prefersReducedMotion || !flash) return;

        // Random bloom origin — realistic sky lightning positions
        const xOrigins = [20, 35, 50, 65, 80];
        const x = xOrigins[Math.floor(Math.random() * xOrigins.length)];
        const y = Math.random() * 25; // 0–25% from top
        setFlashOrigin(x, y);

        // Randomised intensity for each strike — never looks the same twice
        const i1 = (0.18 + Math.random() * 0.18).toFixed(2);
        const i2 = (0.25 + Math.random() * 0.20).toFixed(2);
        const i3 = (0.12 + Math.random() * 0.14).toFixed(2);

        // Rapid triple-flicker sequence matching real thunder cadence
        flash.style.transition = 'opacity 0.06s ease-in';
        flash.style.opacity = i1;

        setTimeout(() => {
            flash.style.transition = 'opacity 0.10s ease-out';
            flash.style.opacity = '0.02';
        }, 90);

        setTimeout(() => {
            flash.style.transition = 'opacity 0.05s ease-in';
            flash.style.opacity = i2;
        }, 220);

        setTimeout(() => {
            flash.style.transition = 'opacity 0.12s ease-out';
            flash.style.opacity = '0.01';
        }, 320);

        setTimeout(() => {
            flash.style.transition = 'opacity 0.06s ease-in';
            flash.style.opacity = i3;
        }, 460);

        setTimeout(() => {
            // Slow atmospheric fade — the glow dissipates naturally
            flash.style.transition = 'opacity 1.6s cubic-bezier(0.16, 1, 0.3, 1)';
            flash.style.opacity = '0';
        }, 580);
    }

    // ── BACKGROUND CYCLE — star surge added
    const _origBgThunder = triggerBackgroundThunder;
    function triggerBackgroundThunderFull() {
        _origBgThunder();
        // Delay surge slightly to sync with the second flash peak
        setTimeout(triggerStarSurge, 220);
    }

    // Start background thunder cycle: first strike at 5 s, then every 5 s
    setTimeout(() => {
        triggerBackgroundThunderFull();
        setInterval(triggerBackgroundThunderFull, 5000);
    }, 5000);

    /* ==========================================================================
       Sliding Headline Carousel
       ========================================================================== */
    const slides = document.querySelectorAll('.slide-text');
    let slideIndex = 0;

    if (slides.length > 0) {
        setInterval(() => {
            const current = slides[slideIndex];
            slideIndex = (slideIndex + 1) % slides.length;
            const next = slides[slideIndex];

            current.classList.remove('active');
            current.classList.add('exit');

            next.classList.remove('exit');
            next.classList.add('active');

            setTimeout(() => {
                current.classList.remove('exit');
            }, 800);
        }, 4000);
    }

    /* ==========================================================================
       3D Holographic Sphere
       ========================================================================== */
    const holoCanvas = document.getElementById('holo-canvas');
    const holoCtx = holoCanvas?.getContext('2d');
    const holoCard = document.getElementById('holo-card');
    
    let spherePoints = [];
    const sphereRadius = 90;
    const sphereSegmentsLat = 9;
    const sphereSegmentsLong = 14;
    let sphereRotationY = 0;
    let sphereRotationX = 0;

    // Generate sphere points in 3D
    function initSphere() {
        spherePoints = [];
        for (let i = 0; i <= sphereSegmentsLat; i++) {
            let lat = (i * Math.PI) / sphereSegmentsLat - Math.PI / 2;
            for (let j = 0; j < sphereSegmentsLong; j++) {
                let lon = (j * 2 * Math.PI) / sphereSegmentsLong;
                let x = sphereRadius * Math.cos(lat) * Math.cos(lon);
                let y = sphereRadius * Math.sin(lat);
                let z = sphereRadius * Math.cos(lat) * Math.sin(lon);
                spherePoints.push({ x, y, z });
            }
        }
    }
    initSphere();

    function resizeHoloCanvas() {
        if (!holoCanvas) return;
        holoCanvas.width = 320;
        holoCanvas.height = 320;
    }
    resizeHoloCanvas();

    // 3D rotation projection formulas
    function draw3DSphere() {
        if (!holoCtx || !holoCanvas) return;
        holoCtx.clearRect(0, 0, holoCanvas.width, holoCanvas.height);
        
        const centerX = holoCanvas.width / 2;
        const centerY = holoCanvas.height / 2;
        const perspective = 300;
        
        // Auto rotate
        if (!prefersReducedMotion) {
            sphereRotationY += 0.006;
            sphereRotationX = Math.sin(sphereRotationY * 0.5) * 0.2;
        }

        const sinY = Math.sin(sphereRotationY);
        const cosY = Math.cos(sphereRotationY);
        const sinX = Math.sin(sphereRotationX);
        const cosX = Math.cos(sphereRotationX);

        // Project and store coordinates
        let projected = [];
        for (let i = 0; i < spherePoints.length; i++) {
            let p = spherePoints[i];
            
            // Rotate around Y axis
            let x1 = p.x * cosY - p.z * sinY;
            let z1 = p.z * cosY + p.x * sinY;
            
            // Rotate around X axis
            let y2 = p.y * cosX - z1 * sinX;
            let z2 = z1 * cosX + p.y * sinX;

            // Perspective scale
            let scale = perspective / (perspective + z2);
            let projX = centerX + x1 * scale;
            let projY = centerY + y2 * scale;
            
            projected.push({ x: projX, y: projY, z: z2, visible: z2 < 100 });
        }

        // Draw connections (Longitudes / Rings)
        holoCtx.strokeStyle = 'rgba(79, 216, 255, 0.2)';
        holoCtx.lineWidth = 1.0;
        holoCtx.shadowBlur = 6;
        holoCtx.shadowColor = '#4fd8ff';

        for (let i = 0; i <= sphereSegmentsLat; i++) {
            holoCtx.beginPath();
            for (let j = 0; j < sphereSegmentsLong; j++) {
                let idx = i * sphereSegmentsLong + j;
                let nextIdx = i * sphereSegmentsLong + ((j + 1) % sphereSegmentsLong);
                
                let p1 = projected[idx];
                let p2 = projected[nextIdx];
                
                if (p1 && p2 && p1.z < 20 && p2.z < 20) {
                    holoCtx.moveTo(p1.x, p1.y);
                    holoCtx.lineTo(p2.x, p2.y);
                }
            }
            holoCtx.stroke();
        }

        // Draw connections (Latitudes / Struts)
        for (let j = 0; j < sphereSegmentsLong; j++) {
            holoCtx.beginPath();
            for (let i = 0; i < sphereSegmentsLat; i++) {
                let idx = i * sphereSegmentsLong + j;
                let nextIdx = (i + 1) * sphereSegmentsLong + j;
                
                let p1 = projected[idx];
                let p2 = projected[nextIdx];
                
                if (p1 && p2 && p1.z < 20 && p2.z < 20) {
                    holoCtx.moveTo(p1.x, p1.y);
                    holoCtx.lineTo(p2.x, p2.y);
                }
            }
            holoCtx.stroke();
        }

        // Draw points
        holoCtx.fillStyle = 'rgba(126, 232, 255, 0.7)';
        holoCtx.shadowBlur = 10;
        for (let i = 0; i < projected.length; i++) {
            let p = projected[i];
            if (p && p.z < 0) { // Only draw front-facing nodes
                holoCtx.beginPath();
                holoCtx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
                holoCtx.fill();
            }
        }
        holoCtx.shadowBlur = 0;
    }

    // Parallax mouse tilt for 3D card
    if (holoCard && !isMobile) {
        window.addEventListener('mousemove', (e) => {
            const rect = holoCard.getBoundingClientRect();
            const cardCenterX = rect.left + rect.width / 2;
            const cardCenterY = rect.top + rect.height / 2;
            
            // Calculate mouse distance from center
            const dx = e.clientX - cardCenterX;
            const dy = e.clientY - cardCenterY;
            
            // Map rotation limit (max 12 deg)
            const rotY = (dx / (window.innerWidth / 2)) * 12;
            const rotX = -(dy / (window.innerHeight / 2)) * 12;

            holoCard.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        });

        // Reset rotation on leave
        holoCard.parentElement?.addEventListener('mouseleave', () => {
            holoCard.style.transform = 'rotateX(0deg) rotateY(0deg)';
        });
    }

    /* ==========================================================================
       Waterfall Light Effect Section
       ========================================================================== */
    const wfCanvas = document.getElementById('waterfall-canvas');
    const wfCtx = wfCanvas?.getContext('2d');
    let wfParticles = [];
    const wfCount = isMobile ? 30 : 90;

    function resizeWaterfallCanvas() {
        if (!wfCanvas) return;
        const rect = wfCanvas.parentElement.getBoundingClientRect();
        wfCanvas.width = rect.width;
        wfCanvas.height = rect.height;
    }
    resizeWaterfallCanvas();
    window.addEventListener('resize', resizeWaterfallCanvas);

    class WaterfallParticle {
        constructor(width, height) {
            this.canvasW = width;
            this.canvasH = height;
            this.x = Math.random() * width;
            this.y = Math.random() * height - height; // Start above viewport
            this.speed = Math.random() * 2.5 + 1.2;
            this.length = Math.random() * 60 + 20;
            this.lineWidth = Math.random() * 1.5 + 0.5;
            this.alpha = Math.random() * 0.5 + 0.15;
        }

        update(w, h) {
            this.y += this.speed;
            
            // Reset when reaching bottom
            if (this.y > h) {
                this.y = -this.length;
                this.x = Math.random() * w;
                this.speed = Math.random() * 2.5 + 1.2;
                this.length = Math.random() * 60 + 20;
                this.alpha = Math.random() * 0.5 + 0.15;
            }
        }

        draw(ctx) {
            if (!ctx) return;
            const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.length);
            grad.addColorStop(0, 'rgba(79, 216, 255, 0)');
            grad.addColorStop(1, `rgba(79, 216, 255, ${this.alpha})`);
            
            ctx.strokeStyle = grad;
            ctx.lineWidth = this.lineWidth;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, this.y + this.length);
            ctx.stroke();
        }
    }

    function initWaterfall() {
        wfParticles = [];
        if (!wfCanvas) return;
        for (let i = 0; i < wfCount; i++) {
            wfParticles.push(new WaterfallParticle(wfCanvas.width, wfCanvas.height));
        }
    }
    initWaterfall();
    window.addEventListener('resize', initWaterfall);

    /* ==========================================================================
       Timeline scroll-progress tracker
       ========================================================================== */
    const timeline = document.querySelector('.timeline');
    const timelineProgress = document.querySelector('.timeline-progress');
    const timelineItems = document.querySelectorAll('.timeline-item');

    function updateTimeline() {
        if (!timeline || !timelineProgress) return;
        const rect = timeline.getBoundingClientRect();
        
        // Calculate current scroll point relative to center of viewport
        const viewportCenter = window.innerHeight * 0.65;
        
        let progressStart = rect.top - viewportCenter;
        let progressHeight = rect.height;
        let scrolled = -progressStart;

        let percentage = Math.max(0, Math.min(100, (scrolled / progressHeight) * 100));
        timelineProgress.style.height = `${percentage}%`;

        // Highlight passed milestones
        timelineItems.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            if (itemRect.top < viewportCenter) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    window.addEventListener('scroll', updateTimeline);
    updateTimeline();

    /* ==========================================================================
       Service Cards Local mouse glow coordinates
       ========================================================================== */
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    /* ==========================================================================
       Proximity-based Social Icons Glow Ripple
       ========================================================================== */
    const socialIconsContainer = document.getElementById('social-proximity-container');
    const socialButtons = document.querySelectorAll('.social-icon-btn');
    const proximityRange = 160;

    if (socialIconsContainer && socialButtons.length > 0 && !isMobile) {
        window.addEventListener('mousemove', (e) => {
            socialButtons.forEach(btn => {
                const rect = btn.getBoundingClientRect();
                const btnX = rect.left + rect.width / 2;
                const btnY = rect.top + rect.height / 2;
                
                const dist = Math.hypot(e.clientX - btnX, e.clientY - btnY);
                
                if (dist < proximityRange) {
                    const factor = 1 - (dist / proximityRange); // scale 0 to 1
                    
                    // Ripple transformations: translate up and scale
                    const translateY = -10 * factor;
                    const scale = 1 + (0.22 * factor);
                    
                    btn.classList.add('proximity-active');
                    btn.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
                    btn.style.setProperty('--glow-strength', factor);
                    btn.style.borderColor = `rgba(79, 216, 255, ${0.15 + factor * 0.55})`;
                    
                    // Soft background glow shadow strength
                    btn.style.boxShadow = `0 0 ${12 * factor}px rgba(79, 216, 255, ${0.15 * factor})`;
                } else {
                    btn.classList.remove('proximity-active');
                    btn.style.transform = 'translate3d(0, 0, 0) scale(1)';
                    btn.style.borderColor = '';
                    btn.style.boxShadow = '';
                }
            });
        });
    }

    /* ==========================================================================
       IntersectionObserver for Scroll Reveal
       ========================================================================== */
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Unobserve once triggered to lock animation state
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    /* ==========================================================================
       STAT COUNTER ANIMATION — numbers count up when badges enter viewport
       ========================================================================== */
    function animateCounter(el, target, suffix, duration) {
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start = Math.min(start + step, target);
            el.textContent = Math.floor(start) + suffix;
            if (start >= target) clearInterval(timer);
        }, 16);
    }

    const statNumbers = document.querySelectorAll('.stat-number');
    const statObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const raw = el.textContent.trim();
            const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
            const suffix = raw.replace(/[0-9.]/g, '');
            animateCounter(el, num, suffix, 1600);
            obs.unobserve(el);
        });
    }, { threshold: 0.6 });
    statNumbers.forEach(el => statObserver.observe(el));

    /* ==========================================================================
       MAGNETIC HERO BUTTONS — CTA buttons subtly follow cursor
       ========================================================================== */
    if (!isMobile && !prefersReducedMotion) {
        document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const r = btn.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2);
                const dy = e.clientY - (r.top + r.height / 2);
                btn.style.transform = `translate(${dx * 0.18}px, ${dy * 0.22}px)`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translate(0,0)';
                btn.style.transition = 'transform 0.55s cubic-bezier(0.25,1,0.5,1)';
            });
            btn.addEventListener('mouseenter', () => {
                btn.style.transition = 'transform 0.1s linear';
            });
        });
    }

    /* ==========================================================================
       SERVICE CARD 3D TILT — cards tilt toward cursor in perspective
       ========================================================================== */
    if (!isMobile && !prefersReducedMotion) {
        document.querySelectorAll('.service-card').forEach(card => {
            card.style.transition = 'transform 0.1s linear, border-color 0.5s, box-shadow 0.5s';
            card.addEventListener('mousemove', (e) => {
                const r = card.getBoundingClientRect();
                const x = e.clientX - r.left;
                const y = e.clientY - r.top;
                const rotX = ((y / r.height) - 0.5) * -12;
                const rotY = ((x / r.width) - 0.5) * 12;
                card.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-5px) scale(1.02)`;
                // Update mouse-x/y for radial glow
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
            card.addEventListener('mouseleave', () => {
                card.style.transition = 'transform 0.6s cubic-bezier(0.25,1,0.5,1), border-color 0.5s, box-shadow 0.5s';
                card.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateY(0) scale(1)';
            });
        });
    }

    /* ==========================================================================
       NAVBAR SCROLL SHRINK
       ========================================================================== */
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) navbar?.classList.add('scrolled');
        else navbar?.classList.remove('scrolled');
    });

    /* ==========================================================================
       Mobile Menu Toggle Navigation
       ========================================================================== */
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('open');
            navMenu.classList.toggle('open');
        });

        // Close menu on link clicks
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('open');
                navMenu.classList.remove('open');
            });
        });
    }

    // Scroll active link highlight indicator
    const sections = document.querySelectorAll('section');
    window.addEventListener('scroll', () => {
        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.offsetHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });

    /* ==========================================================================
       Core Loop: requestAnimationFrame Physics Cycle
       ========================================================================== */
    let lastTime = 0;
    
    function animate(timestamp) {
        // Frame rate safety
        if (!lastTime) lastTime = timestamp;
        
        // 1. Clear background canvas
        if (bgCtx && bgCanvas) {
            bgCtx.shadowBlur = 0;
            bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
            
            // 2. Custom Cursor trail physics LERP (mobile excluded)
            if (!isMobile && cursorDot && cursorRing) {
                ringPos.x += (mouse.targetX - ringPos.x) * 0.15;
                ringPos.y += (mouse.targetY - ringPos.y) * 0.15;
                
                cursorDot.style.left = `${mouse.targetX}px`;
                cursorDot.style.top = `${mouse.targetY}px`;
                
                cursorRing.style.left = `${ringPos.x}px`;
                cursorRing.style.top = `${ringPos.y}px`;

                // Smoothly slide mouse variable
                mouse.x += (mouse.targetX - mouse.x) * 0.1;
                mouse.y += (mouse.targetY - mouse.y) * 0.1;

                // Spawn trails on movement
                if (mouse.moving) {
                    spawnCursorParticles(mouse.targetX, mouse.targetY, 1);
                }
            }

            // 3a. Draw Planets (behind stars)
            if (!prefersReducedMotion) {
                planets.forEach(p => { p.update(); p.draw(); });
            }

            // 3b. Update & Draw Stars
            stars.forEach(star => {
                star.update();
                star.draw();
            });

            // 3c. Shooting stars (desktop)
            if (!isMobile && !prefersReducedMotion) {
                shootingStars.forEach(s => { s.update(); s.draw(); });
            }

            // 4. Update & Draw Connections in Constellation (Desktop Only)
            if (!prefersReducedMotion && !isMobile) {
                bgCtx.lineWidth = 0.55;
                bgCtx.shadowBlur = 0;
                
                for (let i = 0; i < stars.length; i++) {
                    for (let j = i + 1; j < stars.length; j++) {
                        let dx = stars[i].x - stars[j].x;
                        let dy = stars[i].y - stars[j].y;
                        let dist = Math.hypot(dx, dy);

                        if (dist < connectionRadius) {
                            // Check distance to mouse to connect stars near cursor
                            let dxMouse = mouse.x - (stars[i].x + stars[j].x) / 2;
                            let dyMouse = mouse.y - (stars[i].y + stars[j].y) / 2;
                            let mouseDist = Math.hypot(dxMouse, dyMouse);

                            // Proximity threshold to light up lines
                            if (mouseDist < attractionRadius) {
                                let lineAlpha = (1 - dist / connectionRadius) * (1 - mouseDist / attractionRadius) * 0.35;
                                bgCtx.strokeStyle = `rgba(79, 216, 255, ${lineAlpha})`;
                                bgCtx.beginPath();
                                bgCtx.moveTo(stars[i].x, stars[i].y);
                                bgCtx.lineTo(stars[j].x, stars[j].y);
                                bgCtx.stroke();
                            }
                        }
                    }
                }
            }

            // 5. Render cursor particle decays
            cursorParticles = cursorParticles.filter(p => p.alpha > 0.02);
            cursorParticles.forEach(p => {
                p.update();
                p.draw();
            });
        }

        // 6. Draw Hologram sphere (runs independently of background canvas)
        if (holoCanvas && holoCtx && !prefersReducedMotion) {
            draw3DSphere();
        }

        // 7. Update & Draw Waterfall Divider Canvas
        if (wfCanvas && wfCtx) {
            wfCtx.clearRect(0, 0, wfCanvas.width, wfCanvas.height);
            wfParticles.forEach(p => {
                p.update(wfCanvas.width, wfCanvas.height);
                p.draw(wfCtx);
            });
        }

        lastTime = timestamp;
        requestAnimationFrame(animate);
    }

    // Start loop
    if (!prefersReducedMotion) {
        requestAnimationFrame(animate);
    } else {
        // Reduced Motion static drawings
        if (holoCanvas && holoCtx) draw3DSphere();
    }
});
