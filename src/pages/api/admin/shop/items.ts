import type { APIRoute } from 'astro';

import { getAdminAuthEnv, requireAccessAuth } from '../../../../lib/auth';
import { getDB } from '../../../../lib/db';

export const prerender = false;

type ShopItemRow = {
  id: string;
  label: string;
  description: string;
  cost: string;
  active: number;
  sortOrder: number;
  createdAt: string;
};

type CreateBody = {
  label?: string;
  description?: string;
  cost?: string;
  sortOrder?: number;
};

type UpdateBody = {
  id?: string;
  label?: string;
  description?: string;
  cost?: string;
  active?: boolean;
  sortOrder?: number;
};

function json(data: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(headers ?? {}) },
  });
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidCost(cost: string) {
  return /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(cost) && Number(cost) > 0;
}

export const GET: APIRoute = async (context) => {
  const auth = await requireAccessAuth(context.request, getAdminAuthEnv(context.locals));
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const db = getDB(context);
  if (!db) return json({ ok: false, error: 'D1 is not configured' }, 503);

  let result: { results?: ShopItemRow[] };
  try {
    result = await db
      .prepare(
        `SELECT
           id,
           label,
           description,
           cost,
           active,
           sort_order AS sortOrder,
           created_at AS createdAt
         FROM shop_items
         ORDER BY sort_order ASC, created_at ASC`,
      )
      .all<ShopItemRow>();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? 'DB error');
    return json({ ok: false, error: msg }, 500);
  }

  const items = (result.results ?? []).map((row) => ({
    ...row,
    active: row.active === 1,
  }));

  return json(items);
};

export const POST: APIRoute = async (context) => {
  const auth = await requireAccessAuth(context.request, getAdminAuthEnv(context.locals));
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  const warn = auth.warning ? { 'x-auth-warning': auth.warning } : undefined;

  let body: CreateBody;
  try {
    body = (await context.request.json()) as CreateBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400, warn);
  }

  const label = String(body.label ?? '').trim();
  const description = String(body.description ?? '').trim();
  const cost = String(body.cost ?? '').trim();
  const sortOrder = Number(body.sortOrder ?? 0);

  if (!label) return json({ ok: false, error: 'label is required' }, 400, warn);
  if (!description) return json({ ok: false, error: 'description is required' }, 400, warn);
  if (!isValidCost(cost)) return json({ ok: false, error: 'cost must be a positive number with up to 6 decimals' }, 400, warn);

  const db = getDB(context);
  if (!db) return json({ ok: false, error: 'D1 is not configured' }, 503, warn);

  const id = randomId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO shop_items (id, label, description, cost, active, sort_order, created_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(id, label, description, cost, sortOrder, now)
    .run();

  return json({ ok: true, id }, 201, warn);
};

export const PATCH: APIRoute = async (context) => {
  const auth = await requireAccessAuth(context.request, getAdminAuthEnv(context.locals));
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  const warn = auth.warning ? { 'x-auth-warning': auth.warning } : undefined;

  let body: UpdateBody;
  try {
    body = (await context.request.json()) as UpdateBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400, warn);
  }

  const id = String(body.id ?? '').trim();
  if (!id) return json({ ok: false, error: 'id is required' }, 400, warn);

  const db = getDB(context);
  if (!db) return json({ ok: false, error: 'D1 is not configured' }, 503, warn);

  const existing = await db
    .prepare(`SELECT id FROM shop_items WHERE id = ? LIMIT 1`)
    .bind(id)
    .first<{ id: string }>();

  if (!existing) return json({ ok: false, error: 'Item not found' }, 404, warn);

  const setClauses: string[] = [];
  const bindings: (string | number)[] = [];

  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (!label) return json({ ok: false, error: 'label cannot be empty' }, 400, warn);
    setClauses.push('label = ?');
    bindings.push(label);
  }
  if (body.description !== undefined) {
    const description = String(body.description).trim();
    if (!description) return json({ ok: false, error: 'description cannot be empty' }, 400, warn);
    setClauses.push('description = ?');
    bindings.push(description);
  }
  if (body.cost !== undefined) {
    const cost = String(body.cost).trim();
    if (!isValidCost(cost)) return json({ ok: false, error: 'cost must be a positive number with up to 6 decimals' }, 400, warn);
    setClauses.push('cost = ?');
    bindings.push(cost);
  }
  if (body.active !== undefined) {
    setClauses.push('active = ?');
    bindings.push(body.active ? 1 : 0);
  }
  if (body.sortOrder !== undefined) {
    setClauses.push('sort_order = ?');
    bindings.push(Number(body.sortOrder));
  }

  if (setClauses.length === 0) return json({ ok: false, error: 'No fields to update' }, 400, warn);

  bindings.push(id);
  await db
    .prepare(`UPDATE shop_items SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...bindings)
    .run();

  return json({ ok: true }, 200, warn);
};
