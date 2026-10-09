import { isAddress } from 'viem';
import type { Network } from './chain';

export function readAppConfig(env: { VITE_ARC_NETWORK?: string; VITE_ARCCLEAR_CONTRACT_ADDRESS?: string }) {
  const network = env.VITE_ARC_NETWORK?.trim() || 'testnet';
  if (network !== 'testnet' && network !== 'mainnet') throw new Error('VITE_ARC_NETWORK must be testnet or mainnet.');
  const contract = env.VITE_ARCCLEAR_CONTRACT_ADDRESS?.trim() || '';
  if (contract && (!isAddress(contract) || /^0x0{40}$/i.test(contract))) throw new Error('VITE_ARCCLEAR_CONTRACT_ADDRESS must be a valid nonzero contract address.');
  return { network: network as Network, contract };
}
export const appDefaults = readAppConfig({ VITE_ARC_NETWORK: import.meta.env?.VITE_ARC_NETWORK, VITE_ARCCLEAR_CONTRACT_ADDRESS: import.meta.env?.VITE_ARCCLEAR_CONTRACT_ADDRESS });
