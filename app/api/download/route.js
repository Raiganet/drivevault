import { NextResponse } from 'next/server';
import { getDrive } from '@/lib/google';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const fileName = searchParams.get('name') || 'download';

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    console.log('📥 Downloading file:', fileId, fileName);

    // Get Drive client
    const drive = await getDrive();

    // Get file metadata
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size'
    });

    // Download file
    const res = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Create response with proper headers
    const headers = new Headers({
      'Content-Type': file.data.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${file.data.name || fileName}"`,
      'Content-Length': file.data.size?.toString() || '0',
      'Cache-Control': 'no-cache'
    });

    return new Response(res.data, {
      headers: headers,
      status: 200
    });

  } catch (error) {
    console.error('❌ Download error:', error);
    return NextResponse.json(
      { error: 'Download failed: ' + error.message },
      { status: 500 }
    );
  }
}
