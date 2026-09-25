type KeyState = Record<string, boolean>;

type KeyStateRef = {
  current: KeyState;
};

export type CanvasRuntimeCallbacks = {
  onFrame: (context: CanvasRenderingContext2D, currentTime: number) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  onBlur?: () => void;
  preventArrowScroll?: boolean;
  configureContext?: (context: CanvasRenderingContext2D) => void;
};

export function startCanvasRuntime(
  canvas: HTMLCanvasElement,
  keysRef: KeyStateRef,
  callbacks: CanvasRuntimeCallbacks,
) {
  const context = canvas.getContext('2d');
  if (!context) return () => {};

  callbacks.configureContext?.(context);

  const handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const target = event.target;
    const isInteractiveTarget = target instanceof HTMLElement && Boolean(
      target.closest('input, textarea, select, button, a, [contenteditable="true"]'),
    );
    if (callbacks.preventArrowScroll && key.startsWith('arrow') && !isInteractiveTarget) {
      event.preventDefault();
    }
    keysRef.current[key] = true;
    keysRef.current[event.key] = true;
    callbacks.onKeyDown?.(event);
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    keysRef.current[event.key.toLowerCase()] = false;
    keysRef.current[event.key] = false;
    callbacks.onKeyUp?.(event);
  };

  const handleBlur = () => {
    keysRef.current = {};
    callbacks.onBlur?.();
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', handleBlur);

  let animationFrameId = 0;
  const gameLoop = (currentTime: number) => {
    callbacks.onFrame(context, currentTime);
    animationFrameId = requestAnimationFrame(gameLoop);
  };

  animationFrameId = requestAnimationFrame(gameLoop);

  return () => {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', handleBlur);
  };
}