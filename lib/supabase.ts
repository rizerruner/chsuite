import { createClient } from '@supabase/supabase-js';

const getEnvVar = (name: string, fallback: string) => {
    const val = import.meta.env[name];
    if (!val || val === 'undefined' || val === 'null' || (name.includes('URL') && !val.startsWith('http'))) {
        return fallback;
    }
    return val;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://cabdbnfjpsxbdmriabct.supabase.co');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYmRibmZqcHN4YmRtcmlhYmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTU5NDQsImV4cCI6MjA4NDY5MTk0NH0.582HNixNNbWh5Ue0UFpqYqzS6_1e0GSB0c1EdJ00fvY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
