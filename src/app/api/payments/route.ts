import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// POST /api/payments — create a Razorpay order
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { amount, currency, purpose, metadata } = body;

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_T4hRlx7lxeHMs8';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'L7RmqKPjeOb0rH98BezDVD4p';

    // Create Razorpay order via REST API (no SDK dependency issues)
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // rupees to paise
        currency: currency || 'INR',
        receipt: `${purpose || 'payment'}_${session.id.slice(-8)}_${Date.now()}`,
        notes: { userId: session.id, purpose: purpose || 'general', ...metadata },
      }),
    });

    if (!orderResponse.ok) {
      const err = await orderResponse.text();
      console.error('Razorpay API error:', err);
      return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 });
    }

    const order = await orderResponse.json();

    return NextResponse.json({
      success: true,
      order: { id: order.id, amount: order.amount, currency: order.currency },
      key: keyId,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 });
  }
}
