import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  Users, FolderKanban, CheckSquare, CalendarDays,
  TrendingUp, ChevronRight, Bell, Zap, Play, Clock, AlertCircle
} from 'lucide-react-native';
import { cachedGet, saveWorkspaceCache, loadWorkspaceCache } from '../utils/api';

const { width } = Dimensions.get('window');
const PRIMARY = '#1b2b4c';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const TouchableScale = ({ onPress, style, children, activeOpacity = 0.9 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={style}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ── Skeleton ─────────────────────────────────────────────────────────────
const Skeleton = ({ w, h, r = 8, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.2)'] });
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: bg }, style]} />;
};

// ── Quick Action Chip ──────────────────────────────────────────────────────
const QAChip = ({ label, Icon, onPress }) => (
  <TouchableScale onPress={onPress}>
    <View style={styles.qaChip}>
      <View style={styles.qaIconBox}>
        <Icon color={PRIMARY} size={22} strokeWidth={2.5} />
      </View>
      <Text style={styles.qaChipText}>{label}</Text>
    </View>
  </TouchableScale>
);

// ── Animated Graphs ────────────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const AnimatedProgressRing = ({ percentage, color = PRIMARY, size = 100, strokeWidth = 10 }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circum = radius * 2 * Math.PI;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [percentage]);
  
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circum, 0],
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle stroke="#F1F5F9" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle 
          stroke={color} 
          cx={size / 2} cy={size / 2} r={radius} 
          strokeWidth={strokeWidth} fill="none" 
          strokeDasharray={circum} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round" 
          transform={`rotate(-90 ${size/2} ${size/2})`} 
        />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1b2b4c' }}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
};

const AnimatedBar = ({ label, value, max, color }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percentage,
      duration: 1200,
      useNativeDriver: false
    }).start();
  }, [percentage]);

  const width = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1b2b4c' }}>{value}</Text>
      </View>
      <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', backgroundColor: color, width, borderRadius: 4 }} />
      </View>
    </View>
  );
};

