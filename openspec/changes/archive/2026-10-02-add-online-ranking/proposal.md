# Propuesta: ranking online

## Por qué

Hoy cada navegador guarda sus récords solo para sí. Con las salas online, el grupo quiere una clasificación común: quién ha sumado más y quién ha hecho la mejor partida.

## Fase del roadmap

Fase 2, último punto: "Ranking online en D1, calculado por el servidor". Las reglas ya estaban decididas en `docs/roadmap.md` y se respetan.

## Reglas del ranking

- **Calcula el servidor**: al terminar una partida online, la sala calcula la puntuación con el mismo `scoreGame` del motor sobre su propio estado. El navegador nunca envía puntos.
- **Puntuación compartida**: cada jugador humano de la partida recibe la puntuación de la partida, sin bonus ni penalización personal (quien se sacrifica no sale perjudicado).
- **Qué partidas puntúan**: las online que terminan (victoria o derrota) y que **empezaron con todos los asientos humanos**. Si alguien se desconecta y la máquina juega por esa persona, la partida **sí puntúa**, también para quien se desconectó. Las partidas con tripulantes de la máquina desde el principio, las abandonadas y las locales no puntúan.
- **Dos clasificaciones**: **total acumulado** (suma de todas sus partidas) y **mejor partida** (su puntuación más alta).
- **Identidad**: la clave secreta de cada navegador, que ya existe. El ranking muestra el último nombre usado. Desde otro navegador eres otra fila (se unificará cuando haya cuentas).
- **Un único ranking global** para todos los que jueguen online.

## Qué cambia para el jugador

- **Portada**: nueva sección **Ranking** (también en el menú), con dos pestañas, Total y Mejor partida: puesto, nombre, puntos y partidas jugadas. Tu fila se resalta y, si no estás en el top, se muestra tu puesto debajo.
- **Sala de espera**: un aviso indica si la partida puntuará ("Esta partida cuenta para el ranking" o "Con tripulantes de la máquina no cuenta para el ranking").
- **Al terminar una partida online**: la pantalla final dice cuántos puntos suma al ranking y en qué puesto quedas en cada clasificación.
- Los récords locales del navegador siguen como están.

## Decisiones (tomadas con el usuario el 2026-10-02)

1. Identidad por navegador (clave secreta), con el último nombre.
2. Si la máquina juega por alguien desconectado, la partida puntúa igual.
3. Un ranking global.
4. **No** se filtra la información oculta que el servidor envía a los navegadores. Alguien con conocimientos podría mirar el mapa en las herramientas del navegador y hacer trampa. Se acepta para un ranking entre amigos y queda documentado.

## Qué no cambia

Reglas, puntuación (`scoreGame`), partidas locales y su tabla de récords.

## Infraestructura

- Base de datos **Cloudflare D1** llamada `afloat`, creada en tu cuenta y conectada al Worker. Plan gratuito: 5 GB y límites diarios de lecturas y escrituras muy por encima de lo que usará un grupo de amigos; si se superan, falla en vez de cobrar.
- La clave del navegador **no se guarda tal cual**: se guarda su huella (SHA-256), así que una filtración de la base de datos no permite hacerse pasar por nadie.

## Impacto

- `packages/server`: migración SQL de D1, escritura del resultado al terminar, ruta `GET /api/ranking`, aviso de puntuación en la sala.
- `packages/shared/src/net/protocol.ts`: tipos del ranking y mensaje `ranked`.
- Cliente: sección Ranking en la portada, aviso en la sala de espera, puntos y puesto en la pantalla final online.
- Nueva spec `openspec/specs/online-ranking/spec.md`; actualizar `docs/` y el README.

## Cambios durante la implementación

- Dos marcas de tiempo por jugador (`total_at`, `best_at`) en vez de una, para que cada clasificación desempate con la suya.
- Quienes empatan por haber jugado la misma partida comparten puesto.
- La base de datos se creó en la región ENAM (Norteamérica). Solo se usa al terminar las partidas y al cargar el ranking, así que la latencia no se nota.
- La prueba completa (partida que puntúa) se hizo en local; en producción solo se comprobó que todo responde, para no meter jugadores de prueba en el ranking real.
