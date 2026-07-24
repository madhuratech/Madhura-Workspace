import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  ActivityIndicator, TouchableOpacity, Dimensions
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users, FolderKanban, CheckSquare, CalendarDays,
  Activity, TrendingUp, ArrowRight, Bell
} from 'lucide-react-native';
import axios from 'axios';

const { width } = Dimensions.get('window');

// Role config matching web client colors
const ROLE_CONFIG = {
  super_admin: { label: 'Super Admin', bg: '#7C3AED20', border: '#7C3AED40', text: '#7C3AED' },
  hr:          { label: 'HR',          bg: '#3B82F620', border: '#3B82F640', text: '#3B82F6' },
  team_leader: { label: 'Team Leader', bg: '#F59E0B20', border: '#F59E0B40', text: '#D97706' },
  employee:    { label: 'Employee',    bg: '#10B98120', border: '#10B98140', text: '#059669' },
};

// Role description matching web client
const ROLE_DESC = {
  super_admin: 'Manage your organization, teams, and workspaces.',
  hr:          'Overview of all projects, meetings, and team activities.',
  team_leader: 'Assign tasks, track progress, and lead your team.',
  employee:    "Here's what's assigned to you today.",
};

const StatCard = ({ title, value, icon: Icon, iconBg, iconColor, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 5, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.statCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>
        <Icon color={iconColor} size={22} strokeWidth={2} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Animated.View>
  );
};

const QuickAction = ({ label, icon: Icon, color, bg, onPress, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity style={styles.qaBtn} onPress={onPress}>
        <View style={[styles.qaIcon, { backgroundColor: bg }]}>
          <Icon color={color} size={20} strokeWidth={2} />
        </View>
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
  const headerSlide = useRef(new Animated.Value(-10)).current;

  const role = user?.role || 'employee';
  const roleConf = ROLE_CONFIG[role] || ROLE_CONFIG.employee;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, speed: 10, bounciness: 4, useNativeDriver: true }),
    ]).start();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      setWorkspaces(wsRes.data);
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        const [projectsRes, tasksRes, meetingsRes] = await Promise.all([
          axios.get(`/workspaces/${ws._id}/projects`).catch(() => ({ data: [] })),
          axios.get('/tasks').catch(() => ({ data: [] })),
          axios.get(`/workspaces/${ws._id}/meetings`).catch(() => ({ data: [] })),
        ]);
        setStats({
          projects: projectsRes.data.length || 0,
          tasks: tasksRes.data.length || 0,
          members: ws.members?.length || 1,
          meetings: meetingsRes.data.length || 0,
        });
      }
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────── */}
        <Animated.View
          style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              Welcome back, {user?.name?.split(' ')[0] || 'User'}!
            </Text>
            <View style={styles.roleRow}>
              <View style={[styles.roleBadge, { backgroundColor: roleConf.bg, borderColor: roleConf.border }]}>
                <Text style={[styles.roleText, { color: roleConf.text }]}>{roleConf.label}</Text>
              </View>
            </View>
            <Text style={styles.roleDesc}>{ROLE_DESC[role]}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Bell color="#64748B" size={22} strokeWidth={1.8} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Stats Cards ────────────────────────── */}
        <Text style={styles.sectionLabel}>OVERVIEW</Text>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard title="Projects"   value={stats.projects} icon={FolderKanban}  iconBg="#EFF6FF" iconColor="#3B82F6" delay={0}   />
            <StatCard title="Tasks"      value={stats.tasks}    icon={CheckSquare}   iconBg="#F0FDF4" iconColor="#10B981" delay={60}  />
            <StatCard title="Members"    value={stats.members}  icon={Users}         iconBg="#F5F3FF" iconColor="#8B5CF6" delay={120} />
            <StatCard title="Meetings"   value={stats.meetings} icon={CalendarDays}  iconBg="#FFF7ED" iconColor="#F97316" delay={180} />
          </View>
        )}

        {/* ── Quick Actions ──────────────────────── */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.qaRow}>
          <QuickAction label="My Tasks"   icon={CheckSquare}  color="#3B82F6" bg="#EFF6FF" delay={0}   onPress={() => navigation.navigate('Tasks')} />
          <QuickAction label="Projects"   icon={FolderKanban} color="#8B5CF6" bg="#F5F3FF" delay={50}  onPress={() => navigation.navigate('Projects')} />
          <QuickAction label="Meetings"   icon={CalendarDays} color="#F97316" bg="#FFF7ED" delay={100} onPress={() => {}} />
          <QuickAction label="Chat"       icon={Activity}     color="#10B981" bg="#F0FDF4" delay={150} onPress={() => navigation.navigate('Chat')} />
        </ScrollView>

        {/* ── Workspaces ────────────────────────── */}
        {workspaces.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>WORKSPACES</Text>
            {workspaces.map((ws, i) => (
              <Animated.View key={ws._id} style={[styles.wsCard, { opacity: headerFade }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wsName}>{ws.name}</Text>
                  <Text style={styles.wsMeta}>{ws.members?.length || 1} member{(ws.members?.length || 1) !== 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.wsChevron}>
                  <ArrowRight color="#3B82F6" size={18} />
                </View>
              </Animated.View>
            ))}
          </>
        )}

        {/* ── Recent Activity ──────────────────── */}
        <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
        <Animated.View style={[styles.emptyCard, { opacity: headerFade }]}>
          <TrendingUp color="#CBD5E1" size={36} />
          <Text style={styles.emptyText}>No recent activity.</Text>
          <Text style={styles.emptySubText}>Complete tasks and attend meetings to see activity here.</Text>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 160 },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24, marginTop: 8 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  roleBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, alignSelf: 'flex-start',
  },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  roleDesc: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  bellBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.2,
    marginBottom: 12, marginTop: 4, textTransform: 'uppercase',
  },

  // Stats
  loadingBox: { height: 160, justifyContent: 'center', alignItems: 'center' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', marginBottom: 24,
  },
  statCard: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  statIconWrap: {
    width: 44, height: 44, borderRadius: 14, justifyContent: 'center',
    alignItems: 'center', marginBottom: 14,
  },
  statValue: { fontSize: 30, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  statTitle: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  // Quick Actions
  qaRow: { marginBottom: 24 },
  qaBtn: { alignItems: 'center', marginRight: 16, width: 72 },
  qaIcon: {
    width: 56, height: 56, borderRadius: 18, justifyContent: 'center',
    alignItems: 'center', marginBottom: 8,
  },
  qaLabel: { fontSize: 12, color: '#334155', fontWeight: '600', textAlign: 'center' },

  // Workspace cards
  wsCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 18, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  wsName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  wsMeta: { fontSize: 13, color: '#64748B' },
  wsChevron: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },

  // Empty / activity card
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 16,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#94A3B8', marginTop: 14, marginBottom: 4 },
  emptySubText: { fontSize: 12, color: '#CBD5E1', textAlign: 'center', lineHeight: 18 },
});
