# Map Your Show Exhibitor Scraper: Company Matching & CSV

Turn one to three Map Your Show exhibitor directories into a company list and a separate booth CSV. Match repeat exhibitors across shows using both their website domain and normalized company name, then exclude companies already in your CRM.

## Ready-to-run examples

- [Export PACK EXPO exhibitors to company and booth CSV](https://apify.com/lifelong_starfruit/map-your-show-company-matching/examples/pack-expo-exhibitors-to-company-csv)
- [Match exhibitor companies across two show directories](https://apify.com/lifelong_starfruit/map-your-show-company-matching/examples/match-exhibitors-across-two-shows)

These examples create a task in your own account when you choose to try them. Review inputs and your spending limit before starting. Example companies and events are unaffiliated with this tool.

## Quick start

```json
{"showUrls":["https://packexpo26.mapyourshow.com/8_0/explore/exhibitor-gallery.cfm"],"maxItems":10,"includeProfiles":true}
```

Start with 10 exhibitors. Open the dataset for JSON/CSV, or the Output tab for `companies.csv`, `booths.csv` and `SUMMARY`. Increase `maxItems` after inspecting coverage. The limit applies **per show before exclusions**, not to the combined final list.

## What you get

- Company name, published website, phone, address and source profile links when available.
- Booths linked back to their show and exhibitor IDs, even after companies merge.
- Emails only when explicitly present in a public exhibitor description. No guessed contacts or verified decision-maker emails.
- Stable company IDs, matching rule and shared-domain company count.
- Full-directory versus capped coverage, missing fields and source failures in SUMMARY.

## Match companies and exclude existing leads

Add up to three show URLs. Website domain alone does not merge companies: the normalized name must also agree. Subsidiaries with different names stay separate. Missing websites fall back to show/exhibitor identity. This deliberately leaves some real duplicates for review.

Use `excludeDomains` for CRM domains, or `excludeCompanyIds` from an earlier run. Domain exclusion requires profiles. IDs from profile-enabled and directory-only runs can differ.

## Pricing and limits

Launch service fee: **$3 per 1,000 delivered company rows**, plus the displayed start fee and Apify platform usage. Repeated matched companies count once per run. No extra collector or proxy subscription is needed. The Console price is authoritative.

Only HTTPS `*.mapyourshow.com` directories using the supported public gallery are accepted. Custom exhibitor sites and logged-in/private contacts are unsupported. Published dates and directory availability are controlled by show organizers. Profile collection has a bounded time limit; a large or slow directory may need a smaller selection. A failed or partial run is marked incomplete and does not publish complete CSV exports. Inspect SUMMARY before relying on results.

This is an independent tool, unaffiliated with Map Your Show or the example shows.

<!-- DISCOVERY TUTORIAL -->

## Tutorial: Export a show and suppress existing CRM companies

1. Run the sample below against PACK EXPO's public 2026 directory.
2. Inspect companies and booth links. Change `showUrls` to your own supported directories.
3. Add known CRM domains to `excludeDomains`. Keep profiles enabled for domain matching.
4. Download companies and booths separately so one company can retain several exhibit locations.

The script uses a ten-row sample and a $0.10 parent event-charge ceiling. Platform usage is additional. Increase limits deliberately for production.


### Complete Node.js example

Requires Node.js 22 or newer and your own Apify account. Save the following as `exhibitors-export.mjs`. Set `APIFY_TOKEN` privately in your environment, then run `node exhibitors-export.mjs`. No npm packages are needed. Keep credentials out of source control and shared workflows. The script prints a run ID; if your local session stops, set `RESUME_RUN_ID` to that ID to retrieve the same run without starting another.

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

const input = { showUrls: ['https://packexpo26.mapyourshow.com/8_0/explore/exhibitor-gallery.cfm'], maxItems: 10, includeProfiles: true, excludeDomains: [] };
const { current, rows } = await run('map-your-show-company-matching', input, 0.10, 600);
for (const name of ['companies.csv', 'booths.csv']) {
  const value = await request(`/key-value-stores/${current.defaultKeyValueStoreId}/records/${name}`, { text: true });
  await fs.writeFile(`${current.id}-${name}`, value);
}
await fs.writeFile(`exhibitors-${current.id}.json`, JSON.stringify(rows, null, 2));
console.log(`Saved ${rows.length} companies and their booth CSV.`);

```

## Related tools

- [Greenhouse & Ashby Job Scraper + Change Tracking](https://apify.com/lifelong_starfruit/pilot-employer-job-feed)
- [Eventbrite Scraper: Event URLs to JSON & ICS](https://apify.com/lifelong_starfruit/pilot-event-calendar-feed)
- [Google Maps Leads: Territory Filter & Deduplication](https://apify.com/lifelong_starfruit/pilot-maps-territory-leads)
- [Thomasnet Supplier Shortlist: Filters, Deduplication & CSV](https://apify.com/lifelong_starfruit/thomasnet-supplier-shortlist)
- [10times Events: Industry Discovery, Changes & ICS Calendar](https://apify.com/lifelong_starfruit/10times-event-calendar-sync)
