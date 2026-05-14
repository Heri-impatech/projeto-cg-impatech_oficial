/**
 * js/adaptive.js
 * Quadtree adaptativa:
 * - 0: fora (branco)
 * - 1: dentro (azul)
 * - 2: interseção / não-classificado (vermelho)
 */

const ADAPTIVE_COLORS = {
    0: [255, 255, 255, 255], // Branco
    1: [74, 144, 217, 255],  // Azul
    2: [231, 76, 60, 255],   // Vermelho
};

function adaptiveFillImageData(imageData, rgba) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
        d[i] = rgba[0];
        d[i + 1] = rgba[1];
        d[i + 2] = rgba[2];
        d[i + 3] = rgba[3];
    }
}

function adaptivePaintRect(imageData, x, y, size, rgba) {
    const width = imageData.width;
    const data = imageData.data;

    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(width, (x + size) | 0);
    const y1 = Math.min(imageData.height, (y + size) | 0);

    for (let py = y0; py < y1; py++) {
        let idx = (py * width + x0) * 4;
        for (let px = x0; px < x1; px++) {
            data[idx] = rgba[0];
            data[idx + 1] = rgba[1];
            data[idx + 2] = rgba[2];
            data[idx + 3] = rgba[3];
            idx += 4;
        }
    }
}

class Node {
    constructor(xMin, yMin, xMax, yMax, depth, status) {
        this.xMin = xMin;
        this.yMin = yMin;
        this.xMax = xMax;
        this.yMax = yMax;
        this.depth = depth;
        this.status = status;
        this.children = [];
    }
}

class Quadtree {
    constructor(xMin, xMax, yMin, yMax, shape) {
        this.boundsXMin = xMin;
        this.boundsXMax = xMax;
        this.boundsYMin = yMin;
        this.boundsYMax = yMax;
        this.shape = shape;
        this.root = null;
    }

    build(maxDepth) {
        const status = this.shape.classifyCell(this.boundsXMin, this.boundsXMax, this.boundsYMin, this.boundsYMax);
        this.root = new Node(this.boundsXMin, this.boundsYMin, this.boundsXMax, this.boundsYMax, 0, status);
        if (status === 2) {
            this._subdivide(this.root, maxDepth);
        }
    }

    _subdivide(node, maxDepth) {
        if (node.depth >= maxDepth) return;
        if (node.status !== 2) return;

        const halfX = (node.xMax - node.xMin) / 2;
        const halfY = (node.yMax - node.yMin) / 2;

        let cx; let cy; let childStatus; let child;

        cx = node.xMin + 0; cy = node.yMin + 0;
        childStatus = this.shape.classifyCell(cx, cx + halfX, cy, cy + halfY);
        child = new Node(cx, cy, cx + halfX, cy + halfY, node.depth + 1, childStatus);
        node.children.push(child);
        if (childStatus === 2) this._subdivide(child, maxDepth);

        cx = node.xMin + halfX; cy = node.yMin + 0;
        childStatus = this.shape.classifyCell(cx, cx + halfX, cy, cy + halfY);
        child = new Node(cx, cy, cx + halfX, cy + halfY, node.depth + 1, childStatus);
        node.children.push(child);
        if (childStatus === 2) this._subdivide(child, maxDepth);

        cx = node.xMin + halfX; cy = node.yMin + halfY;
        childStatus = this.shape.classifyCell(cx, cx + halfX, cy, cy + halfY);
        child = new Node(cx, cy, cx + halfX, cy + halfY, node.depth + 1, childStatus);
        node.children.push(child);
        if (childStatus === 2) this._subdivide(child, maxDepth);

        cx = node.xMin + 0; cy = node.yMin + halfY;
        childStatus = this.shape.classifyCell(cx, cx + halfX, cy, cy + halfY);
        child = new Node(cx, cy, cx + halfX, cy + halfY, node.depth + 1, childStatus);
        node.children.push(child);
        if (childStatus === 2) this._subdivide(child, maxDepth);
    }

    prune() {
        if (!this.root) return;
        this._prune(this.root);
    }

    _prune(node) {
        if (!node.children || node.children.length === 0) return;

        for (let i = 0; i < node.children.length; i++) {
            this._prune(node.children[i]);
        }

        let all0 = true;
        let all1 = true;
        for (let i = 0; i < node.children.length; i++) {
            const s = node.children[i].status;
            if (s !== 0) all0 = false;
            if (s !== 1) all1 = false;
        }

        if (all0 || all1) {
            node.children = [];
            node.status = all0 ? 0 : 1;
        }
    }
}

function generateRevealOrderFromQuadtreeRoot(root) {
    const order = [root];
    const stack = [root];

    while (stack.length) {
        const node = stack.pop();
        for (let i = node.children.length - 1; i >= 0; i--) {
            const child = node.children[i];
            stack.push(child);
            order.push(child);
        }
    }
    return order;
}

class AdaptiveQuadtreeAnimator {
    constructor(shape, maxDepth, width, height, stepIntervalMs = 40) {
        this.width = width;
        this.height = height;
        this.stepIntervalMs = stepIntervalMs;
        this.reset(shape, maxDepth);
    }

    reset(shape, maxDepth) {
        this.shape = shape;
        this.maxDepth = maxDepth;

        this.quadtree = new Quadtree(0, this.width, 0, this.height, shape);
        this.quadtree.build(maxDepth);
        
        // Ativando o processo de PODA (Pruning) para otimizar memória e acelerar travessia de raios
        this.quadtree.prune();

        this.root = this.quadtree.root;
        this.revealOrder = generateRevealOrderFromQuadtreeRoot(this.root);

        const data = new Uint8ClampedArray(this.width * this.height * 4);
        this.imageData = new ImageData(data, this.width, this.height);
        adaptiveFillImageData(this.imageData, ADAPTIVE_COLORS[0]);

        this.visibleCount = 0;
        this.lastStepAt = 0;
        this.revealTo(1); 
    }

    revealTo(count) {
        const target = Math.min(count, this.revealOrder.length);
        while (this.visibleCount < target) {
            const node = this.revealOrder[this.visibleCount];
            const size = node.xMax - node.xMin;
            adaptivePaintRect(this.imageData, node.xMin, node.yMin, size, ADAPTIVE_COLORS[node.status]);
            this.visibleCount++;
        }
    }

    step(nowMs) {
        if (this.visibleCount >= this.revealOrder.length) return;

        if (!this.lastStepAt) this.lastStepAt = nowMs;
        const elapsed = nowMs - this.lastStepAt;
        if (elapsed < this.stepIntervalMs) return;

        const steps = Math.max(1, Math.floor(elapsed / this.stepIntervalMs));
        this.lastStepAt += steps * this.stepIntervalMs;
        this.revealTo(this.visibleCount + steps);
    }

    draw(ctx) {
        ctx.putImageData(this.imageData, 0, 0);
    }

    isFinished() {
        return this.visibleCount >= this.revealOrder.length;
    }
}

function drawAdaptiveGrid(ctx, shape, maxDepth, w, h) {
    const animator = new AdaptiveQuadtreeAnimator(shape, maxDepth, w, h, 0);
    animator.revealTo(animator.revealOrder.length);
    animator.draw(ctx);
}