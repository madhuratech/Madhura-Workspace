import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Animated, RefreshControl, Modal,
  TouchableWithoutFeedback, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Bell, BellOff, CheckSquare, FolderKanban, ShieldAlert,
  Info, Trash2, Moon, Clock, Check, X, ShieldCheck, CheckCheck
} from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { setMuteNotifications, registerForPushNotificationsAsync } from '../utils/notifications';
import Toast from 'react-native-toast-message';

const PRIMARY = '#1b2b4c';
const ACCENT = '#ffca22';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const MUTE_OPTIONS = [
  { id: '8h', label: '8 Hours', sub: 'Mute alerts for 8 hours' },
  { id: '24h', label: '24 Hours', sub: 'Mute alerts for 1 day' },
  { id: '1w', label: '1 Week', sub: 'Mute alerts for 7 days' },
  { id: 'always', label: 'Always', sub: 'Until you turn it back on' },
];

const NotificationRow = ({ notification, delay, onPress, onMarkRead }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;
  const isUnread = !notification.read && !notification.isRead;

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
        style={[styles.row, { backgroundColor: isUnread ? '#F8FAFC' : '#FFFFFF', borderColor: isUnread ? '#E2E8F0' : '#F1F5F9' }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          <Icon color={color} size={20} strokeWidth={2} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, isUnread && { fontWeight: '800', color: '#0F172A' }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={styles.timeText}>
            {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {isUnread && (
          <TouchableOpacity 
            style={styles.markReadBtn}
            onPress={onMarkRead || onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.unreadDot} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function NotificationsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mute Modal State
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('8h');
  const [mutedUntil, setMutedUntil] = useState(null);
  const [isMuting, setIsMuting] = useState(false);

  useEffect(() => {
    fetchNotifications();
    checkMuteStatus();
  }, []);

  const checkMuteStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem('muted_until');
      if (stored) {
        const d = new Date(stored);
        if (d > new Date()) {
          setMutedUntil(d);
        } else {
          await AsyncStorage.removeItem('muted_until');
          setMutedUntil(null);
        }
      } else {
        setMutedUntil(null);
      }
    } catch (e) {
      console.log('Error checking mute status:', e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications');
      setNotifications(Array.isArray(res.data) ? res.data : []);
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
    checkMuteStatus();
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
      await axios.put('/notifications/read-all');
      Toast.show({
        type: 'success',
        text1: 'Marked as Read',
        text2: 'All notifications marked as read.',
      });
    } catch (e) {
      console.error('Error marking all notifications as read:', e);
      fetchNotifications();
    }
  };

  const handleClearAll = async () => {
    try {
      await axios.delete('/notifications/delete-all');
      setNotifications([]);
      Toast.show({
        type: 'success',
        text1: 'Cleared',
        text2: 'All notifications cleared.',
      });
    } catch (e) {
      console.error('Error clearing notifications:', e);
    }
  };

  const handleNotificationPress = async (notif) => {
    const isUnread = !notif.read && !notif.isRead;
    if (isUnread) {
      // Optimistically mark read locally
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true, isRead: true } : n));
      try {
        await axios.put(`/notifications/${notif._id}/read`);
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    if (notif.type === 'chat' || notif.link === '/chat') {
      navigation.navigate('MainTabs', { screen: 'Chat' });
    } else if (notif.type === 'task_assigned' || notif.type === 'task_updated' || notif.link === '/tasks') {
      navigation.navigate('Tasks');
    } else if (notif.type === 'project_added' || notif.link === '/projects') {
      navigation.navigate('Projects');
    } else if (notif.link === '/meetings') {
      navigation.navigate('Menu', { screen: 'Meetings' });
    }
  };

  const handleSingleMarkRead = async (notif) => {
    setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true, isRead: true } : n));
    try {
      await axios.put(`/notifications/${notif._id}/read`);
    } catch (err) {
      console.error('Error marking single notification read:', err);
    }
  };

  const handleApplyMute = async () => {
    setIsMuting(true);
    try {
      const result = await setMuteNotifications(selectedDuration);
      if (result.success) {
        setMutedUntil(result.mutedUntil);
        setShowMuteModal(false);
        Toast.show({
          type: 'success',
          text1: 'Notifications Muted',
          text2: `Muted for ${MUTE_OPTIONS.find(o => o.id === selectedDuration)?.label || selectedDuration}`,
        });
      }
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: 'Could not update notification settings',
      });
    } finally {
      setIsMuting(false);
    }
  };

  const handleUnmute = async () => {
    setIsMuting(true);
    try {
      await setMuteNotifications('unmute');
      setMutedUntil(null);
      setShowMuteModal(false);
      Toast.show({
        type: 'success',
        text1: 'Notifications Resumed',
        text2: 'You will receive real-time push alerts.',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsMuting(false);
    }
  };

  const formatMutedUntil = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffHours = Math.round((date - now) / (1000 * 60 * 60));
    if (diffHours > 24 * 300) return 'Muted until turned back on';
    if (diffHours > 24) return `Muted until ${date.toLocaleDateString()}`;
    return `Muted until ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const unreadCount = notifications.filter(n => !n.read && !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1b2b4c" size={22} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadCountPill}>
              <Text style={styles.unreadCountText}>{unreadCount}</Text>
            </View>
          )}
          {mutedUntil && (
            <View style={styles.muteHeaderBadge}>
              <BellOff color="#EF4444" size={12} />
              <Text style={styles.muteHeaderBadgeText}>Muted</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          {/* Mark All As Read Button */}
          {unreadCount > 0 && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnRead]} 
              onPress={handleMarkAllAsRead}
              activeOpacity={0.7}
            >
              <CheckCheck color="#16A34A" size={19} />
            </TouchableOpacity>
          )}

          {/* Mute Button (Instagram/WhatsApp style) */}
          <TouchableOpacity 
            style={[styles.actionBtn, mutedUntil ? styles.actionBtnActiveMute : null]} 
            onPress={() => setShowMuteModal(true)}
            activeOpacity={0.7}
          >
            {mutedUntil ? (
              <BellOff color="#EF4444" size={19} />
            ) : (
              <Bell color="#1b2b4c" size={19} />
            )}
          </TouchableOpacity>

          {/* Clear All Button */}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn} activeOpacity={0.7}>
              <Trash2 color="#EF4444" size={19} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mute Active Banner */}
      {mutedUntil && (
        <View style={styles.mutedBanner}>
          <View style={styles.mutedBannerIcon}>
            <BellOff color="#DC2626" size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mutedBannerTitle}>Alerts are currently paused</Text>
            <Text style={styles.mutedBannerSub}>{formatMutedUntil(mutedUntil)}</Text>
          </View>
          <TouchableOpacity style={styles.unmutePill} onPress={handleUnmute}>
            <Text style={styles.unmutePillText}>Unmute</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Bell color="#94A3B8" size={44} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyDesc}>You have no unread notifications right now.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <NotificationRow 
              notification={item} 
              delay={index * 40} 
              onPress={() => handleNotificationPress(item)}
              onMarkRead={() => handleSingleMarkRead(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PRIMARY]} />
          }
        />
      )}

      {/* ── MUTE NOTIFICATIONS BOTTOM SHEET MODAL (WhatsApp / Instagram Style) ── */}
      <Modal
        visible={showMuteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMuteModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMuteModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheet}>
                {/* Drag Handle */}
                <View style={styles.sheetHandle} />

                {/* Sheet Title */}
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHeaderIcon}>
                    <BellOff color="#1b2b4c" size={22} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>Mute Notifications</Text>
                    <Text style={styles.sheetSub}>
                      Other members will not see that you muted notifications.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowMuteModal(false)} style={styles.closeBtn}>
                    <X color="#64748B" size={20} />
                  </TouchableOpacity>
                </View>

                {/* Duration Options */}
                <View style={styles.optionsList}>
                  {MUTE_OPTIONS.map((opt) => {
                    const isSelected = selectedDuration === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                        onPress={() => setSelectedDuration(opt.id)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                            {opt.label}
                          </Text>
                          <Text style={styles.optionSubText}>{opt.sub}</Text>
                        </View>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Actions */}
                <View style={styles.sheetActions}>
                  {mutedUntil && (
                    <TouchableOpacity
                      style={styles.unmuteBtn}
                      onPress={handleUnmute}
                      disabled={isMuting}
                    >
                      <Text style={styles.unmuteBtnText}>Unmute Now</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.confirmMuteBtn, isMuting && { opacity: 0.7 }]}
                    onPress={handleApplyMute}
                    disabled={isMuting}
                  >
                    {isMuting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmMuteBtnText}>Mute Alerts</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFB' },
  
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1b2b4c', letterSpacing: -0.3 },
  muteHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  muteHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  unreadCountPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  unreadCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnRead: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  actionBtnActiveMute: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  markReadBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center',
  },

  // Muted Banner
  mutedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 10,
  },
  mutedBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutedBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  mutedBannerSub: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 1,
  },
  unmutePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  unmutePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // List
  listContent: { padding: 16, paddingBottom: 40 },
  
  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#1b2b4c', marginBottom: 3 },
  message: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 6 },
  timeText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  unreadDot: {
    width: 9, height: 9, borderRadius: 5, backgroundColor: '#ffca22',
    position: 'absolute', top: 16, right: 16,
  },

  // Empty
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: '#1b2b4c', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sheetHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1b2b4c',
    letterSpacing: -0.3,
  },
  sheetSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    gap: 10,
    marginBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  optionItemSelected: {
    backgroundColor: '#F0F4FF',
    borderColor: '#1b2b4c',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  optionLabelSelected: {
    color: '#1b2b4c',
  },
  optionSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#1b2b4c',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1b2b4c',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  unmuteBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unmuteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  confirmMuteBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#1b2b4c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1b2b4c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmMuteBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
