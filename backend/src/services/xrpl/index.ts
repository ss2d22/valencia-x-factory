export * from './client.js';
export * from './escrow.js';
export * from './did.js';
export * from './credentials.js';
export * from './trustline.js';

import client from './client.js';
import escrow from './escrow.js';
import did from './did.js';
import credentials from './credentials.js';
import trustline from './trustline.js';

export const xrplService = {
  client,
  escrow,
  did,
  credentials,
  trustline,
};

export default xrplService;
