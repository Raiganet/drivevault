// Fungsi untuk check dan refresh token otomatis
export async function checkAuth() {
  try {
    const cookieStore = await import('next/headers');
    const token = (await cookieStore.cookies()).find(c => c.name === 'auth_token')?.value;
    
    if (!token) {
      return { valid: false, user: null };
    }

    // Verify token
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    const data = await res.json();
    
    if (data.valid) {
      return { valid: true, user: data.user };
    } else {
      return { valid: false, user: null };
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    return { valid: false, user: null };
  }
}

// Fungsi untuk set cookie
export function setAuthCookie(user, token) {
  document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
  localStorage.setItem('currentUser', JSON.stringify(user));
}

// Fungsi untuk clear cookie
export function clearAuthCookie() {
  document.cookie = 'auth_token=; path=/; max-age=0';
  localStorage.removeItem('currentUser');
}
