import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FolderKanban, Users, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import axios from 'axios';

const STATUS_CONFIG = {
  Active:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },
  Completed: { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' },
  'On Hold': { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' },
};

const ICON_COLORS = ['#3B82F6','#8B5CF6','#F97316','#10B981','#EC4899','#06B6D4'];

const ProjectCard = ({ project, onPress, delay, colorIndex }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 4, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const status = project.status || 'Active';
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.Active;
  const iconColor = ICON_COLORS[colorIndex % ICON_COLORS.length];
  const totalTasks = project.totalTasks || 0;
  const doneTasks = project.doneTasks || 0;
  const progress = totalTasks > 0 ? doneTasks / totalTasks : 0;

  // Build member avatar array (up to 3)
  const members = project.members || [];
  const shownMembers = members.slice(0, 3);
  const extraMembers = members.length - 3;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>

        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
            <FolderKanban color={iconColor} size={20} strokeWidth={2} />
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
            <Text style={[styles.statusText, { color: statusCfg.text }]}>{status}</Text>
          </View>
        </View>

        {/* Title & Description */}
        <Text style={styles.projectTitle}>{project.name}</Text>
        <Text style={styles.projectDesc} numberOfLines={2}>
          {project.description || 'No description provided.'}
        </Text>

        {/* Progress Bar */}
        {totalTasks > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: progress === 1 ? '#10B981' : iconColor,
              }]} />
            </View>
            <Text style={styles.progressSub}>{doneTasks}/{totalTasks} tasks done</Text>
          </View>
        )}

        {/* Footer: members + arrow */}
        <View style={styles.cardFooter}>
          <View style={styles.avatarStack}>
            {shownMembers.map((m, idx) => {
              const memberUser = m.user || m;
              const initials = memberUser?.name
                ? memberUser.name.charAt(0).toUpperCase()
                : '?';
              return (
                <View
                  key={idx}
                  style={[
                    styles.avatar,
                    { marginLeft: idx === 0 ? 0 : -10, zIndex: 10 - idx, backgroundColor: iconColor + '28' },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: iconColor }]}>{initials}</Text>
                </View>
              );
            })}
            {extraMembers > 0 && (
              <View style={[styles.avatar, { marginLeft: -10, backgroundColor: '#F1F5F9' }]}>
                <Text style={[styles.avatarText, { color: '#64748B' }]}>+{extraMembers}</Text>
              </View>
            )}
            {members.length === 0 && (
              <View style={styles.footerItem}>
                <Users color="#94A3B8" size={14} />
                <Text style={styles.footerText}>No members</Text>
              </View>
            )}
          </View>
          <View style={styles.arrowBtn}>
            <ChevronRight color="#3B82F6" size={18} />
          </View>
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ProjectsScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        const res = await axios.get(`/workspaces/${ws._id}/projects`);
        setProjects(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <View>
          <Text style={styles.headerTitle}>Projects</Text>
          <Text style={styles.headerSub}>{projects.length} active project{projects.length !== 1 ? 's' : ''}</Text>
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={item => item._id}
          renderItem={({ item, index }) => (
            <ProjectCard
              project={item}
              delay={index * 60}
              colorIndex={index}
              onPress={() => navigation.navigate('ProjectDetails', {
                projectId: item._id,
              })}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <FolderKanban color="#CBD5E1" size={52} />
              <Text style={styles.emptyTitle}>No projects yet</Text>
              <Text style={styles.emptySub}>Projects assigned to your workspace will appear here.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 160 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  projectTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  projectDesc: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: 16 },

  // Progress
  progressSection: { marginBottom: 16 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  progressPct: { fontSize: 12, color: '#334155', fontWeight: '700' },
  progressTrack: {
    height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginBottom: 4,
  },
  progressFill: { height: 6, borderRadius: 3 },
  progressSub: { fontSize: 11, color: '#94A3B8' },

  // Footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 30, height: 30, borderRadius: 15, justifyContent: 'center',
    alignItems: 'center', borderWidth: 2, borderColor: '#fff',
  },
  avatarText: { fontSize: 12, fontWeight: '700' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  arrowBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },

  // Empty
  emptyBox: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 16, marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
});
