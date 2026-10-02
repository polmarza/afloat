# Sistema de diseño — AFLOAT

## Dirección visual

- **Estilo elegido: industrial oscuro.** 3D low-poly en el navegador con three.js: fondo negro, metal, óxido, tuberías. Solo iluminan la luz de emergencia de la sala inicial, la baliza roja giratoria, las pantallas, el reactor y las linternas de la tripulación, con sombras reales.
- **Vista de diorama isométrica** (cámara elevada, ligera perspectiva, giro de 90° con Q/E). Las paredes que quedan delante se bajan solas para ver el interior.
- **Todo el arte se genera por código**: geometría sencilla y texturas procedurales. Sin assets de terceros.
- **Referencia de presentación: *Lara Croft GO*.** Las salas no descubiertas no existen en pantalla; al abrir su puerta se montan casilla a casilla.
- **Ambiente de submarino:** escotillas estancas con volante, periscopio, sonar, reactor.
- **Salas modulares:** todas miden 6×5 casillas y encajan en una rejilla, salvo la cantina, que ocupa dos módulos seguidos (12×5) sin pared en medio.
- **Salas especiales:** el invernadero lleva jardineras con lámparas de cultivo magenta; el laboratorio, mesas blancas con frascos que brillan y una centrifugadora; la cantina, mostrador con fogones, neveras y mesas largas con bancos. Las luces de estas piezas son materiales emisivos, nunca luces reales (no cambian el número de luces de la escena).
- **Cubierta inferior:** las salas inundadas están un nivel más abajo (0,6 de altura). Junto a cada puerta hay un tramo de 3 escalones, y el agua queda por debajo del umbral, así que nunca pasa a la sala de al lado. Estas salas no tienen luz de techo: en el agua solo brilla la linterna.
- **Nombres de sala:** no se escriben sobre el mapa. Aparecen al pasar el ratón por una sala, y la barra inferior muestra la sala del tripulante seleccionado.

Descartados: pixel art 2D con packs de terceros, el estilo "diorama" claro y el 3D pixelado.

### Personajes
Figuras low-poly de bloques (estilo juguete/diorama) con cara sencilla: dos ojos, nariz y boca,, con animación procedural (caminar, balanceo de brazos) y una linterna real en la mano. Cada rol se distingue por el color del uniforme y un detalle:
| Rol | Detalle |
|---|---|
| Ingeniero | Casco amarillo |
| Sanitario | Gorro blanco y cruz roja |
| Militar | Boina verde |
| Informático | Auriculares |
| Buzo | Escafandra transparente |

## Paleta de colores

### Mundo (pixel art)
| Rol | Hex | Uso |
|---|---|---|
| Vacío / oscuridad | `#050607` | Salas no descubiertas, fondo |
| Metal oscuro | `#2a2e35` | Paredes |
| Metal medio | `#3f454e` | Paredes iluminadas |
| Metal claro | `#6c7580` | Bordes, remates |
| Suelo A | `#2e333a` | Baldosas |
| Suelo B | `#33383f` | Baldosas alternas |
| Óxido | `#8b5a2b` | Objetos pesados, cajas |
| Alarma | `#ff3b2f` | Luz de emergencia, peligro |
| Agua | `#2a78b8` | Salas inundadas (con transparencia) |
| Fuego | `#f0a030` | Incendios |

### Tipos de puerta (codificación por color, validada en los mockups)
| Tipo | Hex |
|---|---|
| Abierta | `#050607` |
| Normal (cerrada) | `#8a939e` |
| Con llave | `#e0b030` |
| Hackeable | `#3ec6e0` |
| Bloqueada por un lado | `#c0392b` |
| Atascada (objeto pesado) | `#8b5a2b` |

### Roles (color identificativo en uniforme, retrato e interfaz)
| Rol | Hex |
|---|---|
| Ingeniero | `#e8a33a` (ámbar) |
| Sanitario | `#e9e9e9` con cruz `#dd2222` |
| Militar | `#6f9440` (verde oliva) |
| Informático | `#4aa3e0` (azul) |
| Buzo | `#1fb5a5` (turquesa) |

### Interfaz (HUD y menús)
| Rol | Hex |
|---|---|
| Primary (acción seleccionada) | `#f0a030` |
| Secondary (bordes de panel) | `#6c7580` |
| Accent (hackeo, sonar, información) | `#3ec6e0` |
| Background de panel | `#111317` al 90% de opacidad |
| Text | `#e6e8eb` |
| Text muted | `#8a939e` |
| Error / peligro | `#ff3b2f` |
| Success | `#5dd39e` |
| Oxígeno (barra) | `#3ec6e0`; parpadea en `#ff3b2f` por debajo del 25% |
| Vida (corazones) | `#e0443a`; vacíos `#44403e` |

