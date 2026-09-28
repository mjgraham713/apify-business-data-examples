import { fs, run } from './client.mjs';

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
