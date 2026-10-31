import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Animated, Modal, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hash, Lock, MessageCircle, Search, Users, Plus, X, Check } from 'lucide-react-native';
import axios from 'axios';
import { io } from 'socket.io-client';
import { cachedGet } from '../utils/api';
import { AuthContext, API_URL } from '../context/AuthContext';

import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { StatusBar, Platform } from 'react-native';
import { SocketContext } from '../context/SocketContext';

const PRIMARY = '#1b2b4c';

const CHANNEL_COLORS = [PRIMARY, '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];

const getInitials = (name) =>
  name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

// ── Skeleton ──────────────────────────────────────────────────────────────
const Skel = ({ w, h, r = 6, style }) => {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(a, { toValue: 0, duration: 800, useNativeDriver: false }),
    ])).start();
  }, []);
  const bg = a.interpolate({ inputRange: [0, 1], outputRange: ['#F3F4F6', '#E5E7EB'] });
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: bg }, style]} />;
};

const SkeletonRow = () => (
  <View style={styles.skeletonRow}>
    <Skel w={44} h={44} r={14} style={{ marginRight: 14 }} />
    <View style={{ flex: 1 }}>
      <Skel w="55%" h={14} r={4} style={{ marginBottom: 7 }} />
      <Skel w="75%" h={11} r={3} />
    </View>
  </View>
);

