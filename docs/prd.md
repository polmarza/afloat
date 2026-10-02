# PRD — AFLOAT

## Resumen ejecutivo

AFLOAT ("a flote") es un juego cooperativo por turnos para navegador, de 2 a 5 jugadores, ambientado en un submarino averiado. Los personajes despiertan en una sala por una alarma y deben escapar antes de que se acabe el oxígeno, abriéndose paso por un submarino que se genera aleatoriamente en cada partida y cuyas salas están a oscuras hasta que alguien abre la puerta.

Cada jugador controla a un personaje con un rol (ingeniero, sanitario, militar, informático, buzo) y habilidades únicas. El equipo gana si **al menos un tripulante sale a flote**, lo que obliga a priorizar, repartir recursos y, a veces, sacrificar a alguien.

Es un proyecto personal: un reto para comprobar si se puede construir y para jugarlo con amigos coordinándose por voz en Discord. No hay monetización.

## Problema que resuelve

El grupo de amigos quiere un juego cooperativo online, con la sensación de juego de mesa (como Catan Universe), pero con tensión de supervivencia y exploración de un mapa desconocido. Ninguno de los juegos de referencia combina exactamente: mapa oculto aleatorio + roles + recurso común que se agota + dilema de sacrificio.

## Usuario objetivo

- **Persona**: el creador del proyecto y su grupo de amigos (2–5 personas) que quedan en Discord para jugar.
- Juegan desde PC, en el navegador, hablando por voz en Discord (el juego no necesita chat).
- No son necesariamente jugadores expertos de juegos de mesa: las reglas deben entenderse jugando.

## Funcionalidades core (MoSCoW)

### Must (MVP)
- Partida local en un solo PC ("hot-seat": se pasan el turno) de 2 a 5 jugadores.
- Selección de rol por jugador antes de empezar (5 roles, sin repetir).
- Cada plaza puede ser humana o de la máquina (IA clásica por prioridades), para jugar solo o completar la tripulación.
- Generación aleatoria del submarino en cada partida, siempre resoluble.
- Niebla de guerra: solo la sala inicial iluminada; las salas se descubren al abrir su puerta.
- Estructura de ronda en 3 fases: Crisis → Turnos de la tripulación → Consecuencias.
- 3 acciones por jugador y turno: moverse, abrir puerta, buscar, reparar, curar, dar objeto, usar objeto, pasar.
- 5 tipos de puerta: normal, con llave, hackeable, bloqueada por un lado, atascada por objeto pesado.
- Tiradas de 1d6 + modificadores de rol y objeto.
- Oxígeno común que se consume según los tripulantes vivos.
- Salud individual (3 vidas; militar 4), estado inconsciente con posibilidad de reanimación, muerte → espectador.
- 3 sistemas del submarino a reparar: energía, soporte vital, bombas/lastre.
- 2 salidas: cápsula de escape (plazas limitadas) y emerger el submarino.
- Mazo de objetos y mazo de eventos.
- Todos los valores de equilibrio en un archivo de configuración.
- Pantalla de final de partida (victoria/derrota, quién se salvó, puntuación con desglose).
- Salas especiales con algo que hacer: invernadero (oxígeno), laboratorio (fabricar objetos) y cantina (comer y descansar; sala doble de 12×5).
- Puntuación al terminar y tabla de récords guardada en el navegador, con formato reproducible para subirla en el futuro.
- Pixel art en vista 3/4 con efectos de iluminación (oscuridad, linterna, alarma, agua).

### Should
- Semilla de partida visible (para repetir un mapa concreto al probar).
- Registro de la partida (log de acciones y tiradas) visible en pantalla.
- Tutorial mínimo o ayuda contextual por acción.
- Efectos de sonido y música ambiente.

### Could
- Tercera salida: escotilla de emergencia con traje de buzo.
- Rol fantasma para jugadores muertos (ayuda limitada).
- Niveles de dificultad (perfiles de configuración).

### Won't (en el MVP)
- Multijugador online (fase 2; ya disponible con salas por código, ver `openspec/specs/online-rooms/spec.md`).
- Integración como Discord Activity.
- Cuentas de usuario y guardado de partidas a medias (los récords locales sí están; el ranking online llegó en la fase 2).
- Chat de texto o voz dentro del juego.
- Versión móvil.
- Monetización.

