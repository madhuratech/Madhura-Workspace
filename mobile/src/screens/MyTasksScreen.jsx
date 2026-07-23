import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Clock, CalendarDays, MoreHorizontal } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const TaskCard = ({ task, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 12, bounciness: 4, delay, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.taskCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <TouchableOpacity style={styles.moreBtn}>
          <MoreHorizontal color="#9CA3AF" size={20} />
        </TouchableOpacity>
      </View>
      <View style={styles.taskMeta}>
        <View style={styles.metaBadge}>
          <CalendarDays color="#6B7280" size={14} />
          <Text style={styles.metaText}>{new Date(task.dueDate).toLocaleDateString()}</Text>
        </View>
        <View style={styles.priorityBadge(task.priority)}>
          <Text style={styles.priorityText(task.priority)}>{task.priority}</Text>
        </View>
        <View style={styles.statusBadge(task.status)}>
          <Text style={styles.statusText(task.status)}>{task.status}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default function MyTasksScreen() {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get('/tasks');
      const myTasks = res.data.filter(t => t.assignedTo && t.assignedTo._id === user._id);
      setTasks(myTasks);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <Text style={styles.headerTitle}>My Tasks</Text>
        <Text style={styles.headerSubtitle}>Manage your workload</Text>
      </Animated.View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item._id}
          renderItem={({ item, index }) => <TaskCard task={item} delay={index * 50} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckCircle2 color="#D1D5DB" size={48} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>You're all caught up!</Text>
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
  
  taskCard: {
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
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, paddingRight: 16, lineHeight: 22 },
  moreBtn: { padding: 4 },
  
  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  metaText: { fontSize: 12, color: '#4B5563', marginLeft: 6, fontWeight: '500' },
  
  priorityBadge: (priority) => ({
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1,
    borderColor: priority === 'High' ? '#FECACA' : priority === 'Medium' ? '#FEF08A' : '#BFDBFE',
    backgroundColor: priority === 'High' ? '#FEF2F2' : priority === 'Medium' ? '#FEFCE8' : '#EFF6FF'
  }),
  priorityText: (priority) => ({
    fontSize: 12, fontWeight: '600',
    color: priority === 'High' ? '#991B1B' : priority === 'Medium' ? '#854D0E' : '#1D4ED8'
  }),
  
  statusBadge: (status) => ({
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1,
    borderColor: status === 'Done' ? '#DCFCE7' : '#E5E7EB',
    backgroundColor: status === 'Done' ? '#F0FDF4' : '#F9FAFB'
  }),
  statusText: (status) => ({
    fontSize: 12, fontWeight: '600',
    color: status === 'Done' ? '#166534' : '#4B5563'
  }),

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' }
});
