import { Wallet } from 'xrpl';
import { getClient, submitTransaction } from './client.js';
import { config } from '../../config/index.js';
import { asTransaction, asRecord, asRecordArray } from './utils.js';
import type { XRPLCredential } from '../../types/index.js';

export const CredentialTypes = {
  BUSINESS_VERIFICATION: 'BusinessVerification',
  KYC_COMPLETE: 'KYCComplete',
  AML_SCREENED: 'AMLScreened',
  CERTIFIED_INSPECTOR: 'CertifiedInspector',
  TRADE_FINANCE_APPROVED: 'TradeFinanceApproved',
} as const;

function stringToHex(str: string): string {
  return Buffer.from(str).toString('hex').toUpperCase();
}

function toRippleTime(unixTime: number): number {
  return unixTime - config.rippleEpochOffset;
}

export async function issueCredential(
  issuerWallet: Wallet,
  subjectAddress: string,
  credentialType: string,
  options: {
    expirationDays?: number;
    uri?: string;
  } = {}
): Promise<XRPLCredential> {
  const client = await getClient();

  const credentialCreateTx: Record<string, unknown> = {
    TransactionType: 'CredentialCreate',
    Account: issuerWallet.address,
    Subject: subjectAddress,
    CredentialType: stringToHex(credentialType),
  };

  if (options.expirationDays) {
    const expirationTime =
      Math.floor(Date.now() / 1000) + options.expirationDays * 24 * 60 * 60;
    credentialCreateTx.Expiration = toRippleTime(expirationTime);
  }

  if (options.uri) {
    credentialCreateTx.URI = stringToHex(options.uri);
  }

  const prepared = await client.autofill(asTransaction(credentialCreateTx));
  const signed = issuerWallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`Credential issuance failed: ${result.result}`);
  }

  console.log(`[XRPL] Credential issued: ${credentialType} to ${subjectAddress}`);

  return {
    issuer: issuerWallet.address,
    subject: subjectAddress,
    credentialType,
    expiration: credentialCreateTx.Expiration as number | undefined,
    accepted: false,
    transactionHash: result.hash,
  };
}

export async function acceptCredential(
  subjectWallet: Wallet,
  issuerAddress: string,
  credentialType: string
): Promise<{ success: boolean; hash: string }> {
  const client = await getClient();

  const credentialAcceptTx = {
    TransactionType: 'CredentialAccept',
    Account: subjectWallet.address,
    Issuer: issuerAddress,
    CredentialType: stringToHex(credentialType),
  };

  const prepared = await client.autofill(asTransaction(credentialAcceptTx));
  const signed = subjectWallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`Credential acceptance failed: ${result.result}`);
  }

  console.log(`[XRPL] Credential accepted: ${credentialType} from ${issuerAddress}`);

  return {
    success: true,
    hash: result.hash,
  };
}

export async function deleteCredential(
  wallet: Wallet,
  issuerAddress: string,
  subjectAddress: string,
  credentialType: string
): Promise<boolean> {
  const client = await getClient();

  const credentialDeleteTx = {
    TransactionType: 'CredentialDelete',
    Account: wallet.address,
    Issuer: issuerAddress,
    Subject: subjectAddress,
    CredentialType: stringToHex(credentialType),
  };

  const prepared = await client.autofill(asTransaction(credentialDeleteTx));
  const signed = wallet.sign(prepared);
  const result = await submitTransaction(signed.tx_blob);

  if (!result.success) {
    throw new Error(`Credential deletion failed: ${result.result}`);
  }

  console.log(`[XRPL] Credential deleted: ${credentialType}`);
  return true;
}

export async function getCredential(
  issuerAddress: string,
  subjectAddress: string,
  credentialType: string
): Promise<XRPLCredential | null> {
  const client = await getClient();

  try {
    const response = await client.request({
      command: 'ledger_entry',
      credential: {
        issuer: issuerAddress,
        subject: subjectAddress,
        credentialType: stringToHex(credentialType),
      },
      ledger_index: 'validated',
    });

    const node = asRecord((response.result as { node?: unknown }).node);

    return {
      issuer: node.Issuer as string,
      subject: node.Subject as string,
      credentialType,
      expiration: node.Expiration as number | undefined,
      accepted: ((node.Flags as number) & 0x00010000) !== 0,
      transactionHash: '',
    };
  } catch {
    return null;
  }
}

export async function getAccountCredentials(
  address: string
): Promise<Record<string, unknown>[]> {
  const client = await getClient();

  const response = await client.request({
    command: 'account_objects',
    account: address,
    type: 'credential',
    ledger_index: 'validated',
  });

  return asRecordArray(response.result.account_objects);
}

export async function verifyCredential(
  issuerAddress: string,
  subjectAddress: string,
  credentialType: string
): Promise<{
  valid: boolean;
  credential?: XRPLCredential;
  reason?: string;
}> {
  const credential = await getCredential(issuerAddress, subjectAddress, credentialType);

  if (!credential) {
    return {
      valid: false,
      reason: 'Credential not found',
    };
  }

  if (!credential.accepted) {
    return {
      valid: false,
      credential,
      reason: 'Credential not accepted by subject',
    };
  }

  if (credential.expiration) {
    const now = Math.floor(Date.now() / 1000) - config.rippleEpochOffset;
    if (credential.expiration < now) {
      return {
        valid: false,
        credential,
        reason: 'Credential expired',
      };
    }
  }

  return {
    valid: true,
    credential,
  };
}

export async function issueAndAcceptCredential(
  issuerWallet: Wallet,
  subjectWallet: Wallet,
  credentialType: string,
  options: {
    expirationDays?: number;
  } = {}
): Promise<XRPLCredential> {
  const credential = await issueCredential(
    issuerWallet,
    subjectWallet.address,
    credentialType,
    options
  );

  await acceptCredential(subjectWallet, issuerWallet.address, credentialType);

  return {
    ...credential,
    accepted: true,
  };
}

export default {
  CredentialTypes,
  issueCredential,
  acceptCredential,
  deleteCredential,
  getCredential,
  getAccountCredentials,
  verifyCredential,
  issueAndAcceptCredential,
};