## Flujos de usuario principales

### 1. Preparar partida
El anfitrión abre el juego en el navegador, indica cuántos jugadores hay (2–5) y el nombre de cada uno. Cada jugador elige un rol distinto. Opcionalmente se introduce una semilla. Se genera el submarino y comienza la partida con todos en la sala inicial, iluminada, con la alarma sonando.

### 2. Jugar una ronda
**Crisis**: el oxígeno baja y se revela una carta de evento (una fuga inunda una sala, un cortocircuito cierra una puerta…). **Tripulación**: en orden, cada jugador gasta hasta 3 acciones. Por ejemplo, el informático se mueve a la puerta este e intenta hackearla: tira 1d6, suma +2 por rol y +1 por el portátil, y la puerta se abre revelando una sala inundada. El buzo entra sin penalización y busca objetos. **Consecuencias**: quien siga en agua o fuego pierde vida, los inconscientes se acercan a la muerte y se comprueba si el equipo ha ganado o perdido.

### 3. Tomar una decisión de sacrificio
El oxígeno está al 20%. La cápsula está reparada y solo cabe una persona, y quedan 4 vivos. El equipo, hablando por Discord, decide quién se salva y quién se queda. El que se queda puede seguir jugando para ayudar hasta el final o dejar que el oxígeno dure más para los demás.

### 4. Partida online
Ana pulsa Jugar → "Crear sala online", escribe su nombre y recibe el código `K7QFM`, que pega en Discord. Luis abre el enlace, escribe su nombre y aparece en la sala de espera. Cada uno elige personaje; Ana completa con el buzo de la máquina, elige la dificultad y empieza. Cada uno juega su tripulante desde su casa y ve en directo lo que hacen los demás. Si a Luis se le cae la conexión en su turno, Ana puede dejar que juegue la máquina hasta que vuelva. Al terminar, "Otra partida" los devuelve a la misma sala.

### 5. Fin de partida
Cuando un tripulante escapa (cápsula lanzada o submarino emergido) se muestra la pantalla de victoria con los supervivientes. Si el oxígeno llega a 0 o mueren todos, derrota. Se puede empezar una nueva partida con otro mapa.

## Reglas del juego (MVP)

Los números concretos son **valores por defecto provisionales**. Todos viven en `packages/shared/src/config/balance.ts` y se ajustarán jugando (ver `docs/data-model.md`, sección "Configuración de equilibrio").

### Estructura de ronda
1. **Crisis**: se consume oxígeno y se roba una carta de evento que se resuelve de inmediato.
2. **Tripulación**: cada jugador vivo y consciente juega su turno en orden. Dispone de 3 acciones. "Pasar" termina su turno.
3. **Consecuencias**: daños ambientales (agua, fuego), avance del contador de inconscientes, comprobación de victoria y derrota.

### Acciones (1 acción cada una salvo indicación)
| Acción | Efecto |
|---|---|
| Moverse | A una sala adyacente conectada por una puerta abierta. Entrar en una sala inundada cuesta 2 acciones (buzo: 1). |
| Abrir puerta | Intenta abrir una puerta de la sala actual. Si se abre, la sala al otro lado queda descubierta. |
| Buscar | Roba una carta de objeto si la sala aún tiene objetos por encontrar. |
| Reparar | Tirada para avanzar la reparación de un sistema o de la cápsula en la sala actual. |
| Curar | Recupera vida a un tripulante en la misma sala (requiere vendas o botiquín, salvo el sanitario). |
| Reanimar | Devuelve a un tripulante inconsciente a 1 vida (requiere botiquín, salvo el sanitario). |
| Dar objeto | Entrega un objeto a un tripulante en la misma sala. |
| Usar objeto | Aplica un objeto con efecto directo (bombona de oxígeno, cigarrillos…). |
| Fabricar (laboratorio) | 2 acciones y tirada 4+: un botiquín o una bombona de oxígeno, a elegir. Materiales para 2 fabricaciones con éxito por partida. |
| Comer y descansar (cantina) | +1 vida. Una vez por tripulante y partida. |
| Pasar | Termina el turno. |

