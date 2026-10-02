-- Online ranking. Players are identified by the SHA-256 of their browser's
-- secret key (never the key itself).

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  best INTEGER NOT NULL DEFAULT 0,
  games INTEGER NOT NULL DEFAULT 0,
  -- When the total last went up, in ms: on equal points, whoever got there first ranks higher.
  total_at INTEGER NOT NULL,
  -- When the best game was played, in ms (same tie-break for the best-game ranking).
  best_at INTEGER NOT NULL
);
CREATE INDEX players_total ON players (total DESC, total_at);
CREATE INDEX players_best ON players (best DESC, best_at);

-- Every ranked game, with what is needed to replay it (setup + actions).
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  room TEXT NOT NULL,
  ended_at INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  status TEXT NOT NULL,
  score INTEGER NOT NULL,
  rounds INTEGER NOT NULL,
  setup TEXT NOT NULL,
  actions TEXT NOT NULL
);

CREATE TABLE game_players (
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (game_id, player_id)
);
