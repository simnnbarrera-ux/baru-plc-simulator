# CADe_SIMU Web Pro - Documentación Total

## 1. Resumen Ejecutivo

**CADe_SIMU Web Pro** es una reconstrucción moderna, fiel y de alto rendimiento del clásico software de simulación electrotécnica y automatismos industriales **CADe_SIMU v4.2** de Juan Luis Villanueva Montoto.

Desarrollada en **TypeScript + React 19 + Vite + Tailwind CSS**, traslada toda la potencia del simulador de escritorio a cualquier navegador web moderno, eliminando dependencias de librerías DLL heredadas de 32 bits de Windows (MFC42D, libnodave) e incorporando una interfaz visual industrial oscura/clara, renderizado vectorial nítido con zoom y paneo infinitos, y simulación de circuitos en tiempo real.

---

## 2. Arquitectura de Software

El proyecto se ubica en `c:\Users\User\Desktop\Proyectos\REA\Cadesimu`:

```
c:\Users\User\Desktop\Proyectos\REA\Cadesimu/
├── public/
│   └── favicon.svg                     # Icono de la aplicación
├── src/
│   ├── types/
│   │   ├── circuit.ts                  # Modelos de componentes, pines, cables, tags y cajetín
│   │   └── simulation.ts               # Estados de simulación, nodos de tensión, RPM y temporizadores
│   ├── core/
│   │   ├── components/
│   │   │   └── catalog.ts              # Catálogo exhaustivo de componentes industriales
│   │   ├── simulation/
│   │   │   └── solver.ts               # Motor nodal de propagación de potenciales y conmutación
│   │   ├── format/
│   │   │   └── cadParser.ts            # Parser/Exporter de archivos originales *.cad y JSON
│   │   └── examples/
│   │       └── index.ts                # Circuitos interactivos pre-cargados (Arranque directo, Y-Δ, Inversión)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MenuBar.tsx             # Menú superior (Archivo, Ejemplos, Simulación, Ayuda)
│   │   │   ├── ToolBar.tsx             # Botones de acción rápida y mandos de simulación (Play, Stop, Pause)
│   │   │   ├── ComponentRibbon.tsx     # Cinta categorizada idéntica a CADe_SIMU
│   │   │   └── StatusBar.tsx           # Barra inferior con coordenadas (X, Y), estado y recuento
│   │   ├── canvas/
│   │   │   ├── SchematicCanvas.tsx     # Lienzo SVG con pan, zoom, rejilla milimétrica y snap
│   │   │   ├── ComponentRenderer.tsx   # Dibujo vectorial de símbolos con animación activa
│   │   │   ├── WireRenderer.tsx        # Trazado ortogonal y coloreado por tipo de conductor
│   │   │   └── TitleBlock.tsx          # Cajetín de rotulación normalizado DIN A4
│   │   └── dialogs/
│   │       ├── ComponentEditModal.tsx  # Editor de tags y temporizadores
│   │       ├── ImportExportModal.tsx   # Importador/Exportador .cad y JSON
│   │       └── AboutModal.tsx          # Ficha técnica del proyecto
│   ├── App.tsx                         # Orquestador del estado global y bucle a 60 FPS
│   ├── main.tsx                        # Punto de entrada de React
│   └── index.css                       # Directivas Tailwind y estilos de interfaz
├── index.html                          # Contenedor HTML5
├── package.json                        # Dependencias (React 19, Lucide, Tailwind, Vite)
├── tsconfig.json                       # Configuración estricta de TypeScript
├── vite.config.ts                      # Configuración de compilación Vite
└── tailwind.config.js                  # Paleta industrial y extensiones de diseño
```

---

## 3. Motor de Simulación Nodal

