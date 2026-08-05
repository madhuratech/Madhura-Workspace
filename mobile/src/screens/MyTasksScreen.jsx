import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle2, Clock, Circle,
  CalendarDays, Flag, FolderKanban,
  LayoutList, Columns, CheckSquare,
} from 'lucide-react-native';
import { cachedGet, invalidateCache } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const PRIMARY = '#4F46E5';

const PRIORITY = {
  High:   { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  Medium: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  Low:    { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
};
const STATUS = {
  'To Do':       { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', accent: '#D1D5DB' },
  'In Progress': { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', accent: PRIMARY },
  'Done':        { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', accent: '#10B981' },
};
const FILTERS = ['All', 'To Do', 'In Progress', 'Done'];
const COLUMNS = ['To Do', 'In Progress', 'Done'];

// ── Skeleton ─────────────────────────────────────────────────────────────
const Skel = ({ w, h, r = 6, mb = 0 }) => {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(a, { toValue: 0, duration: 800, useNativeDriver: false }),
    ])).start();
  }, []);
  const bg = a.interpolate({ inputRange: [0, 1], outputRange: ['#F3F4F6', '#E5E7EB'] });
  return <Animated.View style={{ width: w, height: h, borderRadius: r, backgroundColor: bg, marginBottom: mb }} />;
};

