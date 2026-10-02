# Propuesta: sonido

## Por qué

El juego es mudo. El sonido es lo que más ambiente añade a un submarino a oscuras: la alarma, el agua entrando, el casco crujiendo, el dado. Además ayuda a seguir la partida online cuando juegan otros.

## Fase del roadmap

Fase 1d: "Sonido básico: alarma, puertas, dado, agua", ampliado con ambiente, peligros y avisos de partida a petición del usuario. La música sigue en la fase 3.

## Qué cambia

- **Sonidos sintetizados en el navegador** (Web Audio), sin archivos de audio: igual que el arte, todo se genera por código. No hay assets de terceros.
- **Qué suena** (cada suceso del motor tiene su sonido, ver `design.md`):
  - **Acciones**: pasos, puerta que se abre, puerta que no cede, hackeo, dado, buscar (con o sin objeto), dar y usar objetos, fabricar, reparar y sistema reparado, curar y reanimar, escanear, achicar, cápsula lanzada, emerger.
  - **Peligros**: agua entrando, fuego, derrumbe, daño a un tripulante, inconsciente, muerte, casco crujiendo.
  - **Ambiente y alarma**: zumbido grave de fondo durante toda la partida; mientras la energía no esté reparada, **pulsos suaves de alarma** cada pocos segundos, que se apagan al repararla.
  - **Avisos de partida**: empieza tu turno, nueva ronda, carta de evento, victoria y derrota.
- **Control**: activado por defecto. Un **botón de altavoz** en la barra superior silencia o activa el sonido y el **volumen** está en el menú de la partida. El navegador recuerda la elección.
- **Portada**: en silencio. El sonido empieza al entrar en la partida (los navegadores no dejan sonar nada antes del primer clic).
- **Online**: cada navegador suena con lo que anima, también las acciones de los demás.

## Decisiones (tomadas con el usuario el 2026-10-02)

1. Los cuatro grupos de sonidos: acciones, peligros, ambiente y alarma, avisos de partida.
2. Alarma en pulsos suaves, no sirena continua.
3. Activado por defecto, con botón para silenciar y volumen en el menú.
4. La portada no suena.

## Qué no cambia

Reglas, motor y servidor. El sonido es solo del cliente y nunca decide nada.

## Impacto

- Nuevo `packages/client/src/game/audio/` (motor de sonido y recetas de cada sonido).
- `App`: reproducir el sonido de cada suceso al animarlo; ambiente y alarma según el estado.
- HUD: botón de altavoz; menú: volumen.
- Nueva spec `openspec/specs/sound/spec.md`; actualizar `docs/design-system.md`, `docs/architecture.md`, `docs/roadmap.md`, `docs/credits.md` (sin assets: todo sintetizado) y el README.
