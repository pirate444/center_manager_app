import { NextRequest, NextResponse } from 'next/server';

let logs: { timestamp: string; level: string; message: string; data?: any }[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entry = {
      timestamp: new Date().toISOString(),
      level: body.level || 'info',
      message: body.message || '',
      data: body.data || null,
    };
    logs.push(entry);
    if (logs.length > 100) logs.shift(); // Keep last 100
    console.log(`[MOBILE_LOG ${entry.level.toUpperCase()}] ${entry.message}`, entry.data || '');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ logs });
}
