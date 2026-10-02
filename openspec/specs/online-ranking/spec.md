# online-ranking Specification

## Purpose
Clasificación común de las partidas online: qué partidas puntúan, cómo se calcula (en el servidor) y dónde se ve.

## Requirements

### Requirement: Partidas que puntúan
Una partida online SHALL contar para el ranking solo si empezó con todos los asientos humanos y terminó con victoria o derrota. Las partidas locales, las que empiezan con tripulantes de la máquina y las que no terminan MUST NOT contar. Si la máquina juega por alguien desconectado, la partida MUST contar igual.

#### Scenario: Todos humanos
- GIVEN una partida online de Ana y Luis
- WHEN termina con 240 puntos
- THEN Ana y Luis suman 240 puntos cada uno en el ranking

#### Scenario: Con máquina
- GIVEN una partida online de Ana con el buzo de la máquina
- WHEN termina
- THEN no cambia el ranking y la pantalla final dice que con tripulantes de la máquina no cuenta

#### Scenario: Desconexión
- GIVEN una partida de Ana y Luis en la que la máquina jugó por Luis mientras estaba desconectado
- WHEN termina
- THEN cuenta para los dos

### Requirement: Cálculo en el servidor
La puntuación del ranking SHALL calcularla el servidor con la misma fórmula que la pantalla final (`scoreGame`) sobre su propio estado de la partida. El servidor MUST NOT aceptar puntuaciones enviadas por un navegador.

#### Scenario: Puntuación compartida
- GIVEN una partida que puntúa en la que Luis se sacrificó
- WHEN termina
- THEN Luis recibe los mismos puntos que el resto

### Requirement: Clasificaciones
El ranking SHALL tener dos clasificaciones por jugador: total acumulado y mejor partida, cada una con puesto, nombre, puntos y partidas jugadas. Cada jugador se identifica por su navegador y aparece con el último nombre que usó. A igualdad de puntos va antes quien llegó antes a esa puntuación; quienes llegan a la vez (en la misma partida) comparten puesto.

#### Scenario: Mejor partida
- GIVEN que Ana tiene una mejor partida de 300 puntos
- WHEN termina otra que puntúa con 200
- THEN su total sube 200 y su mejor partida sigue en 300

#### Scenario: Cambio de nombre
- GIVEN que Ana jugó como "Ana" y luego, en el mismo navegador, como "Anita"
- WHEN se mira el ranking
- THEN aparece una sola fila con el nombre "Anita"

### Requirement: Dónde se ve
La portada SHALL tener una sección Ranking con las dos clasificaciones (top 20) que resalte tu fila y muestre tu puesto si no estás en el top. Mientras nadie esté en el ranking (o no se pueda cargar), la sección y su enlace del menú MUST NOT mostrarse. La sala de espera SHALL indicar si la partida contará para el ranking. Al terminar una partida online, la pantalla final SHALL mostrar los puntos sumados y tus puestos, o por qué no cuenta.

#### Scenario: Portada
- GIVEN partidas online terminadas
- WHEN se abre la portada y se va a Ranking
- THEN se ven las dos clasificaciones con tu fila resaltada

#### Scenario: Ranking vacío
- GIVEN que todavía no ha terminado ninguna partida que puntúe
- WHEN se abre la portada
- THEN no aparecen ni la sección Ranking ni su enlace en el menú

#### Scenario: Aviso en la sala
- GIVEN una sala de espera con Ana y Luis
- WHEN la anfitriona añade un tripulante de la máquina
- THEN el aviso cambia a que la partida no contará para el ranking

#### Scenario: Pantalla final
- GIVEN una partida que puntúa
- WHEN termina
- THEN la pantalla final muestra los puntos sumados y el puesto en total y en mejor partida
