import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Video, Users, Clock, Plus } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function MeetingsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workspace, setWorkspace] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (!workspace) {
        const wsRes = await axios.get('/workspaces');
        if (wsRes.data.length > 0) {
          const ws = wsRes.data[0];
          setWorkspace(ws);
          fetchMeetings(ws._id);
        } else {
          setLoading(false);
        }
      } else {
        fetchMeetings(workspace._id);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMeetings = async (wsId) => {
    try {
      const res = await axios.get(`/workspaces/${wsId}/meetings`);
      // Sort by date/time (newest first for now, or upcoming first)
      const sorted = res.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setMeetings(sorted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAttend = (link) => {
    if (link) {
      Linking.openURL(link).catch(err => console.error('Failed to open URL', err));
    }
  };

  const renderItem = ({ item }) => {
    const isOnline = item.type === 'google_meet';
    const dateObj = new Date(item.date);
    const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const isUpcoming = dateObj >= new Date(new Date().setHours(0,0,0,0));

    return (
      <View style={[styles.meetingCard, !isUpcoming && styles.meetingCardPast]}>
        <View style={styles.dateCol}>
          <Text style={styles.dateMonth}>{dateObj.toLocaleDateString([], { month: 'short' }).toUpperCase()}</Text>
          <Text style={styles.dateDay}>{dateObj.getDate()}</Text>
        </View>
        <View style={styles.detailsCol}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          
          <View style={styles.metaRow}>
            <Clock size={14} color="#64748B" style={styles.metaIcon} />
            <Text style={styles.metaText}>{item.time || 'All Day'}</Text>
          </View>
          
          <View style={styles.metaRow}>
            {isOnline ? (
              <Video size={14} color="#3B82F6" style={styles.metaIcon} />
            ) : (
              <Users size={14} color="#10B981" style={styles.metaIcon} />
            )}
            <Text style={[styles.metaText, isOnline ? {color: '#3B82F6', fontWeight: 'bold'} : {}]}>
              {isOnline ? 'Online Meeting' : 'Direct Meet'}
            </Text>
          </View>

          {isOnline && item.link && isUpcoming && (
            <TouchableOpacity style={styles.attendBtn} onPress={() => handleAttend(item.link)}>
              <Text style={styles.attendBtnText}>Join Meeting</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#64748B" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meetings</Text>
        {/* Placeholder for Schedule Button */}
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : meetings.length === 0 ? (
        <View style={styles.center}>
          <Calendar size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No meetings scheduled</Text>
        </View>
      ) : (
        <FlatList
          data={meetings}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData();
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
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  listContent: { padding: 16, paddingBottom: 100 },
  
  meetingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  meetingCardPast: {
    opacity: 0.6,
    borderLeftColor: '#CBD5E1',
  },
  dateCol: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    paddingRight: 16,
    marginRight: 16,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
  },
  attendBtn: {
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  attendBtnText: {
    color: '#3B82F6',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
});
