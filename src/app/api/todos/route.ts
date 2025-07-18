import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { verifyToken } from '@/lib/auth';

function mapTodo(todo: any) {
  return {
    ...todo,
    id: todo._id?.toString(),
    _id: undefined,
  };
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get('listId');
    const date = searchParams.get('date');

    const client = await clientPromise;
    const db = client.db();

    const query: any = {};
    if (listId) query.listId = listId;
    if (date) query.createdAt = { $gte: new Date(date), $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)) };

    const todos = await db.collection('todos').find(query).sort({ createdAt: -1 }).toArray();
    const mappedTodos = todos.map(mapTodo);
    return NextResponse.json(mappedTodos);
}

export async function POST(req: NextRequest) {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const todo = await req.json();
    const client = await clientPromise;
    const db = client.db();

    const newTodo = {
        ...todo,
        createdAt: new Date(),
    };

    const result = await db.collection('todos').insertOne(newTodo);
    const insertedTodo = await db.collection('todos').findOne({ _id: result.insertedId });
    return NextResponse.json(mapTodo(insertedTodo));
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
        return NextResponse.json({ message: 'Todo ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection('todos').updateOne({ _id: new ObjectId(id) }, { $set: updates });
    const updatedTodo = await db.collection('todos').findOne({ _id: new ObjectId(id) });
    return NextResponse.json(mapTodo(updatedTodo));
}

export async function DELETE(req: NextRequest) {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ message: 'Todo ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection('todos').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
        return NextResponse.json({ message: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Todo deleted' });
} 