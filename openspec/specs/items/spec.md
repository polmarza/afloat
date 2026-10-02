# items Specification

## Purpose
Mazo de objetos, inventario y efectos de cada objeto.

## Requirements

### Requirement: Mazo de objetos
El sistema SHALL crear al inicio un mazo con la composición definida en `packages/shared/src/content/items.ts`, barajarlo y repartirlo entre las salas al generar el mapa (ver `map-generation`). Los objetos no repartidos se descartan.

#### Scenario: Reparto
- GIVEN el mazo inicial de 19 cartas y 10 salas
- WHEN se genera el mapa
- THEN cada carta está como mucho en una sala y ninguna sala supera el máximo de `itemsPerRoom`

### Requirement: Objetos permanentes
Llave inglesa, palanca, portátil, tarjeta de acceso y traje de buzo SHALL aplicar su efecto mientras estén en el inventario y MUST NOT consumirse al usarse. Las bonificaciones del mismo objeto no se acumulan si se tienen dos copias.

#### Scenario: Dos portátiles
- GIVEN un jugador con dos portátiles
- WHEN hackea
- THEN recibe +1, no +2

### Requirement: Objetos consumibles
Vendas, botiquín, bombona de oxígeno y cigarrillos SHALL desaparecer del inventario al usarse.

#### Scenario: Bombona
- GIVEN oxígeno 40 y un jugador con una bombona
- WHEN la usa
- THEN el oxígeno pasa a 55 y la bombona desaparece

### Requirement: Cigarrillos
Usar cigarrillos SHALL costar 1 acción, restar `BALANCE.oxygen.cigarettesCost` al oxígeno común y dar +1 a la siguiente tirada del jugador.

#### Scenario: Nervios de acero
- GIVEN un informático que fuma y después hackea
- WHEN saca un 2
- THEN el total es 2 + 2 + 1 = 5 y la bonificación pendiente se borra

### Requirement: Inventario visible
El HUD SHALL mostrar el inventario del jugador activo y, al pasar el ratón sobre otro tripulante, el suyo.

#### Scenario: Consultar compañero
- GIVEN el turno del sanitario
- WHEN pasa el ratón sobre el militar
- THEN ve que el militar lleva una palanca
