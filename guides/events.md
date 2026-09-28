# Eventbrite Scraper: Event URLs to JSON & ICS

Convert direct Eventbrite event links into structured records and a downloadable ICS calendar, with explicit handling of cancellations and missing timezones.

## Ready-to-run examples

- [Export an Eventbrite conference to an ICS calendar](https://apify.com/lifelong_starfruit/pilot-event-calendar-feed/examples/eventbrite-to-ics-calendar)
- [Export Eventbrite links with calendar timezone checks](https://apify.com/lifelong_starfruit/pilot-event-calendar-feed/examples/export-eventbrite-links-with-timezone-checks)

These examples create a task in your own account when you choose to try them. Review inputs and your spending limit before starting. Example companies and events are unaffiliated with this tool.

## Quick start

Paste 1–50 direct `https://www.eventbrite.com/e/...-EVENT_ID` links into **Eventbrite event URLs** and start the Actor. Search pages and organizer pages are unsupported.

Download the default dataset as JSON or CSV. Download `calendar.ics` from the run's key-value store and import it into a calendar application. This is a calendar file for each run, not a hosted calendar subscription or automatic synchronization with your calendar.

## Output

JSON records include stable event ID, title, URL, original start/end timestamps, UTC timestamps when an explicit source offset exists, cancellation status, attendance mode, location, organizer and ticket URL. Duplicate event URLs collapse to one result.

ICS uses stable event IDs and UTC timestamps. Events with unknown timezones remain in JSON but are omitted from ICS; the `SUMMARY` record counts those exclusions. Calendar records include title, time, URL and cancellation status. Location and organizer details are available in JSON.

## Limits

This Actor processes event links you already have. It does not discover events by city, search by keyword, monitor ticket inventory, or infer missing timezones. It reads public structured data; missing pages, access blocks and source changes are explicit failures. It does not bypass logins or challenges.

Read the run status and `SUMMARY` before treating a calendar as complete. A failed run may contain partial JSON results. Collection has a time budget, so a long URL list may require smaller batches. No Eventbrite login or external AI key is required.

## Troubleshooting

Check that each URL is a direct event page on eventbrite.com. If an event is absent from the calendar but present in JSON, inspect `timezoneKnown` and the summary's timezone exclusion count. A calendar import does not guarantee every calendar client will reconcile later updates identically.

Use this Actor's Issues tab for reproducible failures, including the run ID and a public event URL.

## Pricing

See the live Pricing tab for the active event rate and any platform usage charges.

<!-- DISCOVERY TUTORIAL -->

## Tutorial: turn Eventbrite links into a calendar file

Use this workflow for a curated event list, a team calendar or an event newsletter when you already have direct Eventbrite URLs. It exports the pages you select; it does not search Eventbrite or book tickets.

### Try it in Console

1. Open **Export an Eventbrite conference to an ICS calendar** above. It contains a public October 2026 conference URL. Review or replace that dated example, then choose a maximum Actor charge of $0.05; platform usage is additional.
2. Start the task and wait for success. Open the dataset for structured event details.
3. Open the run's **ICS calendar** output, or find `calendar.ics` in its key-value store. Check `SUMMARY.calendarExcludedUnknownTimezone` before relying on calendar coverage.
4. In Google Calendar on a computer, open **Settings → Import & export → Import**, select the `.ics` file and destination calendar, then import. For Outlook on the web, use **Add calendar → Upload from file** and select the destination calendar. These actions import a snapshot; future Eventbrite changes are not automatically synchronized.

The second example exports both a conference and a festival page. At validation on September 28, the conference had explicit timezone offsets and the festival did not: both appeared in JSON, but only the conference appeared in ICS. The Actor avoids guessing the festival's timezone. Source pages can change, so inspect the summary on your own run.

### Sample result and costs

Illustrative output shape:

```json
{"id":"eventbrite:example","title":"Example conference","startLocal":"2026-10-23T08:00:00-07:00","startUtc":"2026-10-23T15:00:00.000Z","timezoneKnown":true}
```

At the September 28, 2026 base price, two delivered event records cost **$0.00405 in Actor events** ($2/1,000 rows plus a $0.00005 start event), **plus platform usage**. JSON records excluded from ICS for missing timezone offsets are still delivered records. The Actor charge ceiling is a maximum, not a flat fee. Check the live Pricing tab before use.

### Use it from an integration

The complete script below saves both JSON and ICS with the run ID in their filenames. You can consume the JSON in a newsletter or dashboard and import the ICS manually. Deduplication and stable calendar UIDs help identify the same event, but repeated imports may behave differently across calendar clients. Source location and organizer fields are in JSON; the ICS contains title, time, URL and cancellation status, not every JSON field.

Import instructions: [Google Calendar](https://support.google.com/calendar/answer/37118) and [Outlook on the web](https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web-cff1429c-5af6-41ec-a5b4-74f2c278e98c).


### Complete Node.js example

Requires Node.js 22 or newer and your own Apify account. Save the following as `events-calendar.mjs`. Set `APIFY_TOKEN` privately in your environment, then run `node events-calendar.mjs`. No npm packages are needed. Keep credentials out of source control and shared workflows. The script prints a run ID; if your local session stops, set `RESUME_RUN_ID` to that ID to retrieve the same run without starting another.

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


const input = {
  urls: ['https://www.eventbrite.com/e/2026-phxdw-conference-orbit-registration-1991423338814'],
  maxItems: 20,
};
const { current, summary, rows } = await run('pilot-event-calendar-feed', input, 0.05);
const calendar = await request(`/key-value-stores/${current.defaultKeyValueStoreId}/records/calendar.ics`, { text: true });
await fs.writeFile(`events-${current.id}.json`, JSON.stringify(rows, null, 2));
await fs.writeFile(`events-${current.id}.ics`, calendar);
console.log({ events: rows.length, omittedFromCalendar: summary.calendarExcludedUnknownTimezone });
// Import the ICS file into your calendar. This script does not subscribe or sync.

```

## Related tools

- [Greenhouse & Ashby Job Scraper + Change Tracking](https://apify.com/lifelong_starfruit/pilot-employer-job-feed)
- [Google Maps Leads: Territory Filter & Deduplication](https://apify.com/lifelong_starfruit/pilot-maps-territory-leads)
- [Map Your Show Exhibitor Scraper: Company Matching & CSV](https://apify.com/lifelong_starfruit/map-your-show-company-matching)
- [Thomasnet Supplier Shortlist: Filters, Deduplication & CSV](https://apify.com/lifelong_starfruit/thomasnet-supplier-shortlist)
- [10times Events: Industry Discovery, Changes & ICS Calendar](https://apify.com/lifelong_starfruit/10times-event-calendar-sync)