// ── Channel Row ────────────────────────────────────────────────────────────
const ChannelRow = ({ channel, onPress, idx, delay }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const IconCmp = channel.isPrivate ? Lock : Hash;

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.rowIconBox}>
          <IconCmp color={channel.isPrivate ? '#F59E0B' : '#9CA3AF'} size={20} strokeWidth={2.5} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowTitle, { fontWeight: channel.isPrivate ? '600' : '500' }]}>
            {channel.name}
          </Text>
          {channel.description ? (
            <Text style={styles.rowSub} numberOfLines={1}>{channel.description}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── DM Row ─────────────────────────────────────────────────────────────────
const DMRow = ({ member, isOnline, onPress, idx, delay }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 320, delay, useNativeDriver: true }).start();
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.4, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isOnline]);

  const color = CHANNEL_COLORS[idx % CHANNEL_COLORS.length];
  const initials = getInitials(member.name || member.email?.split('@')[0]);
  return (
    <Animated.View style={{ opacity: fade }}>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        {/* Avatar */}
        <View style={styles.dmAvatarWrap}>
          <View style={[styles.dmAvatar, { backgroundColor: color + '15' }]}>
            <Text style={[styles.dmAvatarText, { color }]}>{initials}</Text>
          </View>
          {/* Real-time online indicator */}
          {isOnline && (
            <>
              <Animated.View style={[styles.onlineRing, { transform: [{ scale: pulse }] }]} />
              <View style={styles.onlineDot} />
            </>
          )}
        </View>

        <View style={styles.rowInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.rowTitle}>{member.name || member.email?.split('@')[0]}</Text>
            {isOnline && (
              <Text style={styles.onlineText}>Online</Text>
            )}
          </View>
          <Text style={styles.rowSub} numberOfLines={1}>
            {member.designation || (member.role?.replace(/_/g, ' ') || 'Team member')}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ChatScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { socket: globalSocket, isUserOnline } = useContext(SocketContext);
  const [workspace, setWorkspace] = useState(null);
  const [publicChannels, setPublicChannels] = useState([]);
  const [privateChannels, setPrivateChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberLastActive, setMemberLastActive] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;

  // Create Channel Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false);
  const [newChannelMembers, setNewChannelMembers] = useState([]);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    load();

    const socket = globalSocket || io(API_URL.replace('/api', ''));
    if (user?._id) {
      socket.emit('user_connected', user._id);
    }
    
    const onChanCreated = (newChan) => {
      setPublicChannels(prev => {
        if (newChan.isPrivate || prev.some(c => c._id === newChan._id)) return prev;
        return [...prev, newChan];
      });
      setPrivateChannels(prev => {
        if (!newChan.isPrivate || prev.some(c => c._id === newChan._id)) return prev;
        const hasAccess = newChan.members?.some(m => String(m._id || m) === String(user?._id)) || String(newChan.createdBy) === String(user?._id);
        return hasAccess ? [...prev, newChan] : prev;
      });
    };

    const onChanUpdated = (upChan) => {
      setPublicChannels(prev => {
        if (upChan.isPrivate) return prev.filter(c => c._id !== upChan._id);
        if (prev.some(c => c._id === upChan._id)) return prev.map(c => c._id === upChan._id ? upChan : c);
        return [...prev, upChan];
      });
      setPrivateChannels(prev => {
        const hasAccess = upChan.members?.some(m => String(m._id || m) === String(user?._id)) || String(upChan.createdBy) === String(user?._id);
        if (!upChan.isPrivate || !hasAccess) return prev.filter(c => c._id !== upChan._id);
        if (prev.some(c => c._id === upChan._id)) return prev.map(c => c._id === upChan._id ? upChan : c);
        return [...prev, upChan];
      });
    };

    const onChanDeleted = ({ channelId }) => {
      setPublicChannels(prev => prev.filter(c => c._id !== channelId));
      setPrivateChannels(prev => prev.filter(c => c._id !== channelId));
    };

    socket.on('channel_created', onChanCreated);
    socket.on('channel_updated', onChanUpdated);
    socket.on('channel_deleted', onChanDeleted);

    return () => {
      socket.off('channel_created', onChanCreated);
      socket.off('channel_updated', onChanUpdated);
      socket.off('channel_deleted', onChanDeleted);
      if (!globalSocket) {
        socket.disconnect();
      }
    };
  }, [user?._id, globalSocket]);

  const load = async () => {
    try {
      const ws = await cachedGet('/workspaces');
      if (ws.length > 0) {
        setWorkspace(ws[0]);
        const [detail, chs, dmRecent] = await Promise.all([
          cachedGet(`/workspaces/${ws[0]._id}`),
          cachedGet(`/workspaces/${ws[0]._id}/channels`),
          cachedGet(`/workspaces/${ws[0]._id}/dms/activity/recent`).catch(() => ({}))
        ]);
        if (dmRecent && typeof dmRecent === 'object') {
          setMemberLastActive(dmRecent);
        }
        if (detail?.members) {
          const rawMembers = detail.members
            .filter(m => m.user && String(m.user._id) !== String(user._id))
            .map(m => m.user);
          
          setMembers(rawMembers);
        }
        const allChannels = (Array.isArray(chs) ? chs : []).filter(c => !c.name.startsWith('dm-'));
        setPublicChannels(allChannels.filter(c => !c.isPrivate));
        setPrivateChannels(allChannels.filter(c => c.isPrivate));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openChannel = (ch) => {
    navigation.navigate('ChatWindow', {
      workspaceId: workspace._id,
      channelId: ch._id,
      channelName: ch.name,
      channel: ch,
      isDM: false,
    });
  };

  const openDM = async (m) => {
    if (!workspace) return;
    try {
      const res = await cachedGet(`/workspaces/${workspace._id}/dms/${m._id}`);
      navigation.navigate('ChatWindow', {
        workspaceId: workspace._id,
        channelId: res._id,
        channelName: m.name || m.email?.split('@')[0],
        isDM: true,
        otherUser: m,
      });
    } catch (e) { console.error(e); }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      Alert.alert('Required', 'Please enter a channel name');
      return;
    }
    if (!newChannelIsPrivate && !['super_admin', 'hr'].includes(user?.role)) {
      Alert.alert('Restricted', 'Only Super Admin (MD) and HR can create public groups.');
      return;
    }
    if (!workspace?._id) return;
    setIsCreatingChannel(true);
    try {
      const formattedName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
      const finalMembers = newChannelIsPrivate 
        ? (newChannelMembers.includes(user?._id) ? newChannelMembers : [...newChannelMembers, user?._id])
        : [];
      
      const res = await axios.post(`/workspaces/${workspace._id}/channels`, {
        name: formattedName,
        description: newChannelDesc.trim(),
        isPrivate: newChannelIsPrivate,
        members: finalMembers,
      });

      setIsCreateModalOpen(false);
      setNewChannelName('');
      setNewChannelDesc('');
      setNewChannelIsPrivate(false);
      setNewChannelMembers([]);
      
      // Navigate straight into new channel
      openChannel(res.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create channel');
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const toggleMemberSelection = (memberId) => {
    setNewChannelMembers(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const filteredPublicChannels = publicChannels.filter(c => 
    !searchQuery.trim() || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrivateChannels = privateChannels.filter(c => 
    !searchQuery.trim() || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMembers = members
    .filter(m => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = m.name?.toLowerCase() || '';
      const email = m.email?.toLowerCase() || '';
      const designation = m.designation?.toLowerCase() || '';
      return name.includes(q) || email.includes(q) || designation.includes(q);
    })
    .sort((a, b) => {
      const timeA = memberLastActive[a._id] || 0;
      const timeB = memberLastActive[b._id] || 0;
      if (timeA !== timeB) return timeB - timeA;
      return (a.name || a.email || '').localeCompare(b.name || b.email || '');
    });

  const canCreateChannel = ['super_admin', 'hr', 'team_leader'].includes(user?.role);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fade }]}>
        {showSearch ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search channels or people..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity 
              style={{ marginLeft: 8, padding: 6 }} 
              onPress={() => { setShowSearch(false); setSearchQuery(''); }}
            >
              <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.headerTitle}>Messages</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {canCreateChannel && (
                <TouchableOpacity 
                  style={styles.createBtn} 
                  onPress={() => setIsCreateModalOpen(true)}
                  activeOpacity={0.7}
                >
                  <Plus color="#FFFFFF" size={18} strokeWidth={2.5} />
                  <Text style={styles.createBtnText}>Channel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.searchBtn} onPress={() => setShowSearch(true)}>
                <Search color="#6B7280" size={18} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Public Channels ──────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Public Channels</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{filteredPublicChannels.length}</Text>
          </View>
          {canCreateChannel && (
            <TouchableOpacity 
              style={{ marginLeft: 'auto', padding: 4 }}
              onPress={() => {
                setNewChannelIsPrivate(false);
                setIsCreateModalOpen(true);
              }}
            >
              <Plus color="#6B7280" size={16} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          [1, 2].map(i => <SkeletonRow key={i} />)
        ) : filteredPublicChannels.length === 0 ? (
          <View style={styles.emptySection}>
            <Hash color="#E5E7EB" size={18} />
            <Text style={styles.emptySectionText}>No public channels found</Text>
          </View>
        ) : (
          filteredPublicChannels.map((ch, i) => (
            <ChannelRow
              key={ch._id}
              channel={ch}
              idx={i}
              delay={i * 40}
              onPress={() => openChannel(ch)}
            />
          ))
        )}

        {/* ── Private Channels ──────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>Private Channels</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{filteredPrivateChannels.length}</Text>
          </View>
          {canCreateChannel && (
            <TouchableOpacity 
              style={{ marginLeft: 'auto', padding: 4 }}
              onPress={() => {
                setNewChannelIsPrivate(true);
                setIsCreateModalOpen(true);
              }}
            >
              <Plus color="#6B7280" size={16} />
            </TouchableOpacity>
          )}
        </View>
        {loading ? (
          <SkeletonRow />
        ) : filteredPrivateChannels.length === 0 ? (
          <View style={styles.emptySection}>
            <Lock color="#E5E7EB" size={18} />
            <Text style={styles.emptySectionText}>No private channels</Text>
          </View>
        ) : (
          filteredPrivateChannels.map((ch, i) => (
            <ChannelRow
              key={ch._id}
              channel={ch}
              idx={i + filteredPublicChannels.length}
              delay={i * 40}
              onPress={() => openChannel(ch)}
            />
          ))
        )}

        {/* ── Direct Messages ────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>Direct Messages</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{filteredMembers.length}</Text>
          </View>
        </View>

        {loading ? (
          [1, 2, 3].map(i => <SkeletonRow key={i} />)
        ) : filteredMembers.length === 0 ? (
          <View style={styles.emptySection}>
            <Users color="#E5E7EB" size={18} />
            <Text style={styles.emptySectionText}>No team members found</Text>
          </View>
        ) : (
          filteredMembers.map((m, i) => (
            <DMRow
              key={m._id}
              member={m}
              isOnline={isUserOnline(m._id)}
              idx={i}
              delay={i * 40}
              onPress={() => openDM(m)}
            />
          ))
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* CREATE CHANNEL MODAL */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Channel</Text>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                <X color="#64748B" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Channel Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={newChannelName}
                onChangeText={setNewChannelName}
                placeholder="e.g. project-updates"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                value={newChannelDesc}
                onChangeText={setNewChannelDesc}
                placeholder="What is this channel about?"
                placeholderTextColor="#94A3B8"
                multiline
              />

              {/* Private Channel Toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleTitle}>Private Channel</Text>
                  <Text style={styles.toggleSub}>Only invited employees can access</Text>
                </View>
                <Switch
                  value={newChannelIsPrivate}
                  onValueChange={setNewChannelIsPrivate}
                  trackColor={{ false: '#E2E8F0', true: '#1b2b4c' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Member Selection if Private */}
              {newChannelIsPrivate && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.inputLabel}>Select Members ({newChannelMembers.length})</Text>
                  <View style={styles.membersList}>
                    {members.map(m => {
                      const isSelected = newChannelMembers.includes(m._id);
                      return (
                        <TouchableOpacity
                          key={m._id}
                          style={[styles.memberItem, isSelected && styles.memberItemSelected]}
                          onPress={() => toggleMemberSelection(m._id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>{getInitials(m.name)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.memberName}>{m.name || m.email}</Text>
                            <Text style={styles.memberRole}>{m.designation || m.role?.replace(/_/g, ' ')}</Text>
                          </View>
                          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                            {isSelected && <Check color="#FFF" size={14} strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsCreateModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createSubmitBtn, isCreatingChannel && { opacity: 0.7 }]}
                onPress={handleCreateChannel}
                disabled={isCreatingChannel}
              >
                {isCreatingChannel ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createSubmitText}>Create Channel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  searchBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: PRIMARY,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  createBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  searchInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827'
  },

  scroll: { paddingBottom: 40 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F9FAFB' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  sectionBadge: {
    backgroundColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
  },
  sectionBadgeText: { fontSize: 10, fontWeight: '700', color: '#374151' },

  emptySection: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16 },
  emptySectionText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
  },

  // Row (channel + DM)
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  rowIconBox: {
    width: 32, height: 32,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  rowInfo: { flex: 1, justifyContent: 'center' },
  rowTitle: { fontSize: 16, color: '#111827', marginBottom: 2 },
  rowSub: { fontSize: 13, color: '#6B7280' },
  
  // DM specific
  dmAvatarWrap: { position: 'relative', marginRight: 12 },
  dmAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  dmAvatarText: { fontSize: 16, fontWeight: '600' },
  onlineRing: {
    position: 'absolute', bottom: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(16,185,129,0.25)',
  },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff',
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20, width: '100%',
    padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1b2b4c' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6, textTransform: 'uppercase' },
  modalInput: {
    backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1b2b4c',
    marginBottom: 14,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: '#1b2b4c' },
  toggleSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  membersList: {
    maxHeight: 180, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC', padding: 4,
  },
  memberItem: {
    flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8,
    marginBottom: 4,
  },
  memberItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  memberAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  memberAvatarText: { fontSize: 11, fontWeight: '700', color: '#1b2b4c' },
  memberName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  memberRole: { fontSize: 10, color: '#64748B', textTransform: 'capitalize' },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E1',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1b2b4c', borderColor: '#1b2b4c',
  },
  modalActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 10,
    marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  createSubmitBtn: {
    backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, minWidth: 100, alignItems: 'center',
  },
  createSubmitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
