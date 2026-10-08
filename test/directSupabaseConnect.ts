import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");
  const seedPath = path.join(__dirname, "..", "supabase", "seed.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  const seedSql = fs.readFileSync(seedPath, "utf-8");

  console.log("Connecting directly to db.qmckbrbglqqoitchyoui.supabase.co:5432...");
  const client = new Client({
    connectionString: "postgresql://postgres:raastha%40123@db.qmckbrbglqqoitchyoui.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("🎉 CONNECTED to direct Postgres DB!");
    console.log("Applying schema.sql...");
    await client.query(schemaSql);
    console.log("✅ schema.sql applied successfully!");
    
    console.log("Applying seed.sql...");
    await client.query(seedSql);
    console.log("✅ seed.sql applied successfully!");

    const res = await client.query("SELECT count(*) FROM public.issues;");
    console.log(`📊 Total issues in table: ${res.rows[0].count}`);

    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log("Active tables in public schema:", tables.rows.map(r => r.table_name));

    await client.end();
  } catch (err: any) {
    console.error("Connection / Query error:", err.message);
    try {
      await client.end();
    } catch {}
  }
}

main();
