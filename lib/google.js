import { google } from 'googleapis';

// Fungsi untuk parsing private key dengan benar
function getPrivateKey() {
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!key) {
    console.error('❌ GOOGLE_PRIVATE_KEY is not defined');
    throw new Error('GOOGLE_PRIVATE_KEY environment variable is not set');
  }

  // Hapus quotes jika ada
  let cleanKey = key.trim();
  if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
    cleanKey = cleanKey.slice(1, -1);
  }
  
  // Handle berbagai format newline
  // Jika key masih dalam format multi-line (masih ada newline asli), biarkan
  // Jika key dalam format \n literal, ganti dengan newline sebenarnya
  if (cleanKey.includes('\\n')) {
    cleanKey = cleanKey.replace(/\\n/g, '\n');
  }
  
  return cleanKey;
}

let authClient;

export async function getAuth() {
  if (authClient) return authClient;

  try {
    const privateKey = getPrivateKey();
    
    console.log('🔐 Creating Google Auth client...');
    console.log('Client Email:', process.env.GOOGLE_CLIENT_EMAIL);
    console.log('Private Key starts with:', privateKey.substring(0, 30));
    console.log('Drive Folder ID:', process.env.DRIVE_FOLDER_ID);
    console.log('Sheet ID:', process.env.SHEET_ID);

    authClient = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });

    console.log('✅ Auth client created successfully');
    return authClient;
  } catch (error) {
    console.error('❌ Error creating auth client:', error.message);
    throw error;
  }
}

export async function getDrive() {
  const auth = await getAuth();
  return google.drive({ version: 'v3', auth });
}

export async function getSheets() {
  const auth = await getAuth();
  return google.sheets({ version: 'v4', auth });
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}