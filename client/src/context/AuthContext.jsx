import React, { createContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

export const AuthContext = createContext();

// Simple Global API Cache to prevent redundant fetching and loading spinners
const apiCache = new Map();

// Optionally intercept to clear or read cache
axios.interceptors.request.use((config) => {
  if (config.method === 'get') {
    const key = config.url;
    
    // Skip caching for real-time endpoints (chat, notifications)
    if (key && (key.includes('/messages') || key.includes('/notifications') || key.includes('/chat'))) {
      return config;
    }

    if (apiCache.has(key)) {
      const { data, timestamp } = apiCache.get(key);
      if (Date.now() - timestamp < 15000) { // 15 seconds TTL
        // Override adapter to return cached data immediately
        config.adapter = () => Promise.resolve({
          data, status: 200, statusText: 'OK', headers: {}, config, request: {}
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
});

axios.interceptors.response.use((response) => {
  if (response.config.method === 'get') {
    apiCache.set(response.config.url, { data: response.data, timestamp: Date.now() });
  }
  return response;
});

// Synchronously read from localStorage so first render has user data immediately
const getInitialUser = () => {
  try {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

const getInitialToken = () => localStorage.getItem('token') || null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getInitialUser);
  const [loading, setLoading] = useState(false); // No blocking — user is set synchronously
  
  // Socket State
  const [socket, setSocket] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  // Setup Axios defaults
  axios.defaults.baseURL = `${API_URL}/api`;

  // Set token in axios header immediately on mount
  const initialToken = getInitialToken();
  if (initialToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
  }

  useEffect(() => {
    // Silently refresh user data in the background — does NOT block rendering
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) return;

    const parsedUser = JSON.parse(storedUser);
    const refreshUser = async () => {
      try {
        const res = await axios.get(`/users/${parsedUser._id || parsedUser.id}`);
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } catch (error) {
        console.error('Failed to fetch fresh user data:', error);
      }
    };
    // Small delay so initial paint happens first
    const timer = setTimeout(refreshUser, 300);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Socket when user logs in
  useEffect(() => {
    if (user) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const newSocket = io(API_URL);
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
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      return true;
    } catch (error) {
      console.error(error.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    apiCache.clear();
  };

  const loginWithToken = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
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
    <AuthContext.Provider value={{ 
      user, setUser, loading, login, register, logout, loginWithToken, updateUserStatus,
      socket
    }}>
      {children}
    </AuthContext.Provider>
  );
};
