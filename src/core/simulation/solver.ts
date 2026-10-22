import { PlacedComponent, WireSegment, JunctionNode } from '../../types/circuit';
import { COMPONENT_CATALOG } from '../components/catalog';
import { ElectricalNode, SimulationState } from '../../types/simulation';

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
    deltaTimeMs: number
  ): SimulationState {
    const nextState: SimulationState = {
      ...currentState,
      simulationTime: currentState.simulationTime + deltaTimeMs / 1000,
      stepCount: currentState.stepCount + 1,
      activeCoils: new Set(currentState.activeCoils),
      energizedWires: new Set<string>(),
      energizedPins: new Set<string>(),
      timerStates: new Map(currentState.timerStates),
      motorStates: new Map(currentState.motorStates),
      pilotLights: new Map(currentState.pilotLights)
    };

    // 1. Recopilar todos los pines físicos en el plano
    const pins = this.getAllPins();

    // 2. Resolver ciclo de simulación hasta estabilización (máx 5 iteraciones)
    let stateChanged = true;
    let iteration = 0;

    while (stateChanged && iteration < 5) {
      stateChanged = false;
      iteration++;

      // A. Construir grafos de nodos equipotenciales
      const nodes = this.buildEquipotentialNodes(pins, nextState);

      // B. Determinar potenciales de cada nodo a partir de las fuentes
      this.propagatePotentials(nodes);

      // C. Evaluar estado de bobinas
      const newActiveCoils = new Set<string>();
      for (const comp of this.components) {
        const def = this.catalogMap.get(comp.type);
        if (!def) continue;

        if (comp.type === 'coil_contactor' || comp.type === 'coil_timer_ton' || comp.type === 'coil_timer_tof') {
          const pinA1 = pins.find(p => p.componentId === comp.id && p.pinId === 'A1');
          const pinA2 = pins.find(p => p.componentId === comp.id && p.pinId === 'A2');

          if (pinA1 && pinA2) {
            const nodeA1 = nodes.find(n => n.pinKeys.includes(`${comp.id}:A1`));
            const nodeA2 = nodes.find(n => n.pinKeys.includes(`${comp.id}:A2`));

            const potA1 = nodeA1?.potential;
            const potA2 = nodeA2?.potential;

            // Energizada si un borne tiene fase/+24V y el otro neutro/0V
            const isLiveA1 = potA1 && (potA1.startsWith('L') || potA1 === '+24V');
            const isNeutralA2 = potA2 && (potA2 === 'N' || potA2 === '0V');
            const isLiveA2 = potA2 && (potA2.startsWith('L') || potA2 === '+24V');
            const isNeutralA1 = potA1 && (potA1 === 'N' || potA1 === '0V');

            const isEnergized = (isLiveA1 && isNeutralA2) || (isLiveA2 && isNeutralA1);

            if (isEnergized) {
              const isOpenCoil = this.activeFaults.has('open_coil_km1') || this.activeFaults.has('bobina_abierta');
              if (comp.tag === '-KM1' && isOpenCoil) {
                // Falla: Bobina de contactor -KM1 abierta/cortada internamente (A1-A2 = O.L)
                // Hay tensión en bornes pero no genera campo magnético ni atraca la armadura
              } else {
                newActiveCoils.add(comp.tag);
              }

              // Manejo de temporizador
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
            } else {
              // Si no está energizada, resetear temporizador TON
              if (def.hasTimer && comp.type === 'coil_timer_ton') {
                nextState.timerStates.set(comp.id, {
                  elapsedTime: 0,
                  targetTime: comp.timerValue ?? def.defaultTimeSeconds ?? 5,
                  isComplete: false,
                  isActive: false
                });
              }
            }
          }
        }
      }

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
          const nodeX1 = nodes.find(n => n.pinKeys.includes(`${comp.id}:X1`));
          const nodeX2 = nodes.find(n => n.pinKeys.includes(`${comp.id}:X2`));

          const potX1 = nodeX1?.potential;
          const potX2 = nodeX2?.potential;

          const isLit = (potX1 && potX2) && (
            (potX1.startsWith('L') && (potX2 === 'N' || potX2 === '0V')) ||
            (potX2.startsWith('L') && (potX1 === 'N' || potX1 === '0V')) ||
            (potX1 === '+24V' && potX2 === '0V') ||
            (potX2 === '+24V' && potX1 === '0V')
          );

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
            // Sentido Horario: L1, L2, L3 (o permutaciones cíclicas directas)
            if (
              (pU === 'L1' && pV === 'L2' && pW === 'L3') ||
              (pU === 'L2' && pV === 'L3' && pW === 'L1') ||
              (pU === 'L3' && pV === 'L1' && pW === 'L2')
            ) {
              targetRpm = 1450;
              direction = 1;
            }
            // Sentido Antihorario: Inversión de dos fases
            else if (
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
            // Operación bifásica por falta/corte de fase: asimetría severa,
            // rotor bloqueado con zumbido y sobrecorriente (>18A)
            targetRpm = 25;
            direction = 1;
          }

          if (comp.type === 'motor_3phase_6p' && !hasError && targetRpm > 0) {
            const nodeW2 = nodes.find(n => n.pinKeys.includes(`${comp.id}:W2`));
            const nodeU2 = nodes.find(n => n.pinKeys.includes(`${comp.id}:U2`));
            const nodeV2 = nodes.find(n => n.pinKeys.includes(`${comp.id}:V2`));

            // Conexión Estrella: W2, U2, V2 puenteados en un mismo nodo común
            const isStar = !!(nodeW2 && nodeU2 && nodeV2 && (nodeW2.id === nodeU2.id && nodeU2.id === nodeV2.id));
            // Conexión Triángulo: W2, U2, V2 conectados a las fases
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

          // Suavizado inercial de rotación (frenado rápido cuando targetRpm es 0)
          const currentRpm = targetRpm === 0
            ? (currentMotor.rpm > 10 ? currentMotor.rpm * 0.4 : 0)
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

      // Marcar cables y pines energizados para feedback visual
      for (const node of nodes) {
        if (node.potential) {
          node.wireIds.forEach(wId => nextState.energizedWires.add(wId));
          node.pinKeys.forEach(pKey => nextState.energizedPins.add(pKey));
        }
      }
    }

    return nextState;
  }

  private getAllPins(): PinInstance[] {
    const pins: PinInstance[] = [];
    for (const comp of this.components) {
      const def = this.catalogMap.get(comp.type);
      if (!def) continue;

      for (const p of def.pins) {
        // Calcular coordenada absoluta en función de la posición y rotación
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

  private buildEquipotentialNodes(pins: PinInstance[], state: SimulationState): ElectricalNode[] {
    // Estructura Union-Find para agrupar puntos interconectados
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

    // Clave de posición "X,Y"
    const coordKey = (x: number, y: number) => `${x},${y}`;

    // A. Conectar extremos de cables que coinciden en coordenadas
    const wireMap = new Map<string, WireSegment>();
    const isL1Cut = this.activeFaults.has('phase_loss_l1') || this.activeFaults.has('corte_fase_l1');
    const isL2Cut = this.activeFaults.has('phase_loss_l2') || this.activeFaults.has('corte_fase_l2') || this.activeFaults.has('fase_cortada');
    const isL3Cut = this.activeFaults.has('phase_loss_l3') || this.activeFaults.has('corte_fase_l3');

    for (const wire of this.wires) {
      // Simular corte de conductor en fase L1
      if (isL1Cut) {
        if (wire.id === 'w_p1' || wire.id === 'w_p4' || wire.id === 'w_p7' || wire.id === 'w_p10' || wire.id === 'w_conv_p4' || (wire.wireType === 'phase1' && (wire.fromY >= 6 || wire.toY >= 6))) {
          continue; // Cable interrumpido
        }
      }
      // Simular corte de conductor en fase L2 (asimetría de tensiones y sobreintensidad)
      if (isL2Cut) {
        if (wire.id === 'w_p2' || wire.id === 'w_p5' || wire.id === 'w_p8' || wire.id === 'w_p11' || wire.id === 'w_conv_p5' || (wire.wireType === 'phase2' && (wire.fromY >= 6 || wire.toY >= 6))) {
          continue; // Cable interrumpido
        }
      }
      // Simular corte de conductor en fase L3
      if (isL3Cut) {
        if (wire.id === 'w_p3' || wire.id === 'w_p6' || wire.id === 'w_p9' || wire.id === 'w_p12' || wire.id === 'w_conv_p6' || (wire.wireType === 'phase3' && (wire.fromY >= 6 || wire.toY >= 6))) {
          continue; // Cable interrumpido
        }
      }

      wireMap.set(wire.id, wire);
      const kFrom = coordKey(wire.fromX, wire.fromY);
      const kTo = coordKey(wire.toX, wire.toY);
      union(kFrom, kTo);
    }

    // B. Conectar pines que coincidan con coordenadas de cables
    for (const pin of pins) {
      const kPin = coordKey(pin.x, pin.y);
      find(kPin); // Registrar en Union-Find
    }

    // C. Conectar pines internos de componentes según su estado de conducción
    for (const comp of this.components) {
      const def = this.catalogMap.get(comp.type);
      if (!def) continue;

      const getPin = (pId: string) => pins.find(p => p.componentId === comp.id && p.pinId === pId);

      // Contactores principales 3P
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

      // Disyuntor Guardamotor 3P
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

      // Disyuntor 1P+N
      if (comp.type === 'breaker_1p_n') {
        const isClosed = comp.state?.isOpen !== true;
        if (isClosed) {
          const p1 = getPin('1'); const p2 = getPin('2');
          const pN1 = getPin('N1'); const pN2 = getPin('N2');
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
          if (pN1 && pN2) union(coordKey(pN1.x, pN1.y), coordKey(pN2.x, pN2.y));
        }
      }

      // Contactos auxiliares NA (13-14) o contacto térmico NA (97-98)
      if (comp.type === 'contact_no' || comp.type === 'thermal_contact_no') {
        const isWelded = this.activeFaults.has('welded_contact_km1') || this.activeFaults.has('contacto_soldado') || this.activeFaults.has('welded_contact');
        const isClosed = comp.type === 'contact_no' 
          ? (state.activeCoils.has(comp.tag) || (comp.tag === '-KM1' && isWelded))
          : this.activeFaults.has('thermal_overload'); // contacto térmico 97-98 cierra en fallo
        if (isClosed) {
          const p13 = getPin(def.pins[0].id);
          const p14 = getPin(def.pins[1].id);
          if (p13 && p14) union(coordKey(p13.x, p13.y), coordKey(p14.x, p14.y));
        }
      }

      // Contactos auxiliares NC (21-22 o térmico 95-96)
      if (comp.type === 'contact_nc' || comp.type === 'thermal_contact_nc') {
        const isCoilActive = state.activeCoils.has(comp.tag);
        // Abierto cuando la bobina está activa, cerrado en reposo
        let isClosed = !isCoilActive;

        // Falla: Apertura forzada del contacto 95-96 del relé térmico -F1
        if (comp.type === 'thermal_contact_nc' && this.activeFaults.has('thermal_overload')) {
          isClosed = false;
        }

        if (isClosed) {
          const p1 = getPin(def.pins[0].id);
          const p2 = getPin(def.pins[1].id);
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
        }
      }

      // Contactos temporizados TON NA / NC
      if (comp.type === 'contact_timer_ton_no') {
        const isClosed = state.activeCoils.has(`${comp.tag}:TIMED`);
        if (isClosed) {
          const p1 = getPin('67'); const p2 = getPin('68');
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
        }
      }
      if (comp.type === 'contact_timer_ton_nc') {
        const isClosed = !state.activeCoils.has(`${comp.tag}:TIMED`);
        if (isClosed) {
          const p1 = getPin('55'); const p2 = getPin('56');
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
        }
      }

      // Pulsador de Marcha NA (3-4)
      if (comp.type === 'button_no' || comp.type === 'limit_switch_no') {
        const isPressed = comp.state?.isActuated === true;
        if (isPressed) {
          const p3 = getPin(def.pins[0].id);
          const p4 = getPin(def.pins[1].id);
          if (p3 && p4) union(coordKey(p3.x, p3.y), coordKey(p4.x, p4.y));
        }
      }

      // Pulsador de Parada NC (1-2) o Seta de emergencia
      if (comp.type === 'button_nc' || comp.type === 'emergency_stop' || comp.type === 'limit_switch_nc') {
        const isPressed = comp.state?.isActuated === true;
        // Cerrado en reposo, abierto al pulsar
        const isClosed = !isPressed;
        if (isClosed) {
          const p1 = getPin(def.pins[0].id);
          const p2 = getPin(def.pins[1].id);
          if (p1 && p2) union(coordKey(p1.x, p1.y), coordKey(p2.x, p2.y));
        }
      }
    }

    // D. Agrupar elementos por cada raíz en Union-Find
    const nodeGroups = new Map<string, ElectricalNode>();

    // Asignar pines
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

    // Asignar cables
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
    // Si un nodo tiene una fuente de alimentación, asignar su tensión característica
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
