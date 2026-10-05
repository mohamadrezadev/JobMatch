'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { patched } = require('./patch-npm-0.5.95.cjs');

async function main() {
  const packageRoot = process.argv[2];
  if (!packageRoot) throw new Error('Pass the directory containing the unmodified npm 9router@0.5.95 package.');
  const route = path.join('app', '.next-cli-build', 'server', 'app', 'api', 'v1', 'web', 'fetch', 'route.js');
  const original = fs.readFileSync(path.join(packageRoot, route));
  const changed = patched(original);
  assert.throws(() => patched(Buffer.from('different bundle')), /differs/);
  const source = changed.toString();
  const start = source.indexOf('async function l({url:a,fmt:b,timeoutMs:c,apiKey:d,maxCharacters:e,costPerQuery:f,startedAt:k,baseUrl:m})');
  const end = source.indexOf('async function m(', start);
  assert.ok(start >= 0 && end > start);
  for (const finalUrl of ['https://jobinja.ir/companies/example/jobs/42', undefined]) {
    let request;
    const context = {
      g: async (url, options) => { request = { url, body: JSON.parse(options.body) }; return { ok: true, res: { ok: true } }; },
      j: async () => ({ json: { results: [{ text: 'Actual source text', title: 'Job', links: ['https://jobinja.ir/jobs/42'], final_url: finalUrl }] } }),
      h: value => value,
      i: value => ({ url: value.url, content: { text: value.text, links: value.links } }),
    };
    const handler = vm.runInNewContext('(' + source.slice(start, end) + ')', context);
    const result = await handler({ url: 'https://example.com/input', fmt: 'markdown', timeoutMs: 1000, apiKey: 'mock', maxCharacters: 200000, startedAt: Date.now(), baseUrl: 'https://mock.invalid/fetch' });
    assert.equal(request.body.links, true);
    assert.equal(result.data.final_url, finalUrl ?? null);
    assert.equal(result.data.url, 'https://example.com/input');
    assert.equal(result.data.content.links[0], 'https://jobinja.ir/jobs/42');
  }

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'jobmatch-router-patch-'));
  const target = path.join(temp, route);
  const script = path.join(__dirname, 'patch-npm-0.5.95.cjs');
  const run = flag => spawnSync(process.execPath, [script, temp, ...(flag ? [flag] : [])], { encoding: 'utf8' });
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ name: '9router', version: '0.5.95' }));
    fs.writeFileSync(target, original);
    assert.equal(run('--check').status, 0);
    assert.deepEqual(fs.readFileSync(target), original);
    assert.equal(fs.existsSync(target + '.jobmatch-original'), false);
    assert.equal(run().status, 0);
    assert.deepEqual(fs.readFileSync(target), changed);
    assert.deepEqual(fs.readFileSync(target + '.jobmatch-original'), original);
    assert.equal(run().status, 0); // Idempotent, retains original backup.
    fs.writeFileSync(target, Buffer.from('unexpected edits'));
    assert.equal(run('--restore').status, 1);
    assert.equal(fs.readFileSync(target, 'utf8'), 'unexpected edits');
    fs.writeFileSync(target, changed);
    assert.equal(run('--restore').status, 0);
    assert.deepEqual(fs.readFileSync(target), original);
    fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ name: '9router', version: '0.5.96' }));
    assert.equal(run().status, 1);
    assert.deepEqual(fs.readFileSync(target), original);
    console.log('PASS: actual compiled TinyFish handler, missing provenance, hash/version guards, check-only, backup, idempotency, conflicting edits, and restore. No network requests.');
  } finally {
    const resolved = fs.realpathSync(temp);
    const tempRoot = fs.realpathSync(os.tmpdir());
    if (path.dirname(resolved) !== tempRoot || !path.basename(resolved).startsWith('jobmatch-router-patch-')) throw new Error('Unexpected temporary cleanup path.');
    fs.rmSync(resolved, { recursive: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
