import { Client, Wallet } from 'xrpl';
import { config } from '../../config/index.js';

let clientInstance: Client | null = null;
let connectionPromise: Promise<Client> | null = null;

export async function getClient(): Promise<Client> {
  if (clientInstance?.isConnected()) {
    return clientInstance;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = createConnection();

  try {
    clientInstance = await connectionPromise;
    return clientInstance;
  } finally {
    connectionPromise = null;
  }
}

async function createConnection(): Promise<Client> {
  const client = new Client(config.xrpl.wsUrl);

  client.on('error', (error) => {
    console.error('[XRPL] Connection error:', error);
  });

  client.on('disconnected', (code) => {
    console.log(`[XRPL] Disconnected with code: ${code}`);
    clientInstance = null;
  });

  client.on('connected', () => {
    console.log('[XRPL] Connected to', config.xrpl.wsUrl);
  });

  await client.connect();
  console.log(`[XRPL] Connected to ${config.xrpl.network} at ${config.xrpl.wsUrl}`);

  return client;
}

export async function disconnectClient(): Promise<void> {
  if (clientInstance?.isConnected()) {
    await clientInstance.disconnect();
    clientInstance = null;
    console.log('[XRPL] Disconnected');
  }
}

export async function createAndFundWallet(): Promise<{
  wallet: Wallet;
  balance: number;
}> {
  const client = await getClient();

  const fundResult = await client.fundWallet();

  console.log(`[XRPL] Created wallet: ${fundResult.wallet.address}`);
  console.log(`[XRPL] Balance: ${fundResult.balance} XRP`);

  return {
    wallet: fundResult.wallet,
    balance: fundResult.balance,
  };
}

export function getWalletFromSeed(seed: string): Wallet {
  return Wallet.fromSeed(seed);
}

export async function getAccountInfo(address: string): Promise<{
  balance: string;
  sequence: number;
}> {
  const client = await getClient();

  const response = await client.request({
    command: 'account_info',
    account: address,
    ledger_index: 'validated',
  });

  return {
    balance: response.result.account_data.Balance,
    sequence: response.result.account_data.Sequence,
  };
}

export async function submitTransaction(
  txBlob: string
): Promise<{
  success: boolean;
  hash: string;
  result: string;
  sequence?: number;
}> {
  const client = await getClient();
  const txResult = await client.submitAndWait(txBlob);

  const meta = txResult.result.meta;
  const txResultCode = typeof meta === 'object' && meta !== null
    ? (meta as { TransactionResult?: string }).TransactionResult
    : undefined;

  const success = txResultCode === 'tesSUCCESS';

  return {
    success,
    hash: txResult.result.hash,
    result: txResultCode || 'unknown',
    sequence: txResult.result.tx_json?.Sequence,
  };
}

export default {
  getClient,
  disconnectClient,
  createAndFundWallet,
  getWalletFromSeed,
  getAccountInfo,
  submitTransaction,
};
