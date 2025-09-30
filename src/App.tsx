import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import type { Tool } from './types';
import { CANVAS_SIZE, PIXEL_SIZE, TRANSPARENT } from './types';
import { bresenhamLine, floodFill } from './utils';
import { Menu } from './components/Menu';
import { NewCanvasModal } from './components/NewCanvasModal';
import './App.css';

const MIN_CANVAS_SIZE = 8;
const MAX_CANVAS_SIZE = 128;

function App() {
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_SIZE);
  const [canvasHeight, setCanvasHeight] = useState(CANVAS_SIZE);
  const [pixels, setPixels] = useState<string[][]>(() =>
    Array(CANVAS_SIZE).fill(null).map(() => Array(CANVAS_SIZE).fill(TRANSPARENT))
  );
  const [history, setHistory] = useState<string[][][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [colorPalette, setColorPalette] = useState<string[]>([
    // Transparent first
    TRANSPARENT,
    // Grayscale
    '#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999', '#b3b3b3',
    '#cccccc', '#e6e6e6', '#f5f5f5', '#ffffff',
    // Rich colors
    '#8B0000', '#FF4500', '#FFD700', '#228B22', '#4169E1', '#8B008B', '#D2691E', '#2F4F4F',
    '#DC143C', '#FF8C00', '#32CD32', '#00CED1', '#9370DB', '#FF1493', '#8B4513', '#556B2F',
    '#C71585', '#FF6347', '#7CFC00', '#1E90FF', '#BA55D3', '#CD5C5C', '#DAA520', '#2E8B57'
  ]);
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
  const [isNewCanvasModalOpen, setIsNewCanvasModalOpen] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastDrawPos = useRef<{x: number, y: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Center canvas on mount and when canvas size changes
  useEffect(() => {
    const centerX = (window.innerWidth - canvasWidth * PIXEL_SIZE) / 2;
    const centerY = (window.innerHeight - canvasHeight * PIXEL_SIZE) / 2;
    setPosition({ x: centerX, y: centerY });
  }, [canvasWidth, canvasHeight]);

  const getPixelCoordinates = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>, clamp: boolean = true) => {
    const stage = e.target.getStage();
    if (!stage) return null;

    const pos = stage.getPointerPosition();
    if (!pos) return null;

    const x = Math.floor((pos.x - position.x) / (PIXEL_SIZE * scale));
    const y = Math.floor((pos.y - position.y) / (PIXEL_SIZE * scale));

    const width = pixels[0]?.length || canvasWidth;
    const height = pixels.length || canvasHeight;

    if (clamp) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        return { x, y };
      }
      return null;
    } else {
      // クランプせずに座標を返す（範囲外の可能性あり）
      return { x, y };
    }
  };

  const drawPixel = (x: number, y: number, newPixels: string[][], color: string) => {
    const width = newPixels[0]?.length || 0;
    const height = newPixels.length || 0;

    if (brushSize === 1) {
      newPixels[y][x] = color;
    } else {
      const radius = Math.floor(brushSize / 2);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            if (dx * dx + dy * dy <= radius * radius + radius) {
              newPixels[py][px] = color;
            }
          }
        }
      }
    }
  };

  const saveToHistory = useCallback((newPixels: string[][]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPixels.map(row => [...row]));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setPixels(newPixels);
  }, [history, historyIndex]);

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
        saveToHistory(newPixels);
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
        setCurrentColor(color); // Allow picking transparent color too
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
      // 画面外でも座標を取得（クランプしない）
      const coords = getPixelCoordinates(e, false);
      if (!coords) {
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

        // キャンバス内の点のみ描画
        const width = pixels[0]?.length || 0;
        const height = pixels.length || 0;
        line.forEach(point => {
          if (point.x >= 0 && point.x < width && point.y >= 0 && point.y < height) {
            drawPixel(point.x, point.y, newPixels, color);
          }
        });

        setPixels(newPixels);
        lastDrawPos.current = coords;
      } else {
        // lastDrawPosがnullの場合、現在位置から開始（キャンバス内のみ）
        const width = pixels[0]?.length || 0;
        const height = pixels.length || 0;
        if (coords.x >= 0 && coords.x < width && coords.y >= 0 && coords.y < height) {
          const newPixels = pixels.map(row => [...row]);
          const color = currentTool === 'eraser' ? TRANSPARENT : currentColor;
          drawPixel(coords.x, coords.y, newPixels, color);
          setPixels(newPixels);
        }
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

    if (isDrawing && currentTool !== 'select') {
      saveToHistory(pixels);
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
    const width = pixels[0]?.length || 0;
    const height = pixels.length || 0;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
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

    const width = pixels[0]?.length || 0;
    const height = pixels.length || 0;

    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);

    const selection: string[][] = [];
    for (let y = minY; y <= maxY; y++) {
      const row: string[] = [];
      for (let x = minX; x <= maxX; x++) {
        if (x < width && y < height) {
          row.push(pixels[y][x]);
        }
      }
      selection.push(row);
    }

    setClipboard(selection);
  }, [selectionStart, selectionEnd, pixels]);

  const pasteSelection = useCallback(() => {
    if (!clipboard || !selectionStart) return;

    const width = pixels[0]?.length || 0;
    const height = pixels.length || 0;

    const newPixels = pixels.map(row => [...row]);
    clipboard.forEach((row, dy) => {
      row.forEach((color, dx) => {
        const x = selectionStart.x + dx;
        const y = selectionStart.y + dy;
        if (x >= 0 && x < width && y >= 0 && y < height) {
          newPixels[y][x] = color;
        }
      });
    });

    saveToHistory(newPixels);
  }, [clipboard, selectionStart, pixels, saveToHistory]);

  const addColorToPalette = () => {
    if (!colorPalette.includes(currentColor)) {
      setColorPalette([...colorPalette, currentColor]);
    }
  };

  const removeColorFromPalette = (color: string) => {
    setColorPalette(colorPalette.filter(c => c !== color));
  };

  const newCanvas = useCallback((width: number, height: number) => {
    const requestedWidth = Number.isFinite(width) ? Math.floor(width) : CANVAS_SIZE;
    const requestedHeight = Number.isFinite(height) ? Math.floor(height) : CANVAS_SIZE;
    const clampedWidth = Math.min(Math.max(requestedWidth, MIN_CANVAS_SIZE), MAX_CANVAS_SIZE);
    const clampedHeight = Math.min(Math.max(requestedHeight, MIN_CANVAS_SIZE), MAX_CANVAS_SIZE);
    const newPixels = Array(clampedHeight).fill(null).map(() => Array(clampedWidth).fill(TRANSPARENT));
    setCanvasWidth(clampedWidth);
    setCanvasHeight(clampedHeight);
    setPixels(newPixels);
    setHistory([]);
    setHistoryIndex(-1);
    setSelectionStart(null);
    setSelectionEnd(null);
    setClipboard(null);
  }, []);

  const openNewCanvasModal = useCallback(() => {
    setIsNewCanvasModalOpen(true);
  }, []);

  const closeNewCanvasModal = useCallback(() => {
    setIsNewCanvasModalOpen(false);
  }, []);

  const handleConfirmNewCanvas = useCallback((width: number, height: number) => {
    newCanvas(width, height);
    setIsNewCanvasModalOpen(false);
  }, [newCanvas]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPixels(history[historyIndex - 1].map(row => [...row]));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setPixels(history[historyIndex + 1].map(row => [...row]));
    }
  }, [history, historyIndex]);

  const loadPNG = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const extractPalette = (imageData: ImageData, width: number, height: number): string[] => {
    const colorMap = new Map<string, number>();

    // Count all unique colors
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];

        if (a > 128) { // Only count opaque pixels
          const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
          colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
        }
      }
    }

    // Sort by frequency and take top colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color)
      .slice(0, 16); // Take top 16 colors

    return sortedColors;
  };

  const handleFileLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw image at original size
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const newPixels = Array(img.height).fill(null).map(() => Array(img.width).fill(TRANSPARENT));

        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];

            if (a > 0) {
              const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
              newPixels[y][x] = hex;
            }
          }
        }

        // Extract and set palette
        const palette = extractPalette(imageData, img.width, img.height);
        setColorPalette(palette);

        // Update canvas size to match image
        setCanvasWidth(img.width);
        setCanvasHeight(img.height);
        saveToHistory(newPixels);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Reset input value so the same file can be loaded again
    e.target.value = '';
  }, [saveToHistory]);

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
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    document.addEventListener('contextmenu', handleGlobalContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [copySelection, pasteSelection, undo, redo]);

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

  // Generate canvas image from pixels
  const [canvasImage, setCanvasImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const width = pixels[0]?.length || 0;
    const height = pixels.length || 0;
    if (width === 0 || height === 0) {
      setCanvasImage(null);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width * PIXEL_SIZE;
    canvas.height = height * PIXEL_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Disable image smoothing for crisp pixels
    ctx.imageSmoothingEnabled = false;

    // Draw checkerboard pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? '#ffffff' : '#e8e8e8';
        ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      }
    }

    // Draw pixels
    pixels.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color !== TRANSPARENT) {
          ctx.fillStyle = color;
          ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
      });
    });

    const image = document.createElement('img');
    image.onload = () => {
      setCanvasImage(image);
    };
    image.src = canvas.toDataURL();
  }, [pixels]);

  return (
    <div className="app-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        style={{ display: 'none' }}
        onChange={handleFileLoad}
      />
      <Menu
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        colorPalette={colorPalette}
        setColorPalette={setColorPalette}
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
        undo={undo}
        redo={redo}
        loadPNG={loadPNG}
        onRequestNewCanvas={openNewCanvasModal}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />

      <NewCanvasModal
        isOpen={isNewCanvasModalOpen}
        onClose={closeNewCanvasModal}
        onConfirm={handleConfirmNewCanvas}
        defaultWidth={canvasWidth}
        defaultHeight={canvasHeight}
        minSize={MIN_CANVAS_SIZE}
        maxSize={MAX_CANVAS_SIZE}
      />

      {/* Zoom indicator */}
      <div className="zoom-indicator">
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
        style={{
          cursor: isPanning.current ? 'grabbing' : 'crosshair',
          imageRendering: 'pixelated'
        }}
      >
        <Layer
          x={position.x}
          y={position.y}
          scaleX={scale}
          scaleY={scale}
          imageSmoothingEnabled={false}
        >
          {canvasImage && (
            <KonvaImage
              image={canvasImage}
              listening={false}
            />
          )}

          {showGrid && (() => {
            const width = pixels[0]?.length || 0;
            const height = pixels.length || 0;
            return (
              <>
                {Array.from({ length: width + 1 }).map((_, i) => (
                  <Line
                    key={`v-${i}`}
                    points={[i * PIXEL_SIZE, 0, i * PIXEL_SIZE, height * PIXEL_SIZE]}
                    stroke="#c2c2c2"
                    strokeWidth={0.3}
                  />
                ))}
                {Array.from({ length: height + 1 }).map((_, i) => (
                  <Line
                    key={`h-${i}`}
                    points={[0, i * PIXEL_SIZE, width * PIXEL_SIZE, i * PIXEL_SIZE]}
                    stroke="#c2c2c2"
                    strokeWidth={0.3}
                  />
                ))}
              </>
            );
          })()}

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
                  stroke="#111"
                  strokeWidth={1.5 / scale}
                  dash={[4 / scale, 3 / scale]}
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
