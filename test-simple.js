const fs = require('fs');
const { google } = require('googleapis');

// Baca .env.local secara manual
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    envVars[key.trim()] = value;
  }
});

console.log('🔍 Testing Google API Connection...\n');
console.log('Environment Variables:');
console.log('- GOOGLE_CLIENT_EMAIL:', envVars.GOOGLE_CLIENT_EMAIL);
console.log('- DRIVE_FOLDER_ID:', envVars.DRIVE_FOLDER_ID);
console.log('- SHEET_ID:', envVars.SHEET_ID);
console.log('- PRIVATE_KEY starts with:', envVars.GOOGLE_PRIVATE_KEY?.substring(0, 30) + '...');
console.log('');

async function testConnection() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: envVars.GOOGLE_CLIENT_EMAIL,
        private_key: envVars.GOOGLE_PRIVATE_KEY,
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
      fileId: envVars.DRIVE_FOLDER_ID,
      fields: 'id, name'
    });
    console.log('✅ Drive folder found:', folder.data.name, `(${folder.data.id})`);

    // Test Sheets API
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('📊 Testing Sheets API...');
    const sheet = await sheets.spreadsheets.get({
      spreadsheetId: envVars.SHEET_ID
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