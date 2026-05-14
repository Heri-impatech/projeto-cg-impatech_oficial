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

const SPHERE_WHITE = [255, 255, 255, 255];
const SPHERE_BLUE = [74, 144, 217, 255];

function sphereFillImageData(imageData, rgba) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
        d[i] = rgba[0];
        d[i + 1] = rgba[1];
        d[i + 2] = rgba[2];
        d[i + 3] = rgba[3];
    }
}

function spherePaintPixel(imageData, x, y, rgba) {
    const w = imageData.width;
    const h = imageData.height;
    if (x < 0 || x >= w || y < 0 || y >= h) return;

    const d = imageData.data;
    const idx = (y * w + x) * 4;
    d[idx] = rgba[0];
    d[idx + 1] = rgba[1];
    d[idx + 2] = rgba[2];
    d[idx + 3] = rgba[3];
}

function sphereDrawLine(imageData, x0, y0, x1, y1, rgba) {
    // Bresenham (inteiro) para evitar anti-aliasing e manter paleta exata.
    let x = x0 | 0;
    let y = y0 | 0;
    const xEnd = x1 | 0;
    const yEnd = y1 | 0;

    let dx = xEnd - x;
    let sx = 1;
    if (dx < 0) {
        dx = -dx;
        sx = -1;
    }

    let dy = yEnd - y;
    let sy = 1;
    if (dy < 0) {
        dy = -dy;
        sy = -1;
    }

    let err = dx - dy;

    while (true) {
        spherePaintPixel(imageData, x, y, rgba);
        if (x === xEnd && y === yEnd) break;

        const e2 = err * 2;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
}

class SphereRefiner {
    constructor() {
        this.rotationAngle = 0; // Atributo da classe para manter o estado do ângulo

        this.imageData = null;
        this.projX = [];
        this.projY = [];

        // Vértices do Icosaedro Base (Normalizados para raio 1)
        const phi = (1 + Math.sqrt(5)) / 2;
        this.vertices = [
            [-1,  phi, 0], [ 1,  phi, 0], [-1, -phi, 0], [ 1, -phi, 0],
            [ 0, -1,  phi], [ 0,  1,  phi], [ 0, -1, -phi], [ 0,  1, -phi],
            [ phi, 0, -1], [ phi, 0,  1], [-phi, 0, -1], [-phi, 0,  1]
        ];

        // Normaliza todos os vértices (sem map de array)
        for (let i = 0; i < this.vertices.length; i++) {
            this.vertices[i] = this.normalize(this.vertices[i]);
        }

        this.faces = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
        ];
    }

    normalize(v) {
        const x = v[0];
        const y = v[1];
        const z = v[2];
        const d = Math.sqrt(x * x + y * y + z * z);
        return [x / d, y / d, z / d];
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

        for (let fi = 0; fi < this.faces.length; fi++) {
            const face = this.faces[fi];
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

        // Render em ImageData para manter paleta exata (sem anti-aliasing).
        if (!this.imageData || this.imageData.width !== width || this.imageData.height !== height) {
            const data = new Uint8ClampedArray(width * height * 4);
            this.imageData = new ImageData(data, width, height);
        }
        sphereFillImageData(this.imageData, SPHERE_WHITE);

        // Projeta todos os vértices uma única vez.
        if (this.projX.length !== this.vertices.length) {
            this.projX = new Array(this.vertices.length);
            this.projY = new Array(this.vertices.length);
        }

        const rotatedV = vec3.create();
        for (let vi = 0; vi < this.vertices.length; vi++) {
            vec3.transformMat4(rotatedV, this.vertices[vi], modelViewMatrix);
            const x = rotatedV[0] * scale + width / 2;
            const y = rotatedV[1] * scale + height / 2;
            this.projX[vi] = Math.round(x);
            this.projY[vi] = Math.round(y);
        }

        // Desenha arestas das faces como linhas por pixel.
        for (let fi = 0; fi < this.faces.length; fi++) {
            const face = this.faces[fi];
            const i0 = face[0];
            const i1 = face[1];
            const i2 = face[2];

            sphereDrawLine(this.imageData, this.projX[i0], this.projY[i0], this.projX[i1], this.projY[i1], SPHERE_BLUE);
            sphereDrawLine(this.imageData, this.projX[i1], this.projY[i1], this.projX[i2], this.projY[i2], SPHERE_BLUE);
            sphereDrawLine(this.imageData, this.projX[i2], this.projY[i2], this.projX[i0], this.projY[i0], SPHERE_BLUE);
        }

        ctx.putImageData(this.imageData, 0, 0);

        // A animação (requestAnimationFrame) é controlada pelo loop principal em js/main.js.
    }
}