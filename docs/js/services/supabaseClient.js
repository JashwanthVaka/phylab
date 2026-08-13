let clientPromise;
export async function getSupabase() { if (clientPromise) return clientPromise; const url=window.PHYLAB_ENV?.SUPABASE_URL, key=window.PHYLAB_ENV?.SUPABASE_ANON_KEY; if(!url||!key) return null; clientPromise=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})); return clientPromise; }
export const isCloudEnabled=()=>Boolean(window.PHYLAB_ENV?.SUPABASE_URL&&window.PHYLAB_ENV?.SUPABASE_ANON_KEY);
