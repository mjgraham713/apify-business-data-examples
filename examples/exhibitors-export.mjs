import { fs, request, run } from './client.mjs';
const input = { showUrls: ['https://packexpo26.mapyourshow.com/8_0/explore/exhibitor-gallery.cfm'], maxItems: 10, includeProfiles: true, excludeDomains: [] };
const { current, rows } = await run('map-your-show-company-matching', input, 0.10, 600);
for (const name of ['companies.csv', 'booths.csv']) {
  const value = await request(`/key-value-stores/${current.defaultKeyValueStoreId}/records/${name}`, { text: true });
  await fs.writeFile(`${current.id}-${name}`, value);
}
await fs.writeFile(`exhibitors-${current.id}.json`, JSON.stringify(rows, null, 2));
console.log(`Saved ${rows.length} companies and their booth CSV.`);
