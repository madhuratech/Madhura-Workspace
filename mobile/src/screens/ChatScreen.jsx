import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hash, Lock, MessageCircle, Search, Users } from 'lucide-react-native';
import { cachedGet } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const PRIMARY = '#5B5BD6';

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

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.rowIconBox}>
          <IconCmp color="#9CA3AF" size={20} strokeWidth={2.5} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowTitle, { fontWeight: channel.isPrivate ? '600' : '500' }]}>
            {channel.name}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── DM Row ─────────────────────────────────────────────────────────────────
const DMRow = ({ member, onPress, idx, delay }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 320, delay, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

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
          {/* Pulsing online indicator */}
          <Animated.View style={[styles.onlineRing, { transform: [{ scale: pulse }] }]} />
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{member.name || member.email?.split('@')[0]}</Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {member.designation || (member.role?.replace(/_/g, ' ') || 'Team member')}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Removed chevron

export default function ChatScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [publicChannels, setPublicChannels] = useState([]);
  const [privateChannels, setPrivateChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    load();
  }, []);

  const load = async () => {
    try {
      const ws = await cachedGet('/workspaces');
      if (ws.length > 0) {
        setWorkspace(ws[0]);
        const [detail, chs] = await Promise.all([
          cachedGet(`/workspaces/${ws[0]._id}`),
          cachedGet(`/workspaces/${ws[0]._id}/channels`),
        ]);
        if (detail?.members) {
          setMembers(
            detail.members
              .filter(m => m.user && String(m.user._id) !== String(user._id))
              .map(m => m.user)
          );
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

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fade }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Search color="#6B7280" size={18} strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Public Channels ──────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Public Channels</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{publicChannels.length}</Text>
          </View>
        </View>

        {loading ? (
          [1, 2].map(i => <SkeletonRow key={i} />)
        ) : publicChannels.length === 0 ? (
          <View style={styles.emptySection}>
            <Hash color="#E5E7EB" size={18} />
            <Text style={styles.emptySectionText}>No public channels yet</Text>
          </View>
        ) : (
          publicChannels.map((ch, i) => (
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
        {(!loading && privateChannels.length > 0) && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>Private Channels</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{privateChannels.length}</Text>
              </View>
            </View>
            {privateChannels.map((ch, i) => (
              <ChannelRow
                key={ch._id}
                channel={ch}
                idx={i + publicChannels.length}
                delay={i * 40}
                onPress={() => openChannel(ch)}
              />
            ))}
          </>
        )}

        {/* ── Direct Messages ────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionTitle}>Direct Messages</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{members.length}</Text>
          </View>
        </View>

        {loading ? (
          [1, 2, 3].map(i => <SkeletonRow key={i} />)
        ) : members.length === 0 ? (
          <View style={styles.emptySection}>
            <Users color="#E5E7EB" size={18} />
            <Text style={styles.emptySectionText}>No team members</Text>
          </View>
        ) : (
          members.map((m, i) => (
            <DMRow
              key={m._id}
              member={m}
              idx={i}
              delay={i * 40}
              onPress={() => openDM(m)}
            />
          ))
        )}

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  searchBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
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
    paddingHorizontal: 16, paddingVertical: 12,
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
  dmAvatar: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
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
  }
});
