import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Activity, Box, Cpu, Gauge, Rotate3d } from 'lucide-react';

type CameraPresetId = 'overview' | 'plc' | 'pneumatics';

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  theta: number;
  phi: number;
  radius: number;
  target: [number, number, number];
}

const CAMERA_PRESETS: Record<CameraPresetId, CameraPreset> = {
  overview: {
    id: 'overview',
    label: 'Vista 3D',
    theta: 0.44,
    phi: 0.92,
    radius: 5.55,
    target: [0.05, 0.12, 0.02],
  },
  plc: {
    id: 'plc',
    label: 'Enfocar PLC',
    theta: 0.15,
    phi: 1.05,
    radius: 3.15,
    target: [0.0, 0.58, -0.52],
  },
  pneumatics: {
    id: 'pneumatics',
    label: 'Neumática',
    theta: -0.34,
    phi: 0.86,
    radius: 3.65,
    target: [-0.14, -0.04, 0.44],
  },
};

const CYCLE_DURATION_SEC = 5.2;
const POLAR_MIN = 0.25;
const POLAR_MAX = 1.15;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function createParticleGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.28, 'rgba(56, 189, 248, 0.85)');
    grad.addColorStop(0.65, 'rgba(16, 185, 129, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface OledDrawState {
  time: number;
  phaseLabel: string;
  stroke: number;
  y1Active: boolean;
  y2Active: boolean;
  cappingActive: boolean;
}

function drawOledCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: OledDrawState
): void {
  // Deep OLED black-navy background
  ctx.fillStyle = '#030814';
  ctx.fillRect(0, 0, width, height);

  // Subtle oscilloscope grid
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.14)';
  ctx.lineWidth = 1;
  for (let gx = 32; gx < width; gx += 32) {
    ctx.beginPath();
    ctx.moveTo(gx, 72);
    ctx.lineTo(gx, height - 34);
    ctx.stroke();
  }
  for (let gy = 86; gy < height - 34; gy += 28) {
    ctx.beginPath();
    ctx.moveTo(16, gy);
    ctx.lineTo(width - 16, gy);
    ctx.stroke();
  }

  // Top header strip
  const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
  headerGrad.addColorStop(0, 'rgba(14, 165, 233, 0.22)');
  headerGrad.addColorStop(1, 'rgba(16, 185, 129, 0.14)');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, 44);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 44);
  ctx.lineTo(width, 44);
  ctx.stroke();

  // Brand + PLC Model
  ctx.font = '700 18px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('BARU STUDIO', 16, 28);

  ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'right';
  ctx.fillText('SIMATIC S7-1200 · CPU 1214C', width - 16, 27);
  ctx.textAlign = 'left';

  // Status bar
  ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#10b981';
  ctx.fillText('● RUN', 16, 66);

  ctx.fillStyle = '#94a3b8';
  ctx.fillText('  |  50 NW OB1  |  GEMMA F1', 64, 66);

  ctx.textAlign = 'right';
  ctx.fillStyle = state.y1Active
    ? '#38bdf8'
    : state.y2Active
      ? '#f59e0b'
      : state.cappingActive
        ? '#10b981'
        : '#64748b';
  ctx.fillText(state.phaseLabel, width - 16, 66);
  ctx.textAlign = 'left';

  // Glowing cyan oscilloscope waveform (primary pressure / scan curve)
  const waveLeft = 18;
  const waveWidth = width - 36;
  const waveCenterY = 148;

  ctx.save();
  ctx.shadowColor = '#0ea5e9';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let i = 0; i <= 140; i++) {
    const u = i / 140;
    const x = waveLeft + u * waveWidth;
    const phase = u * Math.PI * 5 - state.time * 4.2;
    const amp = 22 + state.stroke * 12;
    const y =
      waveCenterY +
      Math.sin(phase) * amp * Math.sin(u * Math.PI) +
      Math.cos(phase * 2.1) * 6;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Secondary emerald digital pulse trace
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const u = i / 120;
    const x = waveLeft + u * waveWidth;
    const sq = Math.sin(u * Math.PI * 8 - state.time * 6.0) >= 0 ? -12 : 12;
    const y = 198 + sq;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // Bottom live telemetry strip (Stroke bar + 24V DC)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, height - 26, width - 32, 12);
  const barWidth = Math.max(8, (width - 32) * state.stroke);
  const barGrad = ctx.createLinearGradient(16, 0, width - 16, 0);
  barGrad.addColorStop(0, '#0ea5e9');
  barGrad.addColorStop(1, '#10b981');
  ctx.fillStyle = barGrad;
  ctx.fillRect(16, height - 26, barWidth, 12);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(16, height - 26, width - 32, 12);

  // Subtle scanline overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let sy = 0; sy < height; sy += 4) {
    ctx.fillRect(0, sy, width, 1);
  }
}

function disposeSceneResources(scene: THREE.Scene): void {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();

  scene.traverse((obj) => {
    const renderable = obj as THREE.Mesh | THREE.Points | THREE.Line;
    if (renderable.geometry) {
      geometries.add(renderable.geometry);
    }
    const mat = renderable.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => materials.add(m));
    } else if (mat) {
      materials.add(mat);
    }
  });

  materials.forEach((mat) => {
    const record = mat as unknown as Record<string, unknown>;
    for (const value of Object.values(record)) {
      if (value instanceof THREE.Texture) {
        textures.add(value);
      }
    }
    mat.dispose();
  });

  textures.forEach((tex) => tex.dispose());
  geometries.forEach((geo) => geo.dispose());
}

/**
 * Rich isometric SVG/CSS fallback rendered automatically if WebGL context creation fails.
 */
