/**
 * js/adaptive.js - Aesthetic Quadtree Subdivisions
 */
class QuadNode {
    constructor(x, y, size, depth, maxDepth) {
        this.x = x; this.y = y; this.size = size;
        this.depth = depth; this.maxDepth = maxDepth;
        this.status = null;
        this.children = [];
    }

    build(shape) {
        this.status = shape.classifyCell(this.x, this.x + this.size, this.y, this.y + this.size);
        if (this.status === 2 && this.depth < this.maxDepth) {
            const h = this.size / 2;
            for(let i=0; i<2; i++) {
                for(let j=0; j<2; j++) {
                    const child = new QuadNode(this.x + i*h, this.y + j*h, h, this.depth+1, this.maxDepth);
                    child.build(shape);
                    this.children.push(child);
                }
            }
        }
    }

    draw(ctx) {
        if (this.children.length > 0) {
            this.children.forEach(c => c.draw(ctx));
        } else {
            if (this.status === 1) { // Dentro
                ctx.fillStyle = `hsla(220, 80%, 50%, ${0.1 + this.depth * 0.05})`;
                ctx.fillRect(this.x, this.y, this.size, this.size);
            } else if (this.status === 2) { // Fronteira
                ctx.strokeStyle = `hsla(0, 100%, 60%, ${0.3 + this.depth * 0.1})`;
                ctx.lineWidth = 2 / (this.depth + 1);
                ctx.strokeRect(this.x, this.y, this.size, this.size);
                
                // Brilho na fronteira
                ctx.fillStyle = "rgba(255, 50, 50, 0.05)";
                ctx.fillRect(this.x, this.y, this.size, this.size);
            }
        }
    }
}

function drawAdaptiveGrid(ctx, shape, maxDepth, w, h) {
    const root = new QuadNode(0, 0, w, 0, maxDepth);
    root.build(shape);
    root.draw(ctx);
}