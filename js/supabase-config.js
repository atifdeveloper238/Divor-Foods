// ============================================================
// FILL THESE IN — Supabase Project Settings -> API
// ============================================================
const SUPABASE_URL = "https://ddlehbvmwdhqmtzjdvdk.supabase.co"; // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "sb_publishable_hPd-CJO0256e4EhS9GkBgA_xJMTrKh-"; // the "anon public" key, NOT service_role

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
