import React from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  Check,
  Cloud,
  Code2,
  Cpu,
  Eye,
  Factory,
  FileArchive,
  FileCheck2,
  Gauge,
  Layers,
  Lock,
  LogIn,
  Play,
  Share2,
  ShieldAlert,
  Sparkles,
  Terminal,
  UserPlus,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';

interface LandingFeaturesProps {
  onEnterGuest: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

interface MetricCard {
  value: string;
  label: string;
  detail: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}

const METRIC_CARDS: MetricCard[] = [
  {
    value: '8 Prácticas',
    label: 'Currículo Progresivo',
    detail: 'Nivel 1 → 8 progresivos, hasta Embotelladora GEMMA',
    tag: 'LABS 01–08',
    icon: Layers,
    accentClass: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  },
  {
    value: '50 Networks',
    label: 'Bloque Principal OB1',
    detail: 'OB1 Real S7-1200 con 126 variables IEC y 0 errores SCL',
    tag: 'IEC 61131-3',
    icon: Cpu,
    accentClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    value: '3 Lenguajes',
    label: 'Motor Sincronizado',
    detail: 'LAD · SCL · GRAFCET sincronizados con Gafas Online',
    tag: 'LIVE MONITOR',
    icon: Code2,
    accentClass: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  },
  {
    value: '100% Compatible',
    label: 'Interoperabilidad Real',
    detail: 'Exportación Multi-Zona .cad V4.2 + Paquetes .zip TIA V21',
    tag: 'CAD / TIA V21',
    icon: FileCheck2,
    accentClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
];

export const LandingFeatures: React.FC<LandingFeaturesProps> = ({
  onEnterGuest,
  onOpenAuth,
}) => {
  return (
    <div className="relative z-10 w-full">
      {/* =====================================================================
          SECCIÓN 1: #objetivo — OBJETIVO & PROPUESTA DE VALOR
      ===================================================================== */}
      <section
        id="objetivo"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24 border-t border-slate-800/70"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end mb-14">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-mono text-xs uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5" />
              <span>Propósito de Ingeniería</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]">
              Automatización industrial{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300 bg-clip-text text-transparent">
                sin barreras de instalación
              </span>
            </h2>
          </div>

          <div className="lg:col-span-5">
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Baru Studio unifica esquemas eléctricos y electroneumáticos{' '}
              <span className="font-mono text-cyan-300 text-sm">CADe_SIMU</span>, programación de PLC{' '}
              <span className="font-mono text-cyan-300 text-sm">Siemens TIA Portal S7-1200</span>{' '}
              (LAD, SCL y GRAFCET), supervisión industrial GEMMA y Gemelos Digitales de planta 2D
              interactivos en una única plataforma web en la nube, lista al instante para
              estudiantes de ingeniería, laboratorios y especialistas en automatización.
            </p>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {METRIC_CARDS.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.value}
                className="group relative rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-6 transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-900/85 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center ${metric.accentClass}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-slate-400 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
                    {metric.tag}
                  </span>
                </div>

                <div className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
                  {metric.value}
                </div>
                <div className="font-mono text-xs uppercase tracking-wider text-cyan-400/90 mb-2.5">
                  {metric.label}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{metric.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          SECCIÓN 2: #funciones — BENTO GRID DE 6 CAPACIDADES DE INGENIERÍA
      ===================================================================== */}
      <section
        id="funciones"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24 border-t border-slate-800/70"
      >
        <div className="max-w-3xl mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700/80 bg-slate-900/80 text-cyan-300 font-mono text-xs uppercase tracking-widest">
            <Workflow className="w-3.5 h-3.5" />
            <span>Arquitectura del Entorno</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Seis capacidades de laboratorio industrial en tu navegador
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Desde la lógica cableada trifásica hasta la depuración en vivo del OB1 y exportación a
            hardware real Siemens.
          </p>
        </div>

        {/* 6-Column Balanced Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
          {/* Card 1 (Wide): Esquemas CADe_SIMU V4.2 + Sonda Multímetro Fluke-87V */}
          <article className="md:col-span-2 lg:col-span-4 relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-6 sm:p-7 flex flex-col justify-between transition-colors hover:border-cyan-500/40">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="inline-flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                    FLUKE-87V LIVE PROBE
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-400">400V 3~ · 24V DC · KCL</span>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-bold text-white mb-3">
                Esquemas CADe_SIMU V4.2 + Sonda Multímetro Fluke-87V
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                Diseña circuitos de fuerza <span className="font-mono text-slate-200">400V 3~</span>,
                control <span className="font-mono text-slate-200">24V DC</span> y electroneumática
                con precisión nodal. Toca cualquier conductor o borna en plena simulación para leer
                voltaje RMS/DC, corriente por leyes de Kirchhoff (KCL) y potencia activa en vivo.
              </p>
            </div>

            {/* Micro-instrumento visual de lectura nodal */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2.5">
                <div className="font-mono text-[10px] text-slate-500 uppercase">Tensión Nodal</div>
                <div className="font-mono text-sm sm:text-base font-bold text-amber-400">398.4 V AC</div>
              </div>
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2.5">
                <div className="font-mono text-[10px] text-slate-500 uppercase">Corriente KCL</div>
                <div className="font-mono text-sm sm:text-base font-bold text-cyan-400">4.82 A</div>
              </div>
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2.5">
                <div className="font-mono text-[10px] text-slate-500 uppercase">Lazo Control</div>
                <div className="font-mono text-sm sm:text-base font-bold text-emerald-400">24.0 V DC</div>
              </div>
            </div>
          </article>

          {/* Card 2: TIA Portal S7-1200 Integrado */}
          <article className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-6 sm:p-7 flex flex-col justify-between transition-colors hover:border-emerald-500/40">
            <div>
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
                <span className="font-mono text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                  GAFAS ONLINE
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-white mb-3">
                TIA Portal S7-1200 Integrado (LAD / SCL / GRAFCET)
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Depura segmentos con Gafas Online verdes en tiempo real, utiliza el transpilador
                automático <span className="font-mono text-emerald-300">LAD → SCL</span>, programa
                temporizadores <span className="font-mono text-slate-200">TON / TOF</span> y
                gestiona tu tabla completa de PLC Tags.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {['KOP / LAD', 'SCL Estructurado', 'GRAFCET IEC', 'PLC Tags'].map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[11px] px-2.5 py-1 rounded-md bg-slate-950/90 border border-slate-800 text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>

          {/* Card 3: Consola GEMMA Profesional */}
          <article className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-6 sm:p-7 flex flex-col justify-between transition-colors hover:border-cyan-500/40">
            <div>
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <Terminal className="w-5 h-5" />
                </div>
                <span className="font-mono text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md">
                  GUÍA GEMMA
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-white mb-3">
                Consola GEMMA Profesional
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Control de estados de marcha y parada con paro de emergencia{' '}
                <span className="font-mono text-rose-300">D1</span> con enclavamiento, rearme
                automático <span className="font-mono text-cyan-300">A6</span>, ciclo a ciclo{' '}
                <span className="font-mono text-cyan-300">A2</span>, etapa a etapa{' '}
                <span className="font-mono text-cyan-300">F5</span> y jog manual{' '}
                <span className="font-mono text-cyan-300">F4</span>.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-1.5">
              {['AU', 'CL', 'ET', 'MAN', 'PE', 'Rearme'].map((btn) => (
                <span
                  key={btn}
                  className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded border ${
                    btn === 'PE'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-slate-950/90 border-slate-700 text-slate-200'
                  }`}
                >
                  {btn}
                </span>
              ))}
            </div>
          </article>

          {/* Card 4 (Wide): Gemelos Digitales Planta 2D en Tiempo Real */}
          <article className="md:col-span-2 lg:col-span-4 relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-6 sm:p-7 flex flex-col justify-between transition-colors hover:border-sky-500/40">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="inline-flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                    <Factory className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-md">
                    DIGITAL TWIN 2D ENGINE
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-400">60 FPS Física · Sensores I/O</span>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-bold text-white mb-3">
                Gemelos Digitales Planta 2D en Tiempo Real
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                Observa tus programas mover maquinaria física virtualizada en la misma pantalla:
                Cinta Clasificadora, Tanque con Bomba e Histéresis, Estación Neumática{' '}
                <span className="font-mono text-sky-300">A+/A-</span> y la Embotelladora
                Electroneumática completa de 3 estaciones y 5 cilindros{' '}
                <span className="font-mono text-sky-300">A, B, C, E, G</span> +{' '}
                <span className="font-mono text-sky-300">D+/F+</span>.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { name: 'Cinta Clasificadora', code: 'CONV-01' },
                { name: 'Tanque + Histéresis', code: 'TANK-PID' },
                { name: 'Estación A+/A-', code: 'PNEU-02' },
                { name: 'Embotelladora 3 Est.', code: 'BOTTLE-5C' },
              ].map((plant) => (
                <div
                  key={plant.code}
                  className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2"
                >
                  <div className="font-mono text-[10px] text-sky-400">{plant.code}</div>
                  <div className="text-xs font-medium text-slate-200 truncate">{plant.name}</div>
                </div>
              ))}
            </div>
          </article>

          {/* Card 5: Exportación Multi-Zona .cad e Importación Universal */}
          <article className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-6 sm:p-7 flex flex-col justify-between transition-colors hover:border-indigo-500/40">
            <div>
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <FileArchive className="w-5 h-5" />
                </div>
                <span className="font-mono text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                  ISO 7200 · TIA V21
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-white mb-3">
                Exportación Multi-Zona .cad e Importación Universal
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Descarga en un único archivo <span className="font-mono text-indigo-300">.cad</span>{' '}
                tu plano de potencia/PLC + Ladder + GRAFCET con cajetín normalizado ISO 7200, o
                importa cualquier <span className="font-mono text-indigo-300">.cad</span> para
                auto-ensamblar lógica LAD, SCL y GRAFCET al instante.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300">
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">.CAD V4.2</span>
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">.ZIP TIA V21</span>
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">.SCL / .XML</span>
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">.JSON</span>
            </div>
          </article>

          {/* Card 6: Inyector de Averías, Modo Examen y Nube Supabase */}
          <article className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-6 sm:p-7 flex flex-col justify-between transition-colors hover:border-rose-500/40">
            <div>
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="font-mono text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                  DIAGNÓSTICO & CLOUD
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-white mb-3">
                Inyector de Averías, Modo Examen y Nube Supabase
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Entrena el diagnóstico eléctrico inyectando fallas reales de bobinas, sensores o
                contactos, valida competencias con Modo Examen calificado persistente, guarda tus
                proyectos en Supabase y compártelos mediante enlaces públicos{' '}
                <span className="font-mono text-cyan-300">?share=</span>.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 font-mono">
                <Wrench className="w-3.5 h-3.5 text-rose-400" />
                Averías
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 font-mono">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Modo Examen
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 font-mono">
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                Supabase Sync
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 font-mono">
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                ?share=
              </span>
            </div>
          </article>
        </div>
      </section>

      {/* =====================================================================
          SECCIÓN 3: #acceso — COMPARATIVA MODO INVITADO VS. CUENTA GRATUITA
      ===================================================================== */}
      <section
        id="acceso"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24 border-t border-slate-800/70"
      >
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-mono text-xs uppercase tracking-widest">
            <Activity className="w-3.5 h-3.5" />
            <span>Acceso Flexible</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Prueba al instante o desbloquea el ecosistema completo gratis
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Sin tarjetas de crédito ni instaladores locales. Elige cómo quieres ingresar al
            simulador.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
          {/* Card: Acceso Invitado (Inmediato) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-7 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  Sin Registro
                </span>
                <span className="font-mono text-xs text-slate-400">Sesión Efímera</span>
              </div>

              <h3 className="font-display text-2xl font-bold text-white mb-2">
                Acceso Invitado (Inmediato)
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Explora la potencia del motor de simulación eléctrica, PLC y Gemelo Digital 2D con
                un solo clic.
              </p>

              <div className="space-y-3.5 mb-8">
                <div className="flex items-start gap-3 text-sm text-slate-200">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Simulador CADe_SIMU + TIA Portal S7-1200 + Planta 2D</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-200">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>8 prácticas completas listas para ejecutar (Nivel 1 → 8)</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-200">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Multímetro Fluke-87V en vivo y Consola GEMMA interactiva</span>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-start gap-3 text-sm text-slate-400">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-300 font-medium">Bloqueado:</strong> Guardado de
                      proyectos en la nube Supabase
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-slate-400">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-300 font-medium">Bloqueado:</strong> Importar
                      archivos y Exportar <span className="font-mono">.cad</span> /{' '}
                      <span className="font-mono">.zip</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onEnterGuest}
              className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 hover:border-slate-600 text-white font-display font-semibold text-sm sm:text-base transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 text-cyan-400" />
              <span>Entrar como invitado</span>
            </button>
          </div>

          {/* Card: Cuenta Gratuita Baru Studio (Recomendado) */}
          <div className="relative rounded-2xl border border-cyan-400/50 bg-gradient-to-b from-slate-900/90 via-slate-900/75 to-slate-950/90 backdrop-blur-md p-7 sm:p-8 flex flex-col justify-between shadow-[0_0_50px_-15px_rgba(34,211,238,0.3)]">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-400/40">
                  <Sparkles className="w-3.5 h-3.5" />
                  Recomendado · 100% Gratis
                </span>
                <span className="font-mono text-xs text-emerald-400">Acceso Total</span>
              </div>

              <h3 className="font-display text-2xl font-bold text-white mb-2">
                Cuenta Gratuita Baru Studio
              </h3>
              <p className="text-sm text-slate-300 mb-6">
                Flujo profesional completo con persistencia en la nube, interoperabilidad CAD/TIA y
                evaluación académica.
              </p>

              <div className="space-y-3.5 mb-8">
                <div className="flex items-start gap-3 text-sm text-slate-100">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold text-white">Todo lo del acceso invitado</strong>{' '}
                    sin restricciones
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-100">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Guardado ilimitado de proyectos en la nube Supabase</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-100">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Importación universal <span className="font-mono text-cyan-300">.cad</span> /{' '}
                    <span className="font-mono text-cyan-300">.xml</span> /{' '}
                    <span className="font-mono text-cyan-300">.scl</span> /{' '}
                    <span className="font-mono text-cyan-300">.json</span>
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-100">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Exportación Multi-Zona <span className="font-mono text-cyan-300">.cad</span> y
                    paquetes <span className="font-mono text-cyan-300">.zip</span> TIA Portal V21
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-100">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Enlaces públicos compartibles{' '}
                    <span className="font-mono text-cyan-300">?share=</span> e historial de
                    exámenes
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-display font-bold text-sm sm:text-base shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Crear cuenta gratis</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 hover:border-cyan-500/40 text-slate-100 font-display font-semibold text-sm sm:text-base transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                <span>Iniciar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
