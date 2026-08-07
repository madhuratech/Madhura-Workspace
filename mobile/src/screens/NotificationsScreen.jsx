import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Animated, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Bell, CheckSquare, FolderKanban, ShieldAlert,
  Info, Trash2
} from 'lucide-react-native';
import { cachedGet } from '../utils/api';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const PRIMARY = '#5B5BD6';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'task_assigned':
    case 'task_updated':
      return { Icon: CheckSquare, color: '#059669', bg: '#F0FDF4' };
    case 'project_added':
      return { Icon: FolderKanban, color: '#2563EB', bg: '#EFF6FF' };
    case 'role_changed':
      return { Icon: ShieldAlert, color: '#D97706', bg: '#FFF7ED' };
    case 'chat':
      return { Icon: Info, color: '#1b2b4c', bg: '#EFF6FF' };
    default:
      return { Icon: Info, color: '#6B7280', bg: '#F3F4F6' };
  }
};

const NotificationRow = ({ notification, delay, onPress }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const { Icon, color, bg } = getNotificationIcon(notification.type);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slide }] }}>
      <TouchableOpacity 
        style={[styles.row, { backgroundColor: notification.read ? '#fff' : '#F9FAFB' }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          <Icon color={color} size={20} strokeWidth={2} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
          <Text style={styles.timeText}>
            {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      // Use axios to bypass cache for fresh notifications
      const res = await axios.get('/notifications');
      setNotifications(res.data);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleClearAll = async () => {
    try {
      await axios.delete('/notifications/delete-all');
      setNotifications([]);
    } catch (e) {
      console.error('Error clearing notifications:', e);
    }
  };

  const handleNotificationPress = async (notif) => {
    if (!notif.read) {
      // Optimistically mark read
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
      try {
        await axios.put(`/notifications/${notif._id}/read`);
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }
    if (notif.type === 'chat' || notif.link === '/chat') {
      navigation.navigate('MainTabs', { screen: 'Chat' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1b2b4c" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Trash2 color="#EF4444" size={20} />
          </TouchableOpacity>
        ) : (
          <View style={styles.clearBtnPlaceholder} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Bell color="#9CA3AF" size={48} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyDesc}>You have no new notifications right now.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <NotificationRow 
              notification={item} 
              delay={index * 50} 
              onPress={() => handleNotificationPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PRIMARY]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1b2b4c' },
  clearBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center',
  },
  clearBtnPlaceholder: { width: 40 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // List
  listContent: { padding: 16, paddingBottom: 40 },
  
  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  message: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 6 },
  timeText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY,
    position: 'absolute', top: 16, right: 16,
  },

  // Empty
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptyDesc: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
