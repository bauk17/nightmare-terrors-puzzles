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
const STEP_DELAY = 205; 
const SPAWN_INTERVAL_MS = 1500; 
const DEAD_ZONE_RADIUS = 9; 

type Wave = {
  step: number;
  lastStepTime: number;
  hitPlayer: boolean;
};

export default function KitsuneRitual() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const machampImgRef = useRef<HTMLImageElement | null>(null);
  
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [hitEffect, setHitEffect] = useState(0);
  const { durationMs: playerStepDurationMs, setDurationMs: setPlayerStepDurationMs } = useMovementDuration('kitsune');
  const gameStateRef = useRef({ gameOver, isPaused, statusText, hitEffect, movementDurationMs: playerStepDurationMs });

  useLayoutEffect(() => {
    gameStateRef.current = { gameOver, isPaused, statusText, hitEffect, movementDurationMs: playerStepDurationMs };
  }, [gameOver, isPaused, statusText, hitEffect, playerStepDurationMs]);

  const playerRef = useRef<PlayerState>({
    gridX: MAP_RADIUS,
    gridY: MAP_RADIUS + 2,
    visualX: MAP_RADIUS * TILE_SIZE,
    visualY: (MAP_RADIUS + 2) * TILE_SIZE,
    health: 5,
    isMoving: false,
  });

  const wavesRef = useRef<Wave[]>([]);
  const gameStartTimeRef = useRef<number | null>(null);
  const lastSpawnTimeRef = useRef<number>(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const movementInputBufferRef = useRef<GridInputBuffer | null>(null);
  const movementRef = useRef<PlayerMovement | null>(null);
  const scoreRef = useRef<number>(0);

  // Cache de Estrelas (Aumentado para 400 e com cores variadas)
  const starsRef = useRef<Array<{ x: number; y: number; size: number; alpha: number; phase: number; color: string }>>([]);

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
    gameStartTimeRef.current = null;
    lastSpawnTimeRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setLives(5);
    setHitEffect(0);
    setGameOver(false);
    setIsPaused(false);
    setStatusText("STUNNED...");
  };

  useEffect(() => {
    
    const numStars = 400; 
    const starColors = ["#ffffff", "#ffe9e9", "#d1e7ff", "#fff4d6"];
    const newStars = [];
    for (let i = 0; i < numStars; i++) {
      newStars.push({
        x: Math.random() * (MAP_SIZE * TILE_SIZE + 400) - 200, // Espalhado além da borda
        y: Math.random() * (MAP_SIZE * TILE_SIZE + 400) - 200,
        size: Math.random() * 1.8 + 0.3,
        alpha: Math.random() * 0.6 + 0.1,
        phase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)]
      });
    }
    starsRef.current = newStars;

    const machampImg = new Image();
    machampImg.src = "/machamp.png"; 
    machampImg.onload = () => { machampImgRef.current = machampImg; };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const update = (currentTime: number) => {
      const player = playerRef.current;
      const keys = keysRef.current;
      const { statusText: currentStatusText, hitEffect: currentHitEffect } = gameStateRef.current;
      const elapsed = currentTime - (gameStartTimeRef.current || currentTime);

      if (currentHitEffect > 0) setHitEffect(prev => Math.max(0, prev - 0.05));

      let canMove = false;
      let startWaves = false;

      if (elapsed < 1000) {
        if (currentStatusText !== "STUNNED...") setStatusText("STUNNED...");
      } else if (elapsed < 2000) {
        canMove = true;
        const rem = ((2000 - elapsed) / 1000).toFixed(1);
        if (currentStatusText !== `WAVE IN: ${rem}s`) setStatusText(`WAVE IN: ${rem}s`);
      } else {
        canMove = true;
        startWaves = true;
        if (currentStatusText !== "") setStatusText("");
      }

      advanceGridMovement(player, movementRef, currentTime);

      if (!player.isMoving && canMove) {
        const { x: directionX, y: directionY } = getNextGridDirection(keys, movementInputBufferRef, currentTime);
        const nX = player.gridX + directionX;
        const nY = player.gridY + directionY;

        const isInsideMap = nX >= 0 && nX < MAP_SIZE && nY >= 0 && nY < MAP_SIZE;
        const distFromCenter = Math.max(Math.abs(nX - MAP_RADIUS), Math.abs(nY - MAP_RADIUS));

        if (isInsideMap && (directionX !== 0 || directionY !== 0) && (nX !== player.gridX || nY !== player.gridY)) {
          if (distFromCenter >= DEAD_ZONE_RADIUS) {
            player.health = 0;
            setLives(0);
            setHitEffect(1.0);
            setGameOver(true);
            return;
          }
          if (nX === MAP_RADIUS && nY === MAP_RADIUS) return;

          beginGridMovement(player, movementRef, nX, nY, currentTime, gameStateRef.current.movementDurationMs);
        }
      }

      if (startWaves) {
        if (lastSpawnTimeRef.current === 0) lastSpawnTimeRef.current = currentTime;
        if (currentTime - lastSpawnTimeRef.current >= SPAWN_INTERVAL_MS) {
          wavesRef.current.push({ step: 0, lastStepTime: currentTime, hitPlayer: false });
          lastSpawnTimeRef.current = currentTime;
        }

        for (let i = wavesRef.current.length - 1; i >= 0; i--) {
          const w = wavesRef.current[i];
          if (currentTime - w.lastStepTime >= STEP_DELAY) {
            w.step++; 
            w.lastStepTime = currentTime;
            const pDist = getOctagonalDist(player.gridX, player.gridY);
            
            if (pDist === w.step && !w.hitPlayer) {
              player.health--; 
              w.hitPlayer = true;
              setLives(player.health);
              setHitEffect(0.6);
              if (player.health <= 0) setGameOver(true);
            } else if (w.step > pDist && !w.hitPlayer) {
              w.hitPlayer = true; 
              scoreRef.current += 100; 
              setScore(scoreRef.current);
            }
          }
          if (w.step > DEAD_ZONE_RADIUS + 2) wavesRef.current.splice(i, 1);
        }
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const { statusText: currentStatusText, hitEffect: currentHitEffect, isPaused: currentIsPaused } = gameStateRef.current;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.save();
      const player = playerRef.current;

      // Câmera centrada no player
      ctx.translate(CANVAS_WIDTH / 2 - (player.visualX + 16), CANVAS_HEIGHT / 2 - (player.visualY + 16));

      // 1. Fundo do Espaço Profundo
      ctx.fillStyle = "#010005"; 
      ctx.fillRect(-400, -400, (MAP_SIZE * TILE_SIZE) + 800, (MAP_SIZE * TILE_SIZE) + 800);

      // 2. Renderização do Campo Estelar Denso
      ctx.globalCompositeOperation = 'lighter';
      for (const star of starsRef.current) {
        const pulse = Math.sin(Date.now() / 200 + star.phase);
        const currentAlpha = Math.max(0.1, star.alpha + pulse * 0.2);
        
        ctx.fillStyle = star.color;
        ctx.globalAlpha = currentAlpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Pequeno brilho (glow) para estrelas maiores
        if (star.size > 1.2) {
          ctx.shadowBlur = 5;
          ctx.shadowColor = star.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';

      // 3. Desenho do Grid e Barreira
      for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
          const tx = c * TILE_SIZE; 
          const ty = r * TILE_SIZE;
          const distLinear = Math.max(Math.abs(c - MAP_RADIUS), Math.abs(r - MAP_RADIUS));
          const tileDist = getOctagonalDist(c, r);

          if (distLinear >= DEAD_ZONE_RADIUS) {
             ctx.save();
             ctx.translate(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2);
             ctx.fillStyle = "rgba(20, 0, 5, 0.8)";
             ctx.beginPath();
             ctx.arc(0, 0, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
             ctx.fill();

             ctx.strokeStyle = "#ff1e4b";
             ctx.lineWidth = 2;
             ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 300) * 0.2;
             ctx.strokeRect(-TILE_SIZE/2 + 6, -TILE_SIZE/2 + 6, TILE_SIZE - 12, TILE_SIZE - 12);

             ctx.fillStyle = "#910022";
             ctx.globalAlpha = 1.0;
             ctx.beginPath();
             const sides = 6;
             for (let i = 0; i < sides; i++) {
               const ang = (i * Math.PI * 2) / sides;
               const rad = 5 + (Math.sin(Date.now() / 120 + (c + r)) * 2);
               ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
             }
             ctx.closePath();
             ctx.fill();
             ctx.restore();
          } else {
             ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"; 
             ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
          }

          // Ondas de Rachadura
          if (wavesRef.current.some(w => tileDist === w.step)) {
            ctx.save();
            ctx.translate(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2);
            ctx.strokeStyle = "#ff1e4b";
            ctx.lineWidth = 1.8;
            ctx.lineCap = "round";
            const crackCount = 5;
            for (let i = 0; i < crackCount; i++) {
              ctx.beginPath();
              ctx.moveTo(0, 0);
              const angle = (i * (Math.PI * 2 / crackCount)) + (tileDist * 0.5);
              let curX = 0, curY = 0;
              for (let j = 0; j < 3; j++) {
                const variation = (Math.sin(tileDist + i + j) * 0.8);
                curX += Math.cos(angle + variation) * 5;
                curY += Math.sin(angle + variation) * 5;
                ctx.lineTo(curX, curY);
              }
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }

      // Personagem Central (Machamp)
      if (machampImgRef.current) {
        const centerX = MAP_RADIUS * TILE_SIZE;
        const centerY = MAP_RADIUS * TILE_SIZE;
        ctx.drawImage(machampImgRef.current, centerX - 16, centerY - 24, 64, 64);
      }

      // Player
      ctx.fillStyle = "#fff"; 
      ctx.shadowBlur = 15; ctx.shadowColor = "#ff0000";
      ctx.fillRect(player.visualX, player.visualY, TILE_SIZE, TILE_SIZE);
      ctx.restore();

      // Vinheta de Dano
      if (currentHitEffect > 0) {
        const grad = ctx.createRadialGradient(
          CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.2,
          CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.6
        );
        grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
        grad.addColorStop(1, `rgba(180, 0, 0, ${currentHitEffect})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      if (currentStatusText && !currentIsPaused) {
        ctx.fillStyle = "#ff1e4b"; ctx.font = "bold 24px monospace"; ctx.textAlign = "center";
        ctx.fillText(currentStatusText, CANVAS_WIDTH / 2, 80);
      }
    };

    return startCanvasRuntime(canvas, keysRef, {
      configureContext: context => {
        context.imageSmoothingEnabled = false;
      },
      onFrame: (context, currentTime) => {
        if (gameStartTimeRef.current === null) gameStartTimeRef.current = currentTime;
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
    });
  }, []);

  return (
    <div className="relative flex items-center justify-center w-full h-screen bg-[#020000] font-mono overflow-hidden">
      <button onClick={() => router.push('/')} className="absolute top-8 right-8 z-50 p-3 bg-white/5 border border-white/10 rounded-full text-white active:scale-90 hover:bg-white/10 transition-colors">
        <MdClose className="text-2xl" />
      </button>

      {isPaused && !gameOver && (
        <PauseOverlay
          theme="rose"
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
          theme="rose"
          durationMs={playerStepDurationMs}
          onRestart={resetGame}
          onExit={() => router.push('/')}
          onDurationChange={setPlayerStepDurationMs}
        />
      )}

      <GameHud variant="kitsune" lives={lives} score={score} />

      <div className="relative p-1 bg-white/5 rounded-3xl">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-2xl bg-[#010005] shadow-2xl" />
      </div>

      <p className="absolute bottom-8 text-neutral-600 text-[10px] uppercase tracking-[0.4em] font-bold">
        Move: [WASD / ARROWS] • Pause: [ESC]
      </p>
    </div>
  );
}