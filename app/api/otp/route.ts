import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import OtpCode from '@/models/OtpCode';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const codes = await OtpCode.find().sort({ createdAt: -1 });
    return NextResponse.json(codes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Generate a 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newOtp = await OtpCode.create({
      code,
      purpose: body.purpose,
      email: body.email,
      status: 'pending',
    });
    
    return NextResponse.json(newOtp, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
