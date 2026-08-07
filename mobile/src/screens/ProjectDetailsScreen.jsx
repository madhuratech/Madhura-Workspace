import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Clock, Circle, Calendar, Users, BarChart2 } from 'lucide-react-native';
import axios from 'axios';

const FILTERS = ['All', 'To Do', 'In Progress', 'Done'];

const STATUS_CONFIG = {
  'To Do':       { icon: Circle,        color: '#94A3B8' },
  'In Progress': { icon: Clock,         color: '#1b2b4c' },
  'Done':        { icon: CheckCircle2,  color: '#10B981' },
};

const PRIORITY_CONFIG = {
  High:   { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  Medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' },
  Low:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' },
};

export default function ProjectDetailsScreen({ route, navigation }) {
  const { projectId } = route.params;
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [workspaceId, setWorkspaceId] = useState(null);

  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    initData();
  }, []);

  const initData = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const wsId = wsRes.data[0]._id;
        setWorkspaceId(wsId);
        await fetchData(wsId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchData = async (wsId) => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        axios.get(`/workspaces/${wsId}/projects/${projectId}`),
        axios.get(`/workspaces/${wsId}/projects/${projectId}/tasks`),
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTaskStatus = async (task) => {
    const cycle = { 'To Do': 'In Progress', 'In Progress': 'Done', 'Done': 'To Do' };
    const newStatus = cycle[task.status] || 'To Do';
    setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: newStatus } : t));
    try {
      await axios.put(`/tasks/${task._id}`, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task', err);
      if (workspaceId) fetchData(workspaceId);
    }
  };

  // Computed stats
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'Done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const progress = totalTasks > 0 ? doneTasks / totalTasks : 0;

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

  const renderTask = ({ item, index }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['To Do'];
    const StatusIcon = statusCfg.icon;
    const priorityCfg = PRIORITY_CONFIG[item.priority];
    const isDone = item.status === 'Done';

    return (
      <View style={[styles.taskCard, isDone && styles.taskCardDone]}>
        <TouchableOpacity onPress={() => toggleTaskStatus(item)} style={styles.statusBtn}>
          <StatusIcon color={statusCfg.color} size={24} />
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.taskBadges}>
            {priorityCfg && (
              <View style={[styles.badge, { backgroundColor: priorityCfg.bg, borderColor: priorityCfg.border }]}>
                <Text style={[styles.badgeText, { color: priorityCfg.text }]}>{item.priority}</Text>
              </View>
            )}
            {item.dueDate && (
              <View style={styles.dateRow}>
                <Calendar color="#94A3B8" size={12} />
                <Text style={styles.dateText}>
                  {new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
            {item.assignees && item.assignees.length > 0 && (
              <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
                {item.assignees.map((a, i) => {
                  const initial = a.name ? a.name.charAt(0).toUpperCase() : '?';
                  return (
                    <View key={a._id || i} style={[styles.assigneeAvatar, { marginLeft: i > 0 ? -8 : 0 }]}>
                      <Text style={styles.assigneeAvatarText}>{initial}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────── */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1b2b4c" size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {project?.name || 'Loading…'}
          </Text>
          <Text style={styles.headerSub}>{totalTasks} tasks</Text>
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1b2b4c" />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item._id}
          renderItem={renderTask}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); initData(); }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Stats row */}
              <Animated.View style={[styles.statsRow, { opacity: headerFade }]}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{totalTasks}</Text>
                  <Text style={styles.statLbl}>Total</Text>
                </View>
                <View style={[styles.statBox, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}>
                  <Text style={[styles.statVal, { color: '#2563EB' }]}>{inProgressTasks}</Text>
                  <Text style={[styles.statLbl, { color: '#2563EB' }]}>In Progress</Text>
                </View>
                <View style={[styles.statBox, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.statVal, { color: '#16A34A' }]}>{doneTasks}</Text>
                  <Text style={[styles.statLbl, { color: '#16A34A' }]}>Done</Text>
                </View>
              </Animated.View>

              {/* Progress bar */}
              {totalTasks > 0 && (
                <Animated.View style={[styles.progressCard, { opacity: headerFade }]}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Overall Progress</Text>
                    <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[
                      styles.progressFill,
                      { width: `${Math.round(progress * 100)}%` },
                    ]} />
                  </View>
                </Animated.View>
              )}

              {/* Filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {FILTERS.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterChip, filter === f && styles.filterChipActive]}
                    onPress={() => setFilter(f)}
                  >
                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {filteredTasks.length === 0 && (
                <View style={styles.emptyBox}>
                  <CheckCircle2 color="#CBD5E1" size={44} />
                  <Text style={styles.emptyTitle}>No {filter === 'All' ? '' : `"${filter}" `}tasks</Text>
                </View>
              )}
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1b2b4c' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 120 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9',
  },
  statVal: { fontSize: 22, fontWeight: '700', color: '#1b2b4c' },
  statLbl: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 },

  // Progress card
  progressCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  progressPct: { fontSize: 13, fontWeight: '700', color: '#1b2b4c' },
  progressTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#1b2b4c', borderRadius: 4 },

  // Filter
  filterRow: { marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  filterTextActive: { color: '#2563EB', fontWeight: '700' },

  // Task cards
  taskCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'flex-start',
    shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  taskCardDone: { backgroundColor: '#F8FAFC', shadowOpacity: 0, elevation: 0 },
  statusBtn: { marginRight: 12, marginTop: 2 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#1b2b4c', lineHeight: 21, marginBottom: 4 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#94A3B8' },
  taskDesc: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 8 },
  taskBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: '#94A3B8' },
  assigneeAvatar: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#1b2b4c',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff'
  },
  assigneeAvatarText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginTop: 12 },
});
