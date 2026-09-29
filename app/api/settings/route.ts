import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SettingsModel from '@/models/Settings';
import { toPlain } from '@/lib/api-helpers';

export async function GET() {
  try {
    await dbConnect();
    let settings = await SettingsModel.findOne({});
    if (!settings) {
      settings = await SettingsModel.create({}); // Create default if none exists
    }
    return NextResponse.json(toPlain(settings));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    let settings = await SettingsModel.findOne({});
    if (!settings) {
      settings = await SettingsModel.create(body);
    } else {
      settings = await SettingsModel.findByIdAndUpdate(settings._id, body, { new: true });
    }
    return NextResponse.json(toPlain(settings));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
