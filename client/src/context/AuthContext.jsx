import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Notification and Socket State
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  // Setup Axios defaults
  axios.defaults.baseURL = `${API_URL}/api`;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  // Initialize Socket and fetch notifications when user logs in
  useEffect(() => {
    if (user) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const newSocket = io(API_URL);
      setSocket(newSocket);
      
      newSocket.on('connect', () => {
        newSocket.emit('user_connected', user._id || user.id);
      });

      newSocket.on('new_notification', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        // We'll show a toast in Layout.jsx when this array changes, but we can also manage it there
      });

      fetchNotifications();

      return () => newSocket.close();
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error(error);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await axios.delete('/notifications/delete-all');
      setNotifications([]);
    } catch (error) {
      console.error(error);
    }
  };

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
      user, loading, login, register, logout, loginWithToken, updateUserStatus,
      socket, notifications, unreadCount, markAsRead, markAllAsRead, deleteAllNotifications 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
