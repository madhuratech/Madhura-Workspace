import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FolderKanban, Users, Clock, ChevronRight } from 'lucide-react-native';
import axios from 'axios';

const ProjectCard = ({ project, onPress, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 12, bounciness: 4, delay, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={styles.card} onPress={onPress}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <FolderKanban color="#2563EB" size={20} />
          </View>
          <View style={styles.statusBadge(project.status)}>
            <Text style={styles.statusText(project.status)}>{project.status || 'Active'}</Text>
          </View>
        </View>
        <Text style={styles.projectTitle}>{project.name}</Text>
        <Text style={styles.projectDesc} numberOfLines={2}>{project.description || 'No description'}</Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Users color="#6B7280" size={14} />
            <Text style={styles.footerText}>{project.members?.length || 1} Members</Text>
          </View>
          <View style={styles.footerItem}>
            <Clock color="#6B7280" size={14} />
            <Text style={styles.footerText}>Updated recently</Text>
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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <Text style={styles.headerTitle}>Projects</Text>
        <Text style={styles.headerSubtitle}>Workspace projects</Text>
      </Animated.View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={item => item._id}
          renderItem={({ item, index }) => (
            <ProjectCard 
              project={item} 
              delay={index * 50}
              onPress={() => navigation.navigate('ProjectDetails', { projectId: item._id })} 
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FolderKanban color="#D1D5DB" size={48} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No projects found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 24, paddingBottom: 140 },
  
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconContainer: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE'
  },
  statusBadge: (status) => ({
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6,
    backgroundColor: status === 'Completed' ? '#F0FDF4' : '#F9FAFB',
    borderWidth: 1, borderColor: status === 'Completed' ? '#DCFCE7' : '#E5E7EB'
  }),
  statusText: (status) => ({
    fontSize: 11, fontWeight: '600',
    color: status === 'Completed' ? '#166534' : '#4B5563',
    textTransform: 'uppercase', letterSpacing: 0.5
  }),
  projectTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8, letterSpacing: -0.2 },
  projectDesc: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16, gap: 16 },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 12, color: '#4B5563', marginLeft: 6, fontWeight: '500' },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' }
});
