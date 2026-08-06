import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { startKeepAlive, stopKeepAlive } from '../utils/api';

export const AuthContext = createContext();

// NOTE: Use your local IP address instead of localhost for testing on a physical device.
// e.g., 'http://192.168.1.100:5000/api'
export const API_URL = 'https://madhura-workspace.onrender.com/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  axios.defaults.baseURL = API_URL;

  // Axios response interceptor: automatic retry on 503 (server cold-starting)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      async err => {
        const config = err.config;
        if (err.response?.status === 503 && !config._retry) {
          config._retry = true;
          await new Promise(r => setTimeout(r, 3000));
          return axios(config);
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
        setUser(JSON.parse(storedUser));
        // Start keep-alive ping to prevent Render cold starts
        startKeepAlive('https://madhura-workspace.onrender.com/api');
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
      startKeepAlive('https://madhura-workspace.onrender.com/api');

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

      startKeepAlive('https://madhura-workspace.onrender.com/api');

      return { success: true };
    } catch (error) {
      console.error('Register error:', error.response?.data?.message || error.message);
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    stopKeepAlive();
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('@mw_workspace_cache');
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
