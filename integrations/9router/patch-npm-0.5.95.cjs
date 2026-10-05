#!/usr/bin/env node
'use strict';

// Narrow, reversible workaround for the exact published npm bundle.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ORIGINAL_SHA = '021378c4090b32128f2f36ca52a46aee370f7e3891f2f37e89165917ecf2d32d';
const edits = [
  ['body:JSON.stringify({urls:[a],format:b})', 'body:JSON.stringify({urls:[a],format:b,links:true})'],
  ['upstreamMs:p}),metadata:{author:s.author', 'upstreamMs:p}),final_url:typeof s.final_url==="string"?s.final_url:null,metadata:{author:s.author'],
];
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function patched(original) {
  if (digest(original) !== ORIGINAL_SHA) throw new Error('Bundle differs from npm 9router@0.5.95; no changes made.');
  let result = original.toString('utf8');
  for (const [before, after] of edits) {
    if (result.split(before).length !== 2) throw new Error('Unexpected TinyFish code; no changes made.');
    result = result.replace(before, after);
  }
  new vm.Script(result); // Parse the entire bundle before writing it.
  return Buffer.from(result);
}

function main() {
  const args = process.argv.slice(2);
  const rootArg = args.find(arg => !arg.startsWith('--'));
  if (!rootArg || args.some(arg => arg.startsWith('--') && !['--check', '--restore'].includes(arg)) || (args.includes('--check') && args.includes('--restore'))) {
    throw new Error('Usage: node patch-npm-0.5.95.cjs <9router-package-directory> [--check | --restore]');
  }
  const root = fs.realpathSync(rootArg);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.name !== '9router' || pkg.version !== '0.5.95') throw new Error('Only 9router@0.5.95 is supported; no changes made.');
  const target = path.join(root, 'app', '.next-cli-build', 'server', 'app', 'api', 'v1', 'web', 'fetch', 'route.js');
  const backup = target + '.jobmatch-original';
  const current = fs.readFileSync(target);
  const hasBackup = fs.existsSync(backup);
  const original = hasBackup ? fs.readFileSync(backup) : current;
  const updated = patched(original);
  const isOriginal = digest(current) === ORIGINAL_SHA;
  const isPatched = digest(current) === digest(updated);
  if (!isOriginal && !isPatched) throw new Error('Installed bundle has other edits; no changes made.');
  if (args.includes('--check')) {
    console.log(isPatched ? 'Already patched; verified.' : 'Compatible npm bundle; ready to patch.');
    return;
  }
  if (args.includes('--restore')) {
    if (!hasBackup) throw new Error('No verified backup is present; no changes made.');
    if (!isOriginal) fs.writeFileSync(target, original);
    console.log('Original bundle restored. Restart 9Router using its normal start command.');
    return;
  }
  if (isPatched) {
    console.log('Already patched; verified.');
    return;
  }
  if (!hasBackup) fs.writeFileSync(backup, original, { flag: 'wx' });
  fs.writeFileSync(target, updated);
  console.log('TinyFish links/final_url patched. Original backup retained. Restart 9Router using its normal start command.');
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { patched, ORIGINAL_SHA };
