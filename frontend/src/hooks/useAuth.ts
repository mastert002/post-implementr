import { createContext, createElement, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../api/client';

export interface User {
  id: number;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  register: (email: string, password: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const register = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await auth.register(email, password);
      const { token, id, email: userEmail } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ id, email: userEmail }));
      setUser({ id, email: userEmail });

      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Registration failed';
      setError(message);
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await auth.login(email, password);
      const { token, id, email: userEmail } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ id, email: userEmail }));
      setUser({ id, email: userEmail });

      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Login failed';
      setError(message);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return createElement(AuthContext.Provider, {
    value: {
      user,
      loading,
      error,
      register,
      login,
      logout,
      isAuthenticated: !!user,
    },
  }, children);
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
