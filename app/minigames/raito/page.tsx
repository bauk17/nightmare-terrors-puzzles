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
const STEP_DELAY = 490;
const SPAWN_INTERVAL_MS = STEP_DELAY * 2;
const EDGE_FIELD_SIZE = 3;

type Wave = {
  step: number;
  lastStepTime: number;
  hitPlayer: boolean;
};

type Player = {
  gridX: number;
  gridY: number;
  visualX: number;
  visualY: number;
  health: number;
  isMoving: boolean;
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

  const playerRef = useRef<Player>({
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
  const scoreRef = useRef<number>(0);

  const getOctagonalDist = (col: number, row: number) => {
    const dx = Math.abs(col - MAP_RADIUS);
    const dy = Math.abs(row - MAP_RADIUS);
    const rawDist = Math.max(dx, dy, (dx + dy) * 0.707);
    return Math.round(rawDist);
  };

  const resetGame = () => {
    playerRef.current = {
      gridX: MAP_RADIUS, gridY: MAP_RADIUS + 2,
      visualX: MAP_RADIUS * TILE_SIZE, visualY: (MAP_RADIUS + 2) * TILE_SIZE,
      health: 5, isMoving: false,
    };
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.key === "Escape" && !gameOver) setIsPaused(prev => !prev);
      keysRef.current[key] = true;
      keysRef.current[e.key] = true; 
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationFrameId: number;

    const gameLoop = (currentTime: number) => {
      if (!gameOver && !isPaused) update(currentTime);
      draw(ctx);
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const update = (currentTime: number) => {
      const player = playerRef.current;
      const keys = keysRef.current;

      if (hitIntensity > 0) {
        setHitIntensity(prev => Math.max(0, prev - 0.05));
      }

      player.visualX += (player.gridX * TILE_SIZE - player.visualX) * 0.25;
      player.visualY += (player.gridY * TILE_SIZE - player.visualY) * 0.25;

      const dist = Math.abs(player.gridX * TILE_SIZE - player.visualX) + Math.abs(player.gridY * TILE_SIZE - player.visualY);
      player.isMoving = dist > 0.5;

      if (!player.isMoving) {
        let nX = player.gridX, nY = player.gridY;
        if (keys['arrowup'] || keys['w']) nY--; 
        else if (keys['arrowdown'] || keys['s']) nY++;
        if (keys['arrowleft'] || keys['a']) nX--; 
        else if (keys['arrowright'] || keys['d']) nX++;

        const isCenter = nX === MAP_RADIUS && nY === MAP_RADIUS;

        if ((nX !== player.gridX || nY !== player.gridY) && nX >= 0 && nX < MAP_SIZE && nY >= 0 && nY < MAP_SIZE && !isCenter) {
          player.gridX = nX; player.gridY = nY;
          player.isMoving = true;
        }
      }

      // --- LÓGICA DO CAMPO ELÉTRICO NAS BORDAS ---
      const isInEdgeField = 
        player.gridX < EDGE_FIELD_SIZE || 
        player.gridX >= MAP_SIZE - EDGE_FIELD_SIZE || 
        player.gridY < EDGE_FIELD_SIZE || 
        player.gridY >= MAP_SIZE - EDGE_FIELD_SIZE;

      if (isInEdgeField) {
        // Dano constante por frame enquanto estiver na borda
        player.health -= 0.02; 
        setLives(Math.ceil(player.health));
        if (hitIntensity < 0.3) setHitIntensity(0.4);
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
      
      const shake = hitIntensity * 8;
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

          // --- DESENHO DO CAMPO ELÉTRICO NAS BORDAS ---
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
      
      ctx.fillStyle = hitIntensity > 0.1 ? "#ff4d4d" : "#00ffcc"; 
      ctx.shadowBlur = hitIntensity > 0.1 ? 25 : 15; 
      ctx.shadowColor = hitIntensity > 0.1 ? "#ff4d4d" : "#00ffcc";
      ctx.fillRect(player.visualX, player.visualY, TILE_SIZE, TILE_SIZE);
      ctx.restore();

      if (hitIntensity > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${hitIntensity * 0.3})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameOver, isPaused, hitIntensity]);

  return (
    <div className="relative flex items-center justify-center w-full h-screen bg-[#050505] font-mono overflow-hidden">
      
      <button 
        onClick={() => router.push('/')}
        className="absolute top-8 right-8 z-50 p-3 bg-neutral-900/80 hover:bg-cyan-600/20 border border-white/5 hover:border-cyan-500/50 rounded-full text-white transition-all group active:scale-90 backdrop-blur-md"
      >
        <MdClose className="text-2xl group-hover:rotate-90 transition-transform" />
      </button>

      {isPaused && !gameOver && (
        <div className="absolute inset-0 z-60 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2">Game Paused</h2>
            <div className="w-24 h-1 bg-cyan-500 mb-10 shadow-[0_0_15px_#06b6d4]"></div>
            
            <div className="flex gap-6">
              <button onClick={() => setIsPaused(false)} className="group flex flex-col items-center gap-2">
                <div className="w-16 h-16 flex items-center justify-center bg-white text-black rounded-full hover:bg-cyan-500 hover:text-white transition-all active:scale-90">
                  <MdPlayArrow className="text-4xl" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Resume</span>
              </button>

              <button onClick={resetGame} className="group flex flex-col items-center gap-2">
                <div className="w-16 h-16 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-full hover:bg-white/20 transition-all active:scale-90">
                  <MdRefresh className="text-3xl" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Restart</span>
              </button>

              <button onClick={() => router.push('/')} className="group flex flex-col items-center gap-2">
                <div className="w-16 h-16 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-full hover:bg-cyan-900/40 transition-all active:scale-90">
                  <MdHome className="text-3xl" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Exit</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div className="absolute top-8 left-8 z-20 flex flex-col gap-4 pointer-events-none">
        <div className="flex items-center gap-3">
            <div className="w-1 h-12 bg-rose-500 shadow-[0_0_10px_#f43f5e]"></div>
            <div>
                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-1 leading-none">Lifes</p>
                <span className="text-white font-black text-3xl tracking-tighter">{lives}</span>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="w-1 h-12 bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
            <div>
                <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-1 leading-none">Score points</p>
                <span className="text-white font-black text-3xl tracking-tighter tabular-nums">{score}</span>
            </div>
        </div>
      </div>

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