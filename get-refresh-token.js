const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const CLIENT_ID = '951858632851-5u0auf7ahldmrqudgvhs1a676k1f6ua9.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3001';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/spreadsheets'
];

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║        DriveVault - OAuth 2.0 Token Generator         ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('📋 STEP 1: Copy URL di bawah ini dan buka di browser:\n');
console.log(authUrl);
console.log('\n');
console.log('📋 STEP 2: Login dengan akun Google Anda dan grant permission');
console.log('📋 STEP 3: Setelah redirect, browser akan menampilkan pesan sukses');
console.log('📋 STEP 4: Refresh Token akan muncul di terminal ini\n');
console.log('─'.repeat(60));

const server = http.createServer(async (req, res) => {
  if (req.url.indexOf('/oauth2callback') > -1) {
    const qs = new url.URL(req.url, 'http://localhost:3001').searchParams;
    const code = qs.get('code');
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
            h1 { margin: 0 0 20px 0; font-size: 36px; }
            p { margin: 0; font-size: 18px; }
            .success { color: #4ade80; font-size: 72px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h1>Authentication Successful!</h1>
            <p>You can close this window and return to the terminal.</p>
          </div>
        </body>
      </html>
    `);
    
    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log('\n\n╔════════════════════════════════════════════════════════╗');
      console.log('║           ✅ REFRESH TOKEN OBTAINED!                    ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');
      console.log('🔑 Copy token di bawah ini:\n');
      console.log('─'.repeat(60));
      console.log(tokens.refresh_token);
      console.log('─'.repeat(60));
      console.log('\n💾 Simpan token ini dengan aman! Token ini akan digunakan');
      console.log('   untuk mengakses Google Drive Anda di DriveVault.\n');
      
      server.close();
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error getting tokens:', error.message);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
      server.close();
      process.exit(1);
    }
  }
});

server.listen(3001, () => {
  console.log('✅ Server listening on http://localhost:3001');
  console.log('⏳ Waiting for authentication...\n');
});