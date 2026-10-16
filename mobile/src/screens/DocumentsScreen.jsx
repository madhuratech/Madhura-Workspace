import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  FileText,
  Download,
  FileImage,
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  X,
  Search,
  UploadCloud,
  User,
  Shield,
  FileSpreadsheet,
} from 'lucide-react-native';
import axios from 'axios';
import { AuthContext, API_URL } from '../context/AuthContext';

const PRIMARY = '#1b2b4c';
const ACCENT = '#ffca22';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FILE_TYPE_CONFIG = {
  pdf:   { bg: '#FEF2F2', iconColor: '#DC2626', Icon: FileText,  label: 'PDF'      },
  doc:   { bg: '#EFF6FF', iconColor: '#2563EB', Icon: FileText,  label: 'DOC'      },
  sheet: { bg: '#F0FDF4', iconColor: '#16A34A', Icon: FileSpreadsheet, label: 'SHEET' },
  image: { bg: '#FDF4FF', iconColor: '#9333EA', Icon: FileImage, label: 'IMAGE'    },
  other: { bg: '#F8FAFC', iconColor: '#64748B', Icon: File,      label: 'FILE'     },
};

const FOLDER_COLORS = {
  'Employee Docs': { bg: '#FCE7F3', icon: '#DB2777', border: '#FBCFE8' },
  'Project Files': { bg: '#E0E7FF', icon: '#1b2b4c', border: '#C7D2FE' },
  'General':       { bg: '#DBEAFE', icon: '#2563EB', border: '#BFDBFE' },
};

const FOLDER_OPTIONS = ['General', 'Employee Docs', 'Project Files'];

