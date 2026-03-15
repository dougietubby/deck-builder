import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { email } = await req.json()

  if (!email) {
    return new Response(JSON.stringify({ ok: false }), { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data } = await supabase
    .from("whitelist")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (!data) {
    return new Response(JSON.stringify({ ok: false }), { status: 403 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})