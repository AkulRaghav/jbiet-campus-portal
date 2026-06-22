import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import crypto from 'crypto';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'L7RmqKPjeOb0rH98BezDVD4p';

/**
 * POST /api/payments/verify
 * 
 * Server-side signature verification before marking any payment as successful.
 * NEVER trust client-side "payment succeeded" — always verify with Razorpay's signature.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, purpose, feeId, examSessionId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 });
    }

    // CRITICAL: Server-side signature verification
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('[PAYMENT FRAUD] Signature mismatch:', { razorpay_order_id, razorpay_payment_id, userId: session.id });
      await logAudit(session.id, 'PAYMENT_SIGNATURE_FAILED', 'Payment', razorpay_order_id, { razorpay_payment_id });
      return NextResponse.json({ error: 'Payment verification failed — signature mismatch' }, { status: 400 });
    }

    // Signature verified — now process based on purpose
    if (purpose === 'EXAM_FEE' && examSessionId) {
      // Mark exam registration as paid
      const student = await prisma.student.findFirst({ where: { userId: session.id } });
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

      const reg = await prisma.examRegistration.findFirst({
        where: { studentId: student.id, examSessionId },
      });

      if (!reg) {
        // Create registration + mark paid in one step
        await prisma.examRegistration.create({
          data: {
            studentId: student.id,
            examSessionId,
            examFeePaid: true,
            examFeeAmount: 2000,
            examFeeTransId: razorpay_payment_id,
            hallTicketReady: true,
          },
        });
      } else {
        await prisma.examRegistration.update({
          where: { id: reg.id },
          data: { examFeePaid: true, examFeeTransId: razorpay_payment_id, hallTicketReady: true },
        });
      }

      await logAudit(session.id, 'EXAM_FEE_PAID', 'ExamRegistration', examSessionId, {
        razorpay_payment_id, razorpay_order_id, amount: 2000,
      });

      return NextResponse.json({ success: true, message: 'Exam fee paid. Hall ticket ready.' });
    }

    if (purpose === 'FEE_PAYMENT' && feeId) {
      // Mark general fee as paid
      const feeRecord = await prisma.feeRecord.findUnique({ where: { id: feeId } });
      if (!feeRecord) return NextResponse.json({ error: 'Fee record not found' }, { status: 404 });

      // Verify this fee belongs to the current student
      const student = await prisma.student.findFirst({ where: { userId: session.id } });
      if (!student || feeRecord.studentId !== student.id) {
        return NextResponse.json({ error: 'Unauthorized fee record' }, { status: 403 });
      }

      await prisma.feeRecord.update({
        where: { id: feeId },
        data: {
          paidAmount: feeRecord.totalAmount,
          status: 'PAID',
          paidDate: new Date(),
          transactionId: razorpay_payment_id,
        },
      });

      await logAudit(session.id, 'FEE_PAID', 'FeeRecord', feeId, {
        razorpay_payment_id, razorpay_order_id, amount: feeRecord.totalAmount, category: feeRecord.category,
      });

      return NextResponse.json({ success: true, message: `${feeRecord.category} fee paid successfully.` });
    }

    return NextResponse.json({ error: 'Unknown payment purpose' }, { status: 400 });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
  }
}
