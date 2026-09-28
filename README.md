# Business data API examples

Runnable Node.js examples for six independent Apify tools maintained by [lifelong_starfruit](https://apify.com/lifelong_starfruit). Choose the workflow you need, try a small example in Apify, then automate it with the scripts here.

| Workflow | Try a small example | Script |
| --- | --- | --- |
| Track new, updated and removed employer job listings | [Open example](https://apify.com/lifelong_starfruit/pilot-employer-job-feed/examples/export-linear-jobs) | [jobs-track.mjs](examples/jobs-track.mjs) |
| Convert known Eventbrite URLs to calendar files | [Open example](https://apify.com/lifelong_starfruit/pilot-event-calendar-feed/examples/eventbrite-to-ics-calendar) | [events-calendar.mjs](examples/events-calendar.mjs) |
| Keep Maps leads inside a territory and exclude existing IDs | [Open example](https://apify.com/lifelong_starfruit/pilot-maps-territory-leads/examples/deduplicate-and-suppress-existing-leads) | [maps-territory.mjs](examples/maps-territory.mjs) |
| Export trade-show exhibitors, match companies and retain booth links | [Open example](https://apify.com/lifelong_starfruit/map-your-show-company-matching/examples/pack-expo-exhibitors-to-company-csv) | [exhibitors-export.mjs](examples/exhibitors-export.mjs) |
| Build supplier shortlists with source-reported certification claims | [Open example](https://apify.com/lifelong_starfruit/thomasnet-supplier-shortlist/examples/thomasnet-supplier-review-csv) | [suppliers-shortlist.mjs](examples/suppliers-shortlist.mjs) |
| Discover industry events and compare calendar editions across runs | [Open example](https://apify.com/lifelong_starfruit/10times-event-calendar-sync/examples/packaging-events-to-ics-calendar) | [conferences-sync.mjs](examples/conferences-sync.mjs) |

## Run an example

Requires Node.js 22+ and your own Apify account. Set `APIFY_TOKEN` privately in your environment, clone this repository, then run:

```sh
node examples/exhibitors-export.mjs
```

Review the inputs and spending limits first. The scripts print the Apify run ID. If your local process stops, set `RESUME_RUN_ID` to that ID to retrieve the same run without launching another.

## Costs and limitations

These are paid Apify tools. The Maps search, Thomasnet and 10times workflows also call a separately billed collector. The parent event-charge limit and source event-charge limit are separate; platform usage can be additional. Read each Actor’s current pricing before running. Small default samples are intentional.

Supplier certification claims are not independently verified. Company matching is conservative. Calendars use the dates and timezone information actually supplied by their sources. Missing search results do not automatically mean that an event was cancelled. Read the individual guides for coverage and checkpoint limits.

The 2026 show and Eventbrite links are dated examples; replace them as the source pages change. No affiliations with the source platforms, example companies or events are implied.

## Repeat runs and integration

The job and industry-calendar scripts save a local baseline run ID after complete delivery. Run them on your own scheduler with persistent state to track changes. Keep the prior Apify run storage available. Every scheduled source collection may incur fees, even when no rows change.

Other workflows can be run through the Apify API, Console tasks, or compatible integrations. A successful run is only usable after `SUMMARY.healthy` and `SUMMARY.deliveredAll` are true. Inspect source coverage before treating the result as complete.

## Questions and issues

For an Actor runtime issue, use the Issues tab on its Apify listing and include the run ID and sanitized inputs. Do not post tokens, private datasets or personal contact details. For an error in these example scripts, open a GitHub issue.

## First-run permissions

Thomasnet and 10times start a separately billed source Actor; Maps search does too. Open the linked Console example first and review any permission request before using the API script. If an API call returns HTTP 403, check the token and the Actor permission approval in Console. Approval is a one-time account action, not something the script bypasses.
