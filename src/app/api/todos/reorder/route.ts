import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../../lib/mongodb';
import { verifyToken } from '@/lib/auth';

export async function PUT(req: NextRequest) {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { todoIds } = await req.json();

    if (!todoIds || !Array.isArray(todoIds) || todoIds.length === 0) {
        return NextResponse.json({ message: 'Invalid todo IDs' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Update each todo with its new position
    const operations = todoIds.map((id, index) => ({
        updateOne: {
            filter: { _id: new ObjectId(id) },
            update: { $set: { position: index } }
        }
    }));
    
    try {
        await db.collection('todos').bulkWrite(operations);
        return NextResponse.json({ message: 'Todos reordered successfully' });
    } catch (error) {
        console.error('Error reordering todos:', error);
        return NextResponse.json({ message: 'Failed to reorder todos' }, { status: 500 });
    }
} 