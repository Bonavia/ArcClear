import { isAddress } from 'viem';
import { netObligations } from '../lib/netting.ts';
export function validateWorkspace(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.participants) || !Array.isArray(input.obligations)) throw new Error('Invalid workspace.');
  const text = (value, max, allowEmpty = false) => {
    if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) throw new Error('Invalid workspace field.');
    return value;
  };
  const participants = input.participants.map(p => ({ id: text(p.id, 80), name: text(p.name, 24), address: text(p.address, 42, true), color: /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : '#4361ee' }));
  if (participants.some(p => p.address && !isAddress(p.address))) throw new Error('Invalid participant address.');
  const obligations = input.obligations.map(o => ({ id: text(o.id, 80), from: text(o.from, 80), to: text(o.to, 80), amount: text(o.amount, 24), reference: text(o.reference, 80) }));
  netObligations(participants, obligations);
  if (!['mainnet', 'testnet'].includes(input.network)) throw new Error('Invalid network.');
  if (input.contract && !isAddress(input.contract)) throw new Error('Invalid contract address.');
  if (input.roomId !== null && input.roomId !== undefined && !/^[1-9]\d{0,77}$/.test(String(input.roomId))) throw new Error('Invalid room ID.');
  return { participants, obligations, network: input.network, contract: input.contract || '', roomId: input.roomId ? String(input.roomId) : null };
}
