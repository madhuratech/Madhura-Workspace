import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Send, Hash, MessageSquare, Plus, Info, Search, Image as ImageIcon } from 'lucide-react';

const Chat = () => {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchWorkspaceAndChannels();

    // Initialize Socket
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(API_URL);
    setSocket(newSocket);
    
    if (user?._id) {
      newSocket.emit('user_connected', user._id);
    }

    return () => newSocket.close();
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', (msg) => {
        // Only append if it belongs to our active channel
        if (activeChannel && msg.channel === activeChannel._id) {
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.find(m => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
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
    }
    return () => {
      if (socket) socket.off('new_message');
    };
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

  const handleCreateChannel = async () => {
    const name = prompt('Enter new channel name (e.g. engineering, marketing):');
    if (!name || !workspace) return;
    try {
      const res = await axios.post(`/workspaces/${workspace._id}/channels`, { name: name.toLowerCase().replace(/\s+/g, '-') });
      setChannels([...channels, res.data]);
      setActiveChannel(res.data);
    } catch (error) {
      alert('Failed to create channel');
    }
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
      return 'Direct Message';
    }
    return channel.name;
  };

  if (loading) return <div className="p-8 text-text-secondary">Loading chat environment...</div>;
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
            <button onClick={handleCreateChannel} className="text-text-secondary hover:text-text-primary transition-colors">
              <Plus size={16} />
            </button>
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
            <button className="text-text-secondary hover:text-text-primary transition-colors">
              <Plus size={16} />
            </button>
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
          
          <div className="flex items-center space-x-4 text-text-secondary">
            <button className="hover:text-text-primary transition-colors"><Search size={18} /></button>
            <button className="hover:text-text-primary transition-colors"><Info size={18} /></button>
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
                  
                  <div className="flex-1 min-w-0">
                    {showHeader && (
                      <div className="flex items-baseline space-x-2 mb-1">
                        <span className="font-bold text-text-primary text-sm">{msg.sender?.name || 'User'}</span>
                        <span className="text-xs text-text-secondary">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    <p className="text-sm text-text-primary bg-bg-primary border border-border inline-block p-3 rounded-2xl rounded-tl-sm shadow-sm">
                      {msg.text}
                    </p>
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
          <div className="flex justify-between items-center mt-2 px-2">
            <p className="text-[10px] text-text-secondary"><strong>Return</strong> to send, <strong>Shift + Return</strong> to add a new line</p>
            <div className="flex space-x-3 text-text-secondary">
              <ImageIcon size={14} className="hover:text-text-primary cursor-pointer" />
              <span className="font-bold text-[10px] hover:text-text-primary cursor-pointer">@</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
