import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oqxuonwqzuxsrrgszxpl.supabase.co'
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_As2HD2PQhBcQe0RVOmpeWA_ddlIjf5U'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)
