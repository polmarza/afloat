# events Specification

## Purpose
Mazo de eventos del submarino que se resuelve en cada fase de Crisis.

## Requirements

### Requirement: Un evento por ronda
En cada fase de Crisis el sistema SHALL robar una carta del mazo de eventos y resolverla inmediatamente. Si el mazo se agota, SHALL barajar los descartes para formar uno nuevo.

#### Scenario: Rebarajar
- GIVEN el mazo de eventos vacío y 14 cartas en descartes
- WHEN empieza la Crisis
- THEN se forma un mazo nuevo con esas cartas y se roba una

### Requirement: Objetivos al azar entre salas descubiertas
Los eventos que afectan a una sala o puerta SHALL elegir su objetivo al azar (con el RNG) entre las salas o puertas descubiertas que cumplan la condición. Si no hay ninguna válida, el evento MUST no tener efecto.

#### Scenario: Cortocircuito sin objetivo
- GIVEN que no hay puertas hackeables abiertas
- WHEN sale "Cortocircuito"
- THEN no pasa nada y el log lo indica

### Requirement: Efectos de los eventos
Cada evento SHALL aplicar su efecto:
- **Fuga de agua**: una sala descubierta, no inundada y de la **cubierta inferior** se inunda. Las salas de la cubierta principal nunca se inundan.
- **Cortocircuito**: una puerta hackeable abierta se cierra.
- **Incendio**: una sala descubierta sin agua arde durante `BALANCE.fire.durationRounds` rondas.
- **Derrumbe**: una puerta abierta pasa a atascada; los tripulantes de una de sus salas tiran 1d6 y con `collapse.damageOnRollAtMost` o menos pierden 1 vida.
- **Fallo del depurador**: el oxígeno baja `BALANCE.oxygen.scrubberFailureLoss`.
- **Calma**: sin efecto.

#### Scenario: Fuga
- GIVEN el almacén descubierto, seco y en la cubierta inferior
- WHEN la fuga lo elige
- THEN el almacén queda inundado y se anima el agua entrando

#### Scenario: Fuga sin salas posibles
- GIVEN que ninguna sala descubierta de la cubierta inferior está seca
- WHEN sale "Fuga de agua"
- THEN no pasa nada y el log lo indica

#### Scenario: Incendio bloquea el paso
- GIVEN un incendio en el almacén
- WHEN un jugador intenta entrar en el almacén
- THEN la acción se rechaza mientras dure el fuego

### Requirement: Presentación
El cliente SHALL mostrar cada evento como un aviso de megafonía con icono y texto (por ejemplo, "ALERTA: fuga de agua en el comedor") y centrar la cámara en la sala afectada.

#### Scenario: Aviso
- GIVEN que sale "Fallo del depurador"
- WHEN se resuelve
- THEN aparece el aviso y la barra de oxígeno baja con animación
