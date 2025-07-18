import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { verifyToken } from '@/lib/auth';

function mapNote(note: any) {
  return {
    ...note,
    id: note._id?.toString(),
    _id: undefined,
  };
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    const client = await clientPromise;
    const db = client.db();

    const query: any = {};
    if (date) query.createdAt = { $gte: new Date(date), $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)) };

    const notes = await db.collection('notes').find(query).sort({ createdAt: -1 }).toArray();
    const mappedNotes = notes.map(mapNote);
    return NextResponse.json(mappedNotes);
}

export async function POST(req: NextRequest) {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const note = await req.json();
    const client = await clientPromise;
    const db = client.db();

    const newNote = {
        ...note,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const result = await db.collection('notes').insertOne(newNote);
    const insertedNote = await db.collection('notes').findOne({ _id: result.insertedId });
    return NextResponse.json(mapNote(insertedNote));
}

export async function PUT(req: NextRequest) {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const updates = await req.json();

    if (!id) {
        return NextResponse.json({ message: 'Note ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection('notes').updateOne({ _id: new ObjectId(id) }, { $set: { ...updates, updatedAt: new Date() } });
    const updatedNote = await db.collection('notes').findOne({ _id: new ObjectId(id) });
    return NextResponse.json(mapNote(updatedNote));
}

export async function DELETE(req: NextRequest) {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ message: 'Note ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection('notes').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
        return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note deleted' });
} 