import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization')
  const accessToken = authHeader?.replace(/^Bearer\s+/i, '')
  if (!accessToken) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } })
  const { data: { user }, error: userError } = await userClient.auth.getUser(accessToken)
  if (userError || !user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 })

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('camp,is_production')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) return new Response(JSON.stringify({ error: 'Profile lookup failed' }), { status: 500 })

  const appId = Deno.env.get('ONESIGNAL_APP_ID')
  const restKey = Deno.env.get('ONESIGNAL_REST_API_KEY')
  if (!appId || !restKey) return new Response(JSON.stringify({ error: 'OneSignal server configuration is missing' }), { status: 500 })

  const response = await fetch(`https://api.onesignal.com/apps/${appId}/users/by/external_id/${encodeURIComponent(user.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${restKey}` },
    body: JSON.stringify({
      properties: {
        tags: {
          grove_member: 'true',
          supabase_user_id: user.id,
          camp: profile?.is_production ? 'Staff' : (profile?.camp || 'unknown')
        }
      }
    })
  })

  if (!response.ok) {
    const body = await response.text()
    return new Response(JSON.stringify({ error: 'OneSignal update failed', detail: body.slice(0, 1000) }), { status: 502 })
  }

  return new Response(JSON.stringify({ synced: true, user_id: user.id, camp: profile?.is_production ? 'Staff' : (profile?.camp || 'unknown') }), { status: 200 })
})
