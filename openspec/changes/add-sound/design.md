# Diseño: sonido

## Piezas

- **`audio/engine.ts`** — `Sound`: un `AudioContext` compartido, un nodo de volumen general (con silencio) y un compresor para que nada sature. Se crea al primer clic dentro del juego (requisito de los navegadores). Guarda volumen y silencio en `localStorage` (`afloat.sound`), con `try/catch`.
- **`audio/recipes.ts`** — una función por sonido que lo construye con osciladores, ruido filtrado y envolventes (sin muestras). Los parámetros (frecuencias, duraciones, volumen relativo) viven ahí mismo, porque son de sonido, no reglas del juego.
- **`audio/ambience.ts`** — capas que suenan sin parar mientras hay partida: el zumbido grave (ruido muy filtrado y un tono bajo que respira) y los pulsos de alarma cuando la energía no está reparada. Suben y bajan con fundidos para no hacer clics.
- **`App`** — en `play(e)` llama a `sound.event(e, contexto)` justo cuando anima cada suceso, así el sonido coincide con la animación (también online, porque todo pasa por la misma cola). Los pasos suenan en cada casilla que se camina. Al empezar o cerrar una partida arranca o para el ambiente.

## Qué suena con cada suceso

| Suceso del motor | Sonido |
|---|---|
| `PlayerMoved` y caminar por la sala | Pasos metálicos (uno por casilla; en sala inundada, chapoteo) |
| `DiceRolled` | Dado rodando y golpe final; con éxito, nota corta ascendente; con fallo, descendente |
| `DoorOpened` | Escotilla: golpe metálico y siseo neumático |
| `DoorFailed` | Golpe seco y traqueteo |
| `DoorClosed`, `DoorJammed` | Golpe metálico pesado |
| `RoomRevealed` | Barrido grave mientras la sala cae, y luces que se encienden |
| `RoomScanned` | Pitido de sónar |
| `ItemFound` | Rebuscar; con objeto, campanilla; sin objeto, nada más |
| `ItemGiven`, `ItemUsed`, `ItemCrafted` | Clic de objeto; fabricar, chispas cortas |
| `RepairProgressed` | Llave y golpes metálicos |
| `SystemRepaired` | Motor que arranca (zumbido que sube) |
| `PlayerHealed`, `PlayerRevived` | Tono suave ascendente |
| `PlayerDamaged` | Golpe sordo grave |
| `PlayerUnconscious`, `PlayerDied` | Tono grave descendente (más largo al morir) |
| `HullChanged` (baja) | Crujido del casco |
| `EventDrawn` | Aviso de carta (dos notas) y, según la carta, su peligro |
| `RoomFlooded` | Agua entrando a chorro |
| `RoomDrained` | Bombeo y agua bajando |
| `RoomOnFire`, `FireOut` | Fuego que prende / siseo de vapor al apagarse |
| `PhaseChanged` (crisis) | Nueva ronda: campana grave |
| `TurnChanged` | Si el turno pasa a un tripulante que controla este navegador: aviso corto "te toca" |
| `PlayerEscaped` | Cápsula: lanzamiento con burbujas; emerger: subida con agua cayendo |
| `GameWon`, `GameLost` | Acorde de victoria / de derrota |
| `ActionRejected` | Nada (ya hay aviso visual) |

Si un mismo sonido se dispara muchas veces seguidas (varios crujidos en una ronda), se limita para que no se amontone.

## Controles

- **Barra superior**: botón de altavoz junto a "Menú" (silenciar / activar). Tecla `M`.
- **Menú de la partida**: deslizador de volumen.
- Por defecto: activado, volumen al 70 %.
