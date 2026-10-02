# Propuesta: landing de AFLOAT

## Por qué

Hoy la web arranca directamente en "¿Cuántos vais a jugar?". Quien llega por primera vez (por el enlace del README o de un amigo) no ve el juego ni sabe de qué va antes de configurar una partida. Una portada visual que lo presente, explique cómo se juega y enseñe tripulación, objetos, salas y eventos hace el juego más atractivo y más fácil de entender.

## Fase del roadmap

Adelanta "Pantalla de título" (fase 3) a petición del usuario, antes de las salas online (fase 2). No toca el motor ni las reglas. Deja preparado el sitio para los botones "Crear sala / Unirse con código" de la fase 2, sin implementarlos.

## Qué cambia

- **Nueva portada** al abrir la web, antes del asistente de preparación:
  - **Cabecera a pantalla completa** con el logo, la frase del juego y el botón **Jugar**. De fondo, una **escena 3D en vivo** con el motor de render real: un submarino generado con una semilla fija, todas las salas a la vista, cámara girando despacio y luz de alarma. No usa vídeo.
  - **Cómo se juega**: objetivo, ronda en 3 fases, acciones y tiradas, oxígeno común, sistemas y las dos salidas, en pasos cortos.
  - **Tripulación**: los 5 personajes con retrato, rol, historia, habilidades y vidas.
  - **Objetos**: cada objeto con su imagen (el mismo modelo 3D del juego), qué hace y si se gasta.
  - **Salas**: los tipos de sala y para qué sirve cada una.
  - **Eventos**: las cartas de crisis y lo que provocan.
  - **Pie**: enlaces a GitHub y la licencia MIT.
- **Jugar** lleva al asistente de preparación actual, que no cambia. Desde el asistente se puede volver a la portada.
- Los textos salen de `packages/shared/src/content/` (personajes, objetos, eventos, guía de salas), no se duplican. Solo se añaden los textos que faltan: una línea por sala para las que hoy no tienen descripción y los textos propios de la portada.

## Qué no cambia

- Reglas, motor, IA, balance y puntuación.
- El asistente de preparación y la partida.
- Se sigue sin assets de terceros: imágenes y fondo se generan por código.

## Decisiones (aprobadas por el usuario el 2026-10-02)

1. **Salas sin descripción**: camarotes, sala de control, cantina, enfermería, almacén, sala de torpedos y pasillo. En `design.md` hay una propuesta de una línea para cada una, solo de ambientación o con lo que ya hacen hoy según las reglas. Aprobadas; corregida la del almacén, que insinuaba más objetos.
2. **Frase de la cabecera**: propuesta *"La alarma os despierta en un submarino averiado. Que al menos uno salga a flote."* (la que ya usa el juego).
3. La portada se muestra siempre, también en visitas posteriores; el botón Jugar está arriba del todo.

## Impacto

- `packages/client/src/game/ui/landing.ts` (nuevo), `App.ts`, `index.html` y estilos.
- `packages/shared/src/content/rooms.ts`: descripciones cortas de sala.
- Nueva spec `openspec/specs/landing/spec.md`; actualizar `docs/design-system.md`, `docs/architecture.md`, `docs/roadmap.md` y el README.
