import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle2, Clock, CalendarDays, Circle,
  LayoutList, Columns, Flag, FolderKanban,
} from 'lucide-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

// ── Helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  High:   { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  Medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' },
  Low:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' },
};

const STATUS_CONFIG = {
  'To Do':       { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', bar: '#94A3B8' },
  'In Progress': { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', bar: '#3B82F6' },
  'Done':        { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', bar: '#10B981' },
};

const FILTERS = ['All', 'To Do', 'In Progress', 'Done'];

const COLUMNS = ['To Do', 'In Progress', 'Done'];

// ── Task Card (List View) ─────────────────────────────────────────────────────
const TaskCard = ({ task, onToggleStatus, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 4, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Low;
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['To Do'];
  const isDone = task.status === 'Done';

  const nextStatus = () => {
    const cycle = { 'To Do': 'In Progress', 'In Progress': 'Done', 'Done': 'To Do' };
    onToggleStatus(task._id, cycle[task.status] || 'To Do');
  };

  return (
    <Animated.View
      style={[
        styles.taskCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        { borderLeftColor: statusCfg.bar },
      ]}
    >
      {/* Checkbox + Title row */}
      <View style={styles.taskRow}>
        <TouchableOpacity onPress={nextStatus} style={styles.checkBtn}>
          {isDone ? (
            <CheckCircle2 color="#10B981" size={22} />
          ) : task.status === 'In Progress' ? (
            <Clock color="#3B82F6" size={22} />
          ) : (
            <Circle color="#CBD5E1" size={22} />
          )}
        </TouchableOpacity>
        <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
      </View>

      {/* Project link */}
      {task.project?.title && (
        <View style={styles.projectLabelRow}>
          <FolderKanban color="#94A3B8" size={11} style={{ marginRight: 4 }} />
          <Text style={styles.projectLabel} numberOfLines={1}>
            {task.project.title}
          </Text>
        </View>
      )}

      {/* Badges row */}
      <View style={styles.badgesRow}>
        {task.priority && (
          <View style={[styles.badge, { backgroundColor: priorityCfg.bg, borderColor: priorityCfg.border }]}>
            <Flag color={priorityCfg.text} size={10} />
            <Text style={[styles.badgeText, { color: priorityCfg.text }]}>{task.priority}</Text>
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
          <Text style={[styles.badgeText, { color: statusCfg.text }]}>{task.status}</Text>
        </View>
        {task.dueDate && (
          <View style={styles.badge}>
            <CalendarDays color="#94A3B8" size={10} />
            <Text style={[styles.badgeText, { color: '#64748B' }]}>
              {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ── Board Column Card ─────────────────────────────────────────────────────────
const BoardCard = ({ task, onToggleStatus }) => {
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Low;
  const isDone = task.status === 'Done';

  const nextStatus = () => {
    const cycle = { 'To Do': 'In Progress', 'In Progress': 'Done', 'Done': 'To Do' };
    onToggleStatus(task._id, cycle[task.status] || 'To Do');
  };

  return (
    <View style={styles.boardCard}>
      <View style={[styles.boardPriorityBar, { backgroundColor: priorityCfg.text }]} />
      <View style={styles.boardCardInner}>
        <Text style={[styles.boardTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.project?.title && (
          <Text style={styles.boardProject} numberOfLines={1}>{task.project.title}</Text>
        )}
        <View style={styles.boardMeta}>
          {task.dueDate && (
            <Text style={styles.boardDate}>
              {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Text>
          )}
          <TouchableOpacity onPress={nextStatus} style={styles.boardToggle}>
            {isDone ? (
              <CheckCircle2 color="#10B981" size={18} />
            ) : task.status === 'In Progress' ? (
              <Clock color="#3B82F6" size={18} />
            ) : (
              <Circle color="#CBD5E1" size={18} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MyTasksScreen() {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'board'
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
      const res = await axios.get(`/workspaces/${wsId}/my-tasks`);
      setTasks(res.data);
    } catch (err) {
      // Fallback: filter by user from /tasks
      try {
        const res = await axios.get('/tasks');
        const myTasks = res.data.filter(
          t => t.assignedTo && t.assignedTo._id === user._id
        );
        setTasks(myTasks);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleToggleStatus = async (taskId, newStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      await axios.put(`/tasks/${taskId}`, { status: newStatus });
    } catch (e) {
      console.error('Failed to update task status', e);
      if (workspaceId) fetchTasks(workspaceId);
    }
  };

  const filteredTasks = filter === 'All'
    ? tasks
    : tasks.filter(t => t.status === filter);

  const boardColumns = COLUMNS.reduce((acc, col) => {
    acc[col] = tasks.filter(t => t.status === col);
    return acc;
  }, {});

  const columnColors = {
    'To Do':       { header: '#64748B', dot: '#94A3B8', bg: '#F8FAFC' },
    'In Progress': { header: '#2563EB', dot: '#3B82F6', bg: '#EFF6FF' },
    'Done':        { header: '#16A34A', dot: '#10B981', bg: '#F0FDF4' },
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────── */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <View>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <Text style={styles.headerSub}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you
          </Text>
        </View>
        {/* View Toggle */}
        <View style={styles.toggleWrap}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <LayoutList color={viewMode === 'list' ? '#3B82F6' : '#94A3B8'} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'board' && styles.toggleBtnActive]}
            onPress={() => setViewMode('board')}
          >
            <Columns color={viewMode === 'board' ? '#3B82F6' : '#94A3B8'} size={18} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Filter Bar (List view only) ─────────────── */}
      {viewMode === 'list' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
              {filter === f && f !== 'All' && (
                <View style={styles.filterCount}>
                  <Text style={styles.filterCountText}>
                    {f === 'All' ? tasks.length : tasks.filter(t => t.status === f).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Content ────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : viewMode === 'list' ? (
        /* ─ List View ─ */
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item._id}
          renderItem={({ item, index }) => (
            <TaskCard
              task={item}
              delay={index * 40}
              onToggleStatus={handleToggleStatus}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <CheckCircle2 color="#CBD5E1" size={52} />
              <Text style={styles.emptyTitle}>
                {filter === 'All' ? 'No tasks assigned!' : `No "${filter}" tasks`}
              </Text>
              <Text style={styles.emptySub}>
                {filter === 'All'
                  ? "You're all caught up!"
                  : 'Try a different filter above.'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        /* ─ Board View ─ */
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.boardRow}>
            {COLUMNS.map(col => {
              const colConf = columnColors[col];
              const items = boardColumns[col] || [];
              return (
                <View key={col} style={styles.boardCol}>
                  <View style={styles.boardColHeader}>
                    <View style={[styles.boardDot, { backgroundColor: colConf.dot }]} />
                    <Text style={[styles.boardColTitle, { color: colConf.header }]}>
                      {col.toUpperCase()}
                    </Text>
                    <View style={styles.boardCountBadge}>
                      <Text style={styles.boardCountText}>{items.length}</Text>
                    </View>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {items.length === 0 ? (
                      <View style={[styles.boardEmpty, { backgroundColor: colConf.bg }]}>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  toggleWrap: {
    flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12,
    padding: 4, borderWidth: 1, borderColor: '#E2E8F0',
  },
  toggleBtn: { padding: 8, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },

  // Filter
  filterRow: { backgroundColor: '#fff', maxHeight: 52, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  filterTextActive: { color: '#2563EB', fontWeight: '700' },
  filterCount: {
    marginLeft: 6, backgroundColor: '#3B82F6', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  filterCountText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  // List content
  listContent: { padding: 16, paddingBottom: 160 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Task Card
  taskCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F5F9', borderLeftWidth: 4,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  checkBtn: { marginRight: 12, marginTop: 1 },
  taskTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', lineHeight: 21 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#94A3B8' },
  projectLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginLeft: 34 },
  projectLabel: { fontSize: 12, color: '#64748B', flex: 1 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 34 },
  badge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', gap: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#64748B' },

  // Empty state
  emptyBox: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 16, marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },

  // Board
  boardRow: { flexDirection: 'row', padding: 16, paddingBottom: 160, gap: 12 },
  boardCol: {
    width: 280, backgroundColor: '#fff', borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  boardColHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
  },
  boardDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  boardColTitle: { flex: 1, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  boardCountBadge: {
    backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  boardCountText: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  boardEmpty: {
    borderRadius: 12, padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: 80,
  },
  boardEmptyText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  boardCard: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, flexDirection: 'row',
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  boardPriorityBar: { width: 4, backgroundColor: '#CBD5E1' },
  boardCardInner: { flex: 1, padding: 12 },
  boardTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', lineHeight: 20, marginBottom: 4 },
  boardProject: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  boardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boardDate: { fontSize: 11, color: '#94A3B8' },
  boardToggle: { padding: 2 },
});
