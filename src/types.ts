export type Tool = 'brush' | 'eraser' | 'fill' | 'select';

export interface Point {
  x: number;
  y: number;
}

export const CANVAS_SIZE = 32;
export const PIXEL_SIZE = 16;
export const TRANSPARENT = 'transparent';