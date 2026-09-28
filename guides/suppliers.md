# Thomasnet Supplier Shortlist: Filters, Deduplication & CSV

Build a reviewable supplier shortlist from one to three Thomasnet searches. Deduplicate supplier IDs, filter by state, company type and source-reported certification, and export a separate certification-claims CSV.

## Ready-to-run examples

- [Export a Thomasnet supplier shortlist and certificate claims](https://apify.com/lifelong_starfruit/thomasnet-supplier-shortlist/examples/thomasnet-supplier-review-csv)
- [Filter Thomasnet name matches to manufacturers](https://apify.com/lifelong_starfruit/thomasnet-supplier-shortlist/examples/filter-thomasnet-manufacturers)

These examples create a task in your own account when you choose to try them. Review inputs and your spending limit before starting. Example companies and events are unaffiliated with this tool.

## Quick start

```json
{"queries":["Siemens"],"mode":"name","maxCandidates":5,"maxItems":5,"sourceChargeLimitUsd":0.15}
```

Open the dataset and `suppliers.csv`, `certifications.csv` and `SUMMARY` in Output. Start broad and inspect source values before applying restrictive qualification filters.

## Qualification workflow

Use `states` such as `["AZ"]`, exact `companyTypes` codes such as `["M"]`, and `requiredCertifications` text such as `["ISO 9001"]`. Every required certification must match a source title. By default, only claims explicitly marked active by the source qualify; unknown and inactive claims do not pass. This is **not independent certification verification**.

The total candidate ceiling is divided across queries. Duplicates merge by Thomasnet supplier ID, preserving matched search terms. `excludeSupplierIds` suppresses existing suppliers. Rejected candidates still count toward source collection costs. A successful zero-result shortlist can mean that no collected candidate met the filters.

## Outputs and provenance

Rows contain company, website, phone, location, reported size/revenue, company-type code, certification claims and match reasons. Missing fields stay empty. Profile links synthesized from source names/IDs are flagged `sourceUrlConstructed`; use the supplier ID to resolve an outdated link. SUMMARY records rejection counts and the upstream run.

## Pricing: two separate charges

Our launch service fee is **$1 per 1,000 delivered suppliers**, plus the displayed start fee and Apify platform usage.

Collection uses [Zen Studio's Thomasnet collector](https://apify.com/zen-studio/thomasnet-suppliers-scraper), **charged separately to your Apify account** at its current rates. Its fees are additional to ours, including candidates later rejected or merged. Check its Pricing tab. `sourceChargeLimitUsd` caps source event charges across searches; your parent-run charge limit does not cover the child run. Platform usage can be additional. A cap that is too low may stop collection.

This tool adds qualification, multi-query matching and review exports to that source. It does not promise exhaustive coverage, verified certifications, purchasing suitability or current contact accuracy. Source outages are reported as failures. Independent tool, unaffiliated with Thomasnet or listed suppliers.

<!-- DISCOVERY TUTORIAL -->

## Tutorial: Build a purchasing shortlist with reviewable claims

1. Start with a five-candidate company-name query to inspect the schema.
2. Replace the name with a service query and switch `mode` to `all`.
3. Add state and certification filters after inspecting actual claims.
4. Review certification evidence before purchasing; source-active is not independently verified.

The script allows $0.15 in source event charges and $0.05 in parent event charges, separately. Platform usage may be additional. Source fees apply even if filtering leaves no suppliers.


### Complete Node.js example

Requires Node.js 22 or newer and your own Apify account. Save the following as `suppliers-shortlist.mjs`. Set `APIFY_TOKEN` privately in your environment, then run `node suppliers-shortlist.mjs`. No npm packages are needed. Keep credentials out of source control and shared workflows. The script prints a run ID; if your local session stops, set `RESUME_RUN_ID` to that ID to retrieve the same run without starting another.

```javascript
import fs from 'node:fs/promises';

// Node.js 22+. Set APIFY_TOKEN in your environment; never paste it into a URL.
async function request(path, { method = 'GET', body, text = false } = {}) {
  if (!process.env.APIFY_TOKEN) throw new Error('Set APIFY_TOKEN in your environment');
  const response = await fetch(`https://api.apify.com/v2${path}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Apify returned HTTP ${response.status}`);
  if (text) return response.text();
  const data = await response.json();
  return data.data ?? data;
}

async function run(actorName, input, maxCharge, timeoutSecs = 120) {
  // To recover a stopped local script, set RESUME_RUN_ID instead of starting again.
  const resumed = process.env.RESUME_RUN_ID;
  if (resumed && !/^[a-zA-Z0-9]{10,30}$/.test(resumed)) throw new Error('Invalid RESUME_RUN_ID');
  const actor = await request(`/actors/lifelong_starfruit~${actorName}`);
  let current = resumed
    ? await request(`/actor-runs/${resumed}`)
    : await request(`/actors/${actor.id}/runs?timeout=${timeoutSecs}&memory=256&maxTotalChargeUsd=${maxCharge}`, { method: 'POST', body: input });
  if (current.actId !== actor.id) throw new Error('Run belongs to a different Actor');
  console.log(`Run ID: ${current.id}`);
  const deadline = Date.now() + (timeoutSecs + 60) * 1000;
  while (['READY', 'RUNNING', 'ABORTING', 'TIMING-OUT'].includes(current.status)) {
    if (Date.now() > deadline) throw new Error(`Still pending: ${current.id}. Inspect it in Console; resume instead of starting a duplicate.`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    current = await request(`/actor-runs/${current.id}`);
  }
  if (current.status !== 'SUCCEEDED') throw new Error(`Run ${current.id}: ${current.status}. Inspect SUMMARY in Console before retrying.`);
  const summary = await request(`/key-value-stores/${current.defaultKeyValueStoreId}/records/SUMMARY`);
  if (!summary.healthy || !summary.deliveredAll) throw new Error('Incomplete delivery; previous local state preserved');
  const rows = await request(`/datasets/${current.defaultDatasetId}/items?clean=true&limit=5000`);
  if (rows.length !== summary.written) throw new Error('Incomplete download; previous local state preserved');
  return { current, summary, rows };
}

const input = { queries: ['Siemens'], mode: 'name', maxCandidates: 5, maxItems: 5, sourceChargeLimitUsd: 0.15 };
const { current, rows, summary } = await run('thomasnet-supplier-shortlist', input, 0.05, 360);
for (const name of ['suppliers.csv', 'certifications.csv']) {
  const value = await request(`/key-value-stores/${current.defaultKeyValueStoreId}/records/${name}`, { text: true });
  await fs.writeFile(`${current.id}-${name}`, value);
}
await fs.writeFile(`suppliers-${current.id}.json`, JSON.stringify(rows, null, 2));
console.log(JSON.stringify({ delivered: rows.length, source: summary.source, rejected: summary.rejected }));

```

## Related tools

- [Greenhouse & Ashby Job Scraper + Change Tracking](https://apify.com/lifelong_starfruit/pilot-employer-job-feed)
- [Eventbrite Scraper: Event URLs to JSON & ICS](https://apify.com/lifelong_starfruit/pilot-event-calendar-feed)
- [Google Maps Leads: Territory Filter & Deduplication](https://apify.com/lifelong_starfruit/pilot-maps-territory-leads)
- [Map Your Show Exhibitor Scraper: Company Matching & CSV](https://apify.com/lifelong_starfruit/map-your-show-company-matching)
- [10times Events: Industry Discovery, Changes & ICS Calendar](https://apify.com/lifelong_starfruit/10times-event-calendar-sync)
