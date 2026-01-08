import { Wallet } from 'xrpl';
import { getClient, submitTransaction } from './client.js';
import { asTransaction, asRecord } from './utils.js';
import type { XRPLDID } from '../../types/index.js';

export function generateDIDDocument(
  walletAddress: string,
  publicKey: string,
  options: {
    serviceName?: string;
    serviceEndpoint?: string;
  } = {}
): Record<string, unknown> {
  const did = `did:xrpl:1:${walletAddress}`;

  return {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: did,
    verificationMethod: [
      {
        id: `${did}#keys-1`,
        type: 'EcdsaSecp256k1VerificationKey2019',
        controller: did,
        publicKeyHex: publicKey,
      },
    ],
    authentication: [`${did}#keys-1`],
    service: [
      {
        id: `${did}#x-factory`,
        type: options.serviceName || 'XFactoryProfile',
        serviceEndpoint: options.serviceEndpoint || 'https://x-factory.io/profile',
      },
    ],
  };
}

export async function createDID(
  wallet: Wallet,
  uri?: string,
  didDocument?: string
): Promise<XRPLDID> {
  const client = await getClient();

  const didSetTx: Record<string, unknown> = {
    TransactionType: 'DIDSet',
    Account: wallet.address,
  };

  if (uri) {
    didSetTx.URI = Buffer.from(uri).toString('hex').toUpperCase();
  }

  if (didDocument) {
    didSetTx.DIDDocument = Buffer.from(didDocument).toString('hex').toUpperCase();
  }

  if (!uri && !didDocument) {
    const defaultUri = `https://x-factory.io/did/${wallet.address}`;
    didSetTx.URI = Buffer.from(defaultUri).toString('hex').toUpperCase();
  }

  const prepared = await client.autofill(asTransaction(didSetTx));
  const signed = wallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`DID creation failed: ${result.result}`);
  }

  const did = `did:xrpl:1:${wallet.address}`;
  console.log(`[XRPL] DID created: ${did}`);

  return {
    did,
    address: wallet.address,
    uri: uri || `https://x-factory.io/did/${wallet.address}`,
    documentHash: result.hash,
  };
}

export async function updateDID(
  wallet: Wallet,
  uri?: string,
  didDocument?: string
): Promise<XRPLDID> {
  return createDID(wallet, uri, didDocument);
}

export async function deleteDID(wallet: Wallet): Promise<boolean> {
  const client = await getClient();

  const didDeleteTx = {
    TransactionType: 'DIDDelete',
    Account: wallet.address,
  };

  const prepared = await client.autofill(asTransaction(didDeleteTx));
  const signed = wallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`DID deletion failed: ${result.result}`);
  }

  console.log(`[XRPL] DID deleted for: ${wallet.address}`);
  return true;
}

export async function getDID(address: string): Promise<XRPLDID | null> {
  const client = await getClient();

  try {
    const response = await client.request({
      command: 'ledger_entry',
      did: address,
      ledger_index: 'validated',
    });

    const node = asRecord(response.result.node);

    let uri: string | undefined;
    if (node.URI) {
      uri = Buffer.from(node.URI as string, 'hex').toString('utf8');
    }

    return {
      did: `did:xrpl:1:${address}`,
      address,
      uri,
    };
  } catch {
    return null;
  }
}

export async function resolveDID(did: string): Promise<{
  didDocument: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
}> {
  const parts = did.split(':');
  if (parts.length !== 4 || parts[0] !== 'did' || parts[1] !== 'xrpl') {
    throw new Error('Invalid XRPL DID format');
  }

  const address = parts[3];
  const onChainDID = await getDID(address);

  if (!onChainDID) {
    return {
      didDocument: null,
      metadata: {
        resolved: false,
        error: 'DID not found on ledger',
      },
    };
  }

  return {
    didDocument: {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: did,
      controller: did,
      service: onChainDID.uri
        ? [
            {
              id: `${did}#service-1`,
              type: 'LinkedDomains',
              serviceEndpoint: onChainDID.uri,
            },
          ]
        : [],
    },
    metadata: {
      resolved: true,
      address: onChainDID.address,
      uri: onChainDID.uri,
    },
  };
}

export default {
  generateDIDDocument,
  createDID,
  updateDID,
  deleteDID,
  getDID,
  resolveDID,
};
