// supabase/functions/process-order/index.ts
// Edge Function: Confirms an order and optionally sends a confirmation email.
// Deploy: supabase functions deploy process-order

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Create user-scoped client to verify auth
    const authHeader = req.headers.get('Authorization')!
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user is authenticated
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { order_id, payment_ref, payment_method } = await req.json()

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify order belongs to this user
    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(name, price))')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Order is already ${order.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Confirm the order (this triggers stock decrement via DB trigger)
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_ref: payment_ref ?? null,
        payment_method: payment_method ?? 'card',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)
      .select()
      .single()

    if (updateErr) throw updateErr

    // ── Optional: Send confirmation email via Resend ──────
    // const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    // if (RESEND_API_KEY) {
    //   const profile = await supabaseAdmin
    //     .from('profiles')
    //     .select('display_name')
    //     .eq('user_id', user.id)
    //     .single()
    //
    //   await fetch('https://api.resend.com/emails', {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${RESEND_API_KEY}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       from: 'PHONEX <orders@phonex.store>',
    //       to: user.email,
    //       subject: `Order Confirmed — #${order_id.slice(0, 8).toUpperCase()}`,
    //       html: buildOrderEmail(profile.data?.display_name, order),
    //     }),
    //   })
    // }

    return new Response(
      JSON.stringify({ success: true, order: updated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('process-order error:', err)
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─── Email template builder ───────────────────────────────
function buildOrderEmail(name: string, order: any): string {
  const items = order.order_items
    .map((i: any) => `<tr>
      <td style="padding:8px 0;">${i.products.name}</td>
      <td style="padding:8px 0;text-align:right;">×${i.quantity}</td>
      <td style="padding:8px 0;text-align:right;">$${(i.unit_price * i.quantity).toFixed(2)}</td>
    </tr>`)
    .join('')

  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1A1814;">
      <h1 style="letter-spacing:0.3em;font-size:14px;text-transform:uppercase;">P H O N E X</h1>
      <p>Dear ${name},</p>
      <p>Your order has been confirmed. We'll notify you when it ships.</p>
      <table style="width:100%;border-top:1px solid #e8e2d9;margin-top:24px;">
        <thead>
          <tr style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#9a938a;">
            <th style="text-align:left;padding:8px 0;">Item</th>
            <th style="text-align:right;padding:8px 0;">Qty</th>
            <th style="text-align:right;padding:8px 0;">Price</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
        <tfoot>
          <tr style="border-top:1px solid #e8e2d9;">
            <td colspan="2" style="padding:12px 0;font-weight:bold;">Total</td>
            <td style="padding:12px 0;text-align:right;font-weight:bold;">$${order.total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="margin-top:32px;font-size:12px;color:#9a938a;">
        Order ID: ${order.id}<br/>
        Questions? Reply to this email or visit phonex.store/help
      </p>
    </div>
  `
}
