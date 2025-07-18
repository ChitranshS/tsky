import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import clientPromise from '../../../lib/mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ message: 'Password is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    let user = await usersCollection.findOne({ username: 'admin' });

    // If no admin user exists, create one with the first password entered.
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        username: 'admin',
        password: hashedPassword,
        createdAt: new Date(),
      };
      const result = await usersCollection.insertOne(newUser);
      
      // Fetch the newly created user to get the correct _id
      user = await usersCollection.findOne({ _id: result.insertedId });
      
      if (!user) {
        // This should not happen, but as a safeguard
        return NextResponse.json({ message: 'Failed to create and retrieve user.' }, { status: 500 });
      }

    } else {
      // If a user exists, compare the provided password with the stored hash.
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      }
    }
    
    // If password is correct (or user was just created), generate a token.
    const token = jwt.sign({ userId: user._id.toString(), username: user.username }, JWT_SECRET, {
      expiresIn: '1d', // Token expires in 1 day
    });

    return NextResponse.json({ token });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
} 