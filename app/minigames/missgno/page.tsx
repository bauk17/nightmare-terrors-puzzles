"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdClose } from 'react-icons/md';
import { startCanvasRuntime } from '../_shared/canvasRuntime';
import { GameHud, GameOverOverlay, PauseOverlay } from '../_shared/MinigameOverlays';
import { useMovementDuration } from '../_shared/useMovementDuration';
import {
  advanceGridMovement,
  beginGridMovement,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  captureGridInput,
  getNextGridDirection,
  getOctagonalDist,
  MAP_RADIUS,
  MAP_SIZE,
  TILE_SIZE,
} from '../_shared/gameUtils';
import type { GridInputBuffer, PlayerMovement, PlayerState } from '../_shared/gameUtils';

const STEP_DELAY = 420;
const SPAWN_INTERVAL_MS = STEP_DELAY * 2;
const EDGE_FIELD_SIZE = 3;
const MAX_WAVE_RADIUS = getOctagonalDist(0, 0);
const SPIKE_BORDER_RADIUS = 8;
const LIGHT_DURATION_MS = 4000;
const DARK_DURATION_MS = 5000;
const DARKNESS_CYCLE_DURATION_MS = LIGHT_DURATION_MS + DARK_DURATION_MS;

type Wave = {
  radius: number;
  lastStepTime: number;
  hitPlayer: boolean;
};

