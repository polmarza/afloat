// A stand-in for Cloudflare D1 in tests: Node's built-in SQLite behind the
// small part of the D1 API the server uses (prepare/bind/first/all/run/batch),
// with the real migrations applied.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

export function testDb(): D1Database {
  const sqlite = new DatabaseSync(':memory:');
  const dir = join(import.meta.dirname, '..', 'migrations');
  for (const file of readdirSync(dir).sort()) sqlite.exec(readFileSync(join(dir, file), 'utf8'));

  const statement = (sql: string, args: SQLInputValue[] = []) => ({
    bind: (...next: SQLInputValue[]) => statement(sql, next),
    first: async <T>() => ((sqlite.prepare(sql).get(...args) as T | undefined) ?? null),
    all: async <T>() => ({ results: sqlite.prepare(sql).all(...args) as T[] }),
    run: async () => (sqlite.prepare(sql).run(...args), { success: true }),
  });
  const db = {
    prepare: (sql: string) => statement(sql),
    batch: async (list: ReturnType<typeof statement>[]) => {
      sqlite.exec('BEGIN');
      try {
        const out = [];
        for (const s of list) out.push(await s.run());
        sqlite.exec('COMMIT');
        return out;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
  };
  return db as unknown as D1Database;
}
