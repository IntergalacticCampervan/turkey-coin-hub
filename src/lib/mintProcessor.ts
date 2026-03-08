import type { D1Database } from './db';
import {
  getMintReceiptStatus,
  getOnchainConfigError,
  getOnchainSignerStatus,
  type OnchainEnv,
  simulateMintTransaction,
  submitMintTransaction,
} from './onchain';

export type MintFailureStage = 'queue_insert' | 'tx_simulation' | 'tx_submission' | 'receipt_check' | 'balance_update';

type MintEventRow = {
  id: string;
  toWallet: string;
  amountRaw: string;
  txHash: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown mint processing error';
}

async function claimQueuedMintEvent(db: D1Database, eventId: string) {
  const claimValue = `claim:${nowIso()}`;
  const result = await db
    .prepare(
      `
        UPDATE mint_events
        SET updated_at = ?
        WHERE id = ?
          AND status = 'queued'
          AND (updated_at IS NULL OR updated_at = '' OR updated_at NOT LIKE 'claim:%')
      `,
    )
    .bind(claimValue, eventId)
    .run();

  return Number(result.meta?.changes ?? 0) > 0;
}

async function markMintSubmitted(db: D1Database, eventId: string, txHash: string) {
  const now = nowIso();
  try {
    await db
      .prepare(
        `
          UPDATE mint_events
          SET
            status = 'submitted',
            tx_hash = ?,
            mint_tx_hash = ?,
            submitted_at = ?,
            updated_at = ?,
            failed_at = NULL,
            failure_reason = NULL,
            failure_stage = NULL
          WHERE id = ?
        `,
      )
      .bind(txHash, txHash, now, now, eventId)
      .run();
  } catch (error) {
    const message = getErrorMessage(error);
    if (!/no such column/i.test(message) || !/failure_stage/i.test(message)) {
      throw error;
    }

    await db
      .prepare(
        `
          UPDATE mint_events
          SET
            status = 'submitted',
            tx_hash = ?,
            mint_tx_hash = ?,
            submitted_at = ?,
            updated_at = ?,
            failed_at = NULL,
            failure_reason = NULL
          WHERE id = ?
        `,
      )
      .bind(txHash, txHash, now, now, eventId)
      .run();
  }
}

async function markMintFailed(db: D1Database, eventId: string, stage: MintFailureStage, error: string) {
  const now = nowIso();
  try {
    await db
      .prepare(
        `
          UPDATE mint_events
          SET
            status = 'failed',
            failed_at = ?,
            updated_at = ?,
            failure_reason = ?,
            failure_stage = ?
          WHERE id = ?
        `,
      )
      .bind(now, now, error, stage, eventId)
      .run();
  } catch (updateError) {
    const message = getErrorMessage(updateError);
    if (!/no such column/i.test(message) || !/failure_stage/i.test(message)) {
      throw updateError;
    }

    await db
      .prepare(
        `
          UPDATE mint_events
          SET
            status = 'failed',
            failed_at = ?,
            updated_at = ?,
            failure_reason = ?
          WHERE id = ?
        `,
      )
      .bind(now, now, error, eventId)
      .run();
  }
}

async function applyConfirmedBalance(db: D1Database, walletAddress: string, amountRaw: string) {
  const now = nowIso();
  await db
    .prepare(
      `
        INSERT INTO balance_cache (wallet_address, balance, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(wallet_address)
        DO UPDATE SET
          balance = CAST(ROUND(CAST(balance_cache.balance AS REAL) + CAST(excluded.balance AS REAL), 6) AS TEXT),
          updated_at = excluded.updated_at
      `,
    )
    .bind(walletAddress, amountRaw, now)
    .run();
}

async function markMintConfirmed(db: D1Database, eventId: string, walletAddress: string, amountRaw: string) {
  const now = nowIso();
  await applyConfirmedBalance(db, walletAddress, amountRaw);
  try {
    await db
      .prepare(
        `
          UPDATE mint_events
          SET
            status = 'confirmed',
            confirmed_at = ?,
            updated_at = ?,
            failed_at = NULL,
            failure_reason = NULL,
            failure_stage = NULL
          WHERE id = ?
        `,
      )
      .bind(now, now, eventId)
      .run();
  } catch (error) {
    const message = getErrorMessage(error);
    if (!/no such column/i.test(message) || !/failure_stage/i.test(message)) {
      throw error;
    }

    await db
      .prepare(
        `
          UPDATE mint_events
          SET
            status = 'confirmed',
            confirmed_at = ?,
            updated_at = ?,
            failed_at = NULL,
            failure_reason = NULL
          WHERE id = ?
        `,
      )
      .bind(now, now, eventId)
      .run();
  }
}

