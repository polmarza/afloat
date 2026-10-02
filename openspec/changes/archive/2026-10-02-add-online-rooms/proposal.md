# Propuesta: salas online con código

## Por qué

Hoy solo se puede jugar en un ordenador pasándose el turno. El objetivo del proyecto es jugar con amigos cada uno desde su casa, hablando por Discord. Para eso hacen falta salas privadas: alguien crea una partida, comparte un código o un enlace y cada jugador controla su tripulante desde su navegador.

## Fase del roadmap

Fase 2 (multijugador online), salvo el **ranking online**, que queda para un cambio posterior. Cubre:

- `packages/server`: Worker de Cloudflare con un Durable Object por sala que ejecuta el motor (y las máquinas).
- Salas por código o enlace, con anfitrión, reconexión y relevo del anfitrión.
- `RemoteSession` en el cliente; cada jugador controla solo su tripulante y ve el resto en directo.
- Despliegue del servidor.

## Qué cambia

- **Al pulsar Jugar** se elige entre:
  - **En este ordenador**: el asistente de siempre (pasarse el turno o jugar solo contra la máquina). No cambia.
  - **Crear sala online**: pide tu nombre y abre una sala nueva con un código de 5 caracteres (por ejemplo `K7QFM`) y un enlace para compartir (`…/?sala=K7QFM`).
  - **Unirse con código**: pide el código y tu nombre. Abrir el enlace hace lo mismo con el código ya puesto.
- **Sala de espera**: se ve el código (con botón de copiar enlace) y los asientos (de 2 a 5). Cada jugador elige su personaje (sin repetir) y puede cambiar su nombre. El anfitrión elige la dificultad, añade o quita tripulantes de la máquina y pulsa **Empezar** cuando hay al menos 2 tripulantes y todos los humanos han elegido personaje.
- **En la partida**: cada jugador solo puede actuar en su turno; en los demás turnos ve en directo lo que hacen los otros (mismas animaciones que ahora) y el HUD indica de quién es el turno. Las máquinas juegan en el servidor.
- **Desconexiones**: la partida avisa de quién se ha desconectado. Si le toca a alguien desconectado, la partida espera y el anfitrión puede pulsar **Que juegue la máquina** por esa persona. Al volver (mismo navegador, mismo enlace) recupera su tripulante.
- **Anfitrión**: si se va, el papel pasa a otro jugador conectado.
- **Entrar tarde**: con la partida empezada solo pueden entrar quienes ya tenían tripulante. A los demás se les dice que la partida está en curso.
- **Al terminar**: **Otra partida** devuelve a todos a la misma sala y el anfitrión puede empezar de nuevo.
- **Caducidad**: una sala sin nadie conectado durante 24 horas se borra.
- **Récords**: cada navegador guarda la partida en su tabla local, como ahora. El ranking online es el siguiente cambio.

## Qué no cambia

- Reglas, motor, IA y balance: el servidor ejecuta exactamente el mismo `applyAction`.
- El modo local.
- Sin cuentas: la identidad es el nombre y una clave secreta guardada en el navegador.

## Decisiones (tomadas con el usuario el 2026-10-02)

1. Desconexión en tu turno: la partida espera y el anfitrión puede pasar ese tripulante a la máquina hasta que vuelva.
2. Se mantienen los dos modos: local y online.
3. Con la partida en curso solo se puede reconectar; no hay espectadores.
4. Al terminar, la sala sigue abierta para otra partida.

## Decisiones técnicas (aceptadas por el usuario el 2026-10-02)

- **El servidor manda el estado completo** a todos los jugadores, incluido lo oculto (salas sin descubrir, objetos escondidos). Alguien con conocimientos podría mirarlo en las herramientas del navegador. Para un juego entre amigos sin ranking es aceptable y mucho más sencillo; si el ranking online lo necesita, se filtrará en ese cambio.
- Todo en el **mismo Worker `afloat`** que ya sirve la web: las rutas `/api/*` van al servidor y el resto a la página. Un solo despliegue (`npm run deploy`) y sin problemas de dominios cruzados.
- Coste: Durable Objects con almacenamiento SQLite en el plan gratuito de Workers. Si se superan los límites diarios gratuitos, las operaciones fallan en vez de cobrarse.

## Impacto

- Nuevo paquete `packages/server` (Worker + Durable Object + lógica de sala probada con Vitest).
- `packages/shared/src/net/`: tipos de los mensajes entre cliente y servidor.
- Cliente: `RemoteSession`, pantallas de modo, unirse y sala de espera, cambios en `App` para reproducir acciones que llegan del servidor y bloquear la entrada fuera de tu turno.
- Nueva spec `openspec/specs/online-rooms/spec.md`; ajustes en `docs/architecture.md`, `docs/prd.md`, `docs/roadmap.md`, `docs/data-model.md`, `docs/design-system.md` y el README.

## Cambios durante la implementación

- El número de tripulantes (2 a 5) pasa a `BALANCE.crew` (antes estaba escrito en el motor y en el asistente).
- Al reconectarse, el jugador recupera su tripulante en cuanto vuelve, no en su siguiente turno.
- Se corrige un fallo previo del modo local: tras abandonar una partida mientras la máquina esperaba para jugar, en la siguiente partida la máquina no jugaba.
