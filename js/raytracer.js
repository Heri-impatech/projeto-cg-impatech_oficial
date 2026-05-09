class RayTracer {
    constructor() {
        this.origin = { x: 50, y: 50 };
        this.numRays = 180; 
    }
    castRays(ctx, shape) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter"; // Brilho aditivo
        const step = (Math.PI * 2) / this.numRays;

        for (let i = 0; i < this.numRays; i++) {
            const angle = i * step;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);

            ctx.beginPath();
            ctx.lineWidth = 1.5;
            // Cor neon dinâmica baseada no ângulo
            ctx.strokeStyle = `hsla(${i * (360/this.numRays)}, 100%, 60%, 0.15)`;
            ctx.moveTo(this.origin.x, this.origin.y);

            for (let d = 0; d < 800; d += 3) {
                const px = this.origin.x + dx * d;
                const py = this.origin.y + dy * d;

                if (shape.evaluate(px, py) <= 0) {
                    ctx.lineTo(px, py);
                    // Ponto de impacto brilhante
                    ctx.stroke();
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(px-1, py-1, 2, 2);
                    break;
                }
                if (px < 0 || px > 500 || py < 0 || py > 500) {
                    ctx.lineTo(px, py);
                    ctx.stroke();
                    break;
                }
            }
        }
        ctx.restore();
    }
}