/**
 * InsightFlow — Supabase Client Setup
 */

const SUPABASE_URL = 'https://dxuknbbcrfiuuoiohpyn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mBDv9aXfNCfAChMe0Q9_Rw_o5oiK3nh'; // Paste your full publishable key here

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);