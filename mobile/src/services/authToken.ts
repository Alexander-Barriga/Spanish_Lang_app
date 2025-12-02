// Simple module to manage the auth token across the app
// This avoids timing issues with Supabase session loading

let currentToken: string | null = null;

export const authTokenManager = {
  setToken: (token: string | null) => {
    currentToken = token;
    if (token) {
      console.log('🔑 Auth token set, length:', token.length);
    } else {
      console.log('🔓 Auth token cleared');
    }
  },
  
  getToken: (): string | null => {
    return currentToken;
  },
  
  hasToken: (): boolean => {
    return currentToken !== null;
  },
};

