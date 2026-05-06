require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith('http') 
  ? process.env.SUPABASE_URL 
  : 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn("Aviso: SUPABASE_URL ou SUPABASE_ANON_KEY não estão configurados corretamente no .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
