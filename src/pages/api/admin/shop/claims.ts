import type { APIRoute } from 'astro';

import { getAdminAuthEnv, requireAccessAuth } from '../../../../lib/auth';
import { getDB } from '../../../../lib/db';

export const prerender = false;

type ClaimRow = {
  id: string;
  walletAddress: string;
  handle: string | null;
  itemId: string;
  itemLabel: string;
  cost: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  fulfilledAt: string | null;
  cancelledAt: string | null;
};

type PatchBody = {
  id?: string;
  status?: string;
  adminNote?: string;
};

function json(data: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(headers ?? {}) },
  });
}

const VALID_STATUSES = new Set(['pending', 'fulfilled', 'cancelled']);

export const GET: APIRoute = async (context) => {
  const auth = await requireAccessAuth(context.request, getAdminAuthEnv(context.locals));
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const db = getDB(context);
  if (!db) return json({ ok: false, error: 'D1 is not configured' }, 503);

  const url = new URL(context.request.url);
  const statusFilter = url.searchParams.get('status') ?? '';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);

  const whereClauses: string[] = [];
  const bindings: (string | number)[] = [];

  if (statusFilter && VALID_STATUSES.has(statusFilter)) {
    whereClauses.push('r.status = ?');
    bindings.push(statusFilter);
  }

  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  bindings.push(limit);

  const result = await db
    .prepare(
      `SELECT
         r.id,
         r.wallet_address AS walletAddress,
         u.handle,
         r.item_id AS itemId,
         r.item_label AS itemLabel,
         r.cost,
         r.status,
         r.admin_note AS adminNote,
         r.created_at AS createdAt,
         r.fulfilled_at AS fulfilledAt,
         r.cancelled_at AS cancelledAt
       FROM redemption_events r
       LEFT JOIN users u ON u.wallet_address = r.wallet_address
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ?`,
    )
    .bind(...bindings)
    .all<ClaimRow>();

  return json(result.results ?? []);
};

export const PATCH: APIRoute = async (context) => {
  const auth = await requireAccessAuth(context.request, getAdminAuthEnv(context.locals));
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  const warn = auth.warning ? { 'x-auth-warning': auth.warning } : undefined;

  let body: PatchBody;
  try {
    body = (await context.request.json()) as PatchBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400, warn);
  }

  const id = String(body.id ?? '').trim();
  const newStatus = String(body.status ?? '').trim();
  const adminNote = body.adminNote !== undefined ? String(body.adminNote).trim() : undefined;

  if (!id) return json({ ok: false, error: 'id is required' }, 400, warn);
  if (!VALID_STATUSES.has(newStatus) || newStatus === 'pending') {
    return json({ ok: false, error: 'status must be fulfilled or cancelled' }, 400, warn);
  }

  const db = getDB(context);
  if (!db) return json({ ok: false, error: 'D1 is not configured' }, 503, warn);

  const existing = await db
    .prepare(`SELECT id, status FROM redemption_events WHERE id = ? LIMIT 1`)
    .bind(id)
    .first<{ id: string; status: string }>();

  if (!existing) return json({ ok: false, error: 'Claim not found' }, 404, warn);
  if (existing.status !== 'pending') {
    return json({ ok: false, error: `Claim is already ${existing.status}` }, 409, warn);
  }

  const now = new Date().toISOString();
  const timestampCol = newStatus === 'fulfilled' ? 'fulfilled_at' : 'cancelled_at';

  const setClauses = [`status = ?`, `${timestampCol} = ?`];
  const bindings: (string | null)[] = [newStatus, now];

  if (adminNote !== undefined) {
    setClauses.push('admin_note = ?');
    bindings.push(adminNote || null);
  }

  bindings.push(id);

  await db
    .prepare(`UPDATE redemption_events SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...bindings)
    .run();

  return json({ ok: true }, 200, warn);
};
