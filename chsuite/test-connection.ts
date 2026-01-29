
import { createClient } from '@supabase/supabase-js';

// Hardcoded keys from lib/supabase.ts for testing
const supabaseUrl = 'https://cabdbnfjpsxbdmriabct.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYmRibmZqcHN4YmRtcmlhYmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTU5NDQsImV4cCI6MjA4NDY5MTk0NH0.582HNixNNbWh5Ue0UFpqYqzS6_1e0GSB0c1EdJ00fvY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    console.log("Testing Supabase Connection...");

    // 1. Test standard table select
    console.log("1. Fetching roles...");
    try {
        const { data: roles, error } = await supabase.from('roles').select('id, name').limit(1);
        if (error) {
            console.error("❌ Error fetching roles:", error);
        } else {
            console.log("✅ Roles fetch successful:", roles);
        }
    } catch (e) {
        console.error("❌ Exception fetching roles:", e);
    }

    // 2. Test RPC call get_app_initial_data
    console.log("\n2. Testing get_app_initial_data RPC...");
    try {
        console.time('RPC Fetch');
        const { data, error } = await supabase.rpc('get_app_initial_data');
        console.timeEnd('RPC Fetch');

        if (error) {
            console.error("❌ Error executing RPC:", error);
        } else {
            if (data) {
                console.log("✅ RPC successful");
                console.log("   Roles count:", data.roles?.length);
                console.log("   Users count:", data.users?.length);
                console.log("   Company Settings:", data.company_settings ? "Found" : "Missing");
            } else {
                console.log("⚠️ RPC returned no data (null)");
            }
        }
    } catch (e) {
        console.error("❌ Exception executing RPC:", e);
    }
}

testConnection();
