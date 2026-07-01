// ============================================================
// SUPAABASE - CONFIG (TERPISAH)
// ============================================================

const SUPABASE_URL = 'https://ltitsmpdizbomyprofsh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0aXRzbXBkaXpib215cHJvZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk3MjU2ODAsImV4cCI6MjAzNTMwMTY4MH0.7dV-D1qF1S9i0nFuPzLq8FwVfJ0Mji3tU5NtS0QpDm4';

// Deklarasi SUPABASE - HANYA SEKALI!
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase connected!');
