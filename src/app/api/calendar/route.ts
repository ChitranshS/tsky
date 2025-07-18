import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || '', 10);
    const month = parseInt(searchParams.get('month') || '', 10);

    if (isNaN(year) || isNaN(month)) {
        return NextResponse.json({ message: 'Year and month are required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const todos = await db.collection('todos').find({
        createdAt: { $gte: startDate, $lte: endDate },
    }).toArray();

    const notes = await db.collection('notes').find({
        createdAt: { $gte: startDate, $lte: endDate },
    }).toArray();

    const daysInMonth = endDate.getDate();
    const calendarDays = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];

        const todoCount = todos.filter(todo => new Date(todo.createdAt).getDate() === day).length;
        const noteCount = notes.filter(note => new Date(note.createdAt).getDate() === day).length;

        calendarDays.push({
            date: dateStr,
            todoCount,
            noteCount,
        });
    }

    return NextResponse.json(calendarDays);
} 