# Baru Studio (CADe_SIMU Web Pro + TIA Portal S7-1200) — Documentación Total

## 1. Resumen Ejecutivo

**Baru Studio** (CADe_SIMU Web Pro + TIA Portal S7-1200 Simulator) es una plataforma web moderna de simulación electrotécnica, electroneumática y programación PLC **Siemens S7-1200 (CPU 1214C DC/DC/DC)** con interfaz minimalista estilo **Tinkercad Circuits**, diseñada y mantenida por **Simón Barrera Ruíz**.

Desarrollada en **TypeScript + React 19 + Vite + Tailwind CSS**, combina dos mundos en tiempo real y en una sola pestaña de navegador (desplegable 100 % estático en Vercel):
1. **Esquemas CADe_SIMU (V1–V4.2):** Fuerza trifásica, maniobra con contactores/temporizadores, electroneumática (cilindros doble efecto + electroválvulas 5/2 biestables) e importación/exportación nativa en `.cad`.
2. **TIA Portal S7-1200 Integrado (LAD / SCL / GRAFCET):** Edición visual Ladder con **Gafas Online** en tiempo real, compilador/ejecutor **SCL IEC 61131-3** con Watch de variables, **Tabla de Variables (PLC Tags)**, bloques `TON` / `TOF` / `CTU` y exportación/importación oficial en **ZIP TIA Portal**, **Openness XML (V21 `FlgNet/v4`, `StructuredText/v4`, `PLCTags.xml`)** y fuente externa **`.scl`**.

---

## 2. Arquitectura de Software

El proyecto se ubica en `C:\Users\User\Desktop\Proyectos\REA\Cadesimu`:

```text
C:\Users\User\Desktop\Proyectos\REA\Cadesimu/
├── public/
│   └── favicon.svg
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql           # Migración SQL idempotente (profiles, projects, exam_attempts + RLS)
├── src/
│   ├── types/
│   │   ├── circuit.ts                       # Modelos de componentes, Quick-Link plcAddress y neumática
│   │   ├── simulation.ts                    # Estados eléctricos, motores RPM, temporizadores y PneumaticState
│   │   ├── cloud.ts                         # Contratos UserProfile, CloudProject, ExamAttemptRecord y DbResult
│   │   └── faults.ts                        # Catálogo didáctico de averías y sesiones de examen
│   ├── contexts/
│   │   └── AuthContext.tsx                  # Sesión Supabase Auth, perfil DB-First y estado del Onboarding Wizard
│   ├── core/
│   │   ├── supabase/
│   │   │   ├── client.ts                    # Cliente Supabase tipado (solo claves públicas VITE_*)
│   │   │   └── repository.ts                # Capa CRUD DB-First con cola offline y protección anti-null
│   │   ├── components/
│   │   │   └── catalog.ts                   # Catálogo completo IEC + S7-1200 + Neumática A+/A-
│   │   ├── simulation/
│   │   │   ├── solver.ts                    # Co-simulación Nodal + Relés 1L->Q0..Q3 + Física Neumática
│   │   │   └── soundEffects.ts              # Síntesis WebAudio de maniobra y fallas
│   │   ├── plc/
│   │   │   ├── tiaEngine.ts                 # Runtime Scan Cycle S7-1200 (LAD, SCL, GRAFCET, Transpilador)
│   │   │   └── tiaFormat.ts                 # ZIP Store+CRC32, Openness XML (LAD/SCL/Tags), .scl y puente .ap21
│   │   ├── format/
│   │   │   └── cadParser.ts                 # Parser/Exporter robusto compatible CADe_SIMU V1.0–V4.2
│   │   └── examples/
│   │       └── index.ts                     # 7 prácticas listas (incluyendo S7-1200 + Motor y Neumática A+ A-)
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthModal.tsx                # Modal Iniciar sesión / Crear cuenta + confirmación por correo
│   │   ├── cloud/
│   │   │   ├── ProjectsModal.tsx            # Mis Proyectos en la Nube, compartir (?share=) e Historial Exámenes
│   │   │   └── SharedProjectBanner.tsx      # Banner para ver y clonar proyectos públicos compartidos
│   │   ├── onboarding/
│   │   │   └── OnboardingWizard.tsx         # Tour interactivo guiado de 5 pasos con foco spotlight y botón Omitir
│   │   ├── layout/
│   │   │   ├── TinkerHeader.tsx             # Cabecera Tinkercad 56px: Tabs [Esquema CAD | Código TIA | Planta 2D]
│   │   │   └── TinkerComponentDrawer.tsx    # Cajón derecho buscable y filtrable por categoría
│   │   ├── canvas/
│   │   │   ├── SchematicCanvas.tsx          # Lienzo SVG DIN A4 con Pan/Zoom/Snap
│   │   │   ├── ComponentRenderer.tsx        # Render vectorial vivo (LEDs PLC, vástago animado, badges %I/%Q)
│   │   │   ├── WireRenderer.tsx             # Trazado ortogonal con energía en tiempo real
│   │   │   ├── TitleBlock.tsx               # Cajetín ISO 7200 normalizado
│   │   │   ├── TinkerFloatingBar.tsx        # Píldora flotante (Mover, Cable + Color, Rotar, Undo/Redo)
│   │   │   └── TinkerInspector.tsx          # Inspector contextual (Tag, Quick-Link %I/%Q, Timer)
│   │   ├── plc/
│   │   │   └── TiaWorkspaceView.tsx         # Estudio TIA Portal: CPU 1214C viva, Tags, LAD, SCL y GRAFCET
│   │   ├── plant/
│   │   │   └── DigitalTwinPlant.tsx         # Gemelo Digital 2D (Cinta, Tanque Bomba y Estación Neumática)
│   │   ├── tools/
│   │   │   ├── TimingDiagram.tsx            # Cronograma / Osciloscopio lógico de señales
│   │   │   ├── VirtualMultimeter.tsx        # Multímetro industrial Fluke
│   │   │   └── FaultInjectorModal.tsx       # Inyector de averías y evaluación técnica
│   │   └── dialogs/
│   │       ├── UnifiedExportModal.tsx       # Centro de descarga/importación (.cad, .zip, .xml, .scl, .json)
│   │       ├── ComponentEditModal.tsx       # Editor detallado (Tag, Dirección PLC, Temporizador)
│   │       ├── LabReportModal.tsx           # Lista de materiales (BOM)
│   │       └── AboutModal.tsx
│   ├── App.tsx                              # Orquestador Tinkercad + Bucle de Co-Simulación 30 Hz
│   └── main.tsx
├── package.json
└── vercel.json
```

