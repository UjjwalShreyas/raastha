import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

const regions = [
  "aws-0-ap-south-1.pooler.supabase.com",
  "aws-0-ap-southeast-1.pooler.supabase.com",
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
];

async function tryRegions() {
  const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");
  const seedPath = path.join(__dirname, "..", "supabase", "seed.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  const seedSql = fs.readFileSync(seedPath, "utf-8");

  for (const host of regions) {
    console.log(`Trying pooler host: ${host}...`);
    const client = new Client({
      host,
      port: 6543,
      user: "postgres.qmckbrbglqqoitchyoui",
      password: "raastha@123",
      database: "postgres",
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log(`🎉 CONNECTED to ${host}! Applying schema...`);
      await client.query(schemaSql);
      console.log("✅ schema.sql applied!");
      await client.query(seedSql);
      console.log("✅ seed.sql applied!");
      const res = await client.query("SELECT count(*) FROM public.issues;");
      console.log(`📊 Total issues in table: ${res.rows[0].count}`);
      await client.end();
      return;
    } catch (e: any) {
      console.log(`Failed on ${host}: ${e.message}`);
      try {
        await client.end();
      } catch {}
    }
  }
}

tryRegions();
