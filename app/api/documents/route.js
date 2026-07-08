import { NextResponse } from 'next/server';
import { getDrive, getSheets, formatBytes } from '@/lib/google';

export async function GET() {
  try {
    console.log('📊 Fetching documents...');
    
    const sheets = await getSheets();
    const drive = await getDrive();

    // Get data from Sheets
    console.log('Reading from sheet:', process.env.SHEET_ID, process.env.SHEET_NAME);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: `${process.env.SHEET_NAME}!A:G`,
    });

    const rows = res.data.values || [];
    console.log(`Found ${rows.length} rows in sheet`);

    if (rows.length <= 1) {
      return NextResponse.json({ 
        success: true, 
        data: [], 
        stats: { totalFiles: 0, totalSize: 0, totalSizeFormatted: '0 MB', categories: {} } 
      });
    }

    const data = rows.slice(1); // Skip header
    const categories = {};
    let totalSizeFromSheet = 0;

    const documents = data.map(row => {
      const category = row[2] || 'Lainnya';
      const size = parseInt(row[6]) || 0;
      categories[category] = (categories[category] || 0) + 1;
      totalSizeFromSheet += size;

      // Format date
      let formattedDate = 'Unknown';
      if (row[3]) {
        try {
          const date = new Date(row[3]);
          formattedDate = date.toLocaleString('id-ID', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        } catch (e) {
          formattedDate = row[3];
        }
      }

      return {
        id: row[0] || '',
        fileName: row[1] || 'Unknown',
        category,
        date: formattedDate,
        url: row[4] || '#',
        description: row[5] || '-',
        size,
        sizeFormatted: formatBytes(size)
      };
    }).reverse();

    // Get folder size from Drive
    console.log('Getting folder size from Drive...');
    let folderSize = 0;
    try {
      const folderRes = await drive.files.list({
        q: `'${process.env.DRIVE_FOLDER_ID}' in parents and trashed=false`,
        fields: 'files(size, name)',
        pageSize: 1000,
      });
      
      if (folderRes.data.files) {
        folderSize = folderRes.data.files.reduce((acc, file) => {
          const size = parseInt(file.size) || 0;
          console.log(`File: ${file.name}, Size: ${size}`);
          return acc + size;
        }, 0);
      }
      
      console.log('Total folder size:', folderSize, formatBytes(folderSize));
    } catch (error) {
      console.error('Error getting folder size:', error.message);
      // Fallback: gunakan total dari sheet
      folderSize = totalSizeFromSheet;
    }

    const result = {
      success: true,
      data: documents,
      stats: {
        totalFiles: documents.length,
        totalSize: folderSize,
        totalSizeFormatted: formatBytes(folderSize),
        categories
      }
    };

    console.log('✅ Documents fetched successfully:', documents.length, 'files');
    console.log('📊 Stats:', result.stats);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error in GET /api/documents:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to load documents: ' + error.message,
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      }, 
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { ids } = await req.json();
    if (!ids || !ids.length) {
      return NextResponse.json({ success: false, message: 'No IDs provided' }, { status: 400 });
    }

    const drive = await getDrive();
    const sheets = await getSheets();

    // Get current sheet data
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: `${process.env.SHEET_NAME}!A:G`,
    });
    const rows = res.data.values || [];

    let deletedCount = 0;

    for (const id of ids) {
      // Find row with this ID
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === id) {
          // Delete from Drive
          try {
            const fileIdMatch = rows[i][4]?.match(/\/d\/([^/]+)/);
            if (fileIdMatch && fileIdMatch[1]) {
              await drive.files.update({
                fileId: fileIdMatch[1],
                requestBody: { trashed: true }
              });
            }
          } catch (e) {
            console.error('Error deleting file from Drive:', e.message);
          }

          // Delete from Sheet
          await sheets.spreadsheets.values.clear({
            spreadsheetId: process.env.SHEET_ID,
            range: `${process.env.SHEET_NAME}!A${i + 1}:G${i + 1}`
          });

          deletedCount++;
          break;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil menghapus ${deletedCount} dokumen` 
    });

  } catch (error) {
    console.error('Error in DELETE /api/documents:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
