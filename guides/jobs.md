# Greenhouse & Ashby Job Scraper + Change Tracking

Turn public employer boards into a normalized job feed. Compare runs to identify new and updated roles, and inspect coverage before using apparent job removals.

## Ready-to-run examples

- [Export Linear jobs from Ashby to JSON or CSV](https://apify.com/lifelong_starfruit/pilot-employer-job-feed/examples/export-linear-jobs)
- [Export Stripe jobs from Greenhouse to JSON or CSV](https://apify.com/lifelong_starfruit/pilot-employer-job-feed/examples/export-stripe-greenhouse-jobs)

These examples create a task in your own account when you choose to try them. Review inputs and your spending limit before starting. Example companies and events are unaffiliated with this tool.

## Quick start

```json
{
  "boards": [{ "provider": "ashby", "slug": "linear" }],
  "maxItems": 500,
  "onlyChanges": false
}
```

Supply 1–10 Greenhouse or Ashby board slugs. Download the default dataset as JSON or CSV, or retrieve it through the Apify API. To compare a later run, add `previousRunId` from a completed run of this Actor. Set `onlyChanges: true` to omit unchanged records.

## Output

Each job has a stable `id`, provider, board, title, source URL, location, department, description HTML, employment type, workplace type, source update time, compensation and change status. Fields unavailable from the source are null. Compensation is source data, not inferred from description text.

Change statuses are `new`, `updated`, `unchanged`, `unverified` and `removed_from_source`. A removal requires two complete scans with the role missing. A disappearance of more than 80% of a board with at least five prior jobs is quarantined for review. Removal does not establish that a role was filled.

The run's key-value store contains `SUMMARY` with coverage and delivery status and `CHECKPOINT` after complete output delivery. A failed or incomplete board preserves its prior state. Your integration must retain a readable completed run ID; expired/deleted storage cannot be used as a checkpoint.

## Limits and permissions

This Actor accepts named employer boards, not company-name discovery or a search across all jobs. Lever and Workday are unsupported. Up to 5,000 output records per run; caps and failed boards are reported explicitly. Check both run status and `SUMMARY`, since failed runs can contain useful partial data.

Full Actor permissions are requested to read the checkpoint from a previous run in your account. No external AI credentials are required.

## Troubleshooting

For a missing board, check its provider and public slug. For an invalid checkpoint, use a completed run from this Actor with a `CHECKPOINT` record. For source errors, inspect `SUMMARY.coverage`; do not interpret missing data as job removals. Report reproducible failures through this Actor's Issues tab with a run ID and a non-sensitive input example.

## Pricing

See the live Pricing tab for the active event rate and any platform usage charges.

<!-- DISCOVERY TUTORIAL -->

## Tutorial: track new jobs without downloading unchanged roles

Use this workflow for a job board, recruiting research or a hiring dashboard when you already know which employer boards to follow. It compares complete snapshots, so a temporarily missing or truncated board is not mistaken for mass job removal.

### Try it in Console

1. Open the **Export Linear jobs** example above. Its input selects Linear's Ashby board. Choose a maximum Actor charge of $0.50 for this small example; platform usage is additional.
2. Start the task. Once it succeeds, open the dataset to see titles, locations, source URLs and `change`. On the first complete scan, records are marked `new` relative to an empty baseline; that does not mean they were posted today.
3. Copy the completed run's ID. Run the same boards again with `previousRunId` set to that ID and `onlyChanges: true`.
4. Inspect `SUMMARY`: require `healthy: true` and `deliveredAll: true`. Zero output can mean there were no changes. Retain the latest successful run ID for the next comparison, even when its dataset is empty.
5. Download JSON/CSV or use the API example below to save the result locally. A `removed_from_source` status requires two complete absence scans; it does not prove a role was filled.

For Greenhouse, replace the board with `{"provider":"greenhouse","slug":"stripe"}` and increase `maxItems` sufficiently to fit the board. These sample employers do not endorse this Actor. Read the provider and slug from a known public employer board; this tool does not find companies for you.

### Sample result and costs

Illustrative output shape, not a current vacancy:

```json
{"id":"ashby:example:job-id","provider":"ashby","board":"example","title":"Example engineer role","url":"https://example.com/job","location":"Remote","change":"new"}
```

At the September 28, 2026 base price, 30 delivered rows cost **$0.01505 in Actor events** ($0.50/1,000 rows plus a $0.00005 start event), **plus platform usage**. A later run with zero delivered changes still has the start event and platform usage. Check the live Pricing tab before use; your charge ceiling must allow enough rows for complete delivery.

### Repeat safely

The script below writes a separate result file per run and updates its local checkpoint only after success and a complete download. Run it serially on your own scheduler if you want recurring checks; keep its state file on persistent storage. A fixed Apify schedule alone does not advance `previousRunId` automatically. Use a separate state file for each board set, and run frequently enough that Apify retains the previous run's storage. If that storage expires, establish a new baseline rather than pretending the comparison is continuous.


### Complete Node.js example

Requires Node.js 22 or newer and your own Apify account. Save the following as `jobs-track.mjs`. Set `APIFY_TOKEN` privately in your environment, then run `node jobs-track.mjs`. No npm packages are needed. Keep credentials out of source control and shared workflows. The script prints a run ID; if your local session stops, set `RESUME_RUN_ID` to that ID to retrieve the same run without starting another.

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


// Use one state file per fixed set of employer boards. Do not run copies concurrently.
const stateFile = 'linear-job-state.json';
let state = {};
try { state = JSON.parse(await fs.readFile(stateFile, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const input = {
  boards: [{ provider: 'ashby', slug: 'linear' }],
  maxItems: 500,
  onlyChanges: Boolean(state.previousRunId),
  ...(state.previousRunId ? { previousRunId: state.previousRunId } : {}),
};
const { current, summary, rows } = await run('pilot-employer-job-feed', input, 0.5);
await fs.writeFile(`job-changes-${current.id}.json`, JSON.stringify(rows, null, 2));
await fs.writeFile(`${stateFile}.tmp`, JSON.stringify({ previousRunId: current.id }));
await fs.rename(`${stateFile}.tmp`, stateFile);
console.log({ records: rows.length, coverage: summary.coverage });
// First run is the baseline. Later runs can legitimately return zero changes.

```

## Related tools

- [Eventbrite Scraper: Event URLs to JSON & ICS](https://apify.com/lifelong_starfruit/pilot-event-calendar-feed)
- [Google Maps Leads: Territory Filter & Deduplication](https://apify.com/lifelong_starfruit/pilot-maps-territory-leads)
- [Map Your Show Exhibitor Scraper: Company Matching & CSV](https://apify.com/lifelong_starfruit/map-your-show-company-matching)
- [Thomasnet Supplier Shortlist: Filters, Deduplication & CSV](https://apify.com/lifelong_starfruit/thomasnet-supplier-shortlist)
- [10times Events: Industry Discovery, Changes & ICS Calendar](https://apify.com/lifelong_starfruit/10times-event-calendar-sync)
