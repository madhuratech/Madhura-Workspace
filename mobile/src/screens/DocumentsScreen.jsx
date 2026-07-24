import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Download, FileImage, File } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext, API_URL } from '../context/AuthContext';

const FILE_TYPE_CONFIG = {
  pdf:   { bg: '#FEF2F2', iconColor: '#DC2626', Icon: FileText,  label: 'PDF'      },
  doc:   { bg: '#EFF6FF', iconColor: '#2563EB', Icon: FileText,  label: 'Document' },
  image: { bg: '#F0FDF4', iconColor: '#16A34A', Icon: FileImage, label: 'Image'    },
  other: { bg: '#F8FAFC', iconColor: '#64748B', Icon: File,      label: 'File'     },
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
          {item.author?.name && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText} numberOfLines={1}>{item.author.name.split(' ')[0]}</Text>
            </>
          )}
        </View>
      </View>
      {item.fileUrl && (
        <TouchableOpacity style={styles.downloadBtn} onPress={() => onDownload(item.fileUrl)}>
          <Download color="#3B82F6" size={18} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function DocumentsScreen({ navigation }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0F172A" size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Documents</Text>
          <Text style={styles.headerSub}>{documents.length} file{documents.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={item => item._id}
          renderItem={({ item }) => <DocCard item={item} onDownload={handleDownload} />}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchDocuments(); }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <File color="#CBD5E1" size={52} />
              <Text style={styles.emptyTitle}>No documents found</Text>
              <Text style={styles.emptySub}>Uploaded documents will appear here.</Text>
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
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  fileIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  fileInfo: { flex: 1 },
  fileTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
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

  emptyBox: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginTop: 16, marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
});