export async function processMintLifecycle(
  db: D1Database,
  env: OnchainEnv,
  input: { queuedLimit?: number; submittedLimit?: number } = {},
) {
  const configError = getOnchainConfigError(env);
  const signer = getOnchainSignerStatus(env);
  if (configError) {
    return {
      configured: false,
      error: configError,
      signerAddress: signer.signerAddress,
      submitted: 0,
      confirmed: 0,
      failed: 0,
    };
  }

  let submitted = 0;
  let confirmed = 0;
  let failed = 0;

  const submittedEvents = await db
    .prepare(
      `
        SELECT
          id,
          COALESCE(to_wallet, wallet_address) AS toWallet,
          COALESCE(amount_raw, CAST(amount AS TEXT)) AS amountRaw,
          COALESCE(tx_hash, mint_tx_hash) AS txHash
        FROM mint_events
        WHERE status = 'submitted'
        ORDER BY submitted_at ASC
        LIMIT ?
      `,
    )
    .bind(input.submittedLimit ?? 25)
    .all<MintEventRow>();

  for (const event of submittedEvents.results ?? []) {
    if (!event.txHash) {
      await markMintFailed(db, event.id, 'receipt_check', 'Submitted event is missing tx hash');
      failed += 1;
      continue;
    }

    try {
      const receiptStatus = await getMintReceiptStatus(env, event.txHash);
      if (receiptStatus === 'pending') {
        continue;
      }

      if (receiptStatus === 'confirmed') {
        try {
          await markMintConfirmed(db, event.id, event.toWallet, event.amountRaw);
          confirmed += 1;
        } catch (error) {
          await markMintFailed(db, event.id, 'balance_update', getErrorMessage(error));
          failed += 1;
        }
        continue;
      }

      await markMintFailed(db, event.id, 'receipt_check', 'On-chain mint transaction reverted');
      failed += 1;
    } catch (error) {
      await markMintFailed(db, event.id, 'receipt_check', getErrorMessage(error));
      failed += 1;
    }
  }

  const queuedEvents = await db
    .prepare(
      `
        SELECT
          id,
          COALESCE(to_wallet, wallet_address) AS toWallet,
          COALESCE(amount_raw, CAST(amount AS TEXT)) AS amountRaw,
          COALESCE(tx_hash, mint_tx_hash) AS txHash
        FROM mint_events
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT ?
      `,
    )
    .bind(input.queuedLimit ?? 10)
    .all<MintEventRow>();

  for (const event of queuedEvents.results ?? []) {
    const claimed = await claimQueuedMintEvent(db, event.id);
    if (!claimed) {
      continue;
    }

    try {
      const simulation = await simulateMintTransaction(env, {
        toWallet: event.toWallet,
        amountTokens: event.amountRaw,
      });

      console.info('mint simulation ok', {
        eventId: event.id,
        signerAddress: simulation.signerAddress,
        toWallet: event.toWallet,
        amountRaw: event.amountRaw,
      });
    } catch (error) {
      console.error('mint simulation failed', {
        eventId: event.id,
        signerAddress: signer.signerAddress,
        toWallet: event.toWallet,
        amountRaw: event.amountRaw,
        rpcUrl: env.TOKEN_RPC_URL,
        error: getErrorMessage(error),
      });
      await markMintFailed(db, event.id, 'tx_simulation', getErrorMessage(error));
      failed += 1;
      continue;
    }

    try {
      const txHash = await submitMintTransaction(env, {
        toWallet: event.toWallet,
        amountTokens: event.amountRaw,
      });

      console.info('mint submission ok', {
        eventId: event.id,
        signerAddress: signer.signerAddress,
        toWallet: event.toWallet,
        amountRaw: event.amountRaw,
        txHash,
      });

      await markMintSubmitted(db, event.id, txHash);
      submitted += 1;
    } catch (error) {
      console.error('mint submission failed', {
        eventId: event.id,
        signerAddress: signer.signerAddress,
        toWallet: event.toWallet,
        amountRaw: event.amountRaw,
        error: getErrorMessage(error),
      });
      await markMintFailed(db, event.id, 'tx_submission', getErrorMessage(error));
      failed += 1;
    }
  }

  return {
    configured: true,
    error: null,
    signerAddress: signer.signerAddress,
    submitted,
    confirmed,
    failed,
  };
}
