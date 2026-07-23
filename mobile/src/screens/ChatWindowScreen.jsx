import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Keyboard, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Check, CheckCheck, Smile, Paperclip, X, Image as ImageIcon, File, Video } from 'lucide-react-native';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext, API_URL } from '../context/AuthContext';
import EmojiSelector from 'react-native-emoji-selector';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export default function ChatWindowScreen({ route, navigation }) {
  const { workspaceId, channelId, channelName, isDM, otherUser } = route.params;
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    setupSocket();

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setShowEmojiPicker(false);
      setShowAttachMenu(false);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      keyboardDidShowListener.remove();
    };
  }, []);

  const setupSocket = () => {
    const socketURL = API_URL.replace('/api', '');
    const socket = io(socketURL);
    socketRef.current = socket;

    socket.on('new_message', (msg) => {
      if (msg.channel && String(msg.channel) === String(channelId)) {
        setMessages((prev) => {
          if (prev.find(m => String(m._id) === String(msg._id))) return prev;
          return [...prev, msg];
        });
      }
    });

    socket.on('message_updated', (msg) => {
       if (msg.channel && String(msg.channel) === String(channelId)) {
        setMessages((prev) => prev.map(m => String(m._id) === String(msg._id) ? msg : m));
       } else if (msg.dm && String(msg.dm) === String(channelId)) {
         setMessages((prev) => prev.map(m => String(m._id) === String(msg._id) ? msg : m));
       }
    });

    socket.on('message_deleted', ({ messageId, channelId: msgChannelId }) => {
      if (String(msgChannelId) === String(channelId)) {
        setMessages((prev) => prev.filter(m => String(m._id) !== String(messageId)));
      }
    });
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/workspaces/${workspaceId}/channels/${channelId}/messages`);
      setMessages(res.data);
      axios.post(`/workspaces/${workspaceId}/channels/${channelId}/messages/mark-read`).catch(console.error);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (customAttachment = null) => {
    if (!customAttachment && !newMessage.trim()) return;
    try {
      const payload = { 
        text: newMessage,
        attachment: customAttachment
      };
      const endpoint = isDM 
        ? `/workspaces/${workspaceId}/dms/${channelId}/messages`
        : `/workspaces/${workspaceId}/channels/${channelId}/messages`;
        
      await axios.post(endpoint, payload);
      setNewMessage('');
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  const handleFileUpload = async (type) => {
    setShowAttachMenu(false);
    try {
      let result;
      if (type === 'image' || type === 'video') {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 1,
        });
      } else {
        result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploading(true);
        
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.name || asset.fileName || 'upload.jpg',
          type: asset.mimeType || 'image/jpeg',
        });

        const uploadRes = await axios.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        await handleSend({
          url: uploadRes.data.url,
          fileType: uploadRes.data.fileType,
          fileName: uploadRes.data.fileName
        });
      }
    } catch (error) {
      console.error('Upload error', error);
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item, index }) => {
    const isMine = String(item.sender._id || item.sender) === String(user._id);
    const showHeader = index === 0 || String(messages[index - 1].sender._id || messages[index - 1].sender) !== String(item.sender._id || item.sender);
    
    return (
      <View style={[styles.msgWrapper, isMine ? styles.msgWrapperMine : styles.msgWrapperOther]}>
        {!isMine && !isDM && showHeader && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.sender?.name ? item.sender.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        )}
        {!isMine && !isDM && !showHeader && <View style={styles.avatarSpacer} />}

        <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
          {!isMine && !isDM && showHeader && (
            <Text style={styles.senderName}>{item.sender?.name || 'User'}</Text>
          )}
          
          {item.attachment && (
            <View style={styles.attachmentContainer}>
              {item.attachment.fileType?.startsWith('image/') ? (
                <Image 
                  source={{ uri: `${API_URL.replace('/api', '')}${item.attachment.url}` }} 
                  style={styles.attachmentImg} 
                  resizeMode="cover"
                />
              ) : item.attachment.fileType?.startsWith('video/') ? (
                <View style={styles.videoPlaceholder}>
                  <Video color="#fff" size={32} />
                  <Text style={{ color: '#fff', fontSize: 12, marginTop: 8 }}>Video Attachment</Text>
                  <Text style={{ color: '#fff', fontSize: 10 }}>(Open in browser to view)</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.fileCard} onPress={() => Linking.openURL(`${API_URL.replace('/api', '')}${item.attachment.url}`)}>
                  <File color={isMine ? '#fff' : '#3B82F6'} size={24} />
                  <Text style={[styles.fileName, isMine ? {color: '#fff'} : {color: '#3B82F6'}]} numberOfLines={1}>{item.attachment.fileName}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {item.text ? (
            <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextOther]}>
              {item.text}
            </Text>
          ) : null}
          
          <View style={styles.metaContainer}>
            <Text style={[styles.timeText, isMine && {color: '#DBEAFE'}]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMine && (
              item.readBy?.length > 0 || item.isRead ? (
                <CheckCheck size={14} color="#DBEAFE" style={{ marginLeft: 4 }} />
              ) : (
                <Check size={14} color="#DBEAFE" style={{ marginLeft: 4 }} />
              )
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#64748B" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isDM ? channelName : `# ${channelName}`}</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.flex1} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {showAttachMenu && (
          <View style={styles.attachMenu}>
            <TouchableOpacity style={styles.attachOption} onPress={() => handleFileUpload('image')}>
              <View style={[styles.attachIcon, {backgroundColor: '#3B82F620'}]}>
                <ImageIcon color="#3B82F6" size={24} />
              </View>
              <Text style={styles.attachText}>Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={() => handleFileUpload('video')}>
              <View style={[styles.attachIcon, {backgroundColor: '#EF444420'}]}>
                <Video color="#EF4444" size={24} />
              </View>
              <Text style={styles.attachText}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={() => handleFileUpload('file')}>
              <View style={[styles.attachIcon, {backgroundColor: '#F59E0B20'}]}>
                <File color="#F59E0B" size={24} />
              </View>
              <Text style={styles.attachText}>Document</Text>
            </TouchableOpacity>
          </View>
        )}

        {uploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.uploadingText}>Uploading file...</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => {
              Keyboard.dismiss();
              setShowAttachMenu(false);
              setShowEmojiPicker(!showEmojiPicker);
            }}
          >
            <Smile color={showEmojiPicker ? "#3B82F6" : "#64748B"} size={24} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => {
              Keyboard.dismiss();
              setShowEmojiPicker(false);
              setShowAttachMenu(!showAttachMenu);
            }}
          >
            <Paperclip color={showAttachMenu ? "#3B82F6" : "#64748B"} size={24} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            onFocus={() => {
              setShowEmojiPicker(false);
              setShowAttachMenu(false);
            }}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]} 
            onPress={() => handleSend(null)}
            disabled={!newMessage.trim()}
          >
            <Send color="#fff" size={20} />
          </TouchableOpacity>
        </View>

        {showEmojiPicker && (
          <View style={{ height: 300, backgroundColor: '#fff' }}>
            <EmojiSelector onEmojiSelected={emoji => setNewMessage(prev => prev + emoji)} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex1: { flex: 1 },
  header: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  
  msgWrapper: {
    flexDirection: 'row',
    marginBottom: 8,
    width: '100%',
  },
  msgWrapperMine: { justifyContent: 'flex-end' },
  msgWrapperOther: { justifyContent: 'flex-start' },
  
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  avatarSpacer: {
    width: 28,
    marginRight: 8,
  },

  msgBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  msgBubbleMine: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  
  msgText: {
    fontSize: 15,
    lineHeight: 20,
  },
  msgTextMine: { color: '#fff' },
  msgTextOther: { color: '#1E293B' },
  
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  
  attachmentContainer: {
    marginBottom: 8,
    marginTop: 4,
  },
  attachmentImg: {
    width: 220,
    height: 220,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  videoPlaceholder: {
    width: 220,
    height: 150,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fileName: {
    marginLeft: 8,
    fontSize: 12,
    maxWidth: 160,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  iconBtn: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    minHeight: 40,
    marginLeft: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
  },

  attachMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  attachOption: {
    alignItems: 'center',
  },
  attachIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    padding: 8,
  },
  uploadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  }
});
