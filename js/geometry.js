function clamp(value, minValue, maxValue) {
    if (value < minValue) return minValue;
    if (value > maxValue) return maxValue;
    return value;
}

/**
 * Disco no domínio [0,1]x[0,1], exatamente como no relatório/Python.
 * Observação: o canvas tem Y para baixo; aqui convertemos para um domínio
 * com Y para cima (como nos PDFs).
 */
class Circle {
    constructor(canvasW, canvasH, cx, cy, r) {
        this.canvasW = canvasW;
        this.canvasH = canvasH;

        this.domainXMin = 0.0;
        this.domainXMax = 1.0;
        this.domainYMin = 0.0;
        this.domainYMax = 1.0;

        this.cx = cx;
        this.cy = cy;
        this.r = r;
        this.rSq = r * r;

        this.scaleX = (this.domainXMax - this.domainXMin) / this.canvasW;
        this.scaleY = (this.domainYMax - this.domainYMin) / this.canvasH;
    }

    pxToDomainX(px) {
        return this.domainXMin + px * this.scaleX;
    }

    pxToDomainY(py) {
        // Inverte Y: topo do canvas -> yMax do domínio
        return this.domainYMin + (this.canvasH - py) * this.scaleY;
    }

    // Implícita do círculo: (x-cx)^2 + (y-cy)^2 - r^2
    evaluate(px, py) {
        const x = this.pxToDomainX(px);
        const y = this.pxToDomainY(py);
        const dx = x - this.cx;
        const dy = y - this.cy;
        return dx * dx + dy * dy - this.rSq;
    }

    // 0=fora, 1=dentro, 2=interseção
    classifyCell(xMinPx, xMaxPx, yMinPx, yMaxPx) {
        const xMin = this.pxToDomainX(xMinPx);
        const xMax = this.pxToDomainX(xMaxPx);
        const yMax = this.pxToDomainY(yMinPx);
        const yMin = this.pxToDomainY(yMaxPx);

        const closestX = clamp(this.cx, xMin, xMax);
        const closestY = clamp(this.cy, yMin, yMax);
        const dx = closestX - this.cx;
        const dy = closestY - this.cy;
        const distSq = dx * dx + dy * dy;

        if (distSq > this.rSq) return 0;

        // INTERSECT: se algum canto está fora, é interseção
        let d;
        d = (xMin - this.cx) * (xMin - this.cx) + (yMin - this.cy) * (yMin - this.cy);
        if (d >= this.rSq) return 2;
        d = (xMax - this.cx) * (xMax - this.cx) + (yMin - this.cy) * (yMin - this.cy);
        if (d >= this.rSq) return 2;
        d = (xMax - this.cx) * (xMax - this.cx) + (yMax - this.cy) * (yMax - this.cy);
        if (d >= this.rSq) return 2;
        d = (xMin - this.cx) * (xMin - this.cx) + (yMax - this.cy) * (yMax - this.cy);
        if (d >= this.rSq) return 2;

        return 1;
    }
}

/**
 * Parábola no domínio [-2,2]x[-2,2] com equação y = a x^2 + b x + c,
 * igual ao relatório/Python.
 */
class Parabola {
    constructor(canvasW, canvasH, a, b, c) {
        this.canvasW = canvasW;
        this.canvasH = canvasH;

        this.domainXMin = -2.0;
        this.domainXMax = 2.0;
        this.domainYMin = -2.0;
        this.domainYMax = 2.0;

        this.a = a;
        this.b = b;
        this.c = c;

        this.scaleX = (this.domainXMax - this.domainXMin) / this.canvasW;
        this.scaleY = (this.domainYMax - this.domainYMin) / this.canvasH;
    }

    pxToDomainX(px) {
        return this.domainXMin + px * this.scaleX;
    }

    pxToDomainY(py) {
        return this.domainYMin + (this.canvasH - py) * this.scaleY;
    }

    parabolaY(x) {
        return this.a * x * x + this.b * x + this.c;
    }

    evaluate(px, py) {
        const x = this.pxToDomainX(px);
        const y = this.pxToDomainY(py);
        return this.parabolaY(x) - y;
    }

    hasRootInRangeForY(yTarget, xMin, xMax) {
        const A = this.a;
        const B = this.b;
        const C = this.c - yTarget;

        if (A === 0) {
            if (B === 0) return false;
            const x = -C / B;
            return xMin <= x && x <= xMax;
        }

        const disc = B * B - 4 * A * C;
        if (disc < 0) return false;

        if (disc === 0) {
            const x0 = -B / (2 * A);
            return xMin <= x0 && x0 <= xMax;
        }

        const sqrtD = Math.sqrt(disc);
        const denom = 2 * A;
        const x1 = (-B - sqrtD) / denom;
        const x2 = (-B + sqrtD) / denom;

        if (xMin <= x1 && x1 <= xMax) return true;
        if (xMin <= x2 && x2 <= xMax) return true;
        return false;
    }

    // 0=fora, 1=dentro, 2=interseção
    classifyCell(xMinPx, xMaxPx, yMinPx, yMaxPx) {
        const xMin = this.pxToDomainX(xMinPx);
        const xMax = this.pxToDomainX(xMaxPx);
        const yMax = this.pxToDomainY(yMinPx);
        const yMin = this.pxToDomainY(yMaxPx);

        const evalXMin = this.parabolaY(xMin);
        const evalXMax = this.parabolaY(xMax);

        const crossesLeft = yMin <= evalXMin && evalXMin <= yMax;
        const crossesRight = yMin <= evalXMax && evalXMax <= yMax;

        const crossesBottom = this.hasRootInRangeForY(yMin, xMin, xMax);
        const crossesTop = this.hasRootInRangeForY(yMax, xMin, xMax);

        if (crossesLeft || crossesRight || crossesBottom || crossesTop) return 2;

        // Sem cruzamentos: classifica pelos cantos (mesma lógica do Python)
        let allInside = true;

        if (!(this.parabolaY(xMin) < yMin)) allInside = false;
        if (!(this.parabolaY(xMax) < yMin)) allInside = false;
        if (!(this.parabolaY(xMax) < yMax)) allInside = false;
        if (!(this.parabolaY(xMin) < yMax)) allInside = false;

        return allInside ? 1 : 0;
    }
}