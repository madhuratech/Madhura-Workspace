import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Send, Hash, MessageSquare, Plus, Info, Search, Image as ImageIcon, Edit2, Trash2, X } from 'lucide-react';

const Chat = () => {
  const { user, socket, onlineUsers: contextOnlineUsers } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', description: '', members: [] });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchWorkspaceAndChannels();
  }, [user]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (msg) => {
        if (activeChannel && String(msg.channel) === String(activeChannel._id)) {
          setMessages((prev) => {
            if (prev.find(m => String(m._id) === String(msg._id))) return prev;
            return [...prev, msg];
          });
        }
      };

      const handleMessageUpdated = (msg) => {
        if (activeChannel && String(msg.channel) === String(activeChannel._id)) {
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
      fetchMessages(activeChannel._id);
    }
  }, [activeChannel]);

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
        setWorkspace(detailRes.data);
        
        const chRes = await axios.get(`/workspaces/${ws._id}/channels`);
        if (chRes.data.length === 0) {
          const defCh = await axios.post(`/workspaces/${ws._id}/channels`, { name: 'general', description: 'Company-wide announcements and work-based matters' });
          setChannels([defCh.data]);
          setActiveChannel(defCh.data);
        } else {
          setChannels(chRes.data);
          setActiveChannel(chRes.data[0]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (channelId) => {
    if (!workspace) return;
    try {
      const res = await axios.get(`/workspaces/${workspace._id}/channels/${channelId}/messages`);
      setMessages(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel || !workspace) return;
    
    try {
      await axios.post(`/workspaces/${workspace._id}/channels/${activeChannel._id}/messages`, { text: newMessage });
      setNewMessage('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditMessage = async (msgId) => {
    if (!editMessageText.trim() || !activeChannel || !workspace) return;
    try {
      await axios.put(`/workspaces/${workspace._id}/channels/${activeChannel._id}/messages/${msgId}`, { text: editMessageText });
      setEditingMessageId(null);
      setEditMessageText('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!activeChannel || !workspace) return;
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await axios.delete(`/workspaces/${workspace._id}/channels/${activeChannel._id}/messages/${msgId}`);
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

  const handleDMClick = async (targetUserId) => {
    if (!workspace) return;
    try {
      const res = await axios.post(`/workspaces/${workspace._id}/channels/dm`, { targetUserId });
      
      // Add to channels if not already in the list
      setChannels(prev => {
        if (!prev.find(c => c._id === res.data._id)) {
          return [...prev, res.data];
        }
        return prev;
      });
      
      setActiveChannel(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const getChannelDisplayName = (channel) => {
    if (!channel) return 'select-channel';
    if (channel.name.startsWith('dm-')) {
      const userIds = channel.name.replace('dm-', '').split('-');
      const otherUserId = userIds.find(id => id !== user?._id);
      if (otherUserId && workspace?.members) {
        const otherMember = workspace.members.find(m => m.user && m.user._id === otherUserId);
        if (otherMember) {
          return otherMember.user.name || otherMember.user.email.split('@')[0];
        }
      }
      return 'Direct Message';
    }
    return channel.name;
  };

  if (loading) return null;
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
              return (
                <button 
                  key={member.user._id} 
                  onClick={() => handleDMClick(member.user._id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors group"
                >
                  <div className="flex items-center truncate">
                    <div className={`h-2 w-2 rounded-full mr-2 ${isOnline ? 'bg-success shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'border border-border'}`}></div>
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
              <Hash size={20} className="text-text-secondary mr-2" />
              {getChannelDisplayName(activeChannel)}
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
                          <p className="text-sm text-text-primary bg-bg-primary border border-border inline-block p-3 rounded-2xl rounded-tl-sm shadow-sm pr-12">
                            {msg.text}
                            {msg.isEdited && <span className="text-[10px] text-text-secondary italic ml-2 opacity-60">(edited)</span>}
                          </p>
                          
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
            <button type="button" className="absolute left-3 bottom-3 text-text-secondary hover:text-accent-blue transition-colors">
              <Plus size={20} />
            </button>
            <textarea 
              rows="1"
              placeholder={`Message ${getChannelDisplayName(activeChannel)}`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="w-full bg-bg-primary border border-border rounded-xl pl-12 pr-12 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors resize-none overflow-hidden"
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
    </div>
  );
};

export default Chat;
