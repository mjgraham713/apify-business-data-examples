import { fs, request, run } from './client.mjs';

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
