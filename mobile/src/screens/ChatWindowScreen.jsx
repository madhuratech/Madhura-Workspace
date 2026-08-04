import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image,
  Keyboard, Linking, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Send, Check, CheckCheck, Smile,
  Paperclip, Image as ImageIcon, File, Video,
} from 'lucide-react-native';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext, API_URL } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

// ── Built-in emoji palette (no external package needed) ────────────────────
const EMOJI_ROWS = [
  ['😀','😂','😊','😍','🥰','😎','🤩','😭','😤','🥺'],
  ['👍','👎','❤️','🔥','✅','⭐','🎉','💯','🙏','👏'],
  ['😅','🤔','😴','🤗','😏','🙄','😬','🤣','😆','😱'],
  ['💪','✌️','🤝','👋','🖐️','👀','💡','📌','🔔','💬'],
];

const EmojiPicker = ({ onSelect }) => (
  <View style={emojiStyles.container}>
    {EMOJI_ROWS.map((row, ri) => (
      <View key={ri} style={emojiStyles.row}>
        {row.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={emojiStyles.btn}
            onPress={() => onSelect(emoji)}
          >
            <Text style={emojiStyles.emoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ))}
  </View>
);

const emojiStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  btn: { padding: 6 },
  emoji: { fontSize: 26 },
});

