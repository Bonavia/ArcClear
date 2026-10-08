'use client';
import { useId } from 'react';
import { formatUSDC, parseUSDC, type Obligation, type Participant, type Transfer } from '@/lib/netting';

export function NetworkGraph({ participants, obligations, transfers, optimized }: { participants: Participant[]; obligations: Obligation[]; transfers: Transfer[]; optimized: boolean }) {
  const marker = useId().replace(/:/g, '');
  const n = participants.length;
  const points = participants.map((p, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / n;
    return { ...p, x: 320 + Math.cos(angle) * (n > 5 ? 192 : 165), y: 200 + Math.sin(angle) * 138 };
  });
  const edges = optimized ? transfers : obligations.map(o => ({ from: o.from, to: o.to, amount: parseUSDC(o.amount) }));
  return <svg className="network-svg" viewBox="0 0 640 425" role="img" aria-label={optimized ? 'Optimized net payment network' : 'Original obligation network'}>
    <defs><marker id={marker} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill={optimized ? '#4361ee' : '#a7b3c7'} /></marker></defs>
    <circle cx="320" cy="200" r="176" fill="none" stroke="#e9edf4" strokeDasharray="3 9" />
    <circle cx="320" cy="200" r="112" fill="none" stroke="#edf0f6" />
    <circle cx="320" cy="200" r="56" fill={optimized ? '#f0f3ff' : '#f7f9fc'} stroke="#e6ebf3" />
    <text x="320" y="195" textAnchor="middle" className="graph-center">{optimized ? 'NETTED' : 'GROSS'}</text>
    <text x="320" y="219" textAnchor="middle" className="graph-center-sub">{edges.length} {edges.length === 1 ? 'transfer' : 'transfers'}</text>
    {edges.map((e, i) => {
      const a = points.find(p => p.id === e.from), b = points.find(p => p.id === e.to);
      if (!a || !b) return null;
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
      const ux = dx / length, uy = dy / length;
      const x1 = a.x + ux * 30, y1 = a.y + uy * 30, x2 = b.x - ux * 36, y2 = b.y - uy * 36;
      const bend = 30 + (i % 3) * 12;
      const cx = (a.x + b.x) / 2 - uy * bend, cy = (a.y + b.y) / 2 + ux * bend;
      const mx = .25 * x1 + .5 * cx + .25 * x2, my = .25 * y1 + .5 * cy + .25 * y2;
      return <g key={`${e.from}-${e.to}-${i}`} className="graph-edge">
        <path d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} fill="none" stroke={optimized ? '#4361ee' : '#acb7c9'} strokeWidth={optimized ? 2.5 : 1.6} markerEnd={`url(#${marker})`} className={optimized ? 'flow-line' : ''} />
        <rect x={mx - 43} y={my - 12} width="86" height="25" rx="8" fill="white" stroke={optimized ? '#dce3ff' : '#e5eaf2'} />
        <text x={mx} y={my + 5} textAnchor="middle" className="edge-amount" fill={optimized ? '#4361ee' : '#67758c'}>{formatUSDC(e.amount, true)}</text>
      </g>;
    })}
    {points.map(p => <g key={p.id}>
      <circle cx={p.x} cy={p.y} r="31" fill="white" stroke="#e6ebf3" strokeWidth="5" />
      <circle cx={p.x} cy={p.y} r="25" fill={p.color} />
      <text x={p.x} y={p.y + 6} textAnchor="middle" fill="white" className="node-initial">{p.name.slice(0, 1).toUpperCase()}</text>
      <rect x={p.x - 69} y={p.y + 38} width="138" height="24" rx="7" fill="white" fillOpacity=".94" />
      <text x={p.x} y={p.y + 55} textAnchor="middle" className="node-name">{p.name.length > 18 ? p.name.slice(0, 17) + '…' : p.name}</text>
    </g>)}
  </svg>;
}
