import React from 'react';
import {
  Award,
  Code2,
  Cpu,
  FlaskConical,
  GraduationCap,
  Sparkles,
  Users,
} from 'lucide-react';

export const LandingAuthors: React.FC = () => {
  return (
    <section
      id="autores"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80"
    >
      {/* Subtle section ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 w-[680px] h-[260px] rounded-full bg-cyan-500/5 blur-3xl"
      />

      <div className="relative max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-cyan-300 text-[11px] font-mono font-semibold tracking-[0.16em] uppercase mb-5 shadow-sm">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>EQUIPO DE INVESTIGACIÓN Y DESARROLLO</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Autores del Proyecto
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
            La convergencia entre ingeniería de software mecatrónico en tiempo real y
            dirección académica especializada en automatización industrial.
          </p>
        </div>

        {/* Two Balanced Dark-Glass Portrait Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
          {/* Card 1: Simón Barrera Ruíz */}
          <article className="group relative flex flex-col rounded-3xl bg-slate-900/65 backdrop-blur-xl border border-slate-800/90 p-7 sm:p-8 shadow-2xl shadow-black/40 transition-all duration-300 hover:border-cyan-500/45 hover:bg-slate-900/80">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity"
            />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-slate-800/80">
              <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-2xl overflow-hidden border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/20 bg-slate-950">
                <img
                  src="/authors/simon-barrera.jpg"
                  alt="Simón Barrera Ruíz"
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>

              <div className="min-w-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold tracking-[0.12em] uppercase mb-2.5">
                  AUTOR PRINCIPAL · ARQUITECTURA &amp; DESARROLLO
                </span>
                <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                  Simón Barrera Ruíz
                </h3>
                <p className="mt-1 text-cyan-400 font-semibold text-sm">
                  Estudiante de Ingeniería Mecatrónica
                </p>
              </div>
            </div>

            <ul className="relative mt-6 space-y-4 text-sm sm:text-[15px] text-slate-300 leading-relaxed flex-1">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span>
                  Fundador de <strong className="text-white font-semibold">Scibaru AI</strong> y
                  arquitecto principal de{' '}
                  <strong className="text-white font-semibold">Baru Studio</strong>.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
                  <Cpu className="w-4 h-4" />
                </span>
                <span>
                  Diseño del motor de co-simulación en tiempo real{' '}
                  <strong className="text-white font-semibold">
                    CADe_SIMU + Siemens S7-1200
                  </strong>
                  , solver nodal eléctrico-neumático y consola{' '}
                  <strong className="text-white font-semibold">GEMMA</strong>.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
                  <Code2 className="w-4 h-4" />
                </span>
                <span>
                  Arquitectura de gemelos digitales 2D/3D y compilador{' '}
                  <strong className="text-white font-semibold">IEC 61131-3</strong> nativo en
                  navegador.
                </span>
              </li>
            </ul>
          </article>

          {/* Card 2: Juan Carlos Mena Moreno */}
          <article className="group relative flex flex-col rounded-3xl bg-slate-900/65 backdrop-blur-xl border border-slate-800/90 p-7 sm:p-8 shadow-2xl shadow-black/40 transition-all duration-300 hover:border-emerald-500/45 hover:bg-slate-900/80">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity"
            />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-slate-800/80">
              <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-2xl overflow-hidden border-2 border-emerald-400/50 shadow-lg shadow-emerald-500/20 bg-slate-950">
                <img
                  src="/authors/juan-carlos-mena.jpg"
                  alt="Juan Carlos Mena Moreno"
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>

              <div className="min-w-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold tracking-[0.12em] uppercase mb-2.5">
                  COAUTOR · DIRECCIÓN &amp; AUTOMATIZACIÓN INDUSTRIAL
                </span>
                <h3 className="font-display text-2xl font-bold text-white tracking-tight">
                  Juan Carlos Mena Moreno
                </h3>
                <p className="mt-1 text-emerald-400 font-semibold text-sm">
                  Director de Ingeniería Electrónica y Telecomunicaciones
                </p>
              </div>
            </div>

            <ul className="relative mt-6 space-y-3.5 text-sm sm:text-[15px] text-slate-300 leading-relaxed flex-1">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                  <GraduationCap className="w-4 h-4" />
                </span>
                <span>
                  Ingeniero Electricista —{' '}
                  <span className="text-slate-200">Universidad Autónoma de Occidente</span>.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                  <Award className="w-4 h-4" />
                </span>
                <span>
                  Especialista en Automatización de Equipos y Procesos Industriales —{' '}
                  <span className="text-slate-200">Universidad Autónoma de Occidente</span>.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                  <GraduationCap className="w-4 h-4" />
                </span>
                <span>
                  Magíster en Ingeniería, énfasis en Electrónica —{' '}
                  <span className="text-slate-200">Pontificia Universidad Javeriana</span>.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                  <FlaskConical className="w-4 h-4" />
                </span>
                <span>
                  Investigación en{' '}
                  <strong className="text-white font-semibold">Automatización Industrial</strong> ·
                  Grupo de Investigación en Telemando y Control Distribuido (
                  <strong className="text-white font-semibold">GITCoD</strong>).
                </span>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
};
