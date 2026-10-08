import fs from 'node:fs';
import solc from 'solc';
const sources = Object.fromEntries(['ArcClear.sol', 'TestParticipant.sol'].map(name => [name, { content: fs.readFileSync(`contracts/${name}`, 'utf8') }]));
const output = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources, settings: { viaIR: true, optimizer: { enabled: true, runs: 200 }, evmVersion: 'paris', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } })));
for (const error of output.errors ?? []) { if (error.severity === 'error') throw new Error(error.formattedMessage); }
fs.mkdirSync('contracts/artifacts', { recursive: true });
for (const name of ['ArcClear', 'TestParticipant']) {
  const artifact = output.contracts[`${name}.sol`][name];
  fs.writeFileSync(`contracts/artifacts/${name}.json`, JSON.stringify({ abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}` }, null, 2) + '\n');
  if (name === 'ArcClear') fs.writeFileSync('lib/contract-abi.json', JSON.stringify(artifact.abi, null, 2) + '\n');
}
console.log('Compiled ArcClear and test-only TestParticipant.');
