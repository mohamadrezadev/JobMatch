# TinyFish provenance patch

## Windows npm 9router@0.5.95

`patch-npm-0.5.95.cjs` is a reversible workaround for the exact published npm bundle. It checks package version, original SHA-256 and exact replacement counts, parses the modified bundle, and retains `route.js.jobmatch-original`. Other versions or unexpected edits are rejected before modification. No dependencies, network calls, API keys or account/config changes are involved. This file is outside JobMatch's runtime.

Copy the script to the Windows server, for example `C:\Users\Administrator\Desktop\patch-npm-0.5.95.cjs`. In PowerShell:

```powershell
node C:\Users\Administrator\Desktop\patch-npm-0.5.95.cjs C:\Users\Administrator\AppData\Roaming\npm\node_modules\9router --check
```

If it reports compatible, stop 9Router with its existing process manager/terminal, then apply and restart with the same start command previously used:

```powershell
node C:\Users\Administrator\Desktop\patch-npm-0.5.95.cjs C:\Users\Administrator\AppData\Roaming\npm\node_modules\9router
```

Rollback, while stopped, uses the same command with `--restore`. npm reinstall/update can overwrite this workaround; do not reuse it for another version. Verification against an unmodified unpacked npm package:

```powershell
node integrations/9router/verify-npm-0.5.95.cjs backend/.cache/9router-npm-0.5.95/package
```

That verification exercises the compiled TinyFish function with mocked upstream responses and the install/check/restore/version/hash behavior against temporary files. It makes no redirect-enforcement claims. On 2026-10-05 the user reported applying this patch and restarting their Windows npm server. Subsequent remote probes confirmed explicit final_url, listing links and a real Jobinja detail page. Local application discovery subsequently passed with real partial results using the reviewed native TinyFish private-address/redirect contract. See `openspec/changes/JM-BACK-0004-iranian-job-discovery/live-acceptance.md` for evidence and remaining production trust limits.

## Source checkout

The supplied 9Router returns rendered content for a Google grounding redirect, but echoes the Google input URL rather than exposing the reached source. Its TinyFish adapter also omits `links: true` from the upstream request. This prevents JobMatch from establishing a real source URL or traversing a result listing to its advertised jobs.

`tinyfish-provenance.patch` changes only `open-sse/handlers/fetch/index.js`: request source links and preserve TinyFish's `final_url` (null if absent). It does not invent URLs or disable source validation. Prepared against decolua/9router commit `a99cf57239ff778b61e434c2786009d5ed1c412c`; matching must be checked against the deployed version.

From the 9Router source checkout:

```powershell
git apply --check C:/jobmath-master/JobMatch/integrations/9router/tinyfish-provenance.patch
git apply C:/jobmath-master/JobMatch/integrations/9router/tinyfish-provenance.patch
node C:/jobmath-master/JobMatch/integrations/9router/verify-tinyfish-provenance.mjs .
```

Rebuild/restart with that deployment's established commands. This source-checkout variant was verified locally; the user installed the npm workaround above on their server. Source verification mocks the upstream API; it uses no keys and makes no network calls. Actual remote npm responses now include `final_url` on a permitted job source and `links` on a listing. `content.text` stays compatible with existing clients.

Separately verify provider/egress enforcement against private addresses and foreign redirect destinations. This metadata patch alone cannot prove every upstream redirect was safe and is not a reason to switch `NINEROUTER_FETCH_POLICY_VERIFIED` to true. JobMatch permits the exact Google grounding route only as a transit link; it never treats Google as a job source. It rejects bridge content when final provenance is missing, rejects foreign/private destinations, and caps all listing expansion at ten fetches per source.

After provider enforcement is established, run the authenticated discovery flow against real sources. Markdown extraction uses the configured `agents` LLM for single detail pages when structured/labeled extraction fails; quoted fields must occur in the fetched source and salary/work type normalize locally. Candidate facts remain unchanged.
