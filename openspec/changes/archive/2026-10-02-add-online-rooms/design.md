# Diseño: salas online con código

## Piezas

```
Navegador (cliente)                       Cloudflare (Worker "afloat")
┌──────────────────────────┐              ┌───────────────────────────────────┐
│ App ── Session            │              │ fetch:                            │
│   LocalSession (local)    │              │  POST /api/rooms   → código nuevo │
│   RemoteSession ──────────┼── WebSocket ─┼─ GET /api/rooms/:code/ws ──┐      │
│ pantallas: modo, unirse,  │              │  resto → página (assets)   │      │
│ sala de espera            │              │                            ▼      │
└──────────────────────────┘              │  Durable Object RoomObject (1/sala)│
                                          │   Room (lógica pura, con tests)   │
                                          │   applyAction + IA (shared)       │
                                          └───────────────────────────────────┘
```

- **`packages/shared/src/net/protocol.ts`**: tipos de los mensajes (`ClientMessage`, `ServerMessage`) y de la sala (`RoomView`). TypeScript puro, sin red.
- **`packages/server/src/room.ts`**: clase `Room` con toda la lógica de la sala (asientos, anfitrión, personajes, empezar, acciones, máquinas, desconexiones, otra partida). No conoce Cloudflare: recibe mensajes y devuelve qué enviar a quién. Se prueba con Vitest en `packages/server/tests/`.
- **`packages/server/src/index.ts`**: Worker (rutas) y `RoomObject` (Durable Object). Envoltorio fino: sockets con la API de hibernación, guarda la `Room` serializada en el almacenamiento del objeto y usa alarmas para el ritmo de las máquinas y la caducidad.
- **`packages/server/src/config.ts`**: tiempos del servidor (pausa de las máquinas, caducidad de la sala). No son reglas del juego, así que no van en `balance.ts`.

## Protocolo

Cliente → servidor:

| Mensaje | Quién | Efecto |
|---|---|---|
| `hello { key, name }` | todos | Entra o vuelve a la sala. `key` es la clave secreta del navegador. |
| `rename { name }` | todos | Cambia su nombre (solo en la sala de espera). |
| `pick { role }` | todos | Elige personaje (único). |
| `setDifficulty`, `addBot { role }`, `removeBot { seat }` | anfitrión | Prepara la partida. |
| `start` | anfitrión | Crea la partida con una semilla aleatoria del servidor. |
| `action { action }` | quien tiene el turno | Acción del motor. El servidor comprueba que `playerId` es el suyo. |
| `botTakeover { seat }` | anfitrión | La máquina juega por un jugador desconectado hasta que vuelva. |
| `rematch` | anfitrión | Vuelve a la sala de espera tras terminar. |

Servidor → cliente:

| Mensaje | Contenido |
|---|---|
| `welcome { you, room }` | Tu asiento y el estado de la sala. |
| `room { room }` | La sala cambió (asientos, anfitrión, conexiones). |
| `started { setup, state, startEvents, seq }` | Empieza la partida. |
| `result { seq, action, events, state }` | Una acción aceptada (de cualquiera, también de las máquinas). |
| `snapshot { setup, state, actions, seq }` | Estado completo al reconectar o si se pierde un `seq`. |
| `error { message }` | Texto para el jugador (código inexistente, sala llena, partida en curso…). |

Cada `result` lleva un número de secuencia; si el cliente ve un salto, pide `snapshot`.

## Cliente

- **`Session`** gana un listener: `onResult(fn)` para resultados que llegan sin haberlos pedido, y `controls(playerId)` para saber si este navegador maneja a ese tripulante. `LocalSession`: todos los humanos. `RemoteSession`: solo tu asiento (y ninguno mientras la máquina juega por ti).
- **`App`** reproduce los resultados en una cola (uno detrás de otro, con las animaciones de siempre), vengan de tu acción o de otro jugador. La entrada se bloquea si el tripulante activo no es tuyo; el HUD muestra "Turno de Ana".
- Las máquinas en partidas online las juega el servidor; `App` no llama a `botAction` en `RemoteSession`.
- **Clave del navegador**: `crypto.randomUUID()` guardada en `localStorage` (`afloat.playerKey`). Nombre recordado en `afloat.playerName`.
- **Reconexión**: si el socket se cierra, se reintenta con espera creciente; al volver llega un `snapshot` y la escena se reconstruye sin animar lo perdido.
- Textos en español centralizados en los módulos de UI, como el resto.

## Servidor

- **Código de sala**: 5 caracteres de `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (sin 0/O ni 1/I/L), generado con `crypto.getRandomValues`. El Durable Object se obtiene con `idFromName(código)`; al crear se comprueba que esté libre.
- **Ritmo de las máquinas**: tras cada acción, si el turno es de una máquina, el servidor espera un poco (más cuantos más sucesos tenga que animar el cliente) y juega su acción. Así los jugadores pueden seguirla, como en local.
- **Validación**: nombres de 1 a 20 caracteres; mensajes de más de 64 KB se descartan; cada acción se comprueba contra el asiento del que la envía y después la valida el motor.
- **Persistencia**: la `Room` se guarda tras cada cambio; si el objeto se duerme (hibernación) o se reinicia, la partida sigue donde estaba.
- **Caducidad**: con la sala vacía se programa una alarma a 24 h que borra su almacenamiento.

## Desarrollo local

- `npm run dev` arranca Vite y el Worker (`wrangler dev`) a la vez; Vite reenvía `/api` (también el WebSocket) al Worker.
- `npm test` incluye los tests de `packages/server`.
- `npm run deploy` compila el cliente y despliega el Worker con la página y el servidor juntos. La configuración de Wrangler pasa a `packages/server/wrangler.jsonc`.

## Riesgos

- **Estado completo en el cliente** (ver propuesta). Aceptado por ahora.
- **Límites del plan gratuito**: suficientes para un grupo de amigos; si se superan, las salas fallan hasta el día siguiente.
- **Cambios en `App`**: la cola de resultados toca el flujo de la partida local. Se mantiene el comportamiento actual y se prueba en el navegador una partida local completa además de la online.
