import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import Konva from 'konva';

const CANVAS_SIZE = 32;
const PIXEL_SIZE = 16;

function App() {
  const [pixels, setPixels] = useState<string[][]>(() =>
    Array(CANVAS_SIZE).fill(null).map(() => Array(CANVAS_SIZE).fill('#ffffff'))
  );
  const [currentColor, setCurrentColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const stageRef = useRef<Konva.Stage>(null);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

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

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || e.evt.button === 2) {
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
      if (coords) {
        setIsDrawing(true);
        const newPixels = [...pixels];
        newPixels[coords.y][coords.x] = currentColor;
        setPixels(newPixels);
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
      if (coords) {
        const newPixels = [...pixels];
        newPixels[coords.y][coords.x] = currentColor;
        setPixels(newPixels);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    isPanning.current = false;
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    const coords = getPixelCoordinates(e);
    if (coords) {
      const color = pixels[coords.y][coords.x];
      setCurrentColor(color);
    }
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
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
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
    });
  };

  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => document.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        padding: '8px 16px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#333' }}>Dot Editor</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: '#666' }}>Color:</label>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            style={{ width: '40px', height: '32px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#666', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Show Grid
        </label>
        <button
          onClick={savePNG}
          style={{
            padding: '6px 16px',
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Save PNG
        </button>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#999' }}>
          Zoom: {(scale * 100).toFixed(0)}% | Left-click: Draw | Right-click: Pick color | Middle-click: Pan | Wheel: Zoom
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', backgroundColor: '#e8e8e8' }}>
        <Stage
          width={window.innerWidth}
          height={window.innerHeight - 56}
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
                  fill={color}
                  stroke={showGrid ? '#cccccc' : undefined}
                  strokeWidth={showGrid ? 0.5 : 0}
                />
              ))
            )}

            {showGrid && (
              <>
                {Array.from({ length: CANVAS_SIZE + 1 }).map((_, i) => (
                  <Line
                    key={`v-${i}`}
                    points={[i * PIXEL_SIZE, 0, i * PIXEL_SIZE, CANVAS_SIZE * PIXEL_SIZE]}
                    stroke="#999999"
                    strokeWidth={0.5}
                  />
                ))}
                {Array.from({ length: CANVAS_SIZE + 1 }).map((_, i) => (
                  <Line
                    key={`h-${i}`}
                    points={[0, i * PIXEL_SIZE, CANVAS_SIZE * PIXEL_SIZE, i * PIXEL_SIZE]}
                    stroke="#999999"
                    strokeWidth={0.5}
                  />
                ))}
              </>
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

export default App;