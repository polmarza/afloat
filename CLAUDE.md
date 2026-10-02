# CLAUDE.md — AFLOAT

## Proyecto

Juego cooperativo por turnos para navegador (PC), de 2 a 5 jugadores, en un submarino averiado que se genera aleatoriamente y está a oscuras. Cada jugador controla un tripulante con un rol; el equipo gana si al menos uno sale a flote antes de que se acabe el oxígeno común. Proyecto personal, sin monetización. MVP 100% local (todos en el mismo PC, pasándose el turno); el multijugador online llega en la fase 2.

El usuario no programa: Claude escribe todo el código y consulta al usuario las decisiones de diseño y de juego. Explica los cambios en lenguaje sencillo.

## Antes de empezar cualquier tarea

1. Lee `docs/prd.md` (qué es el juego y sus reglas).
2. Lee `docs/architecture.md` (cómo está construido).
3. Consulta la spec del dominio afectado en `openspec/specs/<dominio>/spec.md`.
4. Mira en qué fase estamos en `docs/roadmap.md`.
5. Para lo visual, `docs/design-system.md`. Para tipos y valores, `docs/data-model.md`.

## Stack

- TypeScript (strict), three.js, Vite, Vitest, npm.
- Monorepo npm (workspaces): `packages/shared` (motor, contenido, balance, IA) y `packages/client` (three.js + HUD). El servidor (fase 2) irá en `packages/server`.
- `npm run dev` → servidor local en `http://localhost:5173`.
- `npm test` → tests del motor y de la IA (`packages/shared`).
- `npm run typecheck` / `npm run build` → comprobar tipos de todos los paquetes / compilar el cliente.

## Estructura

- `packages/shared/src/engine/` — motor de reglas puro. Punto de entrada: `applyAction(state, action) → { state, events }`.
- `packages/shared/src/ai/` — IA de los tripulantes de la máquina: elige acciones como un jugador más, sin mirar información oculta.
- `packages/client/src/game/` — cliente three.js (escena, salas, objetos, tripulantes, estilos, HUD).
- `packages/shared/src/config/balance.ts` — todos los números de equilibrio.
- `packages/shared/src/content/` — datos: roles, objetos, eventos, salas.
- `packages/client/src/game/ui/` — HUD en HTML (preparación, paneles, acciones, diálogos).
- `packages/shared/tests/` — tests de reglas, del generador, de la puntuación y de la IA.
- `packages/client/src/game/session.ts` — `Session`: el cliente no llama al motor directamente, envía acciones a una sesión (local hoy, remota en la fase 2).

## Convenciones de código

- Identificadores, nombres de archivo y comentarios de código en **inglés**. Textos visibles para el jugador en **español**, centralizados (no dispersos por las escenas).
- Estado del juego **serializable a JSON**: objetos planos, relaciones por id, sin clases ni funciones dentro del estado.
- `applyAction` es la **única** forma de cambiar el estado. Es pura: no muta la entrada y devuelve un estado nuevo.
- Toda aleatoriedad del motor pasa por el RNG con semilla guardado en el estado.
- El cliente three.js lee el estado y reproduce `GameEvent`s; nunca decide reglas.
- Funciones pequeñas por regla en `packages/shared/src/engine/rules/`. Tipos discriminados (`type: 'OPEN_DOOR'`) para acciones y sucesos.
- Cada regla nueva o modificada lleva tests en `packages/shared/tests/engine/`.
- Arte 100% generado por código (geometría low-poly + texturas en canvas). Nada de modelos ni imágenes de terceros.
- Estilo visual: industrial oscuro. Colores y luces viven en `packages/client/src/game/styles.ts`; los objetos toman sus materiales de `Materials`, nunca colores sueltos.
- Todas las salas son módulos de 6×5 (`ROOM_W`, `ROOM_D` en `packages/shared/src/config/balance.ts`), salvo la cantina, que ocupa dos (`Room.span = 2`); las de la cubierta inferior están un nivel más abajo, con escaleras junto a las puertas, y son las únicas que pueden inundarse.
- El cliente decide la posición de cada tripulante dentro de su sala (casilla); el motor solo sabe en qué sala está.

## Qué NO hacer

- No importar three.js, DOM ni `window` dentro de `packages/shared` (el paquete no tiene tipos de navegador: no compilaría).
- No usar `Math.random()` en el motor.
- No escribir números de reglas (dificultades, oxígeno, vidas…) fuera de `packages/shared/src/config/balance.ts`.
- No meter lógica de reglas en el render, los objetos 3D o el HUD.
- No añadir red, servidor, cuentas ni base de datos antes de la fase 2.
- No añadir assets de terceros sin preguntar (decisión del proyecto: todo el arte es propio). Si se añade alguno, registrarlo en `docs/credits.md`.
- No inventar reglas nuevas: si la spec no cubre un caso, pregunta al usuario y actualiza la spec.
- No añadir funcionalidades de fases posteriores del roadmap sin pedirlo.

## Flujo de cambios

Para funcionalidades nuevas usa OpenSpec: `/opsx:propose` → revisión con el usuario → `/opsx:apply` → `/opsx:archive`. Mantén `docs/` y `openspec/specs/` al día con lo que se implemente.
