import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import Konva from 'konva';
import type { Tool } from './types';
import { CANVAS_SIZE, PIXEL_SIZE, TRANSPARENT } from './types';
import { bresenhamLine, floodFill } from './utils';
import { Menu } from './components/Menu';

function App() {
  const [pixels, setPixels] = useState<string[][]>(() =>
    Array(CANVAS_SIZE).fill(null).map(() => Array(CANVAS_SIZE).fill(TRANSPARENT))
  );
  const [currentColor, setCurrentColor] = useState('#000000');
  const [colorPalette, setColorPalette] = useState<string[]>(['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff']);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
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

  const getPixelCoordinates = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>) => {
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

  const handleMouseDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (stage) {
      const canvas = stage.content;
      canvas.setPointerCapture(e.evt.pointerId);
    }

    if (e.evt.button === 1 || (e.evt.button === 2 && currentTool !== 'brush' && currentTool !== 'eraser')) {
      e.evt.preventDefault();
      isPanning.current = true;
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

  const handleMouseMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
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
      if (!coords) {
        // キャンバス外に出た場合、lastDrawPosをリセット
        lastDrawPos.current = null;
        return;
      }

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
      } else {
        // lastDrawPosがnullの場合（キャンバス外から戻ってきた）、現在位置から開始
        const newPixels = pixels.map(row => [...row]);
        const color = currentTool === 'eraser' ? TRANSPARENT : currentColor;
        drawPixel(coords.x, coords.y, newPixels, color);
        setPixels(newPixels);
        lastDrawPos.current = coords;
      }
    }
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (stage) {
      const canvas = stage.content;
      canvas.releasePointerCapture(e.evt.pointerId);
    }

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

  const copySelection = useCallback(() => {
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
  }, [selectionStart, selectionEnd, pixels]);

  const pasteSelection = useCallback(() => {
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
  }, [clipboard, selectionStart, pixels]);

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
  }, [copySelection, pasteSelection]);

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

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#e8e8e8',
      position: 'relative'
    }}>
      <Menu
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        colorPalette={colorPalette}
        addColorToPalette={addColorToPalette}
        removeColorFromPalette={removeColorFromPalette}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        copySelection={copySelection}
        pasteSelection={pasteSelection}
        selectionStart={selectionStart}
        selectionEnd={selectionEnd}
        clipboard={clipboard}
        savePNG={savePNG}
      />

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
        onPointerDown={handleMouseDown}
        onPointerMove={handleMouseMove}
        onPointerUp={handleMouseUp}
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
                stroke={color === TRANSPARENT ? undefined : color}
                strokeWidth={0.5}
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