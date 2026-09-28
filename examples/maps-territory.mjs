import { fs, run } from './client.mjs';

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
