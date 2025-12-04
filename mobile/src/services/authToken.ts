// Simple module to manage the auth token across the app
// This reads from the same SecureStore key that AuthContext uses

import * as SecureStore from 'expo-secure-store';

// IMPORTANT: This must match the key used in AuthContext.tsx
const AUTH_TOKEN_KEY = 'auth_token';
let currentToken: string | null = null;

export const authTokenManager = {
  setToken: (token: string | null) => {
    currentToken = token;
    if (token) {
      console.log('🔑 Auth token set in memory, length:', token.length);
    } else {
      console.log('🔓 Auth token cleared from memory');
    }
  },
  
  getToken: (): string | null => {
    return currentToken;
  },
  
  hasToken: (): boolean => {
    return currentToken !== null;
  },
  
  // Get token - tries memory first, then SecureStore
  async getTokenAsync(): Promise<string | null> {
    if (currentToken) {
      return currentToken;
    }
    
    // Try to restore from SecureStore
    return await authTokenManager.restoreToken();
  },
  
  // Restore token from SecureStore (same key AuthContext uses)
  async restoreToken(): Promise<string | null> {
    try {
      console.log('🔄 Attempting to restore token from SecureStore...');
      const storedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      
      if (storedToken) {
        currentToken = storedToken;
        console.log('🔑 Auth token restored from SecureStore, length:', storedToken.length);
        return currentToken;
      }
      
      console.log('⚠️ No token found in SecureStore');
      return null;
    } catch (error) {
      console.error('Error restoring auth token:', error);
      return null;
    }
  }
};

