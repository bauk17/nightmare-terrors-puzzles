"use client";

import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdClose } from "react-icons/md";
import { startCanvasRuntime } from '../_shared/canvasRuntime';
import { GameHud, GameOverOverlay, PauseOverlay } from '../_shared/MinigameOverlays';
import { useMovementDuration } from '../_shared/useMovementDuration';
import { advanceGridMovement, beginGridMovement, CANVAS_HEIGHT, CANVAS_WIDTH, captureGridInput, getNextGridDirection, getOctagonalDist, MAP_RADIUS, MAP_SIZE, TILE_SIZE } from '../_shared/gameUtils';
import type { GridInputBuffer, PlayerMovement, PlayerState } from '../_shared/gameUtils';

// --- CONSTANTES ---
const STEP_DELAY = 420;
const SPAWN_INTERVAL_MS = STEP_DELAY * 2;
const EDGE_FIELD_SIZE = 3;

type Wave = {
  step: number;
  lastStepTime: number;
  hitPlayer: boolean;
};

export default function RhythmGame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buzzImgRef = useRef<HTMLImageElement | null>(null);
  
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [hitIntensity, setHitIntensity] = useState(0);
  const { durationMs: playerStepDurationMs, setDurationMs: setPlayerStepDurationMs } = useMovementDuration('raito');
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
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const movementInputBufferRef = useRef<GridInputBuffer | null>(null);
  const movementRef = useRef<PlayerMovement | null>(null);
  const scoreRef = useRef<number>(0);

  const resetGame = () => {
    playerRef.current = {
      gridX: MAP_RADIUS, gridY: MAP_RADIUS + 2,
      visualX: MAP_RADIUS * TILE_SIZE, visualY: (MAP_RADIUS + 2) * TILE_SIZE,
      health: 5, isMoving: false,
    };
    movementInputBufferRef.current = null;
    movementRef.current = null;
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
    const buzzImg = new Image();
    buzzImg.src = '/shelectabuzz.gif';
    buzzImg.onload = () => { buzzImgRef.current = buzzImg; };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const update = (currentTime: number) => {
      const player = playerRef.current;
      const keys = keysRef.current;
      const currentHitIntensity = gameStateRef.current.hitIntensity;

      if (currentHitIntensity > 0) {
        setHitIntensity(prev => Math.max(0, prev - 0.05));
      }

      advanceGridMovement(player, movementRef, currentTime);

      if (!player.isMoving) {
        const { x: directionX, y: directionY } = getNextGridDirection(keys, movementInputBufferRef, currentTime);

        const nX = player.gridX + directionX;
        const nY = player.gridY + directionY;

        const isCenter = nX === MAP_RADIUS && nY === MAP_RADIUS;

        if ((directionX !== 0 || directionY !== 0) && nX >= 0 && nX < MAP_SIZE && nY >= 0 && nY < MAP_SIZE && !isCenter) {
          beginGridMovement(player, movementRef, nX, nY, currentTime, gameStateRef.current.movementDurationMs);
        }
      }

      // --- LÓGICA DO CAMPO ELÉTRICO NAS BORDAS ---
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
        wavesRef.current.push({ step: 0, lastStepTime: currentTime, hitPlayer: false });
        lastSpawnTimeRef.current = currentTime;
      }

      for (let i = wavesRef.current.length - 1; i >= 0; i--) {
        const w = wavesRef.current[i];
        if (currentTime - w.lastStepTime >= STEP_DELAY) {
          w.step++; w.lastStepTime = currentTime;
          const pDist = getOctagonalDist(player.gridX, player.gridY);
          const wDist = MAP_RADIUS - w.step;

          if (pDist === wDist) {
            player.health--; w.hitPlayer = true;
            setLives(Math.ceil(player.health));
            setHitIntensity(1); 
            if (player.health <= 0) setGameOver(true);
          } else if (wDist < pDist && !w.hitPlayer) {
            w.hitPlayer = true; scoreRef.current += 100; setScore(scoreRef.current);
          }
        }
        if (w.step > MAP_RADIUS + 2) wavesRef.current.splice(i, 1);
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.save();
      const player = playerRef.current;
      const currentHitIntensity = gameStateRef.current.hitIntensity;
      
      const shake = currentHitIntensity * 8;
      const offsetX = (Math.random() - 0.5) * shake;
      const offsetY = (Math.random() - 0.5) * shake;

      ctx.translate(CANVAS_WIDTH / 2 - (player.visualX + 16) + offsetX, CANVAS_HEIGHT / 2 - (player.visualY + 16) + offsetY);

      for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
          const tx = c * TILE_SIZE;
          const ty = r * TILE_SIZE;
          const tileDist = getOctagonalDist(c, r);
          
          ctx.strokeStyle = "#1a1a1a";
          ctx.lineWidth = 1;
          ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);

          const isEdgeTile = 
            c < EDGE_FIELD_SIZE || 
            c >= MAP_SIZE - EDGE_FIELD_SIZE || 
            r < EDGE_FIELD_SIZE || 
            r >= MAP_SIZE - EDGE_FIELD_SIZE;

          if (isEdgeTile) {
            ctx.fillStyle = "rgba(255, 255, 0, 0.08)";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            
            // Efeito de faísca aleatória
            if (Math.random() > 0.99) {
              ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
              ctx.strokeRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            }
          }

          if (wavesRef.current.some(w => tileDist === (MAP_RADIUS - w.step))) {
            ctx.fillStyle = "rgba(0, 255, 255, 0.15)";
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "#4dfaff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tx + 6, ty + 4); 
            ctx.lineTo(tx + 26, ty + 12);
            ctx.lineTo(tx + 6, ty + 20); 
            ctx.lineTo(tx + 26, ty + 28);
            ctx.stroke();
          }
        }
      }

      if (buzzImgRef.current) {
        const centerX = MAP_RADIUS * TILE_SIZE;
        const centerY = MAP_RADIUS * TILE_SIZE;
        ctx.drawImage(buzzImgRef.current, centerX - 8, centerY - 16, 48, 48);
      }
      
      ctx.fillStyle = currentHitIntensity > 0.1 ? "#ff4d4d" : "#00ffcc";
      ctx.shadowBlur = currentHitIntensity > 0.1 ? 25 : 15;
      ctx.shadowColor = currentHitIntensity > 0.1 ? "#ff4d4d" : "#00ffcc";
      ctx.fillRect(player.visualX, player.visualY, TILE_SIZE, TILE_SIZE);
      ctx.restore();

      if (currentHitIntensity > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${currentHitIntensity * 0.3})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    };

    return startCanvasRuntime(canvas, keysRef, {
      onFrame: (context, currentTime) => {
        const { gameOver: currentGameOver, isPaused: currentIsPaused } = gameStateRef.current;
        if (!currentGameOver && !currentIsPaused) update(currentTime);
        else if (movementRef.current) movementRef.current.lastTime = currentTime;
        draw(context);
      },
      onKeyDown: event => {
        if (!gameStateRef.current.isPaused && !gameStateRef.current.gameOver) {
          captureGridInput(keysRef.current, movementInputBufferRef, performance.now());
        }
        if (event.key === 'Escape' && !gameStateRef.current.gameOver) {
          setIsPaused(prev => !prev);
        }
      },
      onBlur: () => {
        movementInputBufferRef.current = null;
      },
      preventArrowScroll: true,
    });
  }, []);

  return (
    <div className="relative flex items-center justify-center w-full h-screen bg-[#050505] font-mono overflow-hidden">
      
      <button 
        onClick={() => router.push('/')}
        className="absolute top-8 right-8 z-50 p-3 bg-neutral-900/80 hover:bg-cyan-600/20 border border-white/5 hover:border-cyan-500/50 rounded-full text-white transition-all group active:scale-90 backdrop-blur-md"
      >
        <MdClose className="text-2xl group-hover:rotate-90 transition-transform" />
      </button>

      {isPaused && !gameOver && (
        <PauseOverlay
          theme="cyan"
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
          theme="cyan"
          durationMs={playerStepDurationMs}
          onRestart={resetGame}
          onExit={() => router.push('/')}
          onDurationChange={setPlayerStepDurationMs}
        />
      )}

      <GameHud variant="raito" lives={lives} score={score} />

      <div className="relative p-1 bg-white/5 rounded-3xl">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT} 
          className="rounded-2xl bg-[#0a0a0a] shadow-2xl" 
        />
      </div>

      <p className="absolute bottom-8 text-neutral-600 text-[10px] uppercase tracking-[0.4em] font-bold">
        Move: [WASD / ARROWS] • Pause: [ESC]
      </p>
    </div>
  );
}