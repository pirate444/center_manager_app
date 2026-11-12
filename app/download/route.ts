import { NextResponse } from 'next/server';

export const LATEST_APK_URL =
  'https://expo.dev/artifacts/eas/31xE21UiTte6I-SD-VskjuQk0aaWRAjq3aMI1GnvOKw.apk';

export async function GET() {
  return NextResponse.redirect(LATEST_APK_URL, 307);
}
