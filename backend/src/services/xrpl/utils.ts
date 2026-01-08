import type { SubmittableTransaction } from 'xrpl';

export function asTransaction<T extends Record<string, unknown>>(
  tx: T
): SubmittableTransaction {
  return tx as unknown as SubmittableTransaction;
}

export function asRecord(obj: unknown): Record<string, unknown> {
  return obj as Record<string, unknown>;
}

export function asRecordArray(arr: unknown[]): Record<string, unknown>[] {
  return arr as Record<string, unknown>[];
}
