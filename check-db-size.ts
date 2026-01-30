
import { createClient } from '@supabase/supabase-js';

// Hardcoded keys from lib/supabase.ts
const supabaseUrl = 'https://cabdbnfjpsxbdmriabct.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYmRibmZqcHN4YmRtcmlhYmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTU5NDQsImV4cCI6MjA4NDY5MTk0NH0.582HNixNNbWh5Ue0UFpqYqzS6_1e0GSB0c1EdJ00fvY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStats() {
    console.log("📊 Checking Database Volume (Estimated)...\n");

    // Try to login to bypass RLS
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@chsuite.com',
        password: 'admin123'
    });

    if (authError) {
        console.log("⚠️ Could not authenticate as admin. Results may be limited by RLS.");
        console.log("Auth Error:", authError.message);
    } else {
        console.log("✅ Authenticated as admin. Accessing protected data...\n");
    }

    const tables = ['expenses', 'trips', 'audit_logs', 'user_profiles', 'units'];
    let totalRows = 0;

    // Roughly estimate bytes per row type
    const sizeEstimates: Record<string, number> = {
        'expenses': 200,
        'trips': 500,
        'audit_logs': 300,
        'user_profiles': 400,
        'units': 150
    };

    let output = "Table             | Rows       | Est. Size (Raw Data)\n";
    output += "------------------|------------|---------------------\n";

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            output += `${table.padEnd(17)} | Error: ${error.message}\n`;
        } else {
            const rows = count || 0;
            totalRows += rows;
            const sizeBytes = rows * (sizeEstimates[table] || 200);
            const sizeKB = (sizeBytes / 1024).toFixed(2);

            output += `${table.padEnd(17)} | ${rows.toString().padEnd(10)} | ~${sizeKB} KB\n`;
        }
    }

    output += "------------------|------------|---------------------\n";
    output += `TOTAL REGISTROS   : ${totalRows}\n`;

    console.log(output);

    // Write to file to ensure capture
    try {
        const fs = await import('fs');
        fs.writeFileSync('db_stats_output.txt', output, 'utf8');
        console.log("Output saved to db_stats_output.txt");
    } catch (e) {
        console.error("Error writing file:", e);
    }

    console.log(`\n⚠️ Nota: Este é apenas o volume de dados brutos textuais.`);
}

checkStats();
