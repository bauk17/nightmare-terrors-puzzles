"use client";

import React from 'react';
import Link from 'next/link';

const SensshinRitual = () => {
  return (
    <div className="bg-[#0e0e0e] text-white min-h-screen font-sans overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 right-0 w-125 h-125 bg-[#5a2a9c]/10 rounded-full blur-[120px] -z-10"></div>
      
      <nav className="p-8 flex justify-between items-center">
        <Link href="/" className="group flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[#b889ff] transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-[#adaaaa] group-hover:text-white transition-colors">Sever Connection</span>
        </Link>
        <div className="flex items-center gap-4 bg-[#20201f] px-6 py-2 rounded-full border border-white/5">
           <span className="material-symbols-outlined text-[#b889ff] text-sm">psychology</span>
           <span className="text-xs font-black uppercase tracking-tighter">Psychic Awareness: Level 04</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 pt-12">
        {/* Lado Esquerdo: Info e Lore */}
        <div className="lg:col-span-4 flex flex-col justify-center">
          <span className="text-[#b889ff] font-black text-xs uppercase tracking-[0.3em] mb-4">Mind Protocol</span>
          <h1 className="text-7xl font-black italic uppercase leading-none mb-6">Sens<br/>shin</h1>
          <p className="text-[#adaaaa] text-lg leading-relaxed mb-8">
            The mind is a cage of its own making. Align the psychic conduits before the Golden Alakazam shatters your focus.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-[#fde800]"></span>
              LOGIC BASED PUZZLES
            </div>
            <div className="flex items-center gap-4 text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-[#b889ff]"></span>
              SPATIAL REASONING
            </div>
          </div>
        </div>

        {/* Lado Direito: "Tabuleiro" de Jogo */}
        <div className="lg:col-span-8 relative">
          <div className="aspect-square bg-[#131313] rounded-3xl border border-white/10 p-8 flex items-center justify-center relative overflow-hidden">
            {/* Círculos Concêntricos Estilo Mandala */}
            <div className="absolute w-[80%] h-[80%] border border-[#b889ff]/10 rounded-full animate-[spin_20s_linear_infinite]"></div>
            <div className="absolute w-[60%] h-[60%] border border-[#fde800]/10 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
            
            <div className="z-10 text-center">
              <div className="w-32 h-32 mx-auto mb-6 bg-linear-to-t from-[#5a2a9c] to-[#b889ff] rounded-2xl rotate-45 flex items-center justify-center shadow-[0_0_30px_rgba(184,137,255,0.4)]">
                 <span className="material-symbols-outlined text-5xl text-white -rotate-45">auto_awesome</span>
              </div>
              <button className="bg-white text-black font-black px-12 py-4 rounded-full text-sm tracking-widest hover:bg-[#b889ff] hover:text-white transition-all">
                EXPAND CONSCIOUSNESS
              </button>
            </div>
          </div>
          
          {/* Status Flutuantes */}
          <div className="absolute -bottom-6 -right-6 bg-[#fde800] text-black p-6 rounded-2xl shadow-2xl rotate-3">
             <p className="text-[10px] font-black uppercase tracking-widest">Thought Delay</p>
             <p className="text-2xl font-black">1.4ms</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SensshinRitual;