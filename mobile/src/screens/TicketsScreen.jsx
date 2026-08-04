import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, X, Send, Plus } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
const COLORS = {
  primary: '#5B5BD6',
  white: '#FFFFFF',
  background: '#F8FAFC',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: '#F1F5F9',
};
const SIZES = { radius: 12 };
const FONTS = { bold: 'System', semiBold: 'System', medium: 'System', regular: 'System' };
const SHADOWS = { small: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 } };

const TicketsScreen = () => {
  const { user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'Medium', department: 'General' });
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/tickets');
      setTickets(res.data);
    } catch (error) {
      console.error('Error fetching tickets', error);
      Alert.alert('Error', 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!formData.title || !formData.description) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }
    
    try {
      const res = await axios.post('/tickets', formData);
      setTickets([res.data, ...tickets]);
      setShowCreateModal(false);
      setFormData({ title: '', description: '', priority: 'Medium', department: 'General' });
    } catch (error) {
      console.error('Error creating ticket', error);
      Alert.alert('Error', 'Failed to create ticket');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await axios.put(`/tickets/${id}`, { status: newStatus });
      setTickets(tickets.map(t => t._id === id ? res.data : t));
      if (selectedTicket && selectedTicket._id === id) {
        setSelectedTicket(res.data);
      }
    } catch (error) {
      console.error('Error updating status', error);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedTicket) return;
    try {
      const res = await axios.post(`/tickets/${selectedTicket._id}/comments`, { text: commentText });
      setTickets(tickets.map(t => t._id === selectedTicket._id ? res.data : t));
      setSelectedTicket(res.data);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment', error);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Open': return '#eab308';
      case 'In Progress': return '#3b82f6';
      case 'Resolved': return '#22c55e';
      case 'Closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const renderTicketItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.ticketCard}
      onPress={() => setSelectedTicket(item)}
    >
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.statusBadge, { borderColor: getStatusColor(item.status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.ticketDesc} numberOfLines={2}>{item.description}</Text>
      
      <View style={styles.ticketFooter}>
        <View style={styles.footerItem}>
          <Clock size={12} color="#6b7280" />
          <Text style={styles.footerText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Text style={[styles.priorityText, { color: item.priority === 'High' ? '#ef4444' : item.priority === 'Medium' ? '#f97316' : '#22c55e' }]}>
          {item.priority}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderDetailsModal = () => (
    <Modal visible={!!selectedTicket} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        {selectedTicket && (
          <>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedTicket(null)} style={styles.closeBtn}>
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Ticket Details</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.detailCard}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.detailTitle}>{selectedTicket.title}</Text>
                </View>
                
                <View style={styles.metaRow}>
                  <View style={[styles.statusBadge, { borderColor: getStatusColor(selectedTicket.status), marginRight: 10 }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedTicket.status) }]}>{selectedTicket.status}</Text>
                  </View>
                  <Text style={styles.metaText}>Dept: {selectedTicket.department}</Text>
                </View>

                <Text style={styles.detailDesc}>{selectedTicket.description}</Text>
              </View>

              {/* Status Update (if HR/Admin or Creator can close) */}
              <View style={styles.actionCard}>
                <Text style={styles.sectionTitle}>Update Status</Text>
                <View style={styles.statusBtnsRow}>
                  {['Open', 'In Progress', 'Resolved', 'Closed'].map(status => (
                     <TouchableOpacity 
                       key={status}
                       style={[
                         styles.statusBtn, 
                         selectedTicket.status === status && { backgroundColor: getStatusColor(status), borderColor: getStatusColor(status) }
                       ]}
                       onPress={() => handleStatusChange(selectedTicket._id, status)}
                       disabled={user?.role === 'employee' && status !== 'Closed' && selectedTicket.status !== status} // Simplistic check
                     >
                       <Text style={[styles.statusBtnText, selectedTicket.status === status && { color: '#fff' }]}>{status}</Text>
                     </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Comments */}
              <View style={styles.commentsSection}>
                <Text style={styles.sectionTitle}>Comments</Text>
                {selectedTicket.comments?.length === 0 ? (
                  <Text style={styles.noCommentsText}>No comments yet.</Text>
                ) : (
                  selectedTicket.comments?.map((c, i) => (
                    <View key={i} style={styles.commentBubble}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{c.author?.name || 'Unknown'}</Text>
                        <Text style={styles.commentTime}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={styles.commentText}>{c.text}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* Add Comment Input */}
            {selectedTicket.status !== 'Closed' && (
              <View style={styles.commentInputWrapper}>
                <TextInput 
                  style={styles.commentInput}
                  placeholder="Type a comment..."
                  value={commentText}
                  onChangeText={setCommentText}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleAddComment}>
                  <Send size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderCreateModal = () => (
    <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.closeBtn}>
            <X size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Raise Ticket</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.formContainer}>
          <Text style={styles.inputLabel}>Title</Text>
          <TextInput 
            style={styles.input}
            placeholder="E.g. Issue with laptop"
            value={formData.title}
            onChangeText={t => setFormData({...formData, title: t})}
          />
          
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Describe the issue..."
            multiline
            numberOfLines={4}
            value={formData.description}
            onChangeText={t => setFormData({...formData, description: t})}
          />

          <View style={styles.row}>
            <View style={styles.flex1}>
               <Text style={styles.inputLabel}>Department</Text>
               <View style={styles.pickerDummy}>
                 <Text style={styles.pickerText}>{formData.department}</Text>
               </View>
            </View>
            <View style={{ width: 15 }} />
            <View style={styles.flex1}>
               <Text style={styles.inputLabel}>Priority</Text>
               <View style={styles.pickerDummy}>
                 <Text style={styles.pickerText}>{formData.priority}</Text>
               </View>
            </View>
          </View>
          <Text style={styles.hintText}>* Department and Priority selectors are simplified for this demo.</Text>

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTicket}>
            <Text style={styles.submitBtnText}>Submit Ticket</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support Tickets</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList 
          data={tickets}
          keyExtractor={item => item._id}
          renderItem={renderTicketItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No tickets found.</Text>}
        />
      )}

      {renderDetailsModal()}
      {renderCreateModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: COLORS.white, ...SHADOWS.small },
  headerTitle: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  createBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 20, paddingBottom: 100 },
  ticketCard: { backgroundColor: COLORS.white, padding: 16, borderRadius: SIZES.radius, marginBottom: 15, ...SHADOWS.small, borderWidth: 1, borderColor: COLORS.border },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketTitle: { fontSize: 16, fontFamily: FONTS.semiBold, color: COLORS.textPrimary, flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 10, fontFamily: FONTS.bold },
  ticketDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12, fontFamily: FONTS.regular },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
  priorityText: { fontSize: 12, fontFamily: FONTS.semiBold },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  closeBtn: { padding: 5 },
  modalScroll: { flex: 1 },
  detailCard: { backgroundColor: COLORS.white, padding: 20, margin: 20, borderRadius: SIZES.radius, ...SHADOWS.small },
  detailTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  metaText: { fontSize: 13, color: COLORS.textSecondary },
  detailDesc: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 24 },
  
  actionCard: { backgroundColor: COLORS.white, padding: 20, marginHorizontal: 20, marginBottom: 20, borderRadius: SIZES.radius, ...SHADOWS.small },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 15 },
  statusBtnsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  statusBtnText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  
  commentsSection: { padding: 20, paddingBottom: 100 },
  noCommentsText: { color: COLORS.textSecondary, fontStyle: 'italic' },
  commentBubble: { backgroundColor: COLORS.white, padding: 15, borderRadius: SIZES.radius, marginBottom: 10, ...SHADOWS.small },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  commentAuthor: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  commentTime: { fontSize: 12, color: COLORS.textSecondary },
  commentText: { fontSize: 14, color: COLORS.textPrimary },
  
  commentInputWrapper: { flexDirection: 'row', padding: 15, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center' },
  commentInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, fontFamily: FONTS.regular },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  
  // Form
  formContainer: { padding: 20 },
  inputLabel: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textPrimary, marginBottom: 5 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 15, fontFamily: FONTS.regular },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  pickerDummy: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 15 },
  pickerText: { color: COLORS.textPrimary, fontFamily: FONTS.regular },
  hintText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 20 },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.bold },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.textSecondary }
});

export default TicketsScreen;
