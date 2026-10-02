# round-flow Specification

## Purpose
Estructura de la ronda (Crisis → Tripulación → Consecuencias), orden de turnos y límite de acciones por jugador.

## Requirements

### Requirement: Fases de la ronda
Cada ronda SHALL ejecutar en orden las fases Crisis, Tripulación y Consecuencias, y después comenzar la siguiente ronda salvo que la partida haya terminado.

#### Scenario: Ciclo completo
- GIVEN la ronda 1 en fase Tripulación
- WHEN el último jugador pasa su turno
- THEN se resuelve la fase Consecuencias y comienza la ronda 2 en fase Crisis

### Requirement: Fase de Crisis automática
La fase de Crisis SHALL consumir oxígeno y resolver una carta de evento sin intervención de los jugadores, mostrando el resultado antes de pasar a la fase Tripulación.

#### Scenario: Inicio de ronda
- GIVEN el inicio de la ronda 3
- WHEN se resuelve la Crisis
- THEN el oxígeno baja según la fórmula de consumo, se muestra la carta de evento y el turno pasa al primer jugador activo

### Requirement: Invernadero
Al empezar cada ronda, después del consumo de oxígeno, si el invernadero ya se ha descubierto y la energía está reparada, el oxígeno común SHALL subir `BALANCE.rooms.greenhouseOxygen` (3). No hace falta que nadie esté dentro.

#### Scenario: Plantas con luz
- GIVEN un invernadero descubierto y la energía reparada
- WHEN empieza una ronda
- THEN el resumen de la ronda muestra el oxígeno gastado y +3 del invernadero

### Requirement: Acciones por turno
Cada jugador consciente SHALL disponer de `BALANCE.actionsPerTurn` acciones por turno. El turno MUST terminar al agotar las acciones o al pasar.

#### Scenario: Agotar acciones
- GIVEN un jugador con 1 acción restante
- WHEN se mueve a otra sala
- THEN su turno termina y el turno pasa al siguiente jugador

#### Scenario: Pasar
- GIVEN un jugador con 3 acciones restantes
- WHEN pulsa "Pasar turno"
- THEN pierde las acciones restantes y el turno pasa al siguiente jugador

### Requirement: Turnos omitidos
Los jugadores inconscientes, muertos o que ya han escapado MUST NOT recibir turno.

#### Scenario: Inconsciente
- GIVEN que el jugador 2 está inconsciente
- WHEN termina el turno del jugador 1
- THEN el turno pasa directamente al jugador 3

### Requirement: Validación de acciones
El motor SHALL rechazar cualquier acción que no sea del jugador activo, que supere las acciones restantes o que no cumpla sus requisitos, sin modificar el estado y emitiendo `ActionRejected` con el motivo.

#### Scenario: Acción fuera de turno
- GIVEN que es el turno del jugador 1
- WHEN llega una acción del jugador 2
- THEN el estado no cambia y se emite `ActionRejected` con motivo "no es tu turno"

### Requirement: Registro de la partida
Cada acción, tirada y evento SHALL añadirse al log de la partida con un texto legible en español.

#### Scenario: Tirada registrada
- GIVEN un hackeo con resultado 4 + 2 + 1
- WHEN se resuelve
- THEN el log muestra "Hackeo: 4 + 2 (informático) + 1 (portátil) = 7 ≥ 5 → éxito"
