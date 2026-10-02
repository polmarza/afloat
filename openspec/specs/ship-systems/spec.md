# ship-systems Specification

## Purpose
Sistemas averiados del submarino (energía, soporte vital, bombas/lastre), su reparación y sus efectos.

## Requirements

### Requirement: Reparación por progreso
Cada sistema SHALL requerir `BALANCE.repairRequired[sistema]` puntos de reparación. Cada acción "Reparar" con éxito en la sala del sistema MUST sumar 1 punto; al alcanzar el requerido, el sistema queda reparado de forma permanente.

#### Scenario: Dos éxitos
- GIVEN el soporte vital con progreso 1/2
- WHEN el ingeniero repara con éxito
- THEN el soporte vital queda reparado y se muestra un aviso

#### Scenario: Fuera de la sala
- GIVEN un jugador en el comedor
- WHEN intenta reparar la energía
- THEN la acción se rechaza

### Requirement: Energía
Al reparar la energía, las salas adyacentes a salas ya descubiertas SHALL quedar descubiertas e iluminadas, la alarma visual MUST apagarse y las puertas hackeables SHALL abrirse sin tirada desde ese momento.

#### Scenario: Luz
- GIVEN la energía recién reparada
- WHEN se actualiza el mapa
- THEN las salas vecinas de las descubiertas se revelan y la luz roja pasa a blanca

### Requirement: Soporte vital
Con el soporte vital reparado, el consumo base de oxígeno SHALL ser 0.

#### Scenario: Respirar mejor
- GIVEN 3 tripulantes vivos (ninguno buzo) y soporte vital reparado
- WHEN se resuelve la Crisis
- THEN el oxígeno baja 6 en lugar de 10

### Requirement: Bombas y lastre
Con las bombas reparadas, cualquier tripulante SHALL poder usar "Achicar" (1 acción) para quitar el agua de su sala. Las bombas reparadas MUST ser requisito para emerger.

#### Scenario: Achicar
- GIVEN bombas reparadas y el buzo en una sala inundada
- WHEN usa "Achicar"
- THEN la sala deja de estar inundada

### Requirement: Estado visible
El HUD SHALL mostrar los tres sistemas con su progreso de reparación y si ya se ha descubierto su sala.

#### Scenario: Panel de sistemas
- GIVEN la sala de máquinas sin descubrir
- WHEN se mira el panel
- THEN la energía aparece como "Ubicación desconocida"
