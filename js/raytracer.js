class RayTracer {
    constructor() {
        this.origin = { x: 50, y: 50 };
        this.numRays = 180;
    }
    castRays(ctx, shape, width = 512, height = 512) {
        // Restrição de paleta: apenas vermelho (interseção).
        const rayColor = "#E74C3C";
        const stepAngle = (Math.PI * 2) / this.numRays;
        const maxDist = Math.max(width, height) * 2;

        ctx.save();
        ctx.fillStyle = rayColor;

        for (let i = 0; i < this.numRays; i++) {
            const angle = i * stepAngle;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);

            for (let d = 0; d < maxDist; d += 2) {
                const px = this.origin.x + dx * d;
                const py = this.origin.y + dy * d;
                const ix = px | 0;
                const iy = py | 0;

                if (ix < 0 || ix >= width || iy < 0 || iy >= height) break;

                // Desenha um pixel do raio
                ctx.fillRect(ix, iy, 1, 1);

                // Para no primeiro impacto com a forma
                if (shape.evaluate(px, py) <= 0) {
                    ctx.fillRect(ix - 1, iy - 1, 3, 3);
                    break;
                }
            }
        }

        ctx.restore();
    }
}