export default function MissgnoMinigame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, scale: 1 });
  const floorImageRef = useRef<HTMLImageElement | null>(null);
  const missgnoImageRef = useRef<HTMLImageElement | null>(null);
  const spikeImageRef = useRef<HTMLImageElement | null>(null);

  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [hitIntensity, setHitIntensity] = useState(0);
  const { durationMs: playerStepDurationMs, setDurationMs: setPlayerStepDurationMs } = useMovementDuration('missgno');
  const gameStateRef = useRef({ gameOver, isPaused, hitIntensity, movementDurationMs: playerStepDurationMs });

  useLayoutEffect(() => {
    gameStateRef.current = { gameOver, isPaused, hitIntensity, movementDurationMs: playerStepDurationMs };
  }, [gameOver, isPaused, hitIntensity, playerStepDurationMs]);

  const playerRef = useRef<PlayerState>({
    gridX: MAP_RADIUS,
    gridY: MAP_RADIUS + 2,
    visualX: MAP_RADIUS * TILE_SIZE,
    visualY: (MAP_RADIUS + 2) * TILE_SIZE,
    health: 5,
    isMoving: false,
  });

  const wavesRef = useRef<Wave[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const movementInputBufferRef = useRef<GridInputBuffer | null>(null);
  const movementRef = useRef<PlayerMovement | null>(null);
  const darknessCycleRef = useRef({ active: false, elapsedMs: 0, lastTime: 0 });
  const scoreRef = useRef(0);

  const resetGame = () => {
    playerRef.current = {
      gridX: MAP_RADIUS,
      gridY: MAP_RADIUS + 2,
      visualX: MAP_RADIUS * TILE_SIZE,
      visualY: (MAP_RADIUS + 2) * TILE_SIZE,
      health: 5,
      isMoving: false,
    };
    movementInputBufferRef.current = null;
    movementRef.current = null;
    darknessCycleRef.current = { active: false, elapsedMs: 0, lastTime: 0 };
    keysRef.current = {};
    wavesRef.current = [];
    lastSpawnTimeRef.current = performance.now();
    scoreRef.current = 0;
    setScore(0);
    setLives(5);
    setHitIntensity(0);
    setGameOver(false);
    setIsPaused(false);
  };

  useEffect(() => {
    const floorImage = new Image();
    floorImage.onload = () => { floorImageRef.current = floorImage; };
    floorImage.src = '/default_floor.png';

    const missgnoImage = new Image();
    missgnoImage.onload = () => { missgnoImageRef.current = missgnoImage; };
    missgnoImage.src = '/missgno.png';

    const spikeImage = new Image();
    spikeImage.onload = () => { spikeImageRef.current = spikeImage; };
    spikeImage.src = '/espinho_missgno.png';

    lastSpawnTimeRef.current = performance.now();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const cssScale = Math.max(
        Math.min(viewportWidth / CANVAS_WIDTH, viewportHeight / CANVAS_HEIGHT),
        0.1,
      );
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      viewportRef.current = {
        width: viewportWidth / cssScale,
        height: viewportHeight / cssScale,
        scale: cssScale * pixelRatio,
      };
      canvas.width = Math.round(viewportWidth * pixelRatio);
      canvas.height = Math.round(viewportHeight * pixelRatio);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;

      const context = canvas.getContext('2d');
      if (context) context.imageSmoothingEnabled = false;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const update = (currentTime: number) => {
      const player = playerRef.current;
      const currentHitIntensity = gameStateRef.current.hitIntensity;
      const darknessCycle = darknessCycleRef.current;

      if (darknessCycle.active) {
        darknessCycle.elapsedMs += currentTime - darknessCycle.lastTime;
        darknessCycle.lastTime = currentTime;
      }

      if (currentHitIntensity > 0) {
        setHitIntensity(previous => Math.max(0, previous - 0.05));
      }

      advanceGridMovement(player, movementRef, currentTime);

      if (!player.isMoving) {
        const direction = getNextGridDirection(keysRef.current, movementInputBufferRef, currentTime);
        const nextX = player.gridX + direction.x;
        const nextY = player.gridY + direction.y;
        const isCenter = nextX === MAP_RADIUS && nextY === MAP_RADIUS;

        if (
          (direction.x !== 0 || direction.y !== 0) &&
          nextX >= 0 && nextX < MAP_SIZE &&
          nextY >= 0 && nextY < MAP_SIZE &&
          !isCenter
        ) {
          const nextDistanceFromCenter = Math.max(
            Math.abs(nextX - MAP_RADIUS),
            Math.abs(nextY - MAP_RADIUS),
          );
          if (nextDistanceFromCenter >= SPIKE_BORDER_RADIUS) {
            player.health = 0;
            setLives(0);
            setHitIntensity(1);
            setGameOver(true);
            return;
          }

          beginGridMovement(
            player,
            movementRef,
            nextX,
            nextY,
            currentTime,
            gameStateRef.current.movementDurationMs,
          );
        }
      }

      const isInEdgeField =
        player.gridX < EDGE_FIELD_SIZE ||
        player.gridX >= MAP_SIZE - EDGE_FIELD_SIZE ||
        player.gridY < EDGE_FIELD_SIZE ||
        player.gridY >= MAP_SIZE - EDGE_FIELD_SIZE;

      if (isInEdgeField) {
        player.health -= 0.02;
        setLives(Math.ceil(player.health));
        if (currentHitIntensity < 0.3) setHitIntensity(0.4);
        if (player.health <= 0) setGameOver(true);
      }

      if (currentTime - lastSpawnTimeRef.current >= SPAWN_INTERVAL_MS) {
        wavesRef.current.push({ radius: 0, lastStepTime: currentTime, hitPlayer: false });
        lastSpawnTimeRef.current = currentTime;
        if (!darknessCycleRef.current.active) {
          darknessCycleRef.current = { active: true, elapsedMs: 0, lastTime: currentTime };
        }
      }

      for (let index = wavesRef.current.length - 1; index >= 0; index--) {
        const wave = wavesRef.current[index];
        if (currentTime - wave.lastStepTime >= STEP_DELAY) {
          wave.radius++;
          wave.lastStepTime = currentTime;
          const playerRadius = getOctagonalDist(player.gridX, player.gridY);

          if (playerRadius === wave.radius && !wave.hitPlayer) {
            player.health--;
            wave.hitPlayer = true;
            setLives(Math.ceil(player.health));
            setHitIntensity(1);
            if (player.health <= 0) setGameOver(true);
          } else if (wave.radius > playerRadius && !wave.hitPlayer) {
            wave.hitPlayer = true;
            scoreRef.current += 100;
            setScore(scoreRef.current);
          }
        }

        if (wave.radius > MAX_WAVE_RADIUS) wavesRef.current.splice(index, 1);
      }
    };

    const draw = (context: CanvasRenderingContext2D) => {
      const viewport = viewportRef.current;
      context.setTransform(viewport.scale, 0, 0, viewport.scale, 0, 0);
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, viewport.width, viewport.height);
      context.save();
      const player = playerRef.current;
      const currentHitIntensity = gameStateRef.current.hitIntensity;
      const shake = currentHitIntensity * 8;
      const offsetX = (Math.random() - 0.5) * shake;
      const offsetY = (Math.random() - 0.5) * shake;

      context.translate(
        viewport.width / 2 - (player.visualX + TILE_SIZE / 2) + offsetX,
        viewport.height / 2 - (player.visualY + TILE_SIZE / 2) + offsetY,
      );

      for (let row = 0; row < MAP_SIZE; row++) {
        for (let column = 0; column < MAP_SIZE; column++) {
          const tileX = column * TILE_SIZE;
          const tileY = row * TILE_SIZE;
          const tileRadius = getOctagonalDist(column, row);
          const distanceFromCenter = Math.max(
            Math.abs(column - MAP_RADIUS),
            Math.abs(row - MAP_RADIUS),
          );

          if (floorImageRef.current) {
            context.drawImage(floorImageRef.current, tileX, tileY, TILE_SIZE, TILE_SIZE);
          } else {
            context.fillStyle = '#08070b';
            context.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
          }
          context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          context.lineWidth = 1;
          context.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);

          if (distanceFromCenter >= SPIKE_BORDER_RADIUS && spikeImageRef.current) {
            context.drawImage(spikeImageRef.current, tileX + 2, tileY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          }

          if (wavesRef.current.some(wave => tileRadius === wave.radius)) {
            if (spikeImageRef.current) {
              context.drawImage(spikeImageRef.current, tileX + 2, tileY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            }
          }
        }
      }

      if (missgnoImageRef.current) {
        const centerX = MAP_RADIUS * TILE_SIZE;
        const centerY = MAP_RADIUS * TILE_SIZE;
        context.drawImage(missgnoImageRef.current, centerX - TILE_SIZE, centerY - TILE_SIZE, TILE_SIZE * 2, TILE_SIZE * 2);
      }

      context.fillStyle = currentHitIntensity > 0.1 ? '#ff4d4d' : '#f0abfc';
      context.shadowBlur = currentHitIntensity > 0.1 ? 25 : 15;
      context.shadowColor = currentHitIntensity > 0.1 ? '#ff4d4d' : '#d946ef';
      context.fillRect(player.visualX, player.visualY, TILE_SIZE, TILE_SIZE);
      context.restore();

      if (currentHitIntensity > 0) {
        context.fillStyle = `rgba(255, 0, 0, ${currentHitIntensity * 0.3})`;
        context.fillRect(0, 0, viewport.width, viewport.height);
      }

      const darknessCycle = darknessCycleRef.current;
      const cyclePosition = darknessCycle.elapsedMs % DARKNESS_CYCLE_DURATION_MS;
      if (darknessCycle.active && cyclePosition >= LIGHT_DURATION_MS) {
        const centerX = viewport.width / 2 + offsetX;
        const centerY = viewport.height / 2 + offsetY;
        const darknessGradient = context.createRadialGradient(
          centerX,
          centerY,
          TILE_SIZE,
          centerX,
          centerY,
          TILE_SIZE + 1,
        );
        darknessGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        darknessGradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        context.fillStyle = darknessGradient;
        context.fillRect(0, 0, viewport.width, viewport.height);
      }
    };

    const stopCanvasRuntime = startCanvasRuntime(canvas, keysRef, {
      configureContext: context => {
        context.imageSmoothingEnabled = false;
      },
      onFrame: (context, currentTime) => {
        const { gameOver: currentGameOver, isPaused: currentIsPaused } = gameStateRef.current;
        if (!currentGameOver && !currentIsPaused) update(currentTime);
        else {
          if (movementRef.current) movementRef.current.lastTime = currentTime;
          if (darknessCycleRef.current.active) darknessCycleRef.current.lastTime = currentTime;
        }
        draw(context);
      },
      onKeyDown: event => {
        if (!gameStateRef.current.isPaused && !gameStateRef.current.gameOver) {
          captureGridInput(keysRef.current, movementInputBufferRef, performance.now());
        }
        if (event.key === 'Escape' && !gameStateRef.current.gameOver) {
          setIsPaused(previous => !previous);
        }
      },
      onBlur: () => {
        movementInputBufferRef.current = null;
      },
      preventArrowScroll: true,
    });

    return () => {
      stopCanvasRuntime();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#08070b] font-mono">
      <button
        onClick={() => router.push('/')}
        className="group absolute right-8 top-8 z-50 rounded-full border border-white/10 bg-black/60 p-3 text-white backdrop-blur-md transition-all hover:border-fuchsia-400/50 hover:bg-fuchsia-500/20 active:scale-90"
        aria-label="Exit minigame"
      >
        <MdClose className="text-2xl transition-transform group-hover:rotate-90" />
      </button>

      {isPaused && !gameOver && (
        <PauseOverlay
          theme="missgno"
          durationMs={playerStepDurationMs}
          onResume={() => setIsPaused(false)}
          onRestart={resetGame}
          onExit={() => router.push('/')}
          onDurationChange={setPlayerStepDurationMs}
        />
      )}

      {gameOver && (
        <GameOverOverlay
          score={score}
          theme="missgno"
          durationMs={playerStepDurationMs}
          onRestart={resetGame}
          onExit={() => router.push('/')}
          onDurationChange={setPlayerStepDurationMs}
        />
      )}

      <GameHud variant="missgno" lives={lives} score={score} />

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        aria-label="Missgno minigame board"
        className="absolute inset-0 block h-full w-full bg-[#08070b]"
      />

      <p className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">
        Move: [WASD / ARROWS] · Pause: [ESC]
      </p>
    </div>
  );
}