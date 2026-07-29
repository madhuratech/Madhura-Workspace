import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Inbox, Star, Clock, Send, File, AlertCircle, MessageCircle, MessageSquare, Plus, Info, Link as LinkIcon, Smile, Folder, Calendar, Users, Mail, AlertTriangle, Paperclip, Check, CheckCheck, X, Search, MoreVertical, Trash2, Archive, Edit2, Hash, ImageIcon, Video } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

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
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
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
          if (String(msg.sender._id || msg.sender) !== String(user._id)) {
            const isDM = !!msg.dm;
            const channelKey = isDM ? msg.dm : (msg.channel?._id || msg.channel);
            
            if (channelKey) {
              setUnreadCounts(prev => ({
                ...prev,
                [channelKey]: (prev[channelKey] || 0) + 1
              }));
            }
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
        if (activeChannel && String(channelId) === String(activeChannel._id)) {
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
          axios.post(`/workspaces/${workspace._id}/channels/${activeDM.dmId}/messages/mark-read`).catch(console.error);
          setUnreadCounts(prev => ({ ...prev, [activeDM.dmId]: 0 }));
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
        
        // Fetch full workspace to get members
        const detailRes = await axios.get(`/workspaces/${ws._id}`);
        setWorkspace(ws);
        
        // Extract members that are not the current user
        if (ws.members) {
          const members = ws.members
            .filter(m => m.user && String(m.user._id) !== String(user._id))
            .map(m => m.user);
          setWorkspaceMembers(members);
        }

        const channelsRes = await axios.get(`/workspaces/${ws._id}/channels`);
        setChannels(channelsRes.data);
        if (channelsRes.data.length > 0) {
          setActiveChannel(channelsRes.data[0]);
        }

        // Fetch unread counts
        try {
          const unreadRes = await axios.get(`/workspaces/${ws._id}/channels/unread`);
          setUnreadCounts(unreadRes.data || {});
        } catch (err) {
          console.error("Error fetching unread counts", err);
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

  const handleSendMessage = async (e, customAttachment = null) => {
    if (e) e.preventDefault();
    if (!customAttachment && !newMessage.trim()) return;
    if (!workspace) return;
    if (!activeChannel && !activeDM) return;
    
    try {
      const payload = { 
        text: newMessage,
        attachment: customAttachment
      };

      if (activeChannel) {
        await axios.post(`/workspaces/${workspace._id}/channels/${activeChannel._id}/messages`, payload);
      } else if (activeDM) {
        await axios.post(`/workspaces/${workspace._id}/dms/${activeDM.dmId}/messages`, payload);
      }
      setNewMessage('');
    } catch (error) {
      console.error(error);
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
      setMessages(messages.filter(m => m._id !== msgId));
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
        members: finalMembers
      });
      setChannels([...channels, res.data]);
      setActiveChannel(res.data);
      setIsChannelModalOpen(false);
      setNewChannelData({ name: '', description: '', members: [] });
    } catch (error) {
      alert('Failed to create channel');
    }
  };

  const handleOpenChannelModal = () => {
    setNewChannelData({ name: '', description: '', members: [] });
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
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary h-full animate-fade-in">
      <div className="w-12 h-12 border-4 border-border border-t-accent-blue rounded-full animate-spin mb-4"></div>
      <p className="text-text-secondary font-medium">Loading workspace...</p>
    </div>
  );
  if (!workspace) return <div className="p-8 text-danger">Please create a workspace first.</div>;

  return (
    <div className="h-full flex font-sans border-none rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.05)] bg-bg-primary relative">
      {/* Abstract Background for entire chat app */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent-blue/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Sidebar */}
      <div className="w-72 bg-bg-secondary/40 backdrop-blur-3xl border-r border-border/40 flex flex-col z-10 relative">
        <div className="h-[76px] flex items-center px-6 border-b border-border/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-blue to-purple-500"></div>
          <h2 className="font-extrabold text-text-primary text-xl truncate tracking-tight">{workspace.name}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2 flex items-center justify-between group">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Channels</span>
            {(user?.role === 'super_admin' || user?.role === 'hr' || user?.role === 'team_leader') && (
              <button onClick={handleOpenChannelModal} className="text-text-secondary hover:text-text-primary transition-colors">
                <Plus size={16} />
              </button>
            )}
          </div>
          
          <div className="space-y-0.5 px-2 mb-6">
            {channels.filter(c => !c.name.startsWith('dm-')).map(channel => (
              <button 
                key={channel._id}
                onClick={() => { setActiveChannel(channel); setActiveDM(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all group relative overflow-hidden ${
                  activeChannel?._id === channel._id 
                    ? 'bg-accent-blue text-white shadow-md' 
                    : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
                }`}
              >
                {activeChannel?._id === channel._id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent pointer-events-none"></div>
                )}
                <div className="flex items-center truncate relative z-10">
                  <Hash size={16} className={`mr-2.5 ${activeChannel?._id === channel._id ? 'text-white' : 'opacity-70 group-hover:text-accent-blue transition-colors'}`} />
                  <span className="truncate font-semibold">{channel.name}</span>
                </div>
                {unreadCounts[channel._id] > 0 && activeChannel?._id !== channel._id && (
                  <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center animate-zoom-in shadow-sm">
                    {unreadCounts[channel._id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="px-4 mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Direct Messages</span>
          </div>
          
          <div className="space-y-1 px-2">
            {workspace.members && workspace.members.filter(m => m.user && m.user._id !== user?._id).map(member => {
              const isOnline = onlineUsers.has(member.user._id);
              const isActiveDM = activeDM?.user?._id === member.user._id;
              
              // Calculate DM Name to check unread counts
              const sortedIds = [user._id, member.user._id].sort();
              const dmName = `dm-${sortedIds[0]}-${sortedIds[1]}`;
              const unreadCount = unreadCounts[dmName] || (member.dmId && unreadCounts[member.dmId]) || 0;

              return (
                <button 
                  key={member.user._id} 
                  onClick={() => handleDMClick(member.user)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all group relative overflow-hidden ${
                    isActiveDM
                      ? 'bg-accent-blue text-white shadow-md' 
                      : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
                  }`}
                >
                  {isActiveDM && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent pointer-events-none"></div>
                  )}
                  <div className="flex items-center truncate relative z-10">
                    <div className="relative mr-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${isActiveDM ? 'bg-white/20 text-white' : 'bg-bg-secondary border border-border text-text-primary group-hover:border-accent-blue/50'}`}>
                        {member.user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${isActiveDM ? 'border-accent-blue' : 'border-bg-primary'} ${isOnline ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-border'}`}></div>
                    </div>
                    <span className="truncate font-semibold text-[13px]">{member.user.name || member.user.email.split('@')[0]}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {unreadCount > 0 && !isActiveDM && (
                      <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center animate-zoom-in shadow-sm">
                        {unreadCount}
                      </span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      member.role === 'super_admin' ? 'bg-purple-500/10 text-purple-500' :
                      member.role === 'hr' ? 'bg-accent-blue/10 text-accent-blue' :
                      member.role === 'team_leader' ? 'bg-orange-400/10 text-orange-400' :
                      'bg-success/10 text-success'
                    }`}>
                      {member.role === 'super_admin' ? 'S.ADMIN' : member.role === 'team_leader' ? 'TL' : member.role.toUpperCase()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-transparent relative z-10">
        {/* Chat Header */}
        <div className="h-[76px] flex items-center justify-between px-8 border-b border-border/40 shadow-sm z-20 bg-bg-primary/60 backdrop-blur-xl">
          <div className="flex items-center">
            {activeChannel ? (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-blue to-purple-600 flex items-center justify-center text-white mr-4 shadow-md">
                <Hash size={20} />
              </div>
            ) : (
              <div className="relative mr-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                  {activeDM?.user?.name?.charAt(0) || '?'}
                </div>
                <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-[2.5px] border-bg-primary ${onlineUsers.has(activeDM?.user?._id) ? 'bg-emerald-500' : 'bg-border'}`}></div>
              </div>
            )}
            <h3 className="font-extrabold text-text-primary text-xl tracking-tight">
              {getChannelDisplayName(activeChannel, activeDM)}
            </h3>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar bg-bg-secondary/20">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = user?._id === msg.sender?._id;
              const showHeader = idx === 0 || messages[idx - 1].sender?._id !== msg.sender?._id;
              
              return (
                <div key={msg._id} className={`flex w-full mb-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  
                  {/* WhatsApp-style avatar for received messages in channels (groups) */}
                  {!isMine && activeChannel && showHeader && (
                    <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold text-xs mr-2 mt-auto flex-shrink-0">
                      {msg.sender?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  {!isMine && activeChannel && !showHeader && (
                    <div className="w-8 mr-2 flex-shrink-0"></div>
                  )}

                  <div className={`relative max-w-[85%] group/msg flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    
                    {/* Sender Name (only for received in groups, like WhatsApp) */}
                    {!isMine && activeChannel && showHeader && (
                      <span className="text-xs font-bold text-[#53bdeb] mb-1 ml-1">{msg.sender?.name || 'User'}</span>
                    )}
                    
                    {editingMessageId === msg._id ? (
                      <div className="flex flex-col space-y-2 max-w-lg mt-1 w-full">
                        <input 
                          type="text"
                          autoFocus
                          value={editMessageText}
                          onChange={(e) => setEditMessageText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditMessage(msg._id);
                            if (e.key === 'Escape') setEditingMessageId(null);
                          }}
                          className="bg-bg-primary border border-accent-blue rounded-lg px-3 py-2 text-sm focus:outline-none w-full"
                        />
                        <div className="flex space-x-2 text-xs">
                          <button onClick={() => handleEditMessage(msg._id)} className="text-accent-blue font-bold">Save</button>
                          <button onClick={() => setEditingMessageId(null)} className="text-text-secondary hover:text-text-primary">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex items-center group/msg">
                        {/* Hover Actions (Delete/Edit) */}
                        {isMine && (
                          <div className="absolute top-0 right-[100%] pr-2 opacity-0 group-hover/msg:opacity-100 flex items-center space-x-1 transition-opacity duration-200 z-10">
                            {msg.text && (
                              <button onClick={() => { setEditingMessageId(msg._id); setEditMessageText(msg.text); }} className="p-1.5 hover:text-accent-blue transition-colors bg-bg-secondary border border-border rounded-lg shadow-sm text-text-secondary">
                                <Edit2 size={14} />
                              </button>
                            )}
                            <button onClick={() => handleDeleteMessage(msg._id)} className="p-1.5 hover:text-danger transition-colors bg-bg-secondary border border-border rounded-lg shadow-sm text-text-secondary">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`relative min-w-[80px] max-w-[85%] shadow-sm flex flex-col transition-all group-hover/msg:shadow-md ${
                          isMine 
                            ? 'bg-gradient-to-br from-accent-blue/90 to-blue-600 text-white rounded-[20px] rounded-tr-[4px]' 
                            : 'bg-bg-primary text-text-primary rounded-[20px] rounded-tl-[4px] border border-border/50'
                        }`}>
                          
                          {/* Attachment rendering */}
                          {msg.attachment && (
                            <div className={`relative ${msg.text ? 'p-1 pb-0' : 'p-1 flex flex-col'}`}>
                              {msg.attachment.fileType.startsWith('image/') ? (
                                <div className="relative inline-block w-full">
                                  <img 
                                    src={`${API_URL}${msg.attachment.url}`} 
                                    alt={msg.attachment.fileName} 
                                    className="max-w-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity w-full block" 
                                    onClick={() => setFullScreenImage(`${API_URL}${msg.attachment.url}`)}
                                  />
                                  {!msg.text && (
                                    <div className="absolute bottom-1.5 right-1.5 flex items-center justify-end space-x-1 text-[10.5px] bg-black/40 text-white px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm z-10 pointer-events-none">
                                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      {isMine && (
                                        msg.readBy?.length > 0 || msg.isRead ? (
                                          <CheckCheck size={16} strokeWidth={2.5} className="text-[#53bdeb] ml-0.5" />
                                        ) : (
                                          <Check size={16} strokeWidth={2.5} className="text-white/80 ml-0.5" />
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : msg.attachment.fileType.startsWith('video/') ? (
                                <div className="relative inline-block w-full">
                                  <video src={`${API_URL}${msg.attachment.url}`} controls className="max-w-xs rounded-xl w-full block" />
                                  {!msg.text && (
                                    <div className="absolute bottom-1.5 right-1.5 flex items-center justify-end space-x-1 text-[10.5px] bg-black/40 text-white px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm z-10 pointer-events-none">
                                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      {isMine && (
                                        msg.readBy?.length > 0 || msg.isRead ? (
                                          <CheckCheck size={16} strokeWidth={2.5} className="text-[#53bdeb] ml-0.5" />
                                        ) : (
                                          <Check size={16} strokeWidth={2.5} className="text-white/80 ml-0.5" />
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <a href={`${API_URL}${msg.attachment.url}`} target="_blank" rel="noopener noreferrer" className={`flex items-center space-x-2 text-accent-blue bg-accent-blue/10 px-3 py-2 rounded-lg hover:underline mt-1 mx-1 ${!msg.text ? 'mb-1' : ''}`}>
                                  <File size={16} />
                                  <span className="truncate max-w-[200px]">{msg.attachment.fileName}</span>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Text Content & Timestamp Container */}
                          {msg.text && (
                            <div className="relative px-2 py-1 flex flex-col">
                              <div className="whitespace-pre-wrap break-words leading-relaxed text-[15px] inline-block relative max-w-full">
                                {msg.text}
                                {/* WhatsApp Spacer to prevent overlap and push time to corner */}
                                <span className="inline-block w-[75px] h-1" aria-hidden="true"></span>
                              </div>

                              {/* Timestamp and Read Receipt at bottom */}
                              <div className={`flex items-center justify-end space-x-1 text-[10px] -mt-3.5 ml-auto z-10 mr-1 ${isMine ? 'text-white/70' : 'text-text-secondary'}`}>
                                {msg.isEdited && <span className="italic mr-1">edited</span>}
                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMine && (
                                  msg.readBy?.length > 0 || msg.isRead ? (
                                    <CheckCheck size={14} strokeWidth={3} className="text-white ml-0.5" />
                                  ) : (
                                    <Check size={14} strokeWidth={3} className="text-white/50 ml-0.5" />
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message Input - Floating Pill Design */}
        <div className="p-6 bg-transparent">
          <form onSubmit={handleSendMessage} className="relative flex items-end bg-bg-primary border border-border/50 shadow-[0_5px_20px_rgba(0,0,0,0.05)] rounded-3xl overflow-hidden focus-within:shadow-[0_5px_25px_rgba(59,130,246,0.15)] focus-within:border-accent-blue/30 transition-all">
            
            <div className="absolute left-3 bottom-2 flex items-center space-x-1 z-10">
              <div className="relative">
                <button 
                  type="button" 
                  onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                  className="p-2 text-text-secondary hover:text-white hover:bg-accent-blue rounded-full transition-all duration-300 transform hover:scale-110"
                >
                  <Plus size={20} />
                </button>
                
                {isAttachMenuOpen && (
                  <div className="absolute bottom-12 left-0 bg-white dark:bg-bg-secondary border border-border shadow-xl rounded-xl w-48 py-2 z-50 animate-fade-in-up">
                    <button type="button" onClick={() => { setIsAttachMenuOpen(false); fileInputRef.current?.click(); }} className="w-full flex items-center px-4 py-2 text-sm text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <ImageIcon size={16} className="mr-3 text-accent-blue" />
                      Share Image
                    </button>
                    <button type="button" onClick={() => { setIsAttachMenuOpen(false); videoInputRef.current?.click(); }} className="w-full flex items-center px-4 py-2 text-sm text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <Video size={16} className="mr-3 text-danger" />
                      Share Video
                    </button>
                    <button type="button" onClick={() => { setIsAttachMenuOpen(false); folderInputRef.current?.click(); }} className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-text-primary transition-colors text-sm text-left">
                      <File size={16} className="mr-1 text-warning" />
                      <span>Share File</span>
                    </button>
                    <div className="h-px bg-border my-1 mx-4"></div>
                    <button type="button" onClick={() => { setIsAttachMenuOpen(false); window.open('https://drive.google.com', '_blank'); }} className="w-full flex items-center px-4 py-2 text-sm text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <LinkIcon size={16} className="mr-3 text-success" />
                      Google Drive link
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 text-text-secondary hover:text-accent-blue hover:bg-bg-primary rounded-lg transition-colors"
                >
                  <Smile size={20} />
                </button>

              
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 z-50">
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

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            <input type="file" ref={videoInputRef} onChange={handleFileUpload} className="hidden" accept="video/*" />
            <input type="file" ref={folderInputRef} onChange={handleFileUpload} className="hidden" />

            {uploadingFile && <div className="absolute -top-8 left-0 text-xs text-accent-blue font-bold animate-pulse">Uploading file...</div>}

            <textarea 
              rows="1"
              placeholder={`Message ${getChannelDisplayName(activeChannel, activeDM)}`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="w-full bg-transparent border-none pl-24 pr-16 py-4 text-[15px] text-text-primary focus:outline-none transition-colors resize-none overflow-y-auto custom-scrollbar leading-relaxed"
              style={{ minHeight: '56px', maxHeight: '120px' }}
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="absolute right-3 bottom-2.5 text-white bg-gradient-to-r from-accent-blue to-blue-600 p-2.5 rounded-full hover:shadow-lg disabled:opacity-50 disabled:bg-none disabled:bg-border transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <Send size={18} className={!newMessage.trim() ? "translate-x-[-2px] translate-y-[2px]" : "translate-x-[1px] -translate-y-[1px]"} />
            </button>
          </form>

        </div>
      </div>

      {/* Channel Creation Modal */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-bg-secondary z-10 pt-2 pb-4">
              <h3 className="text-xl font-bold text-text-primary">Create Channel</h3>
              <button onClick={() => setIsChannelModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Channel Name</label>
                <input 
                  type="text" required 
                  value={newChannelData.name} onChange={e => setNewChannelData({...newChannelData, name: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. frontend-team"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description (Optional)</label>
                <input 
                  type="text"
                  value={newChannelData.description} onChange={e => setNewChannelData({...newChannelData, description: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="What is this channel about?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Private Channel Members</label>
                <p className="text-[10px] text-text-secondary mb-2">Leave all unchecked to make this a public channel for everyone in the workspace.</p>
                <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-bg-secondary space-y-1 custom-scrollbar">
                  {workspace.members && workspace.members.filter(m => m.user && m.user._id !== user._id).map(m => (
                    <label key={m.user._id} className="flex items-center space-x-3 p-1.5 hover:bg-bg-primary rounded-lg cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="accent-accent-blue"
                        checked={newChannelData.members.includes(m.user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewChannelData({...newChannelData, members: [...newChannelData.members, m.user._id]});
                          } else {
                            setNewChannelData({...newChannelData, members: newChannelData.members.filter(id => id !== m.user._id)});
                          }
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-text-primary">{m.user.name}</span>
                        <span className="text-[10px] text-text-secondary">{m.role.replace('_', ' ')}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsChannelModalOpen(false)} className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 font-medium transition-colors">
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Full Screen Image Viewer Modal */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-fade-in" onClick={() => setFullScreenImage(null)}>
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2 bg-black/50 rounded-full"
            onClick={() => setFullScreenImage(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={fullScreenImage} 
            alt="Full screen preview" 
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg animate-zoom-in"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

    </div>
  );
};

export default Chat;