### Tiradas
1d6 + modificadores de rol + modificadores de objeto. Éxito si el resultado es mayor o igual que la dificultad. Un 1 natural siempre falla.

| Acción | Dificultad |
|---|---|
| Hackear puerta | 5 |
| Forzar puerta atascada | 5 |
| Reparar (avanza 1 punto) | 4 |

### Puertas
| Tipo | Cómo se abre |
|---|---|
| Normal | Acción "abrir", sin tirada. |
| Con llave | Acción "abrir" teniendo una tarjeta de acceso (no se consume). |
| Hackeable | Tirada de hackeo. Con la energía restaurada se abre sin tirada. |
| Bloqueada por un lado | Solo se puede abrir desde el lado desbloqueado. |
| Atascada (objeto pesado) | Tirada de forzar. |

### Roles
| Rol | Habilidad |
|---|---|
| Ingeniero | +2 a reparar. |
| Sanitario | Cura 2 vidas en vez de 1 y cura y reanima sin necesidad de objetos. |
| Militar | +2 a forzar puertas atascadas. Tiene 4 vidas. |
| Informático | +2 a hackear. Acción "escanear": revela el tipo de sala contigua sin abrir la puerta. |
| Buzo | Entrar en salas inundadas le cuesta 1 acción y no recibe daño por agua. Consume la mitad de oxígeno. |

### Oxígeno
- Contador común (por defecto 120).
- Consumo por ronda = base (4) + 2 por tripulante vivo (buzo: 1). Los inconscientes también respiran.
- Con el soporte vital reparado, el consumo base pasa a 0.
- Si llega a 0 al final de la fase de Crisis: derrota.

### Casco
- Integridad común del submarino (por defecto 20).
- Pierde 1 al empezar cada ronda por la presión. Además, la fuga de agua le quita 3, el derrumbe 2 y el incendio 1.
- Acción **Apuntalar casco** (1 acción, en cualquier sala, solo con el casco a 15 o menos): misma tirada que reparar; con éxito recupera 2, sin pasar del máximo.
- Si llega a 0, el casco cede: derrota si nadie se ha salvado; si alguien ya escapó, victoria.

### Salud
- 3 vidas (militar 4). Se pierden por agua, fuego, derrumbes y eventos.
- A 0 vidas: **inconsciente**. No puede actuar. Si no es reanimado en 2 rondas, **muere** y el jugador pasa a espectador.

### Sistemas del submarino
Cada sistema requiere 2 puntos de reparación (2 tiradas exitosas) en su sala.
| Sistema | Efecto al repararlo |
|---|---|
| Energía | Se iluminan las salas adyacentes a las ya descubiertas y las puertas hackeables se abren sin tirada. |
| Soporte vital | El consumo base de oxígeno pasa a 0. |
| Bombas/lastre | Habilita la acción "achicar" (vacía el agua de la sala actual) y es requisito para emerger. |

### Salas especiales
Además de las 6 obligatorias, el submarino puede tener:
| Sala | Efecto |
|---|---|
| Invernadero | Una vez descubierto y con la energía reparada, da +3 de oxígeno al empezar cada ronda (sin que nadie tenga que estar dentro). |
| Laboratorio | Acción "Fabricar" (ver Acciones). |
| Cantina | Ocupa dos módulos (12×5). Acción "Comer y descansar" (ver Acciones). Sustituye al antiguo comedor. |

El invernadero, el laboratorio y la cantina aparecen como mucho una vez. La cantina sale en un 60% de los mapas que tienen hueco. El resto se rellena con enfermería, almacén, sala de torpedos y pasillos (decorado y objetos).

### Puntuación
Al terminar, ganada o perdida, se puntúa con la misma fórmula (mínimo 0):
+100 por tripulante a salvo, +100 si emergéis con el submarino, +2 por punto de oxígeno restante, +5 por punto de casco, +20 por sistema reparado, −50 por muerto, −5 por ronda jugada. El total se multiplica por la dificultad (Fácil ×1, Normal ×1,25, Difícil ×1,5).

