export type Participant = { id: string; name: string; address: string; color: string };
export type Obligation = { id: string; from: string; to: string; amount: string; reference: string };
export type Transfer = { from: string; to: string; amount: bigint };
export const COLORS = ['#4361ee', '#f97352', '#14a89a', '#a36bd1', '#db9b30', '#3283b8', '#cb527b', '#708235', '#5e62a5', '#92735a'];
export const DEMO_PARTICIPANTS: Participant[] = [
  { id: 'a', name: 'Northstar', address: '', color: COLORS[0] },
  { id: 'b', name: 'Orbit Labs', address: '', color: COLORS[1] },
  { id: 'c', name: 'Studio Three', address: '', color: COLORS[2] },
];
export const DEMO_OBLIGATIONS: Obligation[] = [
  { id: '1', from: 'a', to: 'b', amount: '100', reference: 'Design services' },
  { id: '2', from: 'b', to: 'c', amount: '90', reference: 'Development sprint' },
  { id: '3', from: 'c', to: 'a', amount: '80', reference: 'Research report' },
];

// All financial arithmetic uses integer micro-USDC. No floating-point sums.
export function parseUSDC(value: string): bigint {
  if (!/^\d{1,10}(\.\d{1,6})?$/.test(value.trim())) throw new Error('Enter a positive USDC amount with up to 6 decimal places.');
  const [whole, decimal = ''] = value.trim().split('.');
  const amount = BigInt(whole) * BigInt(1_000_000) + BigInt(decimal.padEnd(6, '0'));
  if (amount <= BigInt(0) || amount > BigInt('1000000000000000')) throw new Error('Amount must be above zero and no more than 1 billion USDC.');
  return amount;
}
export function formatUSDC(amount: bigint, full = false): string {
  const abs = amount < BigInt(0) ? -amount : amount;
  const whole = (abs / BigInt(1_000_000)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimals = (abs % BigInt(1_000_000)).toString().padStart(6, '0');
  const fraction = full ? decimals.replace(/0+$/, '') : decimals.slice(0, 2).replace(/0+$/, '');
  return `${amount < BigInt(0) ? '-' : ''}${whole}${fraction ? '.' + fraction : ''}`;
}
export function netObligations(participants: Participant[], obligations: Obligation[]) {
  if (participants.length < 2 || participants.length > 10) throw new Error('Use 2–10 participants.');
  if (new Set(participants.map(p => p.id)).size !== participants.length) throw new Error('Participant IDs must be unique.');
  if (obligations.length > 64) throw new Error('A room supports at most 64 obligations.');
  const balances = new Map(participants.map(p => [p.id, BigInt(0)]));
  let gross = BigInt(0);
  for (const row of obligations) {
    if (!balances.has(row.from) || !balances.has(row.to) || row.from === row.to) throw new Error('Choose two different room participants.');
    const amount = parseUSDC(row.amount);
    balances.set(row.from, balances.get(row.from)! - amount);
    balances.set(row.to, balances.get(row.to)! + amount);
    gross += amount;
  }
  const payers = [...balances].filter(([, b]) => b < BigInt(0)).map(([id, b]) => ({ id, left: -b }));
  const receivers = [...balances].filter(([, b]) => b > BigInt(0)).map(([id, b]) => ({ id, left: b }));
  const required = payers.reduce((s, p) => s + p.left, BigInt(0));
  const transfers: Transfer[] = [];
  let i = 0, j = 0;
  while (i < payers.length && j < receivers.length) {
    const amount = payers[i].left < receivers[j].left ? payers[i].left : receivers[j].left;
    transfers.push({ from: payers[i].id, to: receivers[j].id, amount });
    payers[i].left -= amount; receivers[j].left -= amount;
    if (payers[i].left === BigInt(0)) i++;
    if (receivers[j].left === BigInt(0)) j++;
  }
  const reduction = gross === BigInt(0) ? 0 : Number((gross - required) * BigInt(10000) / gross) / 100;
  return { balances, gross, required, saved: gross - required, reduction, transfers };
}
