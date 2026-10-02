# sound Specification (delta)

## ADDED Requirements

### Requirement: Sonidos generados por código
Todos los sonidos SHALL sintetizarse en el navegador, sin archivos de audio de terceros. El sonido MUST NOT influir en las reglas ni en el estado de la partida.

#### Scenario: Sin archivos
- GIVEN el juego publicado
- WHEN se juega una partida con sonido
- THEN no se descarga ningún archivo de audio

### Requirement: Sonido de los sucesos
Cada suceso que se anima SHALL sonar al mismo tiempo que su animación: acciones (pasos, puertas, dado, objetos, reparaciones, curas, cápsula), peligros (agua, fuego, derrumbe, daño, casco), avisos de partida (tu turno, nueva ronda, carta de evento, victoria y derrota). En partidas online MUST sonar también lo que hacen los demás jugadores y la máquina.

#### Scenario: Abrir una puerta
- GIVEN que un tripulante abre una puerta
- WHEN se anima la apertura
- THEN suena la escotilla y, al caer la sala nueva, su barrido

#### Scenario: Fuga de agua
- GIVEN la carta de evento "Fuga de agua"
- WHEN se inunda una sala
- THEN suena el aviso de carta y el agua entrando

#### Scenario: Te toca
- GIVEN una partida online en la que el turno pasa a tu tripulante
- WHEN cambia el turno
- THEN suena el aviso de turno, y no suena cuando el turno pasa a otro

### Requirement: Ambiente y alarma
Durante la partida SHALL sonar un zumbido grave de fondo. Mientras la energía no esté reparada SHALL sonar la alarma en pulsos suaves cada pocos segundos, que MUST parar al repararla. Al salir de la partida, el ambiente MUST callarse.

#### Scenario: Energía reparada
- GIVEN la alarma sonando
- WHEN se repara la energía
- THEN la alarma se apaga y queda solo el zumbido

### Requirement: Control del sonido
El sonido SHALL estar activado por defecto. Un botón de altavoz en la barra superior (y la tecla M) SHALL silenciarlo o activarlo, y el menú de la partida SHALL tener el volumen. La elección MUST recordarse en el navegador. La portada MUST NOT sonar.

#### Scenario: Silenciar
- GIVEN una partida con sonido
- WHEN el jugador pulsa el altavoz
- THEN deja de sonar todo y, al volver a abrir el juego, sigue en silencio