const WebGLFallbackShowcase: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-sky-500/20 flex items-center justify-center ${className}`}
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(14,165,233,0.18),transparent_65%)]" />
    <svg
      viewBox="0 0 640 420"
      className="w-[90%] max-w-[560px] drop-shadow-[0_20px_50px_rgba(14,165,233,0.22)]"
      aria-label="Simulador PLC S7-1200 y estación electroneumática"
    >
      <defs>
        <linearGradient id="baseGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="cyanGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* Holographic rings */}
      <ellipse
        cx="320"
        cy="295"
        rx="240"
        ry="76"
        fill="none"
        stroke="#0ea5e9"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="10 8"
      />
      <ellipse
        cx="320"
        cy="295"
        rx="200"
        ry="62"
        fill="url(#baseGrad)"
        stroke="#0ea5e9"
        strokeWidth="2.5"
      />

      {/* S7-1200 PLC */}
      <g transform="translate(230, 80)">
        <rect x="0" y="0" width="180" height="155" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
        <rect x="14" y="14" width="152" height="58" rx="4" fill="#020617" stroke="#0ea5e9" strokeOpacity="0.6" />
        <text x="24" y="34" fill="#38bdf8" fontSize="11" fontWeight="700" fontFamily="monospace">
          BARU STUDIO · S7-1200
        </text>
        <text x="24" y="50" fill="#10b981" fontSize="9.5" fontFamily="monospace">
          ● RUN | 50 NW OB1 | GEMMA F1
        </text>
        <path
          d="M24 62 Q 55 48, 86 62 T 148 62"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
        />
        {/* Status LEDs */}
        {Array.from({ length: 8 }).map((_, idx) => (
          <circle
            key={idx}
            cx={26 + idx * 18}
            cy="92"
            r="3.5"
            fill={idx % 2 === 0 ? '#10b981' : '#0ea5e9'}
          />
        ))}
        {Array.from({ length: 8 }).map((_, idx) => (
          <circle
            key={idx}
            cx={26 + idx * 18}
            cy="132"
            r="3.5"
            fill={idx < 4 ? '#0ea5e9' : '#f59e0b'}
          />
        ))}
      </g>

      {/* Pneumatic Cylinder */}
      <g transform="translate(125, 255)">
        <rect x="0" y="0" width="130" height="36" rx="4" fill="#cbd5e1" stroke="#475569" />
        <rect x="-8" y="-4" width="16" height="44" rx="2" fill="#0284c7" />
        <rect x="122" y="-4" width="16" height="44" rx="2" fill="#0284c7" />
        <rect x="138" y="13" width="66" height="10" rx="2" fill="#e2e8f0">
          <animate attributeName="width" values="24;72;24" dur="3.4s" repeatCount="indefinite" />
        </rect>
        <circle cx="16" cy="-10" r="4" fill="#10b981" />
        <circle cx="114" cy="-10" r="4" fill="#10b981" opacity="0.4" />
      </g>

      {/* Signal Tower */}
      <g transform="translate(472, 165)">
        <rect x="12" y="45" width="8" height="78" fill="#cbd5e1" />
        <rect x="4" y="0" width="24" height="16" rx="3" fill="#ef4444" opacity="0.55" />
        <rect x="4" y="17" width="24" height="16" rx="2" fill="#f59e0b" opacity="0.55" />
        <rect x="4" y="34" width="24" height="16" rx="2" fill="#10b981" />
      </g>
    </svg>

    {/* Overlay Badges */}
    <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-2 rounded-full bg-slate-900/75 backdrop-blur-md border border-emerald-500/30 px-3.5 py-1.5 text-xs font-mono text-slate-100">
      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>CPU 1214C · RUN · 60 FPS</span>
    </div>
    <div className="pointer-events-none absolute top-4 right-4 hidden sm:flex items-center gap-2 rounded-full bg-slate-900/75 backdrop-blur-md border border-sky-500/30 px-3.5 py-1.5 text-xs font-mono text-sky-200">
      <Cpu className="h-3.5 w-3.5 text-sky-400" />
      <span>GEMMA F1 · 5 CILINDROS · 24V DC</span>
    </div>
  </div>
);

export const HeroAutomation3D: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPresetId | null>('overview');

  const presetControlRef = useRef<{
    applyPreset: (preset: CameraPreset) => void;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    if (!renderer.getContext()) {
      renderer.dispose();
      setWebglUnavailable(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);
    renderer.setSize(width, height, false);

    // =========================================================================
    // Studio Multi-Point Lighting (Ambient + Hemisphere + Key + 3 Rim/Accents)
    // =========================================================================
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.9);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4.5, 6.8, 4.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 20;
    const d = 3.6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0008;
    scene.add(keyLight);

    const cyanRimLight = new THREE.PointLight(0x0ea5e9, 3.5, 14, 1.4);
    cyanRimLight.position.set(-3.4, 2.4, -2.8);
    scene.add(cyanRimLight);

    const emeraldAccentLight = new THREE.PointLight(0x10b981, 2.5, 12, 1.5);
    emeraldAccentLight.position.set(3.1, 1.6, 2.4);
    scene.add(emeraldAccentLight);

    const amberAccentLight = new THREE.PointLight(0xf59e0b, 1.4, 10, 1.6);
    amberAccentLight.position.set(-1.6, 1.2, 3.0);
    scene.add(amberAccentLight);

    // Root industrial twin assembly
    const twinRoot = new THREE.Group();
    scene.add(twinRoot);

    // =========================================================================
    // Shared PBR Materials
    // =========================================================================
    const darkTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.85,
      roughness: 0.28,
    });
    const recessedDeckMat = new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      metalness: 0.8,
      roughness: 0.34,
    });
    const brushedAluminumMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.9,
      roughness: 0.2,
    });
    const mirrorChromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.96,
      roughness: 0.08,
    });
    const gunmetalPlcMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.72,
      roughness: 0.34,
    });
    const slateBezelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.65,
      roughness: 0.32,
    });
    const blueAnodizedMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.78,
      roughness: 0.24,
    });
    const brassTerminalMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.92,
      roughness: 0.22,
    });
    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0ea5e9,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.3,
    });

    // =========================================================================
    // 1. Illuminated Precision Baseplate & Holographic Telemetry Rings
    // =========================================================================
    const baseGroup = new THREE.Group();
    twinRoot.add(baseGroup);

    const outerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.55, 2.72, 0.24, 8),
      darkTitaniumMat
    );
    outerBase.position.y = -0.5;
    outerBase.rotation.y = Math.PI / 8;
    outerBase.receiveShadow = true;
    outerBase.castShadow = true;
    baseGroup.add(outerBase);

    const innerDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(2.16, 2.2, 0.04, 8),
      recessedDeckMat
    );
    innerDeck.position.y = -0.375;
    innerDeck.rotation.y = Math.PI / 8;
    innerDeck.receiveShadow = true;
    baseGroup.add(innerDeck);

    // Glowing cyan bevel ring along base perimeter
    const cyanBevelRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.54, 0.022, 14, 64),
      cyanGlowMat
    );
    cyanBevelRing.rotation.x = Math.PI / 2;
    cyanBevelRing.position.y = -0.378;
    baseGroup.add(cyanBevelRing);

    const innerAccentRing = new THREE.Mesh(
      new THREE.RingGeometry(2.12, 2.16, 64),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      })
    );
    innerAccentRing.rotation.x = -Math.PI / 2;
    innerAccentRing.position.y = -0.353;
    baseGroup.add(innerAccentRing);

    // 8 machined perimeter hex bolts
    const boltGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.04, 6);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const bolt = new THREE.Mesh(boltGeo, brushedAluminumMat);
      bolt.position.set(Math.cos(angle) * 2.34, -0.37, Math.sin(angle) * 2.34);
      baseGroup.add(bolt);
    }

    // Two counter-rotating translucent holographic telemetry rings with tick marks
    const outerHoloRingGroup = new THREE.Group();
    outerHoloRingGroup.position.y = -0.34;
    twinRoot.add(outerHoloRingGroup);

    const outerHoloTorus = new THREE.Mesh(
      new THREE.TorusGeometry(2.96, 0.012, 12, 128),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
      })
    );
    outerHoloTorus.rotation.x = Math.PI / 2;
    outerHoloRingGroup.add(outerHoloTorus);

    const tickGeo = new THREE.BoxGeometry(0.015, 0.008, 0.095);
    const tickMatCyan = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
    });
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const tick = new THREE.Mesh(tickGeo, tickMatCyan);
      tick.position.set(Math.cos(a) * 2.96, 0, Math.sin(a) * 2.96);
      tick.rotation.y = -a + Math.PI / 2;
      if (i % 3 === 0) tick.scale.set(1.5, 1, 1.45);
      outerHoloRingGroup.add(tick);
    }

    const innerHoloRingGroup = new THREE.Group();
    innerHoloRingGroup.position.y = -0.44;
    twinRoot.add(innerHoloRingGroup);

    const innerHoloRing = new THREE.Mesh(
      new THREE.RingGeometry(2.68, 2.75, 96),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
      })
    );
    innerHoloRing.rotation.x = -Math.PI / 2;
    innerHoloRingGroup.add(innerHoloRing);

    const tickMatEmerald = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.6,
    });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const tick = new THREE.Mesh(tickGeo, tickMatEmerald);
      tick.position.set(Math.cos(a) * 2.715, 0.004, Math.sin(a) * 2.715);
      tick.rotation.y = -a + Math.PI / 2;
      innerHoloRingGroup.add(tick);
    }

    // Floating particle constellation (Points with cyan & emerald dots)
    const particleCount = 120;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleMeta: Array<{
      baseRadius: number;
      baseY: number;
      angle: number;
      speed: number;
      bobPhase: number;
    }> = [];

    const colorCyan = new THREE.Color(0x38bdf8);
    const colorEmerald = new THREE.Color(0x10b981);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.65 + (i % 17) * 0.12 + Math.sin(i * 1.7) * 0.15;
      const angle = (i / particleCount) * Math.PI * 2 + (i % 5) * 0.35;
      const baseY = -0.25 + ((i * 0.6180339) % 1) * 2.45;

      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = baseY;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;

      const c = i % 3 === 0 ? colorEmerald : colorCyan;
      particleColors[i * 3] = c.r;
      particleColors[i * 3 + 1] = c.g;
      particleColors[i * 3 + 2] = c.b;

      particleMeta.push({
        baseRadius: radius,
        baseY,
        angle,
        speed: 0.08 + (i % 7) * 0.018,
        bobPhase: i * 0.7,
      });
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleTex = createParticleGlowTexture();
    const particleMat = new THREE.PointsMaterial({
      size: 0.085,
      map: particleTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    twinRoot.add(particlePoints);

    // =========================================================================
    // 2. Central Siemens-Style S7-1200 PLC Core (CPU 1214C DC/DC/DC)
    // =========================================================================
    const plcAssembly = new THREE.Group();
    plcAssembly.position.set(0, 0, -0.72);
    twinRoot.add(plcAssembly);

    // Metallic Steel DIN Rail + Mounting Stanchions
    const dinRailGroup = new THREE.Group();
    dinRailGroup.position.set(0, 0.56, -0.24);
    plcAssembly.add(dinRailGroup);

    const dinWeb = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 0.24, 0.03),
      brushedAluminumMat
    );
    dinWeb.castShadow = true;
    dinRailGroup.add(dinWeb);

    const dinTopFlange = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 0.028, 0.11),
      mirrorChromeMat
    );
    dinTopFlange.position.set(0, 0.12, 0.04);
    dinRailGroup.add(dinTopFlange);

    const dinBotFlange = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 0.028, 0.11),
      mirrorChromeMat
    );
    dinBotFlange.position.set(0, -0.12, 0.04);
    dinRailGroup.add(dinBotFlange);

    for (const sx of [-1.04, 1.04]) {
      const stanchion = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.94, 0.12),
        darkTitaniumMat
      );
      stanchion.position.set(sx, -0.45, -0.06);
      stanchion.castShadow = true;
      dinRailGroup.add(stanchion);

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.05, 0.26),
        slateBezelMat
      );
      foot.position.set(sx, -0.9, -0.04);
      dinRailGroup.add(foot);
    }

    // PLC Main Chassis
    const plcBodyGroup = new THREE.Group();
    plcBodyGroup.position.set(0, 0.58, 0.12);
    plcAssembly.add(plcBodyGroup);

    const plcHousing = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 1.36, 0.62),
      gunmetalPlcMat
    );
    plcHousing.castShadow = true;
    plcHousing.receiveShadow = true;
    plcBodyGroup.add(plcHousing);

    // Front anodized bezel
    const plcFrontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 1.28, 0.05),
      slateBezelMat
    );
    plcFrontPanel.position.set(0, 0, 0.305);
    plcFrontPanel.castShadow = true;
    plcBodyGroup.add(plcFrontPanel);

    // Chamfered dark-cyan side vents (left & right)
    const sideVentMat = new THREE.MeshStandardMaterial({
      color: 0x083344,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.38,
      metalness: 0.7,
      roughness: 0.3,
    });
    const ventGeo = new THREE.BoxGeometry(0.03, 0.06, 0.38);
    for (const side of [-1, 1]) {
      const sideRib = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 1.18, 0.48),
        slateBezelMat
      );
      sideRib.position.set(side * 0.745, 0, -0.02);
      plcBodyGroup.add(sideRib);

      for (let v = 0; v < 5; v++) {
        const vent = new THREE.Mesh(ventGeo, sideVentMat);
        vent.position.set(side * 0.758, -0.34 + v * 0.17, 0);
        plcBodyGroup.add(vent);
      }
    }

    // Top & bottom I/O terminal blocks with brass screw terminals
    const terminalBlockGeo = new THREE.BoxGeometry(1.28, 0.19, 0.14);
    const screwGeo = new THREE.CylinderGeometry(0.021, 0.021, 0.036, 10);

    const topTermBlock = new THREE.Mesh(terminalBlockGeo, darkTitaniumMat);
    topTermBlock.position.set(0, 0.56, 0.33);
    plcBodyGroup.add(topTermBlock);

    const botTermBlock = new THREE.Mesh(terminalBlockGeo, darkTitaniumMat);
    botTermBlock.position.set(0, -0.56, 0.33);
    plcBodyGroup.add(botTermBlock);

    for (let i = 0; i < 14; i++) {
      const tx = -0.56 + i * 0.086;
      const topScrew = new THREE.Mesh(screwGeo, brassTerminalMat);
      topScrew.rotation.x = Math.PI / 2;
      topScrew.position.set(tx, 0.57, 0.4);
      plcBodyGroup.add(topScrew);

      if (i < 12) {
        const bx = -0.495 + i * 0.09;
        const botScrew = new THREE.Mesh(screwGeo, brassTerminalMat);
        botScrew.rotation.x = Math.PI / 2;
        botScrew.position.set(bx, -0.55, 0.4);
        plcBodyGroup.add(botScrew);
      }
    }

    // Dynamic Front OLED Screen (CanvasTexture 512x256)
    const oledCanvas = document.createElement('canvas');
    oledCanvas.width = 512;
    oledCanvas.height = 256;
    const oledCtx = oledCanvas.getContext('2d');

    if (oledCtx) {
      drawOledCanvas(oledCtx, 512, 256, {
        time: 0,
        phaseLabel: 'HOME · a0',
        stroke: 0,
        y1Active: false,
        y2Active: false,
        cappingActive: false,
      });
    }

    const oledTexture = new THREE.CanvasTexture(oledCanvas);
    oledTexture.colorSpace = THREE.SRGBColorSpace;
    oledTexture.minFilter = THREE.LinearFilter;
    oledTexture.magFilter = THREE.LinearFilter;

    const oledBezel = new THREE.Mesh(
      new THREE.BoxGeometry(1.06, 0.55, 0.03),
      new THREE.MeshStandardMaterial({
        color: 0x020617,
        metalness: 0.85,
        roughness: 0.15,
      })
    );
    oledBezel.position.set(0, 0.04, 0.335);
    plcBodyGroup.add(oledBezel);

    const oledScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.98, 0.49),
      new THREE.MeshBasicMaterial({
        map: oledTexture,
      })
    );
    oledScreen.position.set(0, 0.04, 0.352);
    plcBodyGroup.add(oledScreen);

    // 16 Animated Glowing Status LEDs (8 top DI + 8 bottom DQ) + 3 CPU Status LEDs
    const ledGeo = new THREE.BoxGeometry(0.052, 0.032, 0.025);
    const diLedMaterials: THREE.MeshStandardMaterial[] = [];
    const dqLedMaterials: THREE.MeshStandardMaterial[] = [];

    for (let i = 0; i < 8; i++) {
      const lx = -0.455 + i * 0.13;

      const diMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.4,
        roughness: 0.2,
      });
      diLedMaterials.push(diMat);
      const diLed = new THREE.Mesh(ledGeo, diMat);
      diLed.position.set(lx, 0.39, 0.34);
      plcBodyGroup.add(diLed);

      const dqMat = new THREE.MeshStandardMaterial({
        color: i < 4 ? 0x0ea5e9 : 0xf59e0b,
        emissive: i < 4 ? 0x0ea5e9 : 0xf59e0b,
        emissiveIntensity: 0.4,
        roughness: 0.2,
      });
      dqLedMaterials.push(dqMat);
      const dqLed = new THREE.Mesh(ledGeo, dqMat);
      dqLed.position.set(lx, -0.35, 0.34);
      plcBodyGroup.add(dqLed);
    }

    // CPU Status LEDs (RUN / ERROR / MAINT)
    const runCpuLedMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 3.0,
    });
    const errCpuLedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.1,
    });
    const maintCpuLedMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
    });
    [runCpuLedMat, errCpuLedMat, maintCpuLedMat].forEach((mat, idx) => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), mat);
      dot.position.set(-0.61, 0.15 - idx * 0.11, 0.342);
      plcBodyGroup.add(dot);
    });

    // =========================================================================
    // 3A. Left/Front — Double-Acting Pneumatic Cylinder (CIL. A)
    // =========================================================================
    const cylGroup = new THREE.Group();
    cylGroup.position.set(-1.1, -0.15, 0.42);
    twinRoot.add(cylGroup);

    // Mounting feet on baseplate
    for (const fx of [-0.46, 0.46]) {
      const mount = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.22, 0.34),
        darkTitaniumMat
      );
      mount.position.set(fx, -0.11, 0);
      mount.castShadow = true;
      cylGroup.add(mount);
    }

    // Brushed silver aluminum barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.155, 0.92, 28),
      brushedAluminumMat
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    cylGroup.add(barrel);

    // Electric-blue anodized end-caps
    const endCapGeo = new THREE.BoxGeometry(0.1, 0.36, 0.36);
    const rearCap = new THREE.Mesh(endCapGeo, blueAnodizedMat);
    rearCap.position.set(-0.48, 0, 0);
    rearCap.castShadow = true;
    cylGroup.add(rearCap);

    const frontCap = new THREE.Mesh(endCapGeo, blueAnodizedMat);
    frontCap.position.set(0.48, 0, 0);
    frontCap.castShadow = true;
    cylGroup.add(frontCap);

    // 4 metallic tie-rods along corners
    const tieRodGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.12, 10);
    for (const sy of [-0.145, 0.145]) {
      for (const sz of [-0.145, 0.145]) {
        const rod = new THREE.Mesh(tieRodGeo, mirrorChromeMat);
        rod.rotation.z = Math.PI / 2;
        rod.position.set(0, sy, sz);
        cylGroup.add(rod);
      }
    }

    // Brass pneumatic fittings on top of cylinder end-caps
    const fittingGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.075, 12);
    const rearFitting = new THREE.Mesh(fittingGeo, brassTerminalMat);
    rearFitting.position.set(-0.48, 0.21, 0);
    cylGroup.add(rearFitting);

    const frontFitting = new THREE.Mesh(fittingGeo, brassTerminalMat);
    frontFitting.position.set(0.48, 0.21, 0);
    cylGroup.add(frontFitting);

    // Reed Sensor Rail + Glowing Emerald Reed Sensors (a0 and a1)
    const sensorRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.03, 0.035),
      darkTitaniumMat
    );
    sensorRail.position.set(0, 0.165, 0.145);
    cylGroup.add(sensorRail);

    const reedA0Mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 3.2,
      roughness: 0.2,
    });
    const reedA1Mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.2,
      roughness: 0.2,
    });

    const reedHousingGeo = new THREE.BoxGeometry(0.11, 0.055, 0.06);
    const reedLensGeo = new THREE.BoxGeometry(0.045, 0.03, 0.068);

    const a0Housing = new THREE.Mesh(reedHousingGeo, slateBezelMat);
    a0Housing.position.set(-0.34, 0.175, 0.155);
    cylGroup.add(a0Housing);
    const a0Lens = new THREE.Mesh(reedLensGeo, reedA0Mat);
    a0Lens.position.set(-0.34, 0.175, 0.16);
    cylGroup.add(a0Lens);

    const a1Housing = new THREE.Mesh(reedHousingGeo, slateBezelMat);
    a1Housing.position.set(0.34, 0.175, 0.155);
    cylGroup.add(a1Housing);
    const a1Lens = new THREE.Mesh(reedLensGeo, reedA1Mat);
    a1Lens.position.set(0.34, 0.175, 0.16);
    cylGroup.add(a1Lens);

    // Reciprocating mirror-chrome piston rod + blue pusher head
    const pistonAssembly = new THREE.Group();
    cylGroup.add(pistonAssembly);

    const pistonRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.78, 20),
      mirrorChromeMat
    );
    pistonRod.rotation.z = Math.PI / 2;
    pistonRod.position.set(0.36, 0, 0);
    pistonRod.castShadow = true;
    pistonAssembly.add(pistonRod);

    const pusherHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.085, 24),
      blueAnodizedMat
    );
    pusherHead.rotation.z = Math.PI / 2;
    pusherHead.position.set(0.76, 0, 0);
    pusherHead.castShadow = true;
    pistonAssembly.add(pusherHead);

    const pusherPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.025, 24),
      cyanGlowMat
    );
    pusherPad.rotation.z = Math.PI / 2;
    pusherPad.position.set(0.81, 0, 0);
    pistonAssembly.add(pusherPad);

    // =========================================================================
    // 3B. Center-Front — 3D 5/2 Solenoid Valve Manifold & Pneumatic Tubing
    // =========================================================================
    const valveGroup = new THREE.Group();
    valveGroup.position.set(-0.18, -0.25, 0.98);
    twinRoot.add(valveGroup);

    const manifoldBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.19, 0.28),
      darkTitaniumMat
    );
    manifoldBlock.castShadow = true;
    manifoldBlock.receiveShadow = true;
    valveGroup.add(manifoldBlock);

    const valveSpoolCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.045, 0.22),
      brushedAluminumMat
    );
    valveSpoolCap.position.set(0, 0.11, 0);
    valveGroup.add(valveSpoolCap);

    // Valve output brass fittings
    const vFitLeft = new THREE.Mesh(fittingGeo, brassTerminalMat);
    vFitLeft.position.set(-0.12, 0.16, 0);
    valveGroup.add(vFitLeft);

    const vFitRight = new THREE.Mesh(fittingGeo, brassTerminalMat);
    vFitRight.position.set(0.12, 0.16, 0);
    valveGroup.add(vFitRight);

    // Solenoid Coils Y1 (cyan) & Y2 (amber)
    const y1Mat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.3,
      roughness: 0.25,
    });
    const y2Mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.2,
      roughness: 0.25,
    });

    const coilGeo = new THREE.BoxGeometry(0.16, 0.17, 0.2);
    const coilCapGeo = new THREE.BoxGeometry(0.06, 0.05, 0.14);

    const y1Body = new THREE.Mesh(coilGeo, slateBezelMat);
    y1Body.position.set(-0.36, 0.01, 0);
    y1Body.castShadow = true;
    valveGroup.add(y1Body);
    const y1Glow = new THREE.Mesh(coilCapGeo, y1Mat);
    y1Glow.position.set(-0.36, 0.11, 0);
    valveGroup.add(y1Glow);

    const y2Body = new THREE.Mesh(coilGeo, slateBezelMat);
    y2Body.position.set(0.36, 0.01, 0);
    y2Body.castShadow = true;
    valveGroup.add(y2Body);
    const y2Glow = new THREE.Mesh(coilCapGeo, y2Mat);
    y2Glow.position.set(0.36, 0.11, 0);
    valveGroup.add(y2Glow);

    // Translucent blue TubeGeometry pneumatic air hoses
    const hoseExtendMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.72,
      roughness: 0.15,
      clearcoat: 0.8,
    });
    const hoseRetractMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.72,
      roughness: 0.15,
      clearcoat: 0.8,
    });

    const extendHoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.3, -0.07, 0.98),
      new THREE.Vector3(-0.68, 0.28, 0.94),
      new THREE.Vector3(-1.32, 0.34, 0.62),
      new THREE.Vector3(-1.58, 0.08, 0.42),
    ]);
    const extendHose = new THREE.Mesh(
      new THREE.TubeGeometry(extendHoseCurve, 44, 0.022, 12, false),
      hoseExtendMat
    );
    twinRoot.add(extendHose);

    const retractHoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.06, -0.07, 0.98),
      new THREE.Vector3(-0.18, 0.25, 0.78),
      new THREE.Vector3(-0.46, 0.26, 0.54),
      new THREE.Vector3(-0.62, 0.08, 0.42),
    ]);
    const retractHose = new THREE.Mesh(
      new THREE.TubeGeometry(retractHoseCurve, 40, 0.022, 12, false),
      hoseRetractMat
    );
    twinRoot.add(retractHose);

    // =========================================================================
    // 3C. Right — 3-Color GEMMA Signal Tower (H_PE, H_MAN, H_RUN)
    // =========================================================================
    const towerGroup = new THREE.Group();
    towerGroup.position.set(1.52, -0.36, -0.42);
    twinRoot.add(towerGroup);

    const towerFoot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.17, 0.08, 20),
      darkTitaniumMat
    );
    towerFoot.position.y = 0.04;
    towerFoot.castShadow = true;
    towerGroup.add(towerFoot);

    const towerPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.034, 0.98, 16),
      mirrorChromeMat
    );
    towerPole.position.y = 0.56;
    towerPole.castShadow = true;
    towerGroup.add(towerPole);

    const lanternBaseCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.11, 0.08, 24),
      darkTitaniumMat
    );
    lanternBaseCollar.position.y = 1.06;
    towerGroup.add(lanternBaseCollar);

    const lanternGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.19, 28);
    const sepRingGeo = new THREE.CylinderGeometry(0.124, 0.124, 0.02, 28);

    const hRunMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 2.2,
      roughness: 0.12,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.92,
    });
    const hManMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.15,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.85,
    });
    const hPeMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.25,
      roughness: 0.15,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.85,
    });

    const hRunMesh = new THREE.Mesh(lanternGeo, hRunMat);
    hRunMesh.position.y = 1.2;
    towerGroup.add(hRunMesh);

    const sep1 = new THREE.Mesh(sepRingGeo, mirrorChromeMat);
    sep1.position.y = 1.305;
    towerGroup.add(sep1);

    const hManMesh = new THREE.Mesh(lanternGeo, hManMat);
    hManMesh.position.y = 1.41;
    towerGroup.add(hManMesh);

    const sep2 = new THREE.Mesh(sepRingGeo, mirrorChromeMat);
    sep2.position.y = 1.515;
    towerGroup.add(sep2);

    const hPeMesh = new THREE.Mesh(lanternGeo, hPeMat);
    hPeMesh.position.y = 1.62;
    towerGroup.add(hPeMesh);

    const towerTopCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.125, 0.055, 24),
      darkTitaniumMat
    );
    towerTopCap.position.y = 1.74;
    towerGroup.add(towerTopCap);

    // =========================================================================
    // 3D. Front-Right — Mini Conveyor, Indexed Glass Bottle & Capping Head
    // =========================================================================
    const stationGroup = new THREE.Group();
    stationGroup.position.set(0.84, -0.36, 0.56);
    twinRoot.add(stationGroup);

    // Mini Conveyor Segment
    const convFrameGeo = new THREE.BoxGeometry(1.14, 0.1, 0.045);
    const frontRail = new THREE.Mesh(convFrameGeo, darkTitaniumMat);
    frontRail.position.set(0, 0.12, 0.24);
    frontRail.castShadow = true;
    stationGroup.add(frontRail);

    const backRail = new THREE.Mesh(convFrameGeo, darkTitaniumMat);
    backRail.position.set(0, 0.12, -0.24);
    backRail.castShadow = true;
    stationGroup.add(backRail);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.055, 0.12, 0.055);
    for (const lx of [-0.48, 0.48]) {
      for (const lz of [-0.24, 0.24]) {
        const leg = new THREE.Mesh(legGeo, slateBezelMat);
        leg.position.set(lx, 0.06, lz);
        stationGroup.add(leg);
      }
    }

    // Conveyor Rollers
    const rollerMeshes: THREE.Mesh[] = [];
    const rollerGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.43, 16);
    for (let r = 0; r < 6; r++) {
      const roller = new THREE.Mesh(rollerGeo, brushedAluminumMat);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(-0.46 + r * 0.184, 0.135, 0);
      stationGroup.add(roller);
      rollerMeshes.push(roller);
    }

    // Belt surface
    const beltMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.022, 0.36),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.7,
        metalness: 0.15,
      })
    );
    beltMesh.position.set(0, 0.165, 0);
    beltMesh.receiveShadow = true;
    stationGroup.add(beltMesh);

    // Guide rails
    const guideGeo = new THREE.CylinderGeometry(0.01, 0.01, 1.06, 10);
    for (const gz of [-0.18, 0.18]) {
      const guide = new THREE.Mesh(guideGeo, mirrorChromeMat);
      guide.rotation.z = Math.PI / 2;
      guide.position.set(0, 0.28, gz);
      stationGroup.add(guide);
    }

    // Translucent Glass-Cyan Industrial Bottle (LatheGeometry)
    const bottleGroup = new THREE.Group();
    bottleGroup.position.set(0, 0.178, 0);
    stationGroup.add(bottleGroup);

    const bottleProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.13, 0.0),
      new THREE.Vector2(0.14, 0.03),
      new THREE.Vector2(0.14, 0.27),
      new THREE.Vector2(0.11, 0.34),
      new THREE.Vector2(0.056, 0.39),
      new THREE.Vector2(0.056, 0.46),
      new THREE.Vector2(0.064, 0.475),
      new THREE.Vector2(0.048, 0.475),
    ];
    const bottleGeo = new THREE.LatheGeometry(bottleProfile, 28);
    const bottleGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.56,
      roughness: 0.08,
      metalness: 0.08,
      clearcoat: 1.0,
    });
    const bottleMesh = new THREE.Mesh(bottleGeo, bottleGlassMat);
    bottleMesh.castShadow = true;
    bottleGroup.add(bottleMesh);

    const liquidCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.112, 0.112, 0.22, 22),
      new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.85,
        transparent: true,
        opacity: 0.65,
        roughness: 0.15,
      })
    );
    liquidCore.position.y = 0.13;
    bottleGroup.add(liquidCore);

    const bottleCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.048, 20),
      blueAnodizedMat
    );
    bottleCap.position.y = 0.49;
    bottleGroup.add(bottleCap);

    // Gantry & Vertical Stainless Pneumatic Capping Head
    const gantryGroup = new THREE.Group();
    stationGroup.add(gantryGroup);

    const postGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.04, 14);
    const postLeft = new THREE.Mesh(postGeo, mirrorChromeMat);
    postLeft.position.set(-0.28, 0.66, -0.22);
    gantryGroup.add(postLeft);

    const postRight = new THREE.Mesh(postGeo, mirrorChromeMat);
    postRight.position.set(0.28, 0.66, -0.22);
    gantryGroup.add(postRight);

    const gantryBridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.08, 0.36),
      darkTitaniumMat
    );
    gantryBridge.position.set(0, 1.15, -0.09);
    gantryBridge.castShadow = true;
    gantryGroup.add(gantryBridge);

    const capCylinderBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.24, 20),
      brushedAluminumMat
    );
    capCylinderBody.position.set(0, 1.24, 0);
    gantryGroup.add(capCylinderBody);

    // Moving Capping Head Assembly
    const cappingHeadGroup = new THREE.Group();
    cappingHeadGroup.position.set(0, 1.04, 0);
    gantryGroup.add(cappingHeadGroup);

    const capRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.28, 16),
      mirrorChromeMat
    );
    capRod.position.y = 0.04;
    cappingHeadGroup.add(capRod);

    const capChuck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.092, 0.078, 0.11, 24),
      brushedAluminumMat
    );
    capChuck.position.y = -0.12;
    capChuck.castShadow = true;
    cappingHeadGroup.add(capChuck);

    const capRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const capGlowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.012, 10, 28),
      capRingMat
    );
    capGlowRing.rotation.x = Math.PI / 2;
    capGlowRing.position.y = -0.16;
    cappingHeadGroup.add(capGlowRing);

    // =========================================================================
    // Interactive Pointer Orbit Controls + Smooth Presets + Idle Auto-Orbit
    // =========================================================================
    const initialPreset = CAMERA_PRESETS.overview;
    const cameraState = {
      theta: initialPreset.theta,
      phi: initialPreset.phi,
      radius: initialPreset.radius,
      targetTheta: initialPreset.theta,
      targetPhi: initialPreset.phi,
      targetRadius: initialPreset.radius,
      lookAt: new THREE.Vector3(...initialPreset.target),
      targetLookAt: new THREE.Vector3(...initialPreset.target),
      parallaxX: 0,
      parallaxY: 0,
      targetParallaxX: 0,
      targetParallaxY: 0,
      isDragging: false,
      lastPointerX: 0,
      lastPointerY: 0,
      lastInteractionTime: -10,
      responsiveZoomFactor: width < 520 ? 1.22 : 1.0,
    };

    presetControlRef.current = {
      applyPreset: (preset: CameraPreset) => {
        cameraState.targetTheta = preset.theta;
        cameraState.targetPhi = Math.max(POLAR_MIN, Math.min(POLAR_MAX, preset.phi));
        cameraState.targetRadius = preset.radius;
        cameraState.targetLookAt.set(...preset.target);
        cameraState.lastInteractionTime = performance.now() * 0.001;
      },
    };

    const domEl = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      cameraState.isDragging = true;
      cameraState.lastPointerX = e.clientX;
      cameraState.lastPointerY = e.clientY;
      cameraState.lastInteractionTime = performance.now() * 0.001;
      setActivePreset(null);
      try {
        domEl.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = domEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        cameraState.targetParallaxX = nx * 0.08;
        cameraState.targetParallaxY = ny * 0.045;
      }

      if (!cameraState.isDragging) return;
      const dx = e.clientX - cameraState.lastPointerX;
      const dy = e.clientY - cameraState.lastPointerY;
      cameraState.lastPointerX = e.clientX;
      cameraState.lastPointerY = e.clientY;
      cameraState.lastInteractionTime = performance.now() * 0.001;

      cameraState.targetTheta -= dx * 0.0075;
      cameraState.targetPhi = Math.max(
        POLAR_MIN,
        Math.min(POLAR_MAX, cameraState.targetPhi - dy * 0.006)
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!cameraState.isDragging) return;
      cameraState.isDragging = false;
      cameraState.lastInteractionTime = performance.now() * 0.001;
      try {
        domEl.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if not captured
      }
    };

    const onPointerLeave = () => {
      cameraState.targetParallaxX = 0;
      cameraState.targetParallaxY = 0;
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('pointercancel', onPointerUp);
    domEl.addEventListener('pointerleave', onPointerLeave);

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(entry.contentRect.width, 1);
      const h = Math.max(entry.contentRect.height, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      cameraState.responsiveZoomFactor = w < 520 ? 1.22 : 1.0;
    });
    resizeObserver.observe(container);

    // =========================================================================
    // 60fps Animation Loop
    // =========================================================================
    let rafId = 0;
    let prevTime = performance.now() * 0.001;
    let lastOledUpdate = -1;

    const animate = (nowMs: number) => {
      rafId = requestAnimationFrame(animate);
      const now = nowMs * 0.001;
      const dt = Math.min(now - prevTime, 0.05);
      prevTime = now;

      // 1. Synchronized Industrial Cycle (5.2s)
      const norm = (now % CYCLE_DURATION_SEC) / CYCLE_DURATION_SEC;

      let stroke = 0;
      let y1Active = false;
      let y2Active = false;
      let cappingActive = false;
      let capDepth = 0;
      let phaseLabel = 'HOME · a0';

      if (norm < 0.14) {
        stroke = 0;
        phaseLabel = 'READY · a0';
      } else if (norm < 0.4) {
        y1Active = true;
        stroke = smoothstep(0.14, 0.39, norm);
        phaseLabel = 'EXTEND · Y1';
      } else if (norm < 0.66) {
        stroke = 1;
        cappingActive = true;
        if (norm < 0.53) {
          capDepth = smoothstep(0.41, 0.52, norm);
        } else {
          capDepth = 1 - smoothstep(0.54, 0.65, norm);
        }
        phaseLabel = 'CAP CYCLE · a1';
      } else if (norm < 0.89) {
        y2Active = true;
        stroke = 1 - smoothstep(0.66, 0.88, norm);
        phaseLabel = 'RETRACT · Y2';
      } else {
        stroke = 0;
        phaseLabel = 'INDEX · RUN';
      }

      // 2. Pneumatic Cylinder & Reed Sensors
      pistonAssembly.position.x = stroke * 0.56;
      const a0Lit = stroke <= 0.07;
      const a1Lit = stroke >= 0.93;
      reedA0Mat.emissiveIntensity = a0Lit ? 3.4 : 0.15;
      reedA1Mat.emissiveIntensity = a1Lit ? 3.4 : 0.15;

      // 3. Solenoid Coils & Pressurized Air Hoses
      y1Mat.emissiveIntensity = y1Active ? 3.2 : 0.2;
      y2Mat.emissiveIntensity = y2Active ? 3.2 : 0.2;
      hoseExtendMat.emissiveIntensity = y1Active
        ? 1.35 + Math.sin(now * 16) * 0.35
        : 0.22;
      hoseRetractMat.emissiveIntensity = y2Active
        ? 1.35 + Math.sin(now * 16) * 0.35
        : 0.18;

      // 4. Capping Head & Bottle Index Animation
      cappingHeadGroup.position.y = 1.04 - capDepth * 0.23;
      capRingMat.emissiveIntensity = cappingActive
        ? 2.8 + Math.sin(now * 20) * 0.6
        : 0.45;
      if (cappingActive) {
        capChuck.rotation.y += dt * 7.5;
      }

      // Gentle conveyor roller spin during index phase
      if (norm >= 0.89 || norm < 0.14) {
        const rollSpeed = dt * 2.4;
        for (const roller of rollerMeshes) {
          roller.rotation.y += rollSpeed;
        }
        bottleGroup.position.x = Math.sin(((norm + 0.11) % 0.25) * Math.PI * 4) * 0.025;
      } else {
        bottleGroup.position.x = 0;
      }

      // 5. 16 PLC DI/DQ Status LEDs
      const sweepIdx = Math.floor((now * 7.5) % 8);
      for (let i = 0; i < 8; i++) {
        let diIntensity = 0.22;
        if (i === 0 && a0Lit) diIntensity = 3.2;
        else if (i === 1 && a1Lit) diIntensity = 3.2;
        else if (i === 2 && cappingActive) diIntensity = 2.6;
        else if (i === sweepIdx) diIntensity = 1.8;
        else if (i === 7) diIntensity = 1.2 + Math.sin(now * 4) * 0.4;
        diLedMaterials[i].emissiveIntensity = diIntensity;

        let dqIntensity = 0.2;
        if (i === 0 && y1Active) dqIntensity = 3.4;
        else if (i === 1 && y2Active) dqIntensity = 3.4;
        else if (i === 2 && cappingActive) dqIntensity = 3.0;
        else if (i === (7 - sweepIdx)) dqIntensity = 1.7;
        dqLedMaterials[i].emissiveIntensity = dqIntensity;
      }

      runCpuLedMat.emissiveIntensity = 2.4 + Math.sin(now * 5) * 0.7;

      // 6. Signal Tower (H_RUN bright emerald, H_MAN subtle amber, H_PE subtle red)
      hRunMat.emissiveIntensity = 2.3 + Math.sin(now * 3.5) * 0.45;
      hManMat.emissiveIntensity = cappingActive ? 0.85 : 0.25;
      hPeMat.emissiveIntensity = 0.2;

      // 7. Holographic Rings & Floating Particle Constellation
      outerHoloRingGroup.rotation.y += dt * 0.18;
      innerHoloRingGroup.rotation.y -= dt * 0.24;

      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        const m = particleMeta[i];
        const a = m.angle + now * m.speed;
        posAttr.setXYZ(
          i,
          Math.cos(a) * m.baseRadius,
          m.baseY + Math.sin(now * 1.1 + m.bobPhase) * 0.11,
          Math.sin(a) * m.baseRadius
        );
      }
      posAttr.needsUpdate = true;

      // 8. Dynamic OLED Screen Canvas Update (throttled to ~24Hz for peak efficiency)
      if (oledCtx && now - lastOledUpdate >= 0.042) {
        lastOledUpdate = now;
        drawOledCanvas(oledCtx, 512, 256, {
          time: now,
          phaseLabel,
          stroke,
          y1Active,
          y2Active,
          cappingActive,
        });
        oledTexture.needsUpdate = true;
      }

      // 9. Camera Orbit Damping + Idle Cinematic Rotation + Mouse Parallax
      if (!cameraState.isDragging && now - cameraState.lastInteractionTime > 2.4) {
        cameraState.targetTheta += dt * 0.14;
      }

      const damping = 1 - Math.exp(-6.5 * dt);
      cameraState.theta += (cameraState.targetTheta - cameraState.theta) * damping;
      cameraState.phi += (cameraState.targetPhi - cameraState.phi) * damping;
      cameraState.radius +=
        (cameraState.targetRadius * cameraState.responsiveZoomFactor - cameraState.radius) *
        damping;
      cameraState.lookAt.lerp(cameraState.targetLookAt, damping);

      cameraState.parallaxX += (cameraState.targetParallaxX - cameraState.parallaxX) * damping;
      cameraState.parallaxY += (cameraState.targetParallaxY - cameraState.parallaxY) * damping;

      const effTheta = cameraState.theta + (cameraState.isDragging ? 0 : cameraState.parallaxX);
      const effPhi = Math.max(
        POLAR_MIN,
        Math.min(POLAR_MAX, cameraState.phi + (cameraState.isDragging ? 0 : cameraState.parallaxY))
      );

      const sinPhi = Math.sin(effPhi);
      camera.position.set(
        cameraState.lookAt.x + cameraState.radius * sinPhi * Math.sin(effTheta),
        cameraState.lookAt.y + cameraState.radius * Math.cos(effPhi),
        cameraState.lookAt.z + cameraState.radius * sinPhi * Math.cos(effTheta)
      );
      camera.lookAt(cameraState.lookAt);

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('pointercancel', onPointerUp);
      domEl.removeEventListener('pointerleave', onPointerLeave);
      presetControlRef.current = null;
      disposeSceneResources(scene);
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, []);

  if (webglUnavailable) {
    return <WebGLFallbackShowcase className={className} />;
  }

  const handlePresetClick = (presetId: CameraPresetId) => {
    setActivePreset(presetId);
    presetControlRef.current?.applyPreset(CAMERA_PRESETS[presetId]);
  };

  return (
    <div
      className={`relative w-full h-full min-h-[380px] select-none overflow-hidden rounded-2xl ${className}`}
    >
      {/* Subtle radial studio backdrop glow behind transparent WebGL canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(14,165,233,0.16)_0%,rgba(16,185,129,0.06)_42%,transparent_72%)]"
      />

      {/* Interactive WebGL Mount */}
      <div
        ref={containerRef}
        className="relative z-10 h-full w-full cursor-grab active:cursor-grabbing"
        aria-label="Gemelo digital 3D interactivo de PLC S7-1200 y estación electroneumática"
      />

      {/* Top-Left Live Status HUD Badge */}
      <div className="pointer-events-none absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2 rounded-full bg-slate-950/75 backdrop-blur-md border border-emerald-500/35 px-3 py-1.5 text-[11px] sm:text-xs font-mono text-slate-100 shadow-lg shadow-slate-950/40">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="tracking-wide">CPU 1214C · RUN · 60 FPS</span>
      </div>

      {/* Top-Right Telemetry Spec Badge */}
      <div className="pointer-events-none absolute top-3 right-3 sm:top-4 sm:right-4 z-20 hidden sm:flex items-center gap-2 rounded-full bg-slate-950/75 backdrop-blur-md border border-sky-500/30 px-3.5 py-1.5 text-xs font-mono text-sky-200 shadow-lg shadow-slate-950/40">
        <Activity className="h-3.5 w-3.5 text-sky-400" />
        <span>GEMMA F1 · 5 CILINDROS · 24V DC</span>
      </div>

      {/* Bottom-Left Quick Camera Preset Pills */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 flex flex-wrap items-center gap-1.5">
        {(
          [
            { id: 'overview', label: 'Vista 3D', Icon: Box },
            { id: 'plc', label: 'Enfocar PLC', Icon: Cpu },
            { id: 'pneumatics', label: 'Neumática', Icon: Gauge },
          ] as const
        ).map(({ id, label, Icon }) => {
          const isActive = activePreset === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handlePresetClick(id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-medium backdrop-blur-md transition-all border ${
                isActive
                  ? 'bg-sky-500/25 border-sky-400/60 text-sky-100 shadow-sm shadow-sky-500/25'
                  : 'bg-slate-950/70 border-slate-700/60 text-slate-300 hover:border-sky-500/40 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 text-sky-400" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom-Right Subtle Orbit Hint Pill */}
      <div className="pointer-events-none absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 hidden md:flex items-center gap-1.5 rounded-full bg-slate-950/70 backdrop-blur-md border border-slate-700/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 shadow-lg shadow-slate-950/40">
        <Rotate3d className="h-3.5 w-3.5 text-sky-400" />
        <span>Arrastra para orbitar 360°</span>
      </div>
    </div>
  );
};
