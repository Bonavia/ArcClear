import { createPublicClient, createWalletClient, custom, defineChain, http, type EIP1193Provider } from 'viem';
import abi from './contract-abi.json';
export const networks = {
  mainnet: defineChain({ id: 5042, name: 'Arc Mainnet', nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } }, blockExplorers: { default: { name: 'Arc Explorer', url: 'https://explorer.arc.io' } } }),
  testnet: defineChain({ id: 5042002, name: 'Arc Testnet', nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.testnet.arc.io'] } }, blockExplorers: { default: { name: 'Arc Testnet Explorer', url: 'https://explorer.testnet.arc.io' } } }),
};
export type Network = keyof typeof networks;
export const roomAbi = abi;
export function getClients(provider: EIP1193Provider, network: Network) {
  const chain = networks[network];
  return { publicClient: createPublicClient({ chain, transport: http() }), walletClient: createWalletClient({ chain, transport: custom(provider) }) };
}
export function reader(network: Network) { return createPublicClient({ chain: networks[network], transport: http() }); }
export function shortAddress(address: string) { return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Wallet not assigned'; }
