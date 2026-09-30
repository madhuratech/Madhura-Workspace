import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image,
  Keyboard, Linking, ScrollView, Alert, Modal, Switch, StatusBar,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Send, Check, CheckCheck, Smile,
  Paperclip, Image as ImageIcon, File, Video,
  Settings, Trash2, Edit3, MoreVertical, X, Users,
} from 'lucide-react-native';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext, API_URL } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
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
  const { workspaceId, channelId, channelName, isDM, channel } = route.params;
  const { user } = useContext(AuthContext);
  const { socket: globalSocket } = useContext(SocketContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);

  // Channel edit/delete state
  const isChannelCreator = !isDM && (
    (channel?.createdBy && String(channel.createdBy) === String(user?._id)) ||
    user?.role === 'super_admin' ||
    user?.role === 'hr'
  );
  const [isChannelModalVisible, setIsChannelModalVisible] = useState(false);
  const [editName, setEditName] = useState(channelName || '');
  const [editDesc, setEditDesc] = useState(channel?.description || '');
  const [editIsPrivate, setEditIsPrivate] = useState(!!channel?.isPrivate);
  const [editMembers, setEditMembers] = useState(
    channel?.members ? channel.members.map(m => String(m._id || m)) : []
  );
  const [isSavingChannel, setIsSavingChannel] = useState(false);

  const flatListRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    fetchWorkspaceMembers();
    
    const socket = globalSocket || io(API_URL.replace('/api', ''));
    if (user?._id) {
      socket.emit('user_connected', user._id);
    }

    const onNewMessage = (msg) => {
      if (!msg) return;
      const getObjId = (obj) => obj ? String(obj._id || obj) : null;
      const msgChannelId = getObjId(msg.channel) || getObjId(msg.dm);
      if (msgChannelId === String(channelId)) {
        setMessages((prev) => {
          if (prev.find((m) => String(m._id) === String(msg._id))) return prev;
          return [...prev, msg];
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const onMessageUpdated = (msg) => {
      if (!msg) return;
      const getObjId = (obj) => obj ? String(obj._id || obj) : null;
      const msgChannelId = getObjId(msg.channel) || getObjId(msg.dm);
      if (msgChannelId === String(channelId)) {
        setMessages((prev) =>
          prev.map((m) => (String(m._id) === String(msg._id) ? msg : m))
        );
      }
    };

    const onMessageDeleted = ({ messageId, channelId: ch, dmId }) => {
      const targetId = String(ch || dmId || '');
      if (targetId === String(channelId) || !targetId) {
        setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
      }
    };

    const onMessagesRead = ({ channelId: readChId, userId }) => {
      if (!isDM && String(readChId) === String(channelId)) {
        setMessages((prev) => prev.map(m => {
          if (m.sender && String(m.sender._id || m.sender) !== String(userId) && (!m.readBy || !m.readBy.includes(userId))) {
            return { ...m, readBy: [...(m.readBy || []), userId] };
          }
          return m;
        }));
      }
    };

    const onDmMessagesRead = ({ dmId, userId }) => {
      if (isDM && String(dmId) === String(channelId)) {
        setMessages((prev) => prev.map(m => {
          if (m.sender && String(m.sender._id || m.sender) !== String(userId) && (!m.readBy || !m.readBy.includes(userId))) {
            return { ...m, readBy: [...(m.readBy || []), userId] };
          }
          return m;
        }));
      }
    };

    socket.on('new_message', onNewMessage);
    socket.on('message_updated', onMessageUpdated);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('messages_read', onMessagesRead);
    socket.on('dm_messages_read', onDmMessagesRead);

    const kbListener = Keyboard.addListener('keyboardDidShow', () => {
      setShowEmojiPicker(false);
      setShowAttachMenu(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    });

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('message_updated', onMessageUpdated);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('messages_read', onMessagesRead);
      socket.off('dm_messages_read', onDmMessagesRead);
      if (!globalSocket) {
        socket.disconnect();
      }
      kbListener.remove();
    };
  }, [channelId, globalSocket, user?._id]);

  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const [mentionCursorIndex, setMentionCursorIndex] = useState(null);

  const fetchWorkspaceMembers = async () => {
    try {
      const res = await axios.get(`/workspaces/${workspaceId}`);
      if (res.data && res.data.members) {
        const members = res.data.members
          .filter((m) => m.user && String(m.user._id) !== String(user._id))
          .map((m) => m.user);
        setWorkspaceMembers(members);
      }
    } catch (err) {
      console.error('Fetch members error:', err);
    }
  };

  const handleInputChange = (text) => {
    setNewMessage(text);
    const lastAtSymbol = text.lastIndexOf('@');
    if (lastAtSymbol !== -1) {
      if (lastAtSymbol === 0 || text[lastAtSymbol - 1] === ' ' || text[lastAtSymbol - 1] === '\n') {
        const searchText = text.slice(lastAtSymbol + 1);
        if (!searchText.includes(' ')) {
          setShowMentionMenu(true);
          setMentionSearchText(searchText.toLowerCase());
          setMentionCursorIndex(lastAtSymbol);
          return;
        }
      }
    }
    setShowMentionMenu(false);
  };

  const insertMention = (username) => {
    if (mentionCursorIndex !== null) {
      const before = newMessage.slice(0, mentionCursorIndex);
      const after = newMessage.slice(mentionCursorIndex + 1 + mentionSearchText.length);
      const newText = `${before}@${username} ${after}`;
      setNewMessage(newText);
      setShowMentionMenu(false);
      setMentionCursorIndex(null);
    }
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
        const res = await axios.put(endpoint, { text });
        if (res.data) {
          setMessages((prev) =>
            prev.map((m) => (String(m._id) === String(res.data._id) ? res.data : m))
          );
        }
        setEditingMessageId(null);
      } else {
        const endpoint = isDM
          ? `/workspaces/${workspaceId}/dms/${channelId}/messages`
          : `/workspaces/${workspaceId}/channels/${channelId}/messages`;
        const res = await axios.post(endpoint, { text, attachment });
        if (res.data) {
          setMessages((prev) => {
            if (prev.find((m) => String(m._id) === String(res.data._id))) return prev;
            return [...prev, res.data];
          });
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 60);
        }
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

  const handleSaveChannel = async () => {
    if (!editName.trim()) return;
    setIsSavingChannel(true);
    try {
      const formattedName = editName.trim().toLowerCase().replace(/\s+/g, '-');
      const finalMembers = editIsPrivate
        ? (editMembers.includes(String(user?._id)) ? editMembers : [...editMembers, String(user?._id)])
        : [];
      
      await axios.put(`/workspaces/${workspaceId}/channels/${channelId}`, {
        name: formattedName,
        description: editDesc.trim(),
        isPrivate: editIsPrivate,
        members: finalMembers,
      });
      setIsChannelModalVisible(false);
      Alert.alert('Success', 'Channel updated successfully');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update channel');
    } finally {
      setIsSavingChannel(false);
    }
  };

  const toggleEditMemberSelection = (memberId) => {
    const idStr = String(memberId);
    setEditMembers(prev => 
      prev.includes(idStr) ? prev.filter(id => id !== idStr) : [...prev, idStr]
    );
  };

  const handleDeleteChannel = () => {
    Alert.alert(
      'Delete Channel',
      `Are you sure you want to delete #${channelName}? All messages will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`/workspaces/${workspaceId}/channels/${channelId}`);
              setIsChannelModalVisible(false);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete channel');
            }
          }
        }
      ]
    );
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
    const getMediaUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `${baseUrl}${url}`;
    };

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
                  source={{ uri: getMediaUrl(item.attachment.url) }}
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
                    Linking.openURL(getMediaUrl(item.attachment.url))
                  }
                >
                  <File color={isMine ? '#fff' : '#1b2b4c'} size={22} />
                  <Text
                    style={[
                      styles.fileName,
                      { color: isMine ? '#fff' : '#1b2b4c' },
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
                        isMine ? { color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)' } : { color: '#1b2b4c', backgroundColor: 'rgba(59,130,246,0.1)' }
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
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1b2b4c" size={22} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {isDM ? channelName : `# ${channelName}`}
          </Text>
        </View>
        {isChannelCreator && (
          <TouchableOpacity 
            style={styles.settingsBtn} 
            onPress={() => setIsChannelModalVisible(true)}
          >
            <Settings color="#1b2b4c" size={20} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1b2b4c" />
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
              { type: 'image',    icon: ImageIcon, color: '#1b2b4c', bg: '#EFF6FF', label: 'Image'    },
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
            <ActivityIndicator size="small" color="#1b2b4c" />
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

        {/* Mention Dropdown */}
        {showMentionMenu && (
          <View style={styles.mentionMenuContainer}>
            <ScrollView keyboardShouldPersistTaps="always">
              {workspaceMembers
                .filter(m => m.name.toLowerCase().includes(mentionSearchText))
                .map(m => (
                  <TouchableOpacity
                    key={m._id}
                    style={styles.mentionItem}
                    onPress={() => insertMention(m.name.replace(/\s+/g, ''))}
                  >
                    <View style={styles.mentionAvatar}>
                      <Text style={styles.mentionAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.mentionName} numberOfLines={1}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              {workspaceMembers.filter(m => m.name.toLowerCase().includes(mentionSearchText)).length === 0 && (
                <Text style={styles.mentionEmpty}>No members found</Text>
              )}
            </ScrollView>
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
              color={showEmojiPicker ? '#1b2b4c' : '#94A3B8'}
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
              color={showAttachMenu ? '#1b2b4c' : '#94A3B8'}
              size={22}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor="#94A3B8"
            value={newMessage}
            onChangeText={handleInputChange}
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

      {/* Channel Management Modal */}
      <Modal
        visible={isChannelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsChannelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Channel Settings</Text>
              <TouchableOpacity onPress={() => setIsChannelModalVisible(false)}>
                <X color="#64748B" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Channel Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. general"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="What is this channel about?"
                placeholderTextColor="#94A3B8"
                multiline
              />

              {/* Private Channel Toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleTitle}>Private Channel</Text>
                  <Text style={styles.toggleSub}>Only invited employees can access</Text>
                </View>
                <Switch
                  value={editIsPrivate}
                  onValueChange={setEditIsPrivate}
                  trackColor={{ false: '#E2E8F0', true: '#1b2b4c' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Member Selection if Private */}
              {editIsPrivate && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.inputLabel}>Manage Members ({editMembers.length})</Text>
                  <View style={styles.membersList}>
                    {workspaceMembers.map(m => {
                      const isSelected = editMembers.includes(String(m._id));
                      return (
                        <TouchableOpacity
                          key={m._id}
                          style={[styles.memberItem, isSelected && styles.memberItemSelected]}
                          onPress={() => toggleEditMemberSelection(m._id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>
                              {m.name ? m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.memberName}>{m.name || m.email}</Text>
                            <Text style={styles.memberRole}>{m.designation || m.role?.replace(/_/g, ' ')}</Text>
                          </View>
                          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                            {isSelected && <Check color="#FFF" size={14} strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.deleteChannelBtn}
                onPress={handleDeleteChannel}
              >
                <Trash2 color="#EF4444" size={16} />
                <Text style={styles.deleteChannelText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.saveChannelBtn, isSavingChannel && { opacity: 0.7 }]}
                onPress={handleSaveChannel}
                disabled={isSavingChannel}
              >
                {isSavingChannel ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveChannelText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20, width: '100%',
    padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1b2b4c' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6, textTransform: 'uppercase' },
  modalInput: {
    backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1b2b4c',
    marginBottom: 14,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: '#1b2b4c' },
  toggleSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  membersList: {
    maxHeight: 180, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC', padding: 4,
  },
  memberItem: {
    flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8,
    marginBottom: 4,
  },
  memberItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  memberAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  memberAvatarText: { fontSize: 11, fontWeight: '700', color: '#1b2b4c' },
  memberName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  memberRole: { fontSize: 10, color: '#64748B', textTransform: 'capitalize' },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E1',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1b2b4c', borderColor: '#1b2b4c',
  },
  modalActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10,
  },
  deleteChannelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  deleteChannelText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  saveChannelBtn: {
    backgroundColor: '#1b2b4c', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, minWidth: 80, alignItems: 'center',
  },
  saveChannelText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1b2b4c' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 8 },

  // Messages
  msgWrapper: { flexDirection: 'row', marginBottom: 8, width: '100%' },
  msgWrapperMine: { justifyContent: 'flex-end' },
  msgWrapperOther: { justifyContent: 'flex-start' },

  avatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8, alignSelf: 'flex-end', marginBottom: 4,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#1b2b4c' },
  avatarSpacer: { width: 30, marginRight: 8 },

  msgBubble: {
    maxWidth: '82%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8,
  },
  msgBubbleMine: { backgroundColor: '#1b2b4c', borderBottomRightRadius: 2 },
  msgBubbleOther: {
    backgroundColor: '#fff', borderBottomLeftRadius: 2,
    borderWidth: 1, borderColor: '#E5E7EB',
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
    borderRadius: 8, paddingHorizontal: 14,
    paddingTop: 10, paddingBottom: 10,
    maxHeight: 120, minHeight: 40,
    marginLeft: 4, fontSize: 15, color: '#1b2b4c',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: '#1b2b4c', justifyContent: 'center',
    alignItems: 'center', marginLeft: 10,
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
  attachText: { fontSize: 13, color: '#475569', fontWeight: '500' },

  // Mentions
  mentionMenuContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 100,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mentionAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  mentionAvatarText: { color: '#1b2b4c', fontSize: 12, fontWeight: '700' },
  mentionName: { fontSize: 14, color: '#1E293B', fontWeight: '500' },
  mentionEmpty: { padding: 12, textAlign: 'center', color: '#94A3B8', fontSize: 14 },

  // Uploading
  uploadingContainer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#EEF2FF', padding: 10,
  },
  uploadingText: { marginLeft: 8, fontSize: 13, color: '#1b2b4c', fontWeight: '500' },

  // Editing bar
  editingBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#C7D2FE',
  },
  editingText: { fontSize: 13, color: '#1b2b4c', fontWeight: '500' },
  cancelEditText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
});
