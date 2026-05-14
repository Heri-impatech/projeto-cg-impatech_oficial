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

    // Preferimos uma profundidade que respeite a resolução máxima do canvas.
    function depthFromSlider(v) {
        const d = Math.floor(remap(v, 5, 150, 2, 9));
        if (d < 2) return 2;
        if (d > 9) return 9;
        return d;
    }

    function uniformResolutionFromDepth(d) {
        // Equivalência do relatório: n = 2^d
        return 1 << d;
    }

    function makeDefaultCircle() {
        // Relatório: centro (0.3, 0.4), raio 0.21 no domínio [0,1]^2
        return new Circle(CANVAS_W, CANVAS_H, 0.3, 0.4, 0.21);
    }

    function makeDefaultParabola() {
        // Relatório: região y >= x^2 no domínio [-2,2]^2
        return new Parabola(CANVAS_W, CANVAS_H, 1.0, 0.0, 0.0);
    }

    // Estado unificado
    let app = {
        shape: makeDefaultCircle(),
        mode: 'adaptive',
        rayActive: false,
        res: parseInt(resRange.value, 10),
        sphere: new SphereRefiner(),
        rayTracer: new RayTracer(),

        // Cache/estado de render 2D
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

        // Fundo sempre branco no canvas (paleta de 3 cores)
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

        if (app.rayActive) {
            app.rayTracer.castRays(ctx, app.shape, CANVAS_W, CANVAS_H);
        }

        requestAnimationFrame(run);
    }

    // Handlers Interativos
    canvas.addEventListener('mousemove', function (e) {
        const b = canvas.getBoundingClientRect();
        app.rayTracer.origin.x = e.clientX - b.left;
        app.rayTracer.origin.y = e.clientY - b.top;
    });

    // Mapeamento de Botões (Garantido)
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
    
    resRange.oninput = function (e) {
        app.res = parseInt(e.target.value, 10);
        invalidate2D();
    };

    // Início do ciclo de vida
    invalidate2D();
    requestAnimationFrame(run);
});