const SkeletonCard = () => (
  <View style={[styles.taskCard, { padding: 16, marginBottom: 10 }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <Skel w={22} h={22} r={11} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skel w="80%" h={14} r={4} mb={6} />
        <Skel w="50%" h={11} r={3} />
      </View>
    </View>
    <View style={{ flexDirection: 'row', gap: 6, paddingLeft: 34 }}>
      <Skel w={60} h={22} r={6} />
      <Skel w={72} h={22} r={6} />
    </View>
  </View>
);

// ── Task Card ─────────────────────────────────────────────────────────────
const TaskCard = ({ task, onToggle, delay }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, speed: 16, bounciness: 3, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const sc = STATUS[task.status] || STATUS['To Do'];
  const pc = PRIORITY[task.priority] || PRIORITY.Low;
  const isDone = task.status === 'Done';
  const isIP = task.status === 'In Progress';

  const next = () => {
    const cycle = { 'To Do': 'In Progress', 'In Progress': 'Done', 'Done': 'To Do' };
    onToggle(task._id, cycle[task.status] || 'To Do');
  };

  return (
    <Animated.View style={[styles.taskCard, { opacity: fade, transform: [{ translateY: slide }], borderLeftColor: sc.accent }]}>
      <View style={styles.taskTop}>
        <TouchableOpacity onPress={next} style={styles.checkWrap}>
          {isDone
            ? <CheckCircle2 color="#10B981" size={22} />
            : isIP
              ? <Clock color={PRIMARY} size={22} />
              : <Circle color="#D1D5DB" size={22} />
          }
        </TouchableOpacity>
        <Text style={[styles.taskTitle, isDone && styles.taskDone]} numberOfLines={2}>
          {task.title}
        </Text>
      </View>

      {task.project?.title && (
        <View style={styles.projectRow}>
          <FolderKanban color="#9CA3AF" size={11} style={{ marginRight: 4 }} />
          <Text style={styles.projectText} numberOfLines={1}>{task.project.title}</Text>
        </View>
      )}

      <View style={styles.badgeRow}>
        {task.priority && (
          <View style={[styles.badge, { backgroundColor: pc.bg, borderColor: pc.border }]}>
            <View style={[styles.badgeDot, { backgroundColor: pc.color }]} />
            <Text style={[styles.badgeText, { color: pc.color }]}>{task.priority}</Text>
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[styles.badgeText, { color: sc.color }]}>{task.status}</Text>
        </View>
        {task.dueDate && (
          <View style={styles.badge}>
            <CalendarDays color="#9CA3AF" size={10} style={{ marginRight: 3 }} />
            <Text style={[styles.badgeText, { color: '#6B7280' }]}>
              {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ── Board Card ─────────────────────────────────────────────────────────────
const BoardCard = ({ task, onToggle }) => {
  const pc = PRIORITY[task.priority] || PRIORITY.Low;
  const isDone = task.status === 'Done';
  const next = () => {
    const cycle = { 'To Do': 'In Progress', 'In Progress': 'Done', 'Done': 'To Do' };
    onToggle(task._id, cycle[task.status] || 'To Do');
  };
  return (
    <View style={styles.boardCard}>
      <View style={[styles.boardAccent, { backgroundColor: pc.color }]} />
      <View style={styles.boardBody}>
        <Text style={[styles.boardTitle, isDone && styles.taskDone]} numberOfLines={2}>{task.title}</Text>
        {task.project?.title && <Text style={styles.boardProject} numberOfLines={1}>{task.project.title}</Text>}
        <View style={styles.boardFooter}>
          {task.dueDate ? (
            <Text style={styles.boardDate}>
              {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Text>
          ) : <View />}
          <TouchableOpacity onPress={next}>
            {isDone
              ? <CheckCircle2 color="#10B981" size={17} />
              : task.status === 'In Progress'
                ? <Clock color={PRIMARY} size={17} />
                : <Circle color="#D1D5DB" size={17} />
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ── Screen ─────────────────────────────────────────────────────────────────
export default function MyTasksScreen() {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('All');
  const [wsId, setWsId] = useState(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    init();
  }, []);

  const init = async () => {
    try {
      const ws = await cachedGet('/workspaces');
      if (ws.length > 0) {
        setWsId(ws[0]._id);
        await fetchTasks(ws[0]._id);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchTasks = async (id) => {
    try {
      const d = await cachedGet(`/workspaces/${id}/my-tasks`);
      setTasks(Array.isArray(d) ? d : []);
    } catch {
      try {
        const d = await cachedGet('/tasks');
        setTasks((Array.isArray(d) ? d : []).filter(t => t.assignedTo?._id === user._id));
      } catch (e) { console.error(e); }
    }
  };

  const handleToggle = async (id, status) => {
    setTasks(p => p.map(t => t._id === id ? { ...t, status } : t));
    try {
      await axios.put(`/tasks/${id}`, { status });
      if (wsId) invalidateCache(`/workspaces/${wsId}/my-tasks`);
    } catch {
      if (wsId) fetchTasks(wsId);
    }
  };

  const filtered = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);
  const board = COLUMNS.reduce((a, c) => { a[c] = tasks.filter(t => t.status === c); return a; }, {});
  const done = tasks.filter(t => t.status === 'Done').length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const COL_STYLE = {
    'To Do':       { dot: '#9CA3AF', label: '#6B7280' },
    'In Progress': { dot: PRIMARY,   label: PRIMARY   },
    'Done':        { dot: '#10B981', label: '#059669' },
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ─────────────────────────────────── */}
      <Animated.View style={[styles.header, { opacity: fade }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <Text style={styles.headerSub}>{tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned</Text>
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'list' && styles.toggleActive]}
            onPress={() => setView('list')}
          >
            <LayoutList color={view === 'list' ? PRIMARY : '#9CA3AF'} size={17} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'board' && styles.toggleActive]}
            onPress={() => setView('board')}
          >
            <Columns color={view === 'board' ? PRIMARY : '#9CA3AF'} size={17} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Progress strip ─────────────────────────── */}
      {tasks.length > 0 && (
        <View style={styles.progressStrip}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{pct}% done</Text>
        </View>
      )}

      {/* ── Filter chips (list only) ───────────────── */}
      {view === 'list' && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterBarContent}
        >
          {FILTERS.map(f => {
            const count = f === 'All' ? tasks.length : tasks.filter(t => t.status === f).length;
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f}</Text>
                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Content ────────────────────────────────── */}
      {loading ? (
        <ScrollView contentContainerStyle={styles.listPad}>
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </ScrollView>
      ) : view === 'list' ? (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          renderItem={({ item, index }) => (
            <TaskCard task={item} delay={index * 35} onToggle={handleToggle} />
          )}
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconBox}>
                <CheckSquare color="#D1D5DB" size={32} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'All' ? 'No tasks yet' : `No ${filter} tasks`}
              </Text>
              <Text style={styles.emptySub}>
                {filter === 'All' ? "You're all caught up! 🎉" : 'Try another filter.'}
              </Text>
            </View>
          }
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.boardRow}>
            {COLUMNS.map(col => {
              const items = board[col] || [];
              const cs = COL_STYLE[col];
              return (
                <View key={col} style={styles.boardCol}>
                  {/* Column header */}
                  <View style={styles.boardColHead}>
                    <View style={[styles.colDot, { backgroundColor: cs.dot }]} />
                    <Text style={[styles.colLabel, { color: cs.label }]}>{col}</Text>
                    <View style={styles.colCount}>
                      <Text style={styles.colCountText}>{items.length}</Text>
                    </View>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {items.length === 0 ? (
                      <View style={styles.colEmpty}>
                        <Text style={styles.colEmptyText}>Empty</Text>
                      </View>
                    ) : items.map(t => (
                      <BoardCard key={t._id} task={t} onToggle={handleToggle} />
                    ))}
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
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  viewToggle: {
    flexDirection: 'row', backgroundColor: '#F9FAFB',
    borderRadius: 12, padding: 3,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  toggleBtn: { padding: 8, borderRadius: 9 },
  toggleActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },

  // Progress
  progressStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12,
  },
  progressTrack: { flex: 1, height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: PRIMARY, borderRadius: 2 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: PRIMARY, minWidth: 52, textAlign: 'right' },

  // Filter bar
  filterBar: { backgroundColor: '#fff', maxHeight: 52, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterBarContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#F9FAFB',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: PRIMARY },
  filterBadge: {
    minWidth: 20, height: 18, borderRadius: 9,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  filterBadgeActive: { backgroundColor: PRIMARY },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
  filterBadgeTextActive: { color: '#fff' },

  // List
  listPad: { paddingBottom: 160 },

  // Task card
  taskCard: {
    backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  checkWrap: { marginRight: 12, marginTop: 1 },
  taskTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827', lineHeight: 22 },
  taskDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  projectRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 34, marginBottom: 10 },
  projectText: { fontSize: 12, color: '#9CA3AF', flex: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 34 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 12,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },

  // Board
  boardRow: { flexDirection: 'row', gap: 16, paddingBottom: 160, paddingHorizontal: 16, paddingTop: 16 },
  boardCol: {
    width: 280, backgroundColor: '#F8FAFC', borderRadius: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  boardColHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  colDot: { width: 8, height: 8, borderRadius: 4 },
  colLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  colCount: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  colCountText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  colEmpty: { padding: 24, alignItems: 'center' },
  colEmptyText: { fontSize: 13, color: '#D1D5DB', fontWeight: '500' },
  boardCard: {
    flexDirection: 'row', marginHorizontal: 8, marginTop: 8, borderRadius: 6,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  boardAccent: { width: 3 },
  boardBody: { flex: 1, padding: 12 },
  boardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 20, marginBottom: 4 },
  boardProject: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  boardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  boardDate: { fontSize: 11, color: '#9CA3AF' },
});
