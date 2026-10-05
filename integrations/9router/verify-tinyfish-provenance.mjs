import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Run against a patched source checkout, without credentials or live HTTP calls.
const root = path.resolve(process.argv[2] || '.');
const { handleFetchCore } = await import(pathToFileURL(path.join(root, 'open-sse/handlers/fetch/index.js')).href);
const bridge = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/test-token';
const destination = 'https://jobinja.ir/companies/test/jobs/123';
let finalUrl = destination;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, init) => {
  assert.deepEqual(JSON.parse(init.body), { urls: [bridge], format: 'markdown', links: true });
  return new Response(JSON.stringify({ results: [{ url: bridge, ...(finalUrl ? { final_url: finalUrl } : {}), title: 'Backend Developer', text: 'Single job page', links: ['/companies/test/jobs/124'] }], errors: [] }), { headers: { 'content-type': 'application/json' } });
};
try {
  const input = { url: bridge, format: 'markdown', maxCharacters: 10000, provider: 'tinyfish', providerConfig: { baseUrl: 'https://api.fetch.tinyfish.ai', timeoutMs: 1000 }, credentials: { apiKey: 'fixture-only' } };
  const response = await handleFetchCore(input);
  assert.equal(response.success, true);
  assert.equal(response.data.url, bridge);
  assert.equal(response.data.final_url, destination);
  assert.deepEqual(response.data.links, ['/companies/test/jobs/124']);
  finalUrl = undefined;
  const missing = await handleFetchCore(input);
  assert.equal(missing.data.final_url, null, 'Missing final URL must not be replaced with an echoed input URL');
  console.log('PASS: TinyFish links requested; true final URL preserved; missing provenance remains null. No network requests made.');
} finally { globalThis.fetch = originalFetch; }
