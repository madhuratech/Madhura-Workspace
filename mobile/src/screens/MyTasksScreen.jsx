import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle2, Clock, CalendarDays, Circle,
  LayoutList, Columns, Flag, FolderKanban, CheckSquare,
} from 'lucide-react-native';
import { cachedGet, invalidateCache } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const { width } = Dimensions.get('window');

// ── Config ─────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  High:   { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', dot: '#EF4444' },
  Medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', dot: '#F59E0B' },
  Low:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', dot: '#22C55E' },
};

const STATUS_CONFIG = {
  'To Do':       { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', bar: '#94A3B8', grad: ['#94A3B8','#64748B'] },
  'In Progress': { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', bar: '#3B82F6', grad: ['#3B82F6','#6366F1'] },
  'Done':        { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', bar: '#10B981', grad: ['#10B981','#059669'] },
};

const FILTERS = ['All', 'To Do', 'In Progress', 'Done'];
const COLUMNS = ['To Do', 'In Progress', 'Done'];

const COLUMN_GRAD = {
  'To Do':       { grad: ['#F8FAFC','#F1F5F9'], dot: '#94A3B8', text: '#64748B' },
  'In Progress': { grad: ['#EFF6FF','#DBEAFE'], dot: '#3B82F6', text: '#2563EB' },
  'Done':        { grad: ['#F0FDF4','#DCFCE7'], dot: '#10B981', text: '#16A34A' },
};

// ── Task Card (List View) ──────────────────────────────────────────────────
const TaskCard = ({ task, onToggleStatus, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 16, bounciness: 4, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Low;
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['To Do'];
  const isDone = task.status === 'Done';
  const isProgress = task.status === 'In Progress';

  const nextStatus = () => {
    const cycle = { 'To Do': 'In Progress', 'In Progress': 'Done', 'Done': 'To Do' };
    onToggleStatus(task._id, cycle[task.status] || 'To Do');
  };

  return (
    <Animated.View style={[styles.taskCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Gradient left accent */}
      <LinearGradient
        colors={statusCfg.grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.taskAccent}
      />

      <View style={styles.taskInner}>
        {/* Checkbox + Title */}
        <View style={styles.taskRow}>
          <TouchableOpacity onPress={nextStatus} style={styles.checkBtn}>
            {isDone ? (
              <CheckCircle2 color="#10B981" size={24} />
            ) : isProgress ? (
              <Clock color="#3B82F6" size={24} />
            ) : (
              <Circle color="#CBD5E1" size={24} />
            )}
          </TouchableOpacity>
          <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
            {task.title}
          </Text>
        </View>

        {/* Project label */}
        {task.project?.title && (
          <View style={styles.projectLabelRow}>
            <FolderKanban color="#94A3B8" size={11} style={{ marginRight: 4 }} />
            <Text style={styles.projectLabel} numberOfLines={1}>{task.project.title}</Text>
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgesRow}>
          {task.priority && (
            <View style={[styles.badge, { backgroundColor: priorityCfg.bg, borderColor: priorityCfg.border }]}>
              <View style={[styles.priorityDot, { backgroundColor: priorityCfg.dot }]} />
              <Text style={[styles.badgeText, { color: priorityCfg.text }]}>{task.priority}</Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
            <Text style={[styles.badgeText, { color: statusCfg.text }]}>{task.status}</Text>
          </View>
          {task.dueDate && (
            <View style={styles.badge}>
              <CalendarDays color="#94A3B8" size={10} style={{ marginRight: 3 }} />
              <Text style={[styles.badgeText, { color: '#64748B' }]}>
                {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

// ── Board Card ─────────────────────────────────────────────────────────────
const BoardCard = ({ task, onToggleStatus }) => {
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Low;
  const isDone = task.status === 'Done';
  const nextStatus = () => {
    const cycle = { 'To Do': 'In Progress', 'In Progress': 'Done', 'Done': 'To Do' };
    onToggleStatus(task._id, cycle[task.status] || 'To Do');
  };
  return (
    <View style={styles.boardCard}>
      <View style={[styles.boardPriorityBar, { backgroundColor: priorityCfg.dot }]} />
      <View style={styles.boardCardInner}>
        <Text style={[styles.boardTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>{task.title}</Text>
        {task.project?.title && <Text style={styles.boardProject} numberOfLines={1}>{task.project.title}</Text>}
        <View style={styles.boardMeta}>
          {task.dueDate ? (
            <View style={styles.boardDateRow}>
              <CalendarDays color="#94A3B8" size={10} style={{ marginRight: 3 }} />
              <Text style={styles.boardDate}>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
            </View>
          ) : <View />}
          <TouchableOpacity onPress={nextStatus} style={styles.boardToggle}>
            {isDone ? <CheckCircle2 color="#10B981" size={18} /> : task.status === 'In Progress' ? <Clock color="#3B82F6" size={18} /> : <Circle color="#CBD5E1" size={18} />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────
export default function MyTasksScreen() {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [filter, setFilter] = useState('All');
  const [workspaceId, setWorkspaceId] = useState(null);
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    initData();
  }, []);

  const initData = async () => {
    try {
      const wsData = await cachedGet('/workspaces');
      if (wsData.length > 0) {
        const wsId = wsData[0]._id;
        setWorkspaceId(wsId);
        await fetchTasks(wsId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (wsId) => {
    try {
      const data = await cachedGet(`/workspaces/${wsId}/my-tasks`);
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      try {
        const data = await cachedGet('/tasks');
        const myTasks = (Array.isArray(data) ? data : []).filter(
          t => t.assignedTo && t.assignedTo._id === user._id
        );
        setTasks(myTasks);
      } catch (e) { console.error(e); }
    }
  };

  const handleToggleStatus = async (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      await axios.put(`/tasks/${taskId}`, { status: newStatus });
      if (workspaceId) invalidateCache(`/workspaces/${workspaceId}/my-tasks`);
    } catch (e) {
      console.error('Failed to update task status', e);
      if (workspaceId) fetchTasks(workspaceId);
    }
  };

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);
  const boardColumns = COLUMNS.reduce((acc, col) => { acc[col] = tasks.filter(t => t.status === col); return acc; }, {});

  const doneTasks = tasks.filter(t => t.status === 'Done').length;
  const progressPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Premium Gradient Header ─────────────────── */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.headerGradient}>
        <Animated.View style={{ opacity: headerFade }}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>My Tasks</Text>
              <Text style={styles.headerSub}>{tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned</Text>
            </View>
            {/* View Toggle */}
            <View style={styles.toggleWrap}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                onPress={() => setViewMode('list')}
              >
                <LayoutList color={viewMode === 'list' ? '#818CF8' : '#475569'} size={18} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'board' && styles.toggleBtnActive]}
                onPress={() => setViewMode('board')}
              >
                <Columns color={viewMode === 'board' ? '#818CF8' : '#475569'} size={18} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress bar */}
          {tasks.length > 0 && (
            <View style={styles.progressWrap}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>{doneTasks} of {tasks.length} done</Text>
                <Text style={styles.progressPct}>{progressPct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={['#10B981', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${progressPct}%` }]}
                />
              </View>
            </View>
          )}
        </Animated.View>
      </LinearGradient>

      {/* ── Filter Bar (list view only) ─────────────── */}
      {viewMode === 'list' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map(f => {
            const count = f === 'All' ? tasks.length : tasks.filter(t => t.status === f).length;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                <View style={[styles.filterCountBadge, filter === f ? styles.filterCountBadgeActive : null]}>
                  <Text style={[styles.filterCountText, filter === f && styles.filterCountTextActive]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Content ─────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item._id}
          renderItem={({ item, index }) => (
            <TaskCard task={item} delay={index * 40} onToggleStatus={handleToggleStatus} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <LinearGradient colors={['#F1F5F9','#E2E8F0']} style={styles.emptyIconWrap}>
                <CheckSquare color="#94A3B8" size={36} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>
                {filter === 'All' ? 'No tasks assigned!' : `No "${filter}" tasks`}
              </Text>
              <Text style={styles.emptySub}>
                {filter === 'All' ? "You're all caught up! 🎉" : 'Try a different filter above.'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.boardRow}>
            {COLUMNS.map(col => {
              const colConf = COLUMN_GRAD[col];
              const items = boardColumns[col] || [];
              return (
                <View key={col} style={styles.boardCol}>
                  <LinearGradient colors={colConf.grad} style={styles.boardColHeader}>
                    <View style={[styles.boardDot, { backgroundColor: colConf.dot }]} />
                    <Text style={[styles.boardColTitle, { color: colConf.text }]}>{col.toUpperCase()}</Text>
                    <View style={[styles.boardCountBadge, { borderColor: colConf.dot + '40' }]}>
                      <Text style={[styles.boardCountText, { color: colConf.text }]}>{items.length}</Text>
                    </View>
                  </LinearGradient>
                  <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {items.length === 0 ? (
                      <View style={styles.boardEmpty}>
                        <Text style={styles.boardEmptyText}>No tasks here</Text>
                      </View>
                    ) : (
                      items.map(task => (
                        <BoardCard key={task._id} task={task} onToggleStatus={handleToggleStatus} />
                      ))
                    )}
                  </ScrollView>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  headerGradient: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#F8FAFC' },
  headerSub: { fontSize: 13, color: 'rgba(248,250,252,0.55)', marginTop: 2 },
  toggleWrap: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  toggleBtn: { padding: 8, borderRadius: 10 },
  toggleBtnActive: { backgroundColor: 'rgba(129,140,248,0.2)' },

  // Progress
  progressWrap: { marginTop: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, color: 'rgba(248,250,252,0.6)', fontWeight: '500' },
  progressPct: { fontSize: 12, color: '#818CF8', fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  // Filter
  filterRow: { backgroundColor: '#fff', maxHeight: 56, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', gap: 6,
  },
  filterChipActive: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: '#4F46E5', fontWeight: '700' },
  filterCountBadge: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  filterCountBadgeActive: { backgroundColor: '#6366F1' },
  filterCountText: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },
  filterCountTextActive: { color: '#fff' },

  // List
  listContent: { padding: 16, paddingBottom: 160 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  // Task Card
  taskCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  taskAccent: { width: 5 },
  taskInner: { flex: 1, padding: 16 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  checkBtn: { marginRight: 12, marginTop: 1 },
  taskTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0F172A', lineHeight: 22 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#94A3B8' },
  projectLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginLeft: 36 },
  projectLabel: { fontSize: 12, color: '#64748B', flex: 1 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 36 },
  badge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', gap: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },

  // Empty
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },

  // Board
  boardRow: { flexDirection: 'row', padding: 16, paddingBottom: 160, gap: 12 },
  boardCol: {
    width: 282, backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  boardColHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 0 },
  boardDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  boardColTitle: { flex: 1, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  boardCountBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'transparent' },
  boardCountText: { fontSize: 11, fontWeight: '700' },
  boardEmpty: { padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  boardEmptyText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  boardCard: {
    backgroundColor: '#fff', marginHorizontal: 10, marginBottom: 10, borderRadius: 14,
    flexDirection: 'row', borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  boardPriorityBar: { width: 4 },
  boardCardInner: { flex: 1, padding: 12 },
  boardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', lineHeight: 20, marginBottom: 4 },
  boardProject: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  boardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boardDateRow: { flexDirection: 'row', alignItems: 'center' },
  boardDate: { fontSize: 11, color: '#94A3B8' },
  boardToggle: { padding: 2 },
});
