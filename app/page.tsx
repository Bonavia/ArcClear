'use client';
import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, ChevronDown, CircleHelp, Copy, Download, ExternalLink, FileCheck2, FileText, GitBranch, Layers3, Loader2, Plus, RotateCcw, ShieldCheck, Sparkles, Trash2, Users, Wallet, X, Zap } from 'lucide-react';
import { decodeEventLog, formatUnits, isAddress, type Abi, type Address, type EIP1193Provider, type Hash } from 'viem';
import { HelpTip, TooltipLayer, UserGuide } from '@/components/help';
import { nextWorkflowStep } from '@/lib/workflow';
import { NetworkGraph } from '@/components/network-graph';
import { COLORS, formatUSDC, netObligations, parseUSDC, type Obligation, type Participant } from '@/lib/netting';
import { getClients, networks, reader, roomAbi, shortAddress, type Network } from '@/lib/chain';

type ChainRoom = { id: bigint; approvals: boolean[]; funded: boolean[]; deadline: number; settled: boolean; cancelled: boolean; hash: string };
type Receipt = { id: string; gross: string; required: string; reduction: number; participants: number; date: string; tx?: string; network: Network; planHash?: string };
type Provider = EIP1193Provider & { on?: (event: string, listener: (...args: unknown[]) => void) => void; removeListener?: (event: string, listener: (...args: unknown[]) => void) => void };
type ToolContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: object; execute: (input: unknown) => unknown }, options: { signal: AbortSignal }) => void };
const dollar = (n: bigint) => '$' + formatUSDC(n, true);
const INITIAL_PARTICIPANTS: Participant[] = [0,1,2].map(i => ({ id: String.fromCharCode(97+i), name: `Participant ${i+1}`, address: '', color: COLORS[i] }));
const emptyForm = { from: 'a', to: 'b', amount: '', reference: '' };

