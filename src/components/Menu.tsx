import React from 'react';
import {
  Paintbrush,
  Eraser,
  PaintBucket,
  Square,
  Menu as MenuIcon,
  Copy,
  ClipboardPaste,
  Save,
  Grid3x3,
  Plus,
  Undo,
  Redo,
  Upload,
  FilePlus,
  Minus,
} from 'lucide-react';
import type { Tool } from '../types';
import { TRANSPARENT } from '../types';
import './Menu.css';

interface MenuProps {
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  colorPalette: string[];
  setColorPalette: (palette: string[]) => void;
  addColorToPalette: () => void;
  removeColorFromPalette: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  copySelection: () => void;
  pasteSelection: () => void;
  selectionStart: { x: number; y: number } | null;
  selectionEnd: { x: number; y: number } | null;
  clipboard: string[][] | null;
  savePNG: () => void;
  undo: () => void;
  redo: () => void;
  loadPNG: () => void;
  onRequestNewCanvas: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const toolIcons: Record<Tool, React.ReactNode> = {
  brush: <Paintbrush size={14} />,
  eraser: <Eraser size={14} />,
  fill: <PaintBucket size={14} />,
  select: <Square size={14} />,
};

const tools: Tool[] = ['brush', 'eraser', 'fill', 'select'];

export function Menu({
  showMenu,
  setShowMenu,
  currentTool,
  setCurrentTool,
  currentColor,
  setCurrentColor,
  colorPalette,
  setColorPalette,
  addColorToPalette,
  removeColorFromPalette,
  brushSize,
  setBrushSize,
  showGrid,
  setShowGrid,
  copySelection,
  pasteSelection,
  selectionStart,
  selectionEnd,
  clipboard,
  savePNG,
  undo,
  redo,
  loadPNG,
  onRequestNewCanvas,
  canUndo,
  canRedo,
}: MenuProps) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPalette = [...colorPalette];
    const [draggedColor] = newPalette.splice(draggedIndex, 1);
    newPalette.splice(index, 0, draggedColor);
    setColorPalette(newPalette);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const brushPreviewSize = Math.max(6, brushSize * 2);

  React.useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, setShowMenu]);

  return (
    <div className="menu menu--toolbar">
      <div className="menu-toolbar">
        <div className="menu-toolbar__cluster">
          {tools.map((tool) => (
            <button
              key={tool}
              type="button"
              className={`menu-tool${currentTool === tool ? ' is-active' : ''}`}
              onClick={() => setCurrentTool(tool)}
              title={tool}
            >
              {toolIcons[tool]}
            </button>
          ))}
        </div>

        <span className="menu-divider" />

        <div className="menu-toolbar__cluster menu-toolbar__cluster--color">
          <input
            className="menu-color-input"
            type="color"
            value={currentColor}
            onChange={(event) => setCurrentColor(event.target.value)}
            aria-label="Current color"
          />
          <button
            type="button"
            className="menu-add-swatch"
            onClick={addColorToPalette}
            title="Add current color"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="menu-toolbar__cluster menu-toolbar__cluster--palette">
          <div className="menu-swatch-strip">
            {colorPalette.map((color, index) => {
              const classes = ['menu-swatch'];
              if (color === TRANSPARENT) classes.push('menu-swatch--transparent');
              if (currentColor === color) classes.push('is-active');
              if (draggedIndex === index) classes.push('is-dragging');

              return (
                <div
                  key={`${color}-${index}`}
                  className={classes.join(' ')}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(event) => handleDragOver(event, index)}
                  onDragEnd={handleDragEnd}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ backgroundColor: color === TRANSPARENT ? 'transparent' : color }}
                  onClick={() => setCurrentColor(color)}
                >
                  {hoveredIndex === index && currentColor === color && color !== TRANSPARENT && (
                    <button
                      type="button"
                      className="menu-swatch__remove"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeColorFromPalette(color);
                      }}
                      aria-label={`Remove ${color} from palette`}
                    >
                      <Minus size={8} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <span className="menu-divider" />

        <div className="menu-toolbar__cluster menu-toolbar__cluster--brush">
          <div
            className="menu-brush-preview"
            style={{
              width: `${brushPreviewSize}px`,
              height: `${brushPreviewSize}px`,
              borderRadius: brushSize === 1 ? '2px' : '999px',
            }}
          />
          <input
            className="menu-slider"
            type="range"
            min="1"
            max="10"
            value={brushSize}
            onChange={(event) => setBrushSize(Number(event.target.value))}
            aria-label="Brush size"
          />
        </div>

        <div className="menu-toolbar__cluster">
          <button
            type="button"
            className="menu-icon-button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
          >
            <Undo size={14} />
          </button>
          <button
            type="button"
            className="menu-icon-button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
          >
            <Redo size={14} />
          </button>
        </div>

        <div className="menu-dropdown-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className={`menu-hamburger${showMenu ? ' is-active' : ''}`}
            onClick={() => setShowMenu(!showMenu)}
            aria-expanded={showMenu}
            aria-controls="menu-actions"
            title="More actions"
          >
            <MenuIcon size={15} />
          </button>

          {showMenu && (
            <div className="menu-dropdown" id="menu-actions">
              <div className="menu-dropdown__group">
                <button
                  type="button"
                  className="menu-button"
                  onClick={() => {
                    setShowGrid(!showGrid);
                    setShowMenu(false);
                  }}
                  aria-pressed={showGrid}
                >
                  <Grid3x3 size={14} />
                  <span>{showGrid ? 'Hide Grid' : 'Show Grid'}</span>
                </button>
                <button
                  type="button"
                  className="menu-button"
                  onClick={() => {
                    copySelection();
                    setShowMenu(false);
                  }}
                  disabled={!selectionStart || !selectionEnd}
                >
                  <Copy size={14} />
                  <span>Copy (⌘C)</span>
                </button>
                <button
                  type="button"
                  className="menu-button"
                  onClick={() => {
                    pasteSelection();
                    setShowMenu(false);
                  }}
                  disabled={!clipboard}
                >
                  <ClipboardPaste size={14} />
                  <span>Paste (⌘V)</span>
                </button>
              </div>
              <div className="menu-dropdown__divider" />
              <div className="menu-dropdown__group">
                <button
                  type="button"
                  className="menu-button menu-button--ghost"
                  onClick={() => {
                    onRequestNewCanvas();
                    setShowMenu(false);
                  }}
                >
                  <FilePlus size={14} />
                  <span>New Canvas…</span>
                </button>
                <button
                  type="button"
                  className="menu-button"
                  onClick={() => {
                    loadPNG();
                    setShowMenu(false);
                  }}
                >
                  <Upload size={14} />
                  <span>Load</span>
                </button>
                <button
                  type="button"
                  className="menu-button menu-button--primary"
                  onClick={() => {
                    savePNG();
                    setShowMenu(false);
                  }}
                >
                  <Save size={14} />
                  <span>Save</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
