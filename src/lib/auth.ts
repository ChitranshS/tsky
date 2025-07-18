import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-super-secret-jwt-key'; // You should use an environment variable for this

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
} 