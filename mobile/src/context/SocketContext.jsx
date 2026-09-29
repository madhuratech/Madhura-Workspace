import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Toast from 'react-native-toast-message';
import { AuthContext, API_URL } from './AuthContext';

export const SocketContext = createContext({
  socket: null,
  onlineUserIds: new Set(),
  isUserOnline: () => false,
});

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const socketRef = useRef(null);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  useEffect(() => {
    if (user && user._id) {
      // Connect to the Socket.IO server
      const socket = io(API_URL.replace('/api', ''), {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('user_connected', user._id);
      });

      // Track online users list
      socket.on('initial_status', (userIds) => {
        if (Array.isArray(userIds)) {
          setOnlineUserIds(new Set(userIds.map(id => String(id))));
        }
      });

      socket.on('user_status', ({ userId, status }) => {
        if (!userId) return;
        setOnlineUserIds((prev) => {
          const updated = new Set(prev);
          const idStr = String(userId);
          if (status === 'online') {
            updated.add(idStr);
          } else {
            updated.delete(idStr);
          }
          return updated;
        });
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

      // Global toast for incoming messages when not active
      socket.on('new_message', (msg) => {
        if (!msg) return;
        const senderId = msg.sender?._id || msg.sender;
        if (String(senderId) === String(user._id)) return;
        
        Toast.show({
          type: 'info',
          text1: msg.sender?.name ? `Message from ${msg.sender.name}` : 'New Message',
          text2: msg.text || (msg.attachment ? 'Sent an attachment' : 'New message received'),
          position: 'top',
        });
      });

      socket.on('taskCreated', (task) => {
        Toast.show({
          type: 'info',
          text1: 'New Task Assigned',
          text2: task.title,
          position: 'top',
        });
      });

      socket.on('meetingCreated', (meeting) => {
        Toast.show({
          type: 'info',
          text1: 'New Meeting Scheduled',
          text2: meeting.title,
          position: 'top',
        });
      });

      socket.on('ticketCreated', (ticket) => {
        Toast.show({
          type: 'info',
          text1: 'New Ticket Created',
          text2: ticket.title,
          position: 'top',
        });
      });

      socket.on('projectCreated', (project) => {
        Toast.show({
          type: 'info',
          text1: 'New Project Created',
          text2: project.title,
          position: 'top',
        });
      });

      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setOnlineUserIds(new Set());
    }
  }, [user?._id]);

  const isUserOnline = (userId) => {
    if (!userId) return false;
    return onlineUserIds.has(String(userId));
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUserIds, isUserOnline }}>
      {children}
    </SocketContext.Provider>
  );
};

