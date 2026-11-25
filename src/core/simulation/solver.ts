import { PlacedComponent, WireSegment, JunctionNode, WireType } from '../../types/circuit';
import { COMPONENT_CATALOG } from '../components/catalog';
import {
  ElectricalMeasurement,
  ElectricalNode,
  PneumaticState,
  SimulationState
} from '../../types/simulation';

interface PinInstance {
  componentId: string;
  pinId: string;
  label: string;
  x: number;
  y: number;
  type: string;
  defaultPotential?: string;
}

interface ClosedSwitchEdge {
  compId: string;
  pinA: PinInstance;
  pinB: PinInstance;
}

interface LoadContribution {
  id: string;
  currentA: number;
  powerW: number;
  isOverload?: boolean;
  warningNote?: string;
}

const THREE_PHASE_COMPONENT_TYPES = new Set([
  'power_3phase',
  'power_3phase_pe',
  'breaker_3p',
  'contactor_power_3p',
  'thermal_relay_power',
  'motor_3phase',
  'motor_3phase_6p'
]);

const SINGLE_PHASE_CONTROL_TYPES = new Set([
  'power_l',
  'power_ln',
  'breaker_1p_n',
  'thermal_contact_nc',
  'thermal_contact_no',
  'contact_no',
  'contact_nc',
  'contact_timer_ton_no',
  'contact_timer_ton_nc',
  'button_no',
  'button_nc',
  'emergency_stop',
  'limit_switch_no',
  'limit_switch_nc',
  'coil_contactor',
  'coil_timer_ton',
  'coil_timer_tof',
  'pilot_light_green',
  'pilot_light_red',
  'pilot_light_yellow',
  'horn_siren',
  'motor_1phase',
  'plc_logo'
]);

const SHORT_COMPONENT_NAMES: Record<string, string> = {
  power_l: 'Fuente Fase L',
  power_n: 'Fuente Neutro N',
  power_pe: 'Toma Tierra PE',
  power_ln: 'Fuente Monofásica L+N',
  power_3phase: 'Fuente Trifásica 3L',
  power_3phase_pe: 'Fuente Trifásica 3L+PE',
  power_dc: 'Fuente 24V DC',
  breaker_3p: 'Guardamotor 3P',
  breaker_1p_n: 'Disyuntor Control',
  thermal_relay_power: 'Relé Térmico 3P',
  thermal_contact_nc: 'Contacto Térmico NC',
  thermal_contact_no: 'Contacto Térmico NA',
  contactor_power_3p: 'Contactor Potencia 3P',
  contact_no: 'Contacto Auxiliar NA',
  contact_nc: 'Contacto Auxiliar NC',
  contact_timer_ton_no: 'Contacto TON NA',
  contact_timer_ton_nc: 'Contacto TON NC',
  button_no: 'Pulsador Marcha NA',
  button_nc: 'Pulsador Parada NC',
  emergency_stop: 'Parada Emergencia NC',
  limit_switch_no: 'Final de Carrera NA',
  limit_switch_nc: 'Final de Carrera NC',
  coil_contactor: 'Bobina Contactor',
  coil_timer_ton: 'Temporizador TON',
  coil_timer_tof: 'Temporizador TOF',
  motor_3phase: 'Motor Trifásico',
  motor_3phase_6p: 'Motor Trifásico Y-Δ',
  motor_1phase: 'Motor Monofásico',
  pilot_light_green: 'Piloto Verde',
  pilot_light_red: 'Piloto Rojo',
  pilot_light_yellow: 'Piloto Ámbar',
  horn_siren: 'Bocina / Zumbador',
  plc_cpu_s71200: 'PLC Siemens S7-1200',
  plc_logo: 'Micro-PLC LOGO!',
  solenoid_valve_5_2: 'Electroválvula 5/2',
  pneumatic_cylinder_da: 'Cilindro Neumático'
};

export class CircuitSolver {
  private components: PlacedComponent[];
  private wires: WireSegment[];
  private junctions: JunctionNode[];
  private catalogMap: Map<string, any>;
  private activeFaults: Set<string> = new Set();

  constructor(
    components: PlacedComponent[],
    wires: WireSegment[],
    junctions: JunctionNode[],
    activeFaults?: Set<string>
  ) {
    this.components = components;
    this.wires = wires;
    this.junctions = junctions;
    this.catalogMap = new Map(COMPONENT_CATALOG.map(c => [c.type, c]));
    if (activeFaults) {
      this.activeFaults = new Set(activeFaults);
    }
  }

  public setActiveFaults(faults: Set<string>) {
    this.activeFaults = new Set(faults);
  }

  public setComponents(components: PlacedComponent[]) {
    this.components = components;
  }

  public setWires(wires: WireSegment[]) {
    this.wires = wires;
  }

