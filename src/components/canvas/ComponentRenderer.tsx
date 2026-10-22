import React from 'react';
import { PlacedComponent } from '../../types/circuit';
import { COMPONENT_CATALOG } from '../../core/components/catalog';
import { SimulationState } from '../../types/simulation';

interface Props {
  component: PlacedComponent;
  gridSize: number;
  isSelected: boolean;
  simulationState: SimulationState;
  onMouseDown?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export const ComponentRenderer: React.FC<Props> = ({
  component,
  gridSize,
  isSelected,
  simulationState,
  onMouseDown,
  onClick
}) => {
  const def = COMPONENT_CATALOG.find(c => c.type === component.type);
  if (!def) return null;

  const posX = component.x * gridSize;
  const posY = component.y * gridSize;
  const width = def.width * gridSize;
  const height = def.height * gridSize;

  // Estados dinámicos de simulación
  const isCoilActive = simulationState.activeCoils.has(component.tag);
  const isCoilTimed = simulationState.activeCoils.has(`${component.tag}:TIMED`);
  const motorState = simulationState.motorStates.get(component.id);
  const pilotState = simulationState.pilotLights.get(component.id);
  const timerState = simulationState.timerStates.get(component.id);

  // Renderizar las formas vectoriales según el tipo de componente (tema de plano técnico claro)
  const renderSymbol = () => {
    switch (component.type) {
      // ----------------------------------------------------
      // ALIMENTACIONES
      // ----------------------------------------------------
      case 'power_l':
      case 'power_n':
      case 'power_pe':
        return (
          <g>
            <circle cx={gridSize} cy={gridSize * 0.8} r={gridSize * 0.4} className="fill-white stroke-slate-900 stroke-2" />
            <text x={gridSize} y={gridSize * 0.95} textAnchor="middle" className="text-xs font-mono font-bold fill-slate-900 select-none">
              {component.tag}
            </text>
            <line x1={gridSize} y1={gridSize * 1.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      case 'power_ln':
        return (
          <g>
            <circle cx={gridSize} cy={gridSize * 0.8} r={gridSize * 0.35} className="fill-white stroke-[#b45309] stroke-2" />
            <text x={gridSize} y={gridSize * 0.95} textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#b45309] select-none">L</text>
            <line x1={gridSize} y1={gridSize * 1.15} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />

            <circle cx={gridSize * 2} cy={gridSize * 0.8} r={gridSize * 0.35} className="fill-white stroke-[#2563eb] stroke-2" />
            <text x={gridSize * 2} y={gridSize * 0.95} textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#2563eb] select-none">N</text>
            <line x1={gridSize * 2} y1={gridSize * 1.15} x2={gridSize * 2} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      case 'power_3phase':
      case 'power_3phase_pe': {
        const labels = component.type === 'power_3phase_pe' ? ['L1', 'L2', 'L3', 'PE'] : ['L1', 'L2', 'L3'];
        return (
          <g>
            <line x1={gridSize * 0.8} y1={gridSize * 0.8} x2={gridSize * (labels.length + 0.2)} y2={gridSize * 0.8} className="stroke-slate-900 stroke-[3] stroke-linecap-round" />
            {labels.map((label, idx) => (
              <g key={label} transform={`translate(${gridSize * (idx + 1)}, 0)`}>
                <circle cx={0} cy={gridSize * 0.8} r={3} className="fill-slate-900" />
                <text x={0} y={gridSize * 0.55} textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-800 select-none">
                  {label}
                </text>
                <line x1={0} y1={gridSize * 0.8} x2={0} y2={height} className="stroke-slate-900 stroke-2" />
              </g>
            ))}
          </g>
        );
      }

      case 'power_dc':
        return (
          <g>
            <line x1={gridSize * 0.6} y1={gridSize * 0.7} x2={gridSize * 1.4} y2={gridSize * 0.7} className="stroke-red-600 stroke-[3]" />
            <text x={gridSize} y={gridSize * 0.5} textAnchor="middle" className="text-xs font-bold fill-red-600 select-none">+</text>
            <line x1={gridSize} y1={gridSize * 0.7} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />

            <line x1={gridSize * 1.7} y1={gridSize * 0.7} x2={gridSize * 2.3} y2={gridSize * 0.7} className="stroke-slate-900 stroke-[2] stroke-dasharray-[3,2]" />
            <text x={gridSize * 2} y={gridSize * 0.5} textAnchor="middle" className="text-xs font-bold fill-slate-900 select-none">-</text>
            <line x1={gridSize * 2} y1={gridSize * 0.7} x2={gridSize * 2} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      // ----------------------------------------------------
      // DISYUNTORES / GUARDAMOTORES
      // ----------------------------------------------------
      case 'breaker_3p': {
        const isOpen = component.state?.isOpen === true;
        return (
          <g>
            <rect x={gridSize * 0.5} y={gridSize * 0.8} width={gridSize * 3} height={gridSize * 2.4} rx={4} className="fill-white/90 stroke-slate-400 stroke-1 shadow-xs" />
            {[1, 2, 3].map((pole) => {
              const cx = gridSize * pole;
              return (
                <g key={pole}>
                  <line x1={cx} y1={0} x2={cx} y2={gridSize * 1.2} className="stroke-slate-900 stroke-2" />
                  {/* Interruptor térmico móvil */}
                  <line
                    x1={cx}
                    y1={gridSize * 1.2}
                    x2={isOpen ? cx - 6 : cx}
                    y2={isOpen ? gridSize * 2.5 : gridSize * 2.8}
                    className="stroke-amber-600 stroke-2 transition-all duration-200"
                  />
                  {/* Símbolo térmico de disparo */}
                  <path d={`M ${cx - 3} ${gridSize * 1.8} L ${cx + 3} ${gridSize * 2.2}`} className="stroke-amber-600 stroke-1.5" />
                  <line x1={cx} y1={gridSize * 2.8} x2={cx} y2={height} className="stroke-slate-900 stroke-2" />
                </g>
              );
            })}
          </g>
        );
      }

      case 'breaker_1p_n': {
        const isOpen = component.state?.isOpen === true;
        return (
          <g>
            <rect x={gridSize * 0.5} y={gridSize * 0.8} width={gridSize * 2} height={gridSize * 2.4} rx={4} className="fill-white/90 stroke-slate-400 stroke-1 shadow-xs" />
            {[1, 2].map((pole) => {
              const cx = gridSize * pole;
              return (
                <g key={pole}>
                  <line x1={cx} y1={0} x2={cx} y2={gridSize * 1.2} className="stroke-slate-900 stroke-2" />
                  <line
                    x1={cx}
                    y1={gridSize * 1.2}
                    x2={isOpen ? cx - 6 : cx}
                    y2={isOpen ? gridSize * 2.5 : gridSize * 2.8}
                    className="stroke-amber-600 stroke-2 transition-all duration-200"
                  />
                  <line x1={cx} y1={gridSize * 2.8} x2={cx} y2={height} className="stroke-slate-900 stroke-2" />
                </g>
              );
            })}
          </g>
        );
      }

      // ----------------------------------------------------
      // RELÉ TÉRMICO
      // ----------------------------------------------------
      case 'thermal_relay_power':
        return (
          <g>
            {[1, 2, 3].map((pole) => {
              const cx = gridSize * pole;
              return (
                <g key={pole}>
                  <line x1={cx} y1={0} x2={cx} y2={gridSize * 1.3} className="stroke-slate-900 stroke-2" />
                  {/* Bimetal rectangular de sobrecarga */}
                  <rect x={cx - 4} y={gridSize * 1.3} width={8} height={gridSize * 1.4} className="fill-amber-100 stroke-amber-600 stroke-2" />
                  <line x1={cx} y1={gridSize * 2.7} x2={cx} y2={height} className="stroke-slate-900 stroke-2" />
                </g>
              );
            })}
          </g>
        );

      case 'thermal_contact_nc':
      case 'thermal_contact_no': {
        const isNC = component.type === 'thermal_contact_nc';
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.9} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize} y1={gridSize * 2.1} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
            <line
              x1={isNC ? gridSize : gridSize + 6}
              y1={gridSize * 0.9}
              x2={gridSize}
              y2={gridSize * 2.1}
              className="stroke-amber-600 stroke-2"
            />
            {/* Pestaña de accionamiento térmico */}
            <path d={`M ${gridSize - 5} ${gridSize * 1.5} L ${gridSize - 2} ${gridSize * 1.5}`} className="stroke-amber-600 stroke-2" />
          </g>
        );
      }

      // ----------------------------------------------------
      // CONTACTORES PRINCIPALES (3P)
      // ----------------------------------------------------
      case 'contactor_power_3p':
        return (
          <g>
            {[1, 2, 3].map((pole) => {
              const cx = gridSize * pole;
              return (
                <g key={pole}>
                  <line x1={cx} y1={0} x2={cx} y2={gridSize * 1.2} className="stroke-slate-900 stroke-2" />
                  <line
                    x1={isCoilActive ? cx : cx + 7}
                    y1={gridSize * 1.2}
                    x2={cx}
                    y2={gridSize * 2.8}
                    className={`stroke-2 transition-all duration-150 ${isCoilActive ? 'stroke-emerald-600' : 'stroke-slate-900'}`}
                  />
                  <line x1={cx} y1={gridSize * 2.8} x2={cx} y2={height} className="stroke-slate-900 stroke-2" />
                </g>
              );
            })}
          </g>
        );

      // ----------------------------------------------------
      // CONTACTOS AUXILIARES NA / NC
      // ----------------------------------------------------
      case 'contact_no':
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line
              x1={isCoilActive ? gridSize : gridSize + 7}
              y1={gridSize * 0.8}
              x2={gridSize}
              y2={gridSize * 2.2}
              className={`stroke-2 transition-all duration-150 ${isCoilActive ? 'stroke-emerald-600' : 'stroke-slate-900'}`}
            />
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      case 'contact_nc':
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line
              x1={!isCoilActive ? gridSize : gridSize + 8}
              y1={gridSize * 0.8}
              x2={gridSize}
              y2={gridSize * 2.2}
              className={`stroke-2 transition-all duration-150 ${!isCoilActive ? 'stroke-emerald-600' : 'stroke-slate-900'}`}
            />
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      // ----------------------------------------------------
      // CONTACTOS TEMPORIZADOS (TON)
      // ----------------------------------------------------
      case 'contact_timer_ton_no':
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line
              x1={isCoilTimed ? gridSize : gridSize + 7}
              y1={gridSize * 0.8}
              x2={gridSize}
              y2={gridSize * 2.2}
              className={`stroke-2 transition-all duration-150 ${isCoilTimed ? 'stroke-emerald-600' : 'stroke-slate-900'}`}
            />
            <path d={`M ${gridSize + 2} ${gridSize * 1.5} A 4 4 0 0 1 ${gridSize + 10} ${gridSize * 1.5}`} className="stroke-blue-600 stroke-1.5 fill-none" />
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      case 'contact_timer_ton_nc':
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line
              x1={!isCoilTimed ? gridSize : gridSize + 8}
              y1={gridSize * 0.8}
              x2={gridSize}
              y2={gridSize * 2.2}
              className={`stroke-2 transition-all duration-150 ${!isCoilTimed ? 'stroke-emerald-600' : 'stroke-slate-900'}`}
            />
            <path d={`M ${gridSize + 2} ${gridSize * 1.5} A 4 4 0 0 1 ${gridSize + 10} ${gridSize * 1.5}`} className="stroke-blue-600 stroke-1.5 fill-none" />
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      // ----------------------------------------------------
      // PULSADORES (START / STOP / EMERGENCY)
      // ----------------------------------------------------
      case 'button_no': {
        const isPressed = component.state?.isActuated === true;
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line
              x1={isPressed ? gridSize : gridSize + 7}
              y1={gridSize * 0.8}
              x2={gridSize}
              y2={gridSize * 2.2}
              className={`stroke-2 transition-all duration-100 ${isPressed ? 'stroke-emerald-600' : 'stroke-slate-900'}`}
            />
            <rect x={gridSize + 5} y={gridSize * 1.3} width={8} height={4} rx={1} className="fill-emerald-500 stroke-emerald-700 stroke-1 cursor-pointer shadow-xs" />
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );
      }

      case 'button_nc': {
        const isPressed = component.state?.isActuated === true;
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line
              x1={!isPressed ? gridSize : gridSize + 8}
              y1={gridSize * 0.8}
              x2={gridSize}
              y2={gridSize * 2.2}
              className={`stroke-2 transition-all duration-100 ${!isPressed ? 'stroke-emerald-600' : 'stroke-slate-900'}`}
            />
            <rect x={gridSize + 5} y={gridSize * 1.3} width={8} height={4} rx={1} className="fill-rose-500 stroke-rose-700 stroke-1 cursor-pointer shadow-xs" />
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );
      }

      case 'emergency_stop': {
        const isPressed = component.state?.isActuated === true;
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line
              x1={!isPressed ? gridSize : gridSize + 8}
              y1={gridSize * 0.8}
              x2={gridSize}
              y2={gridSize * 2.2}
              className={`stroke-2 transition-all duration-100 ${!isPressed ? 'stroke-emerald-600' : 'stroke-slate-900'}`}
            />
            <path
              d={`M ${gridSize + 3} ${gridSize * 1.5} C ${gridSize + 3} ${gridSize * 0.9}, ${gridSize + 17} ${gridSize * 0.9}, ${gridSize + 17} ${gridSize * 1.5} Z`}
              className="fill-rose-600 stroke-rose-800 stroke-1 cursor-pointer drop-shadow-xs"
            />
            <line x1={gridSize + 2} y1={gridSize * 1.5} x2={gridSize + 7} y2={gridSize * 1.5} className="stroke-slate-700 stroke-1.5" />
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );
      }

      case 'limit_switch_no': {
        const isPressed = component.state?.isActuated === true;
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line
              x1={isPressed ? gridSize : gridSize + 7}
              y1={gridSize * 0.8}
              x2={gridSize}
              y2={gridSize * 2.2}
              className={`stroke-2 transition-all duration-100 ${isPressed ? 'stroke-emerald-600' : 'stroke-slate-900'}`}
            />
            <circle cx={gridSize + 8} cy={gridSize * 1.3} r={3} className="fill-amber-400 stroke-amber-700 stroke-1" />
            <line x1={gridSize + 3} y1={gridSize * 1.3} x2={gridSize + 5} y2={gridSize * 1.3} className="stroke-amber-700 stroke-1" />
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );
      }

