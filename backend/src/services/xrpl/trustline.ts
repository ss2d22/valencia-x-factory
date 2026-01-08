import { Wallet } from 'xrpl';
import { getClient, submitTransaction } from './client.js';
import { config } from '../../config/index.js';
import { asTransaction } from './utils.js';

export async function createRLUSDTrustLine(
  wallet: Wallet,
  limitAmount: string = '1000000'
): Promise<{ success: boolean; hash: string }> {
  const client = await getClient();

  const trustSetTx = {
    TransactionType: 'TrustSet',
    Account: wallet.address,
    LimitAmount: {
      currency: config.rlusd.currency,
      issuer: config.rlusd.issuer,
      value: limitAmount,
    },
  };

  const prepared = await client.autofill(asTransaction(trustSetTx));
  const signed = wallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`Trust line creation failed: ${result.result}`);
  }

  console.log(`[XRPL] Trust line created for ${wallet.address}`);

  return {
    success: true,
    hash: result.hash,
  };
}

export async function createTrustLine(
  wallet: Wallet,
  currency: string,
  issuer: string,
  limitAmount: string = '1000000'
): Promise<{ success: boolean; hash: string }> {
  const client = await getClient();

  const trustSetTx = {
    TransactionType: 'TrustSet',
    Account: wallet.address,
    LimitAmount: {
      currency,
      issuer,
      value: limitAmount,
    },
  };

  const prepared = await client.autofill(asTransaction(trustSetTx));
  const signed = wallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`Trust line creation failed: ${result.result}`);
  }

  console.log(`[XRPL] Trust line created: ${currency} from ${issuer}`);

  return {
    success: true,
    hash: result.hash,
  };
}

export async function getTrustLines(
  address: string,
  currency?: string
): Promise<
  {
    currency: string;
    issuer: string;
    balance: string;
    limit: string;
  }[]
> {
  const client = await getClient();

  const response = await client.request({
    command: 'account_lines',
    account: address,
    ledger_index: 'validated',
  });

  let lines = response.result.lines;

  if (currency) {
    lines = lines.filter((line: { currency: string }) => line.currency === currency);
  }

  return lines.map((line: { currency: string; account: string; balance: string; limit: string }) => ({
    currency: line.currency,
    issuer: line.account,
    balance: line.balance,
    limit: line.limit,
  }));
}

export async function hasRLUSDTrustLine(address: string): Promise<boolean> {
  const lines = await getTrustLines(address, config.rlusd.currency);
  return lines.some((line) => line.issuer === config.rlusd.issuer);
}

export async function getRLUSDBalance(address: string): Promise<string> {
  const lines = await getTrustLines(address, config.rlusd.currency);
  const rlusdLine = lines.find((line) => line.issuer === config.rlusd.issuer);
  return rlusdLine?.balance || '0';
}

export async function enableTrustLineLocking(
  issuerWallet: Wallet
): Promise<{ success: boolean; hash: string }> {
  const client = await getClient();

  const accountSetTx = {
    TransactionType: 'AccountSet',
    Account: issuerWallet.address,
    SetFlag: 17,
  };

  const prepared = await client.autofill(asTransaction(accountSetTx));
  const signed = issuerWallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`Enable trust line locking failed: ${result.result}`);
  }

  console.log(`[XRPL] Trust line locking enabled for ${issuerWallet.address}`);

  return {
    success: true,
    hash: result.hash,
  };
}

export default {
  createRLUSDTrustLine,
  createTrustLine,
  getTrustLines,
  hasRLUSDTrustLine,
  getRLUSDBalance,
  enableTrustLineLocking,
};
