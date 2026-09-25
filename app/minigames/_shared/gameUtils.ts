export const TILE_SIZE = 32;
export const MAP_SIZE = 31;
export const MAP_RADIUS = Math.floor(MAP_SIZE / 2);
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 480;
export const PLAYER_STEP_DURATION_MS = 150;
export const DIAGONAL_INPUT_WINDOW_MS = 70;

export type PlayerState = {
  gridX: number;
  gridY: number;
  visualX: number;
  visualY: number;
  health: number;
  isMoving: boolean;
};

export type PlayerMovement = {
  startX: number;
  startY: number;
  elapsedMs: number;
  lastTime: number;
  durationMs: number;
};

type PlayerMovementRef = {
  current: PlayerMovement | null;
};

export type GridDirection = {
  x: number;
  y: number;
};

export type GridInputBuffer = {
  direction: GridDirection;
  startedAt: number;
};

type GridInputBufferRef = {
  current: GridInputBuffer | null;
};

export function getOctagonalDist(col: number, row: number) {
  const dx = Math.abs(col - MAP_RADIUS);
  const dy = Math.abs(row - MAP_RADIUS);
  return Math.round(Math.max(dx, dy, (dx + dy) * 0.707));
}
export function getGridDirection(keys: Record<string, boolean>) {
  let x = 0;
  let y = 0;

  if (keys['arrowup'] || keys['w']) y = -1;
  else if (keys['arrowdown'] || keys['s']) y = 1;

  if (keys['arrowleft'] || keys['a']) x = -1;
  else if (keys['arrowright'] || keys['d']) x = 1;

  return { x, y };
}

export function captureGridInput(
  keys: Record<string, boolean>,
  inputBufferRef: GridInputBufferRef,
  currentTime: number,
) {
  const direction = getGridDirection(keys);
  if (direction.x === 0 && direction.y === 0) return;

  const pending = inputBufferRef.current;
  if (pending && currentTime - pending.startedAt <= DIAGONAL_INPUT_WINDOW_MS) {
    inputBufferRef.current = {
      direction: {
        x: direction.x || pending.direction.x,
        y: direction.y || pending.direction.y,
      },
      startedAt: pending.startedAt,
    };
    return;
  }

  inputBufferRef.current = { direction, startedAt: currentTime };
}

export function getNextGridDirection(
  keys: Record<string, boolean>,
  inputBufferRef: GridInputBufferRef,
  currentTime: number,
): GridDirection {
  const pending = inputBufferRef.current;
  if (!pending) return getGridDirection(keys);

  const isDiagonal = pending.direction.x !== 0 && pending.direction.y !== 0;
  if (isDiagonal || currentTime - pending.startedAt >= DIAGONAL_INPUT_WINDOW_MS) {
    inputBufferRef.current = null;
    return pending.direction;
  }

  return { x: 0, y: 0 };
}

export function beginGridMovement(
  player: PlayerState,
  movementRef: PlayerMovementRef,
  gridX: number,
  gridY: number,
  currentTime: number,
  durationMs = PLAYER_STEP_DURATION_MS,
) {
  movementRef.current = {
    startX: player.visualX,
    startY: player.visualY,
    elapsedMs: 0,
    lastTime: currentTime,
    durationMs,
  };
  player.gridX = gridX;
  player.gridY = gridY;
  player.isMoving = true;
}

export function advanceGridMovement(
  player: PlayerState,
  movementRef: PlayerMovementRef,
  currentTime: number,
) {
  const movement = movementRef.current;
  if (!player.isMoving || !movement) return;

  movement.elapsedMs += currentTime - movement.lastTime;
  movement.lastTime = currentTime;
  const progress = Math.min(movement.elapsedMs / movement.durationMs, 1);

  player.visualX = movement.startX + (player.gridX * TILE_SIZE - movement.startX) * progress;
  player.visualY = movement.startY + (player.gridY * TILE_SIZE - movement.startY) * progress;

  if (progress >= 1) {
    player.isMoving = false;
    movementRef.current = null;
  }
}