# landing Specification

## Purpose
Portada que se ve al abrir el juego: presenta AFLOAT sobre un submarino 3D en vivo y explica cómo se juega, la tripulación, los objetos, las salas y los eventos, antes del asistente de preparación.

## Requirements

### Requirement: Portada al abrir el juego
Al cargar la web el sistema SHALL mostrar la portada antes del asistente de preparación. La portada MUST tener un botón **Jugar** visible sin hacer scroll.

#### Scenario: Primera visita
- GIVEN un navegador que abre la web
- WHEN termina de cargar
- THEN se ve la cabecera con el logo AFLOAT, la frase del juego y el botón Jugar

#### Scenario: Empezar a jugar
- GIVEN la portada
- WHEN el jugador pulsa Jugar
- THEN se oculta la portada y aparece el paso "¿Cuántos vais a jugar?" del asistente

#### Scenario: Volver a la portada
- GIVEN el primer paso del asistente de preparación
- WHEN el jugador pulsa "Portada"
- THEN vuelve a la portada sin perder la configuración de la partida anterior

### Requirement: Fondo 3D en vivo
La cabecera SHALL mostrar de fondo un submarino generado por el motor con una semilla fija, con todas las salas visibles, la cámara girando lentamente y luz de alarma. MUST NOT usar vídeo ni imágenes de terceros. La escena MUST liberarse al empezar la partida.

#### Scenario: Escena de fondo
- GIVEN la portada abierta
- WHEN pasan unos segundos
- THEN el submarino gira lentamente detrás del texto y el texto sigue siendo legible

#### Scenario: Falla la escena de fondo
- GIVEN que el submarino de fondo no se puede construir
- WHEN se abre la portada
- THEN se muestra un fondo oscuro liso y el resto de la portada funciona

### Requirement: Secciones informativas
La portada SHALL incluir, en este orden, las secciones Cómo se juega, Tripulación, Objetos, Salas y Eventos. Sus textos MUST salir del contenido del juego (`packages/shared/src/content/`) y de `BALANCE` para los números, de modo que un cambio de contenido o balance se refleje en la portada sin editarla.

#### Scenario: Tripulación
- GIVEN la sección Tripulación
- WHEN se muestra
- THEN aparecen los 5 personajes, cada uno con retrato, nombre, rol, historia, habilidades y vidas

#### Scenario: Objetos
- GIVEN la sección Objetos
- WHEN se muestra
- THEN aparece cada objeto del mazo una sola vez, con su imagen, nombre, descripción y si se gasta al usarlo

#### Scenario: Cambio de contenido
- GIVEN que se cambia la descripción de un objeto en `content/items.ts`
- WHEN se abre la portada
- THEN la sección Objetos muestra la nueva descripción

#### Scenario: Eventos
- GIVEN la sección Eventos
- WHEN se muestra
- THEN aparece cada carta de evento con su nombre, su efecto, el daño al casco o el oxígeno que cuesta y cuántas hay en el mazo

### Requirement: Navegación de la portada
La portada SHOULD tener un menú fijo con enlaces a cada sección y al botón Jugar, y MUST verse bien desde 360 px de ancho sin scroll horizontal.

#### Scenario: Ir a una sección
- GIVEN la portada
- WHEN se pulsa "Objetos" en el menú
- THEN la página se desplaza a la sección Objetos
