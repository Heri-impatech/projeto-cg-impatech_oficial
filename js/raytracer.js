class RayTracer {
    constructor() {
        this.origin = { x: 300, y: 300 };
        this.numRays = 720; 
        this.lightRange = 300;
    }

    rayIntersectAABB(ox, oy, dx, dy, xMin, yMin, xMax, yMax) {
        let tmin = -Infinity, tmax = Infinity;
        
        if (Math.abs(dx) > 1e-6) {
            let tx1 = (xMin - ox) / dx; let tx2 = (xMax - ox) / dx;
            tmin = Math.max(tmin, Math.min(tx1, tx2)); tmax = Math.min(tmax, Math.max(tx1, tx2));
        } else if (ox < xMin || ox > xMax) return null;

        if (Math.abs(dy) > 1e-6) {
            let ty1 = (yMin - oy) / dy; let ty2 = (yMax - oy) / dy;
            tmin = Math.max(tmin, Math.min(ty1, ty2)); tmax = Math.min(tmax, Math.max(ty1, ty2));
        } else if (oy < yMin || oy > yMax) return null;

        if (tmax >= tmin && tmax >= 0) return { tmin: Math.max(0, tmin), tmax: tmax };
        return null;
    }

    // Passamos a flag 'isInside' para saber se o raio está tentando SAIR de um objeto ou ENTRAR
    trace(ox, oy, dx, dy, node, scene, isInside) {
        if (!node) return null;
        
        // OTIMIZAÇÃO: 
        // Se a luz está dentro, ela viaja solta pelo interior (status 1)
        // Se a luz está fora, ela viaja solta pelo vazio (status 0)
        if (isInside && node.status === 1) return null;
        if (!isInside && node.status === 0) return null;

        const hitAABB = this.rayIntersectAABB(ox, oy, dx, dy, node.xMin, node.yMin, node.xMax, node.yMax);
        if (!hitAABB) return null;

        if (node.children && node.children.length > 0) {
            let hits = [];
            for (let child of node.children) {
                let chit = this.rayIntersectAABB(ox, oy, dx, dy, child.xMin, child.yMin, child.xMax, child.yMax);
                if (chit) hits.push({ child, tmin: chit.tmin });
            }
            hits.sort((a, b) => a.tmin - b.tmin); 
            
            for (let h of hits) {
                let result = this.trace(ox, oy, dx, dy, h.child, scene, isInside);
                if (result) return result;
            }
            return null;
        } else {
            // Raymarching fino para achar a parede exata da função matemática
            for (let t = hitAABB.tmin; t <= hitAABB.tmax; t += 1.0) {
                let px = ox + dx * t;
                let py = oy + dy * t;
                let val = scene.evaluate(px, py);
                
                if (isInside) {
                    // Se nasceu dentro, bate na parede quando o valor ficar > 0 (tentou sair)
                    if (val > 0) return { t, x: px, y: py };
                } else {
                    // Se nasceu fora, bate na parede quando o valor ficar <= 0 (tentou entrar)
                    if (val <= 0) return { t, x: px, y: py };
                }
            }
            return null;
        }
    }

    renderLight(ctx, scene, quadtree, width, height) {
        // O fundo SEMPRE é preto agora. A luz é que vai pintar o cenário!
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);

        // Verifica se a origem da luz está dentro de algum objeto implícito
        const isInside = scene.evaluate(this.origin.x, this.origin.y) <= 0;
        
        const stepAngle = (Math.PI * 2) / this.numRays;
        ctx.lineWidth = 2.5; 

        // Cores baseadas no ambiente
        const baseColor = isInside ? "74, 144, 217" : "255, 245, 220";
        const maxDist = Math.max(width, height) * 2;

        for (let i = 0; i < this.numRays; i++) {
            const angle = i * stepAngle;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);

            let hit = null;
            if (quadtree && quadtree.root) {
                hit = this.trace(this.origin.x, this.origin.y, dx, dy, quadtree.root, scene, isInside);
            }

            // O raio para de desenhar na parede do objeto (se bateu) ou no infinito
            const dist = hit ? hit.t : maxDist;
            
            // Limitamos a renderização puramente visual até o alcance da luz
            const renderDist = Math.min(dist, this.lightRange);

            const grad = ctx.createLinearGradient(
                this.origin.x, this.origin.y, 
                this.origin.x + dx * renderDist, this.origin.y + dy * renderDist
            );

            // FUNÇÃO DE DECAIMENTO MELHORADA (Brilho intenso central, queda suave nas bordas)
            grad.addColorStop(0, `rgba(${baseColor}, 1)`);
            grad.addColorStop(0.15, `rgba(${baseColor}, 0.8)`);
            grad.addColorStop(0.5, `rgba(${baseColor}, 0.25)`);
            grad.addColorStop(1, `rgba(${baseColor}, 0)`);

            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(this.origin.x, this.origin.y);
            ctx.lineTo(this.origin.x + dx * renderDist, this.origin.y + dy * renderDist);
            ctx.stroke();
        }
    }
}