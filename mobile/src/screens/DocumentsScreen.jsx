import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Download, FileImage, FileCode, File, Search } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext, API_URL } from '../context/AuthContext';

export default function DocumentsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get('/documents');
      setDocuments(res.data);
    } catch (error) {
      console.error(error);
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FileText color="#94A3B8" size={24} />;
    if (mimeType.includes('pdf')) return <FileText color="#EF4444" size={24} />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText color="#3B82F6" size={24} />;
    if (mimeType.includes('image')) return <FileImage color="#10B981" size={24} />;
    return <File color="#64748B" size={24} />;
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.docCard}>
        <View style={styles.iconContainer}>
          {getFileIcon(item.mimeType)}
        </View>
        <View style={styles.detailsCol}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {item.originalName && (
            <Text style={styles.subtitle} numberOfLines={1}>{item.originalName}</Text>
          )}
          
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{formatFileSize(item.size)}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            {item.author?.name && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText} numberOfLines={1}>{item.author.name}</Text>
              </>
            )}
          </View>
        </View>
        
        {item.fileUrl && (
          <TouchableOpacity 
            style={styles.downloadBtn} 
            onPress={() => handleDownload(item.fileUrl)}
          >
            <Download color="#3B82F6" size={20} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#64748B" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : documents.length === 0 ? (
        <View style={styles.center}>
          <FileText size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No documents found</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchDocuments();
          }}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  listContent: { padding: 16, paddingBottom: 100 },
  
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  metaDot: {
    fontSize: 12,
    color: '#CBD5E1',
    marginHorizontal: 6,
  },
  downloadBtn: {
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginLeft: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
});
