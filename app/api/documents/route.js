import { NextResponse } from 'next/server';
import { getDrive, getSheets, formatBytes } from '@/lib/google';

export async function GET() {
  try {
    console.log('📄 Fetching documents...');
    
    const sheets = await getSheets();
    const drive = await getDrive();

    // Get data from Sheets
    console.log('📊 Reading from sheet:', process.env.SHEET_ID, process.env.SHEET_NAME);
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
    const validDocuments = [];

    for (const row of data) {
      try {
        // Validasi row data
        if (!row[0] || !row[1] || !row[4]) {
          console.warn('⚠️ Skipping incomplete row:', row);
          continue;
        }

        const docId = row[0];
        const fileName = row[1] || 'Unknown';
        const category = row[2] || 'Lainnya';
        const date = row[3] || '';
        const url = row[4];
        const description = row[5] || '-';
        const size = parseInt(row[6]) || 0;

        // Extract file ID dari URL
        const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (!fileIdMatch) {
          console.warn('⚠️ Invalid URL format for file:', fileName);
          continue;
        }

        const fileId = fileIdMatch[1];

        // Cek apakah file masih ada di Google Drive
        try {
          const driveFile = await drive.files.get({
            fileId: fileId,
            fields: 'id, name, mimeType, size, trashed'
          });

          // Skip jika file sudah di-trash
          if (driveFile.data.trashed) {
            console.log('🗑️ File already trashed in Drive:', fileName);
            continue;
          }

          // Update size dari Drive jika berbeda
          const actualSize = driveFile.data.size ? parseInt(driveFile.data.size) : size;
          
          categories[category] = (categories[category] || 0) + 1;
          totalSizeFromSheet += actualSize;

          // Format date
          let formattedDate = 'Unknown';
          if (date) {
            try {
              const dateObj = new Date(date);
              formattedDate = dateObj.toLocaleString('id-ID', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              });
            } catch (e) {
              formattedDate = date;
            }
          }

          validDocuments.push({
            id: docId,
            fileName: driveFile.data.name || fileName,
            category,
            date: formattedDate,
            url: url,
            description: description,
            size: actualSize,
            sizeFormatted: formatBytes(actualSize)
          });

        } catch (driveError) {
          console.warn('⚠️ File not found in Drive or access denied:', fileName, driveError.message);
          // Skip file yang tidak ada di Drive
          continue;
        }

      } catch (rowError) {
        console.error('❌ Error processing row:', rowError);
        continue;
      }
    }

    // Get folder size from Drive
    console.log('📁 Getting folder size from Drive...');
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
          return acc + size;
        }, 0);
      }
      
      console.log('✅ Total folder size from Drive:', folderSize, formatBytes(folderSize));
    } catch (error) {
      console.error('⚠️ Error getting folder size from Drive (using sheet fallback):', error.message);
      folderSize = totalSizeFromSheet;
    }

    const result = {
      success: true,
      data: validDocuments.reverse(), // Reverse untuk tampilkan yang terbaru
      stats: {
        totalFiles: validDocuments.length,
        totalSize: folderSize,
        totalSizeFormatted: formatBytes(folderSize),
        categories
      }
    };

    console.log('✅ Documents fetched successfully:', validDocuments.length, 'valid files');
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
          // Delete from Drive (move to trash)
          try {
            const fileIdMatch = rows[i][4]?.match(/\/d\/([^/]+)/);
            if (fileIdMatch && fileIdMatch[1]) {
              await drive.files.update({
                fileId: fileIdMatch[1],
                requestBody: { trashed: true }
              });
              console.log('️ Moved to trash:', rows[i][1]);
            }
          } catch (e) {
            console.error('Error deleting file from Drive:', e.message);
          }

          // Delete from Sheet (clear row)
          await sheets.spreadsheets.values.clear({
            spreadsheetId: process.env.SHEET_ID,
            range: `${process.env.SHEET_NAME}!A${i + 1}:G${i + 1}`
          });
          console.log('📄 Deleted from sheet:', rows[i][1]);

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
