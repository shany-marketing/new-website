import { readFileSync } from 'fs';

// Load .env.local before any other imports
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  // Dynamic import AFTER env is loaded (so db.ts Pool gets DATABASE_URL)
  const { waitForScrapeAndIngest } = await import('../src/lib/scrape');

  console.log('Ingesting reviews for hotel 87...');
  const result = await waitForScrapeAndIngest(
    '4b5694a7-9cc2-46cd-87fe-9a98eb31fd6a',
    'hK1FMe2gGBe7qRHfa',
    '9MOv1BmvCpYCjAwAQ'
  );
  console.log('Done:', JSON.stringify(result));
  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
