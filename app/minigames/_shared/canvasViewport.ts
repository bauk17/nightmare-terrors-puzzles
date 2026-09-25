import { CANVAS_HEIGHT, CANVAS_WIDTH } from './gameUtils';

export type CanvasViewport = {
  width: number;
  height: number;
  scale: number;
};

type CanvasViewportRef = {
  current: CanvasViewport;
};

export function resizeCanvasToViewport(
  canvas: HTMLCanvasElement,
  viewportRef: CanvasViewportRef,
) {
  const resize = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cssScale = Math.max(
      Math.min(viewportWidth / CANVAS_WIDTH, viewportHeight / CANVAS_HEIGHT),
      0.1,
    );
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const context = canvas.getContext('2d');
    const imageSmoothingEnabled = context?.imageSmoothingEnabled ?? true;

    viewportRef.current = {
      width: viewportWidth / cssScale,
      height: viewportHeight / cssScale,
      scale: cssScale * pixelRatio,
    };

    canvas.width = Math.round(viewportWidth * pixelRatio);
    canvas.height = Math.round(viewportHeight * pixelRatio);
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;

    const resizedContext = canvas.getContext('2d');
    if (resizedContext) resizedContext.imageSmoothingEnabled = imageSmoothingEnabled;
  };

  resize();
  window.addEventListener('resize', resize);
  return () => window.removeEventListener('resize', resize);
}