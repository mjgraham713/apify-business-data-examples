# 10times Events: Industry Discovery, Changes & ICS Calendar

Discover industry events by country, city, category or keyword, export them to CSV, and maintain an all-day ICS calendar across runs. Stable event-edition IDs let you see new and changed events without treating missing search results as cancellations.

## Ready-to-run examples

- [Discover packaging trade shows and export an ICS calendar](https://apify.com/lifelong_starfruit/10times-event-calendar-sync/examples/packaging-events-to-ics-calendar)
- [Create a baseline for industry event change tracking](https://apify.com/lifelong_starfruit/10times-event-calendar-sync/examples/baseline-industry-event-change-tracking)

These examples create a task in your own account when you choose to try them. Review inputs and your spending limit before starting. Example companies and events are unaffiliated with this tool.

## Quick start

```json
{"country":"US","categoryId":"30","eventType":"tradeshow","maxItems":5,"sourceChargeLimitUsd":0.15}
```

This example collects up to five packaging trade shows. Output includes the dataset, `events.csv`, `calendar.ics`, `SUMMARY` and a checkpoint for repeat runs.

## Track changes without duplicate editions

Pass a prior successful run ID as `previousRunId`, keep the same search filters and set `onlyChanges:true`. Dataset/CSV rows contain only new or updated editions. The calendar retains all known editions from that scoped history, including editions absent from the latest bounded search. Missing results are **not** evidence of cancellation.

Use `excludeEditionIds` to remove unwanted editions from output and retained history. A changed search filter requires a fresh baseline. History is capped at 10,000 editions. Keep prior run storage available; deleted or expired checkpoints cannot be resumed.

## Calendar behavior

Events use source date-only values as all-day entries; no start time or timezone is invented. ICS end dates follow the exclusive-end convention. Explicit source cancellations become CANCELLED, postponed events become tentative. Reimport behavior depends on your calendar application. This Actor generates files; it does not itself subscribe, publish a permanent calendar URL or update your Google/Outlook account.

## Pricing: two separate charges

Our launch service fee is **$1 per 1,000 delivered event rows**, plus the displayed start fee and Apify platform usage. With changes-only output, unchanged events are not billed as output rows.

Collection uses [Zen Studio's 10times collector](https://apify.com/zen-studio/10times-events-scraper), **charged separately to your Apify account** at its current rates, including candidates that are unchanged or locally filtered. Check its Pricing tab. `sourceChargeLimitUsd` limits source event charges, separately from the parent-run charge limit; platform usage can be additional. Start with a small sample.

This adds calendar and checkpoint behavior to the source collector. Results are bounded discovery, not a complete industry calendar. Confirm dates with organizers before travel. Independent tool, unaffiliated with 10times or the example events.

<!-- DISCOVERY TUTORIAL -->

## Tutorial: Refresh a packaging-events calendar and export only changes

The script saves a local baseline run ID only after downloading a healthy result and its calendar. Run it again with the same filters to export only changed rows while retaining known calendar editions. It preserves prior local state if a run or download fails.

Set up a schedule in your own workflow runner to execute the script periodically and retain its state file. Import the resulting ICS file into your calendar application. This is file generation, not an automatic calendar subscription. A schedule reruns the paid source even when nothing changes.

Each run allows $0.15 in source event charges and $0.05 in parent event charges; platform usage can be additional. Keep the previous run's Apify storage available.


### Complete Node.js example

Requires Node.js 22 or newer and your own Apify account. Save the following as `conferences-sync.mjs`. Set `APIFY_TOKEN` privately in your environment, then run `node conferences-sync.mjs`. No npm packages are needed. Keep credentials out of source control and shared workflows. The script prints a run ID; if your local session stops, set `RESUME_RUN_ID` to that ID to retrieve the same run without starting another.

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

const stateFile = 'industry-calendar-state.json';
let state = {};
try { state = JSON.parse(await fs.readFile(stateFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const input = { country: 'US', categoryId: '30', eventType: 'tradeshow', maxItems: 5, sourceChargeLimitUsd: 0.15, onlyChanges: true, ...(state.previousRunId ? { previousRunId: state.previousRunId } : {}) };
const { current, rows } = await run('10times-event-calendar-sync', input, 0.05, 150);
const calendar = await request(`/key-value-stores/${current.defaultKeyValueStoreId}/records/calendar.ics`, { text: true });
if (!calendar.includes('BEGIN:VCALENDAR')) throw new Error('Calendar download invalid; previous state preserved');
await fs.writeFile(`industry-calendar-${current.id}.ics`, calendar);
await fs.writeFile(`event-changes-${current.id}.json`, JSON.stringify(rows, null, 2));
await fs.writeFile(stateFile + '.tmp', JSON.stringify({ previousRunId: current.id }, null, 2));
await fs.rename(stateFile + '.tmp', stateFile);
console.log(`Saved calendar and ${rows.length} changed event rows.`);

```

## Related tools

- [Greenhouse & Ashby Job Scraper + Change Tracking](https://apify.com/lifelong_starfruit/pilot-employer-job-feed)
- [Eventbrite Scraper: Event URLs to JSON & ICS](https://apify.com/lifelong_starfruit/pilot-event-calendar-feed)
- [Google Maps Leads: Territory Filter & Deduplication](https://apify.com/lifelong_starfruit/pilot-maps-territory-leads)
- [Map Your Show Exhibitor Scraper: Company Matching & CSV](https://apify.com/lifelong_starfruit/map-your-show-company-matching)
- [Thomasnet Supplier Shortlist: Filters, Deduplication & CSV](https://apify.com/lifelong_starfruit/thomasnet-supplier-shortlist)