// ── Main Screen ────────────────────────────────────────────────────────────
export default function ChatWindowScreen({ route, navigation }) {
  const { workspaceId, channelId, channelName, isDM } = route.params;
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    setupSocket();

    const kbListener = Keyboard.addListener('keyboardDidShow', () => {
      setShowEmojiPicker(false);
      setShowAttachMenu(false);
    });
    return () => {
      socketRef.current?.disconnect();
      kbListener.remove();
    };
  }, []);

  const setupSocket = () => {
    const socket = io(API_URL.replace('/api', ''));
    socketRef.current = socket;

    socket.on('new_message', (msg) => {
      const getObjId = (obj) => obj ? String(obj._id || obj) : null;
      const msgChannelId = getObjId(msg.channel) || getObjId(msg.dm);
      if (msgChannelId === String(channelId)) {
        setMessages((prev) => {
          if (prev.find((m) => String(m._id) === String(msg._id))) return prev;
          return [...prev, msg];
        });
      }
    });

    socket.on('message_updated', (msg) => {
      if (
        (msg.channel && String(msg.channel) === String(channelId)) ||
        (msg.dm && String(msg.dm) === String(channelId))
      ) {
        setMessages((prev) =>
          prev.map((m) => (String(m._id) === String(msg._id) ? msg : m))
        );
      }
    });

    socket.on('message_deleted', ({ messageId, channelId: ch }) => {
      if (String(ch) === String(channelId)) {
        setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
      }
    });
  };

  const fetchMessages = async () => {
    try {
      const endpoint = isDM
        ? `/workspaces/${workspaceId}/dms/${channelId}/messages`
        : `/workspaces/${workspaceId}/channels/${channelId}/messages`;
      const res = await axios.get(endpoint);
      setMessages(res.data);
      axios
        .post(`${endpoint}/mark-read`)
        .catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (attachment = null) => {
    if (!attachment && !newMessage.trim()) return;
    const text = newMessage;
    setNewMessage('');
    try {
      if (editingMessageId) {
        const endpoint = isDM
          ? `/workspaces/${workspaceId}/dms/${channelId}/messages/${editingMessageId}`
          : `/workspaces/${workspaceId}/channels/${channelId}/messages/${editingMessageId}`;
        await axios.put(endpoint, { text });
        setEditingMessageId(null);
      } else {
        const endpoint = isDM
          ? `/workspaces/${workspaceId}/dms/${channelId}/messages`
          : `/workspaces/${workspaceId}/channels/${channelId}/messages`;
        await axios.post(endpoint, { text, attachment });
      }
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const handleDelete = (msgId) => {
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const endpoint = isDM
              ? `/workspaces/${workspaceId}/dms/${channelId}/messages/${msgId}`
              : `/workspaces/${workspaceId}/channels/${channelId}/messages/${msgId}`;
            await axios.delete(endpoint);
          } catch (err) {
            console.error('Delete error:', err);
          }
        }
      }
    ]);
  };

  const handleFileUpload = async (type) => {
    setShowAttachMenu(false);
    try {
      let result;
      if (type === 'image' || type === 'video') {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            type === 'image'
              ? ImagePicker.MediaTypeOptions.Images
              : ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 1,
        });
      } else {
        result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
      }

      if (result && !result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setUploading(true);

        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.name || asset.fileName || 'upload.jpg',
          type: asset.mimeType || 'image/jpeg',
        });

        const uploadRes = await axios.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        await handleSend({
          url: uploadRes.data.url,
          fileType: uploadRes.data.fileType,
          fileName: uploadRes.data.fileName,
        });
      }
    } catch (err) {
      console.error('Upload error', err);
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item, index }) => {
    const isMine =
      String(item.sender?._id || item.sender) === String(user._id);
    const showHeader =
      index === 0 ||
      String(
        messages[index - 1].sender?._id || messages[index - 1].sender
      ) !== String(item.sender?._id || item.sender);

    const baseUrl = API_URL.replace('/api', '');

    return (
      <View
        style={[
          styles.msgWrapper,
          isMine ? styles.msgWrapperMine : styles.msgWrapperOther,
        ]}
      >
        {!isMine && !isDM && showHeader && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.sender?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        {!isMine && !isDM && !showHeader && (
          <View style={styles.avatarSpacer} />
        )}

        <TouchableOpacity
          activeOpacity={isMine ? 0.8 : 1}
          onLongPress={() => {
            if (isMine) {
              Alert.alert('Message Actions', 'Choose an action', [
                { text: 'Edit', onPress: () => {
                    setEditingMessageId(item._id);
                    setNewMessage(item.text || '');
                } },
                { text: 'Delete', onPress: () => handleDelete(item._id), style: 'destructive' },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }
          }}
          style={[
            styles.msgBubble,
            isMine ? styles.msgBubbleMine : styles.msgBubbleOther,
          ]}
        >
          {!isMine && !isDM && showHeader && (
            <Text style={styles.senderName}>{item.sender?.name || 'User'}</Text>
          )}

          {item.attachment && (
            <View style={styles.attachmentContainer}>
              {item.attachment.fileType?.startsWith('image/') ? (
                <Image
                  source={{ uri: `${baseUrl}${item.attachment.url}` }}
                  style={styles.attachmentImg}
                  resizeMode="cover"
                />
              ) : item.attachment.fileType?.startsWith('video/') ? (
                <View style={styles.videoPlaceholder}>
                  <Video color="#fff" size={32} />
                  <Text style={{ color: '#fff', fontSize: 12, marginTop: 8 }}>
                    Video Attachment
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.fileCard}
                  onPress={() =>
                    Linking.openURL(`${baseUrl}${item.attachment.url}`)
                  }
                >
                  <File color={isMine ? '#fff' : '#3B82F6'} size={22} />
                  <Text
                    style={[
                      styles.fileName,
                      { color: isMine ? '#fff' : '#3B82F6' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.attachment.fileName}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {item.text ? (
            <Text
              style={[
                styles.msgText,
                isMine ? styles.msgTextMine : styles.msgTextOther,
              ]}
            >
              {item.text.split(/(@\w+)/g).map((part, i) => {
                if (part.startsWith('@')) {
                  return (
                    <Text
                      key={i}
                      style={[
                        { fontWeight: '700' },
                        isMine ? { color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)' } : { color: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.1)' }
                      ]}
                    >
                      {part}
                    </Text>
                  );
                }
                return <Text key={i}>{part}</Text>;
              })}
            </Text>
          ) : null}

          <View style={styles.metaContainer}>
            {item.isEdited && (
              <Text style={[{ fontSize: 10, fontStyle: 'italic', marginRight: 4 }, isMine ? { color: 'rgba(219,234,254,0.7)' } : { color: 'rgba(148,163,184,0.7)' }]}>
                edited
              </Text>
            )}
            <Text style={[styles.timeText, isMine && { color: '#DBEAFE' }]}>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isMine &&
              (item.readBy?.length > 0 || item.isRead ? (
                <CheckCheck size={14} color="#DBEAFE" style={{ marginLeft: 4 }} />
              ) : (
                <Check size={14} color="#DBEAFE" style={{ marginLeft: 4 }} />
              ))}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0F172A" size={22} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {isDM ? channelName : `# ${channelName}`}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              No messages yet. Say hello!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Attach menu */}
        {showAttachMenu && (
          <View style={styles.attachMenu}>
            {[
              { type: 'image',    icon: ImageIcon, color: '#3B82F6', bg: '#EFF6FF', label: 'Image'    },
              { type: 'video',    icon: Video,     color: '#EF4444', bg: '#FEF2F2', label: 'Video'    },
              { type: 'file',     icon: File,      color: '#F59E0B', bg: '#FFFBEB', label: 'Document' },
            ].map(({ type, icon: Icon, color, bg, label }) => (
              <TouchableOpacity
                key={type}
                style={styles.attachOption}
                onPress={() => handleFileUpload(type)}
              >
                <View style={[styles.attachIcon, { backgroundColor: bg }]}>
                  <Icon color={color} size={22} />
                </View>
                <Text style={styles.attachText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {uploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.uploadingText}>Uploading file…</Text>
          </View>
        )}

        {/* Editing indicator */}
        {editingMessageId && (
          <View style={styles.editingBar}>
            <Text style={styles.editingText}>Editing message...</Text>
            <TouchableOpacity onPress={() => { setEditingMessageId(null); setNewMessage(''); }}>
              <Text style={styles.cancelEditText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              Keyboard.dismiss();
              setShowAttachMenu(false);
              setShowEmojiPicker((v) => !v);
            }}
          >
            <Smile
              color={showEmojiPicker ? '#3B82F6' : '#94A3B8'}
              size={22}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              Keyboard.dismiss();
              setShowEmojiPicker(false);
              setShowAttachMenu((v) => !v);
            }}
          >
            <Paperclip
              color={showAttachMenu ? '#3B82F6' : '#94A3B8'}
              size={22}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor="#94A3B8"
            value={newMessage}
            onChangeText={setNewMessage}
            onFocus={() => {
              setShowEmojiPicker(false);
              setShowAttachMenu(false);
            }}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              !newMessage.trim() && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend(null)}
            disabled={!newMessage.trim()}
          >
            <Send color="#fff" size={18} />
          </TouchableOpacity>
        </View>

        {/* Built-in Emoji Picker */}
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={(emoji) => setNewMessage((prev) => prev + emoji)}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex1: { flex: 1 },

  // Header
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
  emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 8 },

  // Messages
  msgWrapper: { flexDirection: 'row', marginBottom: 8, width: '100%' },
  msgWrapperMine: { justifyContent: 'flex-end' },
  msgWrapperOther: { justifyContent: 'flex-start' },

  avatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8, alignSelf: 'flex-end', marginBottom: 4,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#3B82F6' },
  avatarSpacer: { width: 30, marginRight: 8 },

  msgBubble: {
    maxWidth: '82%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20,
  },
  msgBubbleMine: { backgroundColor: '#3B82F6', borderBottomRightRadius: 6 },
  msgBubbleOther: {
    backgroundColor: '#fff', borderBottomLeftRadius: 6,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },

  senderName: { fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextMine: { color: '#fff' },
  msgTextOther: { color: '#334155' },

  metaContainer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', marginTop: 4,
  },
  timeText: { fontSize: 10, color: '#94A3B8' },

  attachmentContainer: { marginBottom: 8, marginTop: 4 },
  attachmentImg: {
    width: 220, height: 220, borderRadius: 12, backgroundColor: '#E2E8F0',
  },
  videoPlaceholder: {
    width: 220, height: 150, backgroundColor: '#1E293B',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  fileCard: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  fileName: { marginLeft: 8, fontSize: 12, maxWidth: 160 },

  // Input bar
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  iconBtn: { padding: 10, paddingBottom: 12 },
  input: {
    flex: 1, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 24, paddingHorizontal: 18,
    paddingTop: 12, paddingBottom: 12,
    maxHeight: 120, minHeight: 46,
    marginLeft: 4, fontSize: 15, color: '#0F172A',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#3B82F6', justifyContent: 'center',
    alignItems: 'center', marginLeft: 10,
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3
  },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },

  // Attach menu
  attachMenu: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#fff', paddingVertical: 20,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  attachOption: { alignItems: 'center' },
  attachIcon: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  attachText: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  // Uploading
  uploadingContainer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#EFF6FF', padding: 10,
  },
  uploadingText: { marginLeft: 8, fontSize: 13, color: '#3B82F6', fontWeight: '500' },

  // Editing bar
  editingBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#DBEAFE',
  },
  editingText: { fontSize: 13, color: '#3B82F6', fontWeight: '500' },
  cancelEditText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
});
