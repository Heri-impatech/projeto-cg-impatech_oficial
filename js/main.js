
class Particle {
    constructor(w, h) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.radius = 4;
    }

    update(scene, w, h) {
        let nextX = this.x + this.vx;
        let nextY = this.y + this.vy;

        if (nextX < this.radius || nextX > w - this.radius) this.vx *= -1;
        if (nextY < this.radius || nextY > h - this.radius) this.vy *= -1;

        if (scene.evaluate(nextX, nextY) <= 0) {
            const eps = 1.0;
            const nx = scene.evaluate(nextX + eps, nextY) - scene.evaluate(nextX - eps, nextY);
            const ny = scene.evaluate(nextX, nextY + eps) - scene.evaluate(nextX, nextY - eps);
            const len = Math.sqrt(nx * nx + ny * ny) || 1;
            const dot = (this.vx * nx + this.vy * ny) / len;
            this.vx -= 2 * dot * (nx / len);
            this.vy -= 2 * dot * (ny / len);
        } else {
            this.x = nextX;
            this.y = nextY;
        }
    }

    draw(ctx, app) {
        const rayTracer = app.rayTracer;
        const origin = rayTracer.origin;

        const dx = this.x - origin.x;
        const dy = this.y - origin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > rayTracer.lightRange) return;

        const isLightInside = app.scene.evaluate(origin.x, origin.y) <= 0;
        let inShadow = false;

        if (dist > 1) {
            const dirX = dx / dist;
            const dirY = dy / dist;
            const hit = rayTracer.trace(
                origin.x, origin.y, dirX, dirY,
                app.quadtree.root, app.scene, isLightInside
            );
            if (hit && hit.t < dist - this.radius) inShadow = true;
        }

        if (!inShadow) {
            const normalizedDist = dist / rayTracer.lightRange;
            const intensity = Math.pow(1 - normalizedDist, 2.5);

            const r = isLightInside ? 74  : 255;
            const g = isLightInside ? 144 : 245;
            const b = isLightInside ? 217 : 220;

            ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0.05, intensity)})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255,255,255,${intensity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

window.addEventListener('load', function () {
    const canvas   = document.getElementById('mainCanvas');
    const ctx      = canvas.getContext('2d');
    const resRange = document.getElementById('resRange');
    const inputFunc = document.getElementById('inputFunc');

    // Envolve o canvas num wrapper para facilitar o layout CSS
    const wrap = document.createElement('div');
    wrap.id = 'canvasWrap';
    canvas.parentNode.insertBefore(wrap, canvas);
    wrap.appendChild(canvas);

    // Ajusta o canvas ao espaço disponível
    function resizeCanvas() {
        const size = Math.min(wrap.clientWidth, wrap.clientHeight) - 40;
        canvas.width  = size;
        canvas.height = size;
        rebuild();
    }
    window.addEventListener('resize', resizeCanvas);

    let app = {
        scene:     new Scene(),
        mode:      'raytracer',
        quadtree:  null,
        animator:  null,   // AdaptiveQuadtreeAnimator — usado no modo 'adaptive'
        particles: [],
        res:       7,
        rayTracer: new RayTracer()
    };

    // ── REBUILD ───────────────────────────────────────────────────
    // Única fonte de verdade: recria a quadtree E reseta o animator.
    function rebuild() {
        app.quadtree = new Quadtree(0, canvas.width, 0, canvas.height, app.scene);
        app.quadtree.build(parseInt(app.res));
        app.quadtree.prune();

        // Reseta o animator com a nova quadtree/cena
        if (app.animator) {
            app.animator.reset(app.scene, parseInt(app.res));
        } else {
            app.animator = new AdaptiveQuadtreeAnimator(
                app.scene, parseInt(app.res),
                canvas.width, canvas.height,
                30  // ms por passo de revelação
            );
        }
    }

    // ── LOOP PRINCIPAL ────────────────────────────────────────────
    function loop(nowMs) {
        app.rayTracer.lightRange = parseInt(document.getElementById('lightRange').value);
        app.rayTracer.numRays    = parseInt(document.getElementById('raysRange').value);

        if (app.mode === 'raytracer') {
            app.rayTracer.renderLight(ctx, app.scene, app.quadtree, canvas.width, canvas.height);

        } else {
            // Modo Adaptive: usa o AdaptiveQuadtreeAnimator com ImageData
            // (consistente com o resto do sistema — sem strokeRect solto)
            app.animator.step(nowMs);
            app.animator.draw(ctx);

            // Sobrepõe contorno dos nós de interseção para debug visual
            ctx.save();
            const drawBorders = (n) => {
                if (!n) return;
                if (n.status === 2) {
                    ctx.strokeStyle = 'rgba(231,76,60,0.5)';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(n.xMin, n.yMin, n.xMax - n.xMin, n.yMax - n.yMin);
                }
                n.children.forEach(drawBorders);
            };
            drawBorders(app.quadtree.root);
            ctx.restore();
        }

        app.particles.forEach(p => {
            p.update(app.scene, canvas.width, canvas.height);
            p.draw(ctx, app);
        });

        requestAnimationFrame(loop);
    }

    // ── EVENTOS DO CANVAS ─────────────────────────────────────────
    canvas.onmousemove = (e) => {
        const b = canvas.getBoundingClientRect();
        app.rayTracer.origin.x = e.clientX - b.left;
        app.rayTracer.origin.y = e.clientY - b.top;
    };

    canvas.onmousedown = (e) => {
        const b = canvas.getBoundingClientRect();
        const px = e.clientX - b.left;
        const py = e.clientY - b.top;
        app.scene.add(new Circle(
            canvas.width, canvas.height,
            px / canvas.width,
            (canvas.height - py) / canvas.height,
            0.08
        ));
        rebuild();
    };

    // ── CONTROLES ─────────────────────────────────────────────────
    document.getElementById('btnAddFunc').onclick = () => {
        const expr = inputFunc.value.trim();
        if (!expr) return;
        app.scene.add(new CustomImplicit(canvas.width, canvas.height, expr));
        rebuild();
    };

    // Parabola: atalho que preenche uma fórmula de parábola e adiciona
    document.getElementById('btnParabola').onclick = () => {
        inputFunc.value = 'y - x*x';
        app.scene.add(new CustomImplicit(canvas.width, canvas.height, 'y - x*x'));
        rebuild();
    };

    document.getElementById('btnParticles').onclick = () => {
        app.particles.push(new Particle(canvas.width, canvas.height));
    };

    document.getElementById('btnClear').onclick = () => {
        app.scene.clear();
        app.particles = [];
        rebuild();
    };

    // Botões de modo — toggle visual da classe .active
    const btnRay      = document.getElementById('btnRayTracer');
    const btnAdaptive = document.getElementById('btnAdaptive');

    btnRay.onclick = () => {
        app.mode = 'raytracer';
        btnRay.classList.add('active');
        btnAdaptive.classList.remove('active');
    };

    btnAdaptive.onclick = () => {
        app.mode = 'adaptive';
        btnAdaptive.classList.add('active');
        btnRay.classList.remove('active');
        // Reinicia a animação de revelação ao entrar no modo
        app.animator.reset(app.scene, parseInt(app.res));
    };

    // Sliders com exibição de valor ao vivo
    resRange.oninput = (e) => {
        app.res = e.target.value;
        document.getElementById('resVal').textContent = app.res;
        rebuild();
    };

    document.getElementById('lightRange').oninput = (e) => {
        document.getElementById('lightRangeVal').textContent = e.target.value + 'px';
    };

    document.getElementById('raysRange').oninput = (e) => {
        document.getElementById('raysVal').textContent = e.target.value;
    };

    // ── INIT ──────────────────────────────────────────────────────
    resizeCanvas();
    requestAnimationFrame(loop);
});