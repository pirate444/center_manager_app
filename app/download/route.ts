import { NextResponse } from 'next/server';

export const LATEST_APK_URL =
  'https://expo.dev/artifacts/eas/jKbvrpWAo37rwBjoRu2ExtC879o8CPz77zBaNvEY49Y.apk';

export async function GET() {
  return NextResponse.redirect(LATEST_APK_URL, 307);
}
