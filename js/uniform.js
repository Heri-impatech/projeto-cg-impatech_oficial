/**
 * js/uniform.js
 * Implementa a representação por grade uniforme (Uniform Grid).
 */

function drawUniformGrid(ctx, shape, resolution, width, height) {
    const cellWidth = width / resolution;
    const cellHeight = height / resolution;

    // Limpa o canvas antes de desenhar
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            // Define as coordenadas da célula no sistema do Canvas
            const xMin = i * cellWidth;
            const xMax = (i + 1) * cellWidth;
            const yMin = j * cellHeight;
            const yMax = (j + 1) * cellHeight;

            // Classifica a célula usando a lógica matemática rigorosa
            const status = shape.classifyCell(xMin, xMax, yMin, yMax);

            // Define a cor baseada no status (conforme o relatório original)
            if (status === 1) {
                ctx.fillStyle = "rgba(0, 0, 255, 0.6)"; // DENTRO: Azul 
            } else if (status === 2) {
                ctx.fillStyle = "rgba(255, 0, 0, 0.8)"; // INTERSEÇÃO: Vermelho 
            } else {
                continue; // FORA: Branco/Transparente 
            }

            // Desenha a célula
            ctx.fillRect(xMin, yMin, cellWidth, cellHeight);
            
            // Desenha a borda da célula para visualização da grade
            ctx.strokeStyle = "#ddd";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(xMin, yMin, cellWidth, cellHeight);
        }
    }
}