import { MdHome, MdPlayArrow, MdRefresh } from 'react-icons/md';
import {
  MAX_PLAYER_STEP_DURATION_MS,
  MIN_PLAYER_STEP_DURATION_MS,
  PLAYER_STEP_DURATION_INCREMENT_MS,
} from './useMovementDuration';
import { PLAYER_STEP_DURATION_MS } from './gameUtils';

type Theme = 'cyan' | 'rose' | 'violet';

type ThemeStyles = {
  divider: string;
  resume: string;
  exit: string;
  slider: string;
};

const themeStyles: Record<Theme, ThemeStyles> = {
  cyan: {
    divider: 'bg-cyan-500 shadow-[0_0_15px_#06b6d4]',
    resume: 'hover:bg-cyan-500',
    exit: 'hover:bg-cyan-900/40',
    slider: 'accent-cyan-400',
  },
  rose: {
    divider: 'bg-rose-600 shadow-[0_0_15px_#e11d48]',
    resume: 'group-hover:bg-rose-600',
    exit: 'group-hover:bg-rose-900/40',
    slider: 'accent-rose-400',
  },
  violet: {
    divider: 'bg-purple-600 shadow-[0_0_15px_#a855f7]',
    resume: 'group-hover:bg-purple-600',
    exit: 'group-hover:bg-rose-600',
    slider: 'accent-purple-400',
  },
};

type MovementDurationControlProps = {
  durationMs: number;
  theme: Theme;
  onChange: (durationMs: number) => void;
};

function MovementDurationControl({ durationMs, theme, onChange }: MovementDurationControlProps) {
  return (
    <div className="mb-8 w-[min(20rem,80vw)] text-left">
      <div className="mb-2 flex items-center justify-between gap-4">
        <label htmlFor="movement-duration" className="text-xs font-bold uppercase tracking-widest text-white/70">
          Velocidade do Jogador
        </label>
        <output htmlFor="movement-duration" className="min-w-16 text-right font-mono text-sm font-bold text-white tabular-nums">
          {durationMs} ms
        </output>
      </div>
      <input
        id="movement-duration"
        type="range"
        min={MIN_PLAYER_STEP_DURATION_MS}
        max={MAX_PLAYER_STEP_DURATION_MS}
        step={PLAYER_STEP_DURATION_INCREMENT_MS}
        value={durationMs}
        onChange={event => onChange(Number(event.currentTarget.value))}
        aria-label="Tempo de movimento por tile em milissegundos"
        className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 ${themeStyles[theme].slider}`}
      />
      <button
        type="button"
        onClick={() => onChange(PLAYER_STEP_DURATION_MS)}
        disabled={durationMs === PLAYER_STEP_DURATION_MS}
        className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-white/60 transition-colors hover:text-white disabled:cursor-default disabled:opacity-40"
        aria-label="Restore default movement time of 150 milliseconds"
      >
        <MdRefresh className="text-sm" /> Restore default
      </button>
    </div>
  );
}

type PauseOverlayProps = {
  theme: Theme;
  durationMs: number;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  onDurationChange: (durationMs: number) => void;
};

export function PauseOverlay({ theme, durationMs, onResume, onRestart, onExit, onDurationChange }: PauseOverlayProps) {
  const styles = themeStyles[theme];

  return (
    <div className="absolute inset-0 z-60 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
        <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2">Game Paused</h2>
        <div className={`w-24 h-1 mb-10 ${styles.divider}`}></div>
        <MovementDurationControl durationMs={durationMs} theme={theme} onChange={onDurationChange} />
        <div className="flex gap-6">
          <button onClick={onResume} className="group flex flex-col items-center gap-2">
            <div className={`w-16 h-16 flex items-center justify-center bg-white text-black rounded-full ${styles.resume} hover:text-white transition-all active:scale-90`}>
              <MdPlayArrow className="text-4xl" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Resume</span>
          </button>
          <button onClick={onRestart} className="group flex flex-col items-center gap-2">
            <div className="w-16 h-16 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-full hover:bg-white/20 transition-all active:scale-90">
              <MdRefresh className="text-3xl" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Restart</span>
          </button>
          <button onClick={onExit} className="group flex flex-col items-center gap-2">
            <div className={`w-16 h-16 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-full ${styles.exit} transition-all active:scale-90`}>
              <MdHome className="text-3xl" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
}

type GameOverOverlayProps = {
  score: number;
  theme: Theme;
  durationMs: number;
  onRestart: () => void;
  onExit: () => void;
  onDurationChange: (durationMs: number) => void;
};

export function GameOverOverlay({ score, theme, durationMs, onRestart, onExit, onDurationChange }: GameOverOverlayProps) {
  return (
    <div className="absolute inset-0 z-70 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl">
      <h1 className="text-6xl font-black text-rose-600 mb-2 italic uppercase">You lost</h1>
      <p className="text-white/50 mb-10 font-bold uppercase tracking-widest">Final Score: {score}</p>
      <MovementDurationControl durationMs={durationMs} theme={theme} onChange={onDurationChange} />
      <div className="flex gap-4">
        <button onClick={onRestart} className="px-10 py-4 bg-emerald-500 text-black font-black rounded-full uppercase text-xs hover:scale-105 transition-transform flex items-center gap-2">
          <MdRefresh className="text-xl" /> Retry
        </button>
        <button onClick={onExit} className="px-10 py-4 bg-white/5 border border-white/10 text-white font-black rounded-full uppercase text-xs hover:bg-white/10 transition-all flex items-center gap-2">
          <MdHome className="text-xl" /> Exit
        </button>
      </div>
    </div>
  );
}

type HudVariant = 'raito' | 'kitsune' | 'seishin';

type GameHudProps = {
  variant: HudVariant;
  lives: number;
  score: number;
};

const hudStyles: Record<HudVariant, { scoreBar: string; scoreLabel: string; scoreTitle: string }> = {
  raito: {
    scoreBar: 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]',
    scoreLabel: 'text-cyan-500',
    scoreTitle: 'Score points',
  },
  kitsune: {
    scoreBar: 'bg-white',
    scoreLabel: 'text-neutral-500',
    scoreTitle: 'Score',
  },
  seishin: {
    scoreBar: 'bg-purple-500 shadow-[0_0_10px_#a855f7]',
    scoreLabel: 'text-purple-500',
    scoreTitle: 'Score',
  },
};

export function GameHud({ variant, lives, score }: GameHudProps) {
  const styles = hudStyles[variant];

  return (
    <div className="absolute top-8 left-8 z-20 flex flex-col gap-4 pointer-events-none text-white">
      <div className="flex items-center gap-3">
        <div className="w-1 h-12 bg-rose-500 shadow-[0_0_10px_#f43f5e]"></div>
        <div>
          <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-1 leading-none">Lifes</p>
          <span className="font-black text-3xl tabular-nums">{lives}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={`w-1 h-12 ${styles.scoreBar}`}></div>
        <div>
          <p className={`text-[10px] ${styles.scoreLabel} font-bold uppercase tracking-widest mb-1 leading-none`}>{styles.scoreTitle}</p>
          <span className="font-black text-3xl tabular-nums">{score}</span>
        </div>
      </div>
    </div>
  );
}