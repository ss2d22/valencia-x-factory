declare module 'five-bells-condition' {
  export class PreimageSha256 {
    setPreimage(preimage: Buffer): void;
    getConditionBinary(): Buffer;
    serializeBinary(): Buffer;
  }

  export function fromFulfillmentUri(uri: string): PreimageSha256;
  export function fulfillmentToCondition(fulfillment: PreimageSha256): unknown;
  export function validateFulfillment(fulfillment: PreimageSha256, condition: unknown): boolean;
}
