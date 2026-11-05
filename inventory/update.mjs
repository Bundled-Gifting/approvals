// Pulls remaining stock from each client Shopify shop (read-only) and writes
// inventory/data/<code>.json for the client inventory page.
// Runs daily from .github/workflows/inventory.yml.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const API_VERSION = '2026-10';
const shops = JSON.parse(readFileSync(new URL('./shops.json', import.meta.url)));
mkdirSync(new URL('./data/', import.meta.url), { recursive: true });

const updated = new Date().toLocaleString('en-US', {
  timeZone: 'America/Detroit', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
});

let failed = 0;
for (const s of shops) {
  try {
    const id = process.env[`${s.secrets}_CLIENT_ID`];
    const secret = process.env[`${s.secrets}_CLIENT_SECRET`];
    if (!id || !secret) throw new Error(`missing ${s.secrets}_CLIENT_ID / ${s.secrets}_CLIENT_SECRET secret`);

    const tok = await fetch(`https://${s.domain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret })
    }).then(r => r.json());
    if (!tok.access_token) throw new Error('token: ' + JSON.stringify(tok).slice(0, 200));

    const items = [];
    let cursor = null;
    do {
      const res = await fetch(`https://${s.domain}/admin/api/${API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok.access_token },
        body: JSON.stringify({
          query: `query ($cursor: String) { productVariants(first: 250, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes { title inventoryQuantity product { title status } } } }`,
          variables: { cursor }
        })
      }).then(r => r.json());
      if (res.errors) throw new Error(JSON.stringify(res.errors).slice(0, 200));
      const pv = res.data.productVariants;
      for (const n of pv.nodes) {
        if (n.product.status !== 'ACTIVE') continue;
        items.push({ product: n.product.title, size: n.title === 'Default Title' ? '' : n.title, qty: n.inventoryQuantity ?? 0 });
      }
      cursor = pv.pageInfo.hasNextPage ? pv.pageInfo.endCursor : null;
    } while (cursor);

    items.sort((a, b) => a.product.localeCompare(b.product));
    writeFileSync(new URL(`./data/${s.code}.json`, import.meta.url),
      JSON.stringify({ ok: true, client: s.client, updated, items }, null, 1) + '\n');
    console.log(`${s.client}: ${items.length} rows`);
  } catch (e) {
    failed++;
    console.error(`${s.client}: ERROR ${e.message}`);
  }
}
if (failed) process.exitCode = 1;
