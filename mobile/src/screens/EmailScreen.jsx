import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Star, Inbox, Send, File, AlertCircle } from 'lucide-react-native';
import axios from 'axios';

export default function EmailScreen({ navigation }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchWorkspaceAndEmails();
  }, [activeFolder]);

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
    } catch (error) {
      console.error(error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchEmails = async (wsId) => {
    try {
      setAuthRequired(false);
      const res = await axios.get(`/workspaces/${wsId}/emails?folder=${activeFolder}`);
      setEmails(res.data);
    } catch (error) {
      if (error.response?.status === 401 && error.response?.data?.authRequired) {
        setAuthRequired(true);
      }
      console.error('Failed to fetch emails', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const res = await axios.get('/auth/google/url');
      Linking.openURL(res.data.url);
    } catch (error) {
      console.error('Failed to get auth URL', error);
      alert('Failed to initialize Google Authentication');
    }
  };

  const renderItem = ({ item }) => {
    const displayUser = activeFolder === 'sent' ? item.to : item.from;
    const name = displayUser ? displayUser.split('<')[0].trim() : 'Unknown';
    const isUnread = !item.isRead;
    
    return (
      <TouchableOpacity style={[styles.emailItem, isUnread && styles.emailItemUnread]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.emailInfo}>
          <View style={styles.emailHeader}>
            <Text style={[styles.emailName, isUnread && styles.textUnread]} numberOfLines={1}>{name}</Text>
            <Text style={styles.emailDate}>
              {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <Text style={[styles.emailSubject, isUnread && styles.textUnread]} numberOfLines={1}>
            {item.subject || '(No Subject)'}
          </Text>
          <Text style={styles.emailSnippet} numberOfLines={2}>
            {item.snippet ? item.snippet.replace(/&quot;/g, '"') : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity 
        style={[styles.tab, activeFolder === 'inbox' && styles.tabActive]}
        onPress={() => { setLoading(true); setActiveFolder('inbox'); }}
      >
        <Text style={[styles.tabText, activeFolder === 'inbox' && styles.tabTextActive]}>Inbox</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeFolder === 'sent' && styles.tabActive]}
        onPress={() => { setLoading(true); setActiveFolder('sent'); }}
      >
        <Text style={[styles.tabText, activeFolder === 'sent' && styles.tabTextActive]}>Sent</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeFolder === 'starred' && styles.tabActive]}
        onPress={() => { setLoading(true); setActiveFolder('starred'); }}
      >
        <Text style={[styles.tabText, activeFolder === 'starred' && styles.tabTextActive]}>Starred</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#64748B" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emails</Text>
      </View>

      {renderTabs()}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : authRequired ? (
        <View style={styles.center}>
          <View style={styles.authIconContainer}>
            <Mail size={48} color="#3B82F6" />
          </View>
          <Text style={styles.authTitle}>Connect your Google Workspace</Text>
          <Text style={styles.authDesc}>
            To read and send real emails from this app, you need to authorize Madhura Workspace to access your Gmail.
          </Text>
          <TouchableOpacity style={styles.authBtn} onPress={handleConnectGmail}>
            <Text style={styles.authBtnText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      ) : emails.length === 0 ? (
        <View style={styles.center}>
          <Mail size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No emails in {activeFolder}</Text>
        </View>
      ) : (
        <FlatList
          data={emails}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchWorkspaceAndEmails();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#3B82F6',
  },

  listContent: { paddingBottom: 24 },
  
  emailItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  emailItemUnread: {
    backgroundColor: '#F0F9FF',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  emailInfo: {
    flex: 1,
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  emailName: {
    fontSize: 15,
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  emailDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emailSubject: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  textUnread: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  emailSnippet: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },

  authIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  authDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  authBtn: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  authBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
});
