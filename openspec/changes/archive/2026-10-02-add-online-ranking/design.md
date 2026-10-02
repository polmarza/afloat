# Diseño: ranking online

## Base de datos (D1 `afloat`, binding `DB`)

`packages/server/migrations/0001_ranking.sql`:

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,          -- SHA-256 (hex) de la clave del navegador
  name TEXT NOT NULL,           -- último nombre usado
  total INTEGER NOT NULL DEFAULT 0,
  best INTEGER NOT NULL DEFAULT 0,
  games INTEGER NOT NULL DEFAULT 0,
  total_at INTEGER NOT NULL,    -- ms en que subió el total por última vez (desempate)
  best_at INTEGER NOT NULL      -- ms de la mejor partida (desempate)
);
CREATE INDEX players_total ON players (total DESC, total_at);
CREATE INDEX players_best ON players (best DESC, best_at);

CREATE TABLE games (
  id TEXT PRIMARY KEY,          -- código de sala + número de partida en esa sala
  room TEXT NOT NULL,
  ended_at INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  status TEXT NOT NULL,         -- won | lost
  score INTEGER NOT NULL,
  rounds INTEGER NOT NULL,
  setup TEXT NOT NULL,          -- JSON: con `actions`, permite reproducir la partida (replay)
  actions TEXT NOT NULL
);

CREATE TABLE game_players (
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (game_id, player_id)
);
```

Guardar `setup` y `actions` permite comprobar o recalcular cualquier puntuación con `replay()` si algún día cambia la fórmula.

## Servidor

- **`Room`** (lógica pura) decide si la partida puntúa: `rankedGame` es verdadero si al empezar todos los asientos eran humanos. Al terminar, `commit` deja preparado un `RankedResult` (puntuación con `scoreGame`, jugadores humanos con clave, nombre y rol, configuración y acciones). La sala lleva un contador de partidas para el id.
- **`ranking.ts`** (nuevo): `recordGame(db, result)` escribe en una transacción (`db.batch`) la partida, sus jugadores y las filas de `players` (upsert: suma `total`, `games`, `best = max(best, score)`, nombre actualizado; quienes empatan en la misma partida comparten puesto). `topRanking(db, me)` devuelve el top 20 de cada clasificación y, si se pasa `me`, su puesto. Las claves se pasan por SHA-256 antes de tocar la base de datos.
- **`RoomObject`**: tras una acción que termina una partida que puntúa, llama a `recordGame` y envía a cada conexión un `ranked` con sus puntos y puestos. Si la escritura falla (límite del plan, red), se registra en el log y se envía `ranked` con `counted: false, reason: 'error'`; la partida no se pierde para los jugadores.
- **Ruta** `GET /api/ranking?me=<huella>`: el top 20 de total y de mejor partida, y la fila de `me` si no está en el top. La huella la calcula el navegador con `crypto.subtle` a partir de su clave; no es secreta (no sirve para entrar en ninguna sala).

## Protocolo

- `RoomView.ranked: boolean` (la partida que se va a jugar o se está jugando puntúa).
- Nuevo `ServerMessage`: `{ type: 'ranked'; counted: boolean; reason?: 'bots' | 'error'; points?: number; total?: RankPosition; best?: RankPosition }` con `RankPosition = { rank: number; points: number }`.
- `RankingResponse = { total: RankingRow[]; best: RankingRow[]; me?: { total: RankingRow; best: RankingRow } }` con `RankingRow = { rank, name, points, games, me? }`.

## Cliente

- **Portada**: sección `#ranking` antes del pie y enlace "Ranking" en el menú. Se carga al abrir la portada (`fetch`), con estados de carga, vacío ("Todavía no hay partidas online terminadas") y error.
- **Sala de espera**: línea bajo la tripulación según `room.ranked` (calculado en vivo: con una máquina en la sala, "no cuenta").
- **Pantalla final online**: bloque "Ranking" con "+N puntos" y "Puesto X en total · puesto Y en mejor partida", o el motivo por el que no cuenta. Llega por el mensaje `ranked`, que puede llegar un instante después de la pantalla.

## Desarrollo local

- `wrangler dev` usa una D1 local; `npm run db:migrate:local` aplica las migraciones en local y `npm run db:migrate` en Cloudflare (ambos en `packages/server`).
- Tests de `Room` (cuándo puntúa y qué resultado prepara) y de `ranking.ts` con una base de datos SQLite en memoria que imita la API de D1, para comprobar las sumas, la mejor partida, los desempates y el puesto.
