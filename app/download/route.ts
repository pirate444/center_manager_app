import { NextResponse } from 'next/server';

export const LATEST_APK_URL =
  'https://expo.dev/artifacts/eas/bUSO-nEcjiPpZev_EZTJUC0nMKST09pavzMZ2ChZeSE.apk';

export async function GET() {
  return NextResponse.redirect(LATEST_APK_URL, 307);
}
