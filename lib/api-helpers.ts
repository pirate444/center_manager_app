import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

// Helper: Convert Mongoose document to a plain object with `id` field
export function toPlain(doc: mongoose.Document | null) {
  if (!doc) return null;
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

export function toPlainArray(docs: mongoose.Document[]) {
  return docs.map((d) => toPlain(d));
}

// Generic CRUD route builders for collection routes
export function createCollectionHandler(Model: mongoose.Model<any>) {
  return {
    async GET() {
      try {
        await dbConnect();
        const docs = await Model.find({}).sort({ createdAt: -1 });
        return NextResponse.json(toPlainArray(docs));
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    },

    async POST(request: NextRequest) {
      try {
        await dbConnect();
        const body = await request.json();
        const doc = await Model.create(body);
        return NextResponse.json(toPlain(doc), { status: 201 });
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    },
  };
}

export function createItemHandler(Model: mongoose.Model<any>) {
  return {
    async GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
      try {
        await dbConnect();
        const { id } = await params;
        const doc = await Model.findById(id);
        if (!doc) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json(toPlain(doc));
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    },

    async PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
      try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        const doc = await Model.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        if (!doc) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json(toPlain(doc));
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    },

    async DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
      try {
        await dbConnect();
        const { id } = await params;
        const doc = await Model.findByIdAndDelete(id);
        if (!doc) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    },
  };
}
