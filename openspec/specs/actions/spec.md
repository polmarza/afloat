# actions Specification

## Purpose
Acciones que un tripulante puede realizar en su turno (excepto abrir puertas, en `doors`) y la mecánica común de tiradas.

## Requirements

### Requirement: Tiradas de dado
Las acciones con tirada SHALL resolverse con 1d6 + bonificación de rol + bonificación de objetos + bonificación pendiente, y tendrán éxito si el total es mayor o igual que la dificultad. Un 1 natural MUST fallar siempre.

#### Scenario: Éxito con bonificaciones
- GIVEN un ingeniero con llave inglesa reparando (dificultad 4)
- WHEN saca un 2
- THEN el total es 2 + 2 + 1 = 5 y la reparación avanza

#### Scenario: Pifia
- GIVEN un informático con portátil hackeando
- WHEN saca un 1
- THEN la acción falla aunque el total supere la dificultad

### Requirement: Probabilidad visible
Antes de confirmar una acción con tirada, el cliente SHALL mostrar la probabilidad de éxito calculada con las bonificaciones actuales.

#### Scenario: Previsualización
- GIVEN un militar sin objetos frente a una puerta atascada (dificultad 5)
- WHEN selecciona "Forzar"
- THEN se muestra "Éxito: 67%" (necesita 3+ en 1d6: 3, 4, 5 o 6)

### Requirement: Moverse
Un tripulante SHALL poder moverse a una sala adyacente conectada por una puerta abierta y sin incendio activo, por 1 acción; entrar en una sala inundada MUST costar `BALANCE.movement.floodedCost` acciones (buzo: `diverFloodedCost`).

#### Scenario: Sala inundada
- GIVEN un sanitario con 3 acciones junto a una sala inundada con la puerta abierta
- WHEN se mueve a ella
- THEN le queda 1 acción

#### Scenario: Acciones insuficientes
- GIVEN un ingeniero con 1 acción junto a una sala inundada
- WHEN intenta entrar
- THEN la acción se rechaza

### Requirement: Obstáculos
Un tripulante MUST NOT atravesar muebles, cajas, otros tripulantes, paredes ni escotillas abiertas: el movimiento solo ocurre entre casillas libres conectadas, y entre salas solo a través de puertas abiertas.

#### Scenario: Caja empujada
- GIVEN una caja que se ha apartado de una puerta atascada
- WHEN un tripulante intenta caminar por la casilla donde ha quedado la caja
- THEN el camino la rodea o el movimiento se rechaza

### Requirement: Buscar
Un tripulante SHALL poder buscar en su sala por 1 acción, recibiendo el siguiente objeto oculto de la sala si le queda alguno.

#### Scenario: Sala con objetos
- GIVEN una sala con 1 objeto oculto
- WHEN un jugador busca
- THEN recibe ese objeto y la sala queda vacía

#### Scenario: Sala vacía
- GIVEN una sala sin objetos ocultos
- WHEN un jugador busca
- THEN se consume la acción y el log indica "No encuentras nada"

### Requirement: Curar y reanimar
Un tripulante SHALL poder curar a otro (o a sí mismo) en la misma sala consumiendo vendas (+1) o botiquín (+2), y reanimar a un inconsciente con botiquín. El sanitario MUST poder curar (+2) y reanimar sin objetos. La vida no puede superar el máximo.

#### Scenario: Sanitario reanima
- GIVEN un militar inconsciente en la sala del sanitario
- WHEN el sanitario usa "Reanimar"
- THEN el militar vuelve a estado consciente con 1 vida

### Requirement: Dar objeto
Un tripulante SHALL poder entregar un objeto a otro tripulante de la misma sala por 1 acción, incluso si el receptor está inconsciente.

#### Scenario: Entrega
- GIVEN el buzo con un portátil y el informático en la misma sala
- WHEN el buzo le da el portátil
- THEN el portátil pasa al inventario del informático

### Requirement: Escanear
El informático SHALL poder escanear una puerta de su sala por 1 acción, revelando el tipo de la sala contigua sin abrir la puerta ni descubrir su contenido.

#### Scenario: Escaneo
- GIVEN el informático junto a una puerta cerrada
- WHEN escanea
- THEN el HUD muestra "Sala de bombas" al otro lado, que sigue a oscuras

### Requirement: Fabricar en el laboratorio
Un tripulante en el laboratorio SHALL poder fabricar un botiquín o una bombona de oxígeno (a su elección). Cuesta `BALANCE.rooms.craft.cost` acciones (2) y una tirada contra `BALANCE.difficulty.craft` (4) sin bonificaciones de rol. Si sale bien, el objeto va a su inventario. Solo hay materiales para `BALANCE.rooms.craft.maxPerGame` (2) fabricaciones con éxito por partida; las tiradas fallidas no gastan materiales.

#### Scenario: Fabricar
- GIVEN un jugador en el laboratorio con 3 acciones y materiales disponibles
- WHEN fabrica una bombona y saca un 5
- THEN recibe la bombona, le queda 1 acción y queda material para 1 fabricación más

#### Scenario: Sin acciones suficientes
- GIVEN un jugador en el laboratorio con 1 acción
- WHEN intenta fabricar
- THEN la acción se rechaza

### Requirement: Comer y descansar en la cantina
Un tripulante consciente en la cantina al que le falten vidas SHALL poder comer y descansar (1 acción) para recuperar `BALANCE.rooms.restHeal` vida (1). Cada tripulante MUST poder hacerlo solo una vez por partida.

#### Scenario: Descanso
- GIVEN un jugador con 1 vida en la cantina que no ha descansado
- WHEN come y descansa
- THEN pasa a 2 vidas y ya no puede volver a hacerlo en esta partida

### Requirement: Pasar
Un tripulante SHALL poder pasar en cualquier momento de su turno, lo que cuenta como su acción final.

#### Scenario: Pasar al inicio
- GIVEN un jugador al comienzo de su turno
- WHEN pasa
- THEN el turno avanza al siguiente jugador
