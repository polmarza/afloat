# escape Specification

## Purpose
Formas de salir a flote (cápsula de escape y emerger), condiciones de victoria y derrota, y pantalla final.

## Requirements

### Requirement: Cápsula de escape
La cápsula SHALL requerir `BALANCE.repairRequired.escape_pod` puntos de reparación en su sala. Una vez reparada, un tripulante en su sala SHALL poder "Lanzar" (1 acción): escapan los tripulantes conscientes de la sala, hasta el número de plazas, y la cápsula MUST quedar inutilizada.

#### Scenario: Plazas limitadas
- GIVEN 4 jugadores y 4 tripulantes en la sala de la cápsula reparada
- WHEN alguien intenta lanzarla
- THEN el juego pide elegir quién sube (solo 1) antes de lanzar

#### Scenario: Cápsula sin reparar
- GIVEN la cápsula con progreso 1/2
- WHEN alguien intenta lanzarla
- THEN la acción se rechaza

### Requirement: Plazas de la cápsula
El número de plazas SHALL ser `BALANCE.escapePod.seats` (1), independiente del número de jugadores.

#### Scenario: Cinco jugadores
- GIVEN una partida de 5 jugadores
- WHEN se genera
- THEN la cápsula tiene 1 plaza, igual que con 2

### Requirement: Emerger
Con energía y bombas/lastre reparados, un tripulante en el puente SHALL poder "Emerger" (1 acción): todos los tripulantes vivos no escapados, incluidos los inconscientes, se salvan.

#### Scenario: Emerger con todos
- GIVEN energía y bombas reparadas, el militar en el puente y el sanitario inconsciente en otra sala
- WHEN el militar emerge
- THEN ambos se salvan y la partida termina en victoria

#### Scenario: Faltan sistemas
- GIVEN solo la energía reparada
- WHEN alguien intenta emerger
- THEN se rechaza con "Las bombas de lastre no funcionan"

### Requirement: Victoria
La partida SHALL terminar en victoria en cuanto al menos un tripulante escape y no queden tripulantes conscientes a bordo que puedan seguir actuando, o cuando se emerja.

#### Scenario: Los que se quedan siguen jugando
- GIVEN que 2 tripulantes escapan en la cápsula y 1 sigue consciente a bordo
- WHEN termina el lanzamiento
- THEN la partida continúa para el que queda, que aún puede intentar emerger; la victoria ya está asegurada

### Requirement: Terminar tras salvarse alguien
Cuando al menos un tripulante haya escapado y la partida siga, el cliente SHALL ofrecer seguir jugando o terminar. Terminar MUST cerrar la partida como victoria con los que ya escaparon (acción `END_GAME`, rechazada si nadie ha escapado).

#### Scenario: Terminar tras la cápsula
- GIVEN que 1 tripulante escapó en la cápsula y 2 siguen a bordo
- WHEN la tripulación elige "Terminar la partida"
- THEN la partida termina en victoria y los 2 aparecen como "se quedan a bordo"

### Requirement: Derrota
La partida SHALL terminar en derrota si el oxígeno llega a 0 sin que nadie haya escapado, o si no queda ningún tripulante consciente a bordo y nadie ha escapado.

#### Scenario: Todos caídos
- GIVEN que el último tripulante consciente queda inconsciente y nadie ha escapado
- WHEN se resuelven las Consecuencias
- THEN la partida termina en derrota

### Requirement: Pantalla final
Al terminar, el sistema SHALL mostrar el resultado, quién se salvó y cómo, quién murió, rondas jugadas, oxígeno restante y la semilla, con opción de jugar de nuevo.

#### Scenario: Revancha
- GIVEN la pantalla final
- WHEN se pulsa "Nueva partida"
- THEN se vuelve a la preparación con los mismos jugadores
