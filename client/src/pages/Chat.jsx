import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Inbox, Star, Clock, Send, File, AlertCircle, MessageCircle, MessageSquare, Plus, Info, Link as LinkIcon, Smile, Folder, Calendar, Users, Mail, AlertTriangle, Paperclip, Check, CheckCheck, X, Search, MoreVertical, Trash2, Archive, Edit2, Hash, ImageIcon, Video, ArrowLeft, ChevronDown, ChevronRight, Ban } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import Avatar from '../components/Avatar';

const Chat = () => {
  const { user, socket, onlineUsers: contextOnlineUsers } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeDM, setActiveDM] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [newChannelData, setNewChannelData] = useState({ name: '', description: '', isPrivate: false, members: [] });
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isEditChannelModalOpen, setIsEditChannelModalOpen] = useState(false);
  const [editChannelData, setEditChannelData] = useState({ _id: '', name: '', description: '', isPrivate: false, members: [] });
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [memberLastActive, setMemberLastActive] = useState(() => {
    try {
      const stored = localStorage.getItem(`chat_dm_last_active_${user?._id}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (user?._id && Object.keys(memberLastActive).length > 0) {
      try {
        localStorage.setItem(`chat_dm_last_active_${user._id}`, JSON.stringify(memberLastActive));
      } catch (e) {
        console.error('Error saving chat_dm_last_active', e);
      }
    }
  }, [memberLastActive, user?._id]);

  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchWorkspaceAndChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (msg) => {
        const senderId = String(msg.sender?._id || msg.sender);
        const isDM = !!msg.dm;

        // WhatsApp-style: update last active timestamp for direct messages
        if (isDM && senderId && senderId !== String(user._id)) {
          setMemberLastActive(prev => {
            const updated = { ...prev, [senderId]: Date.now() };
            try {
              localStorage.setItem(`chat_dm_last_active_${user?._id}`, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }

        if (activeChannel && msg.channel && String(msg.channel) === String(activeChannel._id)) {
          setMessages((prev) => {
            if (prev.find(m => String(m._id) === String(msg._id))) return prev;
            return [...prev, msg];
          });
        } else if (activeDM && msg.dm && String(msg.dm) === String(activeDM.dmId)) {
          // If it's a DM, msg.dm is the dmId
          setMessages((prev) => {
            if (prev.find(m => String(m._id) === String(msg._id))) return prev;
            return [...prev, msg];
          });
        } else {
          // Message is not for the active view, increment unread badge if not sent by me
          if (senderId !== String(user._id)) {
            const channelKey = isDM ? msg.dm : (msg.channel?._id || msg.channel);
            
            setUnreadCounts(prev => {
              const newCounts = { ...prev };
              if (channelKey) newCounts[channelKey] = (prev[channelKey] || 0) + 1;
              if (isDM) newCounts[`user-${senderId}`] = (prev[`user-${senderId}`] || 0) + 1;
              return newCounts;
            });
          }
        }
      };

      const handleMessageUpdated = (msg) => {
        if (activeChannel && msg.channel && String(msg.channel) === String(activeChannel._id)) {
          setMessages((prev) => prev.map(m => String(m._id) === String(msg._id) ? msg : m));
        }
        if (activeDM && msg.dm && String(msg.dm) === String(activeDM.dmId)) {
          setMessages((prev) => prev.map(m => String(m._id) === String(msg._id) ? msg : m));
        }
      };

      const handleMessageDeleted = ({ messageId, channelId }) => {
        if (activeChannel && String(channelId) === String(activeChannel._id)) {
          setMessages((prev) => prev.filter(m => String(m._id) !== String(messageId)));
        }
        if (activeDM && String(channelId) === String(activeDM.dmId)) {
          setMessages((prev) => prev.filter(m => String(m._id) !== String(messageId)));
        }
      };

      socket.on('new_message', handleNewMessage);
      socket.on('message_updated', handleMessageUpdated);
      socket.on('message_deleted', handleMessageDeleted);

      socket.on('messages_read', ({ channelId, userId }) => {
        if ((activeChannel && String(channelId) === String(activeChannel._id)) || 
            (activeDM && String(channelId) === String(activeDM.dmId))) {
          setMessages((prev) => prev.map(m => {
            if (m.sender && String(m.sender._id || m.sender) !== String(userId) && (!m.readBy || !m.readBy.includes(userId))) {
              return { ...m, readBy: [...(m.readBy || []), userId] };
            }
            return m;
          }));
        }
      });

      socket.on('dm_messages_read', ({ dmId, userId }) => {
        if (activeDM && String(dmId) === String(activeDM.dmId)) {
          setMessages((prev) => prev.map(m => {
            if (m.sender && String(m.sender._id || m.sender) !== String(userId) && (!m.readBy || !m.readBy.includes(userId))) {
              return { ...m, readBy: [...(m.readBy || []), userId] };
            }
            return m;
          }));
        }
      });
      
      socket.on('initial_status', (users) => {
        setOnlineUsers(new Set(users));
      });
      
      socket.on('user_status', ({ userId, status }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (status === 'online') newSet.add(userId);
          else newSet.delete(userId);
          return newSet;
        });
      });

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('message_updated', handleMessageUpdated);
        socket.off('message_deleted', handleMessageDeleted);
        socket.off('messages_read');
        socket.off('dm_messages_read');
      };
    }
  }, [socket, activeChannel, activeDM]);

  useEffect(() => {
    if (activeChannel) {
      fetchMessages(activeChannel._id, 'channel');
    } else if (activeDM) {
      fetchMessages(activeDM.dmId, 'dm');
    }
  }, [activeChannel, activeDM]);

  useEffect(() => {
    scrollToBottom();
    
    // Mark messages as read when viewing them
    if (messages.length > 0 && workspace) {
      const hasUnread = messages.some(m => m.sender && String(m.sender._id || m.sender) !== String(user?._id) && (!m.readBy || !m.readBy.includes(user?._id)));
      if (hasUnread) {
        if (activeChannel) {
          axios.post(`/workspaces/${workspace._id}/channels/${activeChannel._id}/messages/mark-read`).catch(console.error);
          setUnreadCounts(prev => ({ ...prev, [activeChannel._id]: 0 }));
        } else if (activeDM) {
          axios.post(`/workspaces/${workspace._id}/dms/${activeDM.dmId}/messages/mark-read`).catch(console.error);
          setUnreadCounts(prev => ({ ...prev, [activeDM.dmId]: 0, [`user-${activeDM.user._id}`]: 0 }));
        }
      }
    }
  }, [messages, workspace, activeChannel, activeDM, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchWorkspaceAndChannels = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        
        const [detailRes, channelsRes, unreadRes, dmRecentRes] = await Promise.all([
          axios.get(`/workspaces/${ws._id}`).catch(e => ({ error: true, data: e })),
          axios.get(`/workspaces/${ws._id}/channels`).catch(e => ({ error: true, data: e })),
          axios.get(`/workspaces/${ws._id}/channels/unread`).catch(e => ({ error: true, data: e })),
          axios.get(`/workspaces/${ws._id}/dms/activity/recent`).catch(e => ({ error: true, data: {} }))
        ]);
        
        const fullWorkspace = (!detailRes.error && detailRes.data) ? detailRes.data : ws;
        setWorkspace(fullWorkspace);

        if (dmRecentRes && !dmRecentRes.error && dmRecentRes.data && typeof dmRecentRes.data === 'object') {
          setMemberLastActive(prev => {
            const merged = { ...dmRecentRes.data, ...prev };
            try {
              localStorage.setItem(`chat_dm_last_active_${user?._id}`, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }

        if (fullWorkspace.members) {
          const memberMap = new Map();
          
          // Add all populated members
          fullWorkspace.members.forEach(m => {
            if (m.user && String(m.user._id) !== String(user._id)) {
              memberMap.set(String(m.user._id), m.user);
            }
          });

          // Also check owner
          if (fullWorkspace.owner && typeof fullWorkspace.owner === 'object' && String(fullWorkspace.owner._id) !== String(user._id)) {
            if (!memberMap.has(String(fullWorkspace.owner._id))) {
              memberMap.set(String(fullWorkspace.owner._id), fullWorkspace.owner);
            }
          }

          setWorkspaceMembers(Array.from(memberMap.values()));
        }

        if (!channelsRes.error) {
          setChannels(channelsRes.data);
          if (channelsRes.data.length > 0) {
            setActiveChannel(channelsRes.data[0]);
          }
        }

        if (!unreadRes.error) {
          setUnreadCounts(unreadRes.data || {});
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (id, type) => {
    try {
      let res;
      if (type === 'channel') {
        res = await axios.get(`/workspaces/${workspace._id}/channels/${id}/messages`);
        setUnreadCounts(prev => ({ ...prev, [id]: 0 }));
      } else {
        res = await axios.get(`/workspaces/${workspace._id}/dms/${id}/messages`);
        setUnreadCounts(prev => ({ ...prev, [id]: 0 }));
      }
      setMessages(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const [mentionCursorIndex, setMentionCursorIndex] = useState(null);
  const mentionInputRef = useRef(null);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setNewMessage(text);
    
    // Check for @ mentions
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      if (lastAtSymbol === 0 || textBeforeCursor[lastAtSymbol - 1] === ' ' || textBeforeCursor[lastAtSymbol - 1] === '\n') {
        const searchText = textBeforeCursor.slice(lastAtSymbol + 1);
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
    if (mentionCursorIndex !== null && mentionInputRef.current) {
      const before = newMessage.slice(0, mentionCursorIndex);
      const after = newMessage.slice(mentionInputRef.current.selectionStart);
      const newText = `${before}@${username} ${after}`;
      setNewMessage(newText);
      setShowMentionMenu(false);
      setMentionCursorIndex(null);
      setTimeout(() => {
        if (mentionInputRef.current) {
          mentionInputRef.current.focus();
          const newCursorPos = before.length + username.length + 2;
          mentionInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  const handleSendMessage = async (e, customAttachment = null) => {
    if (e) e.preventDefault();
    const textToSend = newMessage;
    if (!customAttachment && !textToSend.trim()) return;
    if (!workspace) return;
    if (!activeChannel && !activeDM) return;
    
    // Clear input immediately for snappy feel
    if (!customAttachment) setNewMessage('');

    try {
      const payload = { 
        text: textToSend,
        attachment: customAttachment
      };

      if (activeChannel) {
        await axios.post(`/workspaces/${workspace._id}/channels/${activeChannel._id}/messages`, payload);
      } else if (activeDM) {
        const partnerId = activeDM.user?._id;
        if (partnerId) {
          setMemberLastActive(prev => {
            const updated = { ...prev, [partnerId]: Date.now() };
            try {
              localStorage.setItem(`chat_dm_last_active_${user?._id}`, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
        await axios.post(`/workspaces/${workspace._id}/dms/${activeDM.dmId}/messages`, payload);
      }
    } catch (error) {
      console.error(error);
      // Restore input if failed
      if (!customAttachment) setNewMessage(textToSend);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Send message with attachment
      await handleSendMessage(null, {
        url: res.data.url,
        fileType: res.data.fileType,
        fileName: res.data.fileName
      });
    } catch (error) {
      console.error('File upload failed', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
      // Reset input
      e.target.value = null;
    }
  };

  const handleEditMessage = async (msgId) => {
    if (!editMessageText.trim() || !workspace) return;
    try {
      let res;
      if (activeChannel) {
        res = await axios.put(`/workspaces/${workspace._id}/channels/${activeChannel._id}/messages/${msgId}`, { text: editMessageText });
      } else if (activeDM) {
        res = await axios.put(`/workspaces/${workspace._id}/dms/${activeDM.dmId}/messages/${msgId}`, { text: editMessageText });
      }
      if (res && res.data) {
        setMessages(messages.map(m => m._id === msgId ? res.data : m));
      }
      setEditingMessageId(null);
      setEditMessageText('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!workspace) return;
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      if (activeChannel) {
        await axios.delete(`/workspaces/${workspace._id}/channels/${activeChannel._id}/messages/${msgId}`);
      } else if (activeDM) {
        await axios.delete(`/workspaces/${workspace._id}/dms/${activeDM.dmId}/messages/${msgId}`);
      }
      setMessages(messages.map(m => m._id === msgId ? { ...m, isDeleted: true, text: '' } : m));
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateChannelSubmit = async (e) => {
    e.preventDefault();
    if (!newChannelData.name || !workspace) return;
    try {
      const formattedName = newChannelData.name.toLowerCase().replace(/\s+/g, '-');
      // Ensure the creator is in the members list if it's a private channel
      let finalMembers = newChannelData.members;
      if (finalMembers.length > 0 && !finalMembers.includes(user._id)) {
        finalMembers.push(user._id);
      }
      
      const res = await axios.post(`/workspaces/${workspace._id}/channels`, { 
        name: formattedName, 
        description: newChannelData.description,
        isPrivate: newChannelData.isPrivate,
        members: finalMembers
      });
      setChannels([...channels, res.data]);
      setActiveChannel(res.data);
      setIsChannelModalOpen(false);
      setNewChannelData({ name: '', description: '', isPrivate: false, members: [] });
    } catch (error) {
      alert('Failed to create channel');
    }
  };

  const isChannelCreator = activeChannel && (
    (activeChannel.createdBy && String(activeChannel.createdBy) === String(user?._id)) ||
    user?.role === 'super_admin'
  );

  const handleOpenEditChannel = () => {
    if (!activeChannel) return;
    setEditChannelData({
      _id: activeChannel._id,
      name: activeChannel.name,
      description: activeChannel.description || '',
      isPrivate: !!activeChannel.isPrivate,
      members: activeChannel.members || []
    });
    setIsEditChannelModalOpen(true);
  };

  const handleUpdateChannel = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`/workspaces/${workspace._id}/channels/${editChannelData._id}`, {
        name: editChannelData.name,
        description: editChannelData.description,
        isPrivate: editChannelData.isPrivate,
        members: editChannelData.members
      });
      setChannels(channels.map(c => c._id === res.data._id ? res.data : c));
      setActiveChannel(res.data);
      setIsEditChannelModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update channel');
    }
  };

  const handleDeleteChannel = async () => {
    if (!activeChannel) return;
    if (!window.confirm(`Are you sure you want to delete #${activeChannel.name}? All messages will be permanently removed.`)) return;
    try {
      await axios.delete(`/workspaces/${workspace._id}/channels/${activeChannel._id}`);
      const remaining = channels.filter(c => c._id !== activeChannel._id);
      setChannels(remaining);
      setActiveChannel(remaining[0] || null);
      setIsEditChannelModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete channel');
    }
  };

  const handleOpenChannelModal = () => {
    setNewChannelData({ name: '', description: '', isPrivate: false, members: [] });
    setIsChannelModalOpen(true);
  };

  const handleDMClick = async (memberUser) => {
    if (!workspace) return;
    try {
      const res = await axios.get(`/workspaces/${workspace._id}/dms/${memberUser._id}`);
      setActiveDM({ user: memberUser, dmId: res.data._id });
      setActiveChannel(null);
    } catch (err) {
      console.error(err);
    }
  };

  const getChannelDisplayName = (channel, dm) => {
    if (channel) return `# ${channel.name}`;
    if (dm) return dm.user.name;
    return '';
  };

  if (loading) return (
    <div className="flex h-full bg-bg-primary">
      {/* Skeleton sidebar — light */}
      <div className="w-60 bg-white border-r border-gray-200 flex flex-col p-4 space-y-5">
        <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse"></div>
        <div className="space-y-1.5">
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
          {[1,2,3].map(i=><div key={i} className="h-8 w-full bg-gray-100 rounded-lg animate-pulse"></div>)}
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-gray-200 rounded animate-pulse mb-2"></div>
          {[1,2,3,4].map(i=><div key={i} className="h-8 w-full bg-gray-100 rounded-lg animate-pulse"></div>)}
        </div>
      </div>
      {/* Skeleton main */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-border px-6 flex items-center">
          <div className="h-5 w-32 bg-border rounded animate-pulse"></div>
        </div>
        <div className="flex-1 p-6 space-y-5">
          {[1,2,3,4,5].map(i=>(
            <div key={i} className={`flex items-end gap-3 ${i%2===0?'justify-end':''}`}>
              {i%2!==0&&<div className="w-8 h-8 rounded-full bg-border animate-pulse shrink-0"></div>}
              <div className={`space-y-1 max-w-xs ${i%2===0?'items-end':''} flex flex-col`}>
                {i%2!==0&&<div className="h-3 w-20 bg-border/60 rounded animate-pulse"></div>}
                <div className={`h-10 rounded-2xl animate-pulse ${i%2===0?'bg-accent-blue/20 w-48':'bg-border w-64'}`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!workspace) return <div className="p-8 text-danger">Please create a workspace first.</div>;
  return (
    <div className="h-full flex font-sans overflow-hidden bg-bg-primary">

      {/* ═══════════════════ LEFT SIDEBAR — White/Light ═══════════════════ */}
      <div className={`
        w-full md:w-[220px] shrink-0 flex flex-col
        absolute inset-0 md:relative z-20
        ${activeChannel || activeDM ? 'hidden md:flex' : 'flex'}
        bg-white dark:bg-[#1e2533] border-r border-gray-200 dark:border-white/8
      `}>

        {/* Workspace header */}
        <div className="h-14 flex items-center px-4 border-b border-gray-200 dark:border-white/8 shrink-0 bg-white dark:bg-[#1e2533]">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-accent-blue flex items-center justify-center shrink-0 shadow-sm">
              <MessageSquare size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 dark:text-white text-[13px] truncate leading-none">{workspace.name}</h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-0.5">Workspace</p>
            </div>
          </div>
        </div>

        {/* Sidebar scroll area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1e2533]">

          {/* ── CHANNELS ── */}
          <div className="pt-4 pb-1">
            <div className="px-4 mb-1">
              <button
                onClick={() => setChannelsCollapsed(c => !c)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center space-x-1">
                  {channelsCollapsed
                    ? <ChevronRight size={11} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                    : <ChevronDown size={11} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                  }
                  <span className="text-[10.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                    Channels
                  </span>
                </div>
                {(user?.role === 'super_admin' || user?.role === 'hr' || user?.role === 'team_leader') && (
                  <span
                    onClick={(e) => { e.stopPropagation(); handleOpenChannelModal(); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-accent-blue transition-all p-0.5 rounded"
                    title="New channel"
                  >
                    <Plus size={13} />
                  </span>
                )}
              </button>
            </div>

            <div className={`transition-all duration-200 ease-in-out overflow-hidden ${channelsCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
              <div className="px-2 mt-0.5 space-y-0.5">
                {channels.filter(c => !c.name.startsWith('dm-')).map(channel => {
                  const isActive = activeChannel?._id === channel._id;
                  return (
                    <button
                      key={channel._id}
                      onClick={() => { setActiveChannel(channel); setActiveDM(null); }}
                      className={`w-full flex items-center justify-between px-2.5 py-[7px] text-[13px] transition-all ${
                        isActive
                          ? 'bg-accent-blue/10 text-accent-blue font-bold border-l-4 border-accent-blue rounded-r-lg rounded-l-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white rounded-lg border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center min-w-0">
                        <Hash size={14} className={`mr-2 shrink-0 ${isActive ? 'text-accent-blue' : 'text-gray-400'}`} />
                        <span className="truncate">{channel.name}</span>
                      </div>
                      {unreadCounts[channel._id] > 0 && !isActive && (
                        <span className="bg-danger text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
                          {unreadCounts[channel._id]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── DIRECT MESSAGES ── */}
          <div className="pt-3 pb-4">
            <div className="px-4 mb-2 flex items-center justify-between">
              <button
                onClick={() => setDmsCollapsed(d => !d)}
                className="flex items-center space-x-1 group"
              >
                {dmsCollapsed
                  ? <ChevronRight size={11} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                  : <ChevronDown size={11} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                }
                <span className="text-[10.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  Direct Messages
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold ml-1">
                  ({workspaceMembers.length})
                </span>
              </button>
            </div>

            <div className={`transition-all duration-200 ease-in-out ${dmsCollapsed ? 'hidden' : 'block'}`}>
              {/* Direct Messages Search Input */}
              <div className="px-3 mb-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={dmSearchQuery}
                    onChange={(e) => setDmSearchQuery(e.target.value)}
                    placeholder="Search people..."
                    className="w-full bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white pl-7 pr-6 py-1.5 rounded-lg text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-blue border border-transparent dark:border-white/5 transition-all"
                  />
                  {dmSearchQuery && (
                    <button
                      onClick={() => setDmSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-2 space-y-0.5">
                {workspaceMembers
                  .filter(memberUser => {
                    if (!dmSearchQuery.trim()) return true;
                    const q = dmSearchQuery.toLowerCase();
                    const name = memberUser.name?.toLowerCase() || '';
                    const email = memberUser.email?.toLowerCase() || '';
                    const designation = memberUser.designation?.toLowerCase() || '';
                    return name.includes(q) || email.includes(q) || designation.includes(q);
                  })
                  .sort((a, b) => {
                    const timeA = memberLastActive[a._id] || 0;
                    const timeB = memberLastActive[b._id] || 0;
                    if (timeA !== timeB) {
                      return timeB - timeA; // WhatsApp style: newest message at top
                    }
                    return (a.name || a.email || '').localeCompare(b.name || b.email || '');
                  })
                  .map(memberUser => {
                    const isOnline = onlineUsers.has(memberUser._id);
                    const isActiveDM = activeDM?.user?._id === memberUser._id;
                    const sortedIds = [user._id, memberUser._id].sort();
                    const dmName = `dm-${sortedIds[0]}-${sortedIds[1]}`;
                    const dmUnread = unreadCounts[dmName] || unreadCounts[`user-${memberUser._id}`] || 0;

                    return (
                      <button
                        key={memberUser._id}
                        onClick={() => handleDMClick(memberUser)}
                        className={`w-full flex items-center justify-between px-2.5 py-[7px] text-[13px] transition-all ${
                          isActiveDM
                            ? 'bg-accent-blue/10 text-accent-blue font-bold border-l-4 border-accent-blue rounded-r-lg rounded-l-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white rounded-lg border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center min-w-0">
                          <div className="relative mr-2.5 shrink-0">
                            <Avatar user={memberUser} size="w-6 h-6" textClass="text-[9px]" showStatus={false} />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 ${
                              isActiveDM ? 'border-blue-50' : 'border-white dark:border-[#1e2533]'
                            } ${isOnline ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                          </div>
                          <span className="truncate font-medium">{memberUser.name || memberUser.email?.split('@')[0]}</span>
                        </div>
                        {dmUnread > 0 && !isActiveDM && (
                          <span className="bg-danger text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
                            {dmUnread}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ═══════════════════ MAIN CHAT AREA ═══════════════════ */}
      <div className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-bg-secondary ${!activeChannel && !activeDM ? 'hidden' : 'flex'}`}>

        {/* ── Chat Top Bar ── */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-gray-200 dark:border-border bg-white dark:bg-bg-secondary shrink-0 z-10">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Mobile back */}
            <button
              className="md:hidden p-1.5 rounded-lg text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors shrink-0"
              onClick={() => { setActiveChannel(null); setActiveDM(null); }}
            >
              <ArrowLeft size={18} />
            </button>

            {activeChannel ? (
              <>
                <div className="flex items-center space-x-2 min-w-0">
                  <Hash size={18} className="text-text-secondary shrink-0" />
                  <span className="font-semibold text-text-primary text-[15px] truncate">{activeChannel.name}</span>
                </div>
                {activeChannel.description && (
                  <>
                    <div className="w-px h-4 bg-border shrink-0 hidden sm:block"></div>
                    <p className="text-xs text-text-secondary truncate hidden sm:block">{activeChannel.description}</p>
                  </>
                )}
              </>
            ) : activeDM ? (
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative shrink-0">
                  <Avatar user={activeDM.user} size="w-7 h-7" textClass="text-xs" showStatus={false} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary text-[15px] truncate leading-none">{activeDM.user.name}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {onlineUsers.has(activeDM.user._id) ? '🟢 Online' : 'Offline'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-2 shrink-0">
            {showSearch && (
              <div className="relative animate-in fade-in slide-in-from-right-4 duration-200">
                <input
                  type="text"
                  placeholder="Search in chat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-gray-100 dark:bg-bg-primary border border-gray-200 dark:border-border rounded-lg text-sm text-gray-800 dark:text-text-primary focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/50 w-48 sm:w-64 transition-all"
                  autoFocus
                />
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                <button 
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {!showSearch && (
              <button 
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-lg text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors" 
                title="Search in conversation"
              >
                <Search size={16} />
              </button>
            )}
            
            <button className="flex items-center space-x-1.5 p-1.5 px-2 rounded-lg text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors" title="Members">
              <Users size={16} />
              <span className="text-xs font-semibold">
                {activeChannel ? (activeChannel.members?.length || workspaceMembers.length) : activeDM ? 2 : 0}
              </span>
            </button>

            {isChannelCreator && (
              <>
                <button 
                  onClick={handleOpenEditChannel}
                  className="p-1.5 px-2 rounded-lg text-text-secondary hover:bg-bg-primary hover:text-accent-blue transition-colors flex items-center space-x-1 text-xs font-medium"
                  title="Channel Settings & Members"
                >
                  <Edit2 size={15} />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button 
                  onClick={handleDeleteChannel}
                  className="p-1.5 px-2 rounded-lg text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors flex items-center space-x-1 text-xs font-medium"
                  title="Delete Channel"
                >
                  <Trash2 size={15} />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Messages Area ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 custom-scrollbar bg-white dark:bg-bg-secondary">
          {messages.filter(m => !searchQuery || m.text?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-accent-blue/10 flex items-center justify-center mb-4">
                {activeChannel
                  ? <Hash size={24} className="text-accent-blue" />
                  : <MessageSquare size={24} className="text-accent-blue" />
                }
              </div>
              <h3 className="font-bold text-text-primary text-lg mb-1">
                {activeChannel ? `# ${activeChannel.name}` : `Chat with ${activeDM?.user?.name}`}
              </h3>
              <p className="text-text-secondary text-sm max-w-xs">
                {activeChannel
                  ? `This is the beginning of the #${activeChannel.name} channel.`
                  : `This is the beginning of your direct message history with ${activeDM?.user?.name}.`
                }
              </p>
            </div>
          ) : (
            messages.filter(m => !searchQuery || m.text?.toLowerCase().includes(searchQuery.toLowerCase())).map((msg, idx, filteredMessages) => {
              const isMine = user?._id === msg.sender?._id;
              const prevMsg = filteredMessages[idx - 1];
              
              const msgDate = new Date(msg.createdAt);
              const prevMsgDate = prevMsg ? new Date(prevMsg.createdAt) : null;
              const isNewDay = !prevMsg || msgDate.toDateString() !== prevMsgDate.toDateString();

              let dateLabel = '';
              if (isNewDay) {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (msgDate.toDateString() === today.toDateString()) {
                  dateLabel = 'Today';
                } else if (msgDate.toDateString() === yesterday.toDateString()) {
                  dateLabel = 'Yesterday';
                } else {
                  dateLabel = msgDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                }
              }

              const showHeader = idx === 0 || isNewDay || prevMsg?.sender?._id !== msg.sender?._id
                || (msgDate - prevMsgDate) > 5 * 60 * 1000;
              
              const isRead = msg.readBy?.length > 0 || msg.isRead;
              const isDelivered = isRead || (activeDM && onlineUsers.has(activeDM.user._id));

              return (
                <React.Fragment key={msg._id}>
                  {isNewDay && (
                    <div className="flex justify-center my-6 relative">
                       <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                       <div className="relative bg-bg-secondary px-3 py-1 text-[11px] font-bold text-text-secondary uppercase tracking-wider rounded-full border border-border shadow-sm">
                         {dateLabel}
                       </div>
                    </div>
                  )}
                  <div className={`flex w-full group/row ${isMine ? 'justify-end' : 'justify-start'} ${showHeader ? 'mt-4' : 'mt-0.5'}`}>

                  {/* Avatar — only for others, only on first message in group */}
                  {!isMine && (
                    <div className="w-8 shrink-0 mr-2.5 mt-auto">
                      {showHeader && (
                        <Avatar user={msg.sender} size="w-8 h-8" textClass="text-xs" showStatus={false} />
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[72%] ${isMine ? 'items-end' : 'items-start'}`}>
                    {/* Sender name + time header */}
                    {showHeader && !isMine && (
                      <div className="flex items-baseline space-x-2 mb-1 px-1">
                        <span className="text-[12px] font-semibold text-text-primary">{msg.sender?.name || 'User'}</span>
                        <span className="text-[10px] text-text-secondary">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Message bubble + actions */}
                    <div className="relative flex items-center gap-1.5 w-full">

                      {/* Hover action buttons — my messages (left of bubble) */}
                      {isMine && !msg.isDeleted && (
                        <div className="opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center space-x-1 order-first">
                          {msg.text && (new Date() - new Date(msg.createdAt) < 5 * 60 * 1000) && (
                            <button
                              onClick={() => { setEditingMessageId(msg._id); setEditMessageText(msg.text); }}
                              className="p-1.5 rounded-lg bg-bg-primary border border-border text-text-secondary hover:text-accent-blue hover:border-accent-blue/30 transition-all shadow-sm"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="p-1.5 rounded-lg bg-bg-primary border border-border text-text-secondary hover:text-danger hover:border-danger/30 transition-all shadow-sm"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}

                      {/* THE BUBBLE */}
                      <div className={`relative ${isMine ? 'order-last' : ''}`}>
                        {editingMessageId === msg._id ? (
                          <div className="flex flex-col space-y-2 min-w-[240px]">
                            <input
                              type="text" autoFocus
                              value={editMessageText}
                              onChange={(e) => setEditMessageText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditMessage(msg._id);
                                if (e.key === 'Escape') setEditingMessageId(null);
                              }}
                              className="bg-bg-primary border border-accent-blue rounded-xl px-3 py-2 text-sm focus:outline-none w-full text-text-primary"
                            />
                            <div className="flex space-x-2 text-xs">
                              <button onClick={() => handleEditMessage(msg._id)} className="text-accent-blue font-bold hover:underline">Save</button>
                              <button onClick={() => setEditingMessageId(null)} className="text-text-secondary hover:text-text-primary">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className={`relative rounded-2xl overflow-hidden shadow-sm ${
                            isMine
                              ? 'bg-accent-blue text-accent-text rounded-br-sm'
                              : 'bg-bg-primary text-text-primary border border-border/60 rounded-bl-sm'
                          }`}>

                            {/* Attachment */}
                            {msg.attachment && (
                              <div className="p-1">
                                {msg.attachment.fileType?.startsWith('image/') ? (
                                  <img
                                    src={`${API_URL}${msg.attachment.url}`}
                                    alt={msg.attachment.fileName}
                                    className="max-w-[280px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity block"
                                    onClick={() => setFullScreenImage(`${API_URL}${msg.attachment.url}`)}
                                  />
                                ) : msg.attachment.fileType?.startsWith('video/') ? (
                                  <video src={`${API_URL}${msg.attachment.url}`} controls className="max-w-[280px] rounded-xl block" />
                                ) : (
                                  <a
                                    href={`${API_URL}${msg.attachment.url}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center space-x-2 px-3 py-2 text-sm hover:underline"
                                  >
                                    <File size={15} />
                                    <span className="truncate max-w-[200px]">{msg.attachment.fileName}</span>
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Text, Deleted state, or File-only attachment */}
                            {(msg.text || msg.isDeleted || (msg.attachment && !msg.text && !msg.attachment.fileType?.startsWith('image/') && !msg.attachment.fileType?.startsWith('video/'))) && (
                              <div className="px-3 py-2 pt-0">
                                {msg.isDeleted ? (
                                  <div className={`italic text-[13.5px] flex items-center space-x-1.5 ${isMine ? 'text-accent-text/80' : 'text-text-secondary/80'}`}>
                                    <Ban size={13} />
                                    <span>This message was deleted</span>
                                  </div>
                                ) : msg.text ? (
                                  <div className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">
                                    {msg.text.split(/(@\w+|https?:\/\/[^\s]+)/g).map((part, i) => {
                                      if (!part) return null;
                                      if (part.startsWith('@')) return (
                                        <span key={i} className={`font-semibold px-1 rounded-sm ${isMine ? 'bg-accent-text/20' : 'text-accent-blue bg-accent-blue/10'}`}>{part}</span>
                                      );
                                      if (part.startsWith('http')) return (
                                        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={`underline break-all ${isMine ? 'text-accent-text/90' : 'text-accent-blue'}`}>{part}</a>
                                      );
                                      return <span key={i}>{part}</span>;
                                    })}
                                  </div>
                                ) : null}
                                {/* Time + read receipt */}
                                <div className={`flex items-center justify-end space-x-1 mt-1 ${isMine ? 'text-accent-text/60' : 'text-text-secondary'}`}>
                                  {msg.isEdited && !msg.isDeleted && <span className="text-[10px] italic mr-1">edited</span>}
                                  <span className="text-[10px]">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isMine && (
                                    isRead
                                      ? <CheckCheck size={14} strokeWidth={2.5} className="text-sky-300 dark:text-gray-700" />
                                      : isDelivered
                                        ? <CheckCheck size={14} strokeWidth={2.5} className="text-accent-text/50" />
                                        : <Check size={14} strokeWidth={2.5} className="text-accent-text/50" />
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Time on image-only or video-only messages */}
                            {msg.attachment && !msg.text && (msg.attachment.fileType?.startsWith('image/') || msg.attachment.fileType?.startsWith('video/')) && (
                              <div className="absolute bottom-2 right-2 flex items-center space-x-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMine && (isRead
                                  ? <CheckCheck size={12} strokeWidth={2.5} className="text-sky-300" />
                                  : <Check size={12} strokeWidth={2.5} />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Time shown right of bubble for my messages when hovered */}
                      {isMine && !editingMessageId && (
                        <span className="text-[10px] text-text-secondary opacity-0 group-hover/row:opacity-100 transition-opacity whitespace-nowrap self-end mb-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Message Input Bar ── */}
        <div className="px-4 pb-4 pt-3 bg-white dark:bg-bg-secondary border-t border-gray-200 dark:border-border shrink-0">
          {uploadingFile && (
            <div className="flex items-center space-x-2 mb-2 px-3 py-2 bg-accent-blue/10 border border-accent-blue/20 rounded-xl">
              <div className="w-3 h-3 rounded-full border-2 border-accent-blue border-t-transparent animate-spin"></div>
              <span className="text-xs text-accent-blue font-medium">Uploading file...</span>
            </div>
          )}

          {/* Mention dropdown */}
          {showMentionMenu && (
            <div className="mb-2 bg-bg-secondary border border-border shadow-xl rounded-xl w-64 max-h-48 overflow-y-auto z-50 custom-scrollbar">
              {workspaceMembers
                .filter(m => m.name.toLowerCase().includes(mentionSearchText))
                .map(m => (
                  <button
                    key={m._id} type="button"
                    onClick={() => insertMention(m.name.replace(/\s+/g, ''))}
                    className="w-full flex items-center px-3 py-2 hover:bg-bg-primary transition-colors text-left"
                  >
                    <Avatar user={m} size="w-6 h-6" textClass="text-[9px]" showStatus={false} className="mr-2.5 shrink-0" />
                    <span className="text-sm text-text-primary font-medium truncate">{m.name}</span>
                  </button>
                ))}
              {workspaceMembers.filter(m => m.name.toLowerCase().includes(mentionSearchText)).length === 0 && (
                <div className="px-4 py-3 text-sm text-text-secondary text-center">No members found</div>
              )}
            </div>
          )}

          <div className="relative flex items-end bg-gray-100 dark:bg-bg-primary border border-gray-200 dark:border-border rounded-xl focus-within:border-accent-blue/50 focus-within:ring-2 focus-within:ring-accent-blue/10 transition-all">

            {/* Left toolbar */}
            <div className="flex items-center pl-2 pb-2 space-x-0.5 shrink-0">
              {/* Attach */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                  className="p-2 text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
                  title="Attach file"
                >
                  <Plus size={18} />
                </button>
                {isAttachMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 bg-bg-secondary border border-border shadow-2xl rounded-xl w-48 py-1.5 z-50">
                    <button type="button" onClick={() => { setIsAttachMenuOpen(false); fileInputRef.current?.click(); }} className="w-full flex items-center px-3 py-2 text-sm text-text-primary hover:bg-bg-primary transition-colors">
                      <ImageIcon size={15} className="mr-2.5 text-accent-blue shrink-0" /> Share Image
                    </button>
                    <button type="button" onClick={() => { setIsAttachMenuOpen(false); videoInputRef.current?.click(); }} className="w-full flex items-center px-3 py-2 text-sm text-text-primary hover:bg-bg-primary transition-colors">
                      <Video size={15} className="mr-2.5 text-danger shrink-0" /> Share Video
                    </button>
                    <button type="button" onClick={() => { setIsAttachMenuOpen(false); folderInputRef.current?.click(); }} className="w-full flex items-center px-3 py-2 text-sm text-text-primary hover:bg-bg-primary transition-colors">
                      <File size={15} className="mr-2.5 text-warning shrink-0" /> Share File
                    </button>
                    <div className="h-px bg-border mx-3 my-1"></div>
                    <button type="button" onClick={() => { setIsAttachMenuOpen(false); window.open('https://drive.google.com', '_blank'); }} className="w-full flex items-center px-3 py-2 text-sm text-text-primary hover:bg-bg-primary transition-colors">
                      <LinkIcon size={15} className="mr-2.5 text-success shrink-0" /> Google Drive
                    </button>
                  </div>
                )}
              </div>

              {/* Emoji */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-text-secondary hover:text-warning hover:bg-warning/10 rounded-lg transition-colors"
                  title="Emoji"
                >
                  <Smile size={18} />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 z-50">
                    <EmojiPicker
                      theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                      onEmojiClick={(emoji) => {
                        setNewMessage(prev => prev + emoji.emoji);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Hidden file inputs */}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            <input type="file" ref={videoInputRef} onChange={handleFileUpload} className="hidden" accept="video/*" />
            <input type="file" ref={folderInputRef} onChange={handleFileUpload} className="hidden" />

            {/* Textarea */}
            <textarea
              ref={mentionInputRef}
              rows="1"
              placeholder={`Message ${activeChannel ? `#${activeChannel.name}` : activeDM?.user?.name || '...'}`}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="flex-1 bg-transparent border-0 outline-none resize-none py-3 px-2 text-sm text-gray-800 dark:text-text-primary placeholder:text-gray-400 dark:placeholder:text-text-secondary leading-relaxed"
              style={{ minHeight: '40px', maxHeight: '140px' }}
            />

            {/* Send button */}
            <div className="flex items-center pr-2 pb-2 shrink-0">
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() && !uploadingFile}
                className={`p-2 rounded-lg transition-all ${
                  newMessage.trim()
                    ? 'bg-accent-blue text-white hover:bg-accent-indigo shadow-sm'
                    : 'text-text-secondary/40 cursor-not-allowed'
                }`}
                title="Send"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Empty state when nothing selected on desktop ═══ */}
      {!activeChannel && !activeDM && (
        <div className="hidden md:flex flex-1 relative flex-col items-center justify-center bg-gray-50 dark:bg-bg-primary overflow-hidden">
          {/* Decorative background gradients */}
          <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full bg-accent-blue/10 dark:bg-accent-blue/5 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }}></div>
          <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
          
          <div className="relative z-10 flex flex-col items-center text-center p-12 max-w-lg mx-auto bg-white/60 dark:bg-bg-secondary/40 backdrop-blur-2xl border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] group transition-all duration-500 hover:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.4)]">
            
            <div className="relative mb-10">
              {/* Outer rotating dashed ring */}
              <div className="absolute inset-[-16px] rounded-full border-2 border-dashed border-accent-blue/20 dark:border-accent-blue/30 animate-[spin_15s_linear_infinite] group-hover:border-accent-blue/50 transition-colors duration-700"></div>
              {/* Inner rotating dashed ring (reverse) */}
              <div className="absolute inset-[-8px] rounded-full border border-dashed border-purple-500/20 dark:border-purple-500/30 animate-[spin_10s_linear_infinite_reverse] group-hover:border-purple-500/50 transition-colors duration-700"></div>
              
              {/* Floating icon container */}
              <div className="relative w-28 h-28 rounded-[2rem] bg-gradient-to-tr from-accent-blue to-purple-500 p-[3px] shadow-2xl animate-[bounce_4s_ease-in-out_infinite] group-hover:shadow-accent-blue/40 transition-shadow duration-500">
                <div className="w-full h-full bg-white dark:bg-[#1e2533] rounded-[1.8rem] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/5 to-purple-500/5"></div>
                  <MessageCircle size={48} className="text-accent-blue relative z-10 group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
            </div>
            
            <h3 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 text-2xl mb-3 tracking-tight">
              Welcome to Chat
            </h3>
            
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed max-w-sm">
              Connect with your team in real-time. Select a <span className="font-semibold text-gray-700 dark:text-gray-200">channel</span> for group discussions or start a <span className="font-semibold text-gray-700 dark:text-gray-200">direct message</span> for 1-on-1 conversations.
            </p>
            
            <div className="flex items-center space-x-6 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-bg-primary/50 px-5 py-2.5 rounded-full">
              <div className="flex items-center space-x-2">
                <Hash size={16} className="text-accent-blue" />
                <span className="text-gray-600 dark:text-gray-300">Channels</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center space-x-2">
                <Users size={16} className="text-purple-500" />
                <span className="text-gray-600 dark:text-gray-300">Direct Messages</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* â•â•â• Full-screen Image Viewer â•â•â• */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] backdrop-blur-sm"
          onClick={() => setFullScreenImage(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
          <img src={fullScreenImage} alt="Full screen" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}

      {/* â•â•â• Create Channel Modal â•â•â• */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Create a channel</h3>
                <p className="text-xs text-text-secondary mt-0.5">Channels are where your team communicates.</p>
              </div>
              <button onClick={() => setIsChannelModalOpen(false)} className="p-2 rounded-lg text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateChannelSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">Channel Name</label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="text" required
                    value={newChannelData.name}
                    onChange={e => setNewChannelData({...newChannelData, name: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                    placeholder="e.g. frontend-team"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">Description <span className="font-normal normal-case">(optional)</span></label>
                <input
                  type="text"
                  value={newChannelData.description}
                  onChange={e => setNewChannelData({...newChannelData, description: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                  placeholder="What is this channel about?"
                />
              </div>

              <label className="flex items-center space-x-3 p-3 rounded-xl border border-border hover:bg-bg-primary cursor-pointer transition-colors">
                <input
                  type="checkbox" id="isPrivate"
                  className="accent-accent-blue w-4 h-4"
                  checked={newChannelData.isPrivate}
                  onChange={e => setNewChannelData({...newChannelData, isPrivate: e.target.checked})}
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">Private channel</p>
                  <p className="text-[11px] text-text-secondary">Only specific people can access</p>
                </div>
              </label>

              {newChannelData.isPrivate && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">Add Members</label>
                  <div className="max-h-36 overflow-y-auto border border-border rounded-xl bg-bg-primary custom-scrollbar">
                    {workspace.members?.filter(m => m.user && m.user._id !== user._id).map(m => (
                      <label key={m.user._id} className="flex items-center space-x-3 px-3 py-2 hover:bg-bg-secondary cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="accent-accent-blue"
                          checked={newChannelData.members.includes(m.user._id)}
                          onChange={(e) => {
                            if (e.target.checked) setNewChannelData({...newChannelData, members: [...newChannelData.members, m.user._id]});
                            else setNewChannelData({...newChannelData, members: newChannelData.members.filter(id => id !== m.user._id)});
                          }}
                        />
                        <Avatar user={m.user} size="w-6 h-6" textClass="text-[9px]" showStatus={false} />
                        <div>
                          <p className="text-sm font-medium text-text-primary leading-none">{m.user.name}</p>
                          <p className="text-[10px] text-text-secondary mt-0.5 capitalize">{m.role?.replace('_', ' ')}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setIsChannelModalOpen(false)}
                  className="px-4 py-2 text-text-secondary hover:bg-bg-primary rounded-xl transition-colors text-sm font-medium">
                  Cancel
                </button>
                <button type="submit"
                  className="bg-accent-blue text-white px-5 py-2 rounded-xl hover:bg-accent-indigo transition-colors text-sm font-semibold shadow-sm">
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CHANNEL MODAL */}
      {isEditChannelModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Edit #{editChannelData.name}</h3>
                <p className="text-xs text-text-secondary">Update channel settings and member access.</p>
              </div>
              <button onClick={() => setIsEditChannelModalOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-primary transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">Channel Name</label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="text" required
                    value={editChannelData.name}
                    onChange={e => setEditChannelData({...editChannelData, name: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">Description</label>
                <input
                  type="text"
                  value={editChannelData.description}
                  onChange={e => setEditChannelData({...editChannelData, description: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                  placeholder="Channel topic or purpose"
                />
              </div>

              <label className="flex items-center space-x-3 p-3 rounded-xl border border-border hover:bg-bg-primary cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="accent-accent-blue w-4 h-4"
                  checked={editChannelData.isPrivate}
                  onChange={e => setEditChannelData({...editChannelData, isPrivate: e.target.checked})}
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">Private channel</p>
                  <p className="text-[11px] text-text-secondary">Only selected members can view this channel</p>
                </div>
              </label>

              {editChannelData.isPrivate && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">Manage Members</label>
                  <div className="max-h-40 overflow-y-auto border border-border rounded-xl bg-bg-primary custom-scrollbar">
                    {workspace.members?.filter(m => m.user && String(m.user._id) !== String(user._id)).map(m => {
                      const isSelected = editChannelData.members?.some(id => String(id?._id || id) === String(m.user._id));
                      return (
                        <label key={m.user._id} className="flex items-center space-x-3 px-3 py-2 hover:bg-bg-secondary cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            className="accent-accent-blue"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditChannelData({
                                  ...editChannelData,
                                  members: [...(editChannelData.members || []), m.user._id]
                                });
                              } else {
                                setEditChannelData({
                                  ...editChannelData,
                                  members: (editChannelData.members || []).filter(id => String(id?._id || id) !== String(m.user._id))
                                });
                              }
                            }}
                          />
                          <Avatar user={m.user} size="w-6 h-6" textClass="text-[9px]" showStatus={false} />
                          <div>
                            <p className="text-sm font-medium text-text-primary leading-none">{m.user.name}</p>
                            <p className="text-[10px] text-text-secondary mt-0.5 capitalize">{m.role?.replace('_', ' ')}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleDeleteChannel}
                  className="px-3 py-2 text-danger hover:bg-danger/10 rounded-xl transition-colors text-xs font-semibold flex items-center space-x-1"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
                <div className="flex space-x-2">
                  <button type="button" onClick={() => setIsEditChannelModalOpen(false)}
                    className="px-4 py-2 text-text-secondary hover:bg-bg-primary rounded-xl transition-colors text-sm font-medium">
                    Cancel
                  </button>
                  <button type="submit"
                    className="bg-accent-blue text-white px-5 py-2 rounded-xl hover:bg-accent-indigo transition-colors text-sm font-semibold shadow-sm">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
