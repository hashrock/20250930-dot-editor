import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import Konva from 'konva';

const CANVAS_SIZE = 32;
const PIXEL_SIZE = 16;
const TRANSPARENT = 'transparent';

type Tool = 'brush' | 'eraser' | 'fill' | 'select';

// Bresenham's line algorithm
function bresenhamLine(x0: number, y0: number, x1: number, y1: number): Array<{x: number, y: number}> {
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
function floodFill(pixels: string[][], x: number, y: number, targetColor: string, replacementColor: string): string[][] {
  if (targetColor === replacementColor) return pixels;
  if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return pixels;
  if (pixels[y][x] !== targetColor) return pixels;

  const newPixels = pixels.map(row => [...row]);
  const stack: Array<{x: number, y: number}> = [{x, y}];

  while (stack.length > 0) {
    const {x: cx, y: cy} = stack.pop()!;
    if (cx < 0 || cx >= CANVAS_SIZE || cy < 0 || cy >= CANVAS_SIZE) continue;
    if (newPixels[cy][cx] !== targetColor) continue;

    newPixels[cy][cx] = replacementColor;

    stack.push({x: cx + 1, y: cy});
    stack.push({x: cx - 1, y: cy});
    stack.push({x: cx, y: cy + 1});
    stack.push({x: cx, y: cy - 1});
  }

  return newPixels;
}

function App() {
  const [pixels, setPixels] = useState<string[][]>(() =>
    Array(CANVAS_SIZE).fill(null).map(() => Array(CANVAS_SIZE).fill(TRANSPARENT))
  );
  const [currentColor, setCurrentColor] = useState('#000000');
  const [colorPalette, setColorPalette] = useState<string[]>(['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff']);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [brushSize, setBrushSize] = useState(1);
  const [showMenu, setShowMenu] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('brush');
  const [selectionStart, setSelectionStart] = useState<{x: number, y: number} | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{x: number, y: number} | null>(null);
  const [clipboard, setClipboard] = useState<string[][] | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastDrawPos = useRef<{x: number, y: number} | null>(null);

  // Center canvas on mount
  useEffect(() => {
    const centerX = (window.innerWidth - CANVAS_SIZE * PIXEL_SIZE) / 2;
    const centerY = (window.innerHeight - CANVAS_SIZE * PIXEL_SIZE) / 2;
    setPosition({ x: centerX, y: centerY });
  }, []);

  const getPixelCoordinates = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return null;

    const pos = stage.getPointerPosition();
    if (!pos) return null;

    const x = Math.floor((pos.x - position.x) / (PIXEL_SIZE * scale));
    const y = Math.floor((pos.y - position.y) / (PIXEL_SIZE * scale));

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      return { x, y };
    }
    return null;
  };

  const drawPixel = (x: number, y: number, newPixels: string[][], color: string) => {
    if (brushSize === 1) {
      newPixels[y][x] = color;
    } else {
      const radius = Math.floor(brushSize / 2);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < CANVAS_SIZE && py >= 0 && py < CANVAS_SIZE) {
            if (dx * dx + dy * dy <= radius * radius + radius) {
              newPixels[py][px] = color;
            }
          }
        }
      }
    }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || (e.evt.button === 2 && currentTool !== 'brush' && currentTool !== 'eraser')) {
      e.evt.preventDefault();
      isPanning.current = true;
      const stage = e.target.getStage();
      if (stage) {
        const pos = stage.getPointerPosition();
        if (pos) {
          lastPos.current = pos;
        }
      }
      return;
    }

    if (e.evt.button === 0) {
      const coords = getPixelCoordinates(e);
      if (!coords) return;

      if (currentTool === 'fill') {
        const targetColor = pixels[coords.y][coords.x];
        const newPixels = floodFill(pixels, coords.x, coords.y, targetColor, currentColor);
        setPixels(newPixels);
      } else if (currentTool === 'select') {
        setSelectionStart(coords);
        setSelectionEnd(coords);
        setIsDrawing(true);
      } else {
        setIsDrawing(true);
        const newPixels = pixels.map(row => [...row]);
        const color = currentTool === 'eraser' ? TRANSPARENT : currentColor;
        drawPixel(coords.x, coords.y, newPixels, color);
        setPixels(newPixels);
        lastDrawPos.current = coords;
      }
    }

    // Right click for eyedropper
    if (e.evt.button === 2 && (currentTool === 'brush' || currentTool === 'eraser')) {
      e.evt.preventDefault();
      const coords = getPixelCoordinates(e);
      if (coords) {
        const color = pixels[coords.y][coords.x];
        if (color !== TRANSPARENT) {
          setCurrentColor(color);
        }
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning.current) {
      const stage = e.target.getStage();
      if (stage) {
        const pos = stage.getPointerPosition();
        if (pos) {
          const dx = pos.x - lastPos.current.x;
          const dy = pos.y - lastPos.current.y;
          setPosition(prev => ({
            x: prev.x + dx,
            y: prev.y + dy
          }));
          lastPos.current = pos;
        }
      }
      return;
    }

    if (isDrawing) {
      const coords = getPixelCoordinates(e);
      if (!coords) return;

      if (currentTool === 'select') {
        setSelectionEnd(coords);
      } else if (lastDrawPos.current) {
        const newPixels = pixels.map(row => [...row]);
        const color = currentTool === 'eraser' ? TRANSPARENT : currentColor;

        // Bresenham line interpolation
        const line = bresenhamLine(
          lastDrawPos.current.x,
          lastDrawPos.current.y,
          coords.x,
          coords.y
        );

        line.forEach(point => {
          drawPixel(point.x, point.y, newPixels, color);
        });

        setPixels(newPixels);
        lastDrawPos.current = coords;
      }
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    isPanning.current = false;
    lastDrawPos.current = null;
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(10, newScale));

    setScale(clampedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  const savePNG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    pixels.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color !== TRANSPARENT) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      });
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pixel-art.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  };

  const copySelection = () => {
    if (!selectionStart || !selectionEnd) return;

    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);

    const selection: string[][] = [];
    for (let y = minY; y <= maxY; y++) {
      const row: string[] = [];
      for (let x = minX; x <= maxX; x++) {
        row.push(pixels[y][x]);
      }
      selection.push(row);
    }

    setClipboard(selection);
  };

  const pasteSelection = () => {
    if (!clipboard || !selectionStart) return;

    const newPixels = pixels.map(row => [...row]);
    clipboard.forEach((row, dy) => {
      row.forEach((color, dx) => {
        const x = selectionStart.x + dx;
        const y = selectionStart.y + dy;
        if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
          newPixels[y][x] = color;
        }
      });
    });

    setPixels(newPixels);
  };

  const addColorToPalette = () => {
    if (!colorPalette.includes(currentColor)) {
      setColorPalette([...colorPalette, currentColor]);
    }
  };

  const removeColorFromPalette = (color: string) => {
    setColorPalette(colorPalette.filter(c => c !== color));
  };

  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteSelection();
      }
    };

    document.addEventListener('contextmenu', handleGlobalContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectionStart, selectionEnd, clipboard, pixels]);

  const getSelectionRect = () => {
    if (!selectionStart || !selectionEnd) return null;

    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);

    return {
      x: minX * PIXEL_SIZE,
      y: minY * PIXEL_SIZE,
      width: (maxX - minX + 1) * PIXEL_SIZE,
      height: (maxY - minY + 1) * PIXEL_SIZE
    };
  };

  const toolIcons = {
    brush: '🖌️',
    eraser: '🧹',
    fill: '🪣',
    select: '⬚'
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#e8e8e8',
      position: 'relative'
    }}>
      {/* Floating Menu Button */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            padding: '8px 14px',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '16px' }}>☰</span>
          <span>Menu</span>
        </button>

        {showMenu && (
          <div style={{
            marginTop: '6px',
            padding: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            minWidth: '200px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            {/* Tools */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tools
              </label>
              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                {(['brush', 'eraser', 'fill', 'select'] as Tool[]).map(tool => (
                  <button
                    key={tool}
                    onClick={() => setCurrentTool(tool)}
                    style={{
                      flex: '1 1 calc(50% - 2px)',
                      padding: '7px 0',
                      backgroundColor: currentTool === tool ? '#333' : '#f8f8f8',
                      color: currentTool === tool ? 'white' : '#555',
                      border: currentTool === tool ? '1px solid #333' : '1px solid #e0e0e0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: currentTool === tool ? '600' : '400',
                      textTransform: 'capitalize',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{toolIcons[tool]}</span>
                    <span>{tool}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Color
              </label>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                style={{
                  width: '100%',
                  height: '30px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              />
            </div>

            {/* Palette */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Palette
              </label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                {colorPalette.map((color, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '26px',
                      height: '26px',
                      backgroundColor: color,
                      border: currentColor === color ? '2px solid #333' : '1px solid #ddd',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      backgroundImage: color === TRANSPARENT ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : 'none',
                      backgroundSize: color === TRANSPARENT ? '8px 8px' : 'auto',
                      backgroundPosition: color === TRANSPARENT ? '0 0, 4px 4px' : 'auto',
                      transition: 'all 0.15s'
                    }}
                    onClick={() => setCurrentColor(color)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      removeColorFromPalette(color);
                    }}
                  />
                ))}
              </div>
              <button
                onClick={addColorToPalette}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#f8f8f8',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  width: '100%',
                  color: '#555',
                  fontWeight: '500'
                }}
              >
                ➕ Add Color
              </button>
            </div>

            {/* Brush Size */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>Brush Size</span>
                <span style={{ color: '#333', fontWeight: '600' }}>{brushSize}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                style={{ width: '100%', height: '4px' }}
              />
            </div>

            {/* Grid Toggle */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#555',
              cursor: 'pointer',
              marginBottom: '10px',
              padding: '6px',
              backgroundColor: '#f8f8f8',
              borderRadius: '4px',
              border: '1px solid #e0e0e0'
            }}>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px' }}>⊞</span>
              <span>Show Grid</span>
            </label>

            {/* Copy/Paste */}
            <div style={{ marginBottom: '10px' }}>
              <button
                onClick={copySelection}
                disabled={!selectionStart || !selectionEnd}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  marginBottom: '3px',
                  backgroundColor: '#f8f8f8',
                  color: '#555',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: selectionStart && selectionEnd ? 'pointer' : 'not-allowed',
                  fontSize: '11px',
                  opacity: selectionStart && selectionEnd ? 1 : 0.4,
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>📋</span>
                <span>Copy (⌘C)</span>
              </button>
              <button
                onClick={pasteSelection}
                disabled={!clipboard}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: '#f8f8f8',
                  color: '#555',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: clipboard ? 'pointer' : 'not-allowed',
                  fontSize: '11px',
                  opacity: clipboard ? 1 : 0.4,
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>📄</span>
                <span>Paste (⌘V)</span>
              </button>
            </div>

            {/* Save */}
            <button
              onClick={savePNG}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#333',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>💾</span>
              <span>Save PNG</span>
            </button>

            {/* Help */}
            <div style={{
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid #e8e8e8',
              fontSize: '10px',
              color: '#999',
              lineHeight: '1.6'
            }}>
              Left: Draw | Right: Pick<br/>
              Wheel: Zoom | Middle: Pan
            </div>
          </div>
        )}
      </div>

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        padding: '5px 10px',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#666',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        zIndex: 1000,
        fontWeight: '600'
      }}>
        {(scale * 100).toFixed(0)}%
      </div>

      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        ref={stageRef}
        style={{ cursor: isPanning.current ? 'grabbing' : 'crosshair' }}
      >
        <Layer
          x={position.x}
          y={position.y}
          scaleX={scale}
          scaleY={scale}
        >
          {pixels.map((row, y) =>
            row.map((color, x) => (
              <Rect
                key={`${x}-${y}`}
                x={x * PIXEL_SIZE}
                y={y * PIXEL_SIZE}
                width={PIXEL_SIZE}
                height={PIXEL_SIZE}
                fill={color === TRANSPARENT ? undefined : color}
                stroke={showGrid ? '#e0e0e0' : undefined}
                strokeWidth={showGrid ? 0.3 : 0}
              />
            ))
          )}

          {/* Checkerboard pattern for transparency */}
          {pixels.map((row, y) =>
            row.map((color, x) => {
              if (color === TRANSPARENT) {
                const isLight = (x + y) % 2 === 0;
                return (
                  <Rect
                    key={`checker-${x}-${y}`}
                    x={x * PIXEL_SIZE}
                    y={y * PIXEL_SIZE}
                    width={PIXEL_SIZE}
                    height={PIXEL_SIZE}
                    fill={isLight ? '#ffffff' : '#e8e8e8'}
                  />
                );
              }
              return null;
            })
          )}

          {showGrid && (
            <>
              {Array.from({ length: CANVAS_SIZE + 1 }).map((_, i) => (
                <Line
                  key={`v-${i}`}
                  points={[i * PIXEL_SIZE, 0, i * PIXEL_SIZE, CANVAS_SIZE * PIXEL_SIZE]}
                  stroke="#d0d0d0"
                  strokeWidth={0.3}
                />
              ))}
              {Array.from({ length: CANVAS_SIZE + 1 }).map((_, i) => (
                <Line
                  key={`h-${i}`}
                  points={[0, i * PIXEL_SIZE, CANVAS_SIZE * PIXEL_SIZE, i * PIXEL_SIZE]}
                  stroke="#d0d0d0"
                  strokeWidth={0.3}
                />
              ))}
            </>
          )}

          {/* Selection rectangle */}
          {currentTool === 'select' && selectionStart && selectionEnd && (() => {
            const rect = getSelectionRect();
            if (rect) {
              return (
                <Rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  stroke="#0080ff"
                  strokeWidth={2 / scale}
                  dash={[8 / scale, 4 / scale]}
                  listening={false}
                />
              );
            }
          })()}
        </Layer>
      </Stage>
    </div>
  );
}

export default App;