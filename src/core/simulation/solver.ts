import { PlacedComponent, WireSegment, JunctionNode } from '../../types/circuit';
import { COMPONENT_CATALOG } from '../components/catalog';
import { ElectricalNode, PneumaticState, SimulationState } from '../../types/simulation';

interface PinInstance {
  componentId: string;
  pinId: string;
  x: number;
  y: number;
  type: string;
  defaultPotential?: string;
}

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
      pneumaticStates: pneuMap
    };

    // Calcular estados rápidos de sensores neumáticos (a0/a1, b0/b1)
    const activeReedSensors = this.computeActiveReedSensors(pneuMap);

    // Recopilar todos los pines físicos en el plano
    const pins = this.getAllPins();

    // Resolver ciclo de simulación hasta estabilización (máx 5 iteraciones)
    let stateChanged = true;
    let iteration = 0;
    const sampledInputs: Record<string, boolean> = {};

    while (stateChanged && iteration < 5) {
      stateChanged = false;
      iteration++;

      // A. Construir grafos de nodos equipotenciales (incluyendo contactos + salidas relé PLC Q0..Q3)
      const nodes = this.buildEquipotentialNodes(pins, nextState, plcOutputs, activeReedSensors);

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

      // E. Evaluar motores trifásicos
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
        }
      }

      // Marcar cables y pines energizados
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
          x: comp.x + px,
          y: comp.y + py,
          type: p.type,
          defaultPotential: p.defaultPotential
        });
      }
    }
    return pins;
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

    const isL1Cut = this.activeFaults.has('phase_loss_l1') || this.activeFaults.has('corte_fase_l1');
    const isL2Cut = this.activeFaults.has('phase_loss_l2') || this.activeFaults.has('corte_fase_l2') || this.activeFaults.has('fase_cortada');
    const isL3Cut = this.activeFaults.has('phase_loss_l3') || this.activeFaults.has('corte_fase_l3');

    for (const wire of this.wires) {
      if (isL1Cut && (wire.id === 'w_p1' || wire.id === 'w_p4' || wire.id === 'w_p7' || wire.id === 'w_p10' || wire.id === 'w_conv_p4' || (wire.wireType === 'phase1' && (wire.fromY >= 6 || wire.toY >= 6)))) {
        continue;
      }
      if (isL2Cut && (wire.id === 'w_p2' || wire.id === 'w_p5' || wire.id === 'w_p8' || wire.id === 'w_p11' || wire.id === 'w_conv_p5' || (wire.wireType === 'phase2' && (wire.fromY >= 6 || wire.toY >= 6)))) {
        continue;
      }
      if (isL3Cut && (wire.id === 'w_p3' || wire.id === 'w_p6' || wire.id === 'w_p9' || wire.id === 'w_p12' || wire.id === 'w_conv_p6' || (wire.wireType === 'phase3' && (wire.fromY >= 6 || wire.toY >= 6)))) {
        continue;
      }

      union(coordKey(wire.fromX, wire.fromY), coordKey(wire.toX, wire.toY));
    }

    for (const pin of pins) {
      find(coordKey(pin.x, pin.y));
    }

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
              if (pOut) union(coordKey(p1L.x, p1L.y), coordKey(pOut.x, pOut.y));
            }
          }
        }
      }

      if (comp.type === 'contactor_power_3p') {
        const isWelded = this.activeFaults.has('welded_contact_km1') || this.activeFaults.has('contacto_soldado') || this.activeFaults.has('welded_contact');
        const isClosed = state.activeCoils.has(comp.tag) || (comp.tag === '-KM1' && isWelded);
        if (isClosed) {
          const p1 = getPin('1'); const p2 = getPin('2');
          const p3 = getPin('3'); const p4 = getPin('4');
          const p5 = getPin('5'); const p6 = getPin('6');
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
          if (p3 && p4) union(coordKey(p3.x, p3.y), coordKey(p4.x, p4.y));
          if (p5 && p6) union(coordKey(p5.x, p5.y), coordKey(p6.x, p6.y));
        }
      }

      if (comp.type === 'breaker_3p' || comp.type === 'thermal_relay_power') {
        const isClosed = comp.state?.isOpen !== true;
        if (isClosed) {
          const p1 = getPin('1'); const p2 = getPin('2');
          const p3 = getPin('3'); const p4 = getPin('4');
          const p5 = getPin('5'); const p6 = getPin('6');
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
          if (p3 && p4) union(coordKey(p3.x, p3.y), coordKey(p4.x, p4.y));
          if (p5 && p6) union(coordKey(p5.x, p5.y), coordKey(p6.x, p6.y));
        }
      }

      if (comp.type === 'breaker_1p_n') {
        const isClosed = comp.state?.isOpen !== true;
        if (isClosed) {
          const p1 = getPin('1'); const p2 = getPin('2');
          const pN1 = getPin('N1'); const pN2 = getPin('N2');
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
          if (pN1 && pN2) union(coordKey(pN1.x, pN1.y), coordKey(pN2.x, pN2.y));
        }
      }

      if (comp.type === 'contact_no' || comp.type === 'thermal_contact_no') {
        const isWelded = this.activeFaults.has('welded_contact_km1') || this.activeFaults.has('contacto_soldado') || this.activeFaults.has('welded_contact');
        const isClosed = comp.type === 'contact_no'
          ? state.activeCoils.has(comp.tag) || (comp.tag === '-KM1' && isWelded)
          : this.activeFaults.has('thermal_overload');
        if (isClosed) {
          const p13 = getPin(def.pins[0].id);
          const p14 = getPin(def.pins[1].id);
          if (p13 && p14) union(coordKey(p13.x, p13.y), coordKey(p14.x, p14.y));
        }
      }

      if (comp.type === 'contact_nc' || comp.type === 'thermal_contact_nc') {
        let isClosed = !state.activeCoils.has(comp.tag);
        if (comp.type === 'thermal_contact_nc' && this.activeFaults.has('thermal_overload')) {
          isClosed = false;
        }
        if (isClosed) {
          const p1 = getPin(def.pins[0].id);
          const p2 = getPin(def.pins[1].id);
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
        }
      }

      if (comp.type === 'contact_timer_ton_no') {
        if (state.activeCoils.has(`${comp.tag}:TIMED`)) {
          const p1 = getPin('67'); const p2 = getPin('68');
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
        }
      }

      if (comp.type === 'contact_timer_ton_nc') {
        if (!state.activeCoils.has(`${comp.tag}:TIMED`)) {
          const p1 = getPin('55'); const p2 = getPin('56');
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
        }
      }

      if (comp.type === 'button_no' || comp.type === 'limit_switch_no') {
        const normTag = comp.tag.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isReedClosed = activeReedSensors?.has(normTag) ?? false;
        if (comp.state?.isActuated === true || isReedClosed) {
          const p3 = getPin(def.pins[0].id);
          const p4 = getPin(def.pins[1].id);
          if (p3 && p4) union(coordKey(p3.x, p3.y), coordKey(p4.x, p4.y));
        }
      }

      if (comp.type === 'button_nc' || comp.type === 'emergency_stop' || comp.type === 'limit_switch_nc') {
        const normTag = comp.tag.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isReedPressed = activeReedSensors?.has(normTag) ?? false;
        const isPressed = comp.state?.isActuated === true || isReedPressed;
        if (!isPressed) {
          const p1 = getPin(def.pins[0].id);
          const p2 = getPin(def.pins[1].id);
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
        }
      }
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
}
