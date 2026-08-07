import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Star, Inbox, Send, AlertCircle } from 'lucide-react-native';
import axios from 'axios';

const FOLDERS = [
  { key: 'inbox',   label: 'Inbox',   Icon: Inbox  },
  { key: 'sent',    label: 'Sent',    Icon: Send   },
  { key: 'starred', label: 'Starred', Icon: Star   },
];

const AVATAR_COLORS = [
  '#1b2b4c','#8B5CF6','#F97316','#10B981','#EC4899','#06B6D4','#EF4444',
];

function getColor(str) {
  if (!str) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const EmailItem = ({ item, isSent }) => {
  const displayUser = isSent ? item.to : item.from;
  const name = displayUser ? displayUser.split('<')[0].trim() : 'Unknown';
  const isUnread = !item.isRead && !isSent;
  const color = getColor(name);
  const initial = name.charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.emailItem, isUnread && styles.emailItemUnread]}
      activeOpacity={0.8}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: color + '20' }]}>
        <Text style={[styles.avatarText, { color }]}>{initial}</Text>
      </View>

      <View style={styles.emailContent}>
        <View style={styles.emailTopRow}>
          <Text style={[styles.emailName, isUnread && styles.textBold]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.emailDate}>
            {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <Text style={[styles.emailSubject, isUnread && styles.textBold]} numberOfLines={1}>
          {item.subject || '(No Subject)'}
        </Text>
        <Text style={styles.emailSnippet} numberOfLines={1}>
          {item.snippet ? item.snippet.replace(/&quot;/g, '"').replace(/&#39;/g, "'") : ''}
        </Text>
      </View>

      {isUnread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

export default function EmailScreen({ navigation }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchWorkspaceAndEmails(); }, [activeFolder]);

  const fetchWorkspaceAndEmails = async () => {
    try {
      if (!workspace) {
        const wsRes = await axios.get('/workspaces');
        if (wsRes.data.length > 0) {
          const ws = wsRes.data[0];
          setWorkspace(ws);
          await fetchEmails(ws._id);
        }
      } else {
        await fetchEmails(workspace._id);
      }
    } catch (err) {
      console.error(err);
      setLoading(false); setRefreshing(false);
    }
  };

  const fetchEmails = async (wsId) => {
    try {
      setAuthRequired(false);
      const res = await axios.get(`/workspaces/${wsId}/emails?folder=${activeFolder}`);
      setEmails(res.data);
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.authRequired) {
        setAuthRequired(true);
      }
      console.error('Failed to fetch emails', err);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const res = await axios.get('/auth/google/url');
      Linking.openURL(res.data.url);
    } catch (err) {
      console.error('Failed to get auth URL', err);
    }
  };

  const isSent = activeFolder === 'sent';
  const unreadCount = emails.filter(e => !e.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1b2b4c" size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Email</Text>
          {unreadCount > 0 && !isSent && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
      </View>

      {/* Folder Tabs */}
      <View style={styles.tabs}>
        {FOLDERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.tab, activeFolder === f.key && styles.tabActive]}
            onPress={() => { setLoading(true); setActiveFolder(f.key); }}
          >
            <f.Icon
              color={activeFolder === f.key ? '#1b2b4c' : '#94A3B8'}
              size={16}
              strokeWidth={activeFolder === f.key ? 2.5 : 1.8}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeFolder === f.key && styles.tabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1b2b4c" />
        </View>
      ) : authRequired ? (
        <View style={styles.center}>
          <View style={styles.gmailIconWrap}>
            <Mail color="#1b2b4c" size={36} />
          </View>
          <Text style={styles.authTitle}>Connect your Gmail</Text>
          <Text style={styles.authDesc}>
            Authorize Madhura Workspace to access your Gmail to read and send emails.
          </Text>
          <TouchableOpacity style={styles.gmailBtn} onPress={handleConnectGmail}>
            <Text style={styles.gmailBtnText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      ) : emails.length === 0 ? (
        <View style={styles.center}>
          <Mail color="#CBD5E1" size={52} />
          <Text style={styles.emptyTitle}>No emails in {activeFolder}</Text>
        </View>
      ) : (
        <FlatList
          data={emails}
          keyExtractor={item => item._id || String(Math.random())}
          renderItem={({ item }) => <EmailItem item={item} isSent={isSent} />}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchWorkspaceAndEmails(); }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1b2b4c' },
  headerSub: { fontSize: 12, color: '#1b2b4c', fontWeight: '600', marginTop: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#1b2b4c' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: '#1b2b4c' },

  listContent: { paddingBottom: 100 },

  // Email item
  emailItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  emailItemUnread: { backgroundColor: '#F0F9FF' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  emailContent: { flex: 1, marginRight: 8 },
  emailTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  emailName: { fontSize: 14, color: '#334155', flex: 1, marginRight: 8 },
  emailDate: { fontSize: 11, color: '#94A3B8' },
  emailSubject: { fontSize: 13, color: '#334155', marginBottom: 2 },
  emailSnippet: { fontSize: 12, color: '#94A3B8' },
  textBold: { fontWeight: '700', color: '#1b2b4c' },
  unreadDot: {
    width: 9, height: 9, borderRadius: 5, backgroundColor: '#1b2b4c',
  },

  // Gmail auth
  gmailIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  authTitle: { fontSize: 20, fontWeight: '700', color: '#1b2b4c', marginBottom: 10, textAlign: 'center' },
  authDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  gmailBtn: {
    backgroundColor: '#4285F4', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, alignItems: 'center',
  },
  gmailBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#94A3B8', marginTop: 16 },
});
