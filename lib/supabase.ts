import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local.')
}

/**
 * Browser-safe client — uses the anon key.
 * All RLS policies apply. Safe to use in client components.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Server-only client — uses the service role key.
 * Bypasses RLS. NEVER expose this to the browser.
 * Use only in API routes and server components.
 */
export function getServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })
}
