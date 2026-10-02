# scoring Specification

## Purpose
Puntuación al terminar una partida (ganada o perdida) y tabla de récords. De momento los récords se guardan en el navegador; el formato está pensado para subirlos más adelante a un servidor que los compruebe.

## Requirements

### Requirement: Fórmula de puntuación
Al terminar la partida, el sistema SHALL calcular la puntuación con los valores de `BALANCE.score`, la misma fórmula para victorias y derrotas:
- +100 por tripulante a salvo,
- +100 si emergieron con el submarino entero,
- +2 por punto de oxígeno restante (redondeado hacia abajo),
- +5 por punto de integridad del casco,
- +20 por sistema reparado (energía, soporte vital, bombas),
- −50 por tripulante muerto,
- −5 por ronda jugada.

La suma MUST NOT ser negativa (mínimo 0). Después se multiplica por la dificultad (`BALANCE.score.multiplier`: Fácil ×1, Normal ×1,25, Difícil ×1,5) y se redondea; así todos los récords comparten una sola tabla.

#### Scenario: Victoria emergiendo
- GIVEN 3 tripulantes, 2 a salvo emergiendo, 1 muerto, 40 de oxígeno, casco 12, 2 sistemas reparados y 9 rondas
- WHEN termina la partida
- THEN la puntuación es 200 + 100 + 80 + 60 + 40 − 50 − 45 = 385

#### Scenario: Dificultad
- GIVEN dos partidas con la misma suma de puntos, una en Fácil y otra en Difícil
- WHEN terminan
- THEN la de Difícil puntúa 1,5 veces más

#### Scenario: Derrota
- GIVEN una partida perdida por falta de oxígeno en la ronda 6 con el casco a 3
- WHEN termina
- THEN la puntuación es max(0, 15 − 30) = 0

### Requirement: Pantalla final con desglose
La pantalla final SHALL mostrar la puntuación total y el desglose de cada concepto que suma o resta, y si la partida entra en la tabla de récords, en qué puesto.

#### Scenario: Nuevo récord
- GIVEN una tabla de récords vacía
- WHEN termina una partida
- THEN la pantalla final indica "¡Nuevo récord!"

### Requirement: Tabla de récords local
El sistema SHALL guardar en el navegador las 10 mejores partidas con: puntuación, resultado, rondas, tripulación (nombre, rol, humano o máquina), semilla, fecha y la lista completa de acciones. La tabla SHALL poder consultarse desde la pantalla inicial, el menú de la partida y la pantalla final.

#### Scenario: Consultar récords
- GIVEN partidas terminadas en este ordenador
- WHEN se pulsa "Récords"
- THEN aparece la tabla ordenada de mayor a menor puntuación, con la partida recién jugada resaltada

### Requirement: Récords verificables
Cada récord MUST incluir la configuración inicial (semilla y jugadores) y todas las acciones aceptadas en orden, de modo que reproducirlas con el motor (`replay`) dé exactamente el mismo estado final y la misma puntuación. Una lista con alguna acción que el motor rechace MUST considerarse inválida.

#### Scenario: Reproducir una partida
- GIVEN un récord guardado
- WHEN se reproducen sus acciones desde su configuración
- THEN el estado final y la puntuación coinciden con los guardados
