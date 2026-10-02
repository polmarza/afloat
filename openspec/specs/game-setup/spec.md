# game-setup Specification

## Purpose
Preparación de una partida local: número de jugadores, nombres, selección de rol y semilla, hasta dejar a la tripulación en la sala inicial.

## Requirements

### Requirement: Número de jugadores
El sistema SHALL permitir iniciar una partida con un mínimo de 2 y un máximo de 5 jugadores.

#### Scenario: Número válido
- GIVEN la pantalla de preparación
- WHEN el anfitrión indica 3 jugadores
- THEN se muestran 3 huecos para nombre y rol

#### Scenario: Número inválido
- GIVEN la pantalla de preparación
- WHEN se intenta empezar con 1 jugador
- THEN el botón de empezar no permite continuar y se indica que el mínimo es 2

### Requirement: Dificultad
Al preparar la partida el jugador SHALL elegir una dificultad entre Fácil, Normal y Difícil (Normal por defecto). La dificultad determina el tamaño del submarino para el número de jugadores elegido y el multiplicador de puntos.

#### Scenario: Elegir nivel
- GIVEN la pantalla inicial con 3 jugadores
- WHEN se elige Difícil
- THEN el submarino generado es mayor que en Normal y la pantalla de resumen indica "puntos ×1,5"

### Requirement: Selección de rol única
Cada jugador SHALL elegir un rol entre ingeniero, sanitario, militar, informático y buzo, y dos jugadores MUST NOT tener el mismo rol.

#### Scenario: Rol ya elegido
- GIVEN que el jugador 1 ha elegido "Informático"
- WHEN el jugador 2 abre la selección de rol
- THEN "Informático" aparece como no disponible

#### Scenario: Todos con rol
- GIVEN 4 jugadores con nombre y rol distinto
- WHEN el anfitrión pulsa "Empezar"
- THEN se genera el submarino y comienza la ronda 1

### Requirement: Humano o máquina
Cada plaza de jugador SHALL poder ser controlada por un humano o por la máquina. Un tripulante de la máquina MUST elegir sus acciones entre las mismas que un humano, validadas por el motor, y solo con la información que vería un jugador (salas descubiertas o escaneadas y su propia memoria de salas ya registradas).

#### Scenario: Jugar solo
- GIVEN 1 jugador humano y 2 tripulantes de la máquina
- WHEN termina el turno del humano
- THEN los dos tripulantes de la máquina juegan sus turnos solos, con una pausa entre acciones, y el turno vuelve al humano

### Requirement: Semilla de partida
El sistema SHALL generar una semilla aleatoria por defecto y SHOULD permitir introducir una semilla manualmente para reproducir un mapa.

#### Scenario: Semilla manual
- GIVEN que se introduce la semilla "ABISMO42"
- WHEN se empiezan dos partidas con esa semilla y los mismos jugadores
- THEN ambos submarinos son idénticos

### Requirement: Estado inicial
Al empezar, todos los tripulantes SHALL estar en la sala inicial (camarotes), iluminada, con las vidas máximas de su rol, el oxígeno inicial configurado y el turno en el primer jugador.

#### Scenario: Arranque
- GIVEN una partida recién creada con un militar y un sanitario
- WHEN se muestra el submarino
- THEN ambos están en los camarotes, el militar tiene 4 vidas, el sanitario 3, y solo los camarotes son visibles
