/**
 * js/sphere.js
 * Implementa o refinamento de malha e projeção 3D com rotação via gl-matrix.
 */
// js/sphere.js - Garante o acesso à biblioteca gl-matrix
const mat4 = window.mat4 || (window.glMatrix ? window.glMatrix.mat4 : null);
const vec3 = window.vec3 || (window.glMatrix ? window.glMatrix.vec3 : null);

if (!mat4 || !vec3) {
    console.error("Erro Crítico: gl-matrix não encontrada! Verifique se lib/gl-matrix.js está carregada no index.html.");
}
class SphereRefiner {
    constructor() {
        this.rotationAngle = 0; // Atributo da classe para manter o estado do ângulo

        // Vértices do Icosaedro Base (Normalizados para raio 1)
        const phi = (1 + Math.sqrt(5)) / 2;
        this.vertices = [
            [-1,  phi, 0], [ 1,  phi, 0], [-1, -phi, 0], [ 1, -phi, 0],
            [ 0, -1,  phi], [ 0,  1,  phi], [ 0, -1, -phi], [ 0,  1, -phi],
            [ phi, 0, -1], [ phi, 0,  1], [-phi, 0, -1], [-phi, 0,  1]
        ].map(v => this.normalize(v));

        this.faces = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
        ];
    }

    normalize(v) {
        const d = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
        return [v[0]/d, v[1]/d, v[2]/d];
    }

    getMidpoint(v1Idx, v2Idx, cache) {
        const key = v1Idx < v2Idx ? `${v1Idx}_${v2Idx}` : `${v2Idx}_${v1Idx}`;
        if (cache[key]) return cache[key];

        const v1 = this.vertices[v1Idx];
        const v2 = this.vertices[v2Idx];
        const mid = this.normalize([
            (v1[0] + v2[0]) / 2,
            (v1[1] + v2[1]) / 2,
            (v1[2] + v2[2]) / 2
        ]);

        this.vertices.push(mid);
        cache[key] = this.vertices.length - 1;
        return cache[key];
    }

    refine() {
        const newFaces = [];
        const cache = {};

        for (const face of this.faces) {
            const a = this.getMidpoint(face[0], face[1], cache);
            const b = this.getMidpoint(face[1], face[2], cache);
            const c = this.getMidpoint(face[2], face[0], cache);

            newFaces.push([face[0], a, c]);
            newFaces.push([face[1], b, a]);
            newFaces.push([face[2], c, b]);
            newFaces.push([a, b, c]);
        }
        this.faces = newFaces;
    }

    draw(ctx, width, height, scale) {
        this.rotationAngle += 0.01; // Velocidade da rotação

        // Criamos a matriz de transformação usando gl-matrix
        const modelViewMatrix = mat4.create();
        mat4.rotate(modelViewMatrix, modelViewMatrix, this.rotationAngle, [0, 1, 0]); // Gira no eixo Y
        mat4.rotate(modelViewMatrix, modelViewMatrix, this.rotationAngle * 0.5, [1, 0, 0]); // Gira um pouco no X

        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = "rgba(44, 62, 80, 0.6)";
        ctx.lineWidth = 1;

        for (const face of this.faces) {
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const v = this.vertices[face[i]];
                
                // Aplicamos a rotação matemática ao vértice 3D
                const rotatedV = vec3.create();
                vec3.transformMat4(rotatedV, v, modelViewMatrix);

                // Projeção simples para a tela 2D
                const x = rotatedV[0] * scale + width / 2;
                const y = rotatedV[1] * scale + height / 2;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Trick acadêmico: chama o próximo frame para animação fluida
        if (viewMode === 'sphere') {
            requestAnimationFrame(() => this.draw(ctx, width, height, scale));
        }
    }
}