## Marca e imágenes para compartir

- **Favicon**: el rombo rojo de las vidas del HUD (`#e0443a`), sin fondo (`packages/client/public/favicon.svg`). Para el iPhone y la app instalada, el mismo rombo sobre `#040506` con margen.
- **Imagen para compartir** (`og-image.jpg`, 1200×630): como el hero de la portada: rombo y AFLOAT en ámbar, la frase del juego en grande, la línea de presentación en gris y, a la derecha, los camarotes en 3D con tres tripulantes. Se pinta con el propio juego (`og.html`).
- Los PNG y la imagen para compartir se regeneran con `npm run brand -w @afloat/client` (con `npm run dev` arrancado). Hay que hacerlo si cambia el arte de los camarotes, los tripulantes o los textos del hero.

## Tipografía

Provisional (prototipo): **Barlow Condensed** (Google Fonts, OFL) para el HUD y los nombres de sala. Se revisará al elegir el estilo visual: el estilo pixelado pediría una fuente pixel; el diorama, una más limpia o elegante.

## Espaciado y componentes

- Espaciado en múltiplos de 4 px (resolución base).
- **Paneles**: bordes rectos de 1–2 px en `#6c7580`, esquinas cortadas en diagonal (estilo panel metálico), sin sombras difusas.
- **Botones de acción**: icono + etiqueta; muestran el coste en acciones y, si hay tirada, la probabilidad de éxito.
- **Densidad**: HUD mínimo en los bordes; el submarino ocupa el centro.
- **Portada (landing):** lo primero que se ve al abrir la web (`ui/landing.ts`).
  - Cabecera en dos columnas (una sola por debajo de 900 px): a la izquierda el nombre (pequeño), la frase del juego (grande) y "Jugar"; a la derecha, los camarotes en 3D montándose con tres tripulantes.
  - Menú fijo con enlaces a las secciones (se ocultan por debajo de 720 px), GitHub y "Jugar".
  - **Viñetas 3D** (`vignette.ts`, escenas en `ui/landingScenes.ts`): salas reales de submarinos generados, pintadas con el `World` y los tripulantes del juego. Las salas caen pieza a pieza como al descubrirlas; los tripulantes caen después y encienden la linterna. Encima, marcadores con el estilo del HUD (rombos de acción, barras de oxígeno y casco, fases de la ronda) y avisos. Solo se dibujan mientras están en pantalla.
  - Cómo se juega y Salas son **sliders**: escena a la izquierda, número, título, texto, consejo, flechas y puntos a la derecha; la escena se repite tras una pausa.
  - Tripulación (retrato y ficha con el color del rol), Objetos (imagen, efecto en ámbar, se gasta o permanente, copias en el mazo) y Eventos (borde rojo, verde para "Calma"; daño al casco u oxígeno y copias) siguen como tarjetas.
  - Todos los textos salen del contenido (`content/`) y de `BALANCE`; las descripciones de las salas sin guía están en `ROOM_BLURBS`.
  - "Jugar" abre el asistente; su primer paso tiene un botón "Portada" para volver.
- **Jugar** abre "¿Cómo queréis jugar?": En este ordenador (asistente), Crear sala online o Unirse con código (`ui/online.ts`). Un enlace `?sala=CÓDIGO` va directo a "Entrar en la sala", con el nombre recordado.
- **Sala de espera (online):** código grande en ámbar con "Copiar enlace"; tarjetas de la tripulación (retrato, nombre, personaje y etiquetas Tú / Anfitrión / Máquina / Desconectado, con × para quitar máquinas); rejilla de personajes (los ocupados, apagados con el nombre de quien lo tiene); tu nombre; dificultad (solo la cambia el anfitrión); "Completar con la máquina" con los personajes libres; "Salir de la sala", estado de la conexión y "Empezar partida" (anfitrión) o "Esperando a que… empiece".
- **Ranking (portada):** sección "Ranking online" antes del pie (oculta, con su enlace del menú, mientras no haya nadie en el ranking), con pestañas Total / Mejor partida y tabla (puesto en ámbar, jugador, puntos, partidas). Tu fila, con fondo ámbar suave y etiqueta Tú; si estás fuera del top, "…" y tu fila debajo. En la sala de espera, una línea verde "Esta partida cuenta para el ranking online" o gris si hay máquina. En la pantalla final online, un recuadro con borde ámbar: "RANKING +N puntos · puesto X en total · puesto Y en mejor partida", o por qué no cuenta.
- **HUD online:** fuera de tu turno el panel de acciones dice "Turno de Ana…"; si quien tiene el turno se ha desconectado, "se ha desconectado. Esperando a que vuelva…" y, para el anfitrión, el botón "Que juegue la máquina". Las tarjetas de la tripulación llevan Tú / Máquina / Desconectado (en miniatura, solo la más importante: Fuera, Máquina o Tú). El menú ofrece "Salir de la sala" y la pantalla final "Otra partida" (anfitrión) y "Salir de la sala".
- **Pantalla inicial (asistente):**
  1. Número de jugadores.
  2. Para cada jugador, un carrusel con las fichas de los personajes aún libres (flechas o ← →) y "Elegir". Después, el nombre ("Jugador N" por defecto).
  3. "Todo listo": tira con el retrato, el nombre y el personaje de cada uno; semilla, casilla de tutorial y "Empezar partida".
