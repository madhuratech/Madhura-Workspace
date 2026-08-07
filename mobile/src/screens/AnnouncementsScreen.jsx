import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Megaphone, Plus, X, Building, Users, AlertTriangle, Clock } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const AnnouncementsScreen = () => {
  const { user } = useContext(AuthContext);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({ title: '', content: '', type: 'Company' });
  const [submitting, setSubmitting] = useState(false);

  const isAuthorized = user?.role === 'super_admin' || user?.role === 'hr';

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get('/announcements');
      setAnnouncements(res.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      Alert.alert('Error', 'Please fill in title and content');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post('/announcements', formData);
      setAnnouncements([res.data, ...announcements]);
      setShowModal(false);
      setFormData({ title: '', content: '', type: 'Company' });
    } catch (error) {
      console.error('Error creating announcement:', error);
      Alert.alert('Error', 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeStyle = (type) => {
    switch(type) {
      case 'Company': return { icon: <Building size={12} color="#1e40af" />, color: '#dbeafe', textColor: '#1e40af' };
      case 'Department': return { icon: <Users size={12} color="#6b21a8" />, color: '#f3e8ff', textColor: '#6b21a8' };
      case 'Alert': return { icon: <AlertTriangle size={12} color="#991b1b" />, color: '#fee2e2', textColor: '#991b1b' };
      default: return { icon: <Megaphone size={12} color="#1f2937" />, color: '#f3f4f6', textColor: '#1f2937' };
    }
  };

  const renderItem = ({ item }) => {
    const style = getTypeStyle(item.type);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.authorContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.author?.name ? item.author.name.charAt(0) : 'A'}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>{item.author?.name || 'Admin'}</Text>
              <View style={styles.metaContainer}>
                <Clock size={10} color="#6b7280" />
                <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: style.color }]}>
            {style.icon}
            <Text style={[styles.badgeText, { color: style.textColor }]}>{item.type}</Text>
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.contentContainer}>
          <Text style={styles.content}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIconBg}>
            <Megaphone size={20} color="#1b2b4c" />
          </View>
          <Text style={styles.headerTitle}>Notice Board</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1b2b4c" />
        </View>
      ) : (
        <FlatList
          data={announcements}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Megaphone size={40} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No Announcements</Text>
              <Text style={styles.emptySub}>Check back later for company updates.</Text>
            </View>
          }
        />
      )}

      {isAuthorized && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Announcement</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Announcement Title"
                value={formData.title}
                onChangeText={t => setFormData({...formData, title: t})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeSelector}>
                {['Company', 'Department', 'Alert'].map(t => (
                  <TouchableOpacity 
                    key={t}
                    style={[styles.typeOption, formData.type === t && styles.typeOptionActive]}
                    onPress={() => setFormData({...formData, type: t})}
                  >
                    <Text style={[styles.typeText, formData.type === t && styles.typeTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Content</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write your announcement..."
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={formData.content}
                onChangeText={t => setFormData({...formData, content: t})}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} 
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Post Announcement</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerIconBg: { padding: 8, backgroundColor: '#eff6ff', borderRadius: 10, marginRight: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1b2b4c' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  authorContainer: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#4338ca', fontWeight: 'bold', fontSize: 16 },
  authorName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  metaContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dateText: { fontSize: 10, color: '#6b7280', marginLeft: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '600', marginLeft: 4 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1b2b4c', marginBottom: 8 },
  contentContainer: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  content: { fontSize: 14, color: '#475569', lineHeight: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1b2b4c', justifyContent: 'center', alignItems: 'center', shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1b2b4c' },
  closeBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1b2b4c' },
  textArea: { height: 120, textAlignVertical: 'top' },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  typeOptionActive: { backgroundColor: '#eff6ff', borderColor: '#1b2b4c' },
  typeText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  typeTextActive: { color: '#1b2b4c' },
  submitBtn: { backgroundColor: '#1b2b4c', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default AnnouncementsScreen;
