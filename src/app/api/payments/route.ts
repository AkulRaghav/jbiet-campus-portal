import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_T4hRlx7lxeHMs8',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'L7RmqKPjeOb0rH98BezDVD4p',
});

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

    // Create Razorpay order (amount in paise)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert rupees to paise
      currency: currency || 'INR',
      receipt: `${purpose || 'payment'}_${session.id}_${Date.now()}`,
      notes: {
        userId: session.id,
        purpose: purpose || 'general',
        ...metadata,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_T4hRlx7lxeHMs8',
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 });
  }
}
