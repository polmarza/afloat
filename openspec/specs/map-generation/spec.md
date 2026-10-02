# map-generation Specification

## Purpose
Generación procedural del submarino en cada partida: salas en rejilla, tipos de sala, puertas y objetos, garantizando que siempre sea posible escapar.

## Requirements

### Requirement: Generación determinista
El generador SHALL producir el mismo submarino para la misma semilla y número de jugadores, y MUST usar exclusivamente el RNG con semilla del motor.

#### Scenario: Misma semilla
- GIVEN la semilla "X1" y 3 jugadores
- WHEN se genera el mapa dos veces
- THEN salas, puertas y objetos coinciden exactamente

### Requirement: Salas modulares
Todas las salas SHALL ocupar un módulo del mismo tamaño (`ROOM_W`×`ROOM_D` casillas, por defecto 6×5) y colocarse en una rejilla de módulos, para que cualquier sala encaje en cualquier posición. La única excepción es la cantina, que MUST ocupar dos módulos contiguos en horizontal (12×5) sin pared entre ellos. Las puertas MUST situarse en los bordes compartidos entre módulos de salas distintas, y entre dos salas MUST haber como mucho una puerta.

#### Scenario: Encaje
- GIVEN dos salas cualesquiera en módulos contiguos
- WHEN se genera el mapa
- THEN comparten una pared completa sin huecos ni solapes

#### Scenario: Cantina
- GIVEN un mapa con cantina
- WHEN se genera
- THEN la cantina cubre dos módulos de la misma fila y cada módulo de la rejilla pertenece a una sola sala

### Requirement: Cubierta inferior
El generador SHALL marcar como cubierta inferior una proporción de salas (`BALANCE.map.lowerDeckRatio`), nunca los camarotes. Solo las salas de la cubierta inferior MAY estar inundadas, al inicio (`BALANCE.map.initialFlooded`) o por eventos.

#### Scenario: Camarotes secos
- GIVEN cualquier semilla
- WHEN se genera el mapa
- THEN los camarotes están en la cubierta principal y no están inundados

### Requirement: Tamaño según jugadores y dificultad
El tamaño de la rejilla SHALL depender del número de jugadores y de la dificultad (Fácil, Normal, Difícil) según `BALANCE.map.gridByLevel`. A igual número de jugadores, un nivel más difícil MUST NOT dar un submarino más pequeño, y ninguna combinación MUST tener menos de 8 módulos.

#### Scenario: Partida de 2 en Fácil
- GIVEN 2 jugadores y dificultad Fácil
- WHEN se genera el mapa
- THEN la rejilla es de 4×2 módulos (8)

#### Scenario: Partida de 5 en Difícil
- GIVEN 5 jugadores y dificultad Difícil
- WHEN se genera el mapa
- THEN la rejilla es de 7×3 módulos

### Requirement: Salas obligatorias
Cada mapa MUST contener exactamente una sala de cada tipo: camarotes (inicial), puente, sala de máquinas, soporte vital, sala de bombas y cápsula de escape. Si quedan al menos dos módulos libres, el mapa SHALL incluir una cantina con probabilidad `BALANCE.map.cantinaChance`. El resto de módulos SHALL elegirse al azar entre invernadero y laboratorio (como mucho uno de cada) y enfermería, almacén, sala de torpedos y pasillo (pueden repetirse).

#### Scenario: Salas críticas
- GIVEN cualquier semilla
- WHEN se genera el mapa
- THEN existen las 6 salas obligatorias y la cápsula no es adyacente a los camarotes

### Requirement: Puertas
Las salas adyacentes SHALL conectarse mediante puertas cuyo tipo se elige según `BALANCE.map.doorTypeWeights`. Las puertas de la sala inicial MUST NOT ser de tipo bloqueada por un lado desde dentro.

#### Scenario: Salida de los camarotes
- GIVEN un mapa generado
- WHEN se inspeccionan las puertas de los camarotes
- THEN al menos una se puede abrir desde los camarotes

### Requirement: Resolubilidad garantizada
El generador MUST validar que existe una secuencia de acciones posible que permite alcanzar la sala de la cápsula o el puente con los sistemas necesarios, considerando que las puertas con llave solo son franqueables si existe una tarjeta de acceso encontrable antes, y que las puertas bloqueadas por un lado solo se abren desde su lado. Si la validación falla, SHALL regenerar con una subsemilla derivada.

#### Scenario: Llave antes de puerta con llave
- GIVEN un mapa donde la única ruta a la cápsula cruza una puerta con llave
- WHEN se valida
- THEN existe al menos una sala alcanzable sin cruzar ninguna puerta con llave que contiene una tarjeta de acceso entre sus objetos

#### Scenario: Prueba masiva
- GIVEN 10 000 semillas distintas
- WHEN se generan y validan los mapas
- THEN el 100% es resoluble

### Requirement: Objetos por sala
Al generar el mapa, el mazo de objetos SHALL barajarse y repartirse entre las salas: cada una recibe una lista oculta de objetos de tamaño dentro de `BALANCE.map.itemsPerRoom`, y los camarotes al menos 1.

#### Scenario: Camarotes
- GIVEN un mapa generado
- WHEN se consultan los objetos de los camarotes
- THEN hay al menos 1