### Dificultad
Se elige al preparar la partida: Fácil, Normal o Difícil. Cambia el tamaño del submarino para el mismo número de jugadores (mínimo 8 módulos). Más jugadores en el mismo submarino lo facilita (más acciones por oxígeno gastado); pocos jugadores en un submarino grande lo dificulta. Con la máquina, las victorias son aprox. 72% Fácil, 63% Normal y 53% Difícil.
Las 10 mejores partidas se guardan en el navegador con la semilla, la tripulación y todas las acciones, para poder reproducirlas y comprobarlas cuando se suban a un servidor.

### Salidas y victoria
- **Cápsula de escape**: hay que encontrar su sala y repararla (2 puntos). Una acción "lanzar" hace escapar a los tripulantes presentes, hasta completar las plazas. La cápsula tiene siempre **1 plaza**, sea cual sea el número de jugadores: así la puntuación no depende de cuántos juguéis. Emerger es la única forma de salvar a todos.
- **Emerger**: con energía y bombas/lastre reparados, un tripulante en el puente ejecuta "emerger". Se salvan todos los vivos (incluidos inconscientes).
- **Victoria**: al menos un tripulante escapa.
- **Derrota**: nadie ha escapado y, o bien el oxígeno llega a 0, o bien no queda nadie consciente a bordo.
- Si algunos escapan en la cápsula y otros siguen conscientes a bordo, la victoria ya está asegurada. El juego pregunta si seguir jugando (para intentar emerger con los que quedan) o **terminar la partida** en ese momento.

### Objetos (mazo inicial)
| Objeto | Efecto |
|---|---|
| Vendas | Curar 1 vida (se consume). |
| Botiquín | Curar 2 vidas o reanimar (se consume). |
| Llave inglesa | +1 a reparar (permanente). |
| Palanca | +2 a forzar puertas atascadas (permanente). |
| Portátil | +1 a hackear (permanente). |
| Tarjeta de acceso | Abre puertas con llave (permanente). |
| Bombona de oxígeno | +15 de oxígeno común (se consume). |
| Traje de buzo | El portador no recibe daño por agua (permanente). Requisito de la futura escotilla. |
| Cigarrillos | +1 a la siguiente tirada del portador, pero −3 de oxígeno (se consume). |

### Eventos (mazo inicial)
| Evento | Efecto |
|---|---|
| Fuga de agua | Una sala descubierta al azar se inunda. |
| Cortocircuito | Una puerta hackeable abierta vuelve a cerrarse. |
| Incendio | Una sala descubierta arde 2 rondas: quien termine la ronda dentro pierde 1 vida y no se puede entrar. |
| Derrumbe | Una puerta abierta queda atascada. Los tripulantes de esa sala tiran 1d6: con 1–2 pierden 1 vida. |
| Fallo del depurador | −10 de oxígeno. |
| Calma | No pasa nada. |

### Daño ambiental (fase de Consecuencias)
- Terminar la ronda en una sala inundada: −1 vida (salvo buzo o traje de buzo).
- Terminar la ronda en una sala en llamas: −1 vida.

## Requisitos no funcionales

- **Plataforma**: navegador de escritorio moderno (Chrome, Firefox, Edge). Resolución de referencia 1920×1080, escalado de pixel art entero.
- **Rendimiento**: 60 fps estables en un portátil medio.
- **Reproducibilidad**: toda la aleatoriedad pasa por un generador con semilla; la misma semilla y las mismas acciones producen la misma partida.
- **Equilibrio ajustable**: ningún número de reglas en el código fuera de la configuración.
- **Preparado para online**: el motor de reglas no depende de la interfaz ni del navegador, para poder ejecutarlo en un servidor en la fase 2.
- **Idioma**: interfaz en español.
- **Licencias**: todo asset de terceros registrado con su licencia y autoría.

## Fuera de alcance (explícito)

- Juego en tiempo real.
- Emparejamiento con desconocidos.
- Guardar y continuar partidas.
- Móvil y tablet.
- Chat propio (se usa Discord).
- Monetización, tiendas o cosméticos.

## Decisiones abiertas

Se resolverán jugando o antes de implementar la parte afectada:
- Valores concretos de oxígeno, dificultades y plazas de la cápsula (equilibrio).
- Tamaño del mapa según número de jugadores.
- Número de objetos por sala al buscar.
- Qué puede hacer un jugador que decide quedarse atrás (sacrificio voluntario).
