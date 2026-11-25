import React, { useRef } from 'react';
import { Cpu, LogIn, Play, ShieldCheck, UserPlus } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { HeroAutomation3D } from './HeroAutomation3D';
import { LandingFeatures } from './LandingFeatures';
import { LandingAuthors } from './LandingAuthors';

interface Props {
  onEnterGuest: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

const NAV_LINKS = [
  { label: 'Objetivo', href: '#objetivo' },
  { label: 'Funciones', href: '#funciones' },
  { label: 'Acceso', href: '#acceso' },
  { label: 'Autores', href: '#autores' },
] as const;

export const LandingPage: React.FC<Props> = ({ onEnterGuest, onOpenAuth }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      ref={scrollContainerRef}
      className="fixed inset-0 z-40 overflow-y-auto overflow-x-hidden bg-[#030712] text-slate-100 scroll-smooth select-text"
    >
      {/* Ambient Tech Background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Engineering blueprint line grid */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(56, 189, 248, 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.045) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        {/* Blueprint nodal dot matrix */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(56, 189, 248, 0.22) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        {/* Radial hero glows */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[960px] h-[520px] rounded-full bg-cyan-500/15 blur-[130px]" />
        <div className="absolute top-36 left-[12%] w-[420px] h-[420px] rounded-full bg-indigo-500/15 blur-[120px]" />
        <div className="absolute top-44 right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      {/* Sticky Glass Header Navbar */}
      <header className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a
            href="#inicio"
            onClick={handleScrollTop}
            className="inline-flex items-center focus:outline-none rounded-lg"
            aria-label="Baru Studio - Volver al inicio"
          >
            <BrandLogo size="md" theme="dark" />
          </a>

          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-cyan-300 focus:outline-none focus:text-cyan-300"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onEnterGuest}
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
            >
              Invitado
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="inline-flex items-center px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-100 bg-slate-900/80 border border-slate-700/80 hover:border-slate-500 hover:bg-slate-800/90 transition-all"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="inline-flex items-center px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all"
            >
              Registrarse
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Monumental Centered Hero Section */}
        <section
          id="inicio"
          className="relative pt-6 sm:pt-8 pb-14 sm:pb-20 px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
            {/* Large Detailed Logo Showcase */}
            <div className="mb-4 flex justify-center">
              <BrandLogo size="hero" theme="dark" />
            </div>

            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/85 border border-cyan-500/35 text-cyan-300 text-[11px] font-mono font-semibold tracking-[0.16em] uppercase mb-3.5 shadow-md shadow-cyan-950/50">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>SUITE DE AUTOMATIZACIÓN INDUSTRIAL · WEB 100% EN TIEMPO REAL</span>
            </div>

            {/* Dramatic H1 */}
            <h1 className="font-display text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-center max-w-5xl mx-auto leading-[1.06] text-white">
              Diseña, programa y valida{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
                automatismos industriales en vivo
              </span>
            </h1>

            {/* Concise Subheadline */}
            <p className="mt-3.5 max-w-3xl mx-auto text-sm sm:text-base lg:text-lg text-slate-300/90 leading-relaxed">
              Integra esquemas electrotécnicos{' '}
              <span className="text-white font-semibold">CADe_SIMU V4.2</span>, programación{' '}
              <span className="text-white font-semibold">Siemens TIA Portal S7-1200</span>{' '}
              (LAD, SCL y GRAFCET), consola operativa{' '}
              <span className="text-white font-semibold">GEMMA</span> y{' '}
              <span className="text-white font-semibold">Gemelos Digitales 2D</span>{' '}
              directamente en tu navegador, sin instalar máquinas virtuales.
            </p>

            {/* Primary Action CTA Row */}
            <div className="mt-5 flex flex-col items-center gap-2.5 w-full">
              <div className="flex flex-wrap items-center justify-center gap-3.5">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-[0_0_32px_-6px_rgba(34,211,238,0.65)] transition-all duration-200 hover:-translate-y-0.5"
                >
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Crear cuenta gratis</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm sm:text-base font-semibold text-white bg-slate-900/80 backdrop-blur-md border border-slate-700/90 hover:border-cyan-400/50 hover:bg-slate-800/90 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                  <span>Iniciar sesión</span>
                </button>

                <button
                  type="button"
                  onClick={onEnterGuest}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm sm:text-base font-semibold text-cyan-200 bg-transparent border border-cyan-500/45 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  <span>Entrar como invitado</span>
                </button>
              </div>

              <p className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Simulación libre inmediata · Guardar, importar y exportar con cuenta
                </span>
              </p>
            </div>

            {/* Giant Centered 3D Stage */}
            <div className="mt-7 max-w-5xl mx-auto w-full">
              <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/80 shadow-[0_0_80px_-20px_rgba(14,165,233,0.4)] overflow-hidden">
                <HeroAutomation3D className="w-full h-[440px] sm:h-[500px] lg:h-[540px]" />
              </div>
            </div>
          </div>
        </section>

        {/* Product Value, Features & Guest vs Account Comparison */}
        <LandingFeatures onEnterGuest={onEnterGuest} onOpenAuth={onOpenAuth} />

        {/* Authors Showcase */}
        <LandingAuthors />
      </main>

      {/* Final Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-8 px-4 text-center">
        <p className="text-xs sm:text-sm text-slate-500">
          Desarrollado por Scibaru AI.
        </p>
      </footer>
    </div>
  );
};
