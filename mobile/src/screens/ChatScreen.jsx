import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Hash, MessageCircle, Search, Users, Zap } from 'lucide-react-native';
import { cachedGet } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const CHANNEL_GRADIENTS = [
  ['#6366F1','#818CF8'],
  ['#8B5CF6','#A78BFA'],
  ['#3B82F6','#60A5FA'],
  ['#10B981','#34D399'],
  ['#F97316','#FB923C'],
  ['#EC4899','#F472B6'],
];

const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

// ── Channel Item ─────────────────────────────────────────────────────────
const ChannelItem = ({ channel, onPress, idx, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 16, bounciness: 3, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  const grad = CHANNEL_GRADIENTS[idx % CHANNEL_GRADIENTS.length];
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={styles.channelItem} onPress={onPress} activeOpacity={0.78}>
        <LinearGradient colors={grad} style={styles.channelIcon}>
          <Hash color="#fff" size={18} strokeWidth={2.5} />
        </LinearGradient>
        <View style={styles.channelInfo}>
          <Text style={styles.channelName}>#{channel.name}</Text>
          <Text style={styles.channelDesc} numberOfLines={1}>
            {channel.description || 'Public channel · Tap to open'}
          </Text>
        </View>
        <LinearGradient colors={['#F8FAFC','#F1F5F9']} style={styles.chevronWrap}>
          <Text style={styles.chevronText}>›</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── DM Item ───────────────────────────────────────────────────────────────
const DMItem = ({ member, onPress, idx, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay, useNativeDriver: true }).start();
    // Pulse the online dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const grad = CHANNEL_GRADIENTS[idx % CHANNEL_GRADIENTS.length];
  const initial = getInitials(member.name || member.email?.split('@')[0]);
  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity style={styles.dmItem} onPress={onPress} activeOpacity={0.78}>
        <View style={styles.dmAvatarWrap}>
          <LinearGradient colors={grad} style={styles.dmAvatar}>
            <Text style={styles.dmAvatarText}>{initial}</Text>
          </LinearGradient>
          {/* Animated online pulse */}
          <Animated.View style={[styles.onlinePulse, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.dmInfo}>
          <Text style={styles.dmName}>{member.name || member.email?.split('@')[0]}</Text>
          <Text style={styles.dmDesig} numberOfLines={1}>
            {member.designation || (member.role?.replace('_', ' ') || 'Member')}
          </Text>
        </View>

        <LinearGradient colors={grad} style={styles.dmChatBtn}>
          <MessageCircle color="#fff" size={16} strokeWidth={2} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ChatScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const wsData = await cachedGet('/workspaces');
      if (wsData.length > 0) {
        const ws = wsData[0];
        setWorkspace(ws);
        const [detailData, channelsData] = await Promise.all([
          cachedGet(`/workspaces/${ws._id}`),
          cachedGet(`/workspaces/${ws._id}/channels`),
        ]);
        if (detailData.members) {
          const members = detailData.members
            .filter(m => m.user && String(m.user._id) !== String(user._id))
            .map(m => m.user);
          setWorkspaceMembers(members);
        }
        setChannels((Array.isArray(channelsData) ? channelsData : []).filter(c => !c.name.startsWith('dm-')));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelClick = (channel) => {
    navigation.navigate('ChatWindow', {
      workspaceId: workspace._id,
      channelId: channel._id,
      channelName: channel.name,
      isDM: false,
    });
  };

  const handleDMClick = async (memberUser) => {
    if (!workspace) return;
    try {
      const res = await cachedGet(`/workspaces/${workspace._id}/dms/${memberUser._id}`);
      navigation.navigate('ChatWindow', {
        workspaceId: workspace._id,
        channelId: res._id,
        channelName: memberUser.name || memberUser.email?.split('@')[0],
        isDM: true,
        otherUser: memberUser,
      });
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0F172A','#1E293B']} style={styles.headerGradient}>
          <View style={styles.headerInner}>
            <Text style={styles.headerTitle}>Messages</Text>
          </View>
        </LinearGradient>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Gradient Header ──────────────────────── */}
      <LinearGradient colors={['#0F172A','#1E293B']} style={styles.headerGradient}>
        <Animated.View style={[styles.headerInner, { opacity: headerFade }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSub}>
              {channels.length} channel{channels.length !== 1 ? 's' : ''} · {workspaceMembers.length} member{workspaceMembers.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.searchBtn}>
            <Search color="rgba(248,250,252,0.7)" size={19} strokeWidth={2} />
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Channels ──────────────────────────── */}
        <View style={styles.sectionHeader}>
          <LinearGradient colors={['#6366F1','#818CF8']} style={styles.sectionIconWrap}>
            <Hash color="#fff" size={13} strokeWidth={2.5} />
          </LinearGradient>
          <Text style={styles.sectionTitle}>CHANNELS</Text>
          <View style={styles.sectionCount}>
            <Text style={styles.sectionCountText}>{channels.length}</Text>
          </View>
        </View>

        {channels.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No channels yet</Text>
          </View>
        ) : (
          channels.map((channel, idx) => (
            <ChannelItem
              key={channel._id}
              channel={channel}
              idx={idx}
              delay={idx * 40}
              onPress={() => handleChannelClick(channel)}
            />
          ))
        )}

        {/* ── Direct Messages ────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 12 }]}>
          <LinearGradient colors={['#EC4899','#F472B6']} style={styles.sectionIconWrap}>
            <Users color="#fff" size={13} strokeWidth={2.5} />
          </LinearGradient>
          <Text style={styles.sectionTitle}>DIRECT MESSAGES</Text>
          <View style={styles.sectionCount}>
            <Text style={styles.sectionCountText}>{workspaceMembers.length}</Text>
          </View>
        </View>

        {workspaceMembers.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No team members found</Text>
          </View>
        ) : (
          workspaceMembers.map((member, idx) => (
            <DMItem
              key={member._id}
              member={member}
              idx={idx}
              delay={idx * 40}
              onPress={() => handleDMClick(member)}
            />
          ))
        )}

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  // Header
  headerGradient: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#F8FAFC' },
  headerSub: { fontSize: 13, color: 'rgba(248,250,252,0.55)', marginTop: 2 },
  searchBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIconWrap: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  sectionTitle: { flex: 1, fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.2 },
  sectionCount: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  sectionCountText: { fontSize: 11, color: '#64748B', fontWeight: '700' },

  emptySection: { paddingVertical: 20, paddingHorizontal: 4, marginBottom: 8 },
  emptySectionText: { fontSize: 13, color: '#CBD5E1', fontWeight: '500' },

  // Channel Item
  channelItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 18, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  channelIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  channelInfo: { flex: 1 },
  channelName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  channelDesc: { fontSize: 12, color: '#94A3B8' },
  chevronWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  chevronText: { fontSize: 22, color: '#94A3B8', lineHeight: 28 },

  // DM Item
  dmItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 18, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#EC4899', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  dmAvatarWrap: { position: 'relative', marginRight: 14 },
  dmAvatar: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  dmAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  onlinePulse: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(16,185,129,0.3)',
  },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff',
  },
  dmInfo: { flex: 1 },
  dmName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  dmDesig: { fontSize: 12, color: '#94A3B8', textTransform: 'capitalize' },
  dmChatBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
