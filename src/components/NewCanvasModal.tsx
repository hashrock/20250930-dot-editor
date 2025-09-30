import { useEffect, useRef, useState } from 'react';
import './NewCanvasModal.css';

interface NewCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (width: number, height: number) => void;
  defaultWidth: number;
  defaultHeight: number;
  minSize: number;
  maxSize: number;
}

export function NewCanvasModal({
  isOpen,
  onClose,
  onConfirm,
  defaultWidth,
  defaultHeight,
  minSize,
  maxSize,
}: NewCanvasModalProps) {
  const [widthValue, setWidthValue] = useState(String(defaultWidth));
  const [heightValue, setHeightValue] = useState(String(defaultHeight));
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setWidthValue(String(defaultWidth));
      setHeightValue(String(defaultHeight));
      setError('');
    }
  }, [isOpen, defaultWidth, defaultHeight]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select();
    });
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedWidth = Number(widthValue);
    const parsedHeight = Number(heightValue);

    if (!Number.isFinite(parsedWidth) || Number.isNaN(parsedWidth)) {
      setError('Enter a valid width.');
      return;
    }

    if (!Number.isFinite(parsedHeight) || Number.isNaN(parsedHeight)) {
      setError('Enter a valid height.');
      return;
    }

    if (parsedWidth < minSize || parsedWidth > maxSize) {
      setError(`Width must be between ${minSize} and ${maxSize}.`);
      return;
    }

    if (parsedHeight < minSize || parsedHeight > maxSize) {
      setError(`Height must be between ${minSize} and ${maxSize}.`);
      return;
    }
    onConfirm(parsedWidth, parsedHeight);
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="new-canvas-modal__overlay" onMouseDown={handleOverlayClick} role="presentation">
      <div className="new-canvas-modal" role="dialog" aria-modal="true" aria-labelledby="new-canvas-title">
        <form className="new-canvas-modal__form" onSubmit={handleSubmit}>
          <div className="new-canvas-modal__header">
            <h2 className="new-canvas-modal__title" id="new-canvas-title">New Canvas</h2>
            <p className="new-canvas-modal__subtitle">Choose a pixel dimension between {minSize} and {maxSize}.</p>
          </div>

          <div className="new-canvas-modal__grid">
            <label className="new-canvas-modal__field">
              <span className="new-canvas-modal__label">Width (px)</span>
              <input
                ref={inputRef}
                className="new-canvas-modal__input"
                type="number"
                min={minSize}
                max={maxSize}
                value={widthValue}
                onChange={(event) => setWidthValue(event.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="new-canvas-modal__field">
              <span className="new-canvas-modal__label">Height (px)</span>
              <input
                className="new-canvas-modal__input"
                type="number"
                min={minSize}
                max={maxSize}
                value={heightValue}
                onChange={(event) => setHeightValue(event.target.value)}
                inputMode="numeric"
              />
            </label>
          </div>

          {error && <p className="new-canvas-modal__error" role="alert">{error}</p>}

          <div className="new-canvas-modal__actions">
            <button type="button" className="new-canvas-modal__button new-canvas-modal__button--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="new-canvas-modal__button new-canvas-modal__button--primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
