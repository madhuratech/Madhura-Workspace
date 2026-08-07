import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Download, FileImage, File, Folder, FolderOpen } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext, API_URL } from '../context/AuthContext';

const FILE_TYPE_CONFIG = {
  pdf:   { bg: '#FEF2F2', iconColor: '#DC2626', Icon: FileText,  label: 'PDF'      },
  doc:   { bg: '#EFF6FF', iconColor: '#2563EB', Icon: FileText,  label: 'Document' },
  image: { bg: '#F0FDF4', iconColor: '#16A34A', Icon: FileImage, label: 'Image'    },
  other: { bg: '#F8FAFC', iconColor: '#64748B', Icon: File,      label: 'File'     },
};

const FOLDER_COLORS = {
  'Employee Docs': { bg: '#FCE7F3', icon: '#DB2777', border: '#FBCFE8' },
  'Project Files': { bg: '#E0E7FF', icon: '#1b2b4c', border: '#C7D2FE' },
  'General': { bg: '#DBEAFE', icon: '#2563EB', border: '#BFDBFE' }
};

function getFileType(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('text')) return 'doc';
  if (mimeType.includes('image')) return 'image';
  return 'other';
}

function formatFileSize(bytes) {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const DocCard = ({ item, onDownload }) => {
  const fileType = getFileType(item.mimeType);
  const cfg = FILE_TYPE_CONFIG[fileType];
  const { Icon } = cfg;

  return (
    <View style={styles.card}>
      <View style={[styles.fileIconWrap, { backgroundColor: cfg.bg }]}>
        <Icon color={cfg.iconColor} size={24} strokeWidth={1.8} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileTitle} numberOfLines={1}>{item.title}</Text>
        {item.originalName && (
          <Text style={styles.fileName} numberOfLines={1}>{item.originalName}</Text>
        )}
        <View style={styles.fileMeta}>
          <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typeBadgeText, { color: cfg.iconColor }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{formatFileSize(item.size)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>
            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
      {item.fileUrl && (
        <TouchableOpacity style={styles.downloadBtn} onPress={() => onDownload(item.fileUrl)}>
          <Download color="#1b2b4c" size={18} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function DocumentsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFolder, setActiveFolder] = useState(null);

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get('/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDownload = (fileUrl) => {
    if (fileUrl) {
      const fullUrl = API_URL.replace('/api', '') + fileUrl;
      Linking.openURL(fullUrl).catch(err => console.error('Failed to open URL', err));
    }
  };

  const availableFolders = Array.from(new Set(documents.map(d => d.folderType || 'General')));
  if (availableFolders.length === 0) {
    if (user?.role === 'hr' || user?.role === 'super_admin') availableFolders.push('Employee Docs');
    if (user?.role === 'team_leader' || user?.role === 'super_admin') availableFolders.push('Project Files');
    availableFolders.push('General');
  }

  const filteredDocs = activeFolder ? documents.filter(d => (d.folderType || 'General') === activeFolder) : documents;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1b2b4c" size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Documents</Text>
          <Text style={styles.headerSub}>{documents.length} file{documents.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Folders List Horizontal */}
      <View style={styles.foldersWrapper}>
         <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={availableFolders}
            keyExtractor={item => item}
            contentContainerStyle={styles.foldersContainer}
            renderItem={({ item }) => {
              const isActive = activeFolder === item;
              const colorCfg = FOLDER_COLORS[item] || FOLDER_COLORS['General'];
              return (
                <TouchableOpacity 
                  style={[styles.folderCard, isActive && { borderColor: colorCfg.icon, backgroundColor: colorCfg.bg }]}
                  onPress={() => setActiveFolder(isActive ? null : item)}
                >
                   <View style={[styles.folderIconBox, { backgroundColor: isActive ? '#fff' : colorCfg.bg }]}>
                      {isActive ? <FolderOpen color={colorCfg.icon} size={20} /> : <Folder color={colorCfg.icon} size={20} />}
                   </View>
                   <Text style={[styles.folderText, isActive && { color: colorCfg.icon }]}>{item}</Text>
                </TouchableOpacity>
              )
            }}
         />
      </View>

      <View style={styles.listHeader}>
         <Text style={styles.listHeaderTitle}>{activeFolder ? `${activeFolder} Files` : 'All Files'}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1b2b4c" />
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={item => item._id}
          renderItem={({ item }) => <DocCard item={item} onDownload={handleDownload} />}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchDocuments(); }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <File color="#CBD5E1" size={52} />
              <Text style={styles.emptyTitle}>This folder is empty</Text>
              <Text style={styles.emptySub}>No documents found in {activeFolder || 'here'}.</Text>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1b2b4c' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  foldersWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12
  },
  foldersContainer: {
    paddingHorizontal: 16,
    gap: 12
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 10,
    paddingRight: 16
  },
  folderIconBox: {
    padding: 8,
    borderRadius: 10,
    marginRight: 10
  },
  folderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  },

  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1b2b4c'
  },

  listContent: { padding: 16, paddingTop: 4, paddingBottom: 100 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  fileIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  fileInfo: { flex: 1 },
  fileTitle: { fontSize: 15, fontWeight: '700', color: '#1b2b4c', marginBottom: 2 },
  fileName: { fontSize: 12, color: '#94A3B8', marginBottom: 6 },
  fileMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  typeBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  metaDot: { fontSize: 12, color: '#CBD5E1', marginHorizontal: 5 },
  metaText: { fontSize: 11, color: '#94A3B8' },
  downloadBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF',
    borderWidth: 1, borderColor: '#BFDBFE', justifyContent: 'center', alignItems: 'center',
    marginLeft: 10,
  },

  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginTop: 16, marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
});
