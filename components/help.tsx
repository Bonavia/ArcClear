import { useEffect, useId, useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { controlHelp } from '@/lib/control-help';

export function HelpTip({ text }: { text: string }) {
  return <button className="help-tip-button" type="button" aria-label="Explain this field" data-help={text}><CircleHelp size={14}/></button>;
}

// Shared hover/focus tooltips also work when a section help icon is tapped.
export function TooltipLayer() {
  const id = useId();
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const target = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let previous: string | null = null;
    function clear() {
      if (target.current) { if (previous === null) target.current.removeAttribute('aria-describedby'); else target.current.setAttribute('aria-describedby', previous); }
      target.current = null; previous = null; setTip(null);
    }
    function show(el: HTMLElement) {
      if (el === target.current) return;
      clear();
      const field = el instanceof HTMLInputElement || el instanceof HTMLSelectElement;
      const fieldLabel = el.closest('label');
      const fieldText = fieldLabel ? [...fieldLabel.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(' ').trim() || fieldLabel.querySelector('.sr-only')?.textContent : '';
      const label = el.classList.contains('wallet-button') ? 'Connect wallet' : el.getAttribute('aria-label') || (field ? fieldText : el.textContent) || '';
      const disabled = 'disabled' in el && Boolean(el.disabled);
      const busy = !!document.querySelector('.busy-status');
      const text = el.dataset.help ? (disabled && busy ? 'Wait for the current action to finish. ' : '') + el.dataset.help : controlHelp(label, { disabled, field, busy });
      const bounds = el.getBoundingClientRect();
      previous = el.getAttribute('aria-describedby'); target.current = el;
      el.setAttribute('aria-describedby', [previous, id].filter(Boolean).join(' '));
      setTip({ text, x: Math.max(12, Math.min(bounds.left, window.innerWidth - Math.min(320, window.innerWidth - 24) - 12)), y: bounds.bottom + 8 > window.innerHeight - 130 ? Math.max(12, bounds.top - 120) : bounds.bottom + 8 });
    }
    const get = (event: Event) => event.target instanceof Element ? event.target.closest<HTMLElement>('.app-shell button, .app-shell input, .app-shell select, .app-shell a, .app-shell [data-help], .app-shell summary') : null;
    const enter = (event: Event) => { const el = get(event); if (el) show(el); else clear(); };
    const leave = (event: Event) => { const e = event as PointerEvent; if (!(e.relatedTarget instanceof Node) || !target.current?.contains(e.relatedTarget)) clear(); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') clear(); };
    const click = (event: Event) => { const el = get(event); if (el?.classList.contains('help-tip-button')) show(el); else clear(); };
    document.addEventListener('pointerover', enter); document.addEventListener('pointerout', leave);
    document.addEventListener('focusin', enter); document.addEventListener('focusout', clear);
    document.addEventListener('click', click); document.addEventListener('keydown', key);
    window.addEventListener('scroll', clear, true); window.addEventListener('resize', clear);
    return () => { clear(); document.removeEventListener('pointerover', enter); document.removeEventListener('pointerout', leave); document.removeEventListener('focusin', enter); document.removeEventListener('focusout', clear); document.removeEventListener('click', click); document.removeEventListener('keydown', key); window.removeEventListener('scroll', clear, true); window.removeEventListener('resize', clear); };
  }, [id]);
  return tip ? <div id={id} role="tooltip" className="control-tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div> : null;
}

export function UserGuide() {
  return <div className="usage-guide">
    <p className="modal-description">Follow the current “Next step” on the room page. Hover or focus a control for its tooltip; tap the ? icons on touch screens.</p>
    <ol className="guide-checklist">
      <li><strong>Connect and choose your network.</strong><p>Use an Ethereum-compatible browser wallet. Start on Arc Testnet, open the faucet, and give every participant test USDC for gas. Mainnet spends real USDC.</p></li>
      <li><strong>Set up the contract once.</strong><p>Deploy with your wallet on Testnet, or open Contract setup and paste an existing v2 address. Wait for the deployment confirmation before continuing.</p></li>
      <li><strong>Prepare and create the plan.</strong><p>Assign 2–10 unique wallets and add up to 64 obligations. From is the payer; To is the receiver. Use a positive amount with up to six decimals. The creator must be a participant. Review Original and Optimized, then create the immutable room.</p></li>
      <li><strong>Approve independently.</strong><p>Creation is not approval. Each member connects their own wallet and approves the complete plan. Share room copies the network, contract, and room ID. To test alone, switch among three different wallet accounts.</p></li>
      <li><strong>Fund only the difference.</strong><p>After every approval, each net payer deposits exactly their net balance as native USDC. Receivers deposit nothing. Reserve extra USDC for gas on every account.</p></li>
      <li><strong>Settle and verify.</strong><p>Once all net payers fund, a participant confirms settlement. All receiver payouts succeed together or revert. Open the explorer to verify the confirmed transaction and use Receipts for this browser's settlement history.</p></li>
    </ol>
    <details open><summary data-help="Read the small Testnet example and what each account signs.">Quick test: 0.02 USDC of net funding</summary><p>Use the small test plan: A owes B 0.10, B owes C 0.09, and C owes A 0.08 USDC. Assign three accounts. A creates the room; A, B, and C each approve. A funds 0.02 USDC and settles. B and C receive 0.01 USDC each; every account also needs gas.</p></details>
    <details><summary data-help="Understand what is stored locally, in PostgreSQL, and on Arc.">Save, load, and export</summary><p>Save workspace stores this wallet's draft and room reference in PostgreSQL after a sign-in message. That message is not a payment or contract approval. Load workspace replaces the local draft; export JSON first if you want to keep it. Load an existing room from Arc to verify its latest state. A storage outage does not stop Arc transactions. Receipts and unsaved drafts are browser-local.</p></details>
    <details><summary data-help="Learn how to recover funded USDC and start a separate draft.">Cancellation, expiry, and New room</summary><p>Any member can cancel an unsettled room. After cancellation or the deadline, each payer switches to the wallet that deposited and reclaims its own deposit. Cancellation and refunds are separate gas-paying transactions. New room starts a local draft; it does not cancel or refund the previous room. Save or export its contract and room ID before leaving.</p></details>
    <details><summary data-help="Find the reason a control is disabled or a transaction cannot proceed.">Troubleshooting</summary><ul><li><strong>No wallet:</strong> open the site in the browser with your wallet extension.</li><li><strong>Wrong participant:</strong> switch to a listed member in your wallet, then connect again if needed.</li><li><strong>Insufficient USDC:</strong> fund the net payment plus gas; receivers need gas too.</li><li><strong>Waiting for approvals/funding:</strong> the other wallets must act. Use Refresh if automatic updates fail.</li><li><strong>PostgreSQL unavailable:</strong> saved storage is offline. You can still use live transactions. If hosting the site yourself, start the Node API and configure DATABASE_URL privately.</li><li><strong>Save conflict:</strong> export your local draft, load the latest saved workspace, and apply your changes.</li><li><strong>Rejected wallet request:</strong> nothing was submitted by that rejected request. Review the plan and retry.</li><li><strong>Pending transaction:</strong> check the explorer. Do not treat a transaction hash as confirmation.</li></ul></details>
    <details><summary data-help="Understand the metrics and participant statuses.">Metrics and statuses</summary><p>Invoice value is the sum of obligations. USDC required is the sum of net deposits, excluding gas. Funding reduction compares those deposits with invoice value; it is not profit or debt forgiveness. Net routes show the logical optimized graph; the contract pays receivers from a pool. Draft is editable; Onchain is immutable; Approved records consent; Funded records a deposit; Settled means all payouts succeeded. A zero-net cycle still needs every approval, but no deposits.</p></details>
  </div>;
}
