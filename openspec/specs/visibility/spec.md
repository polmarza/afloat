# visibility Specification

## Purpose
Niebla de guerra, iluminación y presentación visual del submarino en el cliente.

## Requirements

### Requirement: Salas no descubiertas ocultas
Las salas no descubiertas MUST NOT dibujarse (ni su tipo, objetos, agua o fuego). Sus puertas hacia salas descubiertas SHALL verse desde el lado descubierto.

#### Scenario: Inicio
- GIVEN el comienzo de la partida
- WHEN se muestra el submarino
- THEN solo se ven los camarotes y sus puertas; el resto del submarino no aparece

### Requirement: Iluminación
Las salas con tripulantes SHALL verse iluminadas con halo de linterna alrededor de cada tripulante; las salas descubiertas sin tripulantes SHALL verse en penumbra; las salas iluminadas por la energía, con luz plena.

#### Scenario: Salir de una sala
- GIVEN que el último tripulante sale del almacén
- WHEN termina su movimiento
- THEN el almacén pasa a penumbra pero sigue visible

### Requirement: Alarma
Mientras la energía no esté reparada, las salas iluminadas SHALL mostrar un pulso de luz roja periódico.

#### Scenario: Fin de la alarma
- GIVEN la energía reparada
- WHEN se actualiza el render
- THEN el pulso rojo deja de mostrarse

### Requirement: Estados de sala visibles
El agua y el fuego SHALL representarse con efectos animados (capa de agua con destellos, partículas de fuego) en salas descubiertas.

#### Scenario: Inundación
- GIVEN una sala descubierta que se inunda
- WHEN se resuelve el evento
- THEN el agua entra con animación y la sala queda con la capa animada

### Requirement: Salas inundadas en la cubierta inferior
Las salas inundadas SHALL dibujarse un nivel por debajo del resto, con un tramo de escaleras en la casilla junto a cada puerta. La superficie del agua MUST quedar por debajo del umbral de las puertas, y estas salas no tendrán luz de techo.

#### Scenario: Bajar a la sala inundada
- GIVEN una puerta abierta entre los camarotes y una sala inundada
- WHEN un tripulante cruza
- THEN baja los escalones, queda con el agua por las rodillas y el agua no pasa a los camarotes

### Requirement: Nombres de sala
El cliente MUST NOT escribir los nombres de las salas sobre el mapa. SHALL mostrar el nombre al pasar el ratón sobre una sala descubierta, y la sala del tripulante seleccionado en el HUD.

#### Scenario: Pasar el ratón
- GIVEN la sala de máquinas descubierta
- WHEN el jugador pasa el ratón sobre su suelo
- THEN aparece "Sala de máquinas" junto al cursor

### Requirement: Vista de diorama en corte
El cliente SHALL mostrar el submarino en 3D con cámara isométrica elevada, permitir girarla en pasos de 90° y bajar automáticamente las paredes que quedan entre la cámara y el interior de las salas.

#### Scenario: Girar la cámara
- GIVEN la cámara mirando desde el sureste
- WHEN el jugador gira la cámara 90°
- THEN las paredes que ahora miran a la cámara se bajan y las que quedan al fondo se elevan

### Requirement: Turno activo evidente
El cliente SHALL resaltar al tripulante activo, mostrar sus acciones restantes y marcar las salas y puertas con las que puede interactuar.

#### Scenario: Opciones
- GIVEN el turno del informático en una sala con dos puertas cerradas
- WHEN empieza su turno
- THEN ambas puertas se resaltan como interactuables
