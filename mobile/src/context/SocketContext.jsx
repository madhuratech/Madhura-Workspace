import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Toast from 'react-native-toast-message';
import { AuthContext, API_URL } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      // Connect to the Socket.IO server
      const socket = io(API_URL.replace('/api', ''));
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('setup', user._id);
      });

      socket.on('new_notification', (notification) => {
        Toast.show({
          type: 'info',
          text1: notification.title || 'New Notification',
          text2: notification.message || 'You have a new notification.',
          position: 'top',
        });
      });

      socket.on('activity', (data) => {
        Toast.show({
          type: 'success',
          text1: 'New Activity',
          text2: typeof data === 'string' ? data : (data.message || 'Something happened.'),
          position: 'top',
        });
      });

      // Optionally, listen to incoming messages if user is not in the specific chat
      socket.on('new_message', (msg) => {
        // Prevent showing toast for your own messages
        if (msg.sender && (msg.sender._id === user._id || msg.sender === user._id)) return;
        
        Toast.show({
          type: 'info',
          text1: 'New Message',
          text2: msg.text || 'Sent an attachment',
          position: 'top',
        });
      });

      return () => {
        socket.disconnect();
      };
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};
