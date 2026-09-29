import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import OtpCode from '@/models/OtpCode';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { email, code, purpose } = body;
    
    if (!email || !code || !purpose) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const otp = await OtpCode.findOne({
      email,
      code,
      purpose,
      status: 'pending'
    });

    if (!otp) {
      return NextResponse.json({ error: 'Invalid or expired OTP code' }, { status: 400 });
    }

    // Mark as used
    otp.status = 'used';
    await otp.save();
    
    return NextResponse.json({ success: true, message: 'OTP verified successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
