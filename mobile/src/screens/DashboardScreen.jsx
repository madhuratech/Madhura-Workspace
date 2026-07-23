import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, FolderKanban, Clock, CalendarDays, Activity } from 'lucide-react-native';
import axios from 'axios';

const StatCard = ({ title, value, icon: Icon, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 12, bounciness: 4, delay, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.iconContainer}>
        <Icon color="#2563EB" size={20} />
      </View>
      <View>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
    </Animated.View>
  );
};

export default function DashboardScreen() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ projects: 0, tasks: 0, members: 0, meetings: 0 });
  const [loading, setLoading] = useState(true);

  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        const [projectsRes, tasksRes, meetingsRes] = await Promise.all([
          axios.get(`/workspaces/${ws._id}/projects`).catch(() => ({ data: [] })),
          axios.get('/tasks').catch(() => ({ data: [] })),
          axios.get('/meetings').catch(() => ({ data: [] }))
        ]);
        
        setStats({
          projects: projectsRes.data.length || 0,
          tasks: tasksRes.data.length || 0,
          members: ws.members?.length || 1,
          meetings: meetingsRes.data.length || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <View style={styles.roleBadge}>
             <Text style={styles.roleText}>{user?.role?.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </Animated.View>

        <Animated.Text style={[styles.sectionTitle, { opacity: headerFade }]}>Overview</Animated.Text>
        
        {loading ? (
          <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#111827" />
          </View>
        ) : (
          <View style={styles.grid}>
            <StatCard title="Projects" value={stats.projects} icon={FolderKanban} delay={0} />
            <StatCard title="Tasks" value={stats.tasks} icon={Clock} delay={50} />
            <StatCard title="Members" value={stats.members} icon={Users} delay={100} />
            <StatCard title="Meetings" value={stats.meetings} icon={CalendarDays} delay={150} />
          </View>
        )}

        <Animated.View style={[styles.recentActivity, { opacity: headerFade }]}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Activity color="#9CA3AF" size={32} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No recent activity.</Text>
          </View>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { padding: 24, paddingBottom: 140 },
  header: { marginBottom: 32 },
  greeting: { fontSize: 13, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: '600' },
  name: { fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 12, letterSpacing: -1 },
  roleBadge: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E5E7EB'
  },
  roleText: { color: '#374151', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 16, marginTop: 8
  },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 32 },
  card: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'column', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1
  },
  iconContainer: {
    height: 40, width: 40, borderRadius: 10, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#BFDBFE'
  },
  cardValue: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 2, letterSpacing: -0.5 },
  cardTitle: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  
  recentActivity: { flex: 1 },
  activityCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', minHeight: 160
  },
  emptyText: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' }
});