  public step(
    currentState: SimulationState,
    deltaTimeMs: number,
    plcOutputs?: Record<string, boolean>,
    onPlcInputsSampled?: (inputs: Record<string, boolean>) => void
  ): SimulationState {
    const pneuMap = new Map<string, PneumaticState>(currentState.pneumaticStates || []);

    const nextState: SimulationState = {
      ...currentState,
      simulationTime: currentState.simulationTime + deltaTimeMs / 1000,
      stepCount: currentState.stepCount + 1,
      activeCoils: new Set(currentState.activeCoils),
      energizedWires: new Set<string>(),
      energizedPins: new Set<string>(),
      timerStates: new Map(currentState.timerStates),
      motorStates: new Map(currentState.motorStates),
      pilotLights: new Map(currentState.pilotLights),
      pneumaticStates: pneuMap,
      wireMetrics: new Map<string, ElectricalMeasurement>(),
      pinMetrics: new Map<string, ElectricalMeasurement>(),
      componentMetrics: new Map<string, ElectricalMeasurement>()
    };

    // Calcular estados rápidos de sensores neumáticos (a0/a1, b0/b1)
    const activeReedSensors = this.computeActiveReedSensors(pneuMap);

    // Recopilar todos los pines físicos en el plano
    const pins = this.getAllPins();

    // Resolver ciclo de simulación hasta estabilización (máx 5 iteraciones)
    let stateChanged = true;
    let iteration = 0;
    const sampledInputs: Record<string, boolean> = {};
    let finalNodes: ElectricalNode[] = [];

    while (stateChanged && iteration < 5) {
      stateChanged = false;
      iteration++;

      // A. Construir grafos de nodos equipotenciales (incluyendo contactos + salidas relé PLC Q0..Q3)
      const nodes = this.buildEquipotentialNodes(pins, nextState, plcOutputs, activeReedSensors);
      finalNodes = nodes;

      // B. Determinar potenciales de cada nodo a partir de las fuentes
      this.propagatePotentials(nodes);

      // C. Evaluar estado de bobinas, electroválvulas y Quick-Link PLC %Q
      const newActiveCoils = new Set<string>();

      // Registrar banderas de PLC %I/%Q activas para renderizado LED en el bloque S7-1200
      if (plcOutputs) {
        for (const [addr, val] of Object.entries(plcOutputs)) {
          if (val) newActiveCoils.add(`PLC:${addr.toUpperCase()}`);
        }
      }

      for (const comp of this.components) {
        const def = this.catalogMap.get(comp.type);
        if (!def) continue;

        // Quick-Link directo de salida PLC (%Q0.x) -> activa bobina o electroválvula sin cablear
        const linkedAddr = comp.plcAddress?.toUpperCase();
        const isPlcDriven = !!(linkedAddr && plcOutputs && plcOutputs[linkedAddr]);

        if (comp.type === 'coil_contactor' || comp.type === 'coil_timer_ton' || comp.type === 'coil_timer_tof') {
          const pinA1 = pins.find(p => p.componentId === comp.id && p.pinId === 'A1');
          const pinA2 = pins.find(p => p.componentId === comp.id && p.pinId === 'A2');

          let isEnergized = isPlcDriven;
          if (!isEnergized && pinA1 && pinA2) {
            const nodeA1 = nodes.find(n => n.pinKeys.includes(`${comp.id}:A1`));
            const nodeA2 = nodes.find(n => n.pinKeys.includes(`${comp.id}:A2`));
            const potA1 = nodeA1?.potential;
            const potA2 = nodeA2?.potential;

            const isLiveA1 = potA1 && (potA1.startsWith('L') || potA1 === '+24V');
            const isNeutralA2 = potA2 && (potA2 === 'N' || potA2 === '0V');
            const isLiveA2 = potA2 && (potA2.startsWith('L') || potA2 === '+24V');
            const isNeutralA1 = potA1 && (potA1 === 'N' || potA1 === '0V');

            isEnergized = Boolean((isLiveA1 && isNeutralA2) || (isLiveA2 && isNeutralA1));
          }

          if (isEnergized) {
            const isOpenCoil = this.activeFaults.has('open_coil_km1') || this.activeFaults.has('bobina_abierta');
            if (comp.tag === '-KM1' && isOpenCoil) {
              // Falla inyectada: bobina abierta
            } else {
              newActiveCoils.add(comp.tag);
            }

            if (def.hasTimer) {
              const targetTime = comp.timerValue ?? def.defaultTimeSeconds ?? 5;
              const prevTimer = nextState.timerStates.get(comp.id) || {
                elapsedTime: 0,
                targetTime,
                isComplete: false,
                isActive: true
              };

              const newElapsed = prevTimer.elapsedTime + deltaTimeMs / 1000;
              const isComplete = newElapsed >= targetTime;

              nextState.timerStates.set(comp.id, {
                elapsedTime: newElapsed,
                targetTime,
                isComplete,
                isActive: true
              });

              if (isComplete) {
                newActiveCoils.add(`${comp.tag}:TIMED`);
              }
            }
          } else if (def.hasTimer && comp.type === 'coil_timer_ton') {
            nextState.timerStates.set(comp.id, {
              elapsedTime: 0,
              targetTime: comp.timerValue ?? def.defaultTimeSeconds ?? 5,
              isComplete: false,
              isActive: false
            });
          }
        }

        // Electroválvula 5/2 biestable (Y1 avance / Y2 retorno)
        if (comp.type === 'solenoid_valve_5_2') {
          const nY1a = nodes.find(n => n.pinKeys.includes(`${comp.id}:Y1_A1`));
          const nY1b = nodes.find(n => n.pinKeys.includes(`${comp.id}:Y1_A2`));
          const nY2a = nodes.find(n => n.pinKeys.includes(`${comp.id}:Y2_A1`));
          const nY2b = nodes.find(n => n.pinKeys.includes(`${comp.id}:Y2_A2`));

          const hasSupplyDiff = (p1?: string | null, p2?: string | null) =>
            Boolean(
              p1 &&
                p2 &&
                (((p1 === '+24V' || p1.startsWith('L')) && (p2 === '0V' || p2 === 'N')) ||
                  ((p2 === '+24V' || p2.startsWith('L')) && (p1 === '0V' || p1 === 'N')))
            );

          const y1Energized = hasSupplyDiff(nY1a?.potential, nY1b?.potential) || Boolean(plcOutputs?.['%Q0.2'] && comp.tag === '-A');
          const y2Energized = hasSupplyDiff(nY2a?.potential, nY2b?.potential) || Boolean(plcOutputs?.['%Q0.3'] && comp.tag === '-A');

          if (y1Energized) {
            newActiveCoils.add(`${comp.tag}:Y1`);
            newActiveCoils.add('Y1');
          }
          if (y2Energized) {
            newActiveCoils.add(`${comp.tag}:Y2`);
            newActiveCoils.add('Y2');
          }
        }
      }

      // Muestrear entradas físicas de bloques S7-1200 y Quick-Links %I0.x
      Object.keys(sampledInputs).forEach(k => delete sampledInputs[k]);
      for (const comp of this.components) {
        if (comp.type === 'plc_cpu_s71200') {
          const pinMap: Array<[string, string]> = [
            ['I0', '%I0.0'],
            ['I1', '%I0.1'],
            ['I2', '%I0.2'],
            ['I3', '%I0.3'],
            ['I4', '%I0.4']
          ];
          for (const [pId, addr] of pinMap) {
            const nodeIn = nodes.find(n => n.pinKeys.includes(`${comp.id}:${pId}`));
            const pot = nodeIn?.potential;
            if (pot === '+24V' || (pot && pot.startsWith('L'))) {
              sampledInputs[addr] = true;
              newActiveCoils.add(`PLC:${addr}`);
            }
          }
        }

        // Quick-Link de pulsadores/sensores con plcAddress = %I0.x
        if (comp.plcAddress && comp.plcAddress.toUpperCase().startsWith('%I')) {
          const addr = comp.plcAddress.toUpperCase();
          const normTag = comp.tag.toLowerCase().replace(/[^a-z0-9]/g, '');
          const isReedClosed = activeReedSensors.has(normTag);
          const isActuated = comp.state?.isActuated === true || isReedClosed;
          const def = this.catalogMap.get(comp.type);
          const signalHigh = def?.isNormallyClosed ? !isActuated : isActuated;
          if (signalHigh) {
            sampledInputs[addr] = true;
            newActiveCoils.add(`PLC:${addr}`);
          }
        }
      }

      // También mapear sensores neumáticos a0/a1 a %I0.3/%I0.4 si existen en escena
      if (activeReedSensors.has('a0')) sampledInputs['%I0.3'] = true;
      if (activeReedSensors.has('a1')) sampledInputs['%I0.4'] = true;

      // Comprobar si cambió el conjunto de bobinas activas
      if (newActiveCoils.size !== nextState.activeCoils.size) {
        stateChanged = true;
      } else {
        for (const tag of newActiveCoils) {
          if (!nextState.activeCoils.has(tag)) {
            stateChanged = true;
            break;
          }
        }
      }
      nextState.activeCoils = newActiveCoils;

      // D. Evaluar luces piloto
      for (const comp of this.components) {
        if (comp.type.startsWith('pilot_light_') || comp.type === 'horn_siren') {
          const linkedAddr = comp.plcAddress?.toUpperCase();
          const isPlcDriven = !!(linkedAddr && plcOutputs && plcOutputs[linkedAddr]);
          const nodeX1 = nodes.find(n => n.pinKeys.includes(`${comp.id}:X1`));
          const nodeX2 = nodes.find(n => n.pinKeys.includes(`${comp.id}:X2`));

          const potX1 = nodeX1?.potential;
          const potX2 = nodeX2?.potential;

          const isLit =
            isPlcDriven ||
            ((potX1 && potX2) &&
              ((potX1.startsWith('L') && (potX2 === 'N' || potX2 === '0V')) ||
                (potX2.startsWith('L') && (potX1 === 'N' || potX1 === '0V')) ||
                (potX1 === '+24V' && potX2 === '0V') ||
                (potX2 === '+24V' && potX1 === '0V')));

          let color: 'red' | 'green' | 'yellow' | 'blue' | 'white' = 'green';
          if (comp.type === 'pilot_light_red') color = 'red';
          if (comp.type === 'pilot_light_yellow') color = 'yellow';

          nextState.pilotLights.set(comp.id, { color, isLit: !!isLit });
        }
      }

      // E. Evaluar motores trifásicos y monofásicos
      for (const comp of this.components) {
        if (comp.type === 'motor_3phase' || comp.type === 'motor_3phase_6p') {
          const nodeU = nodes.find(n => n.pinKeys.includes(`${comp.id}:U1`));
          const nodeV = nodes.find(n => n.pinKeys.includes(`${comp.id}:V1`));
          const nodeW = nodes.find(n => n.pinKeys.includes(`${comp.id}:W1`));

          const pU = nodeU?.potential;
          const pV = nodeV?.potential;
          const pW = nodeW?.potential;

          let targetRpm = 0;
          let direction: 1 | -1 | 0 = 0;
          let hasError = false;

          if (pU && pV && pW) {
            if (
              (pU === 'L1' && pV === 'L2' && pW === 'L3') ||
              (pU === 'L2' && pV === 'L3' && pW === 'L1') ||
              (pU === 'L3' && pV === 'L1' && pW === 'L2')
            ) {
              targetRpm = 1450;
              direction = 1;
            } else if (
              (pU === 'L3' && pV === 'L2' && pW === 'L1') ||
              (pU === 'L1' && pV === 'L3' && pW === 'L2') ||
              (pU === 'L2' && pV === 'L1' && pW === 'L3')
            ) {
              targetRpm = 1450;
              direction = -1;
            } else {
              hasError = true;
            }
          } else if ((pU && pV) || (pU && pW) || (pV && pW)) {
            targetRpm = 25;
            direction = 1;
          }

          if (comp.type === 'motor_3phase_6p' && !hasError && targetRpm > 0) {
            const nodeW2 = nodes.find(n => n.pinKeys.includes(`${comp.id}:W2`));
            const nodeU2 = nodes.find(n => n.pinKeys.includes(`${comp.id}:U2`));
            const nodeV2 = nodes.find(n => n.pinKeys.includes(`${comp.id}:V2`));

            const isStar = !!(nodeW2 && nodeU2 && nodeV2 && nodeW2.id === nodeU2.id && nodeU2.id === nodeV2.id);
            const isDelta = !!(nodeW2?.potential && nodeU2?.potential && nodeV2?.potential);

            if (!isStar && !isDelta) {
              targetRpm = 0;
              direction = 0;
            } else if (isStar) {
              targetRpm = 1420;
            }
          }

          const currentMotor = nextState.motorStates.get(comp.id) || {
            rpm: 0,
            targetRpm: 0,
            direction: 0,
            angle: 0,
            hasError: false
          };

          const currentRpm =
            targetRpm === 0
              ? currentMotor.rpm > 10
                ? currentMotor.rpm * 0.4
                : 0
              : currentMotor.rpm + (targetRpm - currentMotor.rpm) * 0.2;
          const deltaAngle = (currentRpm / 60) * 360 * (deltaTimeMs / 1000) * direction;
          const newAngle = (currentMotor.angle + deltaAngle) % 360;

          nextState.motorStates.set(comp.id, {
            rpm: Math.round(currentRpm),
            targetRpm,
            direction,
            angle: newAngle,
            hasError
          });
        } else if (comp.type === 'motor_1phase') {
          const nodeU1 = nodes.find(n => n.pinKeys.includes(`${comp.id}:U1`));
          const nodeU2 = nodes.find(n => n.pinKeys.includes(`${comp.id}:U2`));
          const p1 = nodeU1?.potential;
          const p2 = nodeU2?.potential;

          const isEnergized = Boolean(
            p1 &&
              p2 &&
              ((p1.startsWith('L') && p2 === 'N') || (p2.startsWith('L') && p1 === 'N'))
          );

          const targetRpm = isEnergized ? 1450 : 0;
          const direction: 1 | -1 | 0 = isEnergized ? 1 : 0;
          const currentMotor = nextState.motorStates.get(comp.id) || {
            rpm: 0,
            targetRpm: 0,
            direction: 0,
            angle: 0,
            hasError: false
          };
          const currentRpm =
            targetRpm === 0
              ? currentMotor.rpm > 10
                ? currentMotor.rpm * 0.4
                : 0
              : currentMotor.rpm + (targetRpm - currentMotor.rpm) * 0.2;
          const deltaAngle = (currentRpm / 60) * 360 * (deltaTimeMs / 1000) * direction;
          const newAngle = (currentMotor.angle + deltaAngle) % 360;

          nextState.motorStates.set(comp.id, {
            rpm: Math.round(currentRpm),
            targetRpm,
            direction,
            angle: newAngle,
            hasError: false
          });
        }
      }

      // Marcar cables y pines energizados
      nextState.energizedWires.clear();
      nextState.energizedPins.clear();
      for (const node of nodes) {
        if (node.potential) {
          node.wireIds.forEach(wId => nextState.energizedWires.add(wId));
          node.pinKeys.forEach(pKey => nextState.energizedPins.add(pKey));
        }
      }
    }

    // F. Actualizar movimiento físico de cilindros neumáticos según válvulas Y1 / Y2
    const speedPerSec = 0.75; // Carrera completa en ~1.33s
    const stepDelta = speedPerSec * (deltaTimeMs / 1000);

    for (const comp of this.components) {
      if (comp.type !== 'pneumatic_cylinder_da') continue;
      const prevPneu = pneuMap.get(comp.id) || {
        position: comp.state?.pistonPos ?? 0,
        isExtending: false,
        isRetracting: false,
        atStart: true,
        atEnd: false
      };

      const y1Active =
        nextState.activeCoils.has(`${comp.tag}:Y1`) ||
        nextState.activeCoils.has('Y1') ||
        Boolean(plcOutputs?.['%Q0.2'] && (comp.tag === '-A' || comp.tag === 'A'));
      const y2Active =
        nextState.activeCoils.has(`${comp.tag}:Y2`) ||
        nextState.activeCoils.has('Y2') ||
        Boolean(plcOutputs?.['%Q0.3'] && (comp.tag === '-A' || comp.tag === 'A'));

      let pos = prevPneu.position;
      let isExtending = false;
      let isRetracting = false;

      if (y1Active && !y2Active) {
        pos = Math.min(1, pos + stepDelta);
        isExtending = pos < 1;
      } else if (y2Active && !y1Active) {
        pos = Math.max(0, pos - stepDelta);
        isRetracting = pos > 0;
      }

      pneuMap.set(comp.id, {
        position: pos,
        isExtending,
        isRetracting,
        atStart: pos <= 0.04,
        atEnd: pos >= 0.96
      });
    }

    // G. Calcular mediciones eléctricas reales (V, A, W, Hz) por cable, borne y componente
    this.computeLiveMeasurements(finalNodes, nextState, pins, plcOutputs, activeReedSensors);

    onPlcInputsSampled?.(sampledInputs);
    return nextState;
  }

  private computeActiveReedSensors(pneuMap: Map<string, PneumaticState>): Set<string> {
    const active = new Set<string>();
    for (const comp of this.components) {
      if (comp.type !== 'pneumatic_cylinder_da') continue;
      const st = pneuMap.get(comp.id);
      const pos = st ? st.position : (comp.state?.pistonPos ?? 0);
      const prefix = (comp.tag || '-A').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'a';
      if (pos <= 0.04) active.add(`${prefix}0`);
      if (pos >= 0.96) active.add(`${prefix}1`);
    }
    return active;
  }

  private getAllPins(): PinInstance[] {
    const pins: PinInstance[] = [];
    for (const comp of this.components) {
      const def = this.catalogMap.get(comp.type);
      if (!def) continue;

      for (const p of def.pins) {
        let px = p.relX;
        let py = p.relY;

        if (comp.rotation === 90) {
          const oldX = px;
          px = def.height - py;
          py = oldX;
        } else if (comp.rotation === 180) {
          px = def.width - px;
          py = def.height - py;
        } else if (comp.rotation === 270) {
          const oldX = px;
          px = py;
          py = def.width - oldX;
        }

        pins.push({
          componentId: comp.id,
          pinId: p.id,
          label: p.label || p.id,
          x: comp.x + px,
          y: comp.y + py,
          type: p.type,
          defaultPotential: p.defaultPotential
        });
      }
    }
    return pins;
  }

