import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { User } from '../types';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'fd_access_token',
  REFRESH_TOKEN: 'fd_refresh_token',
  USER_INFO: 'fd_user_info',
  BASE_URL: 'fd_base_url',
  SAVED_SHARE_URLS: 'fd_saved_share_urls',
};

// Default backend endpoint
export const DEFAULT_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8787',
  ios: 'http://localhost:8787',
  default: 'http://localhost:8787',
});

export const storage = {
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async setAccessToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  async saveAuth(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  },

  async clearAuth(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_INFO);
  },

  async getUser(): Promise<User | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async setUser(user: User): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
  },

  async getBaseUrl(): Promise<string> {
    const custom = await AsyncStorage.getItem(STORAGE_KEYS.BASE_URL);
    return custom || DEFAULT_BASE_URL;
  },

  async setBaseUrl(url: string): Promise<void> {
    const sanitized = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem(STORAGE_KEYS.BASE_URL, sanitized);
  },

  async getSavedShareUrls(): Promise<Record<string, string>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_SHARE_URLS);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  async saveShareUrl(transferId: string, shareUrl: string): Promise<void> {
    const current = await this.getSavedShareUrls();
    current[transferId] = shareUrl;
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_SHARE_URLS, JSON.stringify(current));
  },
};
