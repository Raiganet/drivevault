import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const USERS = {
  admin: { password: 'Haidar141019', role: 'admin', name: 'Diky Hermansyah' },
  guest: { password: 'guest123', role: 'guest', name: 'Guest User' }
};

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    const user = USERS[username];
    
    if (!user || user.password !== password) {
      return NextResponse.json({ success: false, message: 'Username atau password salah!' }, { status: 401 });
    }

    const token = jwt.sign(
      { username, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'drivevault-secret-key-2026',
      { expiresIn: '10h' }
    );

    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 10,
      path: '/',
    });

    return NextResponse.json({ success: true, role: user.role, name: user.name });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
