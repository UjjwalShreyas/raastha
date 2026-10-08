import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:raastha%40123@db.qmckbrbglqqoitchyoui.supabase.co:5432/postgres";

async function main() {
  console.log("🔌 Connecting to Supabase Postgres Database...");
  console.log(`Host: db.qmckbrbglqqoitchyoui.supabase.co`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Successfully connected to Supabase PostgreSQL database!");

    // 1. Read and apply schema.sql
    const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");
    if (fs.existsSync(schemaPath)) {
      console.log("\n📜 Applying supabase/schema.sql...");
      const schemaSql = fs.readFileSync(schemaPath, "utf-8");
      await client.query(schemaSql);
      console.log("✅ Schema tables, triggers, policies, and functions applied successfully!");
    }

    // 2. Read and apply seed.sql
    const seedPath = path.join(__dirname, "..", "supabase", "seed.sql");
    if (fs.existsSync(seedPath)) {
      console.log("\n🌱 Applying supabase/seed.sql...");
      const seedSql = fs.readFileSync(seedPath, "utf-8");
      await client.query(seedSql);
      console.log("✅ Seed data inserted successfully!");
    }

    // 3. Verify issues table contents
    const countRes = await client.query("SELECT count(*) FROM public.issues;");
    console.log(`\n📊 Total active issues in database: ${countRes.rows[0].count}`);

    const latest = await client.query(
      "SELECT tracking_id, type, severity, status, ward FROM public.issues LIMIT 5;"
    );
    console.log("\n📋 Sample Database Records:");
    console.table(latest.rows);

    console.log("\n🎉 SUPABASE DATABASE SETUP & INTEGRATION COMPLETE!");
  } catch (err: any) {
    console.error("❌ Database setup error:", err.message);
  } finally {
    await client.end();
  }
}

main();
