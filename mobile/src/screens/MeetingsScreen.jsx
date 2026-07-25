import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Video, Users, Clock, MapPin } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const PRIMARY = '#5B5BD6';

function groupMeetings(meetings) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayItems = [];
  const upcomingItems = [];
  const pastItems = [];

  meetings.forEach(m => {
    const d = new Date(m.date);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    if (day.getTime() === today.getTime()) todayItems.push(m);
    else if (d >= today) upcomingItems.push(m);
    else pastItems.push(m);
  });

  const sections = [];
  if (todayItems.length)    sections.push({ title: 'Today',    data: todayItems    });
  if (upcomingItems.length) sections.push({ title: 'Upcoming', data: upcomingItems });
  if (pastItems.length)     sections.push({ title: 'Past',     data: pastItems     });
  return sections;
}

const SECTION_COLOR = {
  Today:    { dot: '#059669', bg: '#F0FDF4' },
  Upcoming: { dot: PRIMARY,   bg: '#EEF2FF' },
  Past:     { dot: '#9CA3AF', bg: '#F9FAFB' },
};

const MeetingCard = ({ item }) => {
  const dateObj = new Date(item.date);
  const isOnline = item.type === 'google_meet';
  const today = new Date(); today.setHours(0,0,0,0);
  const itemDay = new Date(dateObj); itemDay.setHours(0,0,0,0);
  const isToday = itemDay.getTime() === today.getTime();
  const isPast  = dateObj < new Date();

  const handleJoin = () => {
    if (item.link) Linking.openURL(item.link).catch(console.error);
  };

  return (
    <View style={[styles.card, isPast && styles.cardPast, isToday && styles.cardToday]}>
      {/* Date column */}
      <View style={[styles.dateCol, isToday && { borderRightColor: '#BBF7D0' }]}>
        <Text style={[styles.dateMonth, isToday && { color: '#10B981' }]}>
          {dateObj.toLocaleDateString([], { month: 'short' }).toUpperCase()}
        </Text>
        <Text style={[styles.dateDay, isPast && { color: '#94A3B8' }]}>
          {dateObj.getDate()}
        </Text>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <Text style={[styles.title, isPast && { color: '#94A3B8' }]} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          <Clock color="#94A3B8" size={13} style={{ marginRight: 5 }} />
          <Text style={styles.metaText}>{item.time || 'All Day'}</Text>
        </View>

        <View style={styles.metaRow}>
          {isOnline ? (
            <Video color="#3B82F6" size={13} style={{ marginRight: 5 }} />
          ) : (
            <MapPin color="#10B981" size={13} style={{ marginRight: 5 }} />
          )}
          <Text style={[styles.metaText, isOnline && { color: '#3B82F6', fontWeight: '600' }]}>
            {isOnline ? 'Online Meeting' : (item.location || 'Direct Meet')}
          </Text>
        </View>

        {item.attendees?.length > 0 && (
          <View style={styles.metaRow}>
            <Users color="#94A3B8" size={13} style={{ marginRight: 5 }} />
            <Text style={styles.metaText}>{item.attendees.length} attendee{item.attendees.length !== 1 ? 's' : ''}</Text>
          </View>
        )}

        {isOnline && item.link && !isPast && (
          <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
            <Video color="#fff" size={13} />
            <Text style={styles.joinText}>Join Meeting</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function MeetingsScreen({ navigation }) {
  const [meetings, setMeetings] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workspace, setWorkspace] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      if (!workspace) {
        const wsRes = await axios.get('/workspaces');
        if (wsRes.data.length > 0) {
          const ws = wsRes.data[0];
          setWorkspace(ws);
          await fetchMeetings(ws._id);
        } else setLoading(false);
      } else {
        await fetchMeetings(workspace._id);
      }
    } catch (err) {
      console.error(err);
      setLoading(false); setRefreshing(false);
    }
  };

  const fetchMeetings = async (wsId) => {
    try {
      const res = await axios.get(`/workspaces/${wsId}/meetings`);
      const sorted = res.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setMeetings(sorted);
      setSections(groupMeetings(sorted));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0F172A" size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Meetings</Text>
          <Text style={styles.headerSub}>{meetings.length} total</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconBox}>
            <Calendar color="#D1D5DB" size={32} />
          </View>
          <Text style={styles.emptyTitle}>No meetings yet</Text>
          <Text style={styles.emptySub}>Your upcoming meetings will appear here.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item._id}
          renderItem={({ item }) => <MeetingCard item={item} />}
          renderSectionHeader={({ section: { title, data } }) => {
            const cfg = SECTION_COLOR[title] || SECTION_COLOR.Upcoming;
            return (
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: cfg.dot }]} />
                <Text style={[styles.sectionTitle, { color: cfg.dot }]}>{title.toUpperCase()}</Text>
                <View style={[styles.sectionCountWrap, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.sectionCount, { color: cfg.dot }]}>{data.length}</Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchData(); }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: '#F9FAFB',
    borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  listContent: { padding: 16, paddingBottom: 120 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 8,
  },
  sectionDot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  sectionTitle: { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  sectionCountWrap: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  sectionCount: { fontSize: 11, fontWeight: '700' },

  // Cards
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6',
    borderLeftWidth: 3, borderLeftColor: PRIMARY,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardToday: { borderLeftColor: '#059669' },
  cardPast: { borderLeftColor: '#E5E7EB', opacity: 0.6 },

  dateCol: {
    width: 52, alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: '#F3F4F6',
    paddingRight: 14, marginRight: 14,
  },
  dateMonth: { fontSize: 10, fontWeight: '700', color: PRIMARY, marginBottom: 4, letterSpacing: 0.5 },
  dateDay: { fontSize: 24, fontWeight: '800', color: '#111827' },

  details: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },

  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, alignSelf: 'flex-start', marginTop: 10,
  },
  joinText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Empty
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#F9FAFB',
    borderWidth: 1, borderColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});

