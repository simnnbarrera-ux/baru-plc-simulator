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
            <text
              x={gridSize * 1.65}
              y={gridSize * 1.15}
              fontSize="10"
              fontFamily="monospace"
              fontWeight="700"
              fill="#1d4ed8"
              stroke="#ffffff"
              strokeWidth={3.5}
              paintOrder="stroke"
              className="select-none"
            >
              {component.tag}
            </text>
          </g>
        );

      case 'grafcet_action':
        return (
          <g>
            <line x1={0} y1={gridSize} x2={gridSize * 0.45} y2={gridSize} className="stroke-slate-900 stroke-2" />
            <rect
              x={gridSize * 0.45}
              y={gridSize * 0.22}
              width={gridSize * 2.55}
              height={gridSize * 1.56}
              rx={2}
              className="fill-blue-50/90 stroke-blue-700 stroke-2"
            />
            <text
              x={gridSize * 1.725}
              y={gridSize * 1.12}
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-blue-900 select-none"
            >
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
      case 'plc_cpu_s71200': {
        const isRunning = simulationState.mode === 'running';
        const inputPins = ['I0', 'I1', 'I2', 'I3', 'I4'];
        const outputPins = ['Q0', 'Q1', 'Q2', 'Q3'];
        return (
          <g>
            {/* Chasis principal Siemens S7-1200 */}
            <rect x={gridSize * 0.2} y={gridSize * 0.5} width={width - gridSize * 0.4} height={height - gridSize * 1.0} rx={6} className="fill-[#1e293b] stroke-[#334155] stroke-2 shadow-lg" />
            
            {/* Franja superior de bornas (Entradas) */}
            <rect x={gridSize * 0.5} y={gridSize * 0.7} width={width - gridSize * 1.0} height={gridSize * 1.1} rx={3} className="fill-[#0f172a] stroke-[#475569] stroke-1" />
            <text x={gridSize * 0.75} y={gridSize * 1.4} className="text-[8px] font-mono font-bold fill-amber-400">24V IN</text>
            <text x={width - gridSize * 0.75} y={gridSize * 1.4} textAnchor="end" className="text-[8px] font-mono font-bold fill-slate-300">DI .0 .1 .2 .3 .4</text>

            {/* LEDs dinámicos de estado de entradas DI .0 - .4 */}
            {inputPins.map((pId, i) => {
              const isHigh =
                isRunning &&
                (simulationState.energizedPins.has(`${component.id}:${pId}`) ||
                  simulationState.activeCoils.has(`PLC:%I0.${i}`));
              return (
                <circle
                  key={pId}
                  cx={gridSize * (3 + i)}
                  cy={gridSize * 2.1}
                  r={3}
                  className={isHigh ? 'fill-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.9)]' : 'fill-slate-600'}
                />
              );
            })}

            {/* Pantalla / Panel central */}
            <rect x={gridSize * 0.5} y={gridSize * 2.5} width={width - gridSize * 1.0} height={gridSize * 2.0} rx={3} className="fill-[#0f172a] stroke-[#38bdf8]/40 stroke-1" />
            <text x={gridSize * 1.0} y={gridSize * 3.4} className="text-xs font-bold font-sans fill-white tracking-wider">SIEMENS</text>
            <text x={gridSize * 1.0} y={gridSize * 4.1} className="text-[10px] font-mono font-semibold fill-cyan-400">CPU 1214C DC/DC/DC</text>
            <text
              x={width - gridSize * 2.0}
              y={gridSize * 3.7}
              className={`text-[10px] font-mono font-bold ${isRunning ? 'fill-emerald-400 animate-pulse' : 'fill-amber-400'}`}
            >
              {isRunning ? '● RUN' : '■ STOP'}
            </text>

            {/* LEDs dinámicos de salidas DQ .0 - .3 */}
            {outputPins.map((pId, i) => {
              const isHigh =
                isRunning &&
                (simulationState.energizedPins.has(`${component.id}:${pId}`) ||
                  simulationState.activeCoils.has(`PLC:%Q0.${i}`));
              return (
                <circle
                  key={pId}
                  cx={gridSize * (3 + i)}
                  cy={gridSize * 4.8}
                  r={3}
                  className={isHigh ? 'fill-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.9)]' : 'fill-slate-600'}
                />
              );
            })}

            {/* Franja inferior de bornas (Salidas a Relé) */}
            <rect x={gridSize * 0.5} y={gridSize * 5.1} width={width - gridSize * 1.0} height={gridSize * 1.1} rx={3} className="fill-[#0f172a] stroke-[#475569] stroke-1" />
            <text x={gridSize * 0.75} y={gridSize * 5.8} className="text-[8px] font-mono font-bold fill-emerald-400">RELAY OUT</text>
            <text x={width - gridSize * 0.75} y={gridSize * 5.8} textAnchor="end" className="text-[8px] font-mono font-bold fill-slate-300">DQ .0 .1 .2 .3</text>
          </g>
        );
      }

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

      // ----------------------------------------------------
      // NEUMÁTICA Y ELECTROVÁLVULAS 5/2
      // ----------------------------------------------------
      case 'pneumatic_cylinder_da': {
        const pneu = simulationState.pneumaticStates?.get(component.id);
        const pos = pneu ? pneu.position : (component.state?.pistonPos ?? 0);
        const atStart = pneu ? pneu.atStart : pos <= 0.05;
        const atEnd = pneu ? pneu.atEnd : pos >= 0.95;
        const prefix = (component.tag || '-A').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'a';
        const barrelW = gridSize * 4.5;
        const pistonTravel = gridSize * 2.8;
        const pistonX = gridSize * 0.4 + pos * pistonTravel;

        return (
          <g>
            {/* Sensores magnéticos de fin de carrera */}
            <g transform={`translate(${gridSize * 0.6}, ${gridSize * 0.25})`}>
              <rect x={-10} y={0} width={20} height={11} rx={3} className={atStart ? 'fill-emerald-500 stroke-emerald-700' : 'fill-slate-200 stroke-slate-400'} />
              <text x={0} y={8} textAnchor="middle" className={`text-[8px] font-mono font-bold ${atStart ? 'fill-white' : 'fill-slate-700'}`}>
                {`${prefix}0`}
              </text>
            </g>
            <g transform={`translate(${gridSize * 4.1}, ${gridSize * 0.25})`}>
              <rect x={-10} y={0} width={20} height={11} rx={3} className={atEnd ? 'fill-emerald-500 stroke-emerald-700' : 'fill-slate-200 stroke-slate-400'} />
              <text x={0} y={8} textAnchor="middle" className={`text-[8px] font-mono font-bold ${atEnd ? 'fill-white' : 'fill-slate-700'}`}>
                {`${prefix}1`}
              </text>
            </g>

            {/* Camisa del cilindro */}
            <rect x={gridSize * 0.2} y={gridSize * 0.9} width={barrelW} height={gridSize * 1.4} rx={3} className="fill-slate-100 stroke-slate-800 stroke-2" />
            {/* Cámara de presión izquierda (A+) */}
            <rect
              x={gridSize * 0.3}
              y={gridSize * 0.98}
              width={Math.max(2, pistonX - gridSize * 0.3)}
              height={gridSize * 1.24}
              className={pneu?.isExtending ? 'fill-sky-300/60' : 'fill-sky-200/30'}
            />
            {/* Émbolo interno */}
            <rect x={pistonX} y={gridSize * 0.95} width={gridSize * 0.45} height={gridSize * 1.3} rx={1} className="fill-sky-700 stroke-slate-900 stroke-1" />
            {/* Vástago extensible */}
            <rect
              x={pistonX + gridSize * 0.45}
              y={gridSize * 1.42}
              width={gridSize * 3.0}
              height={gridSize * 0.36}
              className="fill-slate-300 stroke-slate-800 stroke-1.5"
            />
            {/* Cabeza roscada del vástago */}
            <rect
              x={pistonX + gridSize * 3.45}
              y={gridSize * 1.25}
              width={gridSize * 0.3}
              height={gridSize * 0.7}
              rx={1}
              className="fill-slate-700"
            />
            {/* Racores neumáticos A+ / A- */}
            <line x1={gridSize * 0.55} y1={gridSize * 2.3} x2={gridSize * 0.55} y2={gridSize * 2.8} className="stroke-sky-600 stroke-2" />
            <line x1={gridSize * 4.35} y1={gridSize * 2.3} x2={gridSize * 4.35} y2={gridSize * 2.8} className="stroke-sky-600 stroke-2" />
          </g>
        );
      }

      case 'solenoid_valve_5_2': {
        const y1Active = simulationState.activeCoils.has(`${component.tag}:Y1`) || simulationState.activeCoils.has('Y1');
        const y2Active = simulationState.activeCoils.has(`${component.tag}:Y2`) || simulationState.activeCoils.has('Y2');
        return (
          <g>
            {/* Bornas eléctricas */}
            <line x1={gridSize} y1={0} x2={gridSize} y2={gridSize * 0.9} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize} y1={gridSize * 2.1} x2={gridSize} y2={height} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize * 5} y1={0} x2={gridSize * 5} y2={gridSize * 0.9} className="stroke-slate-900 stroke-2" />
            <line x1={gridSize * 5} y1={gridSize * 2.1} x2={gridSize * 5} y2={height} className="stroke-slate-900 stroke-2" />

            {/* Solenoide izquierdo Y1 (Avance) */}
            <rect
              x={gridSize * 0.4}
              y={gridSize * 0.9}
              width={gridSize * 1.1}
              height={gridSize * 1.2}
              rx={2}
              className={`stroke-2 ${y1Active ? 'fill-emerald-100 stroke-emerald-600' : 'fill-white stroke-slate-800'}`}
            />
            <text x={gridSize * 0.95} y={gridSize * 1.65} textAnchor="middle" className="text-[9px] font-mono font-bold fill-slate-900">Y1</text>

            {/* Celdas 5/2 ISO 1219 */}
            <rect x={gridSize * 1.5} y={gridSize * 0.75} width={gridSize * 1.5} height={gridSize * 1.5} className={`stroke-2 ${y1Active ? 'fill-sky-50 stroke-sky-600' : 'fill-white stroke-slate-900'}`} />
            <rect x={gridSize * 3.0} y={gridSize * 0.75} width={gridSize * 1.5} height={gridSize * 1.5} className={`stroke-2 ${y2Active ? 'fill-amber-50 stroke-amber-600' : 'fill-white stroke-slate-900'}`} />
            {/* Flechas simbólicas */}
            <line x1={gridSize * 1.8} y1={gridSize * 2.0} x2={gridSize * 2.25} y2={gridSize * 1.0} className="stroke-slate-800 stroke-1.5" />
            <line x1={gridSize * 2.7} y1={gridSize * 2.0} x2={gridSize * 2.7} y2={gridSize * 1.0} className="stroke-slate-800 stroke-1.5" />
            <line x1={gridSize * 3.4} y1={gridSize * 1.0} x2={gridSize * 3.9} y2={gridSize * 2.0} className="stroke-slate-800 stroke-1.5" />

            {/* Solenoide derecho Y2 (Retorno) */}
            <rect
              x={gridSize * 4.5}
              y={gridSize * 0.9}
              width={gridSize * 1.1}
              height={gridSize * 1.2}
              rx={2}
              className={`stroke-2 ${y2Active ? 'fill-amber-100 stroke-amber-600' : 'fill-white stroke-slate-800'}`}
            />
            <text x={gridSize * 5.05} y={gridSize * 1.65} textAnchor="middle" className="text-[9px] font-mono font-bold fill-slate-900">Y2</text>
          </g>
        );
      }

      case 'cad_text': {
        const textLen = (component.tag || '').length;
        const bannerW = Math.max(width, textLen * 7.2 + 16);
        return (
          <g>
            <rect
              x={0}
              y={1}
              width={bannerW}
              height={height - 2}
              rx={4}
              className="fill-slate-100/90 stroke-slate-300 stroke-1"
            />
            <line
              x1={4}
              y1={height - 2}
              x2={bannerW - 4}
              y2={height - 2}
              className="stroke-sky-600/70 stroke-1.5"
            />
            <text
              x={8}
              y={height * 0.68}
              className="font-mono font-extrabold text-[11px] uppercase fill-slate-700 tracking-wide select-none"
            >
              {component.tag}
            </text>
            {component.value && (
              <text
                x={8}
                y={height + 10}
                className="font-mono font-medium text-[9px] fill-slate-500 select-none"
              >
                {component.value}
              </text>
            )}
          </g>
        );
      }

      default:
        return (
          <rect x={0} y={0} width={width} height={height} className="fill-white stroke-slate-800 stroke-1" />
        );
    }
  };

  const suppressExternalTag =
    component.type.startsWith('grafcet_') ||
    component.type.startsWith('plc_ladder_') ||
    component.type === 'cad_text' ||
    component.type === 'plc_input_module' ||
    component.type === 'plc_output_module' ||
    component.type === 'power_l' ||
    component.type === 'power_n' ||
    component.type === 'power_pe' ||
    component.type === 'power_dc';

  const isLogicSymbol =
    component.type.startsWith('grafcet_') ||
    component.type.startsWith('plc_ladder_');

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
      {component.type !== 'cad_text' && def.pins.map(pin => {
        const px = pin.relX * gridSize;
        const py = pin.relY * gridSize;
        return (
          <g key={pin.id}>
            <circle
              cx={px}
              cy={py}
              r={isLogicSymbol ? 1.5 : 2.5}
              className={
                isLogicSymbol
                  ? 'fill-slate-600 opacity-40 hover:opacity-100 hover:fill-blue-600 transition-colors'
                  : 'fill-slate-600 hover:fill-blue-600 transition-colors'
              }
            />
            {/* Texto de número de borne */}
            {!isLogicSymbol && (
              <text
                x={px + 4}
                y={py + 3}
                className="text-[9px] font-mono font-medium fill-slate-500 select-none pointer-events-none"
              >
                {pin.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Símbolo esquemático */}
      {renderSymbol()}

      {/* Etiqueta de referencia (Tag) y Vínculo PLC TIA */}
      {!suppressExternalTag && (
        <text
          x={width + 4}
          y={gridSize * 1.2}
          className="text-xs font-mono font-bold fill-slate-900 select-none pointer-events-none"
        >
          {component.tag}
        </text>
      )}
      {component.plcAddress && component.type !== 'cad_text' && (
        <g transform={`translate(${width + 4}, ${gridSize * 1.45})`} className="pointer-events-none">
          <rect x={0} y={0} width={Math.max(36, component.plcAddress.length * 6.5)} height={14} rx={4} className="fill-sky-100 stroke-sky-500 stroke-1" />
          <text x={4} y={10} className="text-[9px] font-mono font-bold fill-sky-800 select-none">
            {component.plcAddress}
          </text>
        </g>
      )}
    </g>
  );
};
