import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hash, MessageCircle } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function ChatScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        setWorkspace(ws);
        
        // Fetch detailed workspace to get members
        const detailRes = await axios.get(`/workspaces/${ws._id}`);
        if (detailRes.data.members) {
          const members = detailRes.data.members
            .filter(m => m.user && String(m.user._id) !== String(user._id))
            .map(m => m.user);
          setWorkspaceMembers(members);
        }

        // Fetch channels
        const channelsRes = await axios.get(`/workspaces/${ws._id}/channels`);
        setChannels(channelsRes.data.filter(c => !c.name.startsWith('dm-')));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelClick = (channel) => {
    navigation.navigate('ChatWindow', {
      workspaceId: workspace._id,
      channelId: channel._id,
      channelName: channel.name,
      isDM: false
    });
  };

  const handleDMClick = async (memberUser) => {
    if (!workspace) return;
    try {
      const res = await axios.get(`/workspaces/${workspace._id}/dms/${memberUser._id}`);
      navigation.navigate('ChatWindow', {
        workspaceId: workspace._id,
        channelId: res.data._id, // This is the DM Channel ID
        channelName: memberUser.name || memberUser.email.split('@')[0],
        isDM: true,
        otherUser: memberUser
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      <FlatList
        ListHeaderComponent={() => (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CHANNELS</Text>
            </View>
            {channels.map(channel => (
              <TouchableOpacity
                key={channel._id}
                style={styles.chatItem}
                onPress={() => handleChannelClick(channel)}
              >
                <View style={styles.iconContainer}>
                  <Hash color="#64748B" size={20} />
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{channel.name}</Text>
                  {channel.description ? (
                    <Text style={styles.chatDesc} numberOfLines={1}>{channel.description}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>DIRECT MESSAGES</Text>
            </View>
          </>
        )}
        data={workspaceMembers}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => handleDMClick(item)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name ? item.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={styles.chatInfo}>
              <Text style={styles.chatName}>{item.name || item.email.split('@')[0]}</Text>
              <Text style={styles.chatDesc}>{item.designation || 'Member'}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    paddingHorizontal: 24, 
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 24 },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#3B82F6',
    fontWeight: 'bold',
    fontSize: 16,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  chatDesc: {
    fontSize: 13,
    color: '#64748B',
  }
});
