function clamp(value, minValue, maxValue) {
    return Math.max(minValue, Math.min(maxValue, value));
}

class CustomImplicit {
    constructor(canvasW, canvasH, exprStr) {
        this.canvasW = canvasW;
        this.canvasH = canvasH;
        this.scaleX = 4.0 / canvasW; // Mapeia para domínio -2 a 2
        this.scaleY = 4.0 / canvasH;
        
        try {
            // Cria uma função otimizada a partir da string
            this.func = new Function('x', 'y', `return ${exprStr};`);
        } catch (e) {
            alert("Erro na fórmula: " + e.message);
            this.func = (x, y) => 1; // Função vazia por defeito
        }
    }

    pxToDomainX(px) { return -2.0 + px * this.scaleX; }
    pxToDomainY(py) { return -2.0 + (this.canvasH - py) * this.scaleY; }

    evaluate(px, py) {
        return this.func(this.pxToDomainX(px), this.pxToDomainY(py));
    }

    classifyCell(xMin, xMax, yMin, yMax) {
        // Amostragem nos 4 cantos e centro para classificação rápida
        const pts = [[xMin, yMin], [xMax, yMin], [xMax, yMax], [xMin, yMax], [(xMin+xMax)/2, (yMin+yMax)/2]];
        let inside = 0;
        pts.forEach(p => { if (this.evaluate(p[0], p[1]) <= 0) inside++; });
        
        if (inside === 5) return 1; // Tudo dentro
        if (inside === 0) return 0; // Tudo fora
        return 2; // Intersecção
    }
}

class Circle {
    constructor(canvasW, canvasH, cx, cy, r) {
        this.cx = cx; this.cy = cy; this.r = r; this.rSq = r * r;
        this.scaleX = 1.0 / canvasW; this.scaleY = 1.0 / canvasH;
        this.canvasH = canvasH;
    }
    pxToDomainX(px) { return px * this.scaleX; }
    pxToDomainY(py) { return (this.canvasH - py) * this.scaleY; }
    evaluate(px, py) {
        const dx = this.pxToDomainX(px) - this.cx;
        const dy = this.pxToDomainY(py) - this.cy;
        return dx * dx + dy * dy - this.rSq;
    }
    classifyCell(xMinPx, xMaxPx, yMinPx, yMaxPx) {
        const xMin = this.pxToDomainX(xMinPx); const xMax = this.pxToDomainX(xMaxPx);
        const yMax = this.pxToDomainY(yMinPx); const yMin = this.pxToDomainY(yMaxPx);
        const closestX = clamp(this.cx, xMin, xMax);
        const closestY = clamp(this.cy, yMin, yMax);
        const dx = closestX - this.cx; const dy = closestY - this.cy;
        if (dx * dx + dy * dy > this.rSq) return 0;
        const corners = [[xMin, yMin], [xMax, yMin], [xMax, yMax], [xMin, yMax]];
        for (let c of corners) if ((c[0]-this.cx)**2 + (c[1]-this.cy)**2 >= this.rSq) return 2;
        return 1;
    }
}

class Scene {
    constructor() { this.objects = []; }
    add(obj) { this.objects.push(obj); }
    clear() { this.objects = []; }
    evaluate(px, py) {
        let minVal = Infinity;
        for (let obj of this.objects) minVal = Math.min(minVal, obj.evaluate(px, py));
        return minVal;
    }
    classifyCell(xMin, xMax, yMin, yMax) {
        let intersect = false; let inside = false;
        for (let obj of this.objects) {
            const res = obj.classifyCell(xMin, xMax, yMin, yMax);
            if (res === 2) intersect = true;
            if (res === 1) inside = true;
        }
        return intersect ? 2 : (inside ? 1 : 0);
    }
}