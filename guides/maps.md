# Google Maps Leads: Territory Filter & Deduplication

Keep businesses whose reported coordinates fall inside your territory, remove duplicate Place IDs and suppress leads you have already received. Use an existing Compass-format dataset or collect a bounded set of candidates through Compass Google Maps Scraper.

## Ready-to-run examples

- [Find coffee shop leads inside downtown Phoenix bounds](https://apify.com/lifelong_starfruit/pilot-maps-territory-leads/examples/find-downtown-phoenix-coffee-leads)
- [Deduplicate Maps leads and exclude existing contacts](https://apify.com/lifelong_starfruit/pilot-maps-territory-leads/examples/deduplicate-and-suppress-existing-leads)

These examples create a task in your own account when you choose to try them. Review inputs and your spending limit before starting. Example companies and events are unaffiliated with this tool.

## Quick start: existing data

```json
{
  "bounds": [-112.2, 33.3, -111.9, 33.6],
  "datasetId": "YOUR_DATASET_ID",
  "maxItems": 100,
  "excludeClosed": true,
  "excludePlaceIds": []
}
```

Bounds are `[west, south, east, north]` in longitude/latitude. Replace the Phoenix example with your territory. You may supply `places` directly instead of `datasetId`.

The Console form starts with a clearly labeled synthetic row to demonstrate filtering. Replace it with your own records, or clear **Google Maps candidate rows** before using a dataset ID or search terms. Running the unchanged example does not discover real businesses.

## Optional candidate search

Replace `datasetId` with `searchTerms: ["coffee shop"]`, `maxCandidates: 30` and `sourceChargeLimitUsd: 0.5`. Supply exactly one of `datasetId`, `places` or `searchTerms`.

Search starts Compass Google Maps Scraper under your Apify account. **Its charges are separate** from this Actor and may include candidates subsequently rejected. The required source ceiling is $0.50–$1; it is a maximum charge setting, not a flat fee. The parent run's spending limit does not replace that separate ceiling. Check the upstream Actor's current pricing before using search.

## Output and coverage

Results include Place ID, title, address, coordinates, category, website, phone, source URL and `insideRequestedBounds`. `SUMMARY` counts rejections, duplicates and delivery and records reported upstream costs when search is used.

Validation uses source coordinates, not a verified street address or a business's service area. Points on the boundary are included. Missing or invalid coordinates are excluded. Suppression uses the `excludePlaceIds` supplied with each run; there is no automatic shared customer history.

Search is limited to 1–3 terms and 300 total candidate results. Existing datasets or arrays may contain up to 10,000 candidates. Maximum output is 1,000 businesses. Dateline-crossing territories are unsupported. Results are a bounded sample, not an exhaustive census; filtering can correctly return zero rows.

## Permissions and troubleshooting

Full Actor permissions allow reading your selected dataset and starting the upstream Actor in your account. Existing datasets must be accessible to your account. No email enrichment or outreach is included.

Inspect `SUMMARY` for out-of-bounds and missing-coordinate counts. With search enabled, inspect `SOURCE_RUN` for the upstream run ID. Report reproducible errors through this Actor's Issues tab with your run ID and a non-sensitive example.

## Pricing

See the live Pricing tab for this Actor's active rate and any platform usage charges. Candidate search adds the upstream provider's separate fees.

<!-- DISCOVERY TUTORIAL -->

## Tutorial: keep only new leads inside your sales territory

Use this workflow after collecting Google Maps business data when your sales list must respect a rectangle and exclude businesses already in your CRM. Matching uses Place IDs and reported coordinates, not names, inferred addresses or service areas.

### Try filtering without an upstream search

1. Open **Deduplicate Maps leads and exclude existing contacts** above. It has four clearly synthetic rows and a Phoenix bounding box. Choose a maximum Actor charge of $0.05; platform usage is additional.
2. Start the task. You should receive only `demo-new`. Its repeated row and the excluded `demo-existing` ID count as two duplicates/suppressions; the remaining row is outside the rectangle.
3. Replace `places` with real Compass-format rows, or clear it and supply a dataset ID you can access. Use exactly one source: `places`, `datasetId` or `searchTerms`.
4. Export existing Google Place IDs from your CRM into `excludePlaceIds`. Supply the list every run; the Actor does not retain a shared customer suppression list.
5. Download JSON/CSV and inspect `SUMMARY.rejected`. Before importing CSV into a CRM, map Place ID to a unique field so your CRM can also prevent duplicate imports.

Bounds are **[west longitude, south latitude, east longitude, north latitude]**. Boundary points are included. Missing coordinates and closed businesses are excluded by default; a business serving your area from outside the rectangle will be excluded.

### Collect a small set of candidates

The **Find coffee shop leads inside downtown Phoenix bounds** example uses real Compass search for at most 10 candidates. It can return fewer qualifying businesses, including zero. Edit the search term and bounds for your use case. Results are not a census of all businesses in the area.

The source search is billed separately by Compass. Its `sourceChargeLimitUsd: 0.5` is a **$0.50 ceiling, not a fixed fee**, and does not replace this Actor's own spending limit. Candidates that are later excluded can still incur upstream charges. For the lowest extra cost when you already have data, use `places` or `datasetId`.

### Sample result and costs

The synthetic filtering example should return this subset of fields:

```json
{"placeId":"demo-new","title":"Synthetic new lead","latitude":33.45,"longitude":-112.07,"insideRequestedBounds":true}
```

At the September 28, 2026 base price, one delivered row costs **$0.00055 in Actor events** ($0.50/1,000 rows plus a $0.00005 start event), **plus platform usage**. Optional search adds Compass's separate charges. Check both live pricing pages before running a search. The script below uses synthetic supplied rows and starts no upstream search; replace them with your real data after inspecting the output.


### Complete Node.js example

Requires Node.js 22 or newer and your own Apify account. Save the following as `maps-territory.mjs`. Set `APIFY_TOKEN` privately in your environment, then run `node maps-territory.mjs`. No npm packages are needed. Keep credentials out of source control and shared workflows. The script prints a run ID; if your local session stops, set `RESUME_RUN_ID` to that ID to retrieve the same run without starting another.

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


// Synthetic rows demonstrate behavior; replace them with real Compass-format data.
const input = {
  bounds: [-112.085, 33.44, -112.06, 33.465],
  places: [
    { placeId: 'demo-new', title: 'Synthetic new lead', location: { lat: 33.45, lng: -112.07 } },
    { placeId: 'demo-new', title: 'Synthetic duplicate', location: { lat: 33.45, lng: -112.07 } },
    { placeId: 'demo-existing', title: 'Synthetic existing lead', location: { lat: 33.45, lng: -112.07 } },
    { placeId: 'demo-outside', title: 'Synthetic outside territory', location: { lat: 34, lng: -112.07 } },
  ],
  excludePlaceIds: ['demo-existing'], excludeClosed: true, maxItems: 10,
};
const { current, summary, rows } = await run('pilot-maps-territory-leads', input, 0.05);
await fs.writeFile(`territory-leads-${current.id}.json`, JSON.stringify(rows, null, 2));
console.log({ delivered: rows.map(r => r.placeId), rejected: summary.rejected });
// Expected: demo-new only; 2 duplicate/suppressed rows and 1 outside the rectangle.

```

## Related tools

- [Greenhouse & Ashby Job Scraper + Change Tracking](https://apify.com/lifelong_starfruit/pilot-employer-job-feed)
- [Eventbrite Scraper: Event URLs to JSON & ICS](https://apify.com/lifelong_starfruit/pilot-event-calendar-feed)
- [Map Your Show Exhibitor Scraper: Company Matching & CSV](https://apify.com/lifelong_starfruit/map-your-show-company-matching)
- [Thomasnet Supplier Shortlist: Filters, Deduplication & CSV](https://apify.com/lifelong_starfruit/thomasnet-supplier-shortlist)
- [10times Events: Industry Discovery, Changes & ICS Calendar](https://apify.com/lifelong_starfruit/10times-event-calendar-sync)
