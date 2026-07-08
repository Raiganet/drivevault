import { NextResponse } from 'next/server';
import { sheets } from '@/lib/google';

export async function GET() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: `${process.env.SHEET_NAME}!A:G`,
    });
    const rows = res.data.values || [];
    
    let csv = "ID,Nama File,Tipe Berkas,Tanggal Upload,URL,Deskripsi,Ukuran (Bytes)\n";
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i].map(cell => `"${String(cell || '').replace(/"/g, '""')}"`);
      csv += row.join(",") + "\n";
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="Database_DriveVault_${Date.now()}.csv"`
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}