import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Inbox, Star, Clock, Send, File, AlertCircle, MessageCircle, Calendar, Users, Mail, AlertTriangle, Paperclip, Check, X, Search, MoreVertical, Trash2, Archive } from 'lucide-react';

const Email = () => {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', bcc: '', subject: '', message: '' });
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);

  useEffect(() => {
    fetchWorkspace();
  }, [user]);

  useEffect(() => {
    if (workspace) {
      fetchEmails();
      fetchWorkspaceMembers();
    }
  }, [workspace, activeFolder]);

  const fetchWorkspace = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const detailRes = await axios.get(`/workspaces/${wsRes.data[0]._id}`);
        setWorkspace(detailRes.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/workspaces/${workspace._id}/emails?folder=${activeFolder}`);
      setEmails(res.data);
    } catch (error) {
      console.error('Failed to fetch emails', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaceMembers = async () => {
    try {
      const res = await axios.get(`/workspaces/${workspace._id}/members`);
      setWorkspaceMembers(res.data.filter(m => m.user && m.user._id !== user._id));
    } catch (error) {
      console.error('Failed to fetch members', error);
    }
  };

  const handleSendEmail = async (isDraft = false) => {
    if (!composeData.to && !composeData.bcc) return alert('Please specify a recipient');
    try {
      await axios.post(`/workspaces/${workspace._id}/emails`, {
        recipients: composeData.to ? [composeData.to] : [],
        bcc: composeData.bcc ? [composeData.bcc] : [],
        subject: composeData.subject,
        message: composeData.message,
        isDraft
      });
      setIsComposing(false);
      setComposeData({ to: '', bcc: '', subject: '', message: '' });
      fetchEmails();
    } catch (error) {
      console.error('Failed to send email', error);
    }
  };

  const toggleStar = async (emailId) => {
    const email = emails.find(e => e._id === emailId);
    const isStarred = email.starredBy && email.starredBy.includes(user._id);
    const action = isStarred ? 'unstar' : 'star';
    try {
      await axios.put(`/workspaces/${workspace._id}/emails/${emailId}/status`, { action });
      fetchEmails();
    } catch (error) {
      console.error('Failed to star email', error);
    }
  };

  const toggleSelectEmail = (emailId) => {
    if (selectedEmails.includes(emailId)) {
      setSelectedEmails(selectedEmails.filter(id => id !== emailId));
    } else {
      setSelectedEmails([...selectedEmails, emailId]);
    }
  };

  const moveToTrash = async () => {
    try {
      for (const id of selectedEmails) {
        await axios.put(`/workspaces/${workspace._id}/emails/${id}/status`, { action: 'trash' });
      }
      setSelectedEmails([]);
      fetchEmails();
    } catch (error) {
      console.error('Failed to trash emails', error);
    }
  };

  const folders = [
    { id: 'inbox', name: 'Inbox', icon: <Inbox size={18} />, count: emails.filter(e => e.readBy && !e.readBy.includes(user._id)).length },
    { id: 'starred', name: 'Starred', icon: <Star size={18} /> },
    { id: 'snoozed', name: 'Snoozed', icon: <Clock size={18} /> },
    { id: 'sent', name: 'Sent', icon: <Send size={18} /> },
    { id: 'drafts', name: 'Drafts', icon: <File size={18} /> },
    { id: 'important', name: 'Important', icon: <AlertCircle size={18} /> },
    { id: 'chats', name: 'Chats', icon: <MessageCircle size={18} /> },
    { id: 'scheduled', name: 'Scheduled', icon: <Calendar size={18} /> },
  ];

  const others = [
    { id: 'all', name: 'All Emails', icon: <Mail size={18} /> },
    { id: 'spam', name: 'Spam', icon: <AlertTriangle size={18} /> },
  ];

  if (!workspace) return <div className="p-8">Loading workspace...</div>;

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Email</h1>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex flex-col shrink-0">
          <button 
            onClick={() => setIsComposing(true)}
            className="w-full bg-accent-green hover:bg-green-600 text-white py-3 rounded-lg flex items-center justify-center font-medium transition-colors mb-6 shadow-sm"
          >
            <span className="mr-2 text-xl font-light">◇</span> Compose New
          </button>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="mb-6">
              <div className="flex items-center justify-between text-text-secondary text-sm font-bold mb-2 px-2">
                <span>Mail</span>
                <span className="cursor-pointer hover:text-text-primary transition-colors text-xs">v</span>
              </div>
              <ul className="space-y-1">
                {folders.map(folder => (
                  <li key={folder.id}>
                    <button 
                      onClick={() => { setActiveFolder(folder.id); setIsComposing(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeFolder === folder.id && !isComposing ? 'bg-accent-green/10 text-accent-green font-medium' : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'}`}
                    >
                      <div className="flex items-center">
                        <span className="mr-3 opacity-80">{folder.icon}</span>
                        {folder.name}
                      </div>
                      {folder.id === 'inbox' && folder.count > 0 && (
                        <span className="bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{folder.count}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between text-text-secondary text-sm font-bold mb-2 px-2">
                <span>Others</span>
                <span className="cursor-pointer hover:text-text-primary transition-colors text-xs">v</span>
              </div>
              <ul className="space-y-1">
                {others.map(folder => (
                  <li key={folder.id}>
                    <button 
                      onClick={() => { setActiveFolder(folder.id); setIsComposing(false); }}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${activeFolder === folder.id && !isComposing ? 'bg-accent-green/10 text-accent-green font-medium' : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'}`}
                    >
                      <span className="mr-3 opacity-80">{folder.icon}</span>
                      {folder.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-bg-secondary border border-border rounded-xl flex flex-col overflow-hidden shadow-sm">
          {isComposing ? (
            // Compose View
            <div className="flex-1 flex flex-col p-6">
              <h2 className="text-lg font-bold text-text-primary mb-6">New Message</h2>
              
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">From *</label>
                  <select disabled className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-green appearance-none">
                    <option>{user.email}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">To *</label>
                  <select 
                    value={composeData.to}
                    onChange={(e) => setComposeData({...composeData, to: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-green appearance-none"
                  >
                    <option value="">Select recipient</option>
                    {workspaceMembers.map(m => (
                      <option key={m.user._id} value={m.user._id}>{m.user.name} ({m.user.email})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">BCC</label>
                  <select 
                    value={composeData.bcc}
                    onChange={(e) => setComposeData({...composeData, bcc: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-green appearance-none"
                  >
                    <option value="">Select</option>
                    {workspaceMembers.map(m => (
                      <option key={m.user._id} value={m.user._id}>{m.user.name} ({m.user.email})</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Subject *</label>
                  <input 
                    type="text" 
                    value={composeData.subject}
                    onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-green"
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Message</label>
                <textarea 
                  placeholder="Type Here"
                  value={composeData.message}
                  onChange={(e) => setComposeData({...composeData, message: e.target.value})}
                  className="flex-1 w-full bg-bg-primary border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-accent-green resize-none custom-scrollbar"
                ></textarea>
              </div>

              <div className="mb-4">
                <button className="flex items-center bg-bg-primary hover:bg-black/5 dark:hover:bg-white/5 border border-border text-text-primary px-4 py-2 rounded-lg transition-colors text-sm font-medium">
                  <Paperclip size={16} className="mr-2" /> Attachment
                </button>
                <p className="text-xs text-text-secondary mt-2">Max upload file size: 32MB</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button 
                  onClick={() => handleSendEmail(true)}
                  className="flex items-center px-4 py-2 bg-bg-primary hover:bg-black/5 dark:hover:bg-white/5 border border-border rounded-lg text-text-primary text-sm font-medium transition-colors"
                >
                  <File size={16} className="mr-2" /> Make as Draft
                </button>
                <button 
                  onClick={() => { setIsComposing(false); setComposeData({to:'', bcc:'', subject:'', message:''}) }}
                  className="flex items-center px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors"
                >
                  <X size={16} className="mr-2" /> Discard
                </button>
                <button 
                  onClick={() => handleSendEmail(false)}
                  className="flex items-center px-6 py-2 bg-accent-green hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Send size={16} className="mr-2" /> Send Email
                </button>
              </div>
            </div>
          ) : (
            // Email List View
            <div className="flex-1 flex flex-col">
              {/* Toolbar */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-bg-secondary">
                <div className="flex items-center gap-2 text-text-secondary">
                  <div className="w-10 flex justify-center">
                    <input 
                      type="checkbox" 
                      className="accent-accent-green"
                      checked={emails.length > 0 && selectedEmails.length === emails.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedEmails(emails.map(m => m._id));
                        else setSelectedEmails([]);
                      }}
                    />
                  </div>
                  <button className="p-1.5 hover:bg-bg-primary hover:text-text-primary rounded-lg transition-colors border border-transparent hover:border-border"><Archive size={16} /></button>
                  <button onClick={moveToTrash} className="p-1.5 hover:bg-bg-primary hover:text-text-primary rounded-lg transition-colors border border-transparent hover:border-border"><Trash2 size={16} /></button>
                  <button className="p-1.5 hover:bg-bg-primary hover:text-text-primary rounded-lg transition-colors border border-transparent hover:border-border"><MoreVertical size={16} /></button>
                </div>
                
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input 
                    type="text" 
                    placeholder="Search" 
                    className="pl-9 pr-4 py-1.5 bg-bg-primary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-green w-64"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="p-8 flex justify-center text-text-secondary">Loading emails...</div>
                ) : emails.length === 0 ? (
                  <div className="p-12 flex flex-col items-center justify-center text-text-secondary">
                    <Mail size={48} className="mb-4 opacity-20" />
                    <p>No emails in {activeFolder}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {emails.map((email) => {
                      const isUnread = activeFolder === 'inbox' && (!email.readBy || !email.readBy.includes(user._id));
                      const isStarred = email.starredBy && email.starredBy.includes(user._id);
                      const isSelected = selectedEmails.includes(email._id);
                      const displayUser = activeFolder === 'sent' || activeFolder === 'drafts' ? 
                        email.recipients?.[0]?.name || 'Unknown' : 
                        email.sender?.name || 'Unknown';
                      
                      return (
                        <div 
                          key={email._id} 
                          className={`flex items-center px-4 py-3 hover:shadow-md transition-all cursor-pointer border-l-2 ${isSelected ? 'bg-bg-primary border-accent-green' : isUnread ? 'bg-bg-primary/50 border-accent-green/50' : 'bg-transparent border-transparent'}`}
                        >
                          <div className="flex items-center gap-4 w-48 shrink-0 text-text-secondary">
                            <input 
                              type="checkbox" 
                              className="accent-accent-green"
                              checked={isSelected}
                              onChange={() => toggleSelectEmail(email._id)}
                            />
                            <button onClick={(e) => { e.stopPropagation(); toggleStar(email._id); }} className="hover:text-warning transition-colors">
                              <Star size={18} className={isStarred ? 'fill-warning text-warning' : ''} />
                            </button>
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold text-xs shrink-0">
                                {displayUser.charAt(0).toUpperCase()}
                              </div>
                              <span className={`text-sm truncate ${isUnread ? 'text-text-primary font-bold' : 'text-text-primary'}`}>
                                {displayUser}
                                {activeFolder !== 'sent' && activeFolder !== 'drafts' && email.sender?._id === user._id && ', me'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex-1 flex items-center min-w-0 pr-4" onClick={() => {/* Open Email Detail (For now just mark read) */}}>
                            <span className={`text-sm truncate ${isUnread ? 'text-text-primary font-bold' : 'text-text-secondary'}`}>
                              {email.subject || '(No Subject)'} 
                              <span className="font-normal opacity-70 ml-2">
                                - {email.message ? email.message.substring(0, 50) + '...' : ''}
                              </span>
                            </span>
                          </div>
                          
                          <div className="text-xs text-text-secondary shrink-0">
                            {new Date(email.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Email;
