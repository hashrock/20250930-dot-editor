import React from 'react';
import { Paintbrush, Eraser, PaintBucket, Square, Menu as MenuIcon, Copy, ClipboardPaste, Save, Grid3x3, Plus, Undo, Redo, Upload, FilePlus, X } from 'lucide-react';
import type { Tool } from '../types';
import {TRANSPARENT} from '../types';

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
  selectionStart: {x: number, y: number} | null;
  selectionEnd: {x: number, y: number} | null;
  clipboard: string[][] | null;
  savePNG: () => void;
  undo: () => void;
  redo: () => void;
  loadPNG: () => void;
  newCanvas: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const toolIcons = {
  brush: <Paintbrush size={14} />,
  eraser: <Eraser size={14} />,
  fill: <PaintBucket size={14} />,
  select: <Square size={14} />
};

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
  canRedo
}: MenuProps) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
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

  return (
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
        <MenuIcon size={16} />
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
                  {toolIcons[tool]}
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
            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '4px', maxHeight: '120px', overflowY: 'auto' }}>
              {colorPalette.map((color, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    position: 'relative',
                    width: '24px',
                    height: '24px',
                    backgroundColor: color,
                    border: currentColor === color ? '2px solid #333' : '1px solid #ddd',
                    borderRadius: '3px',
                    cursor: draggedIndex === idx ? 'grabbing' : 'grab',
                    backgroundImage: color === TRANSPARENT ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : 'none',
                    backgroundSize: color === TRANSPARENT ? '8px 8px' : 'auto',
                    backgroundPosition: color === TRANSPARENT ? '0 0, 4px 4px' : 'auto',
                    transition: 'all 0.15s',
                    opacity: draggedIndex === idx ? 0.5 : 1
                  }}
                  onClick={() => setCurrentColor(color)}
                >
                  {hoveredIndex === idx && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeColorFromPalette(color);
                      }}
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: '#ff4444',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        lineHeight: 1
                      }}
                    >
                      <X size={8} />
                    </button>
                  )}
                </div>
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
              <Plus size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} /> Add Color
            </button>
          </div>

          {/* Brush Size */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span>Brush Size</span>
              <div style={{
                width: `${brushSize * 3}px`,
                height: `${brushSize * 3}px`,
                backgroundColor: '#333',
                borderRadius: brushSize === 1 ? '0' : '50%',
                border: '1px solid #ddd'
              }} />
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
            <Grid3x3 size={14} />
            <span>Show Grid</span>
          </label>

          {/* Undo/Redo */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
              <button
                onClick={undo}
                disabled={!canUndo}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  backgroundColor: '#f8f8f8',
                  color: '#555',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: canUndo ? 'pointer' : 'not-allowed',
                  fontSize: '11px',
                  opacity: canUndo ? 1 : 0.4,
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Undo size={14} />
                <span>Undo</span>
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  backgroundColor: '#f8f8f8',
                  color: '#555',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: canRedo ? 'pointer' : 'not-allowed',
                  fontSize: '11px',
                  opacity: canRedo ? 1 : 0.4,
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Redo size={14} />
                <span>Redo</span>
              </button>
            </div>
          </div>

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
              <Copy size={14} />
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
              <ClipboardPaste size={14} />
              <span>Paste (⌘V)</span>
            </button>
          </div>

          {/* File Operations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
            <button
              onClick={newCanvas}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#f8f8f8',
                color: '#555',
                border: '1px solid #e0e0e0',
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
              <FilePlus size={14} />
              <span>New Canvas</span>
            </button>
            <div style={{ display: 'flex', gap: '3px' }}>
              <button
                onClick={loadPNG}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#555',
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
                <Upload size={14} />
                <span>Load</span>
              </button>
              <button
                onClick={savePNG}
                style={{
                  flex: 1,
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
                <Save size={14} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}