"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { MdElectricBolt, MdDarkMode } from "react-icons/md";
import { GiSpoon } from "react-icons/gi";
import { FiBookOpen, FiGithub } from "react-icons/fi"; // Adicionado FiGithub

// Dados dos Rituais...
const RITUALS = [
  {
    id: 'kitsune',
    title: 'Kitsune',
    tag: 'Kairiki Illusion Minigame',
    description: 'Practice the illusion of Kitsune Terror. Walk against the Kairiki ground punches to avoid get hit by the shockwave.',
    img: './zoroark.png',
    color: 'text-rose-400',
    bgGradient: 'from-rose-400/20',
    link: '/minigames/kitsune',
    btnClass: 'bg-black text-rose-400 border border-rose-400 shadow-[0_10px_30px_rgba(251,113,133,0.3)]',
    indicatorColor: 'bg-rose-500 shadow-[0_0_12px_#fb7185]',
    activeBorder: 'border-rose-500',
    activeBg: 'bg-rose-500/10',
    activeText: 'text-rose-400'
  },
  {
    id: 'raito',
    title: 'Raito',
    tag: 'Electric Dance Minigame',
    description: 'Practice the electric dance of Raito Terror. Walk against the electric field to avoid get hit by the lightning strikes.',
    img: './raito.png',
    color: 'text-blue-400',
    bgGradient: 'from-blue-400/20',
    link: '/minigames/raito',
    btnClass: 'bg-white text-blue-600 shadow-[0_10px_30px_rgba(59,130,246,0.4)]',
    indicatorColor: 'bg-blue-500 shadow-[0_0_12px_#3b82f6]',
    activeBorder: 'border-blue-500',
    activeBg: 'bg-blue-500/10',
    activeText: 'text-blue-400'
  },
  {
    id: 'seishin',
    title: 'Seishin',
    tag: 'Seishin\'s turn dance Minigame',
    description: 'Practice the psychic dance of Senshin Terror. Step on the right tile at the right time to master the dance and avoid the psychic backlash.',
    img: './senshinn.png',
    color: 'text-yellow-400',
    bgGradient: 'from-yellow-400/20',
    link: '/minigames/seishin',
    btnClass: 'bg-violet-700 text-black border-2 border-emerald-400 shadow-[0_10px_30px_rgba(167,139,250,0.4)]',
    indicatorColor: 'bg-violet-600 shadow-[0_0_12px_#7c3aed]',
    activeBorder: 'border-violet-600',
    activeBg: 'bg-violet-600/10',
    activeText: 'text-violet-400'
  }
];

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);

  const nextSlide = () => setActiveSlide((prev) => (prev + 1) % RITUALS.length);
  const prevSlide = () => setActiveSlide((prev) => (prev - 1 + RITUALS.length) % RITUALS.length);

  const current = RITUALS[activeSlide];

  return (
    <div className="bg-[#0e0e0e] text-white min-h-screen selection:bg-rose-400 selection:text-black">
      
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-20 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-2xl font-black italic text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)] tracking-tighter uppercase">
          PokeTerrorPuzzles
        </div>
        <div className="hidden md:flex items-center space-x-8">
          <NavLink label="Rituals" active />
        </div>
        <div className="flex items-center gap-4">
           {/* Versão alternativa do botão no Topo caso prefira */}
           <a 
             href="https://github.com/bauk17" 
             target="_blank" 
             rel="noopener noreferrer"
             className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-neutral-400 hover:text-white"
           >
             <FiGithub className="text-xl" />
             <span className="text-xs font-bold uppercase tracking-widest">bauk17</span>
           </a>
        </div>
      </nav>

      {/* Side Navigation */}
      <aside className="fixed left-0 top-0 h-full flex flex-col pt-24 pb-8 bg-neutral-900 w-72 rounded-r-[3rem] shadow-2xl z-40 border-r border-white/5">
        <div className="px-8 mb-10">
          <h2 className="text-violet-400 text-sm font-medium tracking-wide uppercase">Nightmare Terrors</h2>
          <p className="text-neutral-500 text-xs">Dance Minigames</p>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {RITUALS.map((ritual, index) => (
            <SideNavItem 
              key={ritual.id}
              icon={ritual.id === 'kitsune' ? MdDarkMode : ritual.id === 'raito' ? MdElectricBolt : GiSpoon} 
              label={ritual.title} 
              active={activeSlide === index} 
              onClick={() => setActiveSlide(index)}
              hoverColor={ritual.id === 'kitsune' ? "hover:text-rose-500" : ritual.id === 'raito' ? "hover:text-blue-400" : "hover:text-violet-500"}
              activeStyles={{
                border: ritual.activeBorder,
                bg: ritual.activeBg,
                text: ritual.activeText
              }}
            />
          ))}
          <div className="my-4 border-t border-white/5 mx-6"></div>
          <SideNavItem 
            icon={FiBookOpen} 
            label="Manuals" 
            hoverColor="hover:text-white"
            activeStyles={{ border: 'border-white', bg: 'bg-white/5', text: 'text-white' }}
          />
        </div>

        {/* GitHub Link na Base da Sidebar */}
        <div className="px-6 mt-auto">
          <a 
            href="https://github.com/bauk17"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-black/40 hover:bg-black/60 border border-white/5 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-800 rounded-lg group-hover:text-rose-400 transition-colors">
                <FiGithub className="text-xl" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-tighter">Developer</span>
                <span className="text-sm font-black italic uppercase tracking-widest">bauk17</span>
              </div>
            </div>
            <span className="text-neutral-600 group-hover:text-white transition-colors">↗</span>
          </a>
        </div>
      </aside>

      <main className="lg:ml-72 pt-20">
        <section className="relative h-[85vh] min-h-175 w-full overflow-hidden">
          <div className="relative h-full w-full">
             {RITUALS.map((ritual, idx) => (
               <div 
                 key={ritual.id}
                 className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === activeSlide ? 'opacity-40' : 'opacity-0'}`}
               >
                 <img src={ritual.img} className="w-full h-full object-cover scale-90" alt={ritual.title} />
                 <div className={`absolute inset-0 bg-linear-to-l ${ritual.bgGradient} to-transparent blur-3xl opacity-30`}></div>
               </div>
             ))}

            <div className="absolute inset-0 bg-linear-to-r from-[#0e0e0e] via-[#0e0e0e]/40 to-transparent z-20"></div>
            <div className="absolute inset-0 bg-linear-to-t from-[#0e0e0e] via-transparent to-transparent z-20"></div>

            <div className="relative h-full flex flex-col justify-center px-12 md:px-24 z-30">
              <div className="mb-4">
                <span className="px-4 py-1.5 rounded-full bg-violet-900/40 text-violet-200 text-xs font-bold tracking-widest uppercase border border-violet-500/30 transition-all duration-500">
                  {current.tag}
                </span>
              </div>
              <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white mb-2 -ml-1 transition-all duration-500 uppercase italic">
                {current.title}
              </h1>
              <p className="text-neutral-300 text-xl md:text-2xl font-medium max-w-xl mb-10 leading-relaxed italic opacity-80">
                {current.description}
              </p>
              
              <div className="flex items-center gap-6">
                <Link 
                  href={current.link} 
                  className={`px-10 py-5 rounded-full font-black text-lg hover:scale-105 active:scale-95 transition-all duration-500 uppercase tracking-widest ${current.btnClass}`}
                >
                  Enter Minigame
                </Link>
                <button className="p-5 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-all">
                  <span className="material-symbols-outlined">info</span>
                </button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4">
            {RITUALS.map((ritual, idx) => (
              <div 
                key={ritual.id}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  idx === activeSlide ? `w-12 ${ritual.indicatorColor}` : 'w-12 bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="absolute right-12 bottom-12 z-40 flex gap-4">
            <CarouselBtn icon="<<" onClick={prevSlide} />
            <CarouselBtn icon=">>" onClick={nextSlide} />
          </div>
        </section>
      </main>
    </div>
  );
}

const NavLink = ({ label, active = false }: { label: string; active?: boolean }) => (
  <a className={`${active ? 'text-rose-400 border-b-2 border-rose-400 pb-1' : 'text-neutral-400 hover:text-rose-300'} font-bold tracking-tighter transition-all duration-300 uppercase`} href="#">
    {label}
  </a>
);

const SideNavItem = ({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick, 
  hoverColor,
  activeStyles 
}: { 
  icon: any; 
  label: string; 
  active?: boolean; 
  onClick?: () => void; 
  hoverColor: string;
  activeStyles: { border: string, bg: string, text: string }
}) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-6 py-4 transition-all group border-l-4 ${
      active 
      ? `${activeStyles.bg} ${activeStyles.text} ${activeStyles.border} translate-x-2` 
      : `border-transparent text-neutral-500 hover:bg-neutral-800 ${hoverColor}`
    }`}
  >
    <Icon className={`text-lg transition-colors ${active ? activeStyles.text : `group-hover:text-inherit`}`} />
    <span className="text-sm font-medium tracking-wide uppercase">{label}</span>
  </button>
);

const CarouselBtn = ({ icon, onClick }: { icon: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 text-white"
  >
    <span className="material-symbols-outlined text-lg">{icon}</span>
  </button>
);