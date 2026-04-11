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
const STEP_DELAY = 205; 
const SPAWN_INTERVAL_MS = 1500; 
const DEAD_ZONE_RADIUS = 9; 

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

  const playerRef = useRef<Player>({
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
  const scoreRef = useRef<number>(0);

  // Cache de Estrelas (Aumentado para 400 e com cores variadas)
  const starsRef = useRef<Array<{ x: number; y: number; size: number; alpha: number; phase: number; color: string }>>([]);

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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === "Escape" && !gameOver) setIsPaused(prev => !prev);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationFrameId: number;

    const gameLoop = (currentTime: number) => {
      if (gameStartTimeRef.current === null) gameStartTimeRef.current = currentTime;
      if (!gameOver && !isPaused) update(currentTime);
      draw(ctx);
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const update = (currentTime: number) => {
      const player = playerRef.current;
      const keys = keysRef.current;
      const elapsed = currentTime - (gameStartTimeRef.current || currentTime);

      if (hitEffect > 0) setHitEffect(prev => Math.max(0, prev - 0.05));

      let canMove = false;
      let startWaves = false;

      if (elapsed < 1000) {
        if (statusText !== "STUNNED...") setStatusText("STUNNED...");
      } else if (elapsed < 2000) {
        canMove = true;
        const rem = ((2000 - elapsed) / 1000).toFixed(1);
        if (statusText !== `WAVE IN: ${rem}s`) setStatusText(`WAVE IN: ${rem}s`);
      } else {
        canMove = true;
        startWaves = true;
        if (statusText !== "") setStatusText("");
      }

      player.visualX += (player.gridX * TILE_SIZE - player.visualX) * 0.25;
      player.visualY += (player.gridY * TILE_SIZE - player.visualY) * 0.25;

      const dist = Math.abs(player.gridX * TILE_SIZE - player.visualX) + Math.abs(player.gridY * TILE_SIZE - player.visualY);
      player.isMoving = dist > 0.5;

      if (!player.isMoving && canMove) {
        let nX = player.gridX, nY = player.gridY;
        if (keys['arrowup'] || keys['w']) nY--; 
        else if (keys['arrowdown'] || keys['s']) nY++;
        if (keys['arrowleft'] || keys['a']) nX--; 
        else if (keys['arrowright'] || keys['d']) nX++;

        const isInsideMap = nX >= 0 && nX < MAP_SIZE && nY >= 0 && nY < MAP_SIZE;
        const distFromCenter = Math.max(Math.abs(nX - MAP_RADIUS), Math.abs(nY - MAP_RADIUS));

        if (isInsideMap && (nX !== player.gridX || nY !== player.gridY)) {
          if (distFromCenter >= DEAD_ZONE_RADIUS) {
            player.health = 0;
            setLives(0);
            setHitEffect(1.0);
            setGameOver(true);
            return;
          }
          if (nX === MAP_RADIUS && nY === MAP_RADIUS) return;

          player.gridX = nX; 
          player.gridY = nY;
          player.isMoving = true;
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
      if (hitEffect > 0) {
        const grad = ctx.createRadialGradient(
          CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.2,
          CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.6
        );
        grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
        grad.addColorStop(1, `rgba(180, 0, 0, ${hitEffect})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      if (statusText && !isPaused) {
        ctx.fillStyle = "#ff1e4b"; ctx.font = "bold 24px monospace"; ctx.textAlign = "center";
        ctx.fillText(statusText, CANVAS_WIDTH / 2, 80);
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameOver, isPaused, statusText, hitEffect]);

  return (
    <div className="relative flex items-center justify-center w-full h-screen bg-[#020000] font-mono overflow-hidden">
      <button onClick={() => router.push('/')} className="absolute top-8 right-8 z-50 p-3 bg-white/5 border border-white/10 rounded-full text-white active:scale-90 hover:bg-white/10 transition-colors">
        <MdClose className="text-2xl" />
      </button>

      {isPaused && !gameOver && (
        <div className="absolute inset-0 z-60 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2">Game Paused</h2>
            <div className="w-24 h-1 bg-rose-600 mb-10 shadow-[0_0_15px_#e11d48]"></div>
            <div className="flex gap-6">
              <button onClick={() => setIsPaused(false)} className="group flex flex-col items-center gap-2">
                <div className="w-16 h-16 flex items-center justify-center bg-white text-black rounded-full group-hover:bg-rose-600 group-hover:text-white transition-all group-active:scale-90"><MdPlayArrow className="text-4xl" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Resume</span>
              </button>
              <button onClick={resetGame} className="group flex flex-col items-center gap-2">
                <div className="w-16 h-16 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-full group-hover:bg-white/20 transition-all group-active:scale-90"><MdRefresh className="text-3xl" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Restart</span>
              </button>
              <button onClick={() => router.push('/')} className="group flex flex-col items-center gap-2">
                <div className="w-16 h-16 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-full group-hover:bg-rose-900/40 transition-all group-active:scale-90"><MdHome className="text-3xl" /></div>
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

      <div className="absolute top-8 left-8 z-20 flex flex-col gap-4 pointer-events-none text-white">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-rose-600 shadow-[0_0_10px_#f43f5e]"></div>
          <div><p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest leading-none mb-1">Lifes</p><span className="font-black text-3xl">{lives}</span></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-white"></div>
          <div><p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-none mb-1">Score</p><span className="font-black text-3xl tabular-nums">{score}</span></div>
        </div>
      </div>

      <div className="relative p-1 bg-white/5 rounded-3xl">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-2xl bg-[#010005] shadow-2xl" />
      </div>

      <p className="absolute bottom-8 text-neutral-600 text-[10px] uppercase tracking-[0.4em] font-bold">
        Move: [WASD / ARROWS] • Pause: [ESC]
      </p>
    </div>
  );
}