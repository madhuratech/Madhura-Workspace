import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FolderKanban, Users, ChevronRight, CheckCircle2, Plus } from 'lucide-react-native';
import { cachedGet } from '../utils/api';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  Active:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', dot: '#3B82F6' },
  Completed: { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', dot: '#10B981' },
  'On Hold': { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', dot: '#F59E0B' },
};

const CARD_GRADIENTS = [
  ['#6366F1','#818CF8'],
  ['#8B5CF6','#A78BFA'],
  ['#3B82F6','#60A5FA'],
  ['#10B981','#34D399'],
  ['#F97316','#FB923C'],
  ['#EC4899','#F472B6'],
  ['#06B6D4','#22D3EE'],
  ['#EF4444','#F87171'],
];

// ── Project Card ──────────────────────────────────────────────────────────
const ProjectCard = ({ project, onPress, delay, colorIndex }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 4, delay, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, speed: 12, bounciness: 4, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const status = project.status || 'Active';
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.Active;
  const grad = CARD_GRADIENTS[colorIndex % CARD_GRADIENTS.length];
  const totalTasks = project.totalTasks || 0;
  const doneTasks = project.doneTasks || 0;
  const progress = totalTasks > 0 ? doneTasks / totalTasks : 0;
  const members = project.members || [];
  const shownMembers = members.slice(0, 4);
  const extraMembers = members.length - 4;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>

        {/* Gradient Top Strip */}
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cardStrip}>
          <View style={styles.stripLeft}>
            <LinearGradient colors={['rgba(255,255,255,0.25)','rgba(255,255,255,0.1)']} style={styles.iconWrap}>
              <FolderKanban color="#fff" size={20} strokeWidth={2} />
            </LinearGradient>
          </View>
          <View style={[styles.statusPill]}>
            <View style={[styles.statusDot, { backgroundColor: statusCfg.dot }]} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </LinearGradient>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <Text style={styles.projectTitle} numberOfLines={1}>{project.name || project.title}</Text>
          <Text style={styles.projectDesc} numberOfLines={2}>
            {project.description || 'No description provided.'}
          </Text>

          {/* Progress */}
          {totalTasks > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={[styles.progressPct, { color: grad[0] }]}>{Math.round(progress * 100)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={progress === 1 ? ['#10B981', '#059669'] : grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
                />
              </View>
              <Text style={styles.progressSub}>{doneTasks}/{totalTasks} tasks done</Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.avatarStack}>
              {shownMembers.map((m, idx) => {
                const memberUser = m.user || m;
                const initial = memberUser?.name ? memberUser.name.charAt(0).toUpperCase() : '?';
                return (
                  <LinearGradient
                    key={idx}
                    colors={CARD_GRADIENTS[(colorIndex + idx + 1) % CARD_GRADIENTS.length]}
                    style={[styles.avatar, { marginLeft: idx === 0 ? 0 : -10, zIndex: 10 - idx }]}
                  >
                    <Text style={styles.avatarText}>{initial}</Text>
                  </LinearGradient>
                );
              })}
              {extraMembers > 0 && (
                <View style={[styles.avatar, styles.avatarExtra, { marginLeft: -10 }]}>
                  <Text style={styles.avatarExtraText}>+{extraMembers}</Text>
                </View>
              )}
              {members.length === 0 && (
                <View style={styles.footerItem}>
                  <Users color="#94A3B8" size={14} />
                  <Text style={styles.footerText}>No members</Text>
                </View>
              )}
            </View>
            <LinearGradient colors={grad} style={styles.arrowBtn}>
              <ChevronRight color="#fff" size={16} />
            </LinearGradient>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────
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
      const wsData = await cachedGet('/workspaces');
      if (wsData.length > 0) {
        const ws = wsData[0];
        const data = await cachedGet(`/workspaces/${ws._id}/projects`);
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = projects.filter(p => (p.status || 'Active') === 'Active').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Premium Gradient Header ───────────────── */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.headerGradient}>
        <Animated.View style={[styles.headerInner, { opacity: headerFade }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Projects</Text>
            <Text style={styles.headerSub}>{projects.length} total · {activeCount} active</Text>
          </View>
          <LinearGradient colors={['#6366F1','#818CF8']} style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{projects.length}</Text>
          </LinearGradient>
        </Animated.View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading projects...</Text>
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
              onPress={() => navigation.navigate('ProjectDetails', { projectId: item._id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <LinearGradient colors={['#EEF2FF','#E0E7FF']} style={styles.emptyIconWrap}>
                <FolderKanban color="#6366F1" size={36} />
              </LinearGradient>
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

  // Header
  headerGradient: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#F8FAFC' },
  headerSub: { fontSize: 13, color: 'rgba(248,250,252,0.55)', marginTop: 2 },
  headerBadge: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  headerBadgeText: { fontSize: 18, fontWeight: '800', color: '#fff' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 160 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 22, marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 6,
  },
  cardStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  stripLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  cardBody: { padding: 18 },
  projectTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  projectDesc: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: 16 },

  // Progress
  progressSection: { marginBottom: 16 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  progressLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  progressPct: { fontSize: 12, fontWeight: '800' },
  progressTrack: { height: 7, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
  progressFill: { height: 7, borderRadius: 4 },
  progressSub: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

  // Footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  avatarExtra: { backgroundColor: '#F1F5F9' },
  avatarExtraText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  arrowBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // Empty
  emptyBox: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
});
