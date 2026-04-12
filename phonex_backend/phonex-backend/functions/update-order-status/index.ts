// supabase/functions/update-order-status/index.ts
// Admin webhook endpoint to update order shipping status.
// Called by shipping providers or admin dashboard.
// Deploy: supabase functions deploy update-order-status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify webhook secret for external calls (e.g. Shiprocket)
    const webhookSecret = req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET')
    if (expectedSecret && webhookSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const {
      order_id,
      status,
      tracking_number,
      shipped_at,
      delivered_at,
    } = await req.json()

    const VALID_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
    if (!VALID_STATUSES.includes(status)) {
      return new Response(JSON.stringify({ error: `Invalid status: ${status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (tracking_number) updatePayload.tracking_number = tracking_number
    if (shipped_at)      updatePayload.shipped_at      = shipped_at
    if (delivered_at)    updatePayload.delivered_at    = delivered_at
    if (status === 'refunded') updatePayload.payment_status = 'refunded'

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', order_id)
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, order: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
