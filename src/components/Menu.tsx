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
  X,
  ChevronDown,
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
  newCanvas: () => void;
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
  newCanvas,
  canUndo,
  canRedo,
}: MenuProps) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [showActions, setShowActions] = React.useState(false);

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

  return (
    <div className="menu">
      <button
        type="button"
        className="menu__toggle"
        onClick={() => setShowMenu(!showMenu)}
        aria-expanded={showMenu}
      >
        <MenuIcon size={14} />
        <span>Menu</span>
      </button>

      {showMenu && (
        <div className="menu__panel">
          <section className="menu-section">
            <div className="menu-section__header">
              <span className="menu-section__label">Tools</span>
            </div>
            <div className="menu-tools">
              {tools.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  className={`menu-tool${currentTool === tool ? ' is-active' : ''}`}
                  onClick={() => setCurrentTool(tool)}
                >
                  {toolIcons[tool]}
                  <span className="menu-tool__label">{tool}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="menu-section">
            <div className="menu-section__header">
              <span className="menu-section__label">Color</span>
            </div>
            <input
              className="menu-color-input"
              type="color"
              value={currentColor}
              onChange={(event) => setCurrentColor(event.target.value)}
              aria-label="Current color"
            />
          </section>

          <section className="menu-section">
            <div className="menu-section__header">
              <span className="menu-section__label">Palette</span>
            </div>
            <div className="menu-palette">
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
                        <X size={8} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="menu-button menu-button--subtle"
              onClick={addColorToPalette}
            >
              <Plus size={12} />
              <span>Add Color</span>
            </button>
          </section>

          <section className="menu-section">
            <div className="menu-section__header">
              <span className="menu-section__label">Brush Size</span>
              <div
                className="menu-brush-preview"
                style={{
                  width: `${brushPreviewSize}px`,
                  height: `${brushPreviewSize}px`,
                  borderRadius: brushSize === 1 ? '2px' : '999px',
                }}
              />
            </div>
            <input
              className="menu-slider"
              type="range"
              min="1"
              max="10"
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
            />
          </section>

          <label className="menu-checkbox">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(event) => setShowGrid(event.target.checked)}
            />
            <Grid3x3 size={14} />
            <span>Show Grid</span>
          </label>

          <section className="menu-section">
            <div className="menu-button-group">
              <button
                type="button"
                className="menu-button"
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo size={14} />
                <span>Undo</span>
              </button>
              <button
                type="button"
                className="menu-button"
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo size={14} />
                <span>Redo</span>
              </button>
            </div>
          </section>

          <section className="menu-section">
            <button
              type="button"
              className="menu-submenu__toggle"
              onClick={() => setShowActions(!showActions)}
              aria-expanded={showActions}
              aria-controls="menu-actions-panel"
            >
              <span>Actions</span>
              <ChevronDown
                size={14}
                style={{
                  transform: showActions ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>
            {showActions && (
              <div className="menu-submenu" id="menu-actions-panel">
                <div className="menu-submenu__group">
                  <button
                    type="button"
                    className="menu-button"
                    onClick={copySelection}
                    disabled={!selectionStart || !selectionEnd}
                  >
                    <Copy size={14} />
                    <span>Copy (⌘C)</span>
                  </button>
                  <button
                    type="button"
                    className="menu-button"
                    onClick={pasteSelection}
                    disabled={!clipboard}
                  >
                    <ClipboardPaste size={14} />
                    <span>Paste (⌘V)</span>
                  </button>
                </div>
                <div className="menu-submenu__group">
                  <button
                    type="button"
                    className="menu-button menu-button--ghost"
                    onClick={newCanvas}
                  >
                    <FilePlus size={14} />
                    <span>New Canvas</span>
                  </button>
                  <div className="menu-button-group">
                    <button
                      type="button"
                      className="menu-button"
                      onClick={loadPNG}
                    >
                      <Upload size={14} />
                      <span>Load</span>
                    </button>
                    <button
                      type="button"
                      className="menu-button menu-button--primary"
                      onClick={savePNG}
                    >
                      <Save size={14} />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
