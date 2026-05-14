/**
 * js/uniform.js
 * Implementa a representação por grade uniforme (Uniform Grid).
 */

const UNIFORM_COLORS = {
    0: [255, 255, 255, 255], // FORA: Branco
    1: [74, 144, 217, 255],  // DENTRO: Azul (mesma paleta do repo de referência)
    2: [231, 76, 60, 255],   // INTERSEÇÃO / NÃO CLASSIFICADO: Vermelho
};

function uniformFillImageData(imageData, rgba) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
        d[i] = rgba[0];
        d[i + 1] = rgba[1];
        d[i + 2] = rgba[2];
        d[i + 3] = rgba[3];
    }
}

function uniformPaintRect(imageData, x, y, w, h, rgba) {
    const width = imageData.width;
    const data = imageData.data;

    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(width, Math.ceil(x + w));
    const y1 = Math.min(imageData.height, Math.ceil(y + h));

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

function buildUniformImageData(shape, resolution, width, height) {
    const data = new Uint8ClampedArray(width * height * 4);
    const imageData = new ImageData(data, width, height);

    // Fundo branco (FORA)
    uniformFillImageData(imageData, UNIFORM_COLORS[0]);

    const cellWidth = width / resolution;
    const cellHeight = height / resolution;

    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            const xMin = i * cellWidth;
            const xMax = (i + 1) * cellWidth;
            const yMin = j * cellHeight;
            const yMax = (j + 1) * cellHeight;

            const status = shape.classifyCell(xMin, xMax, yMin, yMax);
            if (status === 0) continue;

            uniformPaintRect(
                imageData,
                xMin,
                yMin,
                xMax - xMin,
                yMax - yMin,
                UNIFORM_COLORS[status]
            );
        }
    }

    return imageData;
}

function drawUniformGrid(ctx, shape, resolution, width, height) {
    const imageData = buildUniformImageData(shape, resolution, width, height);
    ctx.putImageData(imageData, 0, 0);
}