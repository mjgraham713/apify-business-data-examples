import { fs, request, run } from './client.mjs';
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
