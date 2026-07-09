const { google } = require('googleapis');

// OAuth 2.0 Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

// Set refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// Auto-refresh access token
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    console.log('🔄 New refresh token obtained');
  }
  if (tokens.access_token) {
    console.log('🔑 New access token obtained');
  }
});

// Get Drive client
async function getDrive() {
  try {
    await oauth2Client.getAccessToken();
    return google.drive({
      version: 'v3',
      auth: oauth2Client
    });
  } catch (error) {
    console.error('❌ Error getting Drive client:', error.message);
    throw error;
  }
}

// Get Sheets client
async function getSheets() {
  try {
    await oauth2Client.getAccessToken();
    return google.sheets({
      version: 'v4',
      auth: oauth2Client
    });
  } catch (error) {
    console.error('❌ Error getting Sheets client:', error.message);
    throw error;
  }
}

// Format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = { getDrive, getSheets, formatBytes, oauth2Client };
