import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifySignature(secret: string, signature: string, requestId: string, paymentId: string): Promise<boolean> {
  const values = Object.fromEntries(signature.split(',').map((part) => {
    const [key, value] = part.trim().split('=');
    return [key, value];
  }));
  if (!values.ts || !values.v1) return false;
  const manifest = `id:${paymentId};request-id:${requestId};ts:${values.ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return constantTimeEqual(expected, values.v1);
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
  const webhookSecret = Deno.env.get('MP_WEBHOOK_SECRET');
  if (!supabaseUrl || !serviceRoleKey || !accessToken || !webhookSecret) {
    return jsonResponse({ error: 'Webhook is not configured' }, 503);
  }

  let payload: { type?: string; action?: string; data?: { id?: string | number } };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid notification body' }, 400);
  }

  const paymentId = payload.data?.id?.toString();
  if (!paymentId || (payload.type && payload.type !== 'payment')) {
    return jsonResponse({ received: true }, 200);
  }
  const signature = request.headers.get('x-signature') ?? '';
  const requestId = request.headers.get('x-request-id') ?? '';
  if (!requestId || !await verifySignature(webhookSecret, signature, requestId, paymentId)) {
    return jsonResponse({ error: 'Invalid webhook signature' }, 401);
  }

  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!paymentResponse.ok) return jsonResponse({ error: 'Could not verify payment with provider' }, 502);
  const payment = await paymentResponse.json();
  const orderId = payment.external_reference;
  const transactionAmount = Number(payment.transaction_amount);
  if (
    typeof orderId !== 'string'
    || typeof payment.currency_id !== 'string'
    || typeof payment.status !== 'string'
    || !Number.isFinite(transactionAmount)
  ) {
    return jsonResponse({ error: 'Payment details are incomplete' }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: storedPayment, error: storedPaymentError } = await serviceClient
    .from('payments')
    .select('order_id,amount,currency')
    .eq('order_id', orderId)
    .single();
  if (storedPaymentError || !storedPayment) return jsonResponse({ error: 'Order payment not found' }, 404);
  if (
    payment.currency_id !== storedPayment.currency
    || Math.abs(transactionAmount - Number(storedPayment.amount)) > 0.01
  ) {
    return jsonResponse({ error: 'Payment amount or currency does not match the order' }, 400);
  }

  const statusMap: Record<string, string> = {
    approved: 'approved',
    rejected: 'rejected',
    cancelled: 'cancelled',
    refunded: 'refunded',
  };
  const status = statusMap[payment.status] ?? 'pending';
  const { error: updateError } = await serviceClient.rpc('record_mercado_pago_result', {
    p_order_id: orderId,
    p_payment_id: paymentId,
    p_status: status,
  });
  if (updateError) {
    console.error('Payment webhook database update failed', updateError);
    return jsonResponse({ error: 'Could not record payment status' }, 500);
  }
  return jsonResponse({ received: true }, 200);
});
