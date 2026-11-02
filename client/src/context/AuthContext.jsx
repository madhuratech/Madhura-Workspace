import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

export const AuthContext = createContext();

// Session duration: 2 days (48 hours in milliseconds)
export const SESSION_LIFETIME_MS = 2 * 24 * 60 * 60 * 1000;

// Simple Global API Cache to prevent redundant fetching and loading spinners
const apiCache = new Map();

/**
 * Safely parse JWT payload without external dependencies
 */
export const parseJwt = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Check if current session has exceeded 2 days or token is expired
 */
export const isSessionExpired = () => {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) return false;

    // 1. Check login timestamp (auto-signout after 2 days of login)
    const loginTime = localStorage.getItem('login_time');
    if (loginTime) {
      const elapsed = Date.now() - parseInt(loginTime, 10);
      if (elapsed > SESSION_LIFETIME_MS) {
        return true;
      }
    }

    // 2. Check JWT expiration timestamp
    const decoded = parseJwt(token);
    if (decoded && decoded.exp) {
      if (decoded.exp * 1000 <= Date.now()) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Clears all user session and workspace storage
 */
export const clearSessionStorage = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('login_time');
    localStorage.removeItem('active_workspace');
    localStorage.removeItem('all_workspaces');
    delete axios.defaults.headers.common['Authorization'];
    apiCache.clear();
  } catch (e) {
    console.error('Error clearing session storage:', e);
  }
};

// Global Request Interceptor
axios.interceptors.request.use(
  (config) => {
    // If session has exceeded 2 days or expired, clear session and redirect
    if (isSessionExpired()) {
      clearSessionStorage();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
      return Promise.reject(new axios.Cancel('Session expired after 2 days.'));
    }

    // Ensure Bearer Authorization token is attached to headers
    const token = localStorage.getItem('token');
    if (token) {
      if (!config.headers) config.headers = {};
      if (!config.headers.Authorization && !config.headers.authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (config.method === 'get') {
      const key = config.url;

      // Skip caching for real-time endpoints (chat, notifications, channels, dms)
      if (
        key &&
        (key.includes('/messages') ||
          key.includes('/notifications') ||
          key.includes('/chat') ||
          key.includes('/channels') ||
          key.includes('/dms'))
      ) {
        return config;
      }

      if (apiCache.has(key)) {
        const { data, timestamp } = apiCache.get(key);
        if (Date.now() - timestamp < 15000) {
          // 15 seconds TTL
          config.adapter = () =>
            Promise.resolve({
              data,
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
              request: {},
            });
        } else {
          apiCache.delete(key);
        }
      }
    } else {
      // If POST, PUT, DELETE - clear cache to ensure next GET is fresh
      apiCache.clear();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global Response Interceptor
axios.interceptors.response.use(
  (response) => {
    if (response.config.method === 'get') {
      apiCache.set(response.config.url, { data: response.data, timestamp: Date.now() });
    }
    return response;
  },
  (error) => {
    const config = error.config;
    // Auto-handle 401 Unauthorized (Expired or invalid JWT token)
    // Automatically cleans state and redirects to login so the user isn't stuck with empty workspaces
    if (
      error.response?.status === 401 &&
      config &&
      !config.url?.includes('/auth/login') &&
      !config.url?.includes('/auth/register') &&
      !config.url?.includes('/auth/forgot-password')
    ) {
      console.warn('[AUTH] 401 Unauthorized detected. Automatically clearing session and signing out.');
      clearSessionStorage();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// Synchronously read from localStorage so first render has user data immediately
const getInitialUser = () => {
  try {
    if (isSessionExpired()) {
      clearSessionStorage();
      return null;
    }
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

const getInitialToken = () => {
  try {
    if (isSessionExpired()) {
      clearSessionStorage();
      return null;
    }
    return localStorage.getItem('token') || null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getInitialUser);
  const [loading, setLoading] = useState(false); // No blocking — user is set synchronously

  // Socket State
  const [socket, setSocket] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  // Setup Axios defaults
  axios.defaults.baseURL = `${API_URL}/api`;

  // Set token in axios header immediately on mount if valid
  const initialToken = getInitialToken();
  if (initialToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
  }

  // Periodic and Event-Driven check for 2-day session expiration
  useEffect(() => {
    if (!user) return;

    const checkSession = () => {
      if (isSessionExpired()) {
        console.warn('[AUTH] 2-day session limit reached. Auto signing out.');
        logout('Your session has expired after 2 days. Please log in again.');
      }
    };

    // Check immediately
    checkSession();

    // Check when user resumes or unlocks window/tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Periodic check every 60 seconds
    const interval = setInterval(checkSession, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [user]);

  // Silently refresh user data in the background
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) return;

    if (isSessionExpired()) {
      logout('Your session has expired after 2 days. Please log in again.');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    const refreshUser = async () => {
      try {
        const res = await axios.get(`/users/${parsedUser._id || parsedUser.id}`);
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } catch (error) {
        console.error('Failed to fetch fresh user data:', error);
        if (error.response?.status === 401) {
          logout('Your session has expired. Please log in again.');
        }
      }
    };
    // Small delay so initial paint happens first
    const timer = setTimeout(refreshUser, 300);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Socket when user logs in
  useEffect(() => {
    if (user) {
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const newSocket = io(socketUrl);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('user_connected', user._id || user.id);
      });

      return () => newSocket.close();
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [user]);

  const login = async (email, password) => {
    try {
      const res = await axios.post('/auth/login', { email, password });
      const { token, ...userData } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('login_time', Date.now().toString());

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      return true;
    } catch (error) {
      console.error(error.response?.data?.message || 'Login failed');
      return false;
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const res = await axios.post('/auth/register', { name, email, password, role });
      const { token, ...userData } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('login_time', Date.now().toString());

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      return true;
    } catch (error) {
      console.error(error.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  const logout = (reason = null) => {
    clearSessionStorage();
    setUser(null);
    if (socket) {
      socket.close();
      setSocket(null);
    }
    if (window.location.pathname !== '/login') {
      const redirectUrl = reason
        ? `/login?expired=true&reason=${encodeURIComponent(reason)}`
        : '/login';
      window.location.href = redirectUrl;
    }
  };

  const loginWithToken = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('login_time', Date.now().toString());
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const updateUserStatus = async (status) => {
    try {
      const res = await axios.put('/users/status', { status });
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      return true;
    } catch (error) {
      console.error('Error updating status', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        register,
        logout,
        loginWithToken,
        updateUserStatus,
        socket,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
