# doors Specification

## Purpose
Tipos de puerta, cómo se abren y cómo abrir una puerta descubre la sala contigua.

## Requirements

### Requirement: Abrir puerta cuesta una acción
Intentar abrir una puerta de la sala actual SHALL costar 1 acción, tenga éxito o no.

#### Scenario: Intento fallido
- GIVEN un jugador con 3 acciones frente a una puerta hackeable
- WHEN falla la tirada
- THEN la puerta sigue cerrada y le quedan 2 acciones

### Requirement: Descubrir sala
Al abrirse una puerta, la sala del otro lado SHALL quedar descubierta (tipo, contenido, estado de agua o fuego y sus puertas visibles).

#### Scenario: Revelar
- GIVEN una sala oscura tras una puerta normal
- WHEN se abre la puerta
- THEN la sala aparece con su tipo, sus puertas y si está inundada

### Requirement: Puerta normal
Una puerta normal SHALL abrirse sin tirada.

#### Scenario: Normal
- GIVEN una puerta normal cerrada
- WHEN un jugador la abre
- THEN queda abierta

### Requirement: Puerta con llave
Una puerta con llave SHALL abrirse sin tirada si el jugador tiene una tarjeta de acceso, que no se consume; sin tarjeta la acción MUST rechazarse sin consumir acción.

#### Scenario: Sin tarjeta
- GIVEN un jugador sin tarjeta frente a una puerta con llave
- WHEN intenta abrirla
- THEN se rechaza con "Necesitas una tarjeta de acceso" y no pierde la acción

### Requirement: Puerta hackeable
Una puerta hackeable SHALL requerir una tirada contra `BALANCE.difficulty.hack` (informático +2, portátil +1). Con el sistema de energía reparado MUST abrirse sin tirada.

#### Scenario: Energía restaurada
- GIVEN la energía reparada y una puerta hackeable cerrada
- WHEN cualquier jugador la abre
- THEN se abre sin tirada

### Requirement: Puerta bloqueada por un lado
Una puerta bloqueada por un lado SHALL poder abrirse solo desde la sala indicada en `openableFrom`; desde el otro lado MUST mostrarse como bloqueada y rechazar la acción sin consumirla.

#### Scenario: Lado bloqueado
- GIVEN una puerta bloqueada que solo se abre desde el almacén
- WHEN un jugador en el comedor intenta abrirla
- THEN se rechaza con "Está bloqueada desde el otro lado"

### Requirement: Puerta atascada
Una puerta atascada por un objeto pesado SHALL requerir una tirada contra `BALANCE.difficulty.force` (militar +2, palanca +2).

#### Scenario: Forzar
- GIVEN un militar con palanca frente a una puerta atascada
- WHEN saca un 2
- THEN el total es 6 y la puerta se abre

### Requirement: Colores por tipo
El cliente SHALL representar cada tipo de puerta con el color definido en `docs/design-system.md`.

#### Scenario: Leer el tipo
- GIVEN una sala con una puerta hackeable y otra con llave
- WHEN se muestra la sala
- THEN la primera se ve en cian y la segunda en amarillo
