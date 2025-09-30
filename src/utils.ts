
// Bresenham's line algorithm
export function bresenhamLine(x0: number, y0: number, x1: number, y1: number): Array<{x: number, y: number}> {
  const points: Array<{x: number, y: number}> = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    points.push({ x, y });

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return points;
}

// Flood fill algorithm
export function floodFill(pixels: string[][], x: number, y: number, targetColor: string, replacementColor: string): string[][] {
  const width = pixels[0]?.length || 0;
  const height = pixels.length || 0;

  if (targetColor === replacementColor) return pixels;
  if (x < 0 || x >= width || y < 0 || y >= height) return pixels;
  if (pixels[y][x] !== targetColor) return pixels;

  const newPixels = pixels.map(row => [...row]);
  const stack: Array<{x: number, y: number}> = [{x, y}];

  while (stack.length > 0) {
    const {x: cx, y: cy} = stack.pop()!;
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
    if (newPixels[cy][cx] !== targetColor) continue;

    newPixels[cy][cx] = replacementColor;

    stack.push({x: cx + 1, y: cy});
    stack.push({x: cx - 1, y: cy});
    stack.push({x: cx, y: cy + 1});
    stack.push({x: cx, y: cy - 1});
  }

  return newPixels;
}