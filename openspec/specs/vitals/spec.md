# vitals Specification

## Purpose
Oxígeno común, salud individual, inconsciencia y muerte.

## Requirements

### Requirement: Oxígeno común
El sistema SHALL mantener un único contador de oxígeno para toda la tripulación, con valor inicial `BALANCE.oxygen.initial`.

#### Scenario: Inicio
- GIVEN una partida nueva con la configuración por defecto
- WHEN empieza la ronda 1
- THEN el oxígeno es 120 antes de la Crisis

### Requirement: Consumo según tripulantes vivos
En cada fase de Crisis el oxígeno SHALL reducirse en `baseConsumption + perCrewMember × tripulantes vivos no escapados`, donde el buzo cuenta con `diverMultiplier` y los inconscientes cuentan como vivos. Con soporte vital reparado, `baseConsumption` MUST ser 0.

#### Scenario: Cuatro vivos con buzo
- GIVEN 4 tripulantes vivos, uno de ellos buzo, y soporte vital sin reparar
- WHEN se resuelve la Crisis
- THEN el oxígeno baja 4 + 2 × 3 + 1 = 11

#### Scenario: Menos bocas
- GIVEN que un tripulante que no es buzo ha muerto
- WHEN se resuelve la siguiente Crisis
- THEN el consumo es 2 puntos menor que en la ronda anterior

### Requirement: Derrota por oxígeno
Si el oxígeno llega a 0 o menos, la partida MUST terminar: en derrota si nadie ha escapado, o en victoria si al menos un tripulante ya había escapado.

#### Scenario: Asfixia
- GIVEN oxígeno 8 y consumo 11
- WHEN se resuelve la Crisis
- THEN la partida termina en derrota

### Requirement: Integridad del casco
El sistema SHALL mantener una integridad del casco común (`BALANCE.hull.initial`). En cada fase de Crisis MUST perder `BALANCE.hull.perRound`, y cada evento SHALL restar su daño de `BALANCE.hull.eventDamage`. Si llega a 0, la partida MUST terminar: en derrota si nadie ha escapado, o en victoria si alguien ya escapó.

#### Scenario: El soporte vital no salva el casco
- GIVEN el soporte vital reparado
- WHEN pasa una ronda
- THEN el casco pierde igualmente su daño por presión

#### Scenario: Casco aún sano
- GIVEN un casco con integridad por encima de `BALANCE.hull.shoreUpBelow` (15)
- WHEN un tripulante intenta apuntalarlo
- THEN la acción no se ofrece y, si se intenta, se rechaza sin gastar acción

#### Scenario: Apuntalar
- GIVEN un casco con integridad 10
- WHEN un tripulante apuntala con éxito (tirada de reparar)
- THEN la integridad sube a 12, sin superar el máximo

### Requirement: Salud individual
Cada tripulante SHALL tener vidas según su rol (`BALANCE.health`), perderlas por daño y no superar su máximo al curarse.

#### Scenario: Daño
- GIVEN un ingeniero con 3 vidas
- WHEN recibe 1 de daño por agua
- THEN tiene 2 vidas

### Requirement: Inconsciencia
Un tripulante que llegue a 0 vidas SHALL quedar inconsciente: no recibe turno, sigue consumiendo oxígeno y puede ser reanimado.

#### Scenario: Caer
- GIVEN un informático con 1 vida
- WHEN recibe 1 de daño
- THEN queda inconsciente y se muestra en el HUD

### Requirement: Muerte
Un tripulante inconsciente durante más de `BALANCE.health.roundsUnconsciousBeforeDeath` rondas MUST morir en la fase de Consecuencias. El jugador pasa a espectador: ve la partida pero no actúa.

#### Scenario: Nadie llega a tiempo
- GIVEN un tripulante inconsciente desde hace 2 rondas
- WHEN termina la fase de Consecuencias sin reanimarlo
- THEN muere y su jugador pasa a espectador

### Requirement: Daño ambiental
En la fase de Consecuencias, cada tripulante consciente en una sala inundada SHALL perder `BALANCE.flood.damage` vidas (salvo buzo o traje de buzo), y en una sala en llamas `BALANCE.fire.damage`.

#### Scenario: Buzo en agua
- GIVEN el buzo y el militar en una sala inundada
- WHEN se resuelven las Consecuencias
- THEN el militar pierde 1 vida y el buzo ninguna
