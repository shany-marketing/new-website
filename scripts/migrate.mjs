import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("rds.amazonaws.com")
    ? { rejectUnauthorized: false }
    : false,
});

async function run() {
  const client = await pool.connect();

  try {
    // Ensure the schema_migrations table exists
    await client.query(
      fs.readFileSync(path.join(MIGRATIONS_DIR, "000_schema_migrations.sql"), "utf-8")
    );

    // Get already-applied migrations
    const { rows: applied } = await client.query(
      "SELECT version FROM schema_migrations ORDER BY version"
    );
    const appliedSet = new Set(applied.map((r) => r.version));

    // Read all migration files, sorted by name
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d{3}_.*\.sql$/.test(f) && f !== "000_schema_migrations.sql")
      .sort();

    let count = 0;
    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      if (appliedSet.has(version)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");

      console.log(`Applying ${file}...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
          [version, file]
        );
        await client.query("COMMIT");
        count++;
        console.log(`  Done.`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  FAILED: ${err.message}`);
        process.exit(1);
      }
    }

    if (count === 0) {
      console.log("All migrations already applied.");
    } else {
      console.log(`\nApplied ${count} migration(s).`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migration runner failed:", err);
  process.exit(1);
});
