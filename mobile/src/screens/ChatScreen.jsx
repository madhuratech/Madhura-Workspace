import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hash, MessageCircle, Search, Users } from 'lucide-react-native';
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

  const color = CHANNEL_COLORS[idx % CHANNEL_COLORS.length];
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.78}>
        <View style={[styles.rowIconBox, { backgroundColor: color + '15' }]}>
          <Hash color={color} size={18} strokeWidth={2.5} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>#{channel.name}</Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {channel.description || 'Public channel'}
          </Text>
        </View>
        <ChevronIcon />
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
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.78}>
        {/* Avatar */}
        <View style={styles.dmAvatarWrap}>
          <View style={[styles.dmAvatar, { backgroundColor: color + '18' }]}>
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

        <View style={[styles.dmMsgBtn, { backgroundColor: color + '12' }]}>
          <MessageCircle color={color} size={16} strokeWidth={2} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Tiny chevron
const ChevronIcon = () => (
  <View style={styles.chevron}>
    <Text style={styles.chevronText}>›</Text>
  </View>
);

export default function ChatScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
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
        setChannels((Array.isArray(chs) ? chs : []).filter(c => !c.name.startsWith('dm-')));
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
        {/* ── Channels ──────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Channels</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{channels.length}</Text>
          </View>
        </View>

        {loading ? (
          [1, 2].map(i => <SkeletonRow key={i} />)
        ) : channels.length === 0 ? (
          <View style={styles.emptySection}>
            <Hash color="#E5E7EB" size={18} />
            <Text style={styles.emptySectionText}>No channels yet</Text>
          </View>
        ) : (
          channels.map((ch, i) => (
            <ChannelRow
              key={ch._id}
              channel={ch}
              idx={i}
              delay={i * 40}
              onPress={() => openChannel(ch)}
            />
          ))
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
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  searchBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  sectionTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },

  emptySection: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 4 },
  emptySectionText: { fontSize: 13, color: '#D1D5DB', fontWeight: '500' },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F3F4F6',
  },

  // Row (channel + DM)
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  rowIconBox: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  rowSub: { fontSize: 12, color: '#9CA3AF' },
  chevron: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  chevronText: { fontSize: 20, color: '#D1D5DB', lineHeight: 26 },

  // DM specific
  dmAvatarWrap: { position: 'relative', marginRight: 14 },
  dmAvatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  dmAvatarText: { fontSize: 16, fontWeight: '800' },
  onlineRing: {
    position: 'absolute', bottom: -1, right: -1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(16,185,129,0.25)',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff',
  },
  dmMsgBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
});
