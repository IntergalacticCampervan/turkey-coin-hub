import type { APIContext } from 'astro';

type D1Stmt = {
  bind: (...values: unknown[]) => D1Stmt;
  first: <T = unknown>(column?: string) => Promise<T | null>;
  all: <T = unknown>() => Promise<{ results?: T[] }>;
  run: () => Promise<unknown>;
};

export type D1DatabaseLike = {
  prepare: (query: string) => D1Stmt;
  exec?: (query: string) => Promise<unknown>;
};

type DBContext = Pick<APIContext, 'locals'> & {
  env?: { DB?: D1DatabaseLike };
};

export function getDB(context: DBContext): D1DatabaseLike | null {
  const fromLocals = (context.locals as { db?: D1DatabaseLike } | undefined)?.db;
  if (fromLocals) {
    return fromLocals;
  }

  const localRuntimeEnv = (
    context.locals as { runtime?: { env?: { DB?: D1DatabaseLike } } } | undefined
  )?.runtime?.env?.DB;
  if (localRuntimeEnv) {
    return localRuntimeEnv;
  }

  const directEnv = context.env?.DB;
  if (directEnv) {
    return directEnv;
  }

  return null;
}
