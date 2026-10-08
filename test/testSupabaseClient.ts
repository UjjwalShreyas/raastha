import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qmckbrbglqqoitchyoui.supabase.co";
const supabaseAnonKey = "sb_publishable_E64UXApDs29LNgWf-01F0A_9R15tR83";

async function testSupabase() {
  console.log("🌐 Testing Supabase API connection...");
  console.log(`URL: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await supabase.from("issues").select("*").limit(5);
    if (error) {
      console.log("Supabase query response notice:", error.message);
    } else {
      console.log("✅ Successfully queried Supabase! Records found:", data?.length);
      console.log(data);
    }
  } catch (err: any) {
    console.error("Supabase client connection exception:", err.message);
  }
}

testSupabase();
