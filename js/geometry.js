class Circle {
    constructor(cx, cy, r) {
        this.cx = cx;
        this.cy = cy;
        this.r = r;
    }
    // Função de Distância Sinalizada (SDF) para precisão absoluta
    evaluate(x, y) {
        const dx = x - this.cx;
        const dy = y - this.cy;
        return Math.sqrt(dx * dx + dy * dy) - this.r;
    }
    classifyCell(xMin, xMax, yMin, yMax) {
        const closestX = Math.max(xMin, Math.min(this.cx, xMax));
        const closestY = Math.max(yMin, Math.min(this.cy, yMax));
        const dist = this.evaluate(closestX, closestY);
        if (dist > 0) return 0;
        const corners = [[xMin, yMin], [xMax, yMin], [xMin, yMax], [xMax, yMax]];
        return corners.every(c => this.evaluate(c[0], c[1]) <= 0) ? 1 : 2;
    }
}

class Parabola {
    constructor() {
        this.a = 0.008;
        this.h = 250; 
        this.k = 300; 
    }
    evaluate(x, y) {
        return this.a * Math.pow(x - this.h, 2) + this.k - y;
    }
    classifyCell(xMin, xMax, yMin, yMax) {
        const corners = [[xMin, yMin], [xMax, yMin], [xMin, yMax], [xMax, yMax]];
        const res = corners.map(c => this.evaluate(c[0], c[1]) <= 0);
        if (res.every(r => r)) return 1;
        if (res.every(r => !r)) return 0;
        return 2;
    }
}