  private isWireCutByFault(wire: WireSegment): boolean {
    const isL1Cut = this.activeFaults.has('phase_loss_l1') || this.activeFaults.has('corte_fase_l1');
    const isL2Cut =
      this.activeFaults.has('phase_loss_l2') ||
      this.activeFaults.has('corte_fase_l2') ||
      this.activeFaults.has('fase_cortada');
    const isL3Cut = this.activeFaults.has('phase_loss_l3') || this.activeFaults.has('corte_fase_l3');

    if (
      isL1Cut &&
      (wire.id === 'w_p1' ||
        wire.id === 'w_p4' ||
        wire.id === 'w_p7' ||
        wire.id === 'w_p10' ||
        wire.id === 'w_conv_p4' ||
        (wire.wireType === 'phase1' && (wire.fromY >= 6 || wire.toY >= 6)))
    ) {
      return true;
    }
    if (
      isL2Cut &&
      (wire.id === 'w_p2' ||
        wire.id === 'w_p5' ||
        wire.id === 'w_p8' ||
        wire.id === 'w_p11' ||
        wire.id === 'w_conv_p5' ||
        (wire.wireType === 'phase2' && (wire.fromY >= 6 || wire.toY >= 6)))
    ) {
      return true;
    }
    if (
      isL3Cut &&
      (wire.id === 'w_p3' ||
        wire.id === 'w_p6' ||
        wire.id === 'w_p9' ||
        wire.id === 'w_p12' ||
        wire.id === 'w_conv_p6' ||
        (wire.wireType === 'phase3' && (wire.fromY >= 6 || wire.toY >= 6)))
    ) {
      return true;
    }
    return false;
  }

  private isPointOnWireInterior(px: number, py: number, wire: WireSegment): boolean {
    if ((px === wire.fromX && py === wire.fromY) || (px === wire.toX && py === wire.toY)) {
      return false;
    }
    if (wire.fromY === wire.toY && py === wire.fromY) {
      const minX = Math.min(wire.fromX, wire.toX);
      const maxX = Math.max(wire.fromX, wire.toX);
      return px > minX && px < maxX;
    }
    if (wire.fromX === wire.toX && px === wire.fromX) {
      const minY = Math.min(wire.fromY, wire.toY);
      const maxY = Math.max(wire.fromY, wire.toY);
      return py > minY && py < maxY;
    }
    return false;
  }

  private areWireTypesCompatibleForJunction(t1: WireType, t2: WireType): boolean {
    if (t1 === t2) return true;
    if (
      (t1 === 'control' && (t2 === 'phase' || t2 === 'phase1' || t2 === 'phase2' || t2 === 'phase3' || t2 === 'dc_pos')) ||
      (t2 === 'control' && (t1 === 'phase' || t1 === 'phase1' || t1 === 'phase2' || t1 === 'phase3' || t1 === 'dc_pos'))
    ) {
      return true;
    }
    return false;
  }

  private unionJunctionsOnWires(
    activeWires: WireSegment[],
    union: (a: string, b: string) => void
  ) {
    const coordKey = (x: number, y: number) => `${x},${y}`;

    for (const j of this.junctions) {
      const endpointWires: WireSegment[] = [];
      const interiorWires: WireSegment[] = [];

      for (const wire of activeWires) {
        if ((wire.fromX === j.x && wire.fromY === j.y) || (wire.toX === j.x && wire.toY === j.y)) {
          endpointWires.push(wire);
        } else if (this.isPointOnWireInterior(j.x, j.y, wire)) {
          interiorWires.push(wire);
        }
      }

      if (interiorWires.length === 0) continue;

      if (endpointWires.length > 0) {
        for (const iw of interiorWires) {
          if (endpointWires.some(ew => this.areWireTypesCompatibleForJunction(ew.wireType, iw.wireType))) {
            union(coordKey(j.x, j.y), coordKey(iw.fromX, iw.fromY));
          }
        }
      } else if (interiorWires.length >= 2) {
        for (let a = 0; a < interiorWires.length; a++) {
          for (let b = a + 1; b < interiorWires.length; b++) {
            if (this.areWireTypesCompatibleForJunction(interiorWires[a].wireType, interiorWires[b].wireType)) {
              union(coordKey(j.x, j.y), coordKey(interiorWires[a].fromX, interiorWires[a].fromY));
              union(coordKey(j.x, j.y), coordKey(interiorWires[b].fromX, interiorWires[b].fromY));
            }
          }
        }
      }
    }
  }

  private getClosedSwitchingEdges(
    pins: PinInstance[],
    state: SimulationState,
    plcOutputs?: Record<string, boolean>,
    activeReedSensors?: Set<string>
  ): ClosedSwitchEdge[] {
    const edges: ClosedSwitchEdge[] = [];

    for (const comp of this.components) {
      const def = this.catalogMap.get(comp.type);
      if (!def) continue;

      const getPin = (pId: string) => pins.find(p => p.componentId === comp.id && p.pinId === pId);

      // Puente interno de salidas a relé PLC S7-1200: 1L -> Q0..Q3 según %Q0.0..%Q0.3
      if (comp.type === 'plc_cpu_s71200' && plcOutputs) {
        const p1L = getPin('1L');
        if (p1L) {
          const qMap: Array<[string, string]> = [
            ['Q0', '%Q0.0'],
            ['Q1', '%Q0.1'],
            ['Q2', '%Q0.2'],
            ['Q3', '%Q0.3']
          ];
          for (const [qPinId, addr] of qMap) {
            if (plcOutputs[addr]) {
              const pOut = getPin(qPinId);
              if (pOut) edges.push({ compId: comp.id, pinA: p1L, pinB: pOut });
            }
          }
        }
      }

      if (comp.type === 'contactor_power_3p') {
        const isWelded =
          this.activeFaults.has('welded_contact_km1') ||
          this.activeFaults.has('contacto_soldado') ||
          this.activeFaults.has('welded_contact');
        const isClosed = state.activeCoils.has(comp.tag) || (comp.tag === '-KM1' && isWelded);
        if (isClosed) {
          const pairs: Array<[string, string]> = [['1', '2'], ['3', '4'], ['5', '6']];
          for (const [a, b] of pairs) {
            const pA = getPin(a);
            const pB = getPin(b);
            if (pA && pB) edges.push({ compId: comp.id, pinA: pA, pinB: pB });
          }
        }
      }

      if (comp.type === 'breaker_3p' || comp.type === 'thermal_relay_power') {
        const isClosed = comp.state?.isOpen !== true;
        if (isClosed) {
          const pairs: Array<[string, string]> = [['1', '2'], ['3', '4'], ['5', '6']];
          for (const [a, b] of pairs) {
            const pA = getPin(a);
            const pB = getPin(b);
            if (pA && pB) edges.push({ compId: comp.id, pinA: pA, pinB: pB });
          }
        }
      }

      if (comp.type === 'breaker_1p_n') {
        const isClosed = comp.state?.isOpen !== true;
        if (isClosed) {
          const p1 = getPin('1');
          const p2 = getPin('2');
          const pN1 = getPin('N1');
          const pN2 = getPin('N2');
          if (p1 && p2) edges.push({ compId: comp.id, pinA: p1, pinB: p2 });
          if (pN1 && pN2) edges.push({ compId: comp.id, pinA: pN1, pinB: pN2 });
        }
      }

      if (comp.type === 'contact_no' || comp.type === 'thermal_contact_no') {
        const isWelded =
          this.activeFaults.has('welded_contact_km1') ||
          this.activeFaults.has('contacto_soldado') ||
          this.activeFaults.has('welded_contact');
        const isClosed =
          comp.type === 'contact_no'
            ? state.activeCoils.has(comp.tag) || (comp.tag === '-KM1' && isWelded)
            : this.activeFaults.has('thermal_overload');
        if (isClosed && def.pins.length >= 2) {
          const pA = getPin(def.pins[0].id);
          const pB = getPin(def.pins[1].id);
          if (pA && pB) edges.push({ compId: comp.id, pinA: pA, pinB: pB });
        }
      }

      if (comp.type === 'contact_nc' || comp.type === 'thermal_contact_nc') {
        let isClosed = !state.activeCoils.has(comp.tag);
        if (comp.type === 'thermal_contact_nc' && this.activeFaults.has('thermal_overload')) {
          isClosed = false;
        }
        if (isClosed && def.pins.length >= 2) {
          const pA = getPin(def.pins[0].id);
          const pB = getPin(def.pins[1].id);
          if (pA && pB) edges.push({ compId: comp.id, pinA: pA, pinB: pB });
        }
      }

      if (comp.type === 'contact_timer_ton_no') {
        if (state.activeCoils.has(`${comp.tag}:TIMED`)) {
          const p1 = getPin('67');
          const p2 = getPin('68');
          if (p1 && p2) edges.push({ compId: comp.id, pinA: p1, pinB: p2 });
        }
      }

      if (comp.type === 'contact_timer_ton_nc') {
        if (!state.activeCoils.has(`${comp.tag}:TIMED`)) {
          const p1 = getPin('55');
          const p2 = getPin('56');
          if (p1 && p2) edges.push({ compId: comp.id, pinA: p1, pinB: p2 });
        }
      }

      if (comp.type === 'button_no' || comp.type === 'limit_switch_no') {
        const normTag = comp.tag.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isReedClosed = activeReedSensors?.has(normTag) ?? false;
        if ((comp.state?.isActuated === true || isReedClosed) && def.pins.length >= 2) {
          const pA = getPin(def.pins[0].id);
          const pB = getPin(def.pins[1].id);
          if (pA && pB) edges.push({ compId: comp.id, pinA: pA, pinB: pB });
        }
      }

      if (comp.type === 'button_nc' || comp.type === 'emergency_stop' || comp.type === 'limit_switch_nc') {
        const normTag = comp.tag.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isReedPressed = activeReedSensors?.has(normTag) ?? false;
        const isPressed = comp.state?.isActuated === true || isReedPressed;
        if (!isPressed && def.pins.length >= 2) {
          const pA = getPin(def.pins[0].id);
          const pB = getPin(def.pins[1].id);
          if (pA && pB) edges.push({ compId: comp.id, pinA: pA, pinB: pB });
        }
      }
    }

    return edges;
  }

  private buildEquipotentialNodes(
    pins: PinInstance[],
    state: SimulationState,
    plcOutputs?: Record<string, boolean>,
    activeReedSensors?: Set<string>
  ): ElectricalNode[] {
    const parent = new Map<string, string>();
    const find = (i: string): string => {
      if (!parent.has(i)) parent.set(i, i);
      if (parent.get(i) !== i) {
        parent.set(i, find(parent.get(i)!));
      }
      return parent.get(i)!;
    };
    const union = (i: string, j: string) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent.set(rootI, rootJ);
    };

    const coordKey = (x: number, y: number) => `${x},${y}`;
    const activeWires: WireSegment[] = [];

    for (const wire of this.wires) {
      if (this.isWireCutByFault(wire)) {
        continue;
      }
      activeWires.push(wire);
      union(coordKey(wire.fromX, wire.fromY), coordKey(wire.toX, wire.toY));
    }

    // Conectar uniones en T (junctions) sobre cables compatibles sin cortocircuitar fases distintas
    this.unionJunctionsOnWires(activeWires, union);

    for (const pin of pins) {
      find(coordKey(pin.x, pin.y));
    }

    // Unir todos los contactos cerrados, disyuntores, contactores y salidas a relé PLC
    const closedEdges = this.getClosedSwitchingEdges(pins, state, plcOutputs, activeReedSensors);
    for (const edge of closedEdges) {
      union(coordKey(edge.pinA.x, edge.pinA.y), coordKey(edge.pinB.x, edge.pinB.y));
    }

    const nodeGroups = new Map<string, ElectricalNode>();

    for (const pin of pins) {
      const root = find(coordKey(pin.x, pin.y));
      if (!nodeGroups.has(root)) {
        nodeGroups.set(root, {
          id: root,
          potential: pin.defaultPotential || null,
          voltage: 0,
          pinKeys: [],
          wireIds: []
        });
      }
      const node = nodeGroups.get(root)!;
      node.pinKeys.push(`${pin.componentId}:${pin.pinId}`);
      if (pin.defaultPotential && !node.potential) {
        node.potential = pin.defaultPotential;
      }
    }

