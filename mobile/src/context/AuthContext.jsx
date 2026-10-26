import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { startKeepAlive, stopKeepAlive } from '../utils/api';

export const AuthContext = createContext();

// NOTE: Use your local IP address instead of localhost for testing on a physical device.
// e.g., 'http://192.168.1.100:5000/api'
export const API_URL = 'https://api.workspace.madhuratech.com/api';

// Set global base URL
axios.defaults.baseURL = API_URL;

/**
 * Robust date helper returning Asia/Kolkata (IST) date string YYYY-MM-DD
 * Used to ensure perfect sync with server attendance records across timezones
 */
export const getISTDateString = (date = new Date()) => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
  } catch (e) {
    const d = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return d.toISOString().split('T')[0];
  }
};

// ── Global Request Interceptor ─────────────────────────────────────────────
// Guarantees that EVERY axios request (GET, POST, PUT, DELETE) always carries the
// Authorization Bearer token, even after APK launch, app resume, or header reset.
axios.interceptors.request.use(
  async (config) => {
    try {
      if (!config.headers) {
        config.headers = {};
      }
      if (!config.headers.Authorization && !config.headers.authorization) {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Global Response Interceptor ──────────────────────────────────────────
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      async err => {
        const config = err.config;
        
        // Auto-retry once on 503 (Render cold-start)
        if (err.response?.status === 503 && config && !config._retry) {
          config._retry = true;
          await new Promise(r => setTimeout(r, 3000));
          return axios(config);
        }

        // Auto-handle 401 Unauthorized (Expired or revoked JWT token)
        // If an APK opens with an old/expired token, immediately clean state
        // so the user is prompted to sign in with a fresh token instead of seeing failing actions.
        if (
          err.response?.status === 401 && 
          config && 
          !config.url?.includes('/auth/login') && 
          !config.url?.includes('/auth/register')
        ) {
          console.warn('[AUTH] 401 Unauthorized detected. Clearing session.');
          await AsyncStorage.multiRemove(['token', 'user', '@mw_workspace_cache']);
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }

        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (token && storedUser) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        // Start keep-alive ping to prevent Render cold starts
        startKeepAlive(API_URL);

        // Verify session validity and sync latest user profile with backend
        try {
          const res = await axios.get('/auth/me', { timeout: 7000 });
          if (res.data && res.data._id) {
            setUser(res.data);
            await AsyncStorage.setItem('user', JSON.stringify(res.data));
          }
        } catch (meErr) {
          // If 401 Unauthorized, the stored token expired or was invalidated
          if (meErr.response?.status === 401) {
            console.log('[AUTH] Token in storage is expired. Logging out.');
            await AsyncStorage.multiRemove(['token', 'user', '@mw_workspace_cache']);
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
          }
          // If offline or network timeout, keep cached user intact
        }
      }
    } catch (error) {
      console.error('Error loading user data', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post('/auth/login', { email, password });
      const { token, ...userData } = res.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);

      // Start keep-alive on login
      startKeepAlive(API_URL);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error.response?.data?.message || error.message);
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (name, email, password, role = 'admin') => {
    try {
      const res = await axios.post('/auth/register', { name, email, password, role });
      const { token, ...userData } = res.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);

      startKeepAlive(API_URL);

      return { success: true };
    } catch (error) {
      console.error('Register error:', error.response?.data?.message || error.message);
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    stopKeepAlive();
    await AsyncStorage.multiRemove(['token', 'user', '@mw_workspace_cache']);
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUserStatus = async (status) => {
    try {
      const res = await axios.put('/users/status', { status });
      const updatedUser = res.data;
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      return true;
    } catch (error) {
      console.error('Error updating status', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUserStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

