import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get('url');
  const fileName = searchParams.get('name');
  
  if (!fileUrl) return NextResponse.json({ success: false, message: 'Missing URL' }, { status: 400 });
  
  const fileId = fileUrl.match(/\/d\/([^/]+)/)?.[1];
  if (!fileId) return NextResponse.json({ success: false, message: 'Invalid URL' }, { status: 400 });
  
  return NextResponse.redirect(`https://drive.google.com/uc?export=download&id=${fileId}`);
}