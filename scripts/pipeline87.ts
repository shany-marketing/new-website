import { readFileSync } from 'fs';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  const { runFullPipeline } = await import('../src/lib/pipeline');

  const hotelId = '4b5694a7-9cc2-46cd-87fe-9a98eb31fd6a';
  console.log('Running full pipeline for hotel 87...');
  const result = await runFullPipeline(hotelId);
  console.log('Pipeline complete:', JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(e => { console.error('PIPELINE ERROR:', e.message); process.exit(1); });
