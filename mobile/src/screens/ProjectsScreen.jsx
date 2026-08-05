import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FolderKanban, Users, ChevronRight } from 'lucide-react-native';
import { cachedGet } from '../utils/api';

const PRIMARY = '#4F46E5';

const ACCENT_COLORS = [PRIMARY, '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];

const STATUS_CFG = {
  Active:    { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
  Completed: { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  'On Hold': { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
};

// ── Skeleton ──────────────────────────────────────────────────────────────
const Skel = ({ w, h, r = 6, style }) => {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(a, { toValue: 0, duration: 800, useNativeDriver: false }),
    ])).start();
  }, []);
  const bg = a.interpolate({ inputRange: [0, 1], outputRange: ['#F3F4F6', '#E5E7EB'] });
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: bg }, style]} />;
};

const SkeletonProjectCard = () => (
  <View style={styles.card}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
      <Skel w={44} h={44} r={14} />
      <Skel w={70} h={26} r={20} />
    </View>
    <Skel w="70%" h={18} r={5} style={{ marginBottom: 8 }} />
    <Skel w="90%" h={13} r={4} style={{ marginBottom: 4 }} />
    <Skel w="60%" h={13} r={4} style={{ marginBottom: 20 }} />
    <Skel w="100%" h={6} r={3} style={{ marginBottom: 16 }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', gap: -8 }}>
        <Skel w={30} h={30} r={15} />
        <Skel w={30} h={30} r={15} style={{ marginLeft: -8 }} />
      </View>
      <Skel w={34} h={34} r={10} />
    </View>
  </View>
);

// ── Project Card ──────────────────────────────────────────────────────────
const ProjectCard = ({ project, onPress, delay, idx }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, speed: 14, bounciness: 3, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const accent = ACCENT_COLORS[idx % ACCENT_COLORS.length];
  const status = project.status || 'Active';
  const sc = STATUS_CFG[status] || STATUS_CFG.Active;
  const total = project.totalTasks || 0;
  const done = project.doneTasks || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const members = project.members || [];
  const shown = members.slice(0, 3);
  const extra = members.length - 3;

  const initials = (m) => {
    const u = m.user || m;
    return u?.name ? u.name[0].toUpperCase() : '?';
  };

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.86}>

        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: accent + '15' }]}>
            <FolderKanban color={accent} size={20} strokeWidth={2} />
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
            <View style={[styles.statusDot, { backgroundColor: sc.color }]} />
            <Text style={[styles.statusText, { color: sc.color }]}>{status}</Text>
          </View>
        </View>

        {/* Title + description */}
        <Text style={styles.projectTitle} numberOfLines={1}>
          {project.name || project.title}
        </Text>
        <Text style={styles.projectDesc} numberOfLines={2}>
          {project.description || 'No description provided.'}
        </Text>

        {/* Progress */}
        {total > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressMeta}>
              <Text style={styles.progressMetaText}>{done}/{total} tasks</Text>
              <Text style={[styles.progressPct, { color: accent }]}>{pct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct === 100 ? '#10B981' : accent }]} />
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.avatarRow}>
            {shown.map((m, i) => (
              <View
                key={i}
                style={[styles.avatar, { backgroundColor: accent + '20', borderColor: '#fff', marginLeft: i === 0 ? 0 : -10 }]}
              >
                <Text style={[styles.avatarText, { color: accent }]}>{initials(m)}</Text>
              </View>
            ))}
            {extra > 0 && (
              <View style={[styles.avatar, { backgroundColor: '#F3F4F6', borderColor: '#fff', marginLeft: -10 }]}>
                <Text style={[styles.avatarText, { color: '#6B7280' }]}>+{extra}</Text>
              </View>
            )}
            {members.length === 0 && (
              <View style={styles.noMember}>
                <Users color="#D1D5DB" size={14} />
                <Text style={styles.noMemberText}>No members</Text>
              </View>
            )}
          </View>
          <View style={[styles.arrowBtn, { backgroundColor: accent + '15' }]}>
            <ChevronRight color={accent} size={16} />
          </View>
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Screen ─────────────────────────────────────────────────────────────────
export default function ProjectsScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    load();
  }, []);

  const load = async () => {
    try {
      const ws = await cachedGet('/workspaces');
      if (ws.length > 0) {
        const d = await cachedGet(`/workspaces/${ws[0]._id}/projects`);
        setProjects(Array.isArray(d) ? d : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fade }]}>
        <View>
          <Text style={styles.headerTitle}>Projects</Text>
          <Text style={styles.headerSub}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {projects.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{projects.length}</Text>
          </View>
        )}
      </Animated.View>

      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={i => String(i)}
          renderItem={() => <SkeletonProjectCard />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={i => i._id}
          renderItem={({ item, index }) => (
            <ProjectCard
              project={item}
              idx={index}
              delay={index * 55}
              onPress={() => navigation.navigate('ProjectDetails', { projectId: item._id })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconBox}>
                <FolderKanban color="#D1D5DB" size={32} />
              </View>
              <Text style={styles.emptyTitle}>No projects yet</Text>
              <Text style={styles.emptySub}>Projects will appear here once assigned.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  headerBadge: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  headerBadgeText: { fontSize: 15, fontWeight: '800', color: PRIMARY },

  list: { paddingBottom: 160 },

  card: {
    backgroundColor: '#fff', paddingVertical: 18, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  iconBox: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },

  projectTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  projectDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 16 },

  progressSection: { marginBottom: 16 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressMetaText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  progressPct: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 5, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  avatarText: { fontSize: 12, fontWeight: '700' },
  noMember: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  noMemberText: { fontSize: 12, color: '#D1D5DB' },
  arrowBtn: { width: 34, height: 34, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 12,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});