    for (const wire of this.wires) {
      if (this.isWireCutByFault(wire)) continue;
      const root = find(coordKey(wire.fromX, wire.fromY));
      if (!nodeGroups.has(root)) {
        nodeGroups.set(root, {
          id: root,
          potential: null,
          voltage: 0,
          pinKeys: [],
          wireIds: []
        });
      }
      nodeGroups.get(root)!.wireIds.push(wire.id);
    }

    return Array.from(nodeGroups.values());
  }

  private propagatePotentials(nodes: ElectricalNode[]) {
    for (const node of nodes) {
      if (node.potential) {
        if (node.potential === 'L1' || node.potential === 'L2' || node.potential === 'L3') {
          node.voltage = 230;
        } else if (node.potential === '+24V') {
          node.voltage = 24;
        } else {
          node.voltage = 0;
        }
      }
    }
  }

  private getComponentDisplayName(comp: PlacedComponent): string {
    const shortName = SHORT_COMPONENT_NAMES[comp.type];
    if (shortName) return `${comp.tag} (${shortName})`;
    const def = this.catalogMap.get(comp.type);
    return `${comp.tag} (${def?.name || comp.type})`;
  }

  private getWireDisplayLabel(wire: WireSegment, potential: string | null): string {
    switch (wire.wireType) {
      case 'phase1':
        return 'Cable Fase L1';
      case 'phase2':
        return 'Cable Fase L2';
      case 'phase3':
        return 'Cable Fase L3';
      case 'phase':
        return potential && potential.startsWith('L') ? `Cable Fase ${potential}` : 'Cable de Fase';
      case 'neutral':
        return 'Cable Neutro (N)';
      case 'pe':
        return 'Conductor Tierra (PE)';
      case 'dc_pos':
        return 'Cable +24V DC';
      case 'dc_neg':
        return 'Cable 0V DC';
      case 'control':
      default:
        if (potential === '+24V' || potential === '0V') return 'Cable Control 24V DC';
        if (potential && potential.startsWith('L')) return 'Cable Maniobra 230V AC';
        return 'Cable de Control';
    }
  }

  private computeLiveMeasurements(
    nodes: ElectricalNode[],
    nextState: SimulationState,
    pins: PinInstance[],
    plcOutputs?: Record<string, boolean>,
    activeReedSensors?: Set<string>
  ) {
    const wireMetrics = nextState.wireMetrics ?? new Map<string, ElectricalMeasurement>();
    const pinMetrics = nextState.pinMetrics ?? new Map<string, ElectricalMeasurement>();
    const componentMetrics = nextState.componentMetrics ?? new Map<string, ElectricalMeasurement>();
    nextState.wireMetrics = wireMetrics;
    nextState.pinMetrics = pinMetrics;
    nextState.componentMetrics = componentMetrics;

    wireMetrics.clear();
    pinMetrics.clear();
    componentMetrics.clear();

    const compById = new Map<string, PlacedComponent>(this.components.map(c => [c.id, c]));
    const pinByKey = new Map<string, PinInstance>();
    for (const p of pins) {
      pinByKey.set(`${p.componentId}:${p.pinId}`, p);
    }

    // 1. Indexar nodos equipotenciales por pin y cable, e identificar nodos de potencia trifásica
    const pinNodeMap = new Map<string, ElectricalNode>();
    const wireNodeMap = new Map<string, ElectricalNode>();
    const nodeIs3Phase = new Map<string, boolean>();

    for (const node of nodes) {
      let has3PhaseComp = false;
      for (const pKey of node.pinKeys) {
        pinNodeMap.set(pKey, node);
        const compId = pKey.split(':')[0];
        const comp = compById.get(compId);
        if (comp && THREE_PHASE_COMPONENT_TYPES.has(comp.type)) {
          has3PhaseComp = true;
        }
      }
      for (const wId of node.wireIds) {
        wireNodeMap.set(wId, node);
      }
      nodeIs3Phase.set(node.id, has3PhaseComp);
    }

    // 2. Construir redes de conductores físicos (sin puentear interruptores/contactores/relés)
    // para propagar corrientes exactas rama a rama y aguas arriba por equipos cerrados
    const netParent = new Map<string, string>();
    const netFind = (k: string): string => {
      if (!netParent.has(k)) netParent.set(k, k);
      if (netParent.get(k) !== k) {
        netParent.set(k, netFind(netParent.get(k)!));
      }
      return netParent.get(k)!;
    };
    const netUnion = (a: string, b: string) => {
      const ra = netFind(a);
      const rb = netFind(b);
      if (ra !== rb) netParent.set(ra, rb);
    };
    const coordKey = (x: number, y: number) => `${x},${y}`;

    const activeWires: WireSegment[] = [];
    for (const wire of this.wires) {
      if (this.isWireCutByFault(wire)) continue;
      activeWires.push(wire);
      netUnion(coordKey(wire.fromX, wire.fromY), coordKey(wire.toX, wire.toY));
    }
    this.unionJunctionsOnWires(activeWires, netUnion);
    for (const p of pins) {
      netFind(coordKey(p.x, p.y));
    }

    const pinNetMap = new Map<string, string>();
    for (const p of pins) {
      pinNetMap.set(`${p.componentId}:${p.pinId}`, netFind(coordKey(p.x, p.y)));
    }
    const wireNetMap = new Map<string, string>();
    for (const wire of activeWires) {
      wireNetMap.set(wire.id, netFind(coordKey(wire.fromX, wire.fromY)));
    }

    // Potencial de cada wireNet (heredado de su ElectricalNode)
    const netPotential = new Map<string, string | null>();
    for (const p of pins) {
      const pKey = `${p.componentId}:${p.pinId}`;
      const netId = pinNetMap.get(pKey)!;
      const pot = pinNodeMap.get(pKey)?.potential ?? null;
      if (pot && !netPotential.get(netId)) {
        netPotential.set(netId, pot);
      } else if (!netPotential.has(netId)) {
        netPotential.set(netId, pot);
      }
    }
    for (const wire of activeWires) {
      const netId = wireNetMap.get(wire.id)!;
      const pot = wireNodeMap.get(wire.id)?.potential ?? null;
      if (pot && !netPotential.get(netId)) {
        netPotential.set(netId, pot);
      } else if (!netPotential.has(netId)) {
        netPotential.set(netId, pot);
      }
    }

    // Flags globales de fallas activas
    const isL1Cut = this.activeFaults.has('phase_loss_l1') || this.activeFaults.has('corte_fase_l1');
    const isL2Cut =
      this.activeFaults.has('phase_loss_l2') ||
      this.activeFaults.has('corte_fase_l2') ||
      this.activeFaults.has('fase_cortada');
    const isL3Cut = this.activeFaults.has('phase_loss_l3') || this.activeFaults.has('corte_fase_l3');
    const hasAnyPhaseLoss = isL1Cut || isL2Cut || isL3Cut;
    const hasThermalOverload = this.activeFaults.has('thermal_overload');
    const hasOpenCoilFault = this.activeFaults.has('open_coil_km1') || this.activeFaults.has('bobina_abierta');
    const hasShortCircuit = this.activeFaults.has('short_circuit');
    const hasWeldedContact =
      this.activeFaults.has('welded_contact_km1') ||
      this.activeFaults.has('contacto_soldado') ||
      this.activeFaults.has('welded_contact');

    const isLivePotential = (pot?: string | null): boolean =>
      Boolean(pot && (pot === 'L1' || pot === 'L2' || pot === 'L3' || pot === '+24V'));
    const isReturnPotential = (pot?: string | null): boolean => pot === 'N' || pot === '0V';

    // 3. Evaluar cargas activas por componente y sembrarlas en sus wireNets
    const loadCatalog = new Map<string, LoadContribution>();
    const liveNetLoads = new Map<string, Set<string>>();
    const returnNetLoads = new Map<string, Set<string>>();
    const loadPinOverrides = new Map<
      string,
      { currentA: number; powerW: number; statusNote?: string; isOverload?: boolean }
    >();

    const seedNetLoad = (netId: string | undefined, load: LoadContribution, isReturn = false) => {
      if (!netId || load.currentA <= 0) return;
      loadCatalog.set(load.id, load);
      const targetMap = isReturn ? returnNetLoads : liveNetLoads;
      if (!targetMap.has(netId)) targetMap.set(netId, new Set<string>());
      targetMap.get(netId)!.add(load.id);
    };

    const getPinPotential = (compId: string, pinId: string): string | null =>
      pinNodeMap.get(`${compId}:${pinId}`)?.potential ?? null;

    const getCompCenter = (comp: PlacedComponent) => {
      const def = this.catalogMap.get(comp.type);
      return {
        gridX: comp.x + (def ? def.width / 2 : 1),
        gridY: comp.y + (def ? def.height / 2 : 1)
      };
    };

    for (const comp of this.components) {
      const center = getCompCenter(comp);

      // 3A. Motores trifásicos (3 bornes y 6 bornes Y-Δ)
      if (comp.type === 'motor_3phase' || comp.type === 'motor_3phase_6p') {
        const pU = getPinPotential(comp.id, 'U1');
        const pV = getPinPotential(comp.id, 'V1');
        const pW = getPinPotential(comp.id, 'W1');
        const phasePins: Array<[string, string | null]> = [
          ['U1', pU],
          ['V1', pV],
          ['W1', pW]
        ];
        const livePhases = phasePins.filter(([, pot]) => pot === 'L1' || pot === 'L2' || pot === 'L3');
        const motorState = nextState.motorStates.get(comp.id);
        const rpm = motorState?.rpm ?? 0;
        const targetRpm = motorState?.targetRpm ?? 0;

        const isPhaseLossRunning =
          (livePhases.length === 2 || (hasAnyPhaseLoss && livePhases.length >= 2)) &&
          (rpm > 10 || targetRpm >= 20);
        const isNormalRunning =
          livePhases.length === 3 &&
          !motorState?.hasError &&
          !isPhaseLossRunning &&
          (rpm > 40 || targetRpm > 40);

        let currentA = 0;
        let powerW = 0;
        let statusNote = 'Motor trifásico detenido (0 RPM)';
        let isOverload = false;

        if (isPhaseLossRunning) {
          currentA = 18.65;
          powerW = 2850;
          isOverload = true;
          const missingBorne = !pU ? 'U1' : !pV ? 'V1' : 'W1';
          statusNote = `¡SOBRECARGA! Pérdida de fase en ${missingBorne} — régimen bifásico crítico`;
        } else if (isNormalRunning) {
          currentA = 7.42;
          powerW = Math.round(Math.sqrt(3) * 400 * 7.42 * 0.85); // 4369 W (4.37 kW)
          const dirText = motorState?.direction === -1 ? 'antihorario' : 'horario';
          const cfgText =
            comp.type === 'motor_3phase_6p'
              ? targetRpm === 1420
                ? ' [Estrella Y]'
                : ' [Triángulo Δ]'
              : '';
          statusNote = `Motor en marcha nominal (${rpm} RPM, giro ${dirText})${cfgText}`;
        } else if (motorState?.hasError) {
          statusNote = 'Error: Secuencia de fases inválida o repetida';
        }

        const load: LoadContribution = {
          id: `load:${comp.id}`,
          currentA,
          powerW,
          isOverload,
          warningNote: isOverload ? '¡SOBRECORRIENTE 18.65 A! Pérdida de fase en motor' : undefined
        };

        for (const [pId, pot] of phasePins) {
          const pKey = `${comp.id}:${pId}`;
          if (pot === 'L1' || pot === 'L2' || pot === 'L3') {
            seedNetLoad(pinNetMap.get(pKey), load, false);
            loadPinOverrides.set(pKey, {
              currentA,
              powerW,
              isOverload,
              statusNote: isOverload
                ? `¡SOBRECARGA! 18.65 A en borne ${pId} por falta de fase`
                : currentA > 0
                  ? `Fase ${pot} alimentando devanado ${pId} (${currentA.toFixed(2)} A)`
                  : `Tensión ${pot} presente en borne ${pId}`
            });
          } else if (isPhaseLossRunning) {
            loadPinOverrides.set(pKey, {
              currentA: 0,
              powerW: 0,
              statusNote: `Falla: Ausencia de fase en borne ${pId} (conductor abierto)`
            });
          }
        }

        // En motor 6 bornes en triángulo, también sembrar en W2/U2/V2 si están energizados
        if (comp.type === 'motor_3phase_6p' && currentA > 0) {
          for (const secPin of ['W2', 'U2', 'V2']) {
            const pKey = `${comp.id}:${secPin}`;
            const secPot = getPinPotential(comp.id, secPin);
            if (secPot === 'L1' || secPot === 'L2' || secPot === 'L3') {
              seedNetLoad(pinNetMap.get(pKey), load, false);
              loadPinOverrides.set(pKey, {
                currentA,
                powerW,
                isOverload,
                statusNote: `Borne ${secPin} en conexión Triángulo (Δ)`
              });
            } else {
              loadPinOverrides.set(pKey, {
                currentA: 0,
                powerW: 0,
                statusNote: 'Punto neutro de conexión Estrella (Y)'
              });
            }
          }
        }

        const primaryPot = livePhases.length === 3 ? 'L1-L2-L3' : livePhases.map(([, p]) => p).join('-') || 'Sin tensión';
        componentMetrics.set(comp.id, {
          label: this.getComponentDisplayName(comp),
          targetType: 'component',
          targetId: comp.id,
          potential: primaryPot,
          voltageV: livePhases.length >= 2 ? 400.0 : livePhases.length === 1 ? 230.0 : 0.0,
          voltageMode: 'AC',
          currentA,
          powerW,
          frequencyHz: livePhases.length > 0 ? 60.0 : 0,
          isEnergized: livePhases.length > 0,
          statusNote,
          ...center
        });
        continue;
      }

      // 3B. Motor monofásico
      if (comp.type === 'motor_1phase') {
        const pU1 = getPinPotential(comp.id, 'U1');
        const pU2 = getPinPotential(comp.id, 'U2');
        const isEnergized = Boolean(
          pU1 && pU2 && ((pU1.startsWith('L') && pU2 === 'N') || (pU2.startsWith('L') && pU1 === 'N'))
        );
        const currentA = isEnergized ? 4.2 : 0;
        const powerW = isEnergized ? 821 : 0;
        const load: LoadContribution = { id: `load:${comp.id}`, currentA, powerW };

        if (isEnergized) {
          const livePin = pU1?.startsWith('L') ? 'U1' : 'U2';
          const retPin = livePin === 'U1' ? 'U2' : 'U1';
          seedNetLoad(pinNetMap.get(`${comp.id}:${livePin}`), load, false);
          seedNetLoad(pinNetMap.get(`${comp.id}:${retPin}`), load, true);
          loadPinOverrides.set(`${comp.id}:${livePin}`, {
            currentA,
            powerW,
            statusNote: 'Fase alimentando motor monofásico (4.20 A)'
          });
          loadPinOverrides.set(`${comp.id}:${retPin}`, {
            currentA,
            powerW: 0,
            statusNote: 'Retorno neutro de motor monofásico'
          });
        }

        const livePot = pU1?.startsWith('L') ? pU1 : pU2?.startsWith('L') ? pU2 : 'Sin tensión';
        componentMetrics.set(comp.id, {
          label: this.getComponentDisplayName(comp),
          targetType: 'component',
          targetId: comp.id,
          potential: livePot,
          voltageV: isEnergized || livePot !== 'Sin tensión' ? 230.0 : 0.0,
          voltageMode: 'AC',
          currentA,
          powerW,
          frequencyHz: livePot !== 'Sin tensión' ? 60.0 : 0,
          isEnergized,
          statusNote: isEnergized
            ? 'Motor monofásico en marcha nominal (1450 RPM)'
            : 'Motor monofásico detenido (0 RPM)',
          ...center
        });
        continue;
      }

      // 3C. Bobinas de contactor y temporizadores TON / TOF
      if (comp.type === 'coil_contactor' || comp.type === 'coil_timer_ton' || comp.type === 'coil_timer_tof') {
        const pA1 = getPinPotential(comp.id, 'A1');
        const pA2 = getPinPotential(comp.id, 'A2');
        const linkedAddr = comp.plcAddress?.toUpperCase();
        const isPlcDriven = !!(linkedAddr && plcOutputs && plcOutputs[linkedAddr]);
        const isOpenKm1 = comp.tag === '-KM1' && hasOpenCoilFault;

        const isDcCoil =
          pA1 === '+24V' ||
          pA2 === '+24V' ||
          pA1 === '0V' ||
          pA2 === '0V' ||
          (isPlcDriven && !(pA1?.startsWith('L') || pA2?.startsWith('L')));

        const livePot = isLivePotential(pA1)
          ? pA1!
          : isLivePotential(pA2)
            ? pA2!
            : isPlcDriven
              ? '+24V'
              : 'Sin tensión';

        const hasSupplyAcross =
          isPlcDriven ||
          Boolean(
            (isLivePotential(pA1) && isReturnPotential(pA2)) ||
              (isLivePotential(pA2) && isReturnPotential(pA1))
          );

        const isActive = nextState.activeCoils.has(comp.tag);
        const voltageMode: 'AC' | 'DC' = isDcCoil ? 'DC' : 'AC';
        const nominalV = isDcCoil ? 24.0 : 230.0;
        const voltageV = livePot !== 'Sin tensión' ? nominalV : 0.0;

        let currentA = 0;
        let powerW = 0;
        let statusNote = 'Bobina desenergizada (reposo)';

        if (isOpenKm1) {
          currentA = 0;
          powerW = 0;
          statusNote = 'Falla: Bobina abierta (O.L)';
          if (isLivePotential(pA1)) {
            loadPinOverrides.set(`${comp.id}:A1`, {
              currentA: 0,
              powerW: 0,
              statusNote: 'Falla: Bobina abierta (O.L) — tensión presente sin corriente'
            });
          }
          if (isReturnPotential(pA2)) {
            loadPinOverrides.set(`${comp.id}:A2`, {
              currentA: 0,
              powerW: 0,
              statusNote: 'Falla: Bobina abierta (O.L) — circuito interrumpido'
            });
          }
        } else if (isActive || hasSupplyAcross) {
          currentA = isDcCoil ? 0.25 : 0.12;
          powerW = isDcCoil ? 6.0 : 27.6;
          const timerSt = nextState.timerStates.get(comp.id);
          if (timerSt) {
            statusNote = timerSt.isComplete
              ? `Temporizador completado (${timerSt.targetTime}s) — contactos conmutados`
              : `Temporizando (${timerSt.elapsedTime.toFixed(1)}s / ${timerSt.targetTime}s)`;
          } else {
            statusNote = isDcCoil
              ? 'Bobina energizada (24V DC — electroimán enclavado)'
              : 'Bobina energizada (230V AC — electroimán enclavado)';
          }

          const load: LoadContribution = { id: `load:${comp.id}`, currentA, powerW };
          const livePinId = isLivePotential(pA1) ? 'A1' : isLivePotential(pA2) ? 'A2' : 'A1';
          const retPinId = livePinId === 'A1' ? 'A2' : 'A1';

          if (isLivePotential(getPinPotential(comp.id, livePinId))) {
            seedNetLoad(pinNetMap.get(`${comp.id}:${livePinId}`), load, false);
          }
          if (isReturnPotential(getPinPotential(comp.id, retPinId))) {
            seedNetLoad(pinNetMap.get(`${comp.id}:${retPinId}`), load, true);
          }
          loadPinOverrides.set(`${comp.id}:${livePinId}`, {
            currentA,
            powerW,
            statusNote
          });
          loadPinOverrides.set(`${comp.id}:${retPinId}`, {
            currentA,
            powerW: 0,
            statusNote: isDcCoil ? 'Retorno 0V DC de bobina energizada' : 'Retorno Neutro de bobina energizada'
          });
        }

        componentMetrics.set(comp.id, {
          label: this.getComponentDisplayName(comp),
          targetType: 'component',
          targetId: comp.id,
          potential: livePot,
          voltageV,
          voltageMode,
          currentA,
          powerW,
          frequencyHz: voltageMode === 'AC' && voltageV > 0 ? 60.0 : 0,
          isEnergized: isActive || (isOpenKm1 && voltageV > 0),
          statusNote,
          ...center
        });
        continue;
      }

      // 3D. Electroválvula 5/2 biestable (Y1 / Y2)
      if (comp.type === 'solenoid_valve_5_2') {
        const y1Active =
          nextState.activeCoils.has(`${comp.tag}:Y1`) ||
          nextState.activeCoils.has('Y1') ||
          Boolean(plcOutputs?.['%Q0.2'] && comp.tag === '-A');
        const y2Active =
          nextState.activeCoils.has(`${comp.tag}:Y2`) ||
          nextState.activeCoils.has('Y2') ||
          Boolean(plcOutputs?.['%Q0.3'] && comp.tag === '-A');

        const activeCount = (y1Active ? 1 : 0) + (y2Active ? 1 : 0);
        const currentA = Number((activeCount * 0.45).toFixed(2));
        const powerW = Number((activeCount * 10.8).toFixed(1));

        if (y1Active) {
          const loadY1: LoadContribution = { id: `load:${comp.id}:Y1`, currentA: 0.45, powerW: 10.8 };
          if (isLivePotential(getPinPotential(comp.id, 'Y1_A1'))) {
            seedNetLoad(pinNetMap.get(`${comp.id}:Y1_A1`), loadY1, false);
          }
          if (isReturnPotential(getPinPotential(comp.id, 'Y1_A2'))) {
            seedNetLoad(pinNetMap.get(`${comp.id}:Y1_A2`), loadY1, true);
          }
          loadPinOverrides.set(`${comp.id}:Y1_A1`, {
            currentA: 0.45,
            powerW: 10.8,
            statusNote: 'Solenoide Y1 activo (Avance A+)'
          });
          loadPinOverrides.set(`${comp.id}:Y1_A2`, {
            currentA: 0.45,
            powerW: 0,
            statusNote: 'Retorno 0V DC solenoide Y1'
          });
        }
        if (y2Active) {
          const loadY2: LoadContribution = { id: `load:${comp.id}:Y2`, currentA: 0.45, powerW: 10.8 };
          if (isLivePotential(getPinPotential(comp.id, 'Y2_A1'))) {
            seedNetLoad(pinNetMap.get(`${comp.id}:Y2_A1`), loadY2, false);
          }
          if (isReturnPotential(getPinPotential(comp.id, 'Y2_A2'))) {
            seedNetLoad(pinNetMap.get(`${comp.id}:Y2_A2`), loadY2, true);
          }
          loadPinOverrides.set(`${comp.id}:Y2_A1`, {
            currentA: 0.45,
            powerW: 10.8,
            statusNote: 'Solenoide Y2 activo (Retorno A-)'
          });
          loadPinOverrides.set(`${comp.id}:Y2_A2`, {
            currentA: 0.45,
            powerW: 0,
            statusNote: 'Retorno 0V DC solenoide Y2'
          });
        }

        const statusNote =
          y1Active && y2Active
            ? 'Solenoides Y1 y Y2 activos simultáneamente (0.90 A)'
            : y1Active
              ? 'Solenoide Y1 energizado — pilotando avance A+'
              : y2Active
                ? 'Solenoide Y2 energizado — pilotando retorno A-'
                : 'Electroválvula en reposo (sin excitación)';

        componentMetrics.set(comp.id, {
          label: this.getComponentDisplayName(comp),
          targetType: 'component',
          targetId: comp.id,
          potential: activeCount > 0 ? '+24V' : 'Sin tensión',
          voltageV: activeCount > 0 ? 24.0 : 0.0,
          voltageMode: 'DC',
          currentA,
          powerW,
          frequencyHz: 0,
          isEnergized: activeCount > 0,
          statusNote,
          ...center
        });
        continue;
      }

      // 3E. Pilotos luminosos y bocinas
      if (comp.type.startsWith('pilot_light_') || comp.type === 'horn_siren') {
        const isLit = nextState.pilotLights.get(comp.id)?.isLit === true;
        const pX1 = getPinPotential(comp.id, 'X1');
        const pX2 = getPinPotential(comp.id, 'X2');
        const linkedAddr = comp.plcAddress?.toUpperCase();
        const isPlcDriven = !!(linkedAddr && plcOutputs && plcOutputs[linkedAddr]);

        const isDcPilot =
          pX1 === '+24V' ||
          pX2 === '+24V' ||
          pX1 === '0V' ||
          pX2 === '0V' ||
          (isPlcDriven && !(pX1?.startsWith('L') || pX2?.startsWith('L')));

        const voltageMode: 'AC' | 'DC' = isDcPilot ? 'DC' : 'AC';
        const nominalV = isDcPilot ? 24.0 : 230.0;
        const currentA = isLit ? 0.08 : 0.0;
        const powerW = isLit ? (isDcPilot ? 1.9 : 18.4) : 0.0;

        if (isLit) {
          const load: LoadContribution = { id: `load:${comp.id}`, currentA, powerW };
          const livePinId = isLivePotential(pX1) ? 'X1' : isLivePotential(pX2) ? 'X2' : 'X1';
          const retPinId = livePinId === 'X1' ? 'X2' : 'X1';
          if (isLivePotential(getPinPotential(comp.id, livePinId))) {
            seedNetLoad(pinNetMap.get(`${comp.id}:${livePinId}`), load, false);
          }
          if (isReturnPotential(getPinPotential(comp.id, retPinId))) {
            seedNetLoad(pinNetMap.get(`${comp.id}:${retPinId}`), load, true);
          }
          loadPinOverrides.set(`${comp.id}:${livePinId}`, {
            currentA,
            powerW,
            statusNote: comp.type === 'horn_siren' ? 'Bocina activa (0.08 A)' : 'Piloto encendido (0.08 A)'
          });
          loadPinOverrides.set(`${comp.id}:${retPinId}`, {
            currentA,
            powerW: 0,
            statusNote: isDcPilot ? 'Retorno 0V DC de señalización' : 'Retorno Neutro de señalización'
          });
        }

        const livePot = isLivePotential(pX1)
          ? pX1!
          : isLivePotential(pX2)
            ? pX2!
            : isLit
              ? isDcPilot
                ? '+24V'
                : 'L1'
              : 'Sin tensión';

        componentMetrics.set(comp.id, {
          label: this.getComponentDisplayName(comp),
          targetType: 'component',
          targetId: comp.id,
          potential: livePot,
          voltageV: isLit || livePot !== 'Sin tensión' ? nominalV : 0.0,
          voltageMode,
          currentA,
          powerW,
          frequencyHz: voltageMode === 'AC' && (isLit || livePot !== 'Sin tensión') ? 60.0 : 0,
          isEnergized: isLit,
          statusNote: isLit
            ? comp.type === 'horn_siren'
              ? 'Avisador acústico activado'
              : 'Piloto luminoso encendido'
            : 'Indicador apagado (0.00 A)',
          ...center
        });
        continue;
      }

      // 3F. PLC Siemens S7-1200
      if (comp.type === 'plc_cpu_s71200') {
        const potLPlus = getPinPotential(comp.id, 'L_PLUS');
        const isPowered = potLPlus === '+24V';
        const qAddrs = ['%Q0.0', '%Q0.1', '%Q0.2', '%Q0.3'];
        const activeQCount = qAddrs.filter(
          addr => Boolean(plcOutputs?.[addr]) || nextState.activeCoils.has(`PLC:${addr}`)
        ).length;

        const currentA = isPowered ? Number((0.35 + activeQCount * 0.15).toFixed(2)) : 0;
        const powerW = isPowered ? Number((24.0 * currentA).toFixed(1)) : 0;

        if (isPowered) {
          const load: LoadContribution = { id: `load:${comp.id}`, currentA, powerW };
          seedNetLoad(pinNetMap.get(`${comp.id}:L_PLUS`), load, false);
          if (isReturnPotential(getPinPotential(comp.id, 'M'))) {
            seedNetLoad(pinNetMap.get(`${comp.id}:M`), load, true);
          }
          loadPinOverrides.set(`${comp.id}:L_PLUS`, {
            currentA,
            powerW,
            statusNote: `Alimentación CPU S7-1200 (${currentA.toFixed(2)} A)`
          });
          loadPinOverrides.set(`${comp.id}:M`, {
            currentA,
            powerW: 0,
            statusNote: 'Masa 0V DC de CPU S7-1200'
          });
        }

        // Entradas digitales I0..I4 activas consumen ~0.01 A (10 mA optoacoplador)
        const diPins: Array<[string, string]> = [
          ['I0', '%I0.0'],
          ['I1', '%I0.1'],
          ['I2', '%I0.2'],
          ['I3', '%I0.3'],
          ['I4', '%I0.4']
        ];
        for (const [pId, addr] of diPins) {
          const pKey = `${comp.id}:${pId}`;
          const pot = getPinPotential(comp.id, pId);
          if (pot === '+24V') {
            const diLoad: LoadContribution = {
              id: `load:${comp.id}:${pId}`,
              currentA: 0.01,
              powerW: 0.2
            };
            seedNetLoad(pinNetMap.get(pKey), diLoad, false);
            loadPinOverrides.set(pKey, {
              currentA: 0.01,
              powerW: 0.2,
              statusNote: `Entrada digital ${addr} en estado ALTO (1)`
            });
          } else {
            loadPinOverrides.set(pKey, {
              currentA: 0,
              powerW: 0,
              statusNote: `Entrada digital ${addr} en estado BAJO (0)`
            });
          }
        }

        componentMetrics.set(comp.id, {
          label: this.getComponentDisplayName(comp),
          targetType: 'component',
          targetId: comp.id,
          potential: isPowered ? '+24V' : 'Sin tensión',
          voltageV: isPowered ? 24.0 : 0.0,
          voltageMode: 'DC',
          currentA,
          powerW,
          frequencyHz: 0,
          isEnergized: isPowered,
          statusNote: isPowered
            ? activeQCount > 0
              ? `CPU S7-1200 en RUN (${activeQCount} salida${activeQCount > 1 ? 's' : ''} Q activa${activeQCount > 1 ? 's' : ''})`
              : 'CPU S7-1200 en RUN (consumo base 0.35 A)'
            : 'CPU sin alimentación 24V DC',
          ...center
        });
        continue;
      }

      // 3G. Micro-PLC LOGO!
      if (comp.type === 'plc_logo') {
        const potL1 = getPinPotential(comp.id, 'L1');
        const isPowered = Boolean(potL1 && potL1.startsWith('L'));
        const currentA = isPowered ? 0.05 : 0;
        const powerW = isPowered ? 11.5 : 0;
        if (isPowered) {
          const load: LoadContribution = { id: `load:${comp.id}`, currentA, powerW };
          seedNetLoad(pinNetMap.get(`${comp.id}:L1`), load, false);
          if (isReturnPotential(getPinPotential(comp.id, 'N'))) {
            seedNetLoad(pinNetMap.get(`${comp.id}:N`), load, true);
          }
        }
        componentMetrics.set(comp.id, {
          label: this.getComponentDisplayName(comp),
          targetType: 'component',
          targetId: comp.id,
          potential: isPowered ? potL1! : 'Sin tensión',
          voltageV: isPowered ? 230.0 : 0.0,
          voltageMode: 'AC',
          currentA,
          powerW,
          frequencyHz: isPowered ? 60.0 : 0,
          isEnergized: isPowered,
          statusNote: isPowered ? 'Micro-PLC LOGO! energizado (RUN)' : 'Micro-PLC sin alimentación',
          ...center
        });
        continue;
      }

      // 3H. Cilindro neumático doble efecto (sin bornes eléctricos)
      if (comp.type === 'pneumatic_cylinder_da') {
        const pneu = nextState.pneumaticStates?.get(comp.id);
        const pct = Math.round((pneu?.position ?? comp.state?.pistonPos ?? 0) * 100);
        const motionText = pneu?.isExtending
          ? 'extendiendo (A+)'
          : pneu?.isRetracting
            ? 'retrayendo (A-)'
            : pneu?.atEnd
              ? 'extendido en a1'
              : 'retraído en a0';

        componentMetrics.set(comp.id, {
          label: this.getComponentDisplayName(comp),
          targetType: 'component',
          targetId: comp.id,
          potential: 'Neumático',
          voltageV: 0,
          voltageMode: 'DC',
          currentA: 0,
          powerW: 0,
          frequencyHz: 0,
          isEnergized: false,
          statusNote: `Actuador neumático 6 bar — vástago ${motionText} (${pct}%)`,
          ...center
        });
      }
    }

    // 4. Propagar corrientes de carga aguas arriba a través de interruptores, disyuntores,
    // contactores, relés térmicos y salidas a relé PLC cerrados (BFS de distancia + 2 pasadas)
    const closedEdges = this.getClosedSwitchingEdges(pins, nextState, plcOutputs, activeReedSensors);
    const netAdj = new Map<string, Set<string>>();
    const addAdj = (a: string, b: string) => {
      if (a === b) return;
      if (!netAdj.has(a)) netAdj.set(a, new Set<string>());
      if (!netAdj.has(b)) netAdj.set(b, new Set<string>());
      netAdj.get(a)!.add(b);
      netAdj.get(b)!.add(a);
    };
    for (const edge of closedEdges) {
      const netA = pinNetMap.get(`${edge.pinA.componentId}:${edge.pinA.pinId}`);
      const netB = pinNetMap.get(`${edge.pinB.componentId}:${edge.pinB.pinId}`);
      if (netA && netB) addAdj(netA, netB);
    }

    // Calcular distancia desde fuentes vivas (L1/L2/L3/+24V)
    const liveDist = new Map<string, number>();
    const liveQueue: string[] = [];
    for (const p of pins) {
      if (isLivePotential(p.defaultPotential)) {
        const netId = pinNetMap.get(`${p.componentId}:${p.pinId}`);
        if (netId && !liveDist.has(netId)) {
          liveDist.set(netId, 0);
          liveQueue.push(netId);
        }
      }
    }
    let qIdx = 0;
    while (qIdx < liveQueue.length) {
      const cur = liveQueue[qIdx++];
      const curD = liveDist.get(cur)!;
      const neighbors = netAdj.get(cur);
      if (!neighbors) continue;
      for (const nb of neighbors) {
        if (!liveDist.has(nb) && isLivePotential(netPotential.get(nb))) {
          liveDist.set(nb, curD + 1);
          liveQueue.push(nb);
        }
      }
    }

    // Propagar cargas vivas aguas arriba (de mayor distancia hacia distancia 0) en 2 pasadas
    const netsByLiveDistDesc = Array.from(liveDist.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([netId]) => netId);

    for (let pass = 0; pass < 2; pass++) {
      for (const netId of netsByLiveDistDesc) {
        const loads = liveNetLoads.get(netId);
        if (!loads || loads.size === 0) continue;
        const myDist = liveDist.get(netId)!;
        const neighbors = netAdj.get(netId);
        if (!neighbors) continue;

        for (const nb of neighbors) {
          const nbDist = liveDist.get(nb);
          if (nbDist !== undefined && nbDist < myDist) {
            if (!liveNetLoads.has(nb)) liveNetLoads.set(nb, new Set<string>());
            const nbSet = liveNetLoads.get(nb)!;
            loads.forEach(lId => nbSet.add(lId));
          }
        }
      }
    }

    // Calcular distancia desde fuentes de retorno (N / 0V) y propagar corriente de retorno
    const returnDist = new Map<string, number>();
    const returnQueue: string[] = [];
    for (const p of pins) {
      if (isReturnPotential(p.defaultPotential)) {
        const netId = pinNetMap.get(`${p.componentId}:${p.pinId}`);
        if (netId && !returnDist.has(netId)) {
          returnDist.set(netId, 0);
          returnQueue.push(netId);
        }
      }
    }
    qIdx = 0;
    while (qIdx < returnQueue.length) {
      const cur = returnQueue[qIdx++];
      const curD = returnDist.get(cur)!;
      const neighbors = netAdj.get(cur);
      if (!neighbors) continue;
      for (const nb of neighbors) {
        if (!returnDist.has(nb) && isReturnPotential(netPotential.get(nb))) {
          returnDist.set(nb, curD + 1);
          returnQueue.push(nb);
        }
      }
    }
    const netsByReturnDistDesc = Array.from(returnDist.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([netId]) => netId);

    for (let pass = 0; pass < 2; pass++) {
      for (const netId of netsByReturnDistDesc) {
        const loads = returnNetLoads.get(netId);
        if (!loads || loads.size === 0) continue;
        const myDist = returnDist.get(netId)!;
        const neighbors = netAdj.get(netId);
        if (!neighbors) continue;
        for (const nb of neighbors) {
          const nbDist = returnDist.get(nb);
          if (nbDist !== undefined && nbDist < myDist) {
            if (!returnNetLoads.has(nb)) returnNetLoads.set(nb, new Set<string>());
            const nbSet = returnNetLoads.get(nb)!;
            loads.forEach(lId => nbSet.add(lId));
          }
        }
      }
    }

    // Helper para agregar totales de corriente y potencia en un wireNet
    const aggregateLoads = (loadIds?: Set<string>) => {
      if (!loadIds || loadIds.size === 0) {
        return { currentA: 0, powerW: 0, isOverload: false, warningNote: undefined as string | undefined };
      }
      let currentA = 0;
      let powerW = 0;
      let isOverload = false;
      let warningNote: string | undefined;

      for (const id of loadIds) {
        const entry = loadCatalog.get(id);
        if (!entry) continue;
        currentA += entry.currentA;
        powerW += entry.powerW;
        if (entry.isOverload) {
          isOverload = true;
          warningNote = entry.warningNote;
        }
      }

      return {
        currentA: Number(currentA.toFixed(2)),
        powerW: Number(powerW.toFixed(1)),
        isOverload,
        warningNote
      };
    };

    const getNetTotals = (netId?: string, pot?: string | null) => {
      if (!netId || !pot || pot === 'PE') {
        return { currentA: 0, powerW: 0, isOverload: false, warningNote: undefined as string | undefined };
      }
      if (isLivePotential(pot)) {
        return aggregateLoads(liveNetLoads.get(netId));
      }
      if (isReturnPotential(pot)) {
        const ret = aggregateLoads(returnNetLoads.get(netId));
        return { currentA: ret.currentA, powerW: 0, isOverload: ret.isOverload, warningNote: ret.warningNote };
      }
      return { currentA: 0, powerW: 0, isOverload: false, warningNote: undefined as string | undefined };
    };

    // Helper para tensión de un punto según potencial y contexto trifásico vs mando
    const computeVoltageSpec = (
      pot: string | null,
      is3PhaseContext: boolean,
      preferDcWhenFloating = false
    ): {
      potential: string;
      voltageV: number;
      voltageMode: 'AC' | 'DC';
      frequencyHz: number;
      isEnergized: boolean;
    } => {
      if (pot === 'L1' || pot === 'L2' || pot === 'L3') {
        return {
          potential: pot,
          voltageV: is3PhaseContext ? 400.0 : 230.0,
          voltageMode: 'AC',
          frequencyHz: 60.0,
          isEnergized: true
        };
      }
      if (pot === '+24V') {
        return {
          potential: '+24V',
          voltageV: 24.0,
          voltageMode: 'DC',
          frequencyHz: 0,
          isEnergized: true
        };
      }
      if (pot === 'N') {
        return {
          potential: 'N',
          voltageV: 0.0,
          voltageMode: 'AC',
          frequencyHz: 60.0,
          isEnergized: false
        };
      }
      if (pot === '0V') {
        return {
          potential: '0V',
          voltageV: 0.0,
          voltageMode: 'DC',
          frequencyHz: 0,
          isEnergized: false
        };
      }
      if (pot === 'PE') {
        return {
          potential: 'PE',
          voltageV: 0.0,
          voltageMode: 'AC',
          frequencyHz: 0,
          isEnergized: false
        };
      }
      return {
        potential: 'Sin tensión',
        voltageV: 0.0,
        voltageMode: preferDcWhenFloating ? 'DC' : 'AC',
        frequencyHz: 0,
        isEnergized: false
      };
    };

    // 5. Poblar wireMetrics para cada cable del esquema
    for (const wire of this.wires) {
      const midX = (wire.fromX + wire.toX) / 2;
      const midY = (wire.fromY + wire.toY) / 2;

      if (this.isWireCutByFault(wire)) {
        const phaseName =
          wire.wireType === 'phase1' ? 'L1' : wire.wireType === 'phase2' ? 'L2' : 'L3';
        wireMetrics.set(wire.id, {
          label: this.getWireDisplayLabel(wire, null),
          targetType: 'wire',
          targetId: wire.id,
          potential: 'Sin tensión',
          voltageV: 0.0,
          voltageMode: 'AC',
          currentA: 0.0,
          powerW: 0.0,
          frequencyHz: 0,
          isEnergized: false,
          statusNote: `Falla: Conductor de fase ${phaseName} seccionado (corte de fase)`,
          gridX: midX,
          gridY: midY
        });
        continue;
      }

      const node = wireNodeMap.get(wire.id);
      const pot = node?.potential ?? null;
      const is3PhaseWire =
        wire.wireType === 'phase1' || wire.wireType === 'phase2' || wire.wireType === 'phase3'
          ? Boolean(node ? nodeIs3Phase.get(node.id) : true)
          : wire.wireType === 'phase' && Boolean(node && nodeIs3Phase.get(node.id));
      const preferDc = wire.wireType === 'dc_pos' || wire.wireType === 'dc_neg';

      const vSpec = computeVoltageSpec(pot, is3PhaseWire, preferDc);
      const netId = wireNetMap.get(wire.id);
      const totals = getNetTotals(netId, pot);

      let statusNote = 'Circuito abierto (sin tensión)';
      if (totals.warningNote) {
        statusNote = totals.warningNote;
      } else if (pot === 'PE') {
        statusNote = 'Conductor de protección a tierra (PE)';
      } else if (pot === 'N') {
        statusNote =
          totals.currentA > 0
            ? `Retorno neutro conduciendo ${totals.currentA.toFixed(2)} A`
            : 'Conductor neutro de referencia (0 V)';
      } else if (pot === '0V') {
        statusNote =
          totals.currentA > 0
            ? `Retorno 0V DC conduciendo ${totals.currentA.toFixed(2)} A`
            : 'Referencia común 0V DC';
      } else if (vSpec.isEnergized) {
        if (totals.currentA > 0) {
          statusNote = is3PhaseWire
            ? `Línea trifásica ${pot} con carga activa (${totals.currentA.toFixed(2)} A)`
            : vSpec.voltageMode === 'DC'
              ? `Línea 24V DC alimentando carga (${totals.currentA.toFixed(2)} A)`
              : `Línea de mando 230V AC con carga (${totals.currentA.toFixed(2)} A)`;
        } else {
          statusNote = is3PhaseWire
            ? `Tensión trifásica ${pot} presente (en vacío)`
            : vSpec.voltageMode === 'DC'
              ? 'Tensión +24V DC presente (sin carga)'
              : 'Tensión 230V AC presente (espera)';
        }
      } else if (hasShortCircuit && is3PhaseWire) {
        statusNote = 'Sin tensión — guardamotor -Q1 disparado por cortocircuito';
      }

      wireMetrics.set(wire.id, {
        label: this.getWireDisplayLabel(wire, pot),
        targetType: 'wire',
        targetId: wire.id,
        potential: vSpec.potential,
        voltageV: vSpec.voltageV,
        voltageMode: vSpec.voltageMode,
        currentA: totals.currentA,
        powerW: totals.powerW,
        frequencyHz: vSpec.frequencyHz,
        isEnergized: vSpec.isEnergized,
        statusNote,
        gridX: midX,
        gridY: midY
      });
    }

    // 6. Poblar pinMetrics para cada borne físico
    for (const pin of pins) {
      const comp = compById.get(pin.componentId);
      if (!comp) continue;
      const pKey = `${pin.componentId}:${pin.pinId}`;
      const node = pinNodeMap.get(pKey);
      const pot = node?.potential ?? null;

      const is3PhasePin =
        THREE_PHASE_COMPONENT_TYPES.has(comp.type) ||
        (!SINGLE_PHASE_CONTROL_TYPES.has(comp.type) && Boolean(node && nodeIs3Phase.get(node.id)));
      const preferDc =
        comp.type === 'power_dc' ||
        comp.type === 'plc_cpu_s71200' ||
        comp.type === 'solenoid_valve_5_2';

      const vSpec = computeVoltageSpec(pot, is3PhasePin, preferDc);
      const netId = pinNetMap.get(pKey);
      const override = loadPinOverrides.get(pKey);
      const totals = override
        ? {
            currentA: override.currentA,
            powerW: override.powerW,
            isOverload: Boolean(override.isOverload),
            warningNote: override.statusNote
          }
        : getNetTotals(netId, pot);

      let statusNote = override?.statusNote || '';
      if (!statusNote) {
        if (comp.type === 'thermal_contact_nc' && hasThermalOverload) {
          statusNote =
            pin.pinId === '95'
              ? 'Entrada 95 con tensión — contacto 95-96 disparado por sobrecarga'
              : 'Falla: Salida 96 sin tensión (relé térmico -F1 disparado)';
        } else if (comp.type === 'breaker_3p' && comp.state?.isOpen && hasShortCircuit) {
          statusNote = vSpec.isEnergized
            ? 'Acometida en -Q1 — disyuntor disparado por cortocircuito'
            : 'Falla: Salida sin tensión por disparo magnético de -Q1';
        } else if (totals.warningNote) {
          statusNote = totals.warningNote;
        } else if (pot === 'PE') {
          statusNote = 'Borne de protección a tierra (PE)';
        } else if (pot === 'N') {
          statusNote =
            totals.currentA > 0
              ? `Borne Neutro con retorno de ${totals.currentA.toFixed(2)} A`
              : 'Borne Neutro de referencia (0 V)';
        } else if (pot === '0V') {
          statusNote =
            totals.currentA > 0
              ? `Borne 0V DC con retorno de ${totals.currentA.toFixed(2)} A`
              : 'Borne común 0V DC';
        } else if (vSpec.isEnergized) {
          statusNote =
            totals.currentA > 0
              ? `Borne energizado (${pot}) conduciendo ${totals.currentA.toFixed(2)} A`
              : `Borne energizado (${pot}) en reposo`;
        } else {
          statusNote = 'Borne sin tensión (circuito abierto)';
        }
      }

      pinMetrics.set(pKey, {
        label: `${comp.tag} : Borne ${pin.label}`,
        targetType: 'pin',
        targetId: pKey,
        potential: vSpec.potential,
        voltageV: vSpec.voltageV,
        voltageMode: vSpec.voltageMode,
        currentA: totals.currentA,
        powerW: totals.powerW,
        frequencyHz: vSpec.frequencyHz,
        isEnergized: vSpec.isEnergized,
        statusNote,
        gridX: pin.x,
        gridY: pin.y
      });
    }

    // 7. Poblar componentMetrics para los componentes restantes (fuentes, protecciones, contactores, mandos)
    const edgesByComp = new Map<string, ClosedSwitchEdge[]>();
    for (const e of closedEdges) {
      if (!edgesByComp.has(e.compId)) edgesByComp.set(e.compId, []);
      edgesByComp.get(e.compId)!.push(e);
    }

    for (const comp of this.components) {
      if (componentMetrics.has(comp.id)) continue;

      const compPins = pins.filter(p => p.componentId === comp.id);
      const center = getCompCenter(comp);
      const is3PhaseComp = THREE_PHASE_COMPONENT_TYPES.has(comp.type);
      const preferDc = comp.type === 'power_dc';

      // Fuentes de alimentación
      if (comp.type.startsWith('power_')) {
        let bestV = 0;
        let voltageMode: 'AC' | 'DC' = preferDc ? 'DC' : 'AC';
        let maxCurrentA = 0;
        let totalPowerW = 0;
        let hasOverload = false;
        const livePots: string[] = [];

        if (comp.type === 'power_3phase' || comp.type === 'power_3phase_pe') {
          const seenLoadIds = new Set<string>();
          for (const p of compPins) {
            if (p.defaultPotential === 'PE') continue;
            const pKey = `${comp.id}:${p.pinId}`;
            const netId = pinNetMap.get(pKey);
            const pot = pinNodeMap.get(pKey)?.potential ?? p.defaultPotential ?? null;
            if (pot) livePots.push(pot);
            const totals = getNetTotals(netId, pot);
            if (totals.currentA > maxCurrentA) maxCurrentA = totals.currentA;
            if (totals.isOverload) hasOverload = true;
            const setIds = netId ? liveNetLoads.get(netId) : undefined;
            setIds?.forEach(id => seenLoadIds.add(id));
          }
          const combined = aggregateLoads(seenLoadIds);
          totalPowerW = combined.powerW;
          bestV = 400.0;
          voltageMode = 'AC';
        } else if (comp.type === 'power_dc') {
          const posKey = `${comp.id}:POS`;
          const totals = getNetTotals(pinNetMap.get(posKey), '+24V');
          bestV = 24.0;
          voltageMode = 'DC';
          maxCurrentA = totals.currentA;
          totalPowerW = totals.powerW;
          livePots.push('+24V');
        } else if (comp.type === 'power_l' || comp.type === 'power_ln') {
          const lKey = `${comp.id}:L`;
          const totals = getNetTotals(pinNetMap.get(lKey), 'L1');
          bestV = 230.0;
          voltageMode = 'AC';
          maxCurrentA = totals.currentA;
          totalPowerW = totals.powerW;
          livePots.push('L1');
        } else if (comp.type === 'power_n') {
          const nKey = `${comp.id}:N`;
          const totals = getNetTotals(pinNetMap.get(nKey), 'N');
          bestV = 0.0;
          voltageMode = 'AC';
          maxCurrentA = totals.currentA;
          totalPowerW = 0.0;
          livePots.push('N');
        } else {
          // power_pe
          bestV = 0.0;
          voltageMode = 'AC';
          livePots.push('PE');
        }

        const isEnergized = bestV > 0;
        let statusNote = 'Alimentación activa';
        if (hasOverload) {
          statusNote = '¡SOBRECARGA! Asimetría trifásica por corte de fase';
        } else if (comp.type === 'power_pe') {
          statusNote = 'Puesta a tierra de protección (0 V)';
        } else if (comp.type === 'power_n') {
          statusNote =
            maxCurrentA > 0
              ? `Neutro con corriente de retorno (${maxCurrentA.toFixed(2)} A)`
              : 'Referencia de neutro (0 V AC)';
        } else if (maxCurrentA > 0) {
          statusNote = `Suministrando ${maxCurrentA.toFixed(2)} A al circuito`;
        } else {
          statusNote = `Fuente lista (${bestV.toFixed(1)} V ${voltageMode}, sin carga)`;
        }

        componentMetrics.set(comp.id, {
          label: this.getComponentDisplayName(comp),
          targetType: 'component',
          targetId: comp.id,
          potential: livePots.join('-') || 'Sin tensión',
          voltageV: bestV,
          voltageMode,
          currentA: maxCurrentA,
          powerW: totalPowerW,
          frequencyHz: voltageMode === 'AC' && comp.type !== 'power_pe' ? 60.0 : 0,
          isEnergized,
          statusNote,
          ...center
        });
        continue;
      }

      // Componentes de corte, protección, contactores y pulsadores
      const compClosedEdges = edgesByComp.get(comp.id) || [];
      const isClosed = compClosedEdges.length > 0;

      // Buscar mayor tensión presente en cualquiera de sus bornes
      let bestSpec = computeVoltageSpec(null, is3PhaseComp, preferDc);
      for (const p of compPins) {
        const pKey = `${comp.id}:${p.pinId}`;
        const node = pinNodeMap.get(pKey);
        const pot = node?.potential ?? null;
        const spec = computeVoltageSpec(
          pot,
          is3PhaseComp || (!SINGLE_PHASE_CONTROL_TYPES.has(comp.type) && Boolean(node && nodeIs3Phase.get(node.id))),
          preferDc
        );
        if (spec.voltageV > bestSpec.voltageV || (!bestSpec.isEnergized && spec.isEnergized)) {
          bestSpec = spec;
        }
      }

      // Corriente que atraviesa el componente (solo si está cerrado)
      let currentA = 0;
      let powerW = 0;
      let hasOverload = false;

      if (isClosed) {
        const passedLoads = new Set<string>();
        let maxPoleCurrent = 0;

        for (const edge of compClosedEdges) {
          const keyA = `${edge.pinA.componentId}:${edge.pinA.pinId}`;
          const keyB = `${edge.pinB.componentId}:${edge.pinB.pinId}`;
          const netA = pinNetMap.get(keyA);
          const netB = pinNetMap.get(keyB);
          const pot = pinNodeMap.get(keyA)?.potential ?? pinNodeMap.get(keyB)?.potential ?? null;
          if (!isLivePotential(pot)) continue;

          // Tomar el lado aguas abajo (mayor distancia a la fuente) para reflejar solo la corriente que cruza este polo
          const distA = netA ? liveDist.get(netA) : undefined;
          const distB = netB ? liveDist.get(netB) : undefined;
          const downstreamNet =
            distA !== undefined && distB !== undefined
              ? distB >= distA
                ? netB
                : netA
              : netB || netA;

          const totals = getNetTotals(downstreamNet, pot);
          if (totals.currentA > maxPoleCurrent) maxPoleCurrent = totals.currentA;
          if (totals.isOverload) hasOverload = true;
          if (downstreamNet) {
            liveNetLoads.get(downstreamNet)?.forEach(id => passedLoads.add(id));
          }
        }

        const combined = aggregateLoads(passedLoads);
        currentA = is3PhaseComp ? maxPoleCurrent : combined.currentA;
        powerW = combined.powerW;
      }

      // Diagnóstico contextual específico por tipo y fallas
      let statusNote = isClosed ? 'Contacto cerrado' : 'Contacto abierto';
      if (comp.type === 'breaker_3p') {
        if (!isClosed && hasShortCircuit) {
          statusNote = 'Falla: Disparo magnético por cortocircuito franco (-Q1 abierto)';
        } else if (!isClosed) {
          statusNote = 'Guardamotor 3P abierto (potencia seccionada)';
        } else if (hasOverload) {
          statusNote = '¡SOBRECORRIENTE 18.65 A! Pérdida de fase aguas abajo';
        } else {
          statusNote = currentA > 0
            ? `Guardamotor 3P cerrado — conduciendo ${currentA.toFixed(2)} A`
            : 'Guardamotor 3P cerrado (en espera)';
        }
      } else if (comp.type === 'breaker_1p_n') {
        statusNote = isClosed
          ? currentA > 0
            ? `Disyuntor control cerrado (${currentA.toFixed(2)} A)`
            : 'Disyuntor control cerrado (en espera)'
          : 'Disyuntor control abierto (maniobra sin tensión)';
      } else if (comp.type === 'contactor_power_3p') {
        if (comp.tag === '-KM1' && hasWeldedContact && !nextState.activeCoils.has(comp.tag)) {
          statusNote = 'Falla: Contactos principales soldados cerrados (sin excitación)';
        } else if (!isClosed) {
          statusNote = 'Polos de potencia abiertos (motor detenido)';
        } else if (hasOverload) {
          statusNote = '¡SOBRECORRIENTE! Polos cerrados con pérdida de fase (18.65 A)';
        } else {
          statusNote = currentA > 0
            ? `Polos cerrados — alimentando motor (${currentA.toFixed(2)} A)`
            : 'Polos cerrados (sin carga conectada)';
        }
      } else if (comp.type === 'thermal_relay_power') {
        if (hasThermalOverload) {
          statusNote = 'Relé térmico disparado por sobrecarga (revisar 95-96)';
        } else if (hasOverload) {
          statusNote = '¡SOBRECARGA TÉRMICA! Corriente bifásica de 18.65 A detectada';
        } else {
          statusNote = currentA > 0
            ? `Bimetales conduciendo ${currentA.toFixed(2)} A (rango nominal)`
            : 'Relé térmico en servicio (0.00 A)';
        }
      } else if (comp.type === 'thermal_contact_nc') {
        statusNote = hasThermalOverload
          ? 'Falla: Contacto NC 95-96 abierto por disparo térmico'
          : 'Contacto NC 95-96 cerrado (protección normal)';
      } else if (comp.type === 'thermal_contact_no') {
        statusNote = hasThermalOverload
          ? 'Contacto NA 97-98 cerrado — señalizando disparo térmico'
          : 'Contacto NA 97-98 abierto (sin falla térmica)';
      } else if (comp.type === 'contact_no') {
        if (comp.tag === '-KM1' && hasWeldedContact && !nextState.activeCoils.has(comp.tag)) {
          statusNote = 'Falla: Contacto auxiliar 13-14 soldado cerrado';
        } else {
          statusNote = isClosed
            ? `Contacto auxiliar NA cerrado (${currentA.toFixed(2)} A)`
            : 'Contacto auxiliar NA abierto (reposo)';
        }
      } else if (comp.type === 'contact_nc') {
        statusNote = isClosed
          ? 'Contacto auxiliar NC cerrado (enclavamiento activo)'
          : 'Contacto auxiliar NC abierto (bobina activada)';
      } else if (comp.type === 'button_no' || comp.type === 'limit_switch_no') {
        statusNote = isClosed
          ? 'Accionado — contacto NA cerrado'
          : 'En reposo — contacto NA abierto';
      } else if (comp.type === 'button_nc' || comp.type === 'emergency_stop' || comp.type === 'limit_switch_nc') {
        statusNote = isClosed
          ? 'En reposo — contacto NC cerrado (continuidad OK)'
          : 'Accionado — contacto NC abierto (circuito cortado)';
      }

      componentMetrics.set(comp.id, {
        label: this.getComponentDisplayName(comp),
        targetType: 'component',
        targetId: comp.id,
        potential: bestSpec.potential,
        voltageV: bestSpec.voltageV,
        voltageMode: bestSpec.voltageMode,
        currentA,
        powerW,
        frequencyHz: bestSpec.frequencyHz,
        isEnergized: bestSpec.isEnergized,
        statusNote,
        ...center
      });
    }
  }
}
