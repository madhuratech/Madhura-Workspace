import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users, FolderKanban, CheckSquare, CalendarDays,
  TrendingUp, ChevronRight, Bell, Zap,
} from 'lucide-react-native';
import { cachedGet, saveWorkspaceCache, loadWorkspaceCache } from '../utils/api';

const { width } = Dimensions.get('window');
const PRIMARY = '#5B5BD6';

const ROLE_CONFIG = {
  super_admin: { label: 'Super Admin', color: '#7C3AED', bg: '#F5F3FF' },
  hr:          { label: 'HR',          color: '#2563EB', bg: '#EFF6FF' },
  team_leader: { label: 'Team Leader', color: '#D97706', bg: '#FFF7ED' },
  employee:    { label: 'Employee',    color: '#059669', bg: '#F0FDF4' },
};

const ROLE_DESC = {
  super_admin: 'Manage your organization and workspaces.',
  hr:          'Overview of projects, meetings, and team activities.',
  team_leader: 'Assign tasks, track progress, lead your team.',
  employee:    "Here's what's on your plate today.",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

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
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: ['#F3F4F6', '#E5E7EB'] });
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: bg }, style]} />;
};

// ── Stat Card ─────────────────────────────────────────────────────────────
const STAT_META = [
  { key: 'projects', label: 'Projects',  Icon: FolderKanban, iconBg: '#EEF2FF', iconColor: PRIMARY },
  { key: 'tasks',    label: 'Tasks',     Icon: CheckSquare,  iconBg: '#F0FDF4', iconColor: '#059669' },
  { key: 'members',  label: 'Members',   Icon: Users,        iconBg: '#FFF7ED', iconColor: '#D97706' },
  { key: 'meetings', label: 'Meetings',  Icon: CalendarDays, iconBg: '#FEF2F2', iconColor: '#DC2626' },
];

const StatCard = ({ meta, value, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, speed: 14, bounciness: 4, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.statCard, { opacity: anim, transform: [{ translateY: slide }] }]}>
      <View style={[styles.statIconBox, { backgroundColor: meta.iconBg }]}>
        <meta.Icon color={meta.iconColor} size={20} strokeWidth={2} />
      </View>
      <Text style={styles.statValue}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{meta.label}</Text>
    </Animated.View>
  );
};

// ── Quick Action Chip ──────────────────────────────────────────────────────
const QAChip = ({ label, Icon, onPress, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 350, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: anim }}>
      <TouchableOpacity style={styles.qaChip} onPress={onPress} activeOpacity={0.75}>
        <Icon color={PRIMARY} size={16} strokeWidth={2} />
        <Text style={styles.qaChipText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function DashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const fade = useRef(new Animated.Value(0)).current;
  const role = user?.role || 'employee';
  const rc = ROLE_CONFIG[role] || ROLE_CONFIG.employee;
  const initial = user?.name?.[0]?.toUpperCase() || 'U';

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
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
        const [proj, tasks, meetings, notifs] = await Promise.all([
          cachedGet(`/workspaces/${ws[0]._id}/projects`).catch(() => []),
          cachedGet('/tasks').catch(() => []),
          cachedGet(`/workspaces/${ws[0]._id}/meetings`).catch(() => []),
          cachedGet('/notifications').catch(() => []),
        ]);
        const s = {
          projects: Array.isArray(proj) ? proj.length : 0,
          tasks:    Array.isArray(tasks) ? tasks.length : 0,
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Bar ──────────────────────────────── */}
        <Animated.View style={[styles.topBar, { opacity: fade }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name?.split(' ')[0] || 'User'} 👋
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              style={styles.bellBtn} 
              onPress={() => navigation.navigate('Notifications')}
            >
              <Bell color="#4B5563" size={22} strokeWidth={2} />
              {(stats?.unreadNotifs > 0) && <View style={styles.unreadDot} />}
            </TouchableOpacity>
            <View style={[styles.avatarBadge, { backgroundColor: rc.bg, borderColor: rc.color + '30' }]}>
              <Text style={[styles.avatarLetter, { color: rc.color }]}>{initial}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Role Banner ──────────────────────────── */}
        <Animated.View style={[styles.roleBanner, { opacity: fade }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.roleDot, { backgroundColor: rc.color }]} />
            <Text style={[styles.roleLabel, { color: rc.color }]}>{rc.label}</Text>
          </View>
          <Text style={styles.roleDesc}>{ROLE_DESC[role]}</Text>
        </Animated.View>

        {/* ── Stats ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Overview</Text>
        {loading || !stats ? (
          <View style={styles.statsGrid}>
            {[0, 60, 120, 180].map(d => (
              <View key={d} style={styles.statCard}>
                <Skeleton w={40} h={40} r={12} style={{ marginBottom: 12 }} />
                <Skeleton w={36} h={26} r={6} style={{ marginBottom: 6 }} />
                <Skeleton w={52} h={12} r={4} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {STAT_META.map((m, i) => (
              <StatCard key={m.key} meta={m} value={stats[m.key]} delay={i * 60} />
            ))}
          </View>
        )}

        {/* ── Quick Actions ─────────────────────────── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.qaRow}>
          <QAChip label="My Tasks"  Icon={CheckSquare}  delay={0}   onPress={() => navigation.navigate('Tasks')}    />
          <QAChip label="Projects"  Icon={FolderKanban} delay={50}  onPress={() => navigation.navigate('Projects')} />
          <QAChip label="Meetings"  Icon={CalendarDays} delay={100} onPress={() => {}}                             />
          <QAChip label="Activity"  Icon={Zap}          delay={150} onPress={() => {}}                             />
        </View>

        {/* ── Workspaces ────────────────────────────── */}
        {workspaces.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Workspace</Text>
            {workspaces.map(ws => (
              <TouchableOpacity key={ws._id} style={styles.wsRow} activeOpacity={0.8}>
                <View style={styles.wsIconBox}>
                  <FolderKanban color={PRIMARY} size={18} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wsName}>{ws.name}</Text>
                  <Text style={styles.wsMeta}>{ws.members?.length || 1} members</Text>
                </View>
                <ChevronRight color="#D1D5DB" size={18} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Activity ──────────────────────────────── */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.emptyCard}>
          <TrendingUp color="#D1D5DB" size={32} />
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyDesc}>Complete tasks to see your activity here.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 160 },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  greeting: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 2 },
  bellBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', position: 'relative'
  },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444',
    position: 'absolute', top: 10, right: 10,
    borderWidth: 2, borderColor: '#F3F4F6'
  },
  avatarBadge: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarLetter: { fontSize: 20, fontWeight: '800' },

  // Role banner
  roleBanner: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 28,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  roleLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  roleDesc: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 19 },

  // Section
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginTop: 4 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 28 },
  statCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 18,
    padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 3 },
  statLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  // Quick actions
  qaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  qaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  qaChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  // Workspace
  wsRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  wsIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  wsName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  wsMeta: { fontSize: 12, color: '#9CA3AF' },

  // Empty
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#9CA3AF', marginTop: 12, marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: '#D1D5DB', textAlign: 'center', lineHeight: 18 },
});
