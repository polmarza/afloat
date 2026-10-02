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

### Requirement: Escena del hero
La cabecera SHALL mostrar el nombre, la frase del juego (más grande que el nombre) y el botón Jugar a un lado, y al otro una escena 3D en vivo: los camarotes se montan cayendo pieza a pieza, como al descubrir una sala en el juego, y caen tres tripulantes con la linterna encendida. MUST NOT usar vídeo ni imágenes de terceros. Las escenas 3D de la portada MUST liberarse al empezar la partida y solo se dibujan mientras están en pantalla.

#### Scenario: Escena del hero
- GIVEN la portada abierta
- WHEN termina de cargar
- THEN los camarotes caen montándose y después aparecen tres tripulantes en ellos

#### Scenario: Enlace al código
- GIVEN el menú fijo de la portada
- WHEN se pulsa GitHub
- THEN se abre el repositorio del juego en otra pestaña

### Requirement: Secciones informativas
La portada SHALL incluir, en este orden, las secciones Cómo se juega, Tripulación, Objetos, Salas y Eventos. Cómo se juega y Salas SHALL ser sliders: una diapositiva cada vez, con su texto, flechas y puntos para pasar, y una escena 3D que se monta con la animación de caída y se repite tras una pausa. Sus textos MUST salir del contenido del juego (`packages/shared/src/content/`) y de `BALANCE` para los números, de modo que un cambio de contenido o balance se refleje en la portada sin editarla.

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

#### Scenario: Diapositiva de acciones
- GIVEN la diapositiva "3 acciones por turno"
- WHEN se muestra
- THEN un tripulante abre una puerta (la sala de al lado cae montándose), se mueve a ella y busca hasta encontrar un objeto, y un marcador de 3 rombos gasta uno por acción

#### Scenario: Diapositiva de una sala
- GIVEN el slider de Salas
- WHEN se pasa a "Invernadero"
- THEN se monta un invernadero en 3D y se muestran su nombre, para qué sirve y un consejo

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
