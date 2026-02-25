import type { APIRoute } from 'astro';

import { getAdminAuthEnv, requireAccessAuth } from '../../../lib/auth';
import { getDB } from '../../../lib/db';

export const prerender = false;

type MintEventStatus = 'queued' | 'submitted' | 'confirmed' | 'failed';

type MintEvent = {
  id: string;
  toWallet: string;
  amountRaw: string;
  chainId: number;
  status: MintEventStatus;
  idempotencyKey: string;
  txHash: string | null;
  requestedBySub: string | null;
  requestedByEmail: string | null;
  createdAt: string;
  submittedAt: string | null;
  confirmedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
};

type UpdateBody = {
  eventId?: string;
  status?: MintEventStatus;
  txHash?: string;
  failureReason?: string;
  manualOverride?: boolean;
};

function json(data: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(headers || {}),
    },
  });
}

function sanitizeLimit(raw: string | null): number {
  const parsed = Number(raw ?? '50');
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 50;
  }
  return Math.min(parsed, 200);
}

function isWallet(input: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
}

function isTxHash(input: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(input);
}

export const GET: APIRoute = async (context) => {
  const auth = await requireAccessAuth(context.request, getAdminAuthEnv(context.locals));
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  const warningHeaders = auth.warning ? { 'x-auth-warning': auth.warning } : undefined;
  const db = getDB(context);
  if (!db) {
    return json([], 200, warningHeaders);
  }

  const url = new URL(context.request.url);
  const limit = sanitizeLimit(url.searchParams.get('limit'));
  const status = url.searchParams.get('status')?.trim().toLowerCase();
  const toWallet = url.searchParams.get('to_wallet')?.trim().toLowerCase();

  if (status && !['queued', 'submitted', 'confirmed', 'failed'].includes(status)) {
    return json({ ok: false, error: 'status filter must be queued|submitted|confirmed|failed' }, 400, warningHeaders);
  }

  if (toWallet && !isWallet(toWallet)) {
    return json({ ok: false, error: 'to_wallet filter must be a valid address' }, 400, warningHeaders);
  }

  const filters: string[] = [];
  const values: unknown[] = [];

  if (status) {
    filters.push('status = ?');
    values.push(status);
  }

  if (toWallet) {
    filters.push('COALESCE(to_wallet, wallet_address) = ?');
    values.push(toWallet);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    const query = `
      SELECT
        id,
        COALESCE(to_wallet, wallet_address) AS toWallet,
        COALESCE(amount_raw, CAST(amount AS TEXT)) AS amountRaw,
        COALESCE(chain_id, 11155111) AS chainId,
        status,
        idempotency_key AS idempotencyKey,
        COALESCE(tx_hash, mint_tx_hash) AS txHash,
        COALESCE(requested_by_sub, admin_subject) AS requestedBySub,
        requested_by_email AS requestedByEmail,
        created_at AS createdAt,
        submitted_at AS submittedAt,
        confirmed_at AS confirmedAt,
        failed_at AS failedAt,
        failure_reason AS failureReason
      FROM mint_events
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const result = await db.prepare(query).bind(...values, limit).all<MintEvent>();
    return json(result.results ?? [], 200, warningHeaders);
  } catch {
    return json([], 200, warningHeaders);
  }
};

export const PATCH: APIRoute = async (context) => {
  const auth = await requireAccessAuth(context.request, getAdminAuthEnv(context.locals));
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  const warningHeaders = auth.warning ? { 'x-auth-warning': auth.warning } : undefined;

  let body: UpdateBody;
  try {
    body = (await context.request.json()) as UpdateBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400, warningHeaders);
  }

  const eventId = String(body.eventId ?? '').trim();
  const nextStatus = String(body.status ?? '').trim().toLowerCase() as MintEventStatus;
  const txHash = body.txHash ? String(body.txHash).trim() : null;
  const failureReason = body.failureReason ? String(body.failureReason).trim() : null;
  const manualOverride = Boolean(body.manualOverride);

  if (!eventId) {
    return json({ ok: false, error: 'eventId is required' }, 400, warningHeaders);
  }

  if (!['queued', 'submitted', 'confirmed', 'failed'].includes(nextStatus)) {
    return json({ ok: false, error: 'status must be queued|submitted|confirmed|failed' }, 400, warningHeaders);
  }

  if (txHash && !isTxHash(txHash)) {
    return json({ ok: false, error: 'txHash must be a valid 0x-prefixed hash' }, 400, warningHeaders);
  }

  if ((nextStatus === 'failed' || nextStatus === 'queued') && txHash) {
    return json({ ok: false, error: 'txHash can only be provided when setting submitted status' }, 400, warningHeaders);
  }

  const db = getDB(context);
  if (!db) {
    return json({ ok: false, error: 'D1 is not configured' }, 503, warningHeaders);
  }

  const current = await db
    .prepare(
      `
        SELECT
          status,
          COALESCE(tx_hash, mint_tx_hash) AS txHash
        FROM mint_events
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(eventId)
    .first<{ status: MintEventStatus; txHash: string | null }>();

  if (!current) {
    return json({ ok: false, error: 'Mint event not found' }, 404, warningHeaders);
  }

  const currentStatus = current.status;
  const now = new Date().toISOString();

  // Strict transition matrix.
  if (currentStatus === 'queued' && nextStatus === 'submitted') {
    if (!txHash) {
      return json({ ok: false, error: 'queued -> submitted requires txHash' }, 400, warningHeaders);
    }

    await db
      .prepare(
        `
          UPDATE mint_events
          SET status = 'submitted', tx_hash = ?, mint_tx_hash = ?, submitted_at = ?, failed_at = NULL, failure_reason = NULL
          WHERE id = ?
        `,
      )
      .bind(txHash, txHash, now, eventId)
      .run();

    return json({ ok: true }, 200, warningHeaders);
  }

  if (currentStatus === 'submitted' && nextStatus === 'confirmed') {
    if (txHash) {
      return json({ ok: false, error: 'Do not provide txHash on submitted -> confirmed' }, 400, warningHeaders);
    }

    if (!current.txHash) {
      return json({ ok: false, error: 'submitted -> confirmed requires txHash already present' }, 400, warningHeaders);
    }

    await db
      .prepare(
        `
          UPDATE mint_events
          SET status = 'confirmed', confirmed_at = ?, failure_reason = NULL, failed_at = NULL
          WHERE id = ?
        `,
      )
      .bind(now, eventId)
      .run();

    return json({ ok: true }, 200, warningHeaders);
  }

  if (currentStatus === 'submitted' && nextStatus === 'failed') {
    if (!failureReason) {
      return json({ ok: false, error: 'submitted -> failed requires failureReason' }, 400, warningHeaders);
    }

    await db
      .prepare(
        `
          UPDATE mint_events
          SET status = 'failed', failed_at = ?, failure_reason = ?
          WHERE id = ?
        `,
      )
      .bind(now, failureReason, eventId)
      .run();

    return json({ ok: true }, 200, warningHeaders);
  }

  if (currentStatus === 'queued' && nextStatus === 'failed') {
    if (!failureReason) {
      return json({ ok: false, error: 'queued -> failed requires failureReason' }, 400, warningHeaders);
    }

    await db
      .prepare(
        `
          UPDATE mint_events
          SET status = 'failed', failed_at = ?, failure_reason = ?
          WHERE id = ?
        `,
      )
      .bind(now, failureReason, eventId)
      .run();

    return json({ ok: true }, 200, warningHeaders);
  }

  // Optional explicit manual requeue path.
  if (currentStatus === 'failed' && nextStatus === 'queued') {
    if (!manualOverride) {
      return json({ ok: false, error: 'failed -> queued is only allowed with manualOverride=true' }, 400, warningHeaders);
    }

    await db
      .prepare(
        `
          UPDATE mint_events
          SET status = 'queued', failed_at = NULL, failure_reason = ?
          WHERE id = ?
        `,
      )
      .bind(
        failureReason ? `Requeued by admin: ${failureReason}` : 'Requeued by admin manual override',
        eventId,
      )
      .run();

    return json({ ok: true }, 200, warningHeaders);
  }

  return json(
    {
      ok: false,
      error: `Invalid transition ${currentStatus} -> ${nextStatus}`,
    },
    400,
    warningHeaders,
  );
};
