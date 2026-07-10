// Load environment variables
require('dotenv').config();

const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET harus diset di file .env.local');
  console.log('\n📝 Cara setup:');
  console.log('1. Buat file .env.local di root folder');
  console.log('2. Tambahkan:');
  console.log('   GOOGLE_CLIENT_ID=your_client_id_here');
  console.log('   GOOGLE_CLIENT_SECRET=your_client_secret_here');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/spreadsheets'
  ],
  prompt: 'consent'
});

console.log('🔗 Buka URL ini di browser:');
console.log(authUrl);
console.log('\nSetelah authorize, paste code dari URL di sini:');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Authorization Code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Refresh Token berhasil digenerate!');
    console.log('\n📋 Tambahkan ke .env.local:');
    console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    readline.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    readline.close();
  }
});