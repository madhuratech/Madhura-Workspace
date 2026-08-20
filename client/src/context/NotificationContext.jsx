import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, socket } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // To handle duplicate prevention across tabs
  const channelRef = useRef(null);
  
  // Track visibility state
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    // Setup BroadcastChannel for tab coordination
    channelRef.current = new BroadcastChannel('workspace_notifications');
    
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (notification) => {
      // 1. Add to local state
      setNotifications((prev) => {
        if (prev.find(n => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });

      // 2. Check settings (default true if not set)
      const settings = user.notificationSettings || {};
      const shouldPlaySound = settings.notificationSounds !== false && settings.muteAll !== true;
      const shouldShowDesktop = settings.desktopNotifications !== false && settings.muteAll !== true;
      
      // Basic type filtering based on user settings
      if (notification.type === 'message' && settings.messages === false) return;
      if (notification.type === 'mention' && settings.mentions === false) return;

      // 3. Coordinate across tabs to avoid duplicate alerts
      const storageKey = `notif_processed_${notification._id}`;
      if (localStorage.getItem(storageKey)) return; // Already processed by another tab
      
      // We are the leader for this notification
      localStorage.setItem(storageKey, Date.now().toString());
      
      // Broadcast to other tabs to tell them it's handled (redundant to localStorage but good practice)
      channelRef.current.postMessage({ type: 'HANDLED', id: notification._id });

      // Clean up old local storage keys
      setTimeout(() => localStorage.removeItem(storageKey), 10000);

      // 4. Trigger UI / Sound / System Notification
      if (shouldPlaySound) {
        try {
          const audio = new Audio('/notification-sound.mp3');
          audio.volume = 0.5;
          audio.play().catch(e => console.warn('Audio play blocked:', e));
        } catch (e) {
          // ignore
        }
      }

      if (document.hasFocus() && document.visibilityState === 'visible') {
        // In-app toast will be rendered via a global toast component listening to this context or state
        // We can dispatch a custom event for the Framer Motion toast manager to pick up
        window.dispatchEvent(new CustomEvent('in_app_notification', { detail: notification }));
      } else if (shouldShowDesktop) {
        // App is hidden/backgrounded -> Trigger Service Worker
        triggerServiceWorkerNotification(notification);
      }
    };

    socket.on('new_notification', handleNewNotification);

    const handleNewMessage = (msg) => {
      // Don't notify if we sent it
      if (msg.sender && (msg.sender._id === user._id || msg.sender === user._id)) return;
      
      const settings = user.notificationSettings || {};
      if (settings.messages === false || settings.muteAll === true) return;
      
      const shouldPlaySound = settings.notificationSounds !== false && settings.muteAll !== true;
      const shouldShowDesktop = settings.desktopNotifications !== false && settings.muteAll !== true;
      
      const storageKey = `notif_processed_msg_${msg._id}`;
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, Date.now().toString());
      setTimeout(() => localStorage.removeItem(storageKey), 10000);
      
      if (channelRef.current) {
         channelRef.current.postMessage({ type: 'HANDLED', id: `msg_${msg._id}` });
      }
      
      if (shouldPlaySound) {
        try {
          const audio = new Audio('/notification-sound.mp3');
          audio.volume = 0.5;
          audio.play().catch(e => console.warn('Audio play blocked:', e));
        } catch (e) {}
      }

      const isDM = !!msg.dm;
      
      // If it's a channel message, we already get 'new_notification' from the backend.
      // So we only want to trigger the ephemeral toast for DMs to avoid double notifications.
      if (!isDM) return;

      const title = `New message from ${msg.sender?.name || 'User'}`;
      const messageStr = msg.text || 'Sent an attachment';

      const ephemeralNotif = {
        _id: `msg_${msg._id}`,
        title: title,
        message: messageStr,
        type: 'message',
        link: '/chat',
        sender: msg.sender, 
        createdAt: new Date().toISOString()
      };

      if (document.hasFocus() && document.visibilityState === 'visible') {
        window.dispatchEvent(new CustomEvent('in_app_notification', { detail: ephemeralNotif }));
      } else if (shouldShowDesktop) {
        triggerServiceWorkerNotification(ephemeralNotif);
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, user]);

  const triggerServiceWorkerNotification = (notification) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: {
          title: notification.title,
          body: notification.message,
          icon: user.avatar || '/favicon.ico',
          data: { url: notification.link || '/', id: notification._id },
          tag: `notif-${notification._id}`
        }
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      // Fallback to basic HTML5 notification if SW isn't controlling the page
      const n = new Notification(notification.title, {
        body: notification.message,
        icon: user.avatar || '/favicon.ico',
      });
      n.onclick = () => {
        window.focus();
        if (notification.link) window.location.href = notification.link;
      };
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

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
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true, readAt: new Date() } : n));
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date() })));
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await axios.delete('/notifications/delete-all');
      setNotifications([]);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      requestNotificationPermission
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
