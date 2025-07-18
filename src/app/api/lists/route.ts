import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { verifyToken } from '@/lib/auth';

function mapList(list: any) {
  return {
    ...list,
    id: list._id?.toString(),
    _id: undefined,
  };
}

export async function GET(req: NextRequest) {
    const client = await clientPromise;
    const db = client.db();

    const lists = await db.collection('lists').find().sort({ createdAt: 1 }).toArray();
    const mappedLists = lists.map(mapList);
    return NextResponse.json(mappedLists);
}

export async function POST(req: NextRequest) {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();
    const client = await clientPromise;
    const db = client.db();

    const newList = {
        name,
        createdAt: new Date(),
    };

    const result = await db.collection('lists').insertOne(newList);
    const insertedList = await db.collection('lists').findOne({ _id: result.insertedId });
    return NextResponse.json(mapList(insertedList));
}

export async function PUT(req: NextRequest) {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const { name } = await req.json();

    if (!id) {
        return NextResponse.json({ message: 'List ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection('lists').updateOne({ _id: new ObjectId(id) }, { $set: { name } });
    const updatedList = await db.collection('lists').findOne({ _id: new ObjectId(id) });
    return NextResponse.json(mapList(updatedList));
}

export async function DELETE(req: NextRequest) {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ message: 'List ID is required' }, { status: 400 });
    }

    if (id === 'default') {
        return NextResponse.json({ message: 'Cannot delete default list' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Move todos from deleted list to default list
    await db.collection('todos').updateMany({ listId: id }, { $set: { listId: 'default' } });

    const result = await db.collection('lists').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
        return NextResponse.json({ message: 'List not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'List deleted' });
} 