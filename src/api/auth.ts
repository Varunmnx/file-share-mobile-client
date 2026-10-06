import apiClient from './client';
import { storage } from '../services/storage';
import type { AuthTokens, User } from '../types';

export const authApi = {
  async register(email: string, password: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/auth/register', {
      email,
      password,
    });
    await storage.saveAuth(data.access_token, data.refresh_token);
    return data;
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/auth/login', {
      email,
      password,
    });
    await storage.saveAuth(data.access_token, data.refresh_token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network failures on logout
    } finally {
      await storage.clearAuth();
    }
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>('/me');
    await storage.setUser(data);
    return data;
  },

  async getGoogleOAuthUrl(): Promise<string> {
    const baseUrl = await storage.getBaseUrl();
    return `${baseUrl}/auth/google`;
  },
};
