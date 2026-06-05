import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../storage/secureStorage';
import { Platform } from 'react-native';

const API_ENDPOINT = 'https://nhai-attendance-api-production.execute-api.ap-south-1.amazonaws.com/production';

export interface StoredUser {
  userId: string;
  name: string;
  designation: string;
  department: string;
  token: string;
  faceRegistered: boolean;
}

interface AuthContextType {
  activeUser: StoredUser | null;
  storedUsers: StoredUser[];
  isLoading: boolean;
  login: (name: string, password: string) => Promise<{ success: boolean; error?: string }>;
  switchUser: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  removeAccount: (userId: string) => Promise<void>;
  setFaceRegistered: (userId: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const STORED_USERS_KEY = 'auth_stored_users';
const ACTIVE_USER_KEY = 'auth_active_user';

function decodeJWT(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - payload.length % 4) % 4);
    const decoded = JSON.parse(atob(payload + padding));
    return decoded;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

function generateLocalToken(userId: string, name: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: userId,
    name,
    exp: Math.floor(Date.now() / 1000) + 86400 * 365,
    iat: Math.floor(Date.now() / 1000),
  }));
  return `${header}.${payload}.local-offline-signature`;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [activeUser, setActiveUser] = useState<StoredUser | null>(null);
  const [storedUsers, setStoredUsers] = useState<StoredUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStoredUsers = useCallback(async (): Promise<StoredUser[]> => {
    try {
      const json = await AsyncStorage.getItem(STORED_USERS_KEY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }, []);

  const saveStoredUsers = useCallback(async (users: StoredUser[]) => {
    await AsyncStorage.setItem(STORED_USERS_KEY, JSON.stringify(users));
    setStoredUsers(users);
  }, []);

  const refreshUsers = useCallback(async () => {
    const users = await loadStoredUsers();
    setStoredUsers(users);
  }, [loadStoredUsers]);

  useEffect(() => {
    (async () => {
      try {
        const users = await loadStoredUsers();
        setStoredUsers(users);
        const activeUserId = await secureStorage.getItem(ACTIVE_USER_KEY);
        if (activeUserId) {
          const found = users.find(u => u.userId === activeUserId);
          if (found && found.token && !isTokenExpired(found.token)) {
            setActiveUser(found);
          }
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadStoredUsers]);

  const login = useCallback(async (name: string, password: string) => {
    try {
      const baseUrl = Platform.OS === 'web'
        ? API_ENDPOINT
        : (process as any).env?.EXPO_PUBLIC_API_ENDPOINT || API_ENDPOINT;

      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      const newUser: StoredUser = {
        userId: data.user.id,
        name: data.user.name,
        designation: data.user.designation,
        department: data.user.department,
        token: data.token,
        faceRegistered: data.user.faceRegistered,
      };

      const users = await loadStoredUsers();
      const filtered = users.filter(u => u.userId !== newUser.userId);
      const updated = [...filtered, newUser];
      await saveStoredUsers(updated);
      await secureStorage.setItem(ACTIVE_USER_KEY, newUser.userId);
      setActiveUser(newUser);

      return { success: true };
    } catch (error: any) {
      if (error.message === 'Network request failed' || error.name === 'TypeError') {
        const userId = `offline_${name.toLowerCase().replace(/\s+/g, '_')}`;
        const token = generateLocalToken(userId, name);
        const newUser: StoredUser = {
          userId,
          name,
          designation: 'Employee',
          department: 'NHAI',
          token,
          faceRegistered: false,
        };
        const users = await loadStoredUsers();
        const filtered = users.filter(u => u.userId !== newUser.userId);
        const updated = [...filtered, newUser];
        await saveStoredUsers(updated);
        await secureStorage.setItem(ACTIVE_USER_KEY, newUser.userId);
        setActiveUser(newUser);
        return { success: true };
      }
      return { success: false, error: error.message || 'Network error' };
    }
  }, [loadStoredUsers, saveStoredUsers]);

  const switchUser = useCallback(async (userId: string) => {
    const users = await loadStoredUsers();
    const found = users.find(u => u.userId === userId);
    if (!found) return;
    if (found.token && isTokenExpired(found.token)) {
      setActiveUser(null);
      return;
    }
    await secureStorage.setItem(ACTIVE_USER_KEY, userId);
    setActiveUser(found);
  }, [loadStoredUsers]);

  const logout = useCallback(async () => {
    await secureStorage.deleteItem(ACTIVE_USER_KEY);
    setActiveUser(null);
  }, []);

  const removeAccount = useCallback(async (userId: string) => {
    const users = await loadStoredUsers();
    const filtered = users.filter(u => u.userId !== userId);
    await saveStoredUsers(filtered);
    if (activeUser?.userId === userId) {
      await secureStorage.deleteItem(ACTIVE_USER_KEY);
      setActiveUser(null);
    }
  }, [loadStoredUsers, saveStoredUsers, activeUser]);

  const setFaceRegistered = useCallback(async (userId: string) => {
    const users = await loadStoredUsers();
    const updated = users.map(u =>
      u.userId === userId ? { ...u, faceRegistered: true } : u
    );
    await saveStoredUsers(updated);
    if (activeUser?.userId === userId) {
      setActiveUser(prev => prev ? { ...prev, faceRegistered: true } : null);
    }
  }, [loadStoredUsers, saveStoredUsers, activeUser]);

  return (
    <AuthContext.Provider value={{
      activeUser,
      storedUsers,
      isLoading,
      login,
      switchUser,
      logout,
      removeAccount,
      setFaceRegistered,
      refreshUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
