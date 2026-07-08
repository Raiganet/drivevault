// test-google-api.js
require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function testConnection() {
  console.log('🔍 Testing Google API Connection...\n');
  
  console.log('Environment Variables:');
  console.log('- GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL);
  console.log('- DRIVE_FOLDER_ID:', process.env.DRIVE_FOLDER_ID);
  console.log('- SHEET_ID:', process.env.SHEET_ID);
  console.log('- PRIVATE_KEY starts with:', process.env.GOOGLE_PRIVATE_KEY?.substring(0, 30) + '...');
  console.log('');

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });

    console.log('✅ Auth client created');

    // Test Drive API
    const drive = google.drive({ version: 'v3', auth });
    console.log('📁 Testing Drive API...');
    const folder = await drive.files.get({
      fileId: process.env.DRIVE_FOLDER_ID,
      fields: 'id, name'
    });
    console.log('✅ Drive folder found:', folder.data.name, `(${folder.data.id})`);

    // Test Sheets API
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('📊 Testing Sheets API...');
    const sheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID
    });
    console.log('✅ Sheet found:', sheet.data.properties.title);

    console.log('\n🎉 ALL TESTS PASSED! Google API is working correctly.');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 Possible solutions:');
    console.error('1. Make sure Service Account email is shared to folder & sheet (Editor access)');
    console.error('2. Check if Google Drive API & Sheets API are enabled in Google Cloud Console');
    console.error('3. Verify private key format (should be one line with \\n)');
    console.error('4. Check if folder & sheet IDs are correct');
  }
}

testConnection();