"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdClose, MdPlayArrow, MdRefresh, MdHome } from "react-icons/md";

// --- CONSTANTES ---
const TILE_SIZE = 32;
const MAP_SIZE = 31;
const MAP_RADIUS = Math.floor(MAP_SIZE / 2);
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

const TARGET_TILE = 4;      
const OUTER_START_TILE = 8; 
const MOVE_DURATION = 1050;  
const WAIT_DURATION = 300; 
const CYCLE_COOLDOWN = 500; 

type Player = {
  gridX: number;
  gridY: number;
  visualX: number;
  visualY: number;
  health: number;
  isMoving: boolean;
};

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

  const playerRef = useRef<Player>({
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
  const cycleCompletedRef = useRef<boolean>(false);

  const getOctagonalDist = (col: number, row: number) => {
    const dx = Math.abs(col - MAP_RADIUS);
    const dy = Math.abs(row - MAP_RADIUS);
    return Math.round(Math.max(dx, dy, (dx + dy) * 0.707));
  };

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
      playerRef.current.gridX = MAP_RADIUS;
      playerRef.current.gridY = MAP_RADIUS + 1;
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => { 
      keysRef.current[e.key.toLowerCase()] = true; 
      if (e.key === "Escape" && !gameOver) {
        setIsPaused(prev => {
          if (!prev) pauseStartTimeRef.current = performance.now();
          else cycleStartTimeRef.current += (performance.now() - pauseStartTimeRef.current);
          return !prev;
        });
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationFrameId: number;

    const update = (currentTime: number) => {
      const player = playerRef.current;
      if (hitIntensity > 0) setHitIntensity(prev => Math.max(0, prev - 0.05));

      player.visualX += (player.gridX * TILE_SIZE - player.visualX) * 0.25;
      player.visualY += (player.gridY * TILE_SIZE - player.visualY) * 0.25;

      if (gamePhase === 'PLAYING' || gamePhase === 'PREP') {
        const distMoving = Math.abs(player.gridX * TILE_SIZE - player.visualX) + Math.abs(player.gridY * TILE_SIZE - player.visualY);
        player.isMoving = distMoving > 0.5;

        if (!player.isMoving) {
          let nX = player.gridX, nY = player.gridY;
          if (keysRef.current['w'] || keysRef.current['arrowup']) nY--;
          else if (keysRef.current['s'] || keysRef.current['arrowdown']) nY++;
          if (keysRef.current['a'] || keysRef.current['arrowleft']) nX--;
          else if (keysRef.current['d'] || keysRef.current['arrowright']) nX++;

          if ((nX !== player.gridX || nY !== player.gridY) && nX >= 0 && nX < MAP_SIZE && nY >= 0 && nY < MAP_SIZE && !(nX === MAP_RADIUS && nY === MAP_RADIUS)) {
            player.gridX = nX; player.gridY = nY;
            player.isMoving = true;
          }
        }
      }

      if (gamePhase === 'PLAYING') {
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
      const shake = hitIntensity * 8;
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
      ctx.fillStyle = hitIntensity > 0.1 ? "#ff4d4d" : "#00ffcc"; 
      ctx.fillRect(player.visualX, player.visualY, TILE_SIZE, TILE_SIZE);
      ctx.restore();
    };

    const gameLoop = (currentTime: number) => {
      if (!gameOver && !isPaused) update(currentTime);
      draw(ctx);
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameOver, isPaused, hitIntensity, gamePhase]);

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
        <div className="absolute inset-0 z-60 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="flex flex-col items-center">
            <h2 className="text-5xl font-black text-white italic uppercase mb-10 tracking-tighter">Game Paused</h2>
            <div className="flex gap-8">
              <button onClick={togglePause} className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 flex items-center justify-center bg-white text-black rounded-full group-hover:bg-purple-600 group-hover:text-white transition-all"><MdPlayArrow className="text-4xl" /></div>
                <span className="text-[10px] font-bold text-white/50 uppercase">Resume</span>
              </button>
              <button onClick={resetGame} className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-full group-hover:bg-white/20 transition-all"><MdRefresh className="text-3xl" /></div>
                <span className="text-[10px] font-bold text-white/50 uppercase">Restart</span>
              </button>
              <button onClick={() => router.push('/')} className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-full group-hover:bg-rose-600 transition-all"><MdHome className="text-3xl" /></div>
                <span className="text-[10px] font-bold text-white/50 uppercase">Exit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tela de Game Over */}
      {gameOver && (
        <div className="absolute inset-0 z-70 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl">
          <h1 className="text-6xl font-black text-rose-600 mb-2 italic uppercase">You lost</h1>
          <p className="text-white/50 mb-10 font-bold uppercase tracking-widest">Final Score: {score}</p>
          <div className="flex gap-4">
            <button onClick={resetGame} className="px-10 py-4 bg-emerald-500 text-black font-black rounded-full uppercase text-xs hover:scale-105 transition-transform flex items-center gap-2">
              <MdRefresh className="text-xl" /> Retry
            </button>
            <button onClick={() => router.push('/')} className="px-10 py-4 bg-white/5 border border-white/10 text-white font-black rounded-full uppercase text-xs hover:bg-white/10 transition-all flex items-center gap-2">
              <MdHome className="text-xl" /> Exit
            </button>
          </div>
        </div>
      )}

      {/* Status da HUD */}
      <div className="absolute top-8 left-8 z-20 flex flex-col gap-4 pointer-events-none">
        <div className="flex items-center gap-3">
            <div className="w-1 h-12 bg-rose-500 shadow-[0_0_10px_#f43f5e]"></div>
            <div><p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-1">Lifes</p><span className="text-white font-black text-3xl">{lives}</span></div>
        </div>
        <div className="flex items-center gap-3">
            <div className="w-1 h-12 bg-purple-500 shadow-[0_0_10px_#a855f7]"></div>
            <div><p className="text-[10px] text-purple-500 font-bold uppercase tracking-widest mb-1">Score</p><span className="text-white font-black text-3xl tabular-nums">{score}</span></div>
        </div>
      </div>

      <div className="relative p-1 bg-white/5 rounded-3xl">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-2xl bg-[#0a0a0a] shadow-2xl" />
      </div>

      <p className="absolute bottom-8 text-neutral-600 text-[10px] uppercase tracking-[0.4em] font-bold italic">Move: [WASD / ARROWS] • Pause: [ESC]</p>
    </div>
  );
}