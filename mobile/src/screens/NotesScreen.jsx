import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, ActivityIndicator, Modal, Image, 
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Image as ImageIcon, Pin, Trash2, ArrowLeft } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext, API_URL } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const COLORS = [
  '#ffffff', // White
  '#fecaca', // Red
  '#fde68a', // Yellow
  '#bbf7d0', // Green
  '#bfdbfe', // Blue
  '#e9d5ff', // Purple
  '#fbcfe8', // Pink
];

export default function NotesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [isPinned, setIsPinned] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchWorkspaceAndNotes();
  }, []);

  const fetchWorkspaceAndNotes = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        setWorkspace(ws);
        const notesRes = await axios.get(`/workspaces/${ws._id}/notes`);
        setNotes(notesRes.data);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (note = null) => {
    if (note) {
      setEditingNoteId(note._id);
      setTitle(note.title);
      setContent(note.content);
      setColor(note.color || '#ffffff');
      setIsPinned(note.isPinned);
      setAttachment(note.attachments?.[0] || null);
    } else {
      setEditingNoteId(null);
      setTitle('');
      setContent('');
      setColor('#ffffff');
      setIsPinned(false);
      setAttachment(null);
    }
    setModalVisible(true);
  };

  const closeForm = () => {
    setModalVisible(false);
    setEditingNoteId(null);
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim() && !attachment) {
      closeForm();
      return;
    }

    try {
      const payload = { title, content, color, isPinned, attachment: attachment && !attachment._id ? attachment : undefined };
      
      if (editingNoteId) {
        const res = await axios.put(`/workspaces/${workspace._id}/notes/${editingNoteId}`, payload);
        setNotes(prev => prev.map(n => n._id === editingNoteId ? res.data : n));
      } else {
        const res = await axios.post(`/workspaces/${workspace._id}/notes`, payload);
        setNotes([res.data, ...notes]);
      }
      closeForm();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await axios.delete(`/workspaces/${workspace._id}/notes/${id}`);
          setNotes(prev => prev.filter(n => n._id !== id));
        } catch (err) {
          console.error(err);
          Alert.alert('Error', 'Failed to delete note');
        }
      }}
    ]);
  };

  const togglePin = async (id, currentStatus) => {
    try {
      const res = await axios.put(`/workspaces/${workspace._id}/notes/${id}`, { isPinned: !currentStatus });
      setNotes(prev => prev.map(n => n._id === id ? res.data : n).sort((a, b) => b.isPinned - a.isPinned));
    } catch (err) {
      console.error(err);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingImage(true);
      const fileUri = result.assets[0].uri;
      const fileName = fileUri.split('/').pop();
      const match = /\.(\w+)$/.exec(fileName);
      const type = match ? `image/${match[1]}` : `image`;

      const formData = new FormData();
      formData.append('file', { uri: fileUri, name: fileName, type });

      try {
        const uploadRes = await axios.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setAttachment({
          url: uploadRes.data.url,
          fileName: fileName,
          fileType: type
        });
      } catch (err) {
        console.error('Upload error', err);
        Alert.alert('Upload Failed', 'Could not upload image');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const renderNote = ({ item }) => (
    <TouchableOpacity 
      style={[styles.noteCard, { backgroundColor: item.color || '#ffffff' }]} 
      onPress={() => openForm(item)}
      activeOpacity={0.8}
    >
      {item.attachments && item.attachments.length > 0 && (
        <Image source={{ uri: item.attachments[0].url }} style={styles.cardImage} />
      )}
      <View style={styles.cardContent}>
        {item.title ? <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text> : null}
        {item.content ? <Text style={styles.cardText} numberOfLines={5}>{item.content}</Text> : null}
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => togglePin(item._id, item.isPinned)} style={styles.iconBtn}>
            <Pin size={14} color={item.isPinned ? '#3B82F6' : '#94A3B8'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconBtn}>
            <Trash2 size={14} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0F172A" size={22} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Quick Notes</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={item => item._id}
          renderItem={renderNote}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptySub}>Capture ideas, save screenshots, and organize your thoughts.</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => openForm()} activeOpacity={0.8}>
        <Plus color="#fff" size={24} strokeWidth={3} />
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleSave}>
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalHeader, { backgroundColor: color }]}>
            <TouchableOpacity onPress={handleSave} style={styles.modalCloseBtn}>
              <ArrowLeft color="#0F172A" size={24} />
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsPinned(!isPinned)} style={styles.modalIconBtn}>
                <Pin color={isPinned ? '#3B82F6' : '#64748B'} size={22} />
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} style={styles.modalIconBtn}>
                <ImageIcon color="#64748B" size={22} />
                {uploadingImage && <ActivityIndicator size="small" color="#3B82F6" style={StyleSheet.absoluteFill} />}
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={[styles.modalBody, { backgroundColor: color }]} contentContainerStyle={styles.modalBodyContent}>
            <TextInput
              style={styles.inputTitle}
              placeholder="Title"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.inputContent}
              placeholder="Take a note..."
              placeholderTextColor="#94A3B8"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
            {attachment && (
              <View style={styles.attachmentPreview}>
                <Image source={{ uri: attachment.url }} style={styles.previewImg} />
                <TouchableOpacity style={styles.removeImgBtn} onPress={() => setAttachment(null)}>
                  <X color="#fff" size={16} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { backgroundColor: color }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorsList}>
              {COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorCircle, { backgroundColor: c }, color === c && styles.colorSelected]}
                  onPress={() => setColor(c)}
                />
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  listContent: { padding: 12, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },
  
  noteCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardImage: { width: '100%', height: 100, resizeMode: 'cover' },
  cardContent: { padding: 12, minHeight: 60 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  cardText: { fontSize: 13, color: '#475569', lineHeight: 18 },
  cardFooter: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' 
  },
  cardDate: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 4, marginLeft: 4 },
  
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 40 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  modalCloseBtn: { padding: 4 },
  modalActions: { flexDirection: 'row', alignItems: 'center' },
  modalIconBtn: { padding: 8, marginLeft: 8 },
  
  modalBody: { flex: 1 },
  modalBodyContent: { padding: 16, paddingBottom: 40 },
  inputTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  inputContent: { fontSize: 16, color: '#334155', lineHeight: 24, minHeight: 150 },
  
  attachmentPreview: { marginTop: 16, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  previewImg: { width: '100%', height: 200, resizeMode: 'cover' },
  removeImgBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center'
  },
  
  modalFooter: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingVertical: 12 },
  colorsList: { paddingHorizontal: 16, alignItems: 'center' },
  colorCircle: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
    marginRight: 12,
  },
  colorSelected: { borderWidth: 2, borderColor: '#3B82F6' }
});
