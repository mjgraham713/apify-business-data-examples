import { fs, request, run } from './client.mjs';
const input = { queries: ['Siemens'], mode: 'name', maxCandidates: 5, maxItems: 5, sourceChargeLimitUsd: 0.15 };
const { current, rows, summary } = await run('thomasnet-supplier-shortlist', input, 0.05, 360);
for (const name of ['suppliers.csv', 'certifications.csv']) {
  const value = await request(`/key-value-stores/${current.defaultKeyValueStoreId}/records/${name}`, { text: true });
  await fs.writeFile(`${current.id}-${name}`, value);
}
await fs.writeFile(`suppliers-${current.id}.json`, JSON.stringify(rows, null, 2));
console.log(JSON.stringify({ delivered: rows.length, source: summary.source, rejected: summary.rejected }));
