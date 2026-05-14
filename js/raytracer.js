class RayTracer {
    constructor() {
        this.origin = { x: 50, y: 50 };
        this.numRays = 180;
    }

    // Algoritmo clássico de interseção de raio com caixa delimitadora (AABB)
    rayIntersectAABB(ox, oy, dx, dy, xMin, yMin, xMax, yMax) {
        let tmin = -Infinity, tmax = Infinity;
        
        if (Math.abs(dx) > 1e-6) {
            let tx1 = (xMin - ox) / dx;
            let tx2 = (xMax - ox) / dx;
            tmin = Math.max(tmin, Math.min(tx1, tx2));
            tmax = Math.min(tmax, Math.max(tx1, tx2));
        } else if (ox < xMin || ox > xMax) return null;

        if (Math.abs(dy) > 1e-6) {
            let ty1 = (yMin - oy) / dy;
            let ty2 = (yMax - oy) / dy;
            tmin = Math.max(tmin, Math.min(ty1, ty2));
            tmax = Math.min(tmax, Math.max(ty1, ty2));
        } else if (oy < yMin || oy > yMax) return null;

        if (tmax >= tmin && tmax >= 0) {
            return { tmin: Math.max(0, tmin), tmax: tmax };
        }
        return null;
    }

    // Travessia Recursiva acelerada usando a Quadtree
    traceQuadtree(ox, oy, dx, dy, node, shape) {
        const hit = this.rayIntersectAABB(ox, oy, dx, dy, node.xMin, node.yMin, node.xMax, node.yMax);
        if (!hit) return null;

        // ACELERAÇÃO: Pula grandes espaços em branco instantaneamente
        if (node.status === 0) return null;

        // Se o nó está subdividido (tem filhos)
        if (node.children && node.children.length > 0) {
            let hits = [];
            for (let child of node.children) {
                let chit = this.rayIntersectAABB(ox, oy, dx, dy, child.xMin, child.yMin, child.xMax, child.yMax);
                if (chit) hits.push({ child, tmin: chit.tmin });
            }
            // Ordena as colisões para atravessar o nó mais próximo primeiro (Front-to-back)
            hits.sort((a, b) => a.tmin - b.tmin);
            
            for (let h of hits) {
                let result = this.traceQuadtree(ox, oy, dx, dy, h.child, shape);
                if (result) return result;
            }
            return null;
        } else {
            // Nó folha.
            // Se o nó for status 1, a borda do nó é a própria borda do objeto colidido.
            if (node.status === 1) {
                return { t: hit.tmin, x: ox + dx * hit.tmin, y: oy + dy * hit.tmin };
            }
            
            // Se o nó for status 2 (borda da forma implícita), faz um ray marching fino
            // restrito APENAS aos limites daquela célula (muito rápido).
            for (let d = hit.tmin; d <= hit.tmax; d += 0.5) {
                let px = ox + dx * d;
                let py = oy + dy * d;
                if (shape.evaluate(px, py) <= 0) {
                    return { t: d, x: px, y: py };
                }
            }
            return null;
        }
    }

    castRays(ctx, shape, quadtree, width = 512, height = 512) {
        const rayColor = "#E74C3C";
        const stepAngle = (Math.PI * 2) / this.numRays;

        ctx.save();
        ctx.fillStyle = rayColor;
        ctx.strokeStyle = "rgba(231, 76, 60, 0.3)";

        for (let i = 0; i < this.numRays; i++) {
            const angle = i * stepAngle;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);

            let hitPoint = null;

            // Se a quadtree estiver ativa, usamos a busca otimizada!
            if (quadtree && quadtree.root) {
                hitPoint = this.traceQuadtree(this.origin.x, this.origin.y, dx, dy, quadtree.root, shape);
            } else {
                // Ray marching ingênuo (passo fixo) para o modo Grade Uniforme
                const maxDist = Math.max(width, height) * 2;
                for (let d = 0; d < maxDist; d += 2) {
                    const px = this.origin.x + dx * d;
                    const py = this.origin.y + dy * d;
                    if (px < 0 || px >= width || py < 0 || py >= height) break;
                    
                    if (shape.evaluate(px, py) <= 0) {
                        hitPoint = { x: px, y: py };
                        break;
                    }
                }
            }

            // Renderiza o raio visualmente
            ctx.beginPath();
            ctx.moveTo(this.origin.x, this.origin.y);
            
            if (hitPoint) {
                ctx.lineTo(hitPoint.x, hitPoint.y);
                ctx.stroke();
                // Destaca o ponto de impacto
                ctx.fillRect(hitPoint.x - 2, hitPoint.y - 2, 4, 4);
            } else {
                // O raio se perdeu no espaço sem bater em nada
                ctx.lineTo(this.origin.x + dx * width * 2, this.origin.y + dy * height * 2);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
}