- **Menú** en la barra superior: seguir jugando o abandonar la partida (con confirmación), que vuelve a la pantalla inicial.
- **HUD:**
  - Barra superior: ronda, jugador activo, acciones restantes, oxígeno con su gasto por ronda, y sistemas.
  - Tripulación en fila bajo la barra: una tarjeta desplegada (retrato, vidas, sala y objetos) y el resto solo con retrato y vidas. Al hacer clic en un retrato se despliega ese tripulante (solo para mirar); al cambiar de turno vuelve el jugador activo. El que tiene el turno lleva un borde ámbar.
  - El "?" solo aparece en la tarjeta desplegada (esquina superior derecha) y abre la ficha del personaje. Cada objeto de la tarjeta abre su ficha.
  - Panel de acciones abajo, con etiquetas cortas y teclas 1–9 (también en el menú de puertas). Las linternas empiezan apagadas; L enciende o apaga la del jugador activo, sin gastar acción.
  - Registro abajo a la derecha, plegado por defecto; se despliega hasta media pantalla con scroll.
  - Al empezar cada ronda (cuando todos han jugado), una ventana resume el oxígeno y el casco perdidos y el evento. Entre turnos no hay ventana: se resalta la tarjeta y el círculo del jugador, y la cámara le sigue y se acerca.
  - Barra superior con dos marcadores: oxígeno y casco.
  - Las acciones propias de la sala (reparar, lanzar, emerger, achicar) se destacan en cian.
  - **Modo tutorial** (casilla al crear la partida, marcada por defecto la primera vez): explica el objetivo al empezar y, la primera vez que alguien entra en una sala con algo que hacer, muestra una ventana con qué se hace allí (`ROOM_GUIDE` en `packages/shared/src/content/rooms.ts`).
  - Tras lanzar la cápsula con gente aún a bordo, una ventana ofrece seguir jugando o terminar la partida.
  - **Avisos** arriba a la derecha, a la altura de la fila de tripulación (sin tapar la barra superior), durante 5 segundos: resultado de cada acción (búsqueda con la imagen del objeto, tiradas, reparaciones, apuntalar, curas, objetos usados o dados, daños, salas nuevas) y errores. Borde verde = éxito, ámbar = fallo o error, rojo = daño.
- **Personajes:** uno por rol, con nombre, oficio, historia breve, habilidades y vidas (`packages/shared/src/content/characters.ts`). La "foto" es el propio muñeco 3D renderizado por código y sin linterna (`packages/client/src/game/portraits.ts`): de busto para miniaturas y de medio cuerpo para la ficha.
- **Objetos:** modelos low-poly propios (`packages/client/src/game/itemModels.ts`) fotografiados igual que los personajes. Cada objeto tiene ficha con efecto, detalles y cómo se usa (`packages/shared/src/content/items.ts`).

## Iluminación y efectos (por código)

- **Niebla**: salas no descubiertas en negro puro; salas descubiertas pero sin tripulantes, en penumbra.
- **Linterna**: halo circular alrededor de cada tripulante, con leve parpadeo.
- **Alarma**: pulso rojo periódico sobre las salas iluminadas mientras la energía no esté reparada.
- **Agua**: capa azul translúcida con destellos animados.
- **Fuego**: partículas naranjas y parpadeo cálido.
- **Energía restaurada**: la alarma se apaga y las salas conectadas pasan a luz blanca fría.

## Tono de comunicación

Español, cercano y tenso, con estilo de comunicación de a bordo:
- Eventos como mensajes de megafonía: "ALERTA: fuga de agua en el almacén".
- Tiradas claras: "Hackeo: 4 + 2 (informático) + 1 (portátil) = 7 ≥ 5 → ¡Puerta abierta!".
- Botones con verbo: "Abrir", "Reparar", "Pasar turno".
