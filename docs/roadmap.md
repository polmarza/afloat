# Roadmap — AFLOAT

Esfuerzo relativo: **S** (pequeño) · **M** (medio) · **L** (grande) · **XL** (muy grande).

## Fase 0 — Preparación (S)

Objetivo: tener la base lista y el aspecto visual decidido antes de construir reglas.

- [x] ~~Packs de assets 2D (Starship Interiors)~~: descartado. Todo el arte será propio, generado por código.
- [x] Registrar licencias en `docs/credits.md`.
- [x] Crear el proyecto: Vite + TypeScript + three.js + Vitest.
- [x] Prototipo visual 3D: 3 salas, 2 tripulantes, 5 tipos de escotilla, linternas, alarma, agua, montaje de salas al descubrirlas, giro de cámara.
- [x] Elegir estilo visual: **industrial oscuro**.
- [x] Pulido 1: salas modulares 6×5, cubierta inferior con escaleras para salas inundadas, colisiones, caminar entre salas por puertas abiertas, nombres al pasar el ratón.

## Fase 1 — MVP local (XL)

Objetivo: una partida completa de principio a fin en un solo PC, pasándose el turno.

### 1a. Motor de reglas (L)
- [x] Tipos del estado, acciones y sucesos.
- [x] RNG con semilla.
- [x] Generador de mapas modular + validador de resolubilidad (test con 2000 semillas).
- [x] Fases de ronda y turnos.
- [x] Acciones: moverse, abrir puertas (5 tipos), buscar, reparar, curar, reanimar, dar, usar, escanear, achicar, pasar.
- [x] Oxígeno, salud, inconsciencia y muerte.
- [x] Sistemas del submarino y sus efectos.
- [x] Mazo de eventos (la fuga solo afecta a la cubierta inferior).
- [x] Cápsula de escape y emerger; victoria y derrota.
- [x] Configuración de equilibrio centralizada.
- [x] 45 tests, incluidas 100 partidas completas jugadas al azar.

### 1b. Cliente (L)
- [x] Pantallas: preparación (jugadores, roles, semilla), partida, final.
- [x] Submarino 3D generado a partir del estado, con salas modulares y mobiliario por tipo.
- [x] Salas ocultas hasta abrirlas, linternas, alarma, agua (cubierta inferior) y fuego.
- [x] Acciones con coste y probabilidad de éxito visibles; menú al hacer clic en una puerta.
- [x] HUD: oxígeno, ronda, jugador activo, vidas, acciones, inventario, sistemas.
- [x] Animaciones de sucesos (dado, puertas, revelado, daño, eventos, huida).
- [x] Log de la partida.

### 1c. Jugar contra la máquina (M)
- [x] Plazas Humano/Máquina en la pantalla inicial.
- [x] IA clásica por prioridades (`packages/shared/src/ai/bot.ts`), sin información oculta, validada por el motor.
- [x] Simulación de equilibrio con partidas de solo máquina (tests).

### 1c+. Salas especiales y puntuación (M)
- [x] Invernadero (+oxígeno), laboratorio (fabricar) y cantina doble 12×5 (comer y descansar).
- [x] Dificultad Fácil/Normal/Difícil (tamaño del submarino) con multiplicador de puntos.
- [x] Puntuación al terminar, con desglose, ganada o perdida.
- [x] Tabla de récords local con acciones reproducibles (`replay`), lista para subirla en la fase 2.

### 1d. Pulido y pruebas (M)
- [ ] Partidas de prueba con amigos (hot-seat) y ajuste de equilibrio.
- [ ] Sonido básico: alarma, puertas, dado, agua.
- [ ] Ayuda contextual de reglas.

**Hito**: el grupo juega una partida completa y quiere repetir.

## Fase 2 — Multijugador online (L)

Objetivo: cada amigo juega desde su casa mientras hablan por Discord.

- [x] Reorganización en paquetes (`shared` / `client`) y capa `Session` en el cliente, lista para añadir la sesión remota.
- [x] Decisiones: Cloudflare Durable Objects (una sala por partida), anfitrión que crea la partida y comparte enlace, nombre + código de sala (Clerk después), récords en D1.
- [x] `packages/server`: Cloudflare Worker + Durable Object por sala que ejecuta el motor (incluidas las máquinas, que juegan en el servidor).
- [x] Salas por enlace o código con anfitrión (crea la partida, comparte el enlace, elige dificultad y máquinas, empieza); reconexión si alguien se cae; si el anfitrión se va, pasa a otro jugador.
- [x] `RemoteSession` en el cliente: WebSocket, botones bloqueados fuera de tu turno, identificador secreto por navegador + nombre editable.
- [x] Ranking online en D1 (portada, sala de espera y pantalla final), calculado por el servidor al terminar la partida (no se acepta ninguna puntuación enviada por el navegador). Reglas decididas:
  - La puntuación es **compartida**: cada jugador humano recibe la puntuación de la partida, sin bonus ni penalización personal (quien se sacrifica no sale perjudicado).
  - Puntúan solo las partidas con **todos los asientos humanos** y terminadas (no las abandonadas). Si la máquina juega por alguien desconectado, puntúa igual.
  - Cada jugador es su navegador (clave secreta), con el último nombre usado; un único ranking global.
  - Dos clasificaciones por jugador: **total acumulado** y **mejor partida**.
  - La cápsula salva siempre a 1 persona (ya implementado), para que la puntuación no dependa del número de jugadores.
- [x] Cada jugador solo controla su personaje; los demás ven la acción en directo. Si alguien se desconecta en su turno, el anfitrión puede dejar que juegue la máquina hasta que vuelva.
- [x] Despliegue del cliente y del servidor: un solo Worker en Cloudflare (`npm run deploy`).

**Hito**: partida completa con 3+ amigos, cada uno en su casa.

## Fase 3 — Ampliación (M, iterativa)

- [ ] Escotilla de emergencia con traje de buzo (tercera salida).
- [ ] Modo fantasma para jugadores muertos.
- [ ] Más roles, objetos, eventos y tipos de sala.
- [x] Niveles de dificultad Fácil/Normal/Difícil (hecho en la fase 1).
- [ ] Dificultad personalizada: elegir a mano el oxígeno inicial, el casco y otros valores de `balance.ts`. La pantalla mostraría la probabilidad estimada de éxito (simulando partidas con la máquina) y el multiplicador de puntos resultante, que tiene que subir o bajar según lo duro que sea el ajuste. Ojo con los récords: una configuración personalizada solo debería entrar en la tabla común si el multiplicador se calcula con una fórmula fija, y el servidor tendría que validarla al repetir la partida.
- [ ] Arte final pulido y música.
- [ ] Jugar dentro de Discord (Activities).
- [x] Nombre definitivo: **AFLOAT**.
- [x] Pantalla de título: portada con los camarotes en 3D y sliders animados de cómo se juega y de las salas, más tripulación, tripulación, objetos, salas y eventos (adelantada a la fase 2).
