import { NextResponse } from 'next/server';
import { getDrive, getSheets } from '@/lib/google';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    const category = formData.get('category');
    const description = formData.get('description') || '';
    const customName = formData.get('customName') || file.name;

    if (!file) return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const drive = await getDrive();
    const sheets = await getSheets();

    // Upload to Drive
    const driveRes = await drive.files.create({
      requestBody: {
        name: customName,
        parents: [process.env.DRIVE_FOLDER_ID],
        mimeType: file.type,
      },
      media: { mimeType: file.type, body: buffer },
    });

    await drive.permissions.create({
      fileId: driveRes.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const docId = 'DOC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: `${process.env.SHEET_NAME}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          docId, customName, category,
          new Date().toISOString(),
          `https://drive.google.com/file/d/${driveRes.data.id}/view`,
          description,
          buffer.length.toString()
        ]]
      }
    });

    return NextResponse.json({ success: true, message: 'Dokumen berhasil disimpan!' });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