El motor implementado en [`src/core/simulation/solver.ts`](file:///c:/Users/User/Desktop/Proyectos/REA/Cadesimu/src/core/simulation/solver.ts) resuelve la lógica del esquema eléctrico en cada ciclo:

1. **Construcción de Nodos Equipotenciales:**
   * Utiliza una estructura *Union-Find (Disjoint-Set)* para mapear todas las conexiones físicas entre extremos de cables y pines de componentes.
2. **Propagación de Potenciales Eléctricos:**
   * Inyecta tensiones de fuentes de alimentación (`L1`, `L2`, `L3`, `N`, `PE`, `+24V`, `0V`).
   * Propaga el potencial a través de disyuntores cerrados, contactos principales y auxiliares activados, y pulsadores presionados.
3. **Accionamiento Reactivo de Bobinas:**
   * Si una bobina (bornes `A1` y `A2`) recibe simultáneamente Fase y Neutro (o +24V y 0V), se energiza.
   * La activación conmuta instantáneamente todos los contactos en el esquema que compartan su mismo `Tag` (ej: `-KM1` cierra sus contactos NA `13-14` y abre sus contactos NC `21-22`).
4. **Relés Temporizadores (TON):**
   * Computa el tiempo transcurrido `deltaTime` mientras la bobina permanezca alimentada.
   * Al alcanzar el tiempo fijado (ej. 5.0 s), activa la bandera temporizada que conmuta los contactos `67-68` y `55-56`.
5. **Animación y Dinámica de Motores Trifásicos:**
   * Evalúa la presencia y secuencia de fases en los bornes `U1`, `V1`, `W1`.
   * **Secuencia directa (L1-L2-L3):** Giro horario (1450 RPM).
   * **Secuencia inversa (L3-L2-L1):** Giro antihorario (1450 RPM).
   * Renderiza el rotor girando en tiempo real con inercia visual.
6. **Señalización Óptica:**
   * Las lámparas piloto (Verde, Rojo, Ámbar) se iluminan con efecto de brillo radiante (*glow*) cuando sus bornes `X1` y `X2` detectan diferencia de potencial.

---

## 4. Compatibilidad con Archivos Originales de CADe_SIMU (`.cad`)

El módulo [`src/core/format/cadParser.ts`](file:///c:/Users/User/Desktop/Proyectos/REA/Cadesimu/src/core/format/cadParser.ts) implementa la especificación obtenida mediante ingeniería inversa de los archivos nativos de CADe_SIMU:
* **Cabecera obligatoria:** `CADe_SIMU*...`
* **Campos delimitados por `*` y `#`:**
  `CADe_SIMU*<índice>*<código_tipo>#<parámetros_tag>#*<coordenadas_y_estados>#`
* Permite abrir archivos existentes creados con CADe_SIMU (versiones 1.0 a 4.2) y exportar nuevos diagramas compatibles para abrirlos en el software de escritorio.

---

## 5. Instrucciones de Ejecución

Para iniciar el servidor de desarrollo local:

```bash
cd "c:\Users\User\Desktop\Proyectos\REA\Cadesimu"
npm run dev
```

El servidor abrirá automáticamente la aplicación en `http://localhost:3000`.

Para compilar la versión de producción optimizada para despliegue web:

```bash
npm run build
```

Los artefactos listos para publicar en Vercel, Netlify o GitHub Pages se generan en la carpeta `dist/`.

---

## 6. Guía de Uso de la Interfaz

* **Simulación Interactiva:**
  * Pulsa el botón verde **Simular (Play)** en la barra superior.
  * Haz clic sobre los pulsadores de Marcha (`-S1`) o Parada (`-S0`) para operarlos.
  * Haz clic sobre los disyuntores guardamotores (`-Q1`, `-Q2`) para cerrarlos o abrirlos manualmente.
  * Observa cómo se energizan los conductores (resaltados en rojo y azul), se activan las bobinas y el motor trifásico comienza a girar.
* **Trazado de Cables:**
  * Selecciona un tipo de cable en la pestaña **Cables / Conexiones** (Fase, Neutro, PE o Control).
  * Haz clic en el borne o punto de origen y clic en el punto de destino para tender el conductor.
* **Edición de Componentes:**
  * Con la simulación detenida, haz doble clic sobre cualquier componente para modificar su Tag (ej. renombrar a `-KM2`) o ajustar el tiempo del temporizador en segundos.
  * Presiona la tecla `R` con un componente seleccionado para rotarlo 90°.
  * Presiona `Supr` o `Backspace` para eliminar el componente seleccionado.