      case 'limit_switch_nc': {
        const isPressed = component.state?.isActuated === true;
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line
              x1={!isPressed ? gridSize : gridSize + 8}
              y1={gridSize * 0.8}
              x2={gridSize}
              y2={gridSize * 2.2}
              className={`stroke-2 transition-all duration-100 ${!isPressed ? 'stroke-emerald-600' : 'stroke-slate-900'}`}
            />
            <circle cx={gridSize + 9} cy={gridSize * 1.3} r={3} className="fill-amber-400 stroke-amber-700 stroke-1" />
            <line x1={gridSize + 3} y1={gridSize * 1.3} x2={gridSize + 6} y2={gridSize * 1.3} className="stroke-amber-700 stroke-1" />
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );
      }

      // ----------------------------------------------------
      // BOBINAS DE CONTACTOR Y TEMPORIZADOR
      // ----------------------------------------------------
      case 'coil_contactor':
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <rect
              x={gridSize * 0.4}
              y={gridSize * 0.8}
              width={gridSize * 1.2}
              height={gridSize * 1.4}
              rx={2}
              className={`transition-all duration-200 stroke-2 ${
                isCoilActive
                  ? 'fill-emerald-100 stroke-emerald-600 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'fill-white stroke-slate-900'
              }`}
            />
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      case 'coil_timer_ton':
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <rect
              x={gridSize * 0.4}
              y={gridSize * 0.8}
              width={gridSize * 1.2}
              height={gridSize * 1.4}
              rx={2}
              className={`transition-all duration-200 stroke-2 ${
                isCoilActive
                  ? 'fill-blue-100 stroke-blue-600 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                  : 'fill-white stroke-slate-900'
              }`}
            />
            <line x1={gridSize * 0.4} y1={gridSize * 0.8} x2={gridSize * 0.8} y2={gridSize * 2.2} className="stroke-blue-500 stroke-1" />
            {timerState?.isActive && (
              <text x={gridSize} y={gridSize * 1.65} textAnchor="middle" className="text-[9px] font-mono font-bold fill-blue-700">
                {Math.max(0, (timerState.targetTime - timerState.elapsedTime)).toFixed(1)}s
              </text>
            )}
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      // ----------------------------------------------------
      // MOTOR TRIFÁSICO
      // ----------------------------------------------------
      case 'motor_3phase':
      case 'motor_3phase_6p': {
        const isRunning = (motorState?.rpm ?? 0) > 100;
        const angle = motorState?.angle ?? 0;
        const dir = motorState?.direction ?? 1;
        const is6P = component.type === 'motor_3phase_6p';
        const centerY = is6P ? gridSize * 2.5 : gridSize * 2.4;

        return (
          <g>
            {/* Terminales superiores U1, V1, W1 */}
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize * 2} y1={0} x2={gridSize * 2} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize * 3} y1={0} x2={gridSize * 3} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />

            {/* Carcasa circular del motor */}
            <circle
              cx={gridSize * 2}
              cy={centerY}
              r={gridSize * 1.4}
              className={`stroke-2 transition-all ${
                isRunning
                  ? 'fill-cyan-50 stroke-cyan-600 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'fill-white stroke-slate-900'
              }`}
            />

            {/* Rotor interior giratorio */}
            <g transform={`rotate(${angle} ${gridSize * 2} ${centerY})`}>
              <line x1={gridSize * 1.2} y1={centerY} x2={gridSize * 2.8} y2={centerY} className="stroke-cyan-600 stroke-2" />
              <line x1={gridSize * 2} y1={centerY - gridSize * 0.8} x2={gridSize * 2} y2={centerY + gridSize * 0.8} className="stroke-cyan-600 stroke-2" />
            </g>

            {/* Texto identificativo M 3~ */}
            <text x={gridSize * 2} y={centerY - 2} textAnchor="middle" className="text-xs font-bold font-sans fill-slate-900 select-none">
              M
            </text>
            <text x={gridSize * 2} y={centerY + 9} textAnchor="middle" className="text-[10px] font-bold font-mono fill-slate-600 select-none">
              {is6P ? 'Y-Δ' : '3~'}
            </text>

            {is6P && (
              <>
                {/* Terminales inferiores W2, U2, V2 */}
                <line x1={gridSize} y1={gridSize * 3.9} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
                <line x1={gridSize * 2} y1={gridSize * 3.9} x2={gridSize * 2} y2={height} className="stroke-slate-900 stroke-2" />
                <line x1={gridSize * 3} y1={gridSize * 3.9} x2={gridSize * 3} y2={height} className="stroke-slate-900 stroke-2" />
              </>
            )}

            {/* Indicador de sentido de giro */}
            {isRunning && (
              <text x={gridSize * 2} y={is6P ? gridSize * 4.6 : gridSize * 3.6} textAnchor="middle" className="text-[10px] font-mono font-bold fill-cyan-700 animate-pulse">
                {dir === 1 ? `↻ CW (${motorState?.rpm || 1450} RPM)` : `↺ CCW (${motorState?.rpm || 1450} RPM)`}
              </text>
            )}
          </g>
        );
      }

      // ----------------------------------------------------
      // PILOTOS DE SEÑALIZACIÓN
      // ----------------------------------------------------
      case 'pilot_light_green':
      case 'pilot_light_red':
      case 'pilot_light_yellow': {
        const isLit = pilotState?.isLit === true;
        const color = pilotState?.color ?? 'green';
        const colorClass = color === 'green'
          ? (isLit ? 'fill-emerald-500 stroke-emerald-700 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'fill-white stroke-slate-900')
          : color === 'red'
          ? (isLit ? 'fill-rose-500 stroke-rose-700 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'fill-white stroke-slate-900')
          : (isLit ? 'fill-amber-400 stroke-amber-600 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'fill-white stroke-slate-900');

        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <circle cx={gridSize} cy={gridSize * 1.5} r={gridSize * 0.7} className={`stroke-2 transition-all duration-150 ${colorClass}`} />
            {/* Cruz diagonal dentro del círculo de la lámpara */}
            <line x1={gridSize - 7} y1={gridSize * 1.5 - 7} x2={gridSize + 7} y2={gridSize * 1.5 + 7} className={`${isLit ? 'stroke-white' : 'stroke-slate-900'} stroke-1.5`} />
            <line x1={gridSize + 7} y1={gridSize * 1.5 - 7} x2={gridSize - 7} y2={gridSize * 1.5 + 7} className={`${isLit ? 'stroke-white' : 'stroke-slate-900'} stroke-1.5`} />
            <line x1={gridSize} y1={gridSize * 2.2} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );
      }

      // ----------------------------------------------------
      // GRAFCET (IEC 60848)
      // ----------------------------------------------------
      case 'grafcet_step_init':
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.3} className="stroke-slate-900 stroke-2" />
            <rect x={gridSize * 0.3} y={gridSize * 0.3} width={gridSize * 1.4} height={gridSize * 1.4} rx={2} className="fill-white stroke-slate-900 stroke-2" />
            <rect x={gridSize * 0.45} y={gridSize * 0.45} width={gridSize * 1.1} height={gridSize * 1.1} rx={1} className="fill-none stroke-slate-900 stroke-1.5" />
            <text x={gridSize} y={gridSize * 1.15} textAnchor="middle" className="text-xs font-mono font-bold fill-slate-900 select-none">
              {component.tag.replace(/[^0-9]/g, '') || '0'}
            </text>
            <line x1={gridSize} y1={gridSize * 1.7} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      case 'grafcet_step':
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.3} className="stroke-slate-900 stroke-2" />
            <rect x={gridSize * 0.3} y={gridSize * 0.3} width={gridSize * 1.4} height={gridSize * 1.4} rx={2} className="fill-white stroke-slate-900 stroke-2" />
            <text x={gridSize} y={gridSize * 1.15} textAnchor="middle" className="text-xs font-mono font-bold fill-slate-900 select-none">
              {component.tag.replace(/[^0-9]/g, '') || '1'}
            </text>
            <line x1={gridSize} y1={gridSize * 1.7} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      case 'grafcet_transition':
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize * 0.3} y1={gridSize} x2={gridSize * 1.7} y2={gridSize} className="stroke-slate-900 stroke-[3] stroke-linecap-round" />
            <text x={gridSize * 1.9} y={gridSize * 1.1} className="text-xs font-mono font-bold fill-blue-700 select-none">
              {component.tag}
            </text>
          </g>
        );

      case 'grafcet_action':
        return (
          <g>
            <line x1={0} y1={gridSize} x2={gridSize * 0.5} y2={gridSize} className="stroke-slate-900 stroke-2" />
            <rect x={gridSize * 0.5} y={gridSize * 0.25} width={gridSize * 2.3} height={gridSize * 1.5} rx={2} className="fill-blue-50/90 stroke-blue-700 stroke-2" />
            <text x={gridSize * 1.65} y={gridSize * 1.1} textAnchor="middle" className="text-xs font-mono font-bold fill-blue-900 select-none">
              {component.tag}
            </text>
          </g>
        );

      case 'grafcet_and_divergence':
        return (
          <g>
            <line x1={gridSize * 2} y1={0} x2={gridSize * 2} y2={gridSize * 0.8} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize * 0.5} y1={gridSize * 0.8} x2={gridSize * 3.5} y2={gridSize * 0.8} className="stroke-slate-900 stroke-[3]" />
            <line x1={gridSize * 0.5} y1={gridSize * 1.1} x2={gridSize * 3.5} y2={gridSize * 1.1} className="stroke-slate-900 stroke-[3]" />
            <line x1={gridSize} y1={gridSize * 1.1} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize * 3} y1={gridSize * 1.1} x2={gridSize * 3} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      case 'grafcet_or_divergence':
        return (
          <g>
            <line x1={gridSize * 2} y1={0} x2={gridSize * 2} y2={gridSize} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize * 0.5} y1={gridSize} x2={gridSize * 3.5} y2={gridSize} className="stroke-slate-900 stroke-[3]" />
            <line x1={gridSize} y1={gridSize} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize * 3} y1={gridSize} x2={gridSize * 3} y2={height} className="stroke-slate-900 stroke-2" />
          </g>
        );

      case 'grafcet_jump':
        return (
          <g>
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 1.2} className="stroke-slate-900 stroke-2" />
            <polygon points={`${gridSize - 6},${gridSize * 1.2} ${gridSize + 6},${gridSize * 1.2} ${gridSize},${gridSize * 1.7}`} className="fill-blue-600" />
            <text x={gridSize} y={height - 2} textAnchor="middle" className="text-xs font-mono font-bold fill-blue-700">
              {component.tag}
            </text>
          </g>
        );

      // ----------------------------------------------------
      // PLC (MÓDULOS DE AUTÓMATA & LADDER)
      // ----------------------------------------------------
      case 'plc_cpu_s71200':
        return (
          <g>
            {/* Chasis principal Siemens S7-1200 */}
            <rect x={gridSize * 0.2} y={gridSize * 0.5} width={width - gridSize * 0.4} height={height - gridSize * 1.0} rx={6} className="fill-[#1e293b] stroke-[#334155] stroke-2 shadow-lg" />
            
            {/* Franja superior de bornas (Entradas) */}
            <rect x={gridSize * 0.5} y={gridSize * 0.7} width={width - gridSize * 1.0} height={gridSize * 1.1} rx={3} className="fill-[#0f172a] stroke-[#475569] stroke-1" />
            <text x={gridSize * 1.0} y={gridSize * 1.4} className="text-[9px] font-mono font-bold fill-amber-400">24V DC IN</text>
            <text x={gridSize * 5.0} y={gridSize * 1.4} className="text-[9px] font-mono font-bold fill-slate-300">DIa .0 .1 .2 .3 .4</text>

            {/* LEDs de estado de entradas */}
            {[3, 4, 5, 6, 7].map((pinX, i) => (
              <circle key={i} cx={gridSize * pinX} cy={gridSize * 2.1} r={2.5} className="fill-emerald-500 shadow-sm" />
            ))}

            {/* Pantalla / Panel central */}
            <rect x={gridSize * 0.5} y={gridSize * 2.5} width={width - gridSize * 1.0} height={gridSize * 2.0} rx={3} className="fill-[#0f172a] stroke-[#38bdf8]/40 stroke-1" />
            <text x={gridSize * 1.0} y={gridSize * 3.4} className="text-xs font-bold font-sans fill-white tracking-wider">SIEMENS</text>
            <text x={gridSize * 1.0} y={gridSize * 4.1} className="text-[10px] font-mono font-semibold fill-cyan-400">SIMATIC S7-1200</text>
            <text x={width - gridSize * 1.8} y={gridSize * 3.7} className="text-[10px] font-mono font-bold fill-emerald-400 animate-pulse">RUN</text>

            {/* LEDs de salidas */}
            {[3, 4, 5, 6].map((pinX, i) => (
              <circle key={i} cx={gridSize * pinX} cy={gridSize * 4.8} r={2.5} className="fill-amber-400" />
            ))}

            {/* Franja inferior de bornas (Salidas a Relé) */}
            <rect x={gridSize * 0.5} y={gridSize * 5.1} width={width - gridSize * 1.0} height={gridSize * 1.1} rx={3} className="fill-[#0f172a] stroke-[#475569] stroke-1" />
            <text x={gridSize * 1.0} y={gridSize * 5.8} className="text-[9px] font-mono font-bold fill-emerald-400">RELAY OUT</text>
            <text x={gridSize * 4.5} y={gridSize * 5.8} className="text-[9px] font-mono font-bold fill-slate-300">DQa .0 .1 .2 .3</text>
          </g>
        );

      case 'plc_logo':
        return (
          <g>
            <rect x={gridSize * 0.2} y={gridSize * 0.5} width={width - gridSize * 0.4} height={height - gridSize * 1.0} rx={4} className="fill-[#1e293b] stroke-[#334155] stroke-2 shadow-md" />
            {/* Pantallita LCD de LOGO! */}
            <rect x={gridSize * 1.2} y={gridSize * 1.5} width={gridSize * 3.6} height={gridSize * 2.0} rx={2} className="fill-[#0284c7]/20 stroke-[#38bdf8] stroke-1" />
            <text x={gridSize * 3.0} y={gridSize * 2.4} textAnchor="middle" className="text-xs font-mono font-bold fill-cyan-300">LOGO! 230RC</text>
            <text x={gridSize * 3.0} y={gridSize * 3.1} textAnchor="middle" className="text-[9px] font-mono fill-emerald-400">● RUNNING</text>
            {/* Botones de navegación del LOGO! */}
            <circle cx={gridSize * 2.0} cy={gridSize * 4.0} r={4} className="fill-slate-600 stroke-slate-400 stroke-1" />
            <circle cx={gridSize * 4.0} cy={gridSize * 4.0} r={4} className="fill-slate-600 stroke-slate-400 stroke-1" />
          </g>
        );

      case 'plc_input_module':
      case 'plc_output_module': {
        const isInput = component.type === 'plc_input_module';
        return (
          <g>
            <rect x={gridSize * 0.2} y={gridSize * 0.3} width={width - gridSize * 0.4} height={height - gridSize * 0.6} rx={4} className="fill-white stroke-slate-800 stroke-2 shadow-xs" />
            <rect x={gridSize * 0.2} y={gridSize * 0.3} width={width - gridSize * 0.4} height={gridSize * 0.8} rx={2} className={isInput ? "fill-blue-50" : "fill-amber-50"} />
            <text x={width / 2} y={gridSize * 0.85} textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-800">
              {isInput ? 'MÓDULO 8x DI' : 'MÓDULO 4x DQ'}
            </text>
            <text x={width / 2} y={gridSize * 1.9} textAnchor="middle" className="text-xs font-mono font-bold fill-blue-700">
              {component.tag}
            </text>
          </g>
        );
      }

      case 'plc_ladder_contact_no':
        return (
          <g>
            <line x1={0} y1={gridSize} x2={gridSize * 0.7} y2={gridSize} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize * 0.7} y1={gridSize * 0.4} x2={gridSize * 0.7} y2={gridSize * 1.6} className="stroke-blue-700 stroke-[2.5] stroke-linecap-round" />
            <line x1={gridSize * 1.3} y1={gridSize * 0.4} x2={gridSize * 1.3} y2={gridSize * 1.6} className="stroke-blue-700 stroke-[2.5] stroke-linecap-round" />
            <line x1={gridSize * 1.3} y1={gridSize} x2={width} y2={gridSize} className="stroke-slate-900 stroke-2" />
            <text x={gridSize} y={gridSize * 0.3} textAnchor="middle" className="text-[10px] font-mono font-bold fill-blue-800 select-none">
              {component.tag}
            </text>
          </g>
        );

      case 'plc_ladder_contact_nc':
        return (
          <g>
            <line x1={0} y1={gridSize} x2={gridSize * 0.7} y2={gridSize} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize * 0.7} y1={gridSize * 0.4} x2={gridSize * 0.7} y2={gridSize * 1.6} className="stroke-rose-700 stroke-[2.5] stroke-linecap-round" />
            <line x1={gridSize * 1.3} y1={gridSize * 0.4} x2={gridSize * 1.3} y2={gridSize * 1.6} className="stroke-rose-700 stroke-[2.5] stroke-linecap-round" />
            <line x1={gridSize * 0.6} y1={gridSize * 1.5} x2={gridSize * 1.4} y2={gridSize * 0.5} className="stroke-rose-700 stroke-2" />
            <line x1={gridSize * 1.3} y1={gridSize} x2={width} y2={gridSize} className="stroke-slate-900 stroke-2" />
            <text x={gridSize} y={gridSize * 0.3} textAnchor="middle" className="text-[10px] font-mono font-bold fill-rose-800 select-none">
              {component.tag}
            </text>
          </g>
        );

      case 'plc_ladder_coil':
      case 'plc_ladder_coil_set':
      case 'plc_ladder_coil_reset': {
        const isSet = component.type.includes('set');
        const isReset = component.type.includes('reset');
        return (
          <g>
            <line x1={0} y1={gridSize} x2={gridSize * 0.6} y2={gridSize} className="stroke-slate-900 stroke-2" />
            <path d={`M ${gridSize * 0.8} ${gridSize * 0.4} A 6 6 0 0 0 ${gridSize * 0.8} ${gridSize * 1.6}`} stroke="#2563eb" strokeWidth="2.5" fill="none" />
            {(isSet || isReset) && (
              <text x={gridSize} y={gridSize * 1.25} textAnchor="middle" className="text-xs font-mono font-bold fill-blue-700">
                {isSet ? 'S' : 'R'}
              </text>
            )}
            <path d={`M ${gridSize * 1.2} ${gridSize * 0.4} A 6 6 0 0 1 ${gridSize * 1.2} ${gridSize * 1.6}`} stroke="#2563eb" strokeWidth="2.5" fill="none" />
            <line x1={gridSize * 1.4} y1={gridSize} x2={width} y2={gridSize} className="stroke-slate-900 stroke-2" />
            <text x={gridSize} y={gridSize * 0.3} textAnchor="middle" className="text-[10px] font-mono font-bold fill-blue-800 select-none">
              {component.tag}
            </text>
          </g>
        );
      }

      default:
        return (
          <rect x={0} y={0} width={width} height={height} className="fill-white stroke-slate-800 stroke-1" />
        );
    }
  };

  return (
    <g
      transform={`translate(${posX}, ${posY}) rotate(${component.rotation})`}
      className={`cursor-pointer select-none`}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {/* Caja de selección */}
      {isSelected && (
        <rect
          x={-5}
          y={-5}
          width={width + 10}
          height={height + 10}
          rx={4}
          className="fill-blue-500/10 stroke-blue-500 stroke-2 stroke-dasharray-[4,3]"
        />
      )}

      {/* Renderizado de pines con numeración terminal */}
      {def.pins.map(pin => {
        let px = pin.relX * gridSize;
        let py = pin.relY * gridSize;
        return (
          <g key={pin.id}>
            <circle
              cx={px}
              cy={py}
              r={2.5}
              className="fill-slate-600 hover:fill-blue-600 transition-colors"
            />
            {/* Texto de número de borne */}
            <text
              x={px + 4}
              y={py + 3}
              className="text-[9px] font-mono font-medium fill-slate-500 select-none pointer-events-none"
            >
              {pin.label}
            </text>
          </g>
        );
      })}

      {/* Símbolo esquemático */}
      {renderSymbol()}

      {/* Etiqueta de referencia (Tag) */}
      <text
        x={width + 4}
        y={gridSize * 1.2}
        className="text-xs font-mono font-bold fill-slate-900 select-none pointer-events-none"
      >
        {component.tag}
      </text>
    </g>
  );
};
