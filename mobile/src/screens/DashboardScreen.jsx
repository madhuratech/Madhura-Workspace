import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  TouchableOpacity, Dimensions, TextInput, RefreshControl,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { StatusBar } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell, CheckSquare, FolderKanban, Calendar, ArrowRight,
  Plus, Users, ChevronRight, Clock, Sparkles, MessageSquare,
  Award, Flame, CheckCircle2, Circle
} from 'lucide-react-native';
import { cachedGet } from '../utils/api';

const { width } = Dimensions.get('window');

// ── Skeleton Loader Component ──────────────────────────────────────────────
const Skel = ({ w, h, r = 8, style }) => {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(a, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const bg = a.interpolate({ inputRange: [0, 1], outputRange: ['#F1F5F9', '#E2E8F0'] });
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: bg }, style]} />;
};

const DashboardSkeleton = () => (
  <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
      <View>
        <Skel w={140} h={16} r={4} style={{ marginBottom: 8 }} />
        <Skel w={200} h={24} r={6} />
      </View>
      <Skel w={40} h={40} r={20} />
    </View>
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
      <Skel w={(width - 52) / 2} h={105} r={16} />
      <Skel w={(width - 52) / 2} h={105} r={16} />
    </View>
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
      <Skel w={(width - 52) / 2} h={105} r={16} />
      <Skel w={(width - 52) / 2} h={105} r={16} />
    </View>
    <Skel w={120} h={18} r={4} style={{ marginBottom: 14 }} />
    <Skel w="100%" h={70} r={14} style={{ marginBottom: 10 }} />
    <Skel w="100%" h={70} r={14} style={{ marginBottom: 10 }} />
  </View>
);

