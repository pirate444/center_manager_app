import { NextResponse } from 'next/server';

export const LATEST_APK_URL =
  'https://expo.dev/artifacts/eas/5Ri-z3AbuboEX04H7EO-YayFZtVSRKhOjCwafliHl_0.apk';

export async function GET() {
  return NextResponse.redirect(LATEST_APK_URL, 307);
}
