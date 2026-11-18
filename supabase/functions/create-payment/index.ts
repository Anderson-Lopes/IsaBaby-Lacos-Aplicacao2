import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
  const appUrl = Deno.env.get('PUBLIC_APP_URL');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !accessToken || !appUrl) {
    return jsonResponse({ error: 'Payment service is not configured' }, 503);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) return jsonResponse({ error: 'Authentication required' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userError } = await userClient.auth.getUser();
  if (userError || !userResult.user) return jsonResponse({ error: 'Invalid session' }, 401);

  let addressId: string;
  try {
    const body = await request.json();
    addressId = body.addressId;
    if (typeof addressId !== 'string' || !/^[0-9a-f-]{36}$/i.test(addressId)) {
      return jsonResponse({ error: 'A valid delivery address is required' }, 400);
    }
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  const { data: order, error: orderError } = await userClient.rpc('create_order_from_cart', {
    p_address_id: addressId,
  });
  if (orderError) return jsonResponse({ error: orderError.message }, 400);

  try {
    const { data: orderRow, error: queryError } = await userClient
      .from('orders')
      .select('id,number,total,order_items(product_id,product_name,quantity,unit_price)')
      .eq('id', order.id)
      .single();
    if (queryError) throw queryError;

    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        external_reference: orderRow.id,
        payer: { email: userResult.user.email },
        items: orderRow.order_items.map((item: {
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
        }) => ({
          id: item.product_id,
          title: item.product_name,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          currency_id: 'BRL',
        })),
        back_urls: {
          success: `${appUrl}/?payment=success&order_id=${orderRow.id}`,
          pending: `${appUrl}/?payment=pending&order_id=${orderRow.id}`,
          failure: `${appUrl}/?payment=failure&order_id=${orderRow.id}`,
        },
        auto_return: 'approved',
        notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
        metadata: { order_id: orderRow.id },
      }),
    });
    const preference = await preferenceResponse.json();
    if (!preferenceResponse.ok || typeof preference.init_point !== 'string') {
      throw new Error('The payment provider could not create the checkout.');
    }

    const { error: preferenceError } = await userClient.rpc('set_payment_preference', {
      p_order_id: orderRow.id,
      p_preference_id: preference.id,
    });
    if (preferenceError) throw preferenceError;

    return jsonResponse({
      orderId: orderRow.id,
      orderNumber: orderRow.number,
      total: orderRow.total,
      checkoutUrl: preference.init_point,
    }, 200);
  } catch (cause) {
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: rollbackError } = await serviceClient.rpc('cancel_unpaid_order', {
      p_order_id: order.id,
    });
    if (rollbackError) console.error('Failed to release stock after payment setup error', rollbackError);
    console.error('Payment preference creation failed', cause);
    return jsonResponse({ error: 'Could not create the payment checkout. Please try again.' }, 502);
  }
});
