import { createClient } from '@supabase/supabase-js';

// Use static access for environment variables so Vite can replace them during build
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback values (hardcoded as a last resort to prevent app crash)
const DEFAULT_URL = 'https://cabdbnfjpsxbdmriabct.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYmRibmZqcHN4YmRtcmlhYmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTU5NDQsImV4cCI6MjA4NDY5MTk0NH0.582HNixNNbWh5Ue0UFpqYqzS6_1e0GSB0c1EdJ00fvY';

const isValidUrl = (u: any): u is string => {
    try {
        return typeof u === 'string' && u.startsWith('http');
    } catch {
        return false;
    }
};

const supabaseUrl = isValidUrl(url) ? url : DEFAULT_URL;
const supabaseAnonKey = (typeof key === 'string' && key.length > 20) ? key : DEFAULT_KEY;

if (import.meta.env.PROD) {
    console.log('Production mode detected.');
    console.log('Using Supabase URL Source:', isValidUrl(url) ? 'Environment Variable' : 'Hardcoded Fallback');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


