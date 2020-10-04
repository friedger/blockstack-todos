import { ClarityValue, deserializeCV, serializeCV } from '@blockstack/stacks-transactions';

export function hexToCV(value: string): ClarityValue {
  return deserializeCV(Buffer.from(value.substr(2), 'hex'));
}

export function cvToHex(value: ClarityValue): string {
  return `0x${serializeCV(value).toString('hex')}`;
}
