// Classe extraída da mecânica de colisão dinâmica com formas implícitas
class DynamicParticle {
    constructor(w, h) {
        this.x = w / 2;
        this.y = h / 2;
        this.vx = 4;
        this.vy = 3.5;
        this.r = 6;
    }

    update(shape, w, h) {
        this.x += this.vx;
        this.y += this.vy;

        // Detecção de colisão: Borda do canvas
        if (this.x < this.r || this.x > w - this.r) this.vx *= -1;
        if (this.y < this.r || this.y > h - this.r) this.vy *= -1;

        // Detecção de Colisão Dinâmica: Função implícita (shape <= 0 significa dentro)
        if (shape.evaluate(this.x, this.y) <= 0) {
            
            // Calcula o Gradiente para encontrar o vetor normal da superfície na hora da colisão
            const eps = 0.01;
            const v0 = shape.evaluate(this.x, this.y);
            const vx = shape.evaluate(this.x + eps, this.y);
            const vy = shape.evaluate(this.x, this.y + eps);
            
            let nx = vx - v0;
            let ny = vy - v0;
            
            // Normalizando o vetor
            let len = Math.sqrt(nx * nx + ny * ny);
            if (len > 0) { nx /= len; ny /= len; }
            
            // Fórmula clássica de Reflexão Vetorial: V_novo = V - 2(V·N)N
            const dot = this.vx * nx + this.vy * ny;
            this.vx = this.vx - 2 * dot * nx;
            this.vy = this.vy - 2 * dot * ny;

            // Resolve o contato empurrando a partícula para fora do objeto para não ficar "presa"
            this.x += nx * 2;
            this.y += ny * 2;
        }
    }

    draw(ctx) {
        ctx.fillStyle = "#F1C40F"; // Amarelo
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#000";
        ctx.stroke();
    }
}

window.addEventListener('load', function () {
    const canvas = document.getElementById('mainCanvas');
    const ctx = canvas.getContext('2d');
    const resRange = document.getElementById('resRange');
    const resValue = document.getElementById('resValue');

    const CANVAS_W = canvas.width;
    const CANVAS_H = canvas.height;

    function remap(n, start1, stop1, start2, stop2) {
        return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
    }

    function depthFromSlider(v) {
        const d = Math.floor(remap(v, 5, 150, 2, 9));
        if (d < 2) return 2;
        if (d > 9) return 9;
        return d;
    }

    function uniformResolutionFromDepth(d) {
        return 1 << d;
    }

    function makeDefaultCircle() {
        return new Circle(CANVAS_W, CANVAS_H, 0.3, 0.4, 0.21);
    }

    function makeDefaultParabola() {
        return new Parabola(CANVAS_W, CANVAS_H, 1.0, 0.0, 0.0);
    }

    // Estado unificado
    let app = {
        shape: makeDefaultCircle(),
        mode: 'adaptive',
        rayActive: false,
        particleActive: false, // Nova flag
        res: parseInt(resRange.value, 10),
        sphere: new SphereRefiner(),
        rayTracer: new RayTracer(),
        particle: new DynamicParticle(CANVAS_W, CANVAS_H),

        uniformCache: { imageData: null, resolution: null, shape: null },
        adaptiveAnimator: null,
        adaptiveDepth: null,
        adaptiveShape: null,
    };

    function invalidate2D() {
        app.uniformCache.imageData = null;
        app.uniformCache.resolution = null;
        app.uniformCache.shape = null;
        app.adaptiveAnimator = null;
        app.adaptiveDepth = null;
        app.adaptiveShape = null;
    }

    function run(nowMs) {
        resValue.textContent = app.res;

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        if (app.mode === 'sphere') {
            app.sphere.draw(ctx, CANVAS_W, CANVAS_H, CANVAS_W * 0.39);
            requestAnimationFrame(run);
            return;
        }

        const depth = depthFromSlider(app.res);

        if (app.mode === 'uniform') {
            const resolution = uniformResolutionFromDepth(depth);
            if (!app.uniformCache.imageData || app.uniformCache.resolution !== resolution || app.uniformCache.shape !== app.shape) {
                app.uniformCache.imageData = buildUniformImageData(app.shape, resolution, CANVAS_W, CANVAS_H);
                app.uniformCache.resolution = resolution;
                app.uniformCache.shape = app.shape;
            }
            ctx.putImageData(app.uniformCache.imageData, 0, 0);
        } else {
            if (!app.adaptiveAnimator || app.adaptiveDepth !== depth || app.adaptiveShape !== app.shape) {
                app.adaptiveAnimator = new AdaptiveQuadtreeAnimator(app.shape, depth, CANVAS_W, CANVAS_H, 40);
                app.adaptiveDepth = depth;
                app.adaptiveShape = app.shape;
            }
            app.adaptiveAnimator.step(nowMs || performance.now());
            app.adaptiveAnimator.draw(ctx);
        }

        // Raytracer (Com integração na Quadtree)
        if (app.rayActive) {
            const quadtreeToUse = (app.mode === 'adaptive' && app.adaptiveAnimator) ? app.adaptiveAnimator.quadtree : null;
            app.rayTracer.castRays(ctx, app.shape, quadtreeToUse, CANVAS_W, CANVAS_H);
        }

        // Simulação Dinâmica da Partícula
        if (app.particleActive) {
            app.particle.update(app.shape, CANVAS_W, CANVAS_H);
            app.particle.draw(ctx);
        }

        requestAnimationFrame(run);
    }

    // Interações
    canvas.addEventListener('mousemove', function (e) {
        const b = canvas.getBoundingClientRect();
        app.rayTracer.origin.x = e.clientX - b.left;
        app.rayTracer.origin.y = e.clientY - b.top;
    });

    function bind(id, fn) {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
    }

    bind('btnCircle', function () {
        app.shape = makeDefaultCircle();
        invalidate2D();
    });
    bind('btnParabola', function () {
        app.shape = makeDefaultParabola();
        invalidate2D();
    });
    bind('btnUniform', function () {
        app.mode = 'uniform';
        invalidate2D();
    });
    bind('btnAdaptive', function () {
        app.mode = 'adaptive';
        invalidate2D();
    });
    bind('btnSphere', function () { app.mode = 'sphere'; });
    bind('btnRefine', function () { app.sphere.refine(); });
    bind('btnRayTracer', function () { app.rayActive = !app.rayActive; });
    
    // Novo evento para o Botão da Partícula
    bind('btnParticle', function () { app.particleActive = !app.particleActive; });
    
    resRange.oninput = function (e) {
        app.res = parseInt(e.target.value, 10);
        invalidate2D();
    };

    invalidate2D();
    requestAnimationFrame(run);
});