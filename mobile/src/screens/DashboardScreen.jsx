import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  ActivityIndicator, TouchableOpacity, Dimensions
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users, FolderKanban, CheckSquare, CalendarDays,
  TrendingUp, ArrowRight, Bell, Zap
} from 'lucide-react-native';
import { cachedGet, saveWorkspaceCache, loadWorkspaceCache } from '../utils/api';

const { width } = Dimensions.get('window');

const ROLE_CONFIG = {
  super_admin: { label: 'Super Admin', color: '#A78BFA', grad: ['#7C3AED', '#6D28D9'] },
  hr:          { label: 'HR',          color: '#60A5FA', grad: ['#3B82F6', '#2563EB'] },
  team_leader: { label: 'Team Leader', color: '#FCD34D', grad: ['#F59E0B', '#D97706'] },
  employee:    { label: 'Employee',    color: '#34D399', grad: ['#10B981', '#059669'] },
};

const ROLE_DESC = {
  super_admin: 'Manage your organization, teams, and workspaces.',
  hr:          'Overview of all projects, meetings, and team activities.',
  team_leader: 'Assign tasks, track progress, and lead your team.',
  employee:    "Here's what's assigned to you today.",
};

// ── Shimmer Skeleton ────────────────────────────────────────────────────────
const SkeletonCard = ({ delay = 0 }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, delay, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const bg = shimmer.interpolate({ inputRange: [0, 1], outputRange: ['#F1F5F9', '#E2E8F0'] });
  return (
    <Animated.View style={[styles.statCard, { backgroundColor: bg, borderColor: '#F1F5F9' }]}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonValue} />
      <View style={styles.skeletonLabel} />
    </Animated.View>
  );
};

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, gradColors, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 6, delay, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, speed: 12, bounciness: 6, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
      ]}
    >
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statIconWrap}>
        <Icon color="#fff" size={20} strokeWidth={2.2} />
      </LinearGradient>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Animated.View>
  );
};

// ── Quick Action ─────────────────────────────────────────────────────────────
const QuickAction = ({ label, icon: Icon, gradColors, onPress, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 4, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={styles.qaBtn} onPress={onPress} activeOpacity={0.8}>
        <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.qaIcon}>
          <Icon color="#fff" size={22} strokeWidth={2} />
        </LinearGradient>
        <Text style={styles.qaLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function DashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ projects: 0, tasks: 0, members: 0, meetings: 0 });
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-16)).current;

  const role = user?.role || 'employee';
  const roleConf = ROLE_CONFIG[role] || ROLE_CONFIG.employee;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, speed: 10, bounciness: 4, useNativeDriver: true }),
    ]).start();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Load cached workspace first for instant display
    const cached = await loadWorkspaceCache();
    if (cached) {
      setWorkspaces(cached.workspaces || []);
      setStats(cached.stats || { projects: 0, tasks: 0, members: 0, meetings: 0 });
      setLoading(false);
    }

    try {
      const wsData = await cachedGet('/workspaces');
      setWorkspaces(wsData);
      if (wsData.length > 0) {
        const ws = wsData[0];
        const [projectsRes, tasksRes, meetingsRes] = await Promise.all([
          cachedGet(`/workspaces/${ws._id}/projects`).catch(() => []),
          cachedGet('/tasks').catch(() => []),
          cachedGet(`/workspaces/${ws._id}/meetings`).catch(() => []),
        ]);
        const newStats = {
          projects: Array.isArray(projectsRes) ? projectsRes.length : 0,
          tasks: Array.isArray(tasksRes) ? tasksRes.length : 0,
          members: ws.members?.length || 1,
          meetings: Array.isArray(meetingsRes) ? meetingsRes.length : 0,
        };
        setStats(newStats);
        // Persist to AsyncStorage for next cold open
        await saveWorkspaceCache({ workspaces: wsData, stats: newStats });
      }
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Premium Gradient Header ────────────────── */}
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Animated.View style={[styles.headerInner, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>
                Good {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}! 👋
              </Text>
              <View style={styles.roleRow}>
                <LinearGradient colors={roleConf.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rolePill}>
                  <Text style={styles.roleText}>{roleConf.label}</Text>
                </LinearGradient>
              </View>
              <Text style={styles.roleDesc}>{ROLE_DESC[role]}</Text>
            </View>
            <View>
              <View style={styles.avatarCircle}>
                <LinearGradient colors={roleConf.grad} style={styles.avatarGrad}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </LinearGradient>
              </View>
              <TouchableOpacity style={styles.bellAbsolute}>
                <Bell color="rgba(255,255,255,0.6)" size={18} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* ── Stats ──────────────────────────────────── */}
        <Text style={styles.sectionLabel}>OVERVIEW</Text>
        {loading ? (
          <View style={styles.statsGrid}>
            <SkeletonCard delay={0} />
            <SkeletonCard delay={80} />
            <SkeletonCard delay={160} />
            <SkeletonCard delay={240} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard title="Projects"  value={stats.projects}  icon={FolderKanban} gradColors={['#3B82F6','#2563EB']} delay={0}   />
            <StatCard title="Tasks"     value={stats.tasks}     icon={CheckSquare}  gradColors={['#10B981','#059669']} delay={60}  />
            <StatCard title="Members"   value={stats.members}   icon={Users}        gradColors={['#8B5CF6','#7C3AED']} delay={120} />
            <StatCard title="Meetings"  value={stats.meetings}  icon={CalendarDays} gradColors={['#F97316','#EA580C']} delay={180} />
          </View>
        )}

        {/* ── Quick Actions ──────────────────────────── */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.qaRow}>
          <QuickAction label="My Tasks"  icon={CheckSquare}  gradColors={['#3B82F6','#6366F1']} delay={0}   onPress={() => navigation.navigate('Tasks')}    />
          <QuickAction label="Projects"  icon={FolderKanban} gradColors={['#8B5CF6','#EC4899']} delay={60}  onPress={() => navigation.navigate('Projects')} />
          <QuickAction label="Meetings"  icon={CalendarDays} gradColors={['#F97316','#EF4444']} delay={120} onPress={() => {}}                             />
          <QuickAction label="Activity"  icon={Zap}          gradColors={['#10B981','#06B6D4']} delay={180} onPress={() => {}}                             />
        </ScrollView>

        {/* ── Workspaces ─────────────────────────────── */}
        {workspaces.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>WORKSPACES</Text>
            {workspaces.map((ws) => (
              <Animated.View key={ws._id} style={[styles.wsCard, { opacity: headerFade }]}>
                <LinearGradient colors={['#6366F1','#8B5CF6']} style={styles.wsIconWrap}>
                  <FolderKanban color="#fff" size={18} strokeWidth={2} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wsName}>{ws.name}</Text>
                  <Text style={styles.wsMeta}>{ws.members?.length || 1} member{(ws.members?.length || 1) !== 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.wsChevron}>
                  <ArrowRight color="#6366F1" size={18} />
                </View>
              </Animated.View>
            ))}
          </>
        )}

        {/* ── Recent Activity ─────────────────────────── */}
        <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
        <Animated.View style={[styles.emptyCard, { opacity: headerFade }]}>
          <LinearGradient colors={['#F1F5F9','#E2E8F0']} style={styles.emptyIconWrap}>
            <TrendingUp color="#94A3B8" size={28} />
          </LinearGradient>
          <Text style={styles.emptyText}>No recent activity</Text>
          <Text style={styles.emptySubText}>Complete tasks and attend meetings to see activity here.</Text>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 160 },

  // Header
  headerGradient: { marginBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 24 },
  headerInner: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: 12 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#F8FAFC', marginBottom: 10, lineHeight: 28 },
  roleRow: { flexDirection: 'row', marginBottom: 8 },
  rolePill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.6, textTransform: 'uppercase' },
  roleDesc: { fontSize: 13, color: 'rgba(248,250,252,0.6)', lineHeight: 19 },
  avatarCircle: { width: 52, height: 52, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatarGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bellAbsolute: {
    position: 'absolute', top: -4, right: -4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Section
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.2,
    marginBottom: 12, marginTop: 4, paddingHorizontal: 20, textTransform: 'uppercase',
  },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 16 },
  statCard: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 22, padding: 20,
    marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  statIconWrap: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  statValue: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  statTitle: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  // Skeleton
  skeletonIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#E2E8F0', marginBottom: 14 },
  skeletonValue: { width: 48, height: 28, borderRadius: 8, backgroundColor: '#E2E8F0', marginBottom: 8 },
  skeletonLabel: { width: 64, height: 12, borderRadius: 6, backgroundColor: '#F1F5F9' },

  // Quick Actions
  qaRow: { marginBottom: 24, paddingLeft: 20 },
  qaBtn: { alignItems: 'center', marginRight: 18, width: 76 },
  qaIcon: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  qaLabel: { fontSize: 12, color: '#334155', fontWeight: '600', textAlign: 'center' },

  // Workspace
  wsCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 18, padding: 16, marginBottom: 10, marginHorizontal: 16,
    borderWidth: 1, borderColor: '#EEF2FF',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2,
  },
  wsIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  wsName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  wsMeta: { fontSize: 12, color: '#94A3B8' },
  wsChevron: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },

  // Empty
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 22, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9', marginHorizontal: 16, marginBottom: 16,
  },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#94A3B8', marginBottom: 6 },
  emptySubText: { fontSize: 12, color: '#CBD5E1', textAlign: 'center', lineHeight: 18 },
});