export default function DashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState([]);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const initial = user?.name?.[0]?.toUpperCase() || 'U';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, speed: 12, bounciness: 4, useNativeDriver: true })
    ]).start();
    load();
  }, []);

  const load = async () => {
    const cached = await loadWorkspaceCache();
    if (cached) {
      setWorkspaces(cached.workspaces || []);
      setStats(cached.stats || {});
      setLoading(false);
    }
    try {
      const ws = await cachedGet('/workspaces');
      setWorkspaces(ws);
      if (ws.length > 0) {
        const [proj, tasks, meetings, notifs, rems] = await Promise.all([
          cachedGet(`/workspaces/${ws[0]._id}/projects`).catch(() => []),
          cachedGet('/tasks').catch(() => []),
          cachedGet(`/workspaces/${ws[0]._id}/meetings`).catch(() => []),
          cachedGet('/notifications').catch(() => []),
          cachedGet('/reminders').catch(() => []),
        ]);
        
        if (Array.isArray(rems)) setReminders(rems);

        let completedTasks = 0, inProgressTasks = 0, pendingTasks = 0;
        if (Array.isArray(tasks)) {
          tasks.forEach(t => {
            const st = t.status?.toLowerCase() || '';
            if (st === 'completed') completedTasks++;
            else if (st === 'in progress') inProgressTasks++;
            else pendingTasks++;
          });
        }
        
        let completedProjects = 0;
        if (Array.isArray(proj)) {
          proj.forEach(p => {
            if (p.status?.toLowerCase() === 'completed') completedProjects++;
          });
        }

        const s = {
          projects: Array.isArray(proj) ? proj.length : 0,
          completedProjects,
          tasks:    Array.isArray(tasks) ? tasks.length : 0,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          members:  ws[0].members?.length || 1,
          meetings: Array.isArray(meetings) ? meetings.length : 0,
          unreadNotifs: Array.isArray(notifs) ? notifs.filter(n => !n.read).length : 0,
        };
        setStats(s);
        await saveWorkspaceCache({ workspaces: ws, stats: s });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* ── Premium Gradient Header ──────────────────────────────── */}
        <LinearGradient
          colors={['#312E81', '#1b2b4c', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) + 10 }]}
        >
          <Animated.View style={[styles.headerContent, { opacity: fade, transform: [{ translateY: slide }] }]}>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.name?.split(' ')[0] || 'User'}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
                  <View style={styles.bellIconWrap}>
                    <Bell color="#fff" size={24} strokeWidth={2} />
                    {(stats?.unreadNotifs > 0) && <View style={styles.unreadDot} />}
                  </View>
                </TouchableOpacity>
                <View style={styles.avatarWrap}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              </View>
            </View>

            {/* Core Stats in Header */}
            <View style={styles.coreStatsRow}>
              <View style={styles.coreStatItem}>
                {loading ? <Skeleton w={30} h={36} r={6} /> : <Text style={styles.coreStatValue}>{stats?.tasks || 0}</Text>}
                <Text style={styles.coreStatLabel}>Tasks Due</Text>
              </View>
              <View style={styles.coreStatDivider} />
              <View style={styles.coreStatItem}>
                {loading ? <Skeleton w={30} h={36} r={6} /> : <Text style={styles.coreStatValue}>{stats?.projects || 0}</Text>}
                <Text style={styles.coreStatLabel}>Projects</Text>
              </View>
              <View style={styles.coreStatDivider} />
              <View style={styles.coreStatItem}>
                {loading ? <Skeleton w={30} h={36} r={6} /> : <Text style={styles.coreStatValue}>{stats?.meetings || 0}</Text>}
                <Text style={styles.coreStatLabel}>Meetings</Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* ── Overlapping Quick Actions ──────────────────────────── */}
        <View style={styles.overlapContainer}>
          <View style={styles.qaGrid}>
            <QAChip label="Tasks" Icon={CheckSquare} onPress={() => navigation.navigate('Tasks')} />
            <QAChip label="Projects" Icon={FolderKanban} onPress={() => navigation.navigate('Projects')} />
            <QAChip label="Team" Icon={Users} onPress={() => navigation.navigate('Menu', { screen: 'Team' })} />
            <QAChip label="Events" Icon={CalendarDays} onPress={() => navigation.navigate('Menu', { screen: 'Meetings' })} />
          </View>
        </View>

        {/* ── Workspace Carousel ──────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Workspaces</Text>
            <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselPad}>
            {workspaces.map((ws, i) => (
              <TouchableScale key={ws._id} style={styles.carouselCard} onPress={() => navigation.navigate('Projects')}>
                <View style={styles.carouselIcon}>
                  <Zap color={PRIMARY} size={24} />
                </View>
                <Text style={styles.carouselTitle}>{ws.name}</Text>
                <Text style={styles.carouselSub}>{ws.members?.length || 1} Members</Text>
              </TouchableScale>
            ))}
            {workspaces.length === 0 && !loading && (
              <View style={[styles.carouselCard, { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' }]}>
                <Text style={styles.carouselSub}>No Workspaces</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* ── Recent Activity ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Clock color="#94A3B8" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>You caught up!</Text>
              <Text style={styles.activitySub}>No new activity in your workspaces.</Text>
            </View>
          </View>
        </View>

        {/* ── Real-Time Tracking Graphs ──────────────────────────── */}
        {stats && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>Performance Tracking</Text>
            
            <View style={styles.graphGrid}>
              {/* Task Tracking Card */}
              <View style={styles.graphCard}>
                <Text style={styles.graphTitle}>Task Status</Text>
                <AnimatedBar label="Completed" value={stats.completedTasks} max={stats.tasks} color="#10B981" />
                <AnimatedBar label="In Progress" value={stats.inProgressTasks} max={stats.tasks} color="#1b2b4c" />
                <AnimatedBar label="Pending" value={stats.pendingTasks} max={stats.tasks} color="#F59E0B" />
              </View>

              {/* Project Progress Card */}
              <View style={[styles.graphCard, { alignItems: 'center' }]}>
                <Text style={[styles.graphTitle, { alignSelf: 'flex-start' }]}>Project Completion</Text>
                <View style={{ marginTop: 10 }}>
                  <AnimatedProgressRing 
                    percentage={stats.projects > 0 ? (stats.completedProjects / stats.projects) * 100 : 0} 
                  />
                </View>
                <Text style={{ marginTop: 16, fontSize: 13, color: '#64748B', fontWeight: '500' }}>
                  {stats.completedProjects} of {stats.projects} projects completed
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Upcoming Reminders ────────────────────────────── */}
        {reminders.length > 0 && (
          <View style={[styles.section, { paddingBottom: 100 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
            </View>
            <View style={styles.graphGrid}>
              {reminders.slice(0, 3).map((rem, i) => {
                const isMeeting = rem.type === 'meeting';
                const Icon = isMeeting ? CalendarDays : CheckSquare;
                const color = isMeeting ? '#8B5CF6' : '#F59E0B';
                const timeString = new Date(rem.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <View key={rem._id} style={styles.reminderCard}>
                    <View style={[styles.reminderIconBox, { backgroundColor: color + '15' }]}>
                      <Icon color={color} size={22} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reminderTitle} numberOfLines={1}>{rem.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <AlertCircle color="#94A3B8" size={14} style={{ marginRight: 4 }} />
                        <Text style={styles.reminderSub}>{isMeeting ? 'Meeting' : 'Task Due'} • {timeString}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Gradient Header
  headerGradient: {
    paddingBottom: 60,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerContent: { paddingHorizontal: 24 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginBottom: 4 },
  userName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bellBtn: { position: 'relative', padding: 4 },
  bellIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  unreadDot: {
    position: 'absolute', top: 10, right: 10,
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444',
    borderWidth: 2, borderColor: '#312E81'
  },
  avatarWrap: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)'
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },

  coreStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  coreStatItem: { alignItems: 'center' },
  coreStatValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 4 },
  coreStatLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  coreStatDivider: { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.25)' },

  // Overlap Container
  overlapContainer: {
    marginTop: -42,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  qaGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 20,
    shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 8,
  },
  qaChip: {
    flex: 1, alignItems: 'center', paddingVertical: 4
  },
  qaIconBox: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  qaChipText: { fontSize: 13, fontWeight: '600', color: '#475569', textAlign: 'center' },

  // Sections
  section: { marginTop: 36 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 24, marginBottom: 18 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1b2b4c', letterSpacing: -0.3 },
  seeAll: { fontSize: 14, fontWeight: '700', color: PRIMARY },

  // Carousel
  carouselPad: { paddingHorizontal: 24, paddingRight: 8 },
  carouselCard: {
    width: width * 0.7, backgroundColor: '#fff', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
    marginRight: 16,
  },
  carouselIcon: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  carouselTitle: { fontSize: 18, fontWeight: '700', color: '#1b2b4c', marginBottom: 4 },
  carouselSub: { fontSize: 14, color: '#64748B', fontWeight: '500' },

  // Activity List
  activityCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 24, marginTop: 12, padding: 20, borderRadius: 24,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
  },
  activityIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  activityTitle: { fontSize: 15, fontWeight: '600', color: '#1b2b4c', marginBottom: 2 },
  activitySub: { fontSize: 13, color: '#64748B' },

  // Tracking Graphs
  graphGrid: {
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 16,
  },
  graphCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4,
    marginBottom: 16,
  },
  graphTitle: { fontSize: 17, fontWeight: '700', color: '#1b2b4c', marginBottom: 20 },

  // Reminder Cards
  reminderCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    marginBottom: 12,
  },
  reminderIconBox: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  reminderTitle: { fontSize: 15, fontWeight: '700', color: '#1b2b4c' },
  reminderSub: { fontSize: 13, color: '#64748B', fontWeight: '500' },
});
