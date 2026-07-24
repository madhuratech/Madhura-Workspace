import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hash, MessageCircle, Search } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const CHANNEL_COLORS = ['#3B82F6','#8B5CF6','#F97316','#10B981','#EC4899','#06B6D4'];

export default function ChatScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        setWorkspace(ws);
        const [detailRes, channelsRes] = await Promise.all([
          axios.get(`/workspaces/${ws._id}`),
          axios.get(`/workspaces/${ws._id}/channels`),
        ]);
        if (detailRes.data.members) {
          const members = detailRes.data.members
            .filter(m => m.user && String(m.user._id) !== String(user._id))
            .map(m => m.user);
          setWorkspaceMembers(members);
        }
        setChannels(channelsRes.data.filter(c => !c.name.startsWith('dm-')));
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
      const res = await axios.get(`/workspaces/${workspace._id}/dms/${memberUser._id}`);
      navigation.navigate('ChatWindow', {
        workspaceId: workspace._id,
        channelId: res.data._id,
        channelName: memberUser.name || memberUser.email.split('@')[0],
        isDM: true,
        otherUser: memberUser,
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Search color="#64748B" size={20} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Channels ─────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>CHANNELS</Text>
          <View style={styles.sectionCount}>
            <Text style={styles.sectionCountText}>{channels.length}</Text>
          </View>
        </View>

        {channels.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No channels yet.</Text>
          </View>
        ) : (
          channels.map((channel, idx) => (
            <TouchableOpacity
              key={channel._id}
              style={styles.channelItem}
              onPress={() => handleChannelClick(channel)}
              activeOpacity={0.75}
            >
              <View style={[
                styles.channelIcon,
                { backgroundColor: CHANNEL_COLORS[idx % CHANNEL_COLORS.length] + '18' },
              ]}>
                <Hash color={CHANNEL_COLORS[idx % CHANNEL_COLORS.length]} size={18} strokeWidth={2.5} />
              </View>
              <View style={styles.channelInfo}>
                <Text style={styles.channelName}>{channel.name}</Text>
                {channel.description ? (
                  <Text style={styles.channelDesc} numberOfLines={1}>{channel.description}</Text>
                ) : (
                  <Text style={styles.channelDesc}>Public channel</Text>
                )}
              </View>
              <View style={styles.chevron}>
                <Text style={styles.chevronText}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* ── Direct Messages ───────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionTitle}>DIRECT MESSAGES</Text>
          <View style={styles.sectionCount}>
            <Text style={styles.sectionCountText}>{workspaceMembers.length}</Text>
          </View>
        </View>

        {workspaceMembers.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No team members found.</Text>
          </View>
        ) : (
          workspaceMembers.map((member, idx) => {
            const initial = member.name
              ? member.name.charAt(0).toUpperCase()
              : '?';
            const color = CHANNEL_COLORS[idx % CHANNEL_COLORS.length];
            return (
              <TouchableOpacity
                key={member._id}
                style={styles.dmItem}
                onPress={() => handleDMClick(member)}
                activeOpacity={0.75}
              >
                {/* Avatar with online dot */}
                <View style={styles.dmAvatarWrap}>
                  <View style={[styles.dmAvatar, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.dmAvatarText, { color }]}>{initial}</Text>
                  </View>
                  <View style={styles.onlineDot} />
                </View>

                <View style={styles.dmInfo}>
                  <Text style={styles.dmName}>{member.name || member.email.split('@')[0]}</Text>
                  <Text style={styles.dmDesig}>{member.designation || member.role?.replace('_', ' ') || 'Member'}</Text>
                </View>

                <View style={styles.dmChatIcon}>
                  <MessageCircle color="#94A3B8" size={18} strokeWidth={1.6} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  searchBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.2, flex: 1,
  },
  sectionCount: {
    backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionCountText: { fontSize: 11, color: '#64748B', fontWeight: '700' },

  emptySection: { paddingVertical: 16, paddingHorizontal: 4, marginBottom: 8 },
  emptySectionText: { fontSize: 13, color: '#CBD5E1', fontWeight: '500' },

  // Channel items
  channelItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  channelIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  channelInfo: { flex: 1 },
  channelName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  channelDesc: { fontSize: 12, color: '#94A3B8' },
  chevron: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center',
  },
  chevronText: { fontSize: 20, color: '#CBD5E1', lineHeight: 26 },

  // DM items
  dmItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  dmAvatarWrap: { position: 'relative', marginRight: 14 },
  dmAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  dmAvatarText: { fontSize: 18, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff',
  },
  dmInfo: { flex: 1 },
  dmName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  dmDesig: { fontSize: 12, color: '#94A3B8' },
  dmChatIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
  },
});