---

## 3. Co-Simulación en Tiempo Real (CADe_SIMU + TIA S7-1200 + Neumática)

En cada ciclo de simulación (30 Hz / `step` configurable), [`App.tsx`](file:///C:/Users/User/Desktop/Proyectos/REA/Cadesimu/src/App.tsx) ejecuta dos etapas acopladas:

1. **Ciclo de Scan PLC (`stepTiaScanCycle` en [`tiaEngine.ts`](file:///C:/Users/User/Desktop/Proyectos/REA/Cadesimu/src/core/plc/tiaEngine.ts)):**
   * Toma la **Imagen de Proceso de Entradas (`PII`)**: lee las entradas eléctricas cableadas al bloque S7-1200 (`I0..I4`), los componentes vinculados por **Quick-Link (`plcAddress: %I0.x`)**, los sensores reed automáticos (`a0`, `a1`) y las entradas forzadas manualmente desde la tarjeta CPU.
   * Evalúa el lenguaje activo (**`LAD`**, **`SCL`** o **`GRAFCET`**), actualizando temporizadores IEC (`TON`/`TOF`), contadores (`CTU`), marcas (`%M`), estados de **Gafas Online** (`elementPowerFlow`) y variables de **Watch** en SCL.
   * Publica la **Imagen de Proceso de Salidas (`PIQ`)** (`%Q0.0..%Q0.3`).

2. **Solver Nodal Eléctrico y Neumático (`CircuitSolver.step` en [`solver.ts`](file:///C:/Users/User/Desktop/Proyectos/REA/Cadesimu/src/core/simulation/solver.ts)):**
   * Puentea el borne común `1L` del PLC hacia las salidas a relé `Q0..Q3` cuando `%Q0.x` está en `TRUE`.
   * Aplica también **Quick-Link directo** si un actuador/piloto/bobina tiene `plcAddress` (`%Q0.x`) sin necesidad de cablear físicamente cada punto en prácticas rápidas estilo Tinkercad.
   * Integra la posición del vástago (`0.0` a `1.0`) de cilindros doble efecto (`pneumatic_cylinder_da`) alimentados por electroválvulas 5/2 biestables (`Y1`/`Y2`), conmutando automáticamente los finales de carrera magnéticos (`a0`, `a1`) para ciclos continuos `A+ / A-`.

---

## 4. Formatos Compatibles (Descarga e Importación)

Desde el botón **Exportar / Importar** ([`UnifiedExportModal.tsx`](file:///C:/Users/User/Desktop/Proyectos/REA/Cadesimu/src/components/dialogs/UnifiedExportModal.tsx)):

### Formatos CADe_SIMU (`src/core/format/cadParser.ts`)
* **`.cad` (V4.2):** Generador con delimitadores exactos `CADe_SIMU*0*`, cajetín ISO 7200 (`Simón Barrera Ruíz`), cables DC (`4018`/`4019`), bloques PLC (`10200`) y actuadores neumáticos (`10501`/`10510`).
* **Parser adaptativo V1.0–V4.2 + Hoja Dinámica:** Lee archivos de escritorio en codificación `ISO-8859-1`, descarta códigos puramente gráficos/decorativos sin crear contactos fantasma, ajusta escala/pines/uniones T, expande dinámicamente el tamaño de la lámina CAD para que diagramas grandes (como la Embotelladora GEMMA) nunca se salgan del plano y auto-extrae lógica `LAD`/`GRAFCET`/`SCL` a la pestaña `Código TIA`.
* **`.json` (Bundle Completo):** Guarda simultáneamente el circuito CAD + el programa TIA Portal S7-1200.

### Multímetro Sonda en Vivo, Ejemplos Nivel 1–8 y Planta 2D (4 Modos)
* **Multímetro Fluke-87V por Sonda de Contacto ([`VirtualMultimeter.tsx`](file:///C:/Users/User/Desktop/Proyectos/REA/Cadesimu/src/components/tools/VirtualMultimeter.tsx) + [`solver.ts`](file:///C:/Users/User/Desktop/Proyectos/REA/Cadesimu/src/core/simulation/solver.ts)):** Al abrirlo activa el modo sonda en el esquema; hacer clic sobre cualquier cable, borne o componente muestra al instante **Voltaje (`V AC`/`DC`)**, **Corriente (`A`)** propagada por KCL y **Potencia (`W`/`kW`)** real del punto medido.
* **Catálogo Ordenado por Complejidad Nivel 1 → 8 ([`examples/index.ts`](file:///C:/Users/User/Desktop/Proyectos/REA/Cadesimu/src/core/examples/index.ts)):** Cada ejemplo incluye simultáneamente su esquema CAD verificado + su programa TIA completo (**LAD + SCL + GRAFCET + PLC Tags**), culminando en **Nivel 7: Banda Transportadora Clasificadora (S7-1200)** y **Nivel 8: Proyecto Final Embotelladora Industrial GEMMA (S7-1200)**.
* **Gemelo Digital Planta 2D ([`DigitalTwinPlant.tsx`](file:///C:/Users/User/Desktop/Proyectos/REA/Cadesimu/src/components/plant/DigitalTwinPlant.tsx)):** Cuatro plantas interactivas operativas: **Cinta Clasificadora**, **Tanque Bomba** (llenado/vaciado en vivo + válvulas/sensores MIN/MAX), **Neumática A+/A-** (acoplada al PLC real y con respaldo sincronizado para responder siempre a Marcha) y **Embotelladora GEMMA 2D** (avance, llenado `Y1`, tapado `Y2`, torreta GEMMA y contador de botellas).

### Formatos Siemens TIA Portal (`src/core/plc/tiaFormat.ts`)
* **`.zip` Paquete Completo TIA Portal (V16–V21):** Generado 100 % en navegador sin dependencias externas (PKZIP Store + CRC32). Contiene:
  1. `PLCTags.xml` (`SW.Tags.PlcTagTable` V21)
  2. `Main_OB1_LAD.xml` (Openness `FlgNet/v4`)
  3. `Main_OB1_SCL.xml` (Openness `StructuredText/v4`)
  4. `Main.scl` (Fuente externa IEC 61131-3 lista para "Generar bloques desde fuente")
  5. `proyecto_tia.json`
  6. `README_Importar_TIA_Portal.txt`
* **Importación directa:** Permite abrir `.cad`, `.scl`, Openness `.xml` (LAD, SCL y `PLCTags.xml`) y `.json`.
* **Puente MCP Local Opcional:** Permite enviar los XML/SCL compilables al servicio local de `tia-portal-mcp` (`http://127.0.0.1:8765/api/tia/export-ap21`) en equipos Windows con TIA Portal V21 Openness instalado para emitir `.ap21`.

---

## 5. Backend Supabase (DB-First), Autenticación y Wizard de 5 Pasos

* **Esquema SQL Idempotente ([`supabase/migrations/001_initial_schema.sql`](file:///C:/Users/User/Desktop/Proyectos/REA/Cadesimu/supabase/migrations/001_initial_schema.sql)):**
  * `public.profiles`: perfil vinculado a `auth.users` con trigger automático `on_auth_user_created` y estado `onboarding_completed`, `onboarding_skipped` y `onboarding_step`.
  * `public.projects`: almacena proyectos unificados (`circuit_doc` + `tia_program` en JSONB), autoguardado con debounce, duplicación, borrado seguro y enlaces públicos compartibles (`?share=<slug>`) protegidos por RLS.
  * `public.exam_attempts`: historial persistente de diagnósticos de averías con puntaje, intentos y notas del estudiante.
* **Acceso Libre + Autenticación Email/Contraseña:** Los usuarios pueden diseñar y simular de inmediato en modo invitado; al iniciar sesión o crear cuenta desbloquean sincronización en la nube, enlaces públicos e historial de exámenes.
* **Wizard Tutorial Interactivo de 5 Pasos ([`OnboardingWizard.tsx`](file:///C:/Users/User/Desktop/Proyectos/REA/Cadesimu/src/components/onboarding/OnboardingWizard.tsx)):** Se abre automáticamente al entrar por primera vez con una cuenta nueva (`onboarding_completed = false`), recorre con spotlight las vistas `Esquema CAD`, `Código TIA`, `Planta 2D` y `Nube / Exportar`, ofrece botón **Omitir tutorial** en cada paso y permite repetirlo desde el menú de usuario o `Herramientas`.

---

## 6. Comandos de Desarrollo y Compilación

```powershell
cd "C:\Users\User\Desktop\Proyectos\REA\Cadesimu"
npm.cmd install
npm.cmd run dev      # Servidor local Vite
npm.cmd run build    # Verificación TypeScript strict + Build producción en dist/
```
