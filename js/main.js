// Garantia de utilitários globais
window.Math.map = (n, start1, stop1, start2, stop2) => ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;

window.addEventListener('load', () => {
    const canvas = document.getElementById('mainCanvas');
    const ctx = canvas.getContext('2d');
    const resRange = document.getElementById('resRange');
    const resValue = document.getElementById('resValue');

    // Estado unificado
    let app = {
        shape: new Circle(250, 250, 120),
        mode: 'adaptive',
        rayActive: true,
        res: 50,
        sphere: new SphereRefiner(),
        rayTracer: new RayTracer()
    };

    function run() {
        // Limpeza com efeito de rastro (Motion Blur)
        ctx.fillStyle = "rgba(10, 10, 20, 0.2)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        resValue.textContent = app.res;

        if (app.mode === 'sphere') {
            app.sphere.draw(ctx, 500, 500, 200);
        } else {
            if (app.mode === 'uniform') {
                drawUniformGrid(ctx, app.shape, Math.floor(app.res/2), 500, 500);
            } else {
                const depth = Math.floor(Math.map(app.res, 5, 150, 2, 7));
                drawAdaptiveGrid(ctx, app.shape, depth, 500, 500);
            }

            if (app.rayActive) {
                app.rayTracer.castRays(ctx, app.shape);
            }
        }
        requestAnimationFrame(run);
    }

    // Handlers Interativos
    canvas.addEventListener('mousemove', (e) => {
        const b = canvas.getBoundingClientRect();
        app.rayTracer.origin.x = e.clientX - b.left;
        app.rayTracer.origin.y = e.clientY - b.top;
    });

    // Mapeamento de Botões (Garantido)
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
    };

    bind('btnCircle', () => app.shape = new Circle(250, 250, 120));
    bind('btnParabola', () => app.shape = new Parabola());
    bind('btnUniform', () => app.mode = 'uniform');
    bind('btnAdaptive', () => app.mode = 'adaptive');
    bind('btnSphere', () => app.mode = 'sphere');
    bind('btnRayTracer', () => app.rayActive = !app.rayActive);
    
    resRange.oninput = (e) => app.res = parseInt(e.target.value);

    // Início do ciclo de vida
    run();
});