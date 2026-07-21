import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Send, Hash, MessageSquare, Plus, Info, Search, Image as ImageIcon, Edit2, Trash2, X, Video, Folder, Link as LinkIcon, File, Smile } from 'lucide-react';
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
        }
        if (activeDM && msg.dm && String(msg.dm) === String(activeDM.dmId)) {
          setMessages((prev) => {
            if (prev.find(m => String(m._id) === String(msg._id))) return prev;
            return [...prev, msg];
          });
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
      };

      socket.on('new_message', handleNewMessage);
      socket.on('message_updated', handleMessageUpdated);
      socket.on('message_deleted', handleMessageDeleted);
      
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
      };
    }
  }, [socket, activeChannel]);

  useEffect(() => {
    if (activeChannel) {
      fetchMessages(activeChannel._id, 'channel');
    } else if (activeDM) {
      fetchMessages(activeDM.dmId, 'dm');
    }
  }, [activeChannel, activeDM]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      } else {
        res = await axios.get(`/workspaces/${workspace._id}/dms/${id}/messages`);
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
      if (activeChannel) {
        await axios.put(`/workspaces/${workspace._id}/channels/${activeChannel._id}/messages/${msgId}`, { text: editMessageText });
      } else if (activeDM) {
        // Assume DM messages don't have update route yet, or just log for now
        console.log("DM message edit not implemented yet");
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
        // Assume DM messages don't have delete route yet, or just log for now
        console.log("DM message delete not implemented yet");
      }
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
    <div className="h-full flex font-sans border border-border rounded-2xl overflow-hidden shadow-sm bg-bg-secondary">
      {/* Sidebar */}
      <div className="w-64 bg-bg-primary border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-border shadow-sm">
          <h2 className="font-bold text-text-primary text-lg truncate">{workspace.name} Chat</h2>
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
                onClick={() => setActiveChannel(channel)}
                className={`w-full flex items-center px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  activeChannel?._id === channel._id 
                    ? 'bg-accent-blue/10 text-accent-blue font-medium' 
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                }`}
              >
                <Hash size={16} className="mr-2 opacity-70" />
                <span className="truncate">{channel.name}</span>
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
              return (
                <button 
                  key={member.user._id} 
                  onClick={() => handleDMClick(member.user)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors group ${
                    isActiveDM
                      ? 'bg-accent-blue/10 text-accent-blue font-medium' 
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center truncate">
                    <div className={`h-2 w-2 rounded-full mr-2 ${isOnline ? 'bg-success shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'border border-border bg-border'}`}></div>
                    <span className="truncate group-hover:font-medium">{member.user.name || member.user.email.split('@')[0]}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    member.role === 'super_admin' ? 'bg-purple-500/10 text-purple-500' :
                    member.role === 'hr' ? 'bg-accent-blue/10 text-accent-blue' :
                    member.role === 'team_leader' ? 'bg-orange-400/10 text-orange-400' :
                    'bg-success/10 text-success'
                  }`}>
                    {member.role === 'super_admin' ? 'S.ADMIN' : member.role === 'team_leader' ? 'TL' : member.role.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-bg-secondary relative">
        {/* Chat Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border shadow-sm z-10 bg-bg-secondary/90 backdrop-blur">
          <div className="flex items-center">
            <h3 className="font-bold text-text-primary flex items-center text-lg">
              {activeChannel ? (
                <Hash size={20} className="text-text-secondary mr-2" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center mr-3 text-xs font-bold">
                  {activeDM?.user?.name?.charAt(0) || '?'}
                </div>
              )}
              {getChannelDisplayName(activeChannel, activeDM)}
            </h3>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const showHeader = idx === 0 || messages[idx - 1].sender._id !== msg.sender._id;
              
              return (
                <div key={msg._id} className={`flex ${!showHeader ? 'mt-1' : 'mt-6'}`}>
                  <div className="w-10 flex-shrink-0 mr-3 flex justify-center">
                    {showHeader ? (
                      <div className="h-10 w-10 rounded-xl bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold text-sm">
                        {msg.sender?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    ) : (
                      <div className="w-10"></div>
                    )}
                  </div>
                  
                    <div className="flex-1 min-w-0 group/msg relative">
                      {showHeader && (
                        <div className="flex items-baseline space-x-2 mb-1">
                          <span className="font-bold text-text-primary text-sm">{msg.sender?.name || 'User'}</span>
                          <span className="text-xs text-text-secondary">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                      
                      {editingMessageId === msg._id ? (
                        <div className="flex flex-col space-y-2 max-w-lg mt-1">
                          <input 
                            type="text"
                            autoFocus
                            value={editMessageText}
                            onChange={(e) => setEditMessageText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditMessage(msg._id);
                              if (e.key === 'Escape') setEditingMessageId(null);
                            }}
                            className="bg-bg-primary border border-accent-blue rounded-lg px-3 py-2 text-sm focus:outline-none"
                          />
                          <div className="flex space-x-2 text-xs">
                            <button onClick={() => handleEditMessage(msg._id)} className="text-accent-blue font-bold">Save</button>
                            <button onClick={() => setEditingMessageId(null)} className="text-text-secondary hover:text-text-primary">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative inline-block max-w-[85%]">
                          <div className="text-sm text-text-primary bg-bg-primary border border-border p-3 rounded-2xl rounded-tl-sm shadow-sm">
                            {msg.attachment && (
                              <div className="mb-2">
                                {msg.attachment.fileType.startsWith('image/') ? (
                                  <img 
                                    src={`${API_URL}${msg.attachment.url}`} 
                                    alt={msg.attachment.fileName} 
                                    className="max-w-xs rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity" 
                                    onClick={() => setFullScreenImage(`${API_URL}${msg.attachment.url}`)}
                                  />
                                ) : msg.attachment.fileType.startsWith('video/') ? (
                                  <video src={`${API_URL}${msg.attachment.url}`} controls className="max-w-xs rounded-lg border border-border" />
                                ) : (
                                  <a href={`${API_URL}${msg.attachment.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-accent-blue bg-accent-blue/10 px-3 py-2 rounded-lg hover:underline">
                                    <File size={16} />
                                    <span className="truncate max-w-[200px]">{msg.attachment.fileName}</span>
                                  </a>
                                )}
                              </div>
                            )}
                            {msg.text && <p className="pr-12">{msg.text}</p>}
                            {msg.isEdited && <span className="text-[10px] text-text-secondary italic ml-2 opacity-60">(edited)</span>}
                          </div>
                          
                          {user?._id === msg.sender._id && (
                            <div className="absolute -right-10 top-2 hidden group-hover/msg:flex items-center space-x-1 bg-bg-secondary border border-border rounded-lg shadow-sm p-1 z-10">
                              <button onClick={() => { setEditingMessageId(msg._id); setEditMessageText(msg.text); }} className="p-1 text-text-secondary hover:text-accent-blue transition-colors">
                                <Edit2 size={12} />
                              </button>
                              <button onClick={() => handleDeleteMessage(msg._id)} className="p-1 text-text-secondary hover:text-danger transition-colors">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message Input */}
        <div className="p-4 bg-bg-secondary border-t border-border">
          <form onSubmit={handleSendMessage} className="relative flex items-end">
            
            <div className="absolute left-2 bottom-2 flex items-center space-x-1 z-10">
              <div className="relative">
                <button 
                  type="button" 
                  onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                  className="p-1.5 text-text-secondary hover:text-accent-blue hover:bg-bg-primary rounded-lg transition-colors"
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
              className="w-full bg-bg-primary border border-border rounded-xl pl-[5.5rem] pr-12 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors resize-none overflow-hidden"
              style={{ minHeight: '46px', maxHeight: '120px' }}
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="absolute right-3 bottom-3 text-white bg-accent-blue p-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:bg-text-secondary transition-colors"
            >
              <Send size={16} />
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