export default function DashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { isUserOnline } = useContext(SocketContext);
  const insets = useSafeAreaInsets();
  
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [metrics, setMetrics] = useState({ tasksDue: 0, unreads: 0, meetings: 0, totalProjects: 0 });
  const [notifications, setNotifications] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [todayAttendances, setTodayAttendances] = useState([]);

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    load();
  }, []);

  const load = async () => {
    try {
      const ws = await cachedGet('/workspaces');
      setWorkspaces(ws);
      
      let projList = [];
      if (ws.length > 0) {
        const proj = await cachedGet(`/workspaces/${ws[0]._id}/projects`).catch(() => []);
        projList = Array.isArray(proj) ? proj : [];
        setProjects(projList);
      }
      
      const allTasks = await cachedGet('/tasks').catch(() => []);
      const myTasks = (Array.isArray(allTasks) ? allTasks : []).filter(t => 
        String(t.assignedTo?._id || t.assignedTo) === String(user?._id) && t.status !== 'Done'
      );
      setTasks(myTasks.slice(0, 4));
      
      const notifs = await cachedGet('/notifications').catch(() => []);
      const unreadNotifs = (Array.isArray(notifs) ? notifs : []).filter(n => !n.isRead);
      
      const allMeetings = await cachedGet('/meetings').catch(() => []);
      const myMeetings = (Array.isArray(allMeetings) ? allMeetings : []).filter(m => 
        String(m.organizer?._id || m.organizer) === String(user?._id) || 
        (m.attendees && m.attendees.some(a => String(a.user?._id || a.user) === String(user?._id)))
      );

      if (ws.length > 0) {
        const atts = await cachedGet(`/workspaces/${ws[0]._id}/attendance`).catch(() => []);
        const today = new Date().toISOString().split('T')[0];
        setTodayAttendances(Array.isArray(atts) ? atts.filter(a => a.date === today) : []);
      }

      setMeetings(myMeetings.slice(0, 3));
      setNotifications(notifs.slice(0, 5));
      setMetrics({
        tasksDue: myTasks.length,
        unreads: unreadNotifs.length,
        meetings: myMeetings.length,
        totalProjects: projList.filter(p => p.status !== 'Completed').length,
      });

    } catch (e) { 
      console.error('Dashboard load error:', e); 
    } finally { 
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Member';
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  const workspaceName = workspaces.length > 0 ? workspaces[0].name : 'Madhura Workspace';

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      case 'medium':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      default:
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    }
  };

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top App Bar ── */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.dateText}>{getFormattedDate()}</Text>
          <Text style={styles.greetingText}>
            {getGreeting()}, <Text style={styles.greetingName}>{firstName}</Text>
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Notifications Button */}
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Bell color="#475569" size={20} strokeWidth={2} />
            {metrics.unreads > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {metrics.unreads > 9 ? '9+' : metrics.unreads}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Profile Avatar */}
          <TouchableOpacity 
            style={styles.profileBtn} 
            onPress={() => navigation.navigate('Menu', { screen: 'Settings' })}
            activeOpacity={0.8}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{initial}</Text>
            </View>
            <View style={styles.statusDot} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <DashboardSkeleton />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1b2b4c']} tintColor="#1b2b4c" />
          }
        >
          <Animated.View style={{ opacity: fade }}>

            {/* Workspace Banner */}
            <View style={styles.workspacePill}>
              <View style={styles.workspaceDot} />
              <Text style={styles.workspacePillText} numberOfLines={1}>
                {workspaceName}
              </Text>
              <Text style={styles.workspaceRoleBadge}>
                {user?.role ? user.role.replace(/_/g, ' ') : 'Enterprise'}
              </Text>
            </View>

            {/* ── Minimalist KPI Metrics Grid (2x2) ── */}
            <View style={styles.kpiGrid}>
              {/* Tasks Due */}
              <TouchableOpacity
                style={[styles.kpiCard, { borderColor: '#E2E8F0' }]}
                onPress={() => navigation.navigate('Tasks')}
                activeOpacity={0.7}
              >
                <View style={[styles.kpiIconBox, { backgroundColor: '#EEF2FF' }]}>
                  <CheckSquare color="#4F46E5" size={20} strokeWidth={2.2} />
                </View>
                <Text style={styles.kpiValue}>{metrics.tasksDue}</Text>
                <Text style={styles.kpiLabel}>My Tasks</Text>
                <Text style={styles.kpiSub}>Pending</Text>
              </TouchableOpacity>

              {/* Active Projects */}
              <TouchableOpacity
                style={[styles.kpiCard, { borderColor: '#E2E8F0' }]}
                onPress={() => navigation.navigate('Projects')}
                activeOpacity={0.7}
              >
                <View style={[styles.kpiIconBox, { backgroundColor: '#F0FDF4' }]}>
                  <FolderKanban color="#16A34A" size={20} strokeWidth={2.2} />
                </View>
                <Text style={styles.kpiValue}>{metrics.totalProjects}</Text>
                <Text style={styles.kpiLabel}>Projects</Text>
                <Text style={styles.kpiSub}>In Progress</Text>
              </TouchableOpacity>

              {/* Meetings Today */}
              <TouchableOpacity
                style={[styles.kpiCard, { borderColor: '#E2E8F0' }]}
                onPress={() => navigation.navigate('Menu', { screen: 'Meetings' })}
                activeOpacity={0.7}
              >
                <View style={[styles.kpiIconBox, { backgroundColor: '#FAF5FF' }]}>
                  <Calendar color="#9333EA" size={20} strokeWidth={2.2} />
                </View>
                <Text style={styles.kpiValue}>{metrics.meetings}</Text>
                <Text style={styles.kpiLabel}>Meetings</Text>
                <Text style={styles.kpiSub}>Scheduled</Text>
              </TouchableOpacity>

              {/* Unread Alerts */}
              <TouchableOpacity
                style={[styles.kpiCard, { borderColor: '#E2E8F0' }]}
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}
              >
                <View style={[styles.kpiIconBox, { backgroundColor: '#FFFBEB' }]}>
                  <Bell color="#D97706" size={20} strokeWidth={2.2} />
                </View>
                <Text style={styles.kpiValue}>{metrics.unreads}</Text>
                <Text style={styles.kpiLabel}>Alerts</Text>
                <Text style={styles.kpiSub}>Unread</Text>
              </TouchableOpacity>
            </View>

            {/* ── Quick Action Pills ── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsList}>
              <TouchableOpacity 
                style={styles.quickPill} 
                onPress={() => navigation.navigate('Tasks')}
                activeOpacity={0.7}
              >
                <Plus color="#1E293B" size={16} strokeWidth={2.5} />
                <Text style={styles.quickPillText}>New Task</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickPill} 
                onPress={() => navigation.navigate('Chat')}
                activeOpacity={0.7}
              >
                <MessageSquare color="#1E293B" size={16} strokeWidth={2.2} />
                <Text style={styles.quickPillText}>Team Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickPill} 
                onPress={() => navigation.navigate('Menu', { screen: 'AttendanceLeave' })}
                activeOpacity={0.7}
              >
                <Clock color="#1E293B" size={16} strokeWidth={2.2} />
                <Text style={styles.quickPillText}>Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickPill} 
                onPress={() => navigation.navigate('Menu', { screen: 'Meetings' })}
                activeOpacity={0.7}
              >
                <Calendar color="#1E293B" size={16} strokeWidth={2.2} />
                <Text style={styles.quickPillText}>Schedule</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* ── My Priority Tasks ── */}
            <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
              <Text style={styles.sectionTitle}>My Priority Tasks</Text>
              <TouchableOpacity 
                style={styles.seeAllBtn} 
                onPress={() => navigation.navigate('Tasks')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>View All</Text>
                <ChevronRight color="#64748B" size={14} />
              </TouchableOpacity>
            </View>

            {tasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Sparkles color="#10B981" size={24} />
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptySub}>You have no pending tasks assigned to you right now.</Text>
              </View>
            ) : (
              <View style={styles.tasksContainer}>
                {tasks.map((task) => {
                  const pStyle = getPriorityStyle(task.priority);
                  return (
                    <TouchableOpacity
                      key={task._id}
                      style={styles.taskCard}
                      onPress={() => navigation.navigate('Tasks')}
                      activeOpacity={0.7}
                    >
                      <Circle color="#94A3B8" size={18} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.taskTitle} numberOfLines={1}>
                          {task.title}
                        </Text>
                        <View style={styles.taskMetaRow}>
                          <View style={[styles.priorityBadge, { backgroundColor: pStyle.bg, borderColor: pStyle.border }]}>
                            <Text style={[styles.priorityText, { color: pStyle.text }]}>
                              {task.priority || 'Normal'}
                            </Text>
                          </View>
                          {task.dueDate && (
                            <View style={styles.dueDateBadge}>
                              <Clock color="#94A3B8" size={11} style={{ marginRight: 3 }} />
                              <Text style={styles.dueDateText}>
                                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <ChevronRight color="#CBD5E1" size={16} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Active Projects ── */}
            <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
              <Text style={styles.sectionTitle}>Active Projects</Text>
              <TouchableOpacity 
                style={styles.seeAllBtn} 
                onPress={() => navigation.navigate('Projects')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>Explore</Text>
                <ChevronRight color="#64748B" size={14} />
              </TouchableOpacity>
            </View>

            {projects.filter(p => p.status !== 'Completed').length === 0 ? (
              <View style={styles.emptyCard}>
                <FolderKanban color="#94A3B8" size={24} />
                <Text style={styles.emptyTitle}>No Active Projects</Text>
                <Text style={styles.emptySub}>Projects in progress will appear here.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectsScroll}>
                {projects.filter(p => p.status !== 'Completed').slice(0, 4).map((p) => {
                  const progress = p.progress || (p.tasks?.length ? Math.round((p.tasks.filter(t => t.status === 'Done').length / p.tasks.length) * 100) : 35);
                  return (
                    <TouchableOpacity
                      key={p._id}
                      style={styles.projectCard}
                      onPress={() => navigation.navigate('Projects', { screen: 'ProjectDetails', params: { project: p } })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.projectCardTop}>
                        <View style={styles.projectIconBadge}>
                          <FolderKanban color="#1b2b4c" size={18} />
                        </View>
                        <Text style={styles.projectStatusPill}>
                          {p.status || 'Active'}
                        </Text>
                      </View>
                      <Text style={styles.projectName} numberOfLines={1}>
                        {p.title || 'Untitled Project'}
                      </Text>
                      <Text style={styles.projectDesc} numberOfLines={2}>
                        {p.description || 'Enterprise collaboration and project workflow.'}
                      </Text>

                      {/* Progress Bar */}
                      <View style={styles.progressBarWrapper}>
                        <View style={styles.progressBarTrack}>
                          <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
                        </View>
                        <Text style={styles.progressPercent}>{progress}%</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* ── Upcoming Meetings ── */}
            {meetings.length > 0 && (
              <>
                <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
                  <Text style={styles.sectionTitle}>Today's Meetings</Text>
                  <TouchableOpacity 
                    style={styles.seeAllBtn} 
                    onPress={() => navigation.navigate('Menu', { screen: 'Meetings' })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.seeAllText}>Schedule</Text>
                    <ChevronRight color="#64748B" size={14} />
                  </TouchableOpacity>
                </View>
                <View style={styles.meetingsContainer}>
                  {meetings.map((m) => (
                    <TouchableOpacity
                      key={m._id}
                      style={styles.meetingCard}
                      onPress={() => navigation.navigate('Menu', { screen: 'Meetings' })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.meetingTimeBox}>
                        <Clock color="#4F46E5" size={14} />
                        <Text style={styles.meetingTimeText}>
                          {m.startTime ? new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.meetingTitle} numberOfLines={1}>
                          {m.title || 'Team Sync'}
                        </Text>
                        <Text style={styles.meetingOrganizer} numberOfLines={1}>
                          Organized by {m.organizer?.name || 'Organizer'}
                        </Text>
                      </View>
                      <ArrowRight color="#94A3B8" size={16} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── Today's Attendance & Active Team ── */}
            <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
              <Text style={styles.sectionTitle}>Team Presence</Text>
              <TouchableOpacity 
                style={styles.seeAllBtn} 
                onPress={() => navigation.navigate('Menu', { screen: 'Team' })}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>All Team</Text>
                <ChevronRight color="#64748B" size={14} />
              </TouchableOpacity>
            </View>

            {todayAttendances.length === 0 ? (
              <View style={[styles.emptyCard, { paddingVertical: 16 }]}>
                <Users color="#94A3B8" size={20} />
                <Text style={[styles.emptyTitle, { fontSize: 13 }]}>No team check-ins logged yet</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attendanceScroll}>
                {todayAttendances.map((att, i) => {
                  const memberId = att.user?._id || att.user;
                  const isOnline = isUserOnline(memberId);
                  const name = att.user?.name || 'Member';
                  return (
                    <View key={att._id || i} style={styles.attendanceItem}>
                      <View style={styles.attendanceAvatarWrap}>
                        <View style={[styles.attendanceAvatar, { backgroundColor: '#EEF2FF' }]}>
                          <Text style={styles.attendanceAvatarText}>
                            {name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        {isOnline && (
                          <View style={styles.attendanceOnlineDot} />
                        )}
                      </View>
                      <Text style={styles.attendanceName} numberOfLines={1}>
                        {name.split(' ')[0]}
                      </Text>
                      <Text style={[styles.attendanceStatus, { color: att.isLate ? '#DC2626' : '#16A34A' }]}>
                        {att.isLate ? 'Late' : 'On Time'}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFB',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  greetingText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
  },
  greetingName: {
    color: '#1b2b4c',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  profileBtn: {
    position: 'relative',
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#1b2b4c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1b2b4c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  workspaceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffca22',
    marginRight: 8,
  },
  workspacePillText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  workspaceRoleBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'capitalize',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  // ── KPI Grid ──
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  kpiSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Quick Actions ──
  quickActionsList: {
    gap: 8,
    paddingVertical: 4,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },

  // ── Sections ──
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // ── Tasks ──
  tasksContainer: {
    gap: 8,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // ── Projects ──
  projectsScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  projectCard: {
    width: 230,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  projectCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  projectIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectStatusPill: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  projectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  projectDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1b2b4c',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  // ── Meetings ──
  meetingsContainer: {
    gap: 8,
  },
  meetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  meetingTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  meetingTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  meetingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  meetingOrganizer: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // ── Attendance & Presence ──
  attendanceScroll: {
    gap: 14,
    paddingVertical: 4,
  },
  attendanceItem: {
    alignItems: 'center',
    width: 60,
  },
  attendanceAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  attendanceAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  attendanceAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b2b4c',
  },
  attendanceOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  attendanceName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  attendanceStatus: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },

  // ── Empty Card ──
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 2,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
