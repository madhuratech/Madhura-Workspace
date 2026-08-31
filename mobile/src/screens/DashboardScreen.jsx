import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  TouchableOpacity, Dimensions, StatusBar, TextInput, ActivityIndicator, Image
} from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search, ChevronDown, Bell, CheckSquare, Bookmark,
  Lock, Hash, Rocket, Plus, ChevronUp, Filter, AlignRight
} from 'lucide-react-native';
import { cachedGet, saveWorkspaceCache, loadWorkspaceCache } from '../utils/api';
import { BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const PRIMARY = '#1b2b4c';
const ACCENT = '#ffca22';

const TouchableScale = ({ onPress, style, children, activeOpacity = 0.85 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();

  return (
    <TouchableOpacity activeOpacity={activeOpacity} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={style}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const Section = ({ title, children, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {expanded ? <ChevronDown color="#64748B" size={16} /> : <ChevronUp color="#64748B" size={16} />}
      </TouchableOpacity>
      {expanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
};

const ChannelRow = ({ icon: Icon, name, badge, isPrivate, onPress }) => (
  <TouchableScale style={styles.channelRow} onPress={onPress}>
    <Icon color={isPrivate ? "#64748B" : "#94A3B8"} size={16} style={styles.channelIcon} />
    <Text style={[styles.channelName, badge > 0 && { fontWeight: '700', color: '#111827' }]}>{name}</Text>
    {badge > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    )}
  </TouchableScale>
);

export default function DashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [metrics, setMetrics] = useState({ tasksDue: 0, unreads: 0, meetings: 0 });
  const [notifications, setNotifications] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [todayAttendances, setTodayAttendances] = useState([]);

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    load();
  }, []);

  const load = async () => {
    try {
      const ws = await cachedGet('/workspaces');
      setWorkspaces(ws);
      if (ws.length > 0) {
        const proj = await cachedGet(`/workspaces/${ws[0]._id}/projects`).catch(() => []);
        setProjects(Array.isArray(proj) ? proj : []);
      }
      
      const allTasks = await cachedGet('/tasks').catch(() => []);
      const myTasks = allTasks.filter(t => String(t.assignedTo?._id || t.assignedTo) === String(user._id) && t.status !== 'Done');
      
      const notifs = await cachedGet('/notifications').catch(() => []);
      const unreadNotifs = notifs.filter(n => !n.isRead);
      
      const allMeetings = await cachedGet('/meetings').catch(() => []);
      const myMeetings = allMeetings.filter(m => 
        String(m.organizer?._id || m.organizer) === String(user._id) || 
        (m.attendees && m.attendees.some(a => String(a.user?._id || a.user) === String(user._id)))
      );

      if (ws.length > 0) {
        const atts = await cachedGet(`/workspaces/${ws[0]._id}/attendance`).catch(() => []);
        const today = new Date().toISOString().split('T')[0];
        setTodayAttendances(atts.filter(a => a.date === today));
      }

      setMeetings(myMeetings.slice(0, 5)); // Keep top 5
      setNotifications(notifs.slice(0, 5)); // Keep top 5
      setMetrics({ tasksDue: myTasks.length, unreads: unreadNotifs.length, meetings: myMeetings.length });

    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const activeWorkspace = workspaces.length > 0 ? workspaces[0].name : 'Madhura HQ';
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
      
      {/* ── Dark Header Section ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.workspaceSelector}>
            <Image 
              source={require('../../assets/logo.jpeg')} 
              style={{ width: 32, height: 32, marginRight: 12, borderRadius: 8 }}
              resizeMode="cover"
            />
            <Text style={styles.workspaceName}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Menu', { screen: 'Settings' })}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{initial}</Text>
            </View>
            <View style={styles.statusDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Search color="#94A3B8" size={16} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      {/* ── Main Content Area ── */}
      <View style={styles.mainContentWrapper}>
        {/* Background curve effect */}
        <View style={styles.backgroundCurve} />

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator color={PRIMARY} size="large" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Animated.View style={{ opacity: fade }}>
            
            {/* Quick Actions Card */}
            <View style={styles.quickActionsCard}>
              <View style={styles.quickActionsRow}>
                <TouchableScale style={styles.quickActionItem} onPress={() => navigation.navigate('Notifications')}>
                  <View style={styles.actionIconBox}>
                    <Bell color={PRIMARY} size={20} />
                  </View>
                  <Text style={styles.actionLabel}>Unreads</Text>
                  <Text style={styles.actionSub}>{metrics.unreads} items</Text>
                </TouchableScale>
                
                <TouchableScale style={styles.quickActionItem} onPress={() => navigation.navigate('Tasks')}>
                  <View style={styles.actionIconBox}>
                    <CheckSquare color={PRIMARY} size={20} />
                  </View>
                  <Text style={styles.actionLabel}>Tasks</Text>
                  <Text style={styles.actionSub}>{metrics.tasksDue} items</Text>
                </TouchableScale>
                
                <TouchableScale style={styles.quickActionItem} onPress={() => navigation.navigate('Menu', { screen: 'Meetings' })}>
                  <View style={[styles.actionIconBox, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]}>
                    <Bookmark color="#64748B" size={18} />
                  </View>
                  <Text style={[styles.actionLabel, { color: '#64748B' }]}>Meetings</Text>
                  <Text style={styles.actionSub}>{metrics.meetings} items</Text>
                </TouchableScale>
              </View>
              {/* Little pull tab at bottom of card */}
              <View style={styles.pullTab}>
                <ChevronDown color="#94A3B8" size={12} />
              </View>
            </View>

            {/* Metrics Chart */}
            <Section title="Overview" defaultExpanded={true}>
              <View style={{ alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 }}>
                <BarChart
                  data={{
                    labels: ['Tasks', 'Unreads', 'Meetings'],
                    datasets: [
                      {
                        data: [metrics.tasksDue || 0, metrics.unreads || 0, metrics.meetings || 0],
                      },
                    ],
                  }}
                  width={width - 80}
                  height={220}
                  yAxisLabel=""
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(27, 43, 76, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    barPercentage: 0.6,
                    propsForBackgroundLines: {
                        strokeWidth: 1,
                        stroke: '#E2E8F0',
                        strokeDasharray: '0',
                    }
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              </View>
            </Section>

            {/* Dynamic List Sections */}
            <View style={styles.listContainer}>
              
              {/* Today's Attendance */}
              <Section title="Today's Attendance">
                {todayAttendances.length === 0 ? (
                   <Text style={{ paddingLeft: 12, color: '#94A3B8', fontSize: 13 }}>No check-ins today</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 8, gap: 16 }}>
                    {todayAttendances.map((att, i) => (
                      <View key={att._id || i} style={{ alignItems: 'center', width: 64 }}>
                        <View style={{
                          width: 50, height: 50, borderRadius: 25, 
                          backgroundColor: att.isLate ? '#FEF2F2' : '#F0FDF4', 
                          borderWidth: 2, borderColor: att.isLate ? '#FCA5A5' : '#86EFAC',
                          justifyContent: 'center', alignItems: 'center', marginBottom: 6
                        }}>
                          <Text style={{ color: att.isLate ? '#DC2626' : '#16A34A', fontWeight: 'bold', fontSize: 18 }}>
                            {att.user?.name ? att.user.name.charAt(0).toUpperCase() : '?'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#475569', textAlign: 'center', fontWeight: '600' }} numberOfLines={1}>
                          {att.user?.name?.split(' ')[0] || 'User'}
                        </Text>
                        <Text style={{ fontSize: 10, color: att.isLate ? '#DC2626' : '#94A3B8', marginTop: 2 }}>
                          {att.isLate ? 'Late' : 'On Time'}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </Section>

              {/* Active Projects */}
              <Section title="Active Projects">
                {projects.filter(p => p.status !== 'Completed').length === 0 ? (
                  <Text style={{ paddingLeft: 12, color: '#94A3B8', fontSize: 13 }}>No active projects</Text>
                ) : (
                  projects.filter(p => p.status !== 'Completed').map((p, i) => (
                    <ChannelRow key={p._id} icon={i === 0 ? Rocket : Hash} name={(p.title || 'untitled').toLowerCase().replace(/\s+/g, '-')} badge={0} onPress={() => navigation.navigate('ProjectDetails', { project: p })} />
                  ))
                )}
              </Section>

              {/* Upcoming Meetings */}
              <Section title="Meetings">
                {meetings.length === 0 ? (
                  <Text style={{ paddingLeft: 12, color: '#94A3B8', fontSize: 13 }}>No upcoming meetings</Text>
                ) : (
                  meetings.map((m) => (
                    <ChannelRow key={m._id} icon={Bookmark} name={(m.title || 'meeting').toLowerCase().replace(/\s+/g, '-')} badge={0} onPress={() => navigation.navigate('Menu', { screen: 'Meetings' })} />
                  ))
                )}
              </Section>


            </View>
            
            </Animated.View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PRIMARY },
  
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: PRIMARY,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  workspaceSelector: {
    flexDirection: 'row', alignItems: 'center',
  },
  workspaceIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: ACCENT,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  workspaceIconText: { fontSize: 18, fontWeight: '800', color: PRIMARY },
  workspaceName: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  
  profileBtn: { position: 'relative' },
  profileAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#3b4b6c',
    justifyContent: 'center', alignItems: 'center',
  },
  profileAvatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statusDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981',
    borderWidth: 2, borderColor: PRIMARY,
  },

  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    paddingHorizontal: 12, height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#ffffff', height: '100%' },
  filterBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },

  mainContentWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  backgroundCurve: {
    position: 'absolute', top: -40, left: 0, right: 0, height: 80,
    backgroundColor: PRIMARY, zIndex: -1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120, // space for FAB
  },

  quickActionsCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    marginBottom: 24, alignItems: 'center',
  },
  quickActionsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    width: '100%', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
  },
  quickActionItem: { alignItems: 'center', flex: 1 },
  actionIconBox: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: PRIMARY, marginBottom: 2 },
  actionSub: { fontSize: 11, color: '#94A3B8' },
  pullTab: {
    width: 48, height: 16, backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: -1, // overlap border
    borderWidth: 1, borderColor: '#E2E8F0', borderBottomWidth: 0,
  },

  listContainer: { paddingHorizontal: 4 },
  sectionContainer: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sectionContent: { gap: 16 },

  channelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  channelIcon: { marginRight: 12 },
  channelName: { flex: 1, fontSize: 15, color: '#475569', fontWeight: '500' },
  badge: {
    backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, minWidth: 22, alignItems: 'center', justifyContent: 'center'
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 24,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  fabText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
