"use client";

import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdClose } from "react-icons/md";
import { startCanvasRuntime } from '../_shared/canvasRuntime';
import { GameHud, GameOverOverlay, PauseOverlay } from '../_shared/MinigameOverlays';
import { useMovementDuration } from '../_shared/useMovementDuration';
import { advanceGridMovement, beginGridMovement, CANVAS_HEIGHT, CANVAS_WIDTH, captureGridInput, getNextGridDirection, getOctagonalDist, MAP_RADIUS, MAP_SIZE, PLAYER_STEP_DURATION_MS, TILE_SIZE } from '../_shared/gameUtils';
import type { GridInputBuffer, PlayerMovement, PlayerState } from '../_shared/gameUtils';

// --- CONSTANTES ---
const TARGET_TILE = 4;      
const OUTER_START_TILE = 8; 
const MOVE_DURATION = 1050;  
const WAIT_DURATION = 300; 
const CYCLE_COOLDOWN = 500; 
const DEAD_ZONE_RADIUS = 9;
const PULL_ANIMATION_DURATION_MS = PLAYER_STEP_DURATION_MS * 2;
const PULL_TARGETS = [
  { x: MAP_RADIUS - 1, y: MAP_RADIUS },
  { x: MAP_RADIUS, y: MAP_RADIUS - 1 },
  { x: MAP_RADIUS + 1, y: MAP_RADIUS },
  { x: MAP_RADIUS, y: MAP_RADIUS + 1 },
];

