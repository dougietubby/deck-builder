import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ============================================================
// ABILITY NOTIFICATION DEVELOPMENT TOGGLE
// Set the Supabase Edge Function secret to "true" when ability notifications are ready for campers.
// The default is false so normal camper-facing ability delivery is off during development.
// ============================================================
const ABILITY_CAMPER_NOTIFICATIONS_ENABLED = Deno.env.get('ABILITY_CAMPER_NOTIFICATIONS_ENABLED') === 'true'

const render = (template: string, variables: Record<string, unknown>) => template.replace(/\[([a-z_]+)\]/gi, (_, key) => String(variables[key] ?? `[${key}]`))

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { error: expirationError } = await supabase.rpc('expire_ability_effects')
  if (expirationError) return new Response(JSON.stringify({ error: expirationError.message }), { status: 500 })
  const { data: jobs, error } = await supabase.rpc('claim_ability_notifications', {
    limit_value: 50,
    lease_seconds: 300,
    max_attempts: 5
  })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const appId = Deno.env.get('ONESIGNAL_APP_ID')
  const restKey = Deno.env.get('ONESIGNAL_REST_API_KEY')
  if (!appId || !restKey) return new Response(JSON.stringify({ error: 'OneSignal server configuration is missing' }), { status: 500 })

  let sent = 0
  let suppressed = 0
  for (const job of jobs ?? []) {
    try {
      const isProductionNotification = job.audience === 'production' || job.recipient_camp === 'Staff'
      if (!isProductionNotification && !ABILITY_CAMPER_NOTIFICATIONS_ENABLED) {
        await supabase.from('ability_notifications').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          processing_started_at: null,
          last_error: null
        }).eq('id', job.id)
        suppressed++
        continue
      }
      const message = render(job.template, job.variables ?? {})
      const filters = job.recipient_user_id
        ? [{ field: 'tag', key: 'supabase_user_id', relation: '=', value: job.recipient_user_id }]
        : job.recipient_camp
          ? [{ field: 'tag', key: 'camp', relation: '=', value: job.recipient_camp }]
          : job.audience === 'production'
            ? [{ field: 'tag', key: 'camp', relation: '=', value: 'Staff' }]
            : [{ field: 'tag', key: 'grove_member', relation: '=', value: 'true' }]
      const response = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${restKey}`,
          'Idempotency-Key': job.idempotency_key
        },
        body: JSON.stringify({ app_id: appId, contents: { en: message }, filters })
      })
      if (response.ok) {
        await supabase.from('ability_notifications').update({ status: 'sent', sent_at: new Date().toISOString(), processing_started_at: null }).eq('id', job.id)
        sent++
      } else {
        const responseBody = await response.text()
        const nextStatus = job.processing_attempts >= 5 ? 'failed' : 'pending'
        await supabase.from('ability_notifications').update({
          status: nextStatus,
          processing_started_at: null,
          failed_at: nextStatus === 'failed' ? new Date().toISOString() : null,
          last_error: `OneSignal ${response.status}: ${responseBody.slice(0, 1000)}`
        }).eq('id', job.id)
      }
    } catch (error) {
      const nextStatus = job.processing_attempts >= 5 ? 'failed' : 'pending'
      await supabase.from('ability_notifications').update({
        status: nextStatus,
        processing_started_at: null,
        failed_at: nextStatus === 'failed' ? new Date().toISOString() : null,
        last_error: `Delivery exception: ${String(error).slice(0, 1000)}`
      }).eq('id', job.id)
    }
  }
  return new Response(JSON.stringify({ processed: jobs?.length ?? 0, sent, suppressed }), { status: 200 })
})