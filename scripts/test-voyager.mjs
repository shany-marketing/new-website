import fs from "fs";

let token;
const envContent = fs.readFileSync(".env.local", "utf8");
const m = envContent.match(/APIFY_API_TOKEN=(.+)/);
if (m) token = m[1].trim();

const BASE = "https://api.apify.com/v2";
const RUN_ID = "dIOSnOV12YoDhlDMR";
const DATASET_ID = "bwkHo7mZKJnxOiU2P";

for (let i = 0; i < 120; i++) {
  const res = await fetch(`${BASE}/actor-runs/${RUN_ID}?token=${token}`);
  const data = await res.json();
  const s = data.data?.status;
  if (s === "SUCCEEDED") {
    const items = await (await fetch(`${BASE}/datasets/${DATASET_ID}/items?token=${token}&limit=5`)).json();
    console.log(`Brown BoBo: SUCCEEDED — ${items.length} reviews fetched`);
    process.exit(0);
  }
  if (s === "FAILED" || s === "ABORTED" || s === "TIMED-OUT") {
    console.log(`Brown BoBo: ${s} — ${data.data?.statusMessage}`);
    // Check log
    const log = await (await fetch(`${BASE}/actor-runs/${RUN_ID}/log?token=${token}`)).text();
    const lines = log.split("\n").filter(l => l.includes("ERROR") || l.includes("blocked") || l.includes("Finished"));
    console.log(lines.slice(-10).join("\n"));
    process.exit(0);
  }
  if (i % 6 === 0) console.log(`${s} (${i * 10}s)`);
  await new Promise(r => setTimeout(r, 10000));
}