export default function SeishinMinigame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buzzImgRef = useRef<HTMLImageElement | null>(null);
  
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [hitIntensity, setHitIntensity] = useState(0);

  const [gamePhase, setGamePhase] = useState<'INTRO' | 'PULL' | 'PREP' | 'PLAYING'>('INTRO');
  const [statusMessage, setStatusMessage] = useState("");
  const { durationMs: playerStepDurationMs, setDurationMs: setPlayerStepDurationMs } = useMovementDuration('seishin');
  const gameStateRef = useRef({ gameOver, isPaused, hitIntensity, gamePhase, movementDurationMs: playerStepDurationMs });

  useLayoutEffect(() => {
    gameStateRef.current = { gameOver, isPaused, hitIntensity, gamePhase, movementDurationMs: playerStepDurationMs };
  }, [gameOver, isPaused, hitIntensity, gamePhase, playerStepDurationMs]);

  const playerRef = useRef<PlayerState>({
    gridX: MAP_RADIUS,
    gridY: MAP_RADIUS + 8,
    visualX: MAP_RADIUS * TILE_SIZE,
    visualY: (MAP_RADIUS + 8) * TILE_SIZE,
    health: 5,
    isMoving: false,
  });

  const cycleStartTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0);
  const activeWavesRef = useRef<number[]>([]);
  const lastWavePositionsRef = useRef<number[]>([]);
  const scoreRef = useRef<number>(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const movementInputBufferRef = useRef<GridInputBuffer | null>(null);
  const movementRef = useRef<PlayerMovement | null>(null);
  const cycleCompletedRef = useRef<boolean>(false);

  // --- LÓGICA DE FASES (RESTAURADA) ---
  useEffect(() => {
    if (gameOver || isPaused) return;

    if (gamePhase === 'INTRO') {
      setStatusMessage("Seishin starts the dance");
      const t = setTimeout(() => setGamePhase('PULL'), 1200);
      return () => clearTimeout(t);
    }
    if (gamePhase === 'PULL') {
      setStatusMessage("GRAVITY PULL");
      if (!movementRef.current) {
        const target = PULL_TARGETS[Math.floor(Math.random() * PULL_TARGETS.length)];
        beginGridMovement(
          playerRef.current,
          movementRef,
          target.x,
          target.y,
          performance.now(),
          PULL_ANIMATION_DURATION_MS,
        );
      }
      const t = setTimeout(() => setGamePhase('PREP'), 800); 
      return () => clearTimeout(t);
    }
    if (gamePhase === 'PREP') {
      setStatusMessage("GET READY...");
      const t = setTimeout(() => {
        setGamePhase('PLAYING');
        setStatusMessage("");
        cycleStartTimeRef.current = performance.now();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [gamePhase, gameOver, isPaused]);

  const resetGame = () => {
    playerRef.current = {
      gridX: MAP_RADIUS, gridY: MAP_RADIUS + 8,
      visualX: MAP_RADIUS * TILE_SIZE, visualY: (MAP_RADIUS + 8) * TILE_SIZE,
      health: 5, isMoving: false,
    };
    movementInputBufferRef.current = null;
    movementRef.current = null;
    keysRef.current = {};
    activeWavesRef.current = [];
    lastWavePositionsRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    setLives(5);
    setHitIntensity(0);
    setGameOver(false);
    setIsPaused(false);
    setGamePhase('INTRO');
    cycleCompletedRef.current = false;
  };

  useEffect(() => {
    const buzzImg = new Image();
    buzzImg.src = '/alakazam.png';
    buzzImg.onload = () => { buzzImgRef.current = buzzImg; };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const update = (currentTime: number) => {
      const player = playerRef.current;
      const { gamePhase: currentGamePhase, hitIntensity: currentHitIntensity } = gameStateRef.current;
      if (currentHitIntensity > 0) setHitIntensity(prev => Math.max(0, prev - 0.05));

      advanceGridMovement(player, movementRef, currentTime);

      if (currentGamePhase === 'PLAYING' || currentGamePhase === 'PREP') {
        if (!player.isMoving) {
          const { x: directionX, y: directionY } = getNextGridDirection(keysRef.current, movementInputBufferRef, currentTime);
          const nX = player.gridX + directionX;
          const nY = player.gridY + directionY;

          if ((directionX !== 0 || directionY !== 0) && (nX !== player.gridX || nY !== player.gridY) && nX >= 0 && nX < MAP_SIZE && nY >= 0 && nY < MAP_SIZE && !(nX === MAP_RADIUS && nY === MAP_RADIUS)) {
            const distFromCenter = Math.max(Math.abs(nX - MAP_RADIUS), Math.abs(nY - MAP_RADIUS));
            if (distFromCenter >= DEAD_ZONE_RADIUS) {
              player.health = 0;
              setLives(0);
              setHitIntensity(1);
              setGameOver(true);
              return;
            }

            beginGridMovement(player, movementRef, nX, nY, currentTime, gameStateRef.current.movementDurationMs);
          }
        }
      }

      if (currentGamePhase === 'PLAYING') {
        const elapsed = currentTime - cycleStartTimeRef.current;
        const totalCycleTime = (MOVE_DURATION * 2) + WAIT_DURATION + CYCLE_COOLDOWN;
        const phaseTime = elapsed % totalCycleTime;

        let wInner = -1, wOuter = -1;

        if (phaseTime < MOVE_DURATION) {
          const p = phaseTime / MOVE_DURATION;
          wInner = Math.round(0 + (TARGET_TILE * p));
          wOuter = Math.round(OUTER_START_TILE - ((OUTER_START_TILE - TARGET_TILE) * p));
          cycleCompletedRef.current = false;
        } else if (phaseTime < MOVE_DURATION + WAIT_DURATION) {
          wInner = TARGET_TILE; wOuter = TARGET_TILE;
        } else if (phaseTime < (MOVE_DURATION * 2) + WAIT_DURATION) {
          const p = (phaseTime - (MOVE_DURATION + WAIT_DURATION)) / MOVE_DURATION;
          wInner = Math.round(TARGET_TILE - (TARGET_TILE * p));
          wOuter = Math.round(TARGET_TILE + ((OUTER_START_TILE - TARGET_TILE) * p));
        } else {
          if (!cycleCompletedRef.current) {
            scoreRef.current += 100;
            setScore(scoreRef.current);
            cycleCompletedRef.current = true;
          }
        }

        const currentWaves = [wInner, wOuter].filter(d => d >= 0);
        const pDist = getOctagonalDist(player.gridX, player.gridY);

        currentWaves.forEach((wDist, idx) => {
          const lastDist = lastWavePositionsRef.current[idx] ?? -1;
          if (wDist !== lastDist && wDist === pDist) {
            player.health--;
            setLives(player.health);
            setHitIntensity(1);
            if (player.health <= 0) setGameOver(true);
          }
        });

        activeWavesRef.current = currentWaves;
        lastWavePositionsRef.current = [...currentWaves];
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.save();
      const player = playerRef.current;
      const currentHitIntensity = gameStateRef.current.hitIntensity;
      const shake = currentHitIntensity * 8;
      ctx.translate(CANVAS_WIDTH / 2 - (player.visualX + 16) + (Math.random() - 0.5) * shake, CANVAS_HEIGHT / 2 - (player.visualY + 16) + (Math.random() - 0.5) * shake);

      for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
          const tx = c * TILE_SIZE, ty = r * TILE_SIZE, tileDist = getOctagonalDist(c, r);
          ctx.strokeStyle = "#1a1a1a"; 
          ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
          if (activeWavesRef.current.includes(tileDist)) {
            const radius = (TILE_SIZE / 2) - 3;
            ctx.fillStyle = "rgba(138, 43, 226, 0.15)";
            ctx.beginPath(); ctx.arc(tx + 16, ty + 16, radius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#9400d3"; ctx.lineWidth = 3; ctx.shadowColor = "#bf00ff"; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(tx + 16, ty + 16, radius, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      }

      if (buzzImgRef.current) ctx.drawImage(buzzImgRef.current, (MAP_RADIUS * TILE_SIZE) - 8, (MAP_RADIUS * TILE_SIZE) - 16, 48, 48);
      ctx.fillStyle = currentHitIntensity > 0.1 ? "#ff4d4d" : "#00ffcc";
      ctx.fillRect(player.visualX, player.visualY, TILE_SIZE, TILE_SIZE);
      ctx.restore();
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
          setIsPaused(prev => {
            if (!prev) pauseStartTimeRef.current = performance.now();
            else cycleStartTimeRef.current += performance.now() - pauseStartTimeRef.current;
            return !prev;
          });
        }
      },
      onBlur: () => {
        movementInputBufferRef.current = null;
      },
    });
  }, []);

  const togglePause = () => {
    if (gameOver) return;
    if (!isPaused) pauseStartTimeRef.current = performance.now();
    else cycleStartTimeRef.current += (performance.now() - pauseStartTimeRef.current);
    setIsPaused(!isPaused);
  };

  return (
    <div className="relative flex items-center justify-center w-full h-screen bg-[#050505] font-mono overflow-hidden">
      {/* Botão de Fechar Rápido */}
      <button onClick={() => router.push('/')} className="absolute top-8 right-8 z-50 p-3 bg-white/5 border border-white/10 rounded-full text-white active:scale-90 hover:bg-white/10 transition-colors">
        <MdClose className="text-2xl" />
      </button>

      {/* Mensagens de Status (INTRO, PULL, PREP) */}
      {statusMessage && !isPaused && !gameOver && (
        <div className="absolute top-1/3 z-40 pointer-events-none w-full text-center animate-in fade-in zoom-in duration-500">
          <h2 className="text-4xl font-black text-white italic uppercase tracking-[0.2em] drop-shadow-[0_0_20px_rgba(147,51,234,0.6)]">
            {statusMessage}
          </h2>
        </div>
      )}

      {/* Menu de Pausa */}
      {isPaused && !gameOver && (
        <PauseOverlay
          theme="violet"
          durationMs={playerStepDurationMs}
          onResume={togglePause}
          onRestart={resetGame}
          onExit={() => router.push('/')}
          onDurationChange={setPlayerStepDurationMs}
        />
      )}

      {/* Tela de Game Over */}
      {gameOver && (
        <GameOverOverlay
          score={score}
          theme="violet"
          durationMs={playerStepDurationMs}
          onRestart={resetGame}
          onExit={() => router.push('/')}
          onDurationChange={setPlayerStepDurationMs}
        />
      )}

      {/* Status da HUD */}
      <GameHud variant="seishin" lives={lives} score={score} />

      <div className="relative p-1 bg-white/5 rounded-3xl">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-2xl bg-[#0a0a0a] shadow-2xl" />
      </div>

      <p className="absolute bottom-8 text-neutral-600 text-[10px] uppercase tracking-[0.4em] font-bold italic">Move: [WASD / ARROWS] • Pause: [ESC]</p>
    </div>
  );
}