function getFileType(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') return 'other';
  const lower = mimeType.toLowerCase();
  if (lower.includes('pdf')) return 'pdf';
  if (lower.includes('word') || lower.includes('document') || lower.includes('text') || lower.includes('msword')) return 'doc';
  if (lower.includes('sheet') || lower.includes('excel') || lower.includes('csv')) return 'sheet';
  if (lower.includes('image')) return 'image';
  return 'other';
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] || 'MB'}`;
}

function formatDateSafe(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return '—';
  }
}

const DocCard = ({ item, currentUserId, isManagementUser, onDownload, onDelete }) => {
  if (!item) return null;

  const fileType = getFileType(item.mimeType);
  const cfg = FILE_TYPE_CONFIG[fileType] || FILE_TYPE_CONFIG.other;
  const IconComponent = cfg.Icon || File;

  const authorId = item.author?._id ? String(item.author._id) : (item.author ? String(item.author) : null);
  const isAuthor = authorId && String(authorId) === String(currentUserId);
  const canDelete = isManagementUser || isAuthor;

  const authorRole = item.author?.role || '';
  const isMgmtAuthor = authorRole === 'super_admin' || authorRole === 'hr';
  const authorName = item.author?.name || 'Unknown';

  const folderName = item.folderType || 'General';
  const folderCfg = FOLDER_COLORS[folderName] || FOLDER_COLORS.General;

  return (
    <View style={styles.card}>
      <View style={[styles.fileIconWrap, { backgroundColor: cfg.bg }]}>
        <IconComponent color={cfg.iconColor} size={22} strokeWidth={2} />
      </View>

      <View style={styles.fileInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.fileTitle} numberOfLines={1}>{item.title || 'Untitled Document'}</Text>
          <View style={[styles.folderBadge, { backgroundColor: folderCfg.bg }]}>
            <Text style={[styles.folderBadgeText, { color: folderCfg.icon }]}>
              {folderName}
            </Text>
          </View>
        </View>

        {item.originalName ? (
          <Text style={styles.fileName} numberOfLines={1}>{item.originalName}</Text>
        ) : null}

        {/* Author badge: Essential for MD & HR to see who uploaded */}
        <View style={styles.authorRow}>
          <User color="#64748B" size={11} style={{ marginRight: 4 }} />
          <Text style={styles.authorName} numberOfLines={1}>
            {isAuthor ? 'You' : authorName}
          </Text>
          {authorRole ? (
            <View style={[styles.authorRoleBadge, isMgmtAuthor && { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.authorRoleText, isMgmtAuthor && { color: '#B45309' }]}>
                {authorRole === 'super_admin' ? 'MD' : authorRole === 'hr' ? 'HR' : authorRole === 'team_leader' ? 'TL' : 'Employee'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.fileMeta}>
          <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typeBadgeText, { color: cfg.iconColor }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{formatFileSize(item.size)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{formatDateSafe(item.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        {item.fileUrl ? (
          <TouchableOpacity 
            style={styles.actionIconBtn} 
            onPress={() => onDownload(item.fileUrl)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Download color="#1b2b4c" size={16} strokeWidth={2.2} />
          </TouchableOpacity>
        ) : null}

        {canDelete ? (
          <TouchableOpacity 
            style={[styles.actionIconBtn, styles.deleteActionBtn]} 
            onPress={() => onDelete(item._id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Trash2 color="#EF4444" size={15} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

class DocumentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('DocumentErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1b2b4c', marginBottom: 8 }}>Documents</Text>
          <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20 }}>
            Unable to load documents repository.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#1b2b4c', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
              onPress={() => this.props.navigation?.goBack?.()}
            >
              <Text style={{ color: '#475569', fontWeight: '700' }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function DocumentsContent({ navigation }) {
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFolder, setActiveFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('General');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Keyboard avoidance
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => { 
    fetchDocuments(); 
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/documents');
      if (Array.isArray(res.data)) {
        setDocuments(res.data);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const isManagementUser = 
    user?.role === 'super_admin' || 
    user?.role === 'hr' || 
    (user?.designation && ['managing director', 'md', 'hr', 'human resources'].some(d => user.designation.toLowerCase().includes(d)));

  const handleDownload = (fileUrl) => {
    if (fileUrl) {
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : (API_URL.replace('/api', '') + fileUrl);
      Linking.openURL(fullUrl).catch(err => console.error('Failed to open URL', err));
    }
  };

  const handleDelete = (docId) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`/documents/${docId}`);
              setDocuments(prev => prev.filter(d => d._id !== docId));
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete document');
            }
          }
        }
      ]
    );
  };

  const handlePickFile = async () => {
    try {
      let docPicker = null;
      try {
        docPicker = require('expo-document-picker');
      } catch (e) {
        console.log('[Documents] expo-document-picker module not found:', e?.message);
      }

      if (docPicker && typeof docPicker.getDocumentAsync === 'function') {
        const res = await docPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        if (!res.canceled && res.assets && res.assets.length > 0) {
          setSelectedFile(res.assets[0]);
          return;
        }
      } else {
        // Fallback: use ImagePicker if DocumentPicker native module is not linked in this binary
        let imgPicker = null;
        try {
          imgPicker = require('expo-image-picker');
        } catch (e) {}

        if (imgPicker && typeof imgPicker.launchImageLibraryAsync === 'function') {
          const res = await imgPicker.launchImageLibraryAsync({
            quality: 0.8,
          });
          if (!res.canceled && res.assets && res.assets.length > 0) {
            const asset = res.assets[0];
            setSelectedFile({
              uri: asset.uri,
              name: asset.fileName || `doc_${Date.now()}.jpg`,
              mimeType: asset.mimeType || 'image/jpeg',
              size: asset.fileSize || 0,
            });
          }
        } else {
          Alert.alert('Notice', 'File picking is not supported on this device build.');
        }
      }
    } catch (err) {
      console.log('Error picking file:', err);
      Alert.alert('Notice', 'Could not open file picker on this device.');
    }
  };

  const handleUploadSubmit = async () => {
    if (!docTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a name for the document.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('File Required', 'Please choose a file to upload.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      const uri = Platform.OS === 'ios' ? selectedFile.uri.replace('file://', '') : selectedFile.uri;
      formData.append('file', {
        uri,
        name: selectedFile.name || 'document',
        type: selectedFile.mimeType || 'application/octet-stream',
      });

      const uploadRes = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { url, fileName, fileType } = uploadRes.data;

      await axios.post('/documents', {
        title: docTitle.trim(),
        content: docNotes.trim(),
        folderType: selectedFolder,
        fileUrl: url,
        originalName: fileName || selectedFile.name,
        mimeType: fileType || selectedFile.mimeType || 'application/octet-stream',
        size: selectedFile.size || 0,
      });

      Alert.alert('Success', 'Document uploaded successfully!');
      setIsUploadModalOpen(false);
      setDocTitle('');
      setDocNotes('');
      setSelectedFile(null);
      setSelectedFolder('General');
      fetchDocuments();
    } catch (err) {
      console.error('Upload document error:', err);
      Alert.alert('Upload Failed', err.response?.data?.message || err.message || 'Could not upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const folderList = ['All', ...FOLDER_OPTIONS];

  // Safe document array filter
  const safeDocs = Array.isArray(documents) ? documents : [];

  let filteredDocs = activeFolder && activeFolder !== 'All'
    ? safeDocs.filter(d => (d.folderType || 'General') === activeFolder) 
    : safeDocs;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredDocs = filteredDocs.filter(d => 
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.originalName && d.originalName.toLowerCase().includes(q)) ||
      (d.author?.name && d.author.name.toLowerCase().includes(q))
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs');
              }
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft color="#1b2b4c" size={20} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Documents</Text>
            <Text style={styles.headerSub}>
              {isManagementUser ? 'Company Repository' : 'My Files & Shared'} · {safeDocs.length} file{safeDocs.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Upload Button: Visible to ALL roles */}
        <TouchableOpacity 
          style={styles.uploadHeaderBtn} 
          onPress={() => setIsUploadModalOpen(true)}
          activeOpacity={0.8}
        >
          <Plus color="#ffffff" size={15} strokeWidth={2.5} style={{ marginRight: 4 }} />
          <Text style={styles.uploadHeaderBtnText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchInputBox}>
          <Search color="#94A3B8" size={16} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents or employees..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X color="#94A3B8" size={16} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Folders Filter Chips */}
      <View style={styles.foldersWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={folderList}
          keyExtractor={item => item}
          contentContainerStyle={styles.foldersContainer}
          renderItem={({ item }) => {
            const isActive = (!activeFolder && item === 'All') || activeFolder === item;
            const colorCfg = FOLDER_COLORS[item] || { bg: '#F1F5F9', icon: '#1b2b4c', border: '#E2E8F0' };
            return (
              <TouchableOpacity 
                style={[
                  styles.folderCard, 
                  isActive && { borderColor: PRIMARY, backgroundColor: item === 'All' ? PRIMARY : colorCfg.bg }
                ]}
                onPress={() => setActiveFolder(item === 'All' ? null : item)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.folderIconBox, 
                  { backgroundColor: isActive ? (item === 'All' ? '#ffffff20' : '#ffffff') : colorCfg.bg }
                ]}>
                  {isActive 
                    ? <FolderOpen color={item === 'All' ? '#ffffff' : colorCfg.icon} size={16} /> 
                    : <Folder color={colorCfg.icon} size={16} />
                  }
                </View>
                <Text style={[
                  styles.folderText, 
                  isActive && { color: item === 'All' ? '#ffffff' : colorCfg.icon, fontWeight: '700' }
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List Header Bar */}
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderTitle}>
          {activeFolder && activeFolder !== 'All' ? `${activeFolder}` : 'All Files'} ({filteredDocs.length})
        </Text>
        {isManagementUser ? (
          <View style={styles.adminIndicatorPill}>
            <Shield color="#D97706" size={11} style={{ marginRight: 4 }} />
            <Text style={styles.adminIndicatorText}>MD / HR Access</Text>
          </View>
        ) : null}
      </View>

      {/* Documents List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1b2b4c" />
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={item => item._id || String(Math.random())}
          renderItem={({ item }) => (
            <DocCard 
              item={item} 
              currentUserId={user?._id}
              isManagementUser={isManagementUser}
              onDownload={handleDownload} 
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchDocuments(); }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <File color="#94A3B8" size={36} />
              </View>
              <Text style={styles.emptyTitle}>No Documents Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery 
                  ? 'No documents matched your search query.' 
                  : `There are currently no files in ${activeFolder || 'this folder'}.`}
              </Text>
              <TouchableOpacity 
                style={styles.emptyUploadBtn}
                onPress={() => setIsUploadModalOpen(true)}
                activeOpacity={0.85}
              >
                <Plus color="#ffffff" size={15} strokeWidth={2.5} style={{ marginRight: 6 }} />
                <Text style={styles.emptyUploadBtnText}>Upload First Document</Text>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Redesigned Premium Upload Modal */}
      <Modal 
        visible={isUploadModalOpen} 
        transparent 
        animationType="slide" 
        statusBarTranslucent
        onRequestClose={() => setIsUploadModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalBottomContainer, { paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }]}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
              style={{ width: '100%' }}
            >
              <View style={[
                styles.modalContent,
                keyboardHeight > 0 && { maxHeight: Math.max(340, SCREEN_HEIGHT - keyboardHeight - 40) }
              ]}>
                {/* Modern Drag Handle */}
                <View style={styles.modalDragHandle} />

                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  keyboardShouldPersistTaps="handled" 
                  keyboardDismissMode="on-drag"
                  bounces={false}
                >
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.uploadModalIconBox}>
                        <UploadCloud color="#1b2b4c" size={20} />
                      </View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.modalTitle}>Upload Document</Text>
                        <Text style={styles.modalSub}>
                          {isManagementUser ? 'Saved to workspace repository' : 'Attach records & files for review'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setIsUploadModalOpen(false)} style={styles.modalCloseBtn}>
                      <X color="#475569" size={18} />
                    </TouchableOpacity>
                  </View>

                  {/* Title */}
                  <Text style={styles.inputLabel}>Document Name *</Text>
                  <TextInput 
                    style={styles.textInput}
                    placeholder="e.g. Identity Proof, Contract, Report..."
                    placeholderTextColor="#94A3B8"
                    value={docTitle}
                    onChangeText={setDocTitle}
                  />

                  {/* Folder */}
                  <Text style={styles.inputLabel}>Folder Category</Text>
                  <View style={styles.folderSelectRow}>
                    {FOLDER_OPTIONS.map((fName) => {
                      const isSel = selectedFolder === fName;
                      return (
                        <TouchableOpacity
                          key={fName}
                          onPress={() => setSelectedFolder(fName)}
                          style={[
                            styles.folderSelectChip,
                            isSel && styles.folderSelectChipActive
                          ]}
                          activeOpacity={0.7}
                        >
                          <Folder color={isSel ? '#ffffff' : '#64748B'} size={14} style={{ marginRight: 6 }} />
                          <Text style={[styles.folderSelectText, isSel && styles.folderSelectTextActive]}>
                            {fName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Attachment Box */}
                  <Text style={styles.inputLabel}>Select File *</Text>
                  {selectedFile ? (
                    <View style={styles.selectedFileBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={styles.selectedFileIconBox}>
                          <FileText color="#166534" size={20} />
                        </View>
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.selectedFileName} numberOfLines={1}>
                            {selectedFile.name}
                          </Text>
                          <Text style={styles.selectedFileSize}>
                            {formatFileSize(selectedFile.size)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        onPress={() => setSelectedFile(null)} 
                        style={styles.removeFileBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X color="#EF4444" size={16} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.pickFileBox} 
                      onPress={handlePickFile}
                      activeOpacity={0.8}
                    >
                      <View style={styles.pickFileIconCircle}>
                        <UploadCloud color="#1b2b4c" size={22} />
                      </View>
                      <Text style={styles.pickFileMainText}>Tap to Browse Files</Text>
                      <Text style={styles.pickFileSubText}>
                        PDF, Word, Excel, Images (up to 15MB)
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Notes */}
                  <Text style={[styles.inputLabel, { marginTop: 14 }]}>Notes (Optional)</Text>
                  <TextInput 
                    style={[styles.textInput, { height: 70 }]}
                    placeholder="Add brief details about this file..."
                    placeholderTextColor="#94A3B8"
                    value={docNotes}
                    onChangeText={setDocNotes}
                    multiline
                  />

                  {/* Submit Button */}
                  <TouchableOpacity 
                    style={[styles.submitUploadBtn, isUploading && { opacity: 0.8 }]} 
                    onPress={handleUploadSubmit}
                    disabled={isUploading}
                    activeOpacity={0.85}
                  >
                    {isUploading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 8 }} />
                        <Text style={styles.submitUploadBtnText}>Uploading...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <UploadCloud color="#ffffff" size={17} style={{ marginRight: 8 }} />
                        <Text style={styles.submitUploadBtnText}>Save & Upload Document</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function DocumentsScreen(props) {
  return (
    <DocumentErrorBoundary navigation={props.navigation}>
      <DocumentsContent {...props} />
    </DocumentErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
  },
  headerTitle: { fontSize: 19, fontWeight: '800', color: '#1b2b4c' },
  headerSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  
  uploadHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b2b4c',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 9,
    shadowColor: '#1b2b4c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  uploadHeaderBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  searchBarWrapper: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  foldersWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 9,
  },
  foldersContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  folderIconBox: {
    padding: 5,
    borderRadius: 7,
    marginRight: 7,
  },
  folderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1b2b4c',
  },
  adminIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },

  listContent: { 
    padding: 16, 
    paddingTop: 4, 
    paddingBottom: 100 
  },

  card: {
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: '#fff',
    borderRadius: 14, 
    padding: 13, 
    marginBottom: 10,
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    shadowColor: '#1b2b4c', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, 
    shadowRadius: 6, 
    elevation: 2,
  },
  fileIconWrap: {
    width: 44, 
    height: 44, 
    borderRadius: 12,
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 11,
    marginTop: 2,
  },
  fileInfo: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  fileTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1b2b4c', 
    flex: 1, 
    marginRight: 6 
  },
  folderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  folderBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  fileName: { 
    fontSize: 11, 
    color: '#94A3B8', 
    marginBottom: 4 
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  authorName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginRight: 6,
  },
  authorRoleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  authorRoleText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  fileMeta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap' 
  },
  typeBadge: {
    paddingHorizontal: 5, 
    paddingVertical: 1, 
    borderRadius: 4,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '700' },
  metaDot: { fontSize: 11, color: '#CBD5E1', marginHorizontal: 4 },
  metaText: { fontSize: 11, color: '#94A3B8' },

  cardActions: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: 8,
    gap: 6,
  },
  actionIconBtn: {
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    backgroundColor: '#EFF6FF',
    borderWidth: 1, 
    borderColor: '#BFDBFE', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  deleteActionBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },

  emptyBox: { 
    alignItems: 'center', 
    marginTop: 50, 
    paddingHorizontal: 40 
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#334155', 
    marginBottom: 4 
  },
  emptySub: { 
    fontSize: 12, 
    color: '#94A3B8', 
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b2b4c',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  emptyUploadBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(17,24,39,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalBottomContainer: { 
    width: '100%', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    padding: 22, 
    paddingBottom: 32, 
    backgroundColor: '#ffffff', 
    maxHeight: '90%', 
    width: '100%' 
  },
  modalDragHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  uploadModalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  modalSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    fontSize: 13,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    color: '#0F172A',
  },
  folderSelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  folderSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  folderSelectChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  folderSelectText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  folderSelectTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pickFileBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  pickFileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  pickFileMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1b2b4c',
  },
  pickFileSubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 11,
  },
  selectedFileIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  selectedFileSize: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 1,
  },
  removeFileBtn: {
    padding: 5,
    backgroundColor: '#FEE2E2',
    borderRadius: 7,
  },
  submitUploadBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitUploadBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
