import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  ActivityIndicator, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, TrendingUp, Users, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import { cachedGet } from '../utils/api';

const PRIMARY = '#5B5BD6';

export default function AnalyticsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const wsRes = await cachedGet('/workspaces');
      if (wsRes && wsRes.length > 0) {
        const workspaceId = wsRes[0]._id;
        const res = await cachedGet(`/workspaces/${workspaceId}/analytics`);
        setAnalyticsData(res);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProductivityColor = (score) => {
    if (score >= 90) return '#10B981'; // Emerald
    if (score >= 75) return '#3B82F6'; // Blue
    if (score >= 60) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft color="#111827" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!analyticsData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft color="#111827" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <View style={styles.center}>
          <BarChart3 color="#D1D5DB" size={48} />
          <Text style={styles.emptyTitle}>No Analytics Available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { summary, employeePerformance } = analyticsData;
  const filteredEmployees = (employeePerformance || []).filter(emp => emp.role !== 'super_admin');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#111827" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics & Reports</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fade }}>
          
          <Text style={styles.sectionTitle}>OVERVIEW</Text>
          
          {/* KPI Cards Grid */}
          <View style={styles.grid}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Task Completion</Text>
                <CheckCircle2 color="#10B981" size={18} />
              </View>
              <Text style={styles.cardValue}>{summary.completionRate}%</Text>
              <Text style={styles.cardSub}>Of {summary.totalTasks} total tasks</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Attendance</Text>
                <TrendingUp color="#3B82F6" size={18} />
              </View>
              <Text style={styles.cardValue}>{summary.overallAttendanceRate}%</Text>
              <Text style={styles.cardSub}>Avg presence rate</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Overdue</Text>
                <AlertCircle color="#EF4444" size={18} />
              </View>
              <Text style={[styles.cardValue, { color: '#EF4444' }]}>{summary.overdueTasks}</Text>
              <Text style={styles.cardSub}>Delayed tasks</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Team Size</Text>
                <Users color="#8B5CF6" size={18} />
              </View>
              <Text style={styles.cardValue}>{summary.totalMembers}</Text>
              <Text style={styles.cardSub}>Active members</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>EMPLOYEE PERFORMANCE</Text>

          {filteredEmployees.map((emp) => {
            const color = getProductivityColor(emp.productivityScore);
            return (
              <View key={emp._id} style={styles.empCard}>
                <View style={styles.empHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(emp.name)}</Text>
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName}>{emp.name}</Text>
                    <Text style={styles.empRole}>{emp.role?.replace('_', ' ') || 'Employee'}</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={[styles.scoreValue, { color }]}>{emp.productivityScore}</Text>
                    <Text style={styles.scoreLabel}>Score</Text>
                  </View>
                </View>

                <View style={styles.empStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{emp.tasks.completed}/{emp.tasks.assigned}</Text>
                    <Text style={styles.statLabel}>Tasks Done</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{emp.attendance.rate}%</Text>
                    <Text style={styles.statLabel}>Attendance</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, emp.tasks.overdue > 0 && { color: '#EF4444' }]}>
                      {emp.tasks.overdue}
                    </Text>
                    <Text style={styles.statLabel}>Overdue</Text>
                  </View>
                </View>
              </View>
            );
          })}

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: '#F9FAFB',
    borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { marginTop: 12, fontSize: 16, color: '#6B7280', fontWeight: '600' },
  
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.8, marginBottom: 12, marginTop: 8
  },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  cardValue: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 2 },
  cardSub: { fontSize: 11, color: '#6B7280' },

  empCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  empHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  avatarText: { color: PRIMARY, fontSize: 16, fontWeight: '800' },
  empInfo: { flex: 1 },
  empName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  empRole: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  scoreBox: { alignItems: 'flex-end' },
  scoreValue: { fontSize: 22, fontWeight: '900' },
  scoreLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase' },
  
  empStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' }
});
