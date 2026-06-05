import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'nhai_auth_token';
const AUTH_REFRESH_KEY = 'nhai_refresh_token';

export class SyncAuth {
  private token: string | null = null;
  private refreshToken: string | null = null;

  async initialize(): Promise<void> {
    this.token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    this.refreshToken = await SecureStore.getItemAsync(AUTH_REFRESH_KEY);
  }

  async setToken(token: string, refreshToken?: string): Promise<void> {
    this.token = token;
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    if (refreshToken) {
      this.refreshToken = refreshToken;
      await SecureStore.setItemAsync(AUTH_REFRESH_KEY, refreshToken);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getAuthHeader(): Record<string, string> {
    if (this.token) {
      return { Authorization: `Bearer ${this.token}` };
    }
    return {};
  }

  async clearTokens(): Promise<void> {
    this.token = null;
    this.refreshToken = null;
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AUTH_REFRESH_KEY);
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  decodeToken(): any {
    if (!this.token) return null;
    try {
      const parts = this.token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  isTokenExpired(): boolean {
    const decoded = this.decodeToken();
    if (!decoded || !decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
  }
}

export const syncAuth = new SyncAuth();
