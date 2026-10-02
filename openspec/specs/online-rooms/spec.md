# online-rooms Specification

## Purpose
Salas privadas para jugar online, cada uno desde su navegador: crear una sala con código, unirse, sala de espera, turnos con un servidor que ejecuta el motor, desconexiones, otra partida y caducidad. El modo en un mismo ordenador sigue disponible.

## Requirements

### Requirement: Elegir modo de juego
Al pulsar Jugar el sistema SHALL ofrecer "En este ordenador", "Crear sala online" y "Unirse con código". "En este ordenador" MUST abrir el asistente de preparación local sin cambios.

#### Scenario: Partida local
- GIVEN la portada
- WHEN el jugador pulsa Jugar y elige "En este ordenador"
- THEN aparece el asistente "¿Cuántos vais a jugar?" como hasta ahora

### Requirement: Crear sala
Crear una sala SHALL generar un código único de 5 caracteres sin caracteres ambiguos y un enlace con ese código. Quien la crea MUST ser el anfitrión.

#### Scenario: Sala nueva
- GIVEN un jugador que elige "Crear sala online" y escribe "Ana"
- WHEN confirma
- THEN entra en la sala de espera como anfitriona, con el código visible y un botón para copiar el enlace

### Requirement: Unirse a una sala
Un jugador SHALL poder unirse escribiendo el código o abriendo el enlace, indicando su nombre. Una sala MUST NOT tener más de 5 tripulantes.

#### Scenario: Unirse con código
- GIVEN una sala de espera con código K7QFM
- WHEN otro jugador elige "Unirse con código", escribe K7QFM y su nombre
- THEN entra en la sala y todos los presentes le ven aparecer

#### Scenario: Enlace
- GIVEN el enlace `…/?sala=K7QFM`
- WHEN se abre
- THEN se pide solo el nombre y se entra en la sala K7QFM

#### Scenario: Código inexistente
- GIVEN que no existe la sala ZZZZZ
- WHEN alguien intenta unirse
- THEN se le dice que esa sala no existe y puede corregir el código

#### Scenario: Sala llena
- GIVEN una sala con 5 tripulantes
- WHEN alguien nuevo intenta unirse
- THEN se le dice que la sala está llena

### Requirement: Sala de espera
En la sala de espera cada jugador SHALL elegir un personaje distinto y poder cambiar su nombre. El anfitrión SHALL elegir la dificultad y añadir o quitar tripulantes de la máquina. "Empezar" MUST estar disponible solo para el anfitrión, con al menos 2 tripulantes y todos los humanos con personaje.

#### Scenario: Personaje ocupado
- GIVEN que Ana ha elegido la ingeniera
- WHEN Luis mira los personajes
- THEN la ingeniera aparece como no disponible

#### Scenario: Completar con la máquina
- GIVEN una sala con Ana y Luis
- WHEN la anfitriona añade al buzo como máquina y pulsa Empezar
- THEN empieza una partida de 3 tripulantes y el buzo lo juega el servidor

#### Scenario: Faltan tripulantes
- GIVEN una sala con solo la anfitriona
- WHEN mira el botón Empezar
- THEN está desactivado e indica que hacen falta al menos 2 tripulantes

### Requirement: Turnos online
Durante la partida cada navegador SHALL poder actuar solo con su tripulante y solo en su turno. Todos MUST ver las acciones de los demás y de las máquinas con las mismas animaciones que en local. El servidor MUST rechazar acciones de quien no tiene el turno.

#### Scenario: Turno ajeno
- GIVEN que es el turno de Ana
- WHEN Luis intenta abrir una puerta
- THEN no puede y el HUD indica "Turno de Ana"

#### Scenario: Ver jugar a otro
- GIVEN que Ana abre una puerta en su turno
- WHEN el servidor acepta la acción
- THEN en el navegador de Luis se ve la puerta abrirse y la sala montarse

### Requirement: Desconexión y reconexión
Si un jugador se desconecta, todos SHALL verlo. Si le toca a alguien desconectado, la partida MUST esperar y el anfitrión SHALL poder hacer que la máquina juegue por esa persona. Al volver desde el mismo navegador, el jugador MUST recuperar su tripulante en cuanto vuelve (la máquina deja de jugar por él) y ver el estado actual.

#### Scenario: Se cae en su turno
- GIVEN que es el turno de Luis y se le cae la conexión
- WHEN la anfitriona pulsa "Que juegue la máquina"
- THEN la máquina juega los turnos de Luis

#### Scenario: Vuelve
- GIVEN que la máquina juega por Luis
- WHEN Luis vuelve a abrir el enlace en su navegador
- THEN recupera su tripulante, ve la partida tal como está y vuelve a jugar él

#### Scenario: Se va el anfitrión
- GIVEN una sala con Ana (anfitriona) y Luis
- WHEN Ana se desconecta
- THEN Luis pasa a ser el anfitrión

### Requirement: Partida en curso
Con la partida empezada, la sala SHALL admitir solo a quienes ya tenían tripulante.

#### Scenario: Llega tarde
- GIVEN una partida en curso en la sala K7QFM
- WHEN alguien nuevo intenta unirse
- THEN se le dice que la partida ya ha empezado

### Requirement: Otra partida y caducidad
Al terminar, el anfitrión SHALL poder volver a la sala de espera con los mismos jugadores. Una sala sin nadie conectado durante 24 horas MUST borrarse.

#### Scenario: Revancha
- GIVEN una partida terminada
- WHEN el anfitrión pulsa "Otra partida"
- THEN todos vuelven a la sala de espera con el mismo código
