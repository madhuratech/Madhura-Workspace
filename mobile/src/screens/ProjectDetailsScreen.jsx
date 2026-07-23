import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Circle, Clock, Calendar } from 'lucide-react-native';
import axios from 'axios';

export default function ProjectDetailsScreen({ route, navigation }) {
  const { projectId, workspaceId } = route.params;
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get Project Details
      const projRes = await axios.get(`/workspaces/${workspaceId}/projects/${projectId}`);
      setProject(projRes.data);
      
      // Get Project Tasks
      const tasksRes = await axios.get(`/workspaces/${workspaceId}/projects/${projectId}/tasks`);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleTaskStatus = async (task) => {
    const nextStatusMap = {
      'To Do': 'In Progress',
      'In Progress': 'Done',
      'Done': 'To Do'
    };
    const newStatus = nextStatusMap[task.status] || 'To Do';
    
    // Optimistic update
    setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: newStatus } : t));

    try {
      await axios.put(`/tasks/${task._id}`, { status: newStatus });
    } catch (error) {
      console.error('Failed to update status', error);
      fetchData(); // Revert
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#64748B';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Done': return <CheckCircle2 color="#10B981" size={24} />;
      case 'In Progress': return <Clock color="#3B82F6" size={24} />;
      default: return <Circle color="#CBD5E1" size={24} />;
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, item.status === 'Done' && styles.cardDone]}>
      <TouchableOpacity 
        style={styles.statusBtn} 
        onPress={() => toggleTaskStatus(item)}
      >
        {getStatusIcon(item.status)}
      </TouchableOpacity>
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[
            styles.titleText, 
            item.status === 'Done' && styles.titleDone
          ]}>
            {item.title}
          </Text>
        </View>
        
        {item.description ? (
          <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
        ) : null}
        
        <View style={styles.metaRow}>
          <View style={[styles.priorityBadge, { borderColor: getPriorityColor(item.priority) }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
              {item.priority}
            </Text>
          </View>
          
          {item.dueDate && (
            <View style={styles.dateRow}>
              <Calendar size={12} color="#94A3B8" />
              <Text style={styles.dateText}>
                {new Date(item.dueDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#64748B" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {project?.title || 'Loading...'}
          </Text>
          <Text style={styles.headerSubtitle}>Project Tasks</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CheckCircle2 size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No tasks yet</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 14, color: '#64748B' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 24, paddingTop: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    alignItems: 'flex-start'
  },
  cardDone: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  statusBtn: {
    marginRight: 16,
    paddingTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  descText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priorityBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#fff'
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
  }
});
