import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth';
import { storage } from '../services/storage';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  baseUrl: string;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateBaseUrl: (newUrl: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [baseUrl, setBaseUrlState] = useState('');

  const refreshUser = useCallback(async () => {
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        setUser(null);
        return;
      }
      const me = await authApi.getMe();
      setUser(me);
    } catch (err) {
      // If fetching me fails and token expired, clear
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const url = await storage.getBaseUrl();
        setBaseUrlState(url);

        const token = await storage.getAccessToken();
        if (token) {
          const cachedUser = await storage.getUser();
          if (cachedUser) setUser(cachedUser);
          await refreshUser();
        }
      } catch (err) {
        // Ignore initialization errors
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    await authApi.login(email, password);
    await refreshUser();
  };

  const register = async (email: string, password: string) => {
    await authApi.register(email, password);
    await refreshUser();
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const updateBaseUrl = async (newUrl: string) => {
    await storage.setBaseUrl(newUrl);
    setBaseUrlState(newUrl);
    // Refresh user after base URL change
    await refreshUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        baseUrl,
        login,
        register,
        logout,
        refreshUser,
        updateBaseUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
