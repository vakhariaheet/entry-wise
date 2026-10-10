import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface BoundStatement {
  sql: string;
  params: SQLQueryBindings[];
  bind: (...values: unknown[]) => BoundStatement;
  all: <T = Record<string, unknown>>() => Promise<{
    results: T[];
    success: boolean;
    meta: { duration: number };
  }>;
  first: <T = Record<string, unknown>>(colName?: string) => Promise<T | null>;
  run: () => Promise<{
    results: unknown[];
    success: boolean;
    meta: { changes: number; last_row_id: number | bigint; duration: number };
  }>;
  raw: () => Promise<unknown[][]>;
}

function normalizeBindingValue(val: unknown): SQLQueryBindings {
  if (val === undefined) return null;
  if (
    val === null ||
    typeof val === 'string' ||
    typeof val === 'number' ||
    typeof val === 'bigint' ||
    typeof val === 'boolean' ||
    val instanceof Uint8Array
  ) {
    return val;
  }
  return JSON.stringify(val);
}

/**
 * Wraps a `bun:sqlite` Database instance in a Cloudflare D1Database-compatible interface
 * so all EntryWise controllers, middleware, and queue processors work identically in Docker/VPS
 * and Cloudflare Workers without any platform lock-in.
 */
export function createSqliteD1Adapter(sqlite: Database): D1Database {
  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.exec('PRAGMA busy_timeout = 5000;');

  const createStatement = (sql: string, boundParams: SQLQueryBindings[] = []): BoundStatement => {
    const stmtObj: BoundStatement = {
      sql,
      params: boundParams,
      bind(...values: unknown[]) {
        return createStatement(sql, values.map(normalizeBindingValue));
      },
      async all<T = Record<string, unknown>>() {
        const start = performance.now();
        const stmt = sqlite.query(sql);
        const rows = stmt.all(...boundParams) as T[];
        return {
          results: rows,
          success: true,
          meta: { duration: performance.now() - start },
        };
      },
      async first<T = Record<string, unknown>>(colName?: string) {
        const stmt = sqlite.query(sql);
        const row = stmt.get(...boundParams) as Record<string, unknown> | null;
        if (!row) return null;
        if (colName) {
          return ((row[colName] as T) ?? null) as T | null;
        }
        return row as unknown as T;
      },
      async run() {
        const start = performance.now();
        const stmt = sqlite.query(sql);
        const res = stmt.run(...boundParams);
        return {
          results: [],
          success: true,
          meta: {
            changes: res.changes,
            last_row_id: res.lastInsertRowid,
            duration: performance.now() - start,
          },
        };
      },
      async raw() {
        const stmt = sqlite.query(sql);
        return stmt.values(...boundParams) as unknown[][];
      },
    };
    return stmtObj;
  };

  const adapter = {
    prepare(query: string) {
      return createStatement(query);
    },
    async batch(statements: BoundStatement[]) {
      const results = [];
      const tx = sqlite.transaction((stmts: BoundStatement[]) => {
        const out = [];
        for (const s of stmts) {
          const query = sqlite.query(s.sql);
          const isSelect = /^\s*(SELECT|PRAGMA|RETURNING)/i.test(s.sql);
          if (isSelect) {
            const rows = query.all(...s.params);
            out.push({
              results: rows,
              success: true,
              meta: { duration: 0, changes: 0, last_row_id: 0 },
            });
          } else {
            const info = query.run(...s.params);
            out.push({
              results: [],
              success: true,
              meta: {
                duration: 0,
                changes: info.changes,
                last_row_id: Number(info.lastInsertRowid),
              },
            });
          }
        }
        return out;
      });
      const batchOut = tx(statements);
      results.push(...batchOut);
      return results;
    },
    async exec(query: string) {
      const start = performance.now();
      sqlite.exec(query);
      return {
        count: 1,
        duration: performance.now() - start,
      };
    },
    async dump() {
      return new ArrayBuffer(0);
    },
  };

  return adapter as unknown as D1Database;
}

/**
 * Automatically runs all SQL migrations in `migrationsDir` in lexicographical order.
 * Tracks applied migrations in `_entrywise_migrations` so restarts are idempotent.
 */
export function runSqliteMigrations(sqlite: Database, migrationsDir: string): string[] {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _entrywise_migrations (
      name TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  if (!existsSync(migrationsDir)) {
    return [];
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const appliedRows = sqlite.query('SELECT name FROM _entrywise_migrations').all() as Array<{
    name: string;
  }>;
  const appliedSet = new Set(appliedRows.map((r) => r.name));
  const newlyApplied: string[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) continue;
    const sqlContent = readFileSync(join(migrationsDir, file), 'utf-8').trim();
    if (sqlContent.length > 0) {
      sqlite.exec(sqlContent);
    }
    sqlite.query('INSERT INTO _entrywise_migrations (name) VALUES (?)').run(file);
    newlyApplied.push(file);
  }

  return newlyApplied;
}

/**
 * Opens or creates a persistent SQLite database at `dbPath`, runs migrations, and returns the D1 adapter.
 */
export function initPersistentSqliteDb(
  dbPath: string,
  migrationsDir: string
): { sqlite: Database; d1: D1Database; appliedMigrations: string[] } {
  if (dbPath !== ':memory:') {
    const dir = dirname(dbPath);
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  const sqlite = new Database(dbPath);
  const appliedMigrations = runSqliteMigrations(sqlite, migrationsDir);
  const d1 = createSqliteD1Adapter(sqlite);
  return { sqlite, d1, appliedMigrations };
}
