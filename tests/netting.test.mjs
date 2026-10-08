import assert from 'node:assert/strict';
import { netObligations, parseUSDC, formatUSDC, DEMO_PARTICIPANTS, DEMO_OBLIGATIONS } from '../lib/netting.ts';
const demo = netObligations(DEMO_PARTICIPANTS, DEMO_OBLIGATIONS);
assert.equal(demo.gross, 270_000_000n); assert.equal(demo.required, 20_000_000n); assert.equal(demo.transfers.length, 2);
assert.deepEqual([...demo.balances.values()], [-20_000_000n, 10_000_000n, 10_000_000n]);
assert.equal(parseUSDC('0.000001'), 1n); assert.equal(parseUSDC('1.000001'), 1_000_001n);
for (const bad of ['-1', '0', '1e3', 'NaN', '1.0000001', '1000000001', '']) assert.throws(() => parseUSDC(bad));
assert.equal(formatUSDC(1_000_001n, true), '1.000001');
assert.throws(() => netObligations(DEMO_PARTICIPANTS, [{ ...DEMO_OBLIGATIONS[0], to: 'a' }]));
// Deterministic property checks: transfers conserve each member's net position.
let seed = 12345;
const random = () => { seed = (seed * 16807) % 2147483647; return seed; };
for (let trial = 0; trial < 300; trial++) {
  const count = 2 + random() % 9;
  const members = Array.from({ length: count }, (_, i) => ({ id: String(i), name: String(i), address: '', color: '' }));
  const rows = Array.from({ length: 1 + random() % 64 }, (_, i) => {
    const from = random() % count; const to = (from + 1 + random() % (count - 1)) % count;
    return { id: String(i), from: String(from), to: String(to), amount: `${1 + random() % 1000}.${String(random() % 1000000).padStart(6, '0')}`, reference: '' };
  });
  const result = netObligations(members, rows);
  assert.equal([...result.balances.values()].reduce((a, b) => a + b, 0n), 0n);
  const realized = new Map(members.map(p => [p.id, 0n]));
  for (const t of result.transfers) { assert(t.amount > 0n); realized.set(t.from, realized.get(t.from) - t.amount); realized.set(t.to, realized.get(t.to) + t.amount); }
  assert.deepEqual(realized, result.balances);
  assert(result.required <= result.gross);
}
console.log('Netting passed: exact decimals, invalid inputs, demo, and 300 conservation scenarios.');
