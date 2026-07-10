import { NextResponse } from 'next/server';
import { getDrive, getSheets } from '@/lib/google';
import { cookies } from 'next/headers';
import { Readable } from 'stream';

export async function POST(req) {
  try {
    console.log('📤 Upload request received');
    
    // Check environment variables
    const missingVars = [];
    if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
    if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
    if (!process.env.GOOGLE_REFRESH_TOKEN) missingVars.push('GOOGLE_REFRESH_TOKEN');
    if (!process.env.DRIVE_FOLDER_ID) missingVars.push('DRIVE_FOLDER_ID');
    if (!process.env.SHEET_ID) missingVars.push('SHEET_ID');
    if (!process.env.SHEET_NAME) missingVars.push('SHEET_NAME');
    
    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars);
      return NextResponse.json({ 
        success: false, 
        message: `Missing environment variables: ${missingVars.join(', ')}` 
      }, { status: 500 });
    }

    // Check auth
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      console.error('❌ Unauthorized - No auth token');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file');
    const category = formData.get('category');
    const description = formData.get('description') || '';
    const customName = formData.get('customName') || file?.name;

    console.log('📁 File info:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      category,
      customName
    });

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Initialize Google APIs
    console.log('🔐 Initializing Google APIs with OAuth 2.0...');
    const drive = await getDrive();
    const sheets = await getSheets();
    console.log('✅ Google APIs initialized');

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`📦 Buffer created: ${buffer.length} bytes`);

    // Convert buffer to Readable stream
    const fileStream = Readable.from(buffer);

    // Upload to Drive
    console.log('📤 Uploading to Google Drive...');
    
    const driveRes = await drive.files.create({
      requestBody: {
        name: customName,
        parents: [process.env.DRIVE_FOLDER_ID],
        mimeType: file.type || 'application/octet-stream',
      },
      media: { 
        mimeType: file.type || 'application/octet-stream', 
        body: fileStream
      },
    });

    console.log('✅ Uploaded to Drive:', driveRes.data.id);

    // Set permission
    await drive.permissions.create({
      fileId: driveRes.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    console.log('✅ Permissions set');

    // ========================================
    // FORMAT TANGGAL INDONESIA - DI LUAR ARRAY
    // ========================================
    const uploadDate = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    console.log('📅 Upload date:', uploadDate);

    // Add to Sheet
    const docId = 'DOC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: `${process.env.SHEET_NAME}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          docId, 
          customName, 
          category || 'Lainnya',
          uploadDate,  // ← Gunakan variabel yang sudah dideklarasikan
          `https://drive.google.com/file/d/${driveRes.data.id}/view`,
          description,
          buffer.length.toString()
        ]]
      }
    });

    console.log('✅ Added to Sheet:', docId);

    return NextResponse.json({ 
      success: true, 
      message: 'Dokumen berhasil disimpan!',
      fileId: driveRes.data.id,
      docId: docId
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 5)
    });
    
    let errorMessage = error.message || 'Upload failed';
    
    if (error.message?.includes('invalid_grant')) {
      errorMessage = 'Google authentication failed. Check refresh token.';
    } else if (error.message?.includes('403')) {
      errorMessage = 'Access denied. Check if folder is shared with your account.';
    } else if (error.message?.includes('404')) {
      errorMessage = 'Drive folder or Sheet not found.';
    }
    
    return NextResponse.json({ 
      success: false, 
      message: errorMessage 
    }, { status: 500 });
  }
}
