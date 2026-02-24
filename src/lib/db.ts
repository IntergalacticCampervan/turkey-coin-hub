import type { APIContext } from 'astro';

export type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = Record<string, unknown>>(column?: string) => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
  run: () => Promise<unknown>;
};

export type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
  exec?: (query: string) => Promise<unknown>;
};

type DBContext = Pick<APIContext, 'locals'>;

export function getDB(context: DBContext): D1Database | null {
  const runtimeDB = (
    context.locals as { runtime?: { env?: { DB?: D1Database } } } | undefined
  )?.runtime?.env?.DB;
  if (runtimeDB) {
    return runtimeDB;
  }

  const localFallbackDB = (context.locals as { DB?: D1Database } | undefined)?.DB;
  if (localFallbackDB) {
    return localFallbackDB;
  }

  return null;
}
