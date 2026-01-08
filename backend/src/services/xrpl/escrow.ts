import { Wallet, xrpToDrops } from 'xrpl';
import cc from 'five-bells-condition';
import crypto from 'crypto';
import { getClient, submitTransaction } from './client.js';
import { config } from '../../config/index.js';
import { asTransaction, asRecord, asRecordArray } from './utils.js';
import type { XRPLEscrow } from '../../types/index.js';

export function generateConditionAndFulfillment(): {
  condition: string;
  fulfillment: string;
  preimage: string;
} {
  const preimageData = crypto.randomBytes(32);

  const myFulfillment = new cc.PreimageSha256();
  myFulfillment.setPreimage(preimageData);

  const condition = myFulfillment.getConditionBinary().toString('hex').toUpperCase();

  const fulfillment = myFulfillment.serializeBinary().toString('hex').toUpperCase();

  return {
    condition,
    fulfillment,
    preimage: preimageData.toString('hex'),
  };
}

export function toRippleTime(unixTime: number): number {
  return unixTime - config.rippleEpochOffset;
}

export async function createXRPEscrow(
  senderWallet: Wallet,
  destinationAddress: string,
  amountXRP: string,
  condition: string,
  options: {
    cancelAfterDays?: number;
    finishAfterDays?: number;
    memoData?: string;
  } = {}
): Promise<XRPLEscrow> {
  const client = await getClient();
  const now = Math.floor(Date.now() / 1000);

  const cancelAfterDays = options.cancelAfterDays ?? config.escrow.defaultCancelAfterDays;
  const finishAfterDays = options.finishAfterDays ?? config.escrow.defaultFinishAfterDays;

  const escrowCreateTx: Record<string, unknown> = {
    TransactionType: 'EscrowCreate',
    Account: senderWallet.address,
    Destination: destinationAddress,
    Amount: xrpToDrops(amountXRP),
    Condition: condition,
    CancelAfter: toRippleTime(now) + cancelAfterDays * 24 * 60 * 60,
  };

  if (finishAfterDays > 0) {
    escrowCreateTx.FinishAfter = toRippleTime(now) + finishAfterDays * 24 * 60 * 60;
  }

  if (options.memoData) {
    escrowCreateTx.Memos = [
      {
        Memo: {
          MemoType: Buffer.from('x-factory').toString('hex'),
          MemoData: Buffer.from(options.memoData).toString('hex'),
        },
      },
    ];
  }

  const prepared = await client.autofill(asTransaction(escrowCreateTx));
  const signed = senderWallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`Escrow creation failed: ${result.result}`);
  }

  console.log(`[XRPL] Escrow created: ${result.hash} (sequence: ${result.sequence})`);

  return {
    sequence: result.sequence!,
    owner: senderWallet.address,
    destination: destinationAddress,
    amount: amountXRP,
    condition,
    cancelAfter: escrowCreateTx.CancelAfter as number,
    finishAfter: escrowCreateTx.FinishAfter as number | undefined,
    status: 'created',
    transactionHash: result.hash,
  };
}

export async function createTokenEscrow(
  senderWallet: Wallet,
  destinationAddress: string,
  amountRLUSD: string,
  condition: string,
  options: {
    cancelAfterDays?: number;
    finishAfterDays?: number;
    memoData?: string;
  } = {}
): Promise<XRPLEscrow> {
  const client = await getClient();
  const now = Math.floor(Date.now() / 1000);

  const cancelAfterDays = options.cancelAfterDays ?? config.escrow.defaultCancelAfterDays;
  const finishAfterDays = options.finishAfterDays ?? config.escrow.defaultFinishAfterDays;

  const escrowCreateTx: Record<string, unknown> = {
    TransactionType: 'EscrowCreate',
    Account: senderWallet.address,
    Destination: destinationAddress,
    Amount: {
      currency: config.rlusd.currency,
      issuer: config.rlusd.issuer,
      value: amountRLUSD,
    },
    Condition: condition,
    CancelAfter: toRippleTime(now) + cancelAfterDays * 24 * 60 * 60,
  };

  if (finishAfterDays > 0) {
    escrowCreateTx.FinishAfter = toRippleTime(now) + finishAfterDays * 24 * 60 * 60;
  }

  if (options.memoData) {
    escrowCreateTx.Memos = [
      {
        Memo: {
          MemoType: Buffer.from('x-factory').toString('hex'),
          MemoData: Buffer.from(options.memoData).toString('hex'),
        },
      },
    ];
  }

  const prepared = await client.autofill(asTransaction(escrowCreateTx));
  const signed = senderWallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`Token escrow creation failed: ${result.result}`);
  }

  console.log(`[XRPL] Token escrow created: ${result.hash} (sequence: ${result.sequence})`);

  return {
    sequence: result.sequence!,
    owner: senderWallet.address,
    destination: destinationAddress,
    amount: amountRLUSD,
    condition,
    cancelAfter: escrowCreateTx.CancelAfter as number,
    finishAfter: escrowCreateTx.FinishAfter as number | undefined,
    status: 'created',
    transactionHash: result.hash,
  };
}

export async function finishEscrow(
  finisherWallet: Wallet,
  ownerAddress: string,
  escrowSequence: number,
  condition: string,
  fulfillment: string
): Promise<{ success: boolean; hash: string }> {
  const client = await getClient();

  const escrowFinishTx = {
    TransactionType: 'EscrowFinish',
    Account: finisherWallet.address,
    Owner: ownerAddress,
    OfferSequence: escrowSequence,
    Condition: condition,
    Fulfillment: fulfillment,
  };

  const prepared = await client.autofill(asTransaction(escrowFinishTx));
  const signed = finisherWallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`Escrow finish failed: ${result.result}`);
  }

  console.log(`[XRPL] Escrow finished: ${result.hash}`);

  return {
    success: true,
    hash: result.hash,
  };
}

export async function cancelEscrow(
  cancellerWallet: Wallet,
  ownerAddress: string,
  escrowSequence: number
): Promise<{ success: boolean; hash: string }> {
  const client = await getClient();

  const escrowCancelTx = {
    TransactionType: 'EscrowCancel',
    Account: cancellerWallet.address,
    Owner: ownerAddress,
    OfferSequence: escrowSequence,
  };

  const prepared = await client.autofill(asTransaction(escrowCancelTx));
  const signed = cancellerWallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`Escrow cancel failed: ${result.result}`);
  }

  console.log(`[XRPL] Escrow cancelled: ${result.hash}`);

  return {
    success: true,
    hash: result.hash,
  };
}

export async function getEscrow(
  ownerAddress: string,
  escrowSequence: number
): Promise<Record<string, unknown> | null> {
  const client = await getClient();

  try {
    const response = await client.request({
      command: 'ledger_entry',
      escrow: {
        owner: ownerAddress,
        seq: escrowSequence,
      },
      ledger_index: 'validated',
    });

    return asRecord(response.result.node);
  } catch {
    return null;
  }
}

export async function getAccountEscrows(
  address: string
): Promise<Record<string, unknown>[]> {
  const client = await getClient();

  const response = await client.request({
    command: 'account_objects',
    account: address,
    type: 'escrow',
    ledger_index: 'validated',
  });

  return asRecordArray(response.result.account_objects);
}

export default {
  generateConditionAndFulfillment,
  toRippleTime,
  createXRPEscrow,
  createTokenEscrow,
  finishEscrow,
  cancelEscrow,
  getEscrow,
  getAccountEscrows,
};
