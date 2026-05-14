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

        // Verifica o estado atual da lanterna
        const isLightInside = app.scene.evaluate(origin.x, origin.y) <= 0;
        let inShadow = false;

        if (dist > 1) {
            const dirX = dx / dist;
            const dirY = dy / dist;
            
            // Lança o raio passando o estado (isLightInside) para saber como testar as paredes
            const hit = rayTracer.trace(origin.x, origin.y, dirX, dirY, app.quadtree.root, app.scene, isLightInside);
            
            if (hit && hit.t < dist - this.radius) {
                inShadow = true;
            }
        }

        if (!inShadow) {
            // Decaimento visual para a opacidade da partícula (curva quadrática/exponencial)
            const normalizedDist = dist / rayTracer.lightRange;
            const intensity = Math.pow(1 - normalizedDist, 2.5); 
            
            const r = isLightInside ? 74 : 255;
            const g = isLightInside ? 144 : 245;
            const b = isLightInside ? 217 : 220;

            // Halo suave da partícula
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0.05, intensity)})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Núcleo sólido brilhante
            ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

window.addEventListener('load', function () {
    const canvas = document.getElementById('mainCanvas');
    const ctx = canvas.getContext('2d');
    const resRange = document.getElementById('resRange');
    const inputFunc = document.getElementById('inputFunc');

    let app = {
        scene: new Scene(),
        mode: 'raytracer',
        quadtree: null,
        particles: [],
        res: 7,
        rayTracer: new RayTracer()
    };

    function rebuild() {
        app.quadtree = new Quadtree(0, canvas.width, 0, canvas.height, app.scene);
        app.quadtree.build(parseInt(app.res));
        app.quadtree.prune();
    }

    function loop() {
        app.rayTracer.lightRange = parseInt(document.getElementById('lightRange').value);

        if (app.mode === 'raytracer') {
            app.rayTracer.renderLight(ctx, app.scene, app.quadtree, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const drawNode = (n) => {
                if (!n) return;
                ctx.strokeStyle = n.status === 2 ? "#e74c3c" : (n.status === 1 ? "#4a90d9" : "#222");
                ctx.strokeRect(n.xMin, n.yMin, n.xMax - n.xMin, n.yMax - n.yMin);
                n.children.forEach(drawNode);
            };
            drawNode(app.quadtree.root);
        }

        app.particles.forEach(p => { 
            p.update(app.scene, canvas.width, canvas.height); 
            p.draw(ctx, app); 
        });

        requestAnimationFrame(loop);
    }

    canvas.onmousemove = (e) => {
        const b = canvas.getBoundingClientRect();
        app.rayTracer.origin.x = e.clientX - b.left;
        app.rayTracer.origin.y = e.clientY - b.top;
    };

    canvas.onmousedown = (e) => {
        const b = canvas.getBoundingClientRect();
        app.scene.add(new Circle(canvas.width, canvas.height, (e.clientX-b.left)/canvas.width, (canvas.height-(e.clientY-b.top))/canvas.height, 0.08));
        rebuild();
    };

    document.getElementById('btnAddFunc').onclick = () => {
        app.scene.add(new CustomImplicit(canvas.width, canvas.height, inputFunc.value));
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

    document.getElementById('btnRayTracer').onclick = () => app.mode = 'raytracer';
    document.getElementById('btnAdaptive').onclick = () => app.mode = 'adaptive';
    resRange.oninput = (e) => { app.res = e.target.value; rebuild(); };

    rebuild();
    loop();
});