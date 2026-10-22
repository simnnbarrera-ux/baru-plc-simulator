export type SimulationMode = 'stopped' | 'running' | 'paused' | 'step';

export interface ElectricalNode {
  id: string;               // Identificador del nodo equipotencial
  potential: string | null; // "L1", "L2", "L3", "N", "PE", "+24V", "0V"
  voltage: number;          // Tensión eficaz respecto a tierra/neutro
  pinKeys: string[];        // Lista de "componentId:pinId" conectados
  wireIds: string[];        // Lista de cables que forman este nodo
}

export interface SimulationState {
  mode: SimulationMode;
  simulationTime: number;   // Tiempo transcurrido en segundos
  stepCount: number;
  fps: number;
  activeCoils: Set<string>; // Set de tags de bobinas activas (ej: "-KM1", "-KA1")
  energizedWires: Set<string>; // Wire IDs con tensión
  energizedPins: Set<string>;  // "componentId:pinId"
  timerStates: Map<string, {
    elapsedTime: number;
    targetTime: number;
    isComplete: boolean;
    isActive: boolean;
  }>;
  motorStates: Map<string, {
    rpm: number;
    targetRpm: number;
    direction: 1 | -1 | 0; // 1 = horario, -1 = antihorario, 0 = frenado
    angle: number;         // 0 a 360 grados para renderizado de rotación
    hasError: boolean;     // Cortocircuito o falta de fase
  }>;
  pilotLights: Map<string, {
    color: 'red' | 'green' | 'yellow' | 'blue' | 'white';
    isLit: boolean;
  }>;
}