export default function Home() {
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [optimized, setOptimized] = useState(false);
  const [view, setView] = useState<'room' | 'receipts'>('room');
  const [modal, setModal] = useState<'obligation' | 'participants' | 'settings' | 'help' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [account, setAccount] = useState<Address>();
  const [contract, setContract] = useState('');
  const [network, setNetwork] = useState<Network>('testnet');
  const [chainRoom, setChainRoom] = useState<ChainRoom | null>(null);
  const [roomInput, setRoomInput] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tx, setTx] = useState<Hash | null>(null);
  const [txNetwork, setTxNetwork] = useState<Network>('testnet');
  const [txStatus, setTxStatus] = useState<'none' | 'pending' | 'confirmed' | 'reverted'>('none');
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [walletBalance, setWalletBalance] = useState<bigint | null>(null);
  const [syncError, setSyncError] = useState('');
  const [databaseStatus, setDatabaseStatus] = useState('Checking storage…');
  const [databaseReady, setDatabaseReady] = useState(false);
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [dbRevision, setDbRevision] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState('');
  const result = useMemo(() => netObligations(participants, obligations), [participants, obligations]);
  const locked = !!chainRoom || !!busy;
  const myIndex = participants.findIndex(p => p.address.toLowerCase() === account?.toLowerCase());
  const approvalCount = chainRoom?.approvals.filter(Boolean).length ?? 0;
  const allApproved = approvalCount === participants.length;
  const expired = chainRoom ? chainRoom.deadline <= Date.now() / 1000 : false;
  const closed = chainRoom?.cancelled || chainRoom?.settled || expired;
  const funded = !!chainRoom && participants.every((p, i) => result.balances.get(p.id)! >= BigInt(0) || chainRoom.funded[i]);
  const settled = !!chainRoom?.settled;
  const walletsReady = participants.every(p => isAddress(p.address) && !/^0x0{40}$/i.test(p.address)) && new Set(participants.map(p => p.address.toLowerCase())).size === participants.length;
  const nextStep = nextWorkflowStep({ connected: !!account, contractConfigured: isAddress(contract), walletsReady, hasObligations: !!obligations.length, isMember: myIndex >= 0, roomExists: !!chainRoom, settled, cancelled: !!chainRoom?.cancelled, expired, approved: !!chainRoom?.approvals[myIndex], allApproved, funded, requiresFunding: myIndex >= 0 && result.balances.get(participants[myIndex].id)! < BigInt(0), hasFunded: !!chainRoom?.funded[myIndex] });
  const provider = () => (window as unknown as { ethereum?: Provider }).ethereum;

  useEffect(() => {
    try {
      const saved = localStorage.getItem('arcclear-workspace-v1');
      if (saved) { const data = JSON.parse(saved);
        if (data.mode !== 'demo' && Array.isArray(data.participants) && Array.isArray(data.obligations)) { netObligations(data.participants, data.obligations); setParticipants(data.participants); setObligations(data.obligations); }
        if (Array.isArray(data.receipts)) setReceipts(data.receipts.filter((r: Receipt & {demo?:boolean}) => !r.demo && r.tx));
        if (isAddress(data.contract ?? '')) setContract(data.contract);
        if (data.network === 'mainnet' || data.network === 'testnet') setNetwork(data.network);
        if (/^\d+$/.test(data.roomId ?? '')) { setRoomInput(data.roomId); setModal('settings'); }
      }
      const params = new URLSearchParams(window.location.search);
      if (isAddress(params.get('contract') ?? '') && /^\d+$/.test(params.get('room') ?? '') && ['mainnet', 'testnet'].includes(params.get('network') ?? '')) {
        setContract(params.get('contract')!); setRoomInput(params.get('room')!); setNetwork(params.get('network') as Network); setModal('settings');
      }
    } catch { /* Invalid local data is ignored. */ }
    const p = provider();
    const changed = (...args: unknown[]) => { setAccount((args[0] as Address[])?.[0]); setWalletBalance(null); setDbRevision(null); setSavedAt(''); };
    p?.request({ method: 'eth_accounts' }).then(accounts => setAccount((accounts as Address[])[0])).catch(() => {});
    p?.on?.('accountsChanged', changed);
    return () => p?.removeListener?.('accountsChanged', changed);
  }, []);
  useEffect(() => {
    try { localStorage.setItem('arcclear-workspace-v1', JSON.stringify({ participants, obligations, receipts, contract, network, roomId: chainRoom?.id.toString() ?? (roomInput || null) })); } catch { /* Device-local storage can be disabled. */ }
  }, [participants, obligations, receipts, contract, network, chainRoom, roomInput]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    const context = (document as unknown as { modelContext?: ToolContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try { context.registerTool({ name: 'read_settlement_plan', title: 'Read settlement plan', description: 'Read net balances and funding. Never signs or executes transactions.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: input => {
      if (!input || typeof input !== 'object' || Object.keys(input).length) throw new Error('Expected an empty object.');
      return { mode: 'live', participants: participants.map(p => ({ name: p.name, netMicroUSDC: result.balances.get(p.id)!.toString() })), grossMicroUSDC: result.gross.toString(), requiredMicroUSDC: result.required.toString(), reductionPercent: result.reduction, settled };
    } }, { signal: lifecycle.signal }); } catch { /* Optional browser support. */ }
    return () => lifecycle.abort();
  }, [participants, result, settled]);

  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement | null;
    const elements = () => [...(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]') ?? [])];
    elements()[0]?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) { setModal(null); setError(''); }
      if (e.key === 'Tab') {
        const list = elements(); const first = list[0], last = list[list.length-1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [modal, busy]);

  useEffect(() => {
    if (!account) { setWalletBalance(null); return; }
    let active = true;
    const update = () => reader(network).getBalance({ address: account }).then(balance => { if (active) setWalletBalance(balance); }).catch(() => { if (active) setWalletBalance(null); });
    update(); const timer = setInterval(update, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [account, network]);

  useEffect(() => {
    if (!chainRoom || busy) return;
    let active = true, refreshing = false;
    const timer = setInterval(async () => {
      if (refreshing || !active) return;
      refreshing = true;
      try { await refreshRoom(chainRoom.id, () => active); if (active) setSyncError(''); }
      catch { if (active) setSyncError('Live updates unavailable. Use Refresh to retry.'); }
      finally { refreshing = false; }
    }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [chainRoom?.id, contract, network, busy]);

  function prepareTestPlan() {
    if (locked) return;
    setNetwork('testnet'); setParticipants(INITIAL_PARTICIPANTS.map(p => ({ ...p, address: '' })));
    setObligations([0,1,2].map(i => ({id:String(i),from:INITIAL_PARTICIPANTS[i].id,to:INITIAL_PARTICIPANTS[(i+1)%3].id,amount:['0.10','0.09','0.08'][i],reference:`Test obligation ${i+1}`})));
    resetApprovals(); setOptimized(true); setModal('participants');
    setNotice('Assign three different test wallets. Net payer funds 0.02 USDC; receivers get 0.01 each. All wallets need gas.');
  }

  async function switchWalletNetwork() {
    const p = provider(); if (!p) throw new Error('Install an Ethereum-compatible browser wallet.');
    const chain = networks[network];
    const current = await p.request({ method: 'eth_chainId' });
    if (Number(current) === chain.id) return;
    try { await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + chain.id.toString(16) }] }); }
    catch (e) {
      if ((e as { code?: number }).code !== 4902) throw e;
      await p.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x' + chain.id.toString(16), chainName: chain.name, nativeCurrency: chain.nativeCurrency, rpcUrls: [...chain.rpcUrls.default.http], blockExplorerUrls: [chain.blockExplorers.default.url] }] });
      await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + chain.id.toString(16) }] });
    }
  }

  async function deployTestContract() {
    if (network !== 'testnet' || chainRoom) throw new Error('Browser deployment is available only on Arc Testnet before a room is loaded.');
    const sender = await connect(); await switchWalletNetwork();
    const artifact = (await import('../contracts/artifacts/ArcClear.json')).default;
    const { publicClient, walletClient } = getClients(provider()!, 'testnet');
    const fees = await publicClient.estimateFeesPerGas();
    const maxFeePerGas = fees.maxFeePerGas < BigInt(20_000_000_000) ? BigInt(20_000_000_000) : fees.maxFeePerGas;
    const bytecode = artifact.bytecode as Hash;
    const gas = await publicClient.estimateGas({ account: sender, data: bytecode }) * BigInt(120) / BigInt(100);
    if (await publicClient.getBalance({ address: sender }) < gas * maxFeePerGas) throw new Error('Get test USDC from Circle’s faucet before deploying.');
    const hash = await walletClient.deployContract({ abi: artifact.abi, bytecode, account: sender, args: [], gas, type: 'eip1559', maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas });
    setTx(hash); setTxNetwork(network); setTxStatus('pending');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success' || !receipt.contractAddress) { setTxStatus('reverted'); throw new Error('Contract deployment failed. Open the explorer for details.'); }
    setTxStatus('confirmed');
    const version = await publicClient.readContract({ address: receipt.contractAddress, abi: roomAbi, functionName: 'VERSION' });
    if (version !== BigInt(2)) throw new Error('The deployed contract failed its version check.');
    setContract(receipt.contractAddress); setNotice('ArcClear deployed on Arc Testnet. Assign participant wallets, then create your room.');
  }

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await fetch('/api/health'); const status = await response.json();
        if (active) { setDatabaseReady(response.ok && status.database === 'connected'); setDatabaseStatus(response.ok ? 'PostgreSQL connected' : 'PostgreSQL unavailable'); }
      } catch { if (active) { setDatabaseReady(false); setDatabaseStatus('PostgreSQL unavailable'); } }
    };
    check(); const timer = setInterval(check, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  async function api(path: string, options: RequestInit = {}) {
    const response = await fetch('/api' + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Storage request failed.');
    return data;
  }
  async function signInWorkspace() {
    const address = await connect();
    const current = await api('/session');
    if (current.address?.toLowerCase() === address.toLowerCase()) { setSessionAddress(address); return address; }
    const challenge = await api('/auth/challenge', { method: 'POST', body: JSON.stringify({ address }) });
    const signature = await getClients(provider()!, network).walletClient.signMessage({ account: address, message: challenge.message });
    await api('/auth/verify', { method: 'POST', body: JSON.stringify({ nonce: challenge.nonce, signature }) });
    setSessionAddress(address); setDbRevision(null); return address;
  }
  async function saveWorkspace() {
    const owner = await signInWorkspace();
    let revision = sessionAddress?.toLowerCase() === owner.toLowerCase() ? dbRevision : null;
    if (revision === null) {
      const existing = await api('/workspace');
      if (existing.workspace) throw new Error('This wallet already has a saved workspace. Load it before saving changes.');
      revision = 0;
    }
    const saved = await api('/workspace', { method: 'PUT', body: JSON.stringify({ revision, data: { participants, obligations, network, contract, roomId: chainRoom?.id.toString() ?? null } }) });
    setDbRevision(Number(saved.revision)); setSavedAt(new Date(saved.updated_at).toLocaleString()); setNotice('Workspace saved to PostgreSQL. Onchain state remains authoritative.');
  }
  async function loadWorkspace() {
    await signInWorkspace(); const { workspace } = await api('/workspace');
    if (!workspace) { setDbRevision(0); setNotice('No saved workspace for this wallet yet.'); return; }
    const data = workspace.data;
    netObligations(data.participants, data.obligations);
    setParticipants(data.participants); setObligations(data.obligations); setNetwork(data.network); setContract(data.contract);
    setChainRoom(null); setRoomInput(data.roomId ?? ''); setOptimized(true); setDbRevision(Number(workspace.revision)); setSavedAt(new Date(workspace.updated_at).toLocaleString());
    if (data.roomId) { setModal('settings'); setNotice('Workspace loaded. Load the saved room from Arc to verify its current state.'); }
    else setNotice('Draft loaded from PostgreSQL.');
  }

  function resetApprovals() { setOptimized(false); setError(''); }
  function resetRoom() { if (busy) return; setParticipants(INITIAL_PARTICIPANTS); setObligations([]); setChainRoom(null); setRoomInput(''); resetApprovals(); setTx(null); setTxStatus('none'); setView('room'); }
  function addObligation() {
    try {
      if (!form.reference.trim()) throw new Error('Add a short reference.');
      const next = [...obligations, { ...form, id: crypto.randomUUID(), amount: form.amount.trim(), reference: form.reference.trim() }];
      netObligations(participants, next); setObligations(next); resetApprovals(); setModal(null); setForm(emptyForm);
    } catch (e) { setError((e as Error).message); }
  }
  function saveReceipt(receipt: Receipt) { setReceipts(current => current.some(r => r.id === receipt.id) ? current : [receipt, ...current]); }
  function downloadPlan() {
    const output = { version: 1, mode: 'live', network, contract: contract || null, roomId: chainRoom?.id.toString() ?? null, participants, obligations, netBalancesMicroUSDC: Object.fromEntries([...result.balances].map(([k, v]) => [k, v.toString()])), grossMicroUSDC: result.gross.toString(), requiredMicroUSDC: result.required.toString(), fundingReductionPercent: result.reduction, transfers: result.transfers.map(t => ({ ...t, amount: t.amount.toString() })), planHash: chainRoom?.hash ?? null };
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'arcclear-settlement-plan.json'; link.click(); URL.revokeObjectURL(url);
  }
  async function refreshRoom(id = chainRoom?.id, apply = () => true) {
    if (!id || !isAddress(contract)) throw new Error('Enter a valid contract address and room ID.');
    const client = reader(network);
    const version = await client.readContract({address: contract, abi: roomAbi, functionName: 'VERSION'});
    if (version !== BigInt(2)) throw new Error('This contract is not ArcClear v2. Deploy the current native-USDC contract.');
    const [raw, rows] = await Promise.all([
      client.readContract({ address: contract, abi: roomAbi, functionName: 'getRoom', args: [id] }),
      client.readContract({ address: contract, abi: roomAbi, functionName: 'getObligations', args: [id] }),
    ]);
    const [members, net, approvals, paid, deadline, complete, cancelled, planHash] = raw as [Address[], bigint[], boolean[], boolean[], bigint, boolean, boolean, string];
    const [from, to, amounts] = rows as [number[], number[], bigint[]];
    const list = members.map((address, i) => ({ id: String(i), name: shortAddress(address), address, color: COLORS[i] }));
    const chainRows = amounts.map((amount, i) => ({ id: String(i), from: String(from[i]), to: String(to[i]), amount: (amount / BigInt(1_000_000)).toString() + '.' + (amount % BigInt(1_000_000)).toString().padStart(6, '0'), reference: `Obligation ${i + 1}` }));
    const computed = netObligations(list, chainRows);
    if (net.some((b, i) => b !== computed.balances.get(String(i)))) throw new Error('Contract balances do not match its obligations.');
    if (!apply()) return;
    setParticipants(current => list.map(p => ({ ...p, name: current.find(old => old.address.toLowerCase() === p.address.toLowerCase())?.name ?? p.name })));
    setObligations(chainRows); setChainRoom({ id, approvals, funded: paid, deadline: Number(deadline), settled: complete, cancelled, hash: planHash });
    setOptimized(true); setRoomInput(id.toString());
  }
  async function connect() {
    const p = provider(); if (!p) throw new Error('Install an Ethereum-compatible wallet to connect to Arc.');
    const accounts = await p.request({ method: 'eth_requestAccounts' }) as Address[];
    if (!accounts[0]) throw new Error('No wallet account selected.');
    setAccount(accounts[0]); return accounts[0];
  }
  async function chainWrite(functionName: string, args: unknown[], value = BigInt(0)): Promise<Hash> {
    const p = provider(); if (!p) throw new Error('An Ethereum-compatible wallet is required.');
    if (!isAddress(contract)) throw new Error('Configure your deployed ArcClear contract first.');
    const accounts = await p.request({ method: 'eth_requestAccounts' }) as Address[];
    const sender = accounts[0]; if (!sender) throw new Error('Connect a wallet.'); setAccount(sender);
    if (account && sender.toLowerCase() !== account.toLowerCase()) throw new Error('Wallet account changed. Review the connected participant and retry.');
    const currentVersion = await reader(network).readContract({address: contract as Address, abi: roomAbi, functionName: 'VERSION'});
    if (currentVersion !== BigInt(2)) throw new Error('Use the current ArcClear v2 native-USDC deployment.');
    await switchWalletNetwork();
    const { publicClient, walletClient } = getClients(p, network);
    const fees = await publicClient.estimateFeesPerGas();
    const maxFeePerGas = fees.maxFeePerGas < BigInt(20_000_000_000) ? BigInt(20_000_000_000) : fees.maxFeePerGas;
    await publicClient.simulateContract({ address: contract as Address, abi: roomAbi as Abi, functionName, args, account: sender, value });
    const estimated = await publicClient.estimateContractGas({ address: contract as Address, abi: roomAbi as Abi, functionName, args, account: sender, value });
    const gas = estimated * BigInt(120) / BigInt(100);
    if (await publicClient.getBalance({address: sender}) < value + gas * maxFeePerGas) throw new Error('Not enough native USDC for this action and its gas reserve.');
    const hash = await walletClient.writeContract({ address: contract as Address, abi: roomAbi as Abi, functionName, args, account: sender, value, gas, type: 'eip1559', maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas }); setTx(hash); setTxNetwork(network); setTxStatus('pending');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') { setTxStatus('reverted'); throw new Error('Transaction reverted. Open the explorer for details.'); } setTxStatus('confirmed'); return hash;
  }
  async function action(label: string, operation: () => Promise<void>) {
    if (busy) return; setBusy(label); setError('');
    try { await operation(); } catch (e) { const p = e as { shortMessage?: string; message?: string }; const message = p.shortMessage ?? p.message ?? 'Action failed.'; setError(/reject|denied/i.test(message) ? 'The request was cancelled in your wallet. Review the plan and retry when ready.' : message); } finally { setBusy(''); }
  }
  async function createLiveRoom() {
    if (participants.some(p => !isAddress(p.address) || /^0x0{40}$/i.test(p.address))) throw new Error('Assign a valid nonzero wallet to every participant.');
    if (new Set(participants.map(p => p.address.toLowerCase())).size !== participants.length) throw new Error('Every participant needs a different wallet.');
    if (!obligations.length) throw new Error('Add an obligation first.');
    const wallet = await connect();
    if (!participants.some(p => p.address.toLowerCase() === wallet.toLowerCase())) throw new Error('The creator must be a participant.');
    const hash = await chainWrite('createRoom', [participants.map(p => p.address), obligations.map(o => participants.findIndex(p => p.id === o.from)), obligations.map(o => participants.findIndex(p => p.id === o.to)), obligations.map(o => parseUSDC(o.amount)), BigInt(Math.floor(Date.now() / 1000) + deadlineDays * 86400)]);
    const receipt = await reader(network).getTransactionReceipt({ hash });
    const log = receipt.logs.find(log => log.address.toLowerCase() === contract.toLowerCase() && (() => { try { return decodeEventLog({ abi: roomAbi, data: log.data, topics: log.topics }).eventName === 'RoomCreated'; } catch { return false; } })());
    if (!log) throw new Error('Creation confirmed. Find the room ID in the explorer.');
    const decoded = decodeEventLog({ abi: roomAbi, data: log.data, topics: log.topics });
    const id = (decoded.args as unknown as { roomId: bigint }).roomId;
    await refreshRoom(id); setNotice(`Room #${id} created. Share its link with participants.`);
  }
  async function fundLive() {
    if (!chainRoom || myIndex < 0) throw new Error('Connect a participant wallet.');
    const amount = -result.balances.get(participants[myIndex].id)!;
    if (amount <= BigInt(0)) throw new Error('This wallet has no net payment.');
    setBusy('Fund native USDC'); await chainWrite('fund', [chainRoom.id], amount * BigInt(1_000_000_000_000)); await refreshRoom(); setNotice('Your net USDC payment is funded.');
  }
  async function settleLive() {
    if (!chainRoom) return;
    const hash = await chainWrite('settle', [chainRoom.id]); await refreshRoom();
    saveReceipt({ id: `${network}-${contract}-${chainRoom.id}`, gross: result.gross.toString(), required: result.required.toString(), reduction: result.reduction, participants: participants.length, date: new Date().toISOString(), tx: hash, network, planHash: chainRoom.hash });
    setNotice('Settlement confirmed. All net payouts completed together.');
  }
  async function copyLink() {
    if (!chainRoom) return;
    const url = new URL(window.location.origin); url.searchParams.set('contract', contract); url.searchParams.set('room', chainRoom.id.toString()); url.searchParams.set('network', network);
    await navigator.clipboard.writeText(url.toString()); setNotice('Room link copied. Participants can load the same onchain plan.');
  }

  function runNextStep() {
    if (busy) return;
    switch (nextStep.id) {
      case 'connect': return action('Connect to Arc', async () => { await connect(); await switchWalletNetwork(); });
      case 'contract': setError(''); setModal('settings'); return;
      case 'participants': case 'member': setError(''); setModal('participants'); return;
      case 'obligation': setForm({from:participants[0].id,to:participants[1].id,amount:'',reference:''}); setError(''); setModal('obligation'); return;
      case 'create': return action('Create room', createLiveRoom);
      case 'approve': return action('Approve plan', async () => { await chainWrite('approveRoom',[chainRoom!.id,true]); await refreshRoom(); });
      case 'wait-approvals': case 'wait-funding': return action('Refresh room', async () => { await refreshRoom(); });
      case 'fund': return action('Fund net payment', fundLive);
      case 'settle': return action('Settle on Arc', settleLive);
      case 'refund': return action('Refund deposit', async () => { await chainWrite('refund',[chainRoom!.id]); await refreshRoom(); });
    }
  }
  const liveButton = () => <button className="button primary full" disabled={!!busy || !!nextStep.disabled} data-help={nextStep.body} onClick={runNextStep}>{busy ? <Loader2 className="spin" size={17}/> : settled ? <CheckCircle2 size={17}/> : <Zap size={17}/>} {busy || nextStep.label}</button>;

  return <div className="app-shell" aria-busy={!!busy}>
    <aside className="sidebar">
      <a href="/" className="brand"><span className="brand-mark"><Layers3 size={23}/></span>ArcClear<span className="brand-period">.</span></a>
      <div className="workspace-switch"><span className="workspace-icon">B</span><div><strong>Bonavia workspace</strong><small>USDC settlement</small></div><ChevronDown size={14}/></div>
      <span className="nav-label">WORKSPACE</span>
      <button className={`nav-item ${view === 'room' ? 'active' : ''}`} onClick={() => setView('room')}><GitBranch size={18}/>Settlement room<span className="nav-count">1</span></button>
      <button className={`nav-item ${view === 'receipts' ? 'active' : ''}`} onClick={() => setView('receipts')}><FileCheck2 size={18}/>Receipts{receipts.length > 0 && <span className="nav-count">{receipts.length}</span>}</button>
      <button className="nav-item" onClick={() => {setModal('participants');setError('');}}><Users size={18}/>Participants<span className="nav-count">{participants.length}</span></button>
      <span className="nav-label second-label">TOOLS</span>
      <button className="nav-item" onClick={() => setModal('help')}><CircleHelp size={18}/>User guide</button>
      <div className="sidebar-bottom"><div className="arc-emblem"><span>arc</span><small>BUILT FOR SETTLEMENT</small></div><div className="network-label"><span className="network-dot"/>USDC-native infrastructure</div><small className="version">ArcClear / v0.2</small></div>
    </aside>
    <main>
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{view === 'room' ? 'Settlement room' : 'Receipts'}</strong></div><div className="top-actions"><button className="guide-link" onClick={()=>setModal('help')}><CircleHelp size={16}/>User guide</button><span className="network-tag"><span className="network-dot"/>{networks[network].name}</span><button className="wallet-button" disabled={!!busy} onClick={() => action('Connect wallet', async () => {await connect();setNotice('Wallet connected.');})}><Wallet size={16}/>{account ? shortAddress(account) : 'Connect wallet'}</button></div></header>
      <div className="page-content">
        {notice && <div className="notice" role="status"><CheckCircle2 size={18}/>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16}/></button></div>}
        {error && !modal && <div className="error" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
        {view === 'room' ? <>
          <div className="page-heading"><div><div className="eyebrow">MULTILATERAL CLEARING</div><h1>Less money moving.<br className="mobile-break"/> More business settled.</h1><p>Clear shared obligations with a single net settlement.</p></div><button className="button secondary" onClick={resetRoom} disabled={!!busy}><Plus size={17}/>New room</button></div>
          <div className="room-toolbar"><div className="room-title"><span className="room-icon"><GitBranch size={19}/></span><div><strong>{chainRoom ? `Settlement room #${chainRoom.id}` : 'New settlement draft'}</strong><span>{participants.length} participants <i>·</i> {obligations.length} obligations</span></div><span className={`status-badge ${settled ? 'success' : ''}`}>{settled ? 'Settled' : chainRoom?.cancelled ? 'Cancelled' : expired ? 'Expired' : chainRoom ? 'Onchain room' : 'Draft'}</span></div><span className="network-tag">Live on Arc</span></div>
          <div className="mobile-tools"><button onClick={()=>{setModal('participants');setError('');}}><Users size={15}/>Participants</button><button onClick={()=>setView('receipts')}><FileCheck2 size={15}/>Receipts</button></div>
          <section className="next-step-panel" aria-label="Next step"><span className="next-step-number">{nextStep.step}</span><div><span className="eyebrow">{busy ? 'ACTION IN PROGRESS' : 'YOUR NEXT STEP'}</span><h2>{busy || nextStep.title}</h2><p>{busy ? txStatus === 'pending' && /Create|Deploy|Approve|Fund|Settle|Refund|Cancel/.test(busy) ? 'Transaction submitted. Wait for confirmation or check its explorer link below.' : 'Check your wallet for a request. The site will update after the action completes.' : nextStep.body}</p></div><button className="button secondary compact" onClick={()=>setModal('help')}><CircleHelp size={16}/>User guide</button></section>
          <section className="panel storage-panel" aria-label="Workspace storage"><div><strong>{databaseStatus}</strong><p>{savedAt ? `Last saved ${savedAt}` : databaseReady ? 'Save drafts and room references with wallet sign-in.' : 'Saving is unavailable. Your draft stays in this browser; live Arc transactions can still work.'}</p></div><div><button className="button secondary compact" disabled={!!busy||!databaseReady} onClick={()=>action('Load saved workspace',loadWorkspace)}>Load workspace</button><button className="button primary compact" disabled={!!busy||!databaseReady} onClick={()=>action('Save workspace',saveWorkspace)}>Save workspace</button></div></section>
          <section className="panel workflow-panel" aria-label="Real settlement workflow">
            <div className="panel-heading"><div><h2>{network === 'testnet' ? 'Test the real workflow' : 'Live settlement workflow'}</h2><p>{network === 'testnet' ? 'Real onchain transactions using test USDC. Every action is signed in your wallet.' : 'Transactions use real USDC. Review every wallet confirmation.'}</p></div>{network === 'testnet' && !locked && <button className="button secondary compact" onClick={prepareTestPlan}>Use 0.02 USDC test plan</button>}</div>
            <ol className="workflow-steps">
              <li className={account ? 'complete' : ''}><strong>1. Connect & fund wallets</strong><span>{account ? shortAddress(account) : 'Connect a browser wallet'}{walletBalance !== null && ` · ${Number(formatUnits(walletBalance,18)).toFixed(4)} USDC`}</span><div><button disabled={!!busy} onClick={()=>action('Connect to Arc',async()=>{await connect();await switchWalletNetwork();})}>Connect to Arc</button>{network==='testnet' && <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">Get test USDC ↗</a>}</div></li>
              <li className={isAddress(contract) ? 'complete' : ''}><strong>2. Set up contract</strong><span>{isAddress(contract) ? `${shortAddress(contract)} · address configured` : 'Deploy once or enter an existing address'}</span><div>{network==='testnet' && !chainRoom && !isAddress(contract) && <button disabled={!!busy} onClick={()=>action('Deploy testnet contract',deployTestContract)}>Deploy with wallet</button>}<button disabled={!!busy} onClick={()=>setModal('settings')}>Contract setup</button></div></li>
              <li className={chainRoom ? 'complete' : ''}><strong>3. Create & approve room</strong><span>{chainRoom ? `${approvalCount}/${participants.length} approvals · room #${chainRoom.id}` : 'Assign unique participant wallets, then create'}</span><div><button disabled={!!busy} onClick={()=>setModal('participants')}>Participant wallets</button>{chainRoom && <button disabled={!!busy} onClick={()=>action('Copy room link',copyLink)}>Share room</button>}</div></li>
              <li className={settled ? 'complete' : ''}><strong>4. Fund & settle</strong><span>{settled ? 'Settlement confirmed on Arc' : chainRoom && funded ? 'Net funding complete' : 'Payers fund only their net balance, plus gas'}</span><div><span>Use the settlement action below</span></div></li>
            </ol>
            <p className="workflow-note">Use three different wallet accounts for the test plan. Each account needs USDC for gas and signs its own approval. {chainRoom && 'Room state refreshes every 5 seconds.'} {syncError}</p>
          </section>
          <section className="metrics" aria-label="Settlement metrics">
            <div className="metric"><span>Invoice value<HelpTip text="Total value of all agreed obligations before netting. This is not the amount you deposit."/><FileText size={17}/></span><strong>{dollar(result.gross)}<small>USDC</small></strong><p>Across {obligations.length} agreed obligations</p></div>
            <div className="metric"><span>USDC required<HelpTip text="Total net deposits needed from payers. USDC gas fees are separate; receivers do not deposit."/><Wallet size={17}/></span><strong>{dollar(result.required)}<small>USDC</small></strong><p>Native USDC, excluding gas</p></div>
            <div className="metric saving"><span>Funding reduction<HelpTip text="Net funding reduction compared with the sum of invoice values. It is not profit, a discount, or debt forgiveness."/><Sparkles size={17}/></span><strong>{result.reduction.toFixed(1)}<small>%</small></strong><p>↘ {dollar(result.saved)} less funding required</p></div>
            <div className="metric"><span>Net routes<HelpTip text="Logical payment routes after netting. The contract pools payer deposits and pays net receivers atomically."/><GitBranch size={17}/></span><strong>{result.transfers.length}<small>transfers</small></strong><p>One atomic settlement transaction</p></div>
          </section>
          <div className="primary-grid">
            <section className="panel network-panel"><div className="panel-heading"><div><h2>Payment network</h2><p>{optimized ? 'Only the net balances need to move.' : 'See how your obligations connect.'}</p></div><div className="graph-toggle"><button className={!optimized ? 'selected' : ''} onClick={() => setOptimized(false)}>Original</button><button className={optimized ? 'selected' : ''} onClick={() => setOptimized(true)}>Optimized</button></div></div>
              <div className="graph-area"><div className="graph-note"><span className={optimized ? 'key-dot blue' : 'key-dot'}/>{optimized ? 'Net USDC transfers' : 'Gross USDC obligations'}</div><NetworkGraph participants={participants} obligations={obligations} transfers={result.transfers} optimized={optimized}/><span className="graph-unit">ALL AMOUNTS IN USDC</span></div>
              <div className="network-footer"><ShieldCheck size={17}/><span>Same obligations. Less capital in motion.</span><button onClick={downloadPlan}><Download size={15}/>Export plan</button></div>
            </section>
            <section className="panel settlement-panel"><div className="panel-heading"><div><h2>Settlement plan</h2><p>Native USDC funding. No token allowance.</p></div><span className="plan-icon"><Zap size={18}/></span></div>
              <div className="plan-total"><span>NET FUNDING REQUIRED</span><strong>{dollar(result.required)}<small>USDC</small></strong><div className="funding-bar"><span style={{width:`${result.required > BigInt(0) && result.gross > BigInt(0) ? Math.max(1, 100 - result.reduction) : 0}%`}}/></div><div className="funding-caption"><span>Net funding</span><strong>{result.reduction.toFixed(1)}% reduction</strong></div></div>
              <div className="net-list">{participants.map((p, i) => { const net = result.balances.get(p.id)!; const isApproved = chainRoom?.approvals[i]; return <div className="net-row" key={p.id}><span className="avatar" style={{background:p.color + '16',color:p.color}}>{p.name[0]}</span><div><strong>{p.name}</strong><small>{net < BigInt(0) ? 'Net payer' : net > BigInt(0) ? 'Net receiver' : 'Fully offset'}</small></div><div className={`net-amount ${net < BigInt(0) ? 'pay' : 'receive'}`}><strong>{net < BigInt(0) ? '−' : net > BigInt(0) ? '+' : ''}{dollar(net < BigInt(0) ? -net : net)}</strong><small>{settled ? 'Settled' : !chainRoom ? 'Draft' : chainRoom?.funded[i] ? 'Funded' : isApproved ? 'Approved' : 'Pending approval'}</small></div></div>; })}</div>
              <div className="approval-progress"><div><span>Participant approvals<HelpTip text="Every listed wallet approves the same immutable plan. Creation does not approve it automatically. Funding starts only after all approvals."/></span><strong>{approvalCount}/{participants.length}</strong></div><div className="approval-track">{participants.map((p,i) => <span key={p.id} className={chainRoom?.approvals[i] ? 'complete' : ''}/>)}</div></div>
              <div className="settlement-actions"><p className="action-explanation">{nextStep.body}</p>
                  {liveButton()}<small className="action-footnote">{network === 'mainnet' ? 'Real USDC · wallet confirmation required' : 'Arc Testnet · test USDC only'}</small>
                  {chainRoom && <div className="live-secondary"><button disabled={!!busy} onClick={() => action('Refresh room',async () => {await refreshRoom();})}><RotateCcw size={13}/>Refresh</button><button onClick={() => action('Copy room link',copyLink)}><Copy size={13}/>Share room</button>{myIndex >= 0 && !closed && <button disabled={!!busy} onClick={() => action('Cancel room',async () => {await chainWrite('cancel',[chainRoom.id]);await refreshRoom();})}>Cancel room</button>}</div>}
              </div>
            </section>
          </div>
          <section className="panel obligations-panel"><div className="panel-heading"><div><h2>Obligations<span className="number-pill">{obligations.length}</span></h2><p>{chainRoom ? 'Immutable obligations read from Arc.' : 'Add payments your participants agree to clear.'}</p></div><button className="button secondary compact" disabled={locked} onClick={() => {setForm({from:participants[0].id,to:participants[1].id,amount:'',reference:''});setError('');setModal('obligation');}}><Plus size={16}/>Add obligation</button></div>
            <div className="table-scroll"><table><thead><tr><th>FROM</th><th>TO</th><th>REFERENCE</th><th className="amount-col">AMOUNT</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{obligations.map(o => {const from = participants.find(p=>p.id===o.from)!, to=participants.find(p=>p.id===o.to)!;return <tr key={o.id}><td><span className="table-member"><span className="mini-avatar" style={{background:from.color+'14',color:from.color}}>{from.name[0]}</span>{from.name}</span></td><td><span className="table-member"><span className="mini-avatar" style={{background:to.color+'14',color:to.color}}>{to.name[0]}</span>{to.name}</span></td><td className="reference">{o.reference}</td><td className="amount-col"><strong>{formatUSDC(parseUSDC(o.amount),true)}</strong><small> USDC</small></td><td><span className={`row-status ${settled ? 'cleared' : ''}`}>{settled ? <Check size={12}/> : <span/>}{settled ? 'Cleared' : chainRoom ? 'Onchain' : 'Draft'}</span></td><td><button className="icon-button" aria-label={`Remove ${o.reference}`} data-help={locked ? 'Onchain obligations cannot be removed. Start a new draft to edit a plan.' : 'Remove this obligation from the local draft. No transaction or payment is sent.'} disabled={locked} onClick={() => {setObligations(obligations.filter(row=>row.id!==o.id));resetApprovals();}}><Trash2 size={15}/></button></td></tr>;})}</tbody></table>{!obligations.length && <div className="empty-table">No obligations yet. Add a payment to calculate your settlement.</div>}</div>
            <div className="table-footer"><span><ShieldCheck size={14}/>Every participant must approve the onchain plan.</span><strong>{formatUSDC(result.gross,true)} USDC total</strong></div>
          </section>
          {tx && <div className="transaction-link" role="status">{txStatus === 'pending' ? <Loader2 size={16} className="spin"/> : <CheckCircle2 size={16}/>}<strong>{txStatus === 'pending' ? 'Submitted · awaiting confirmation' : txStatus === 'reverted' ? 'Transaction reverted' : 'Transaction confirmed'}</strong><a href={`${networks[txNetwork].blockExplorers.default.url}/tx/${tx}`} target="_blank" rel="noreferrer">View latest transaction <ExternalLink size={13}/></a></div>}
          <footer className="page-footer"><span>Native USDC settlement. Built on Arc.</span><button onClick={() => setModal('help')}>How does netting work?<CircleHelp size={14}/></button></footer>
        </> : <>
          <div className="page-heading"><div><div className="eyebrow">SETTLEMENT HISTORY</div><h1>Your clearing receipts.</h1><p>Completed settlements from this device.</p></div><button className="button secondary" onClick={() => setView('room')}><GitBranch size={17}/>Back to room</button></div>
          {receipts.length ? <div className="receipt-grid">{receipts.map(r => <article className="panel receipt-card" key={r.id}><div className="receipt-top"><span className="receipt-icon"><FileCheck2 size={24}/></span><span className="status-badge success">Arc confirmed</span></div><h2>{dollar(BigInt(r.gross))} cleared</h2><p>{r.participants} participants · {new Date(r.date).toLocaleDateString()}</p><div className="receipt-detail"><span>USDC transferred</span><strong>{dollar(BigInt(r.required))}</strong></div><div className="receipt-detail"><span>Funding reduction</span><strong className="blue-text">{r.reduction.toFixed(1)}%</strong></div><a className="receipt-link" href={`${networks[r.network].blockExplorers.default.url}/tx/${r.tx}`} target="_blank" rel="noreferrer">View transaction<ExternalLink size={14}/></a></article>)}</div> : <div className="panel receipt-empty"><FileCheck2 size={42}/><h2>No settlements yet</h2><p>Settle a live room to create your first receipt.</p><button className="button primary" onClick={() => setView('room')}>Open settlement room</button></div>}
        </>}
      </div>
    </main>
    {modal && <div className="modal-backdrop" onClick={e => {if(e.target===e.currentTarget && !busy){setModal(null);setError('');}}}><section className={`modal ${modal === 'participants' || modal === 'help' ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><h2 id="modal-title">{modal === 'obligation' ? 'Add an obligation' : modal === 'participants' ? 'Room participants' : modal === 'settings' ? 'Contract setup' : 'ArcClear user guide'}</h2><button aria-label="Close dialog" disabled={!!busy} onClick={() => {setModal(null);setError('');}}><X size={20}/></button></div>
      {error && <div className="error" role="alert">{error}</div>}
      {modal === 'obligation' && <form onSubmit={e=>{e.preventDefault();addObligation();}}><div className="form-pair"><label>From<HelpTip text="The participant who owes this debt. Must differ from To."/><select value={form.from} onChange={e=>setForm({...form,from:e.target.value})}>{participants.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>To<HelpTip text="The participant who receives this debt. Must differ from From."/><select value={form.to} onChange={e=>setForm({...form,to:e.target.value})}>{participants.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><label>Amount in USDC<HelpTip text="Enter a positive amount with up to six decimals. Other obligations may offset this amount."/><input autoFocus required inputMode="decimal" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Reference<HelpTip text="A short local label for the obligation, up to 80 characters."/><input required maxLength={80} placeholder="e.g. Development sprint" value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/></label><p className="form-note">Participants approve the complete plan before live funding.</p><button className="button primary full" type="submit"><Plus size={17}/>Add obligation</button></form>}
      {modal === 'participants' && <><p className="modal-description">Name participants and assign wallets for live settlement.</p>{locked && <div className="info-box">This plan is locked. Start a new room to edit participants.</div>}<div className="participant-editor">{participants.map((p,i)=><div className="participant-edit-row" key={p.id}><span className="avatar" style={{background:p.color+'16',color:p.color}}>{p.name[0]||'?'}</span><div><label><span className="sr-only">Participant {i+1} name</span><input disabled={locked} maxLength={24} value={p.name} onChange={e=>{setParticipants(participants.map(x=>x.id===p.id?{...x,name:e.target.value||'Participant'}:x));}}/></label><label><span className="sr-only">Participant {i+1} wallet</span><input disabled={locked} className="address-input" placeholder="Wallet address · 0x…" value={p.address} onChange={e=>{setParticipants(participants.map(x=>x.id===p.id?{...x,address:e.target.value}:x));}}/></label></div><button className="participant-wallet-shortcut" disabled={locked||!!busy} onClick={()=>action('Assign connected wallet',async()=>{const address=await connect();setParticipants(current=>current.map(x=>x.id===p.id?{...x,address}:x));})}>Use wallet</button><button className="icon-button" aria-label={`Remove ${p.name}`} data-help={locked ? 'This plan is locked. Start a new draft to change participants.' : 'Remove this participant only if no obligation refers to them and at least two participants remain.'} disabled={locked||participants.length<=2||obligations.some(o=>o.from===p.id||o.to===p.id)} onClick={()=>{setParticipants(participants.filter(x=>x.id!==p.id));resetApprovals();}}><Trash2 size={16}/></button></div>)}</div><div className="modal-footer"><button className="button secondary" disabled={locked||participants.length>=10} onClick={()=>{setParticipants([...participants,{id:crypto.randomUUID(),name:`Participant ${participants.length+1}`,address:'',color:COLORS[participants.length]}]);resetApprovals();}}><Plus size={16}/>Add participant</button><button className="button primary" onClick={()=>{setModal(null);setError('');}}>Done</button></div></>}
      {modal === 'settings' && <><p className="modal-description">Use a deployed ArcClear contract to create or load shared rooms.</p><label>Network<HelpTip text="Testnet uses test USDC; Mainnet uses real USDC. Contract addresses and room IDs depend on this selection."/><select value={network} disabled={!!chainRoom||!!busy} onChange={e=>setNetwork(e.target.value as Network)}><option value="testnet">Arc Testnet · test USDC</option><option value="mainnet">Arc Mainnet · real USDC</option></select></label><label>ArcClear contract address<HelpTip text="Enter the deployed ArcClear v2 address for this network, not a participant wallet address."/><input placeholder="0x…" value={contract} disabled={!!chainRoom||!!busy} onChange={e=>setContract(e.target.value.trim())}/></label>{!chainRoom && <label>Room deadline<HelpTip text="Settlement must finish before this deadline. After expiry, funded payers can reclaim their own deposits."/><select value={deadlineDays} onChange={e=>setDeadlineDays(Number(e.target.value))}>{[1,3,7,14,30].map(d=><option key={d} value={d}>{d} {d===1?'day':'days'}</option>)}</select></label>}<div className="info-box"><ShieldCheck size={17}/><span>{network==='mainnet'?'Mainnet uses real USDC. Reserve extra USDC for gas.':'Testnet uses test USDC. Deploy here with your wallet, or enter an existing v2 contract.'}</span></div>{network === 'testnet' && !chainRoom && <button className="button secondary full" disabled={!!busy} onClick={()=>action('Deploy testnet contract',deployTestContract)}><Plus size={16}/>{busy || 'Deploy new testnet contract with wallet'}</button>}<label>Load an existing room<HelpTip text="Enter a positive room ID from the shared link or creation receipt, with the matching contract and network."/><input inputMode="numeric" placeholder="Room ID, e.g. 1" value={roomInput} onChange={e=>setRoomInput(e.target.value.replace(/\D/g,''))}/></label><button className="button secondary full" disabled={!!busy||! /^[1-9]\d*$/.test(roomInput)||!isAddress(contract)} onClick={()=>action('Load room',async()=>{await refreshRoom(BigInt(roomInput));setModal(null);})}>{busy?<Loader2 className="spin" size={16}/>:<Download size={16}/>}Load room from Arc</button><div className="modal-footer"><a href="https://github.com/circlefin/skills/tree/master/plugins/circle/skills/use-arc" target="_blank" rel="noreferrer" className="text-link">Arc network reference<ExternalLink size={13}/></a><button className="button primary" disabled={!!busy} onClick={()=>{if(contract&&!isAddress(contract)){setError('Enter a valid contract address.');return;}setModal(null);setError('');}}>Save setup</button></div></>}
      {modal === 'help' && <><UserGuide/><button className="button primary full" onClick={()=>setModal(null)}>Got it</button></>}
    </section></div>}
    <TooltipLayer/>
    {!!busy && <div className="busy-status" role="status"><Loader2 size={17} className="spin"/>{busy}…</div>}
  </div>;
}
