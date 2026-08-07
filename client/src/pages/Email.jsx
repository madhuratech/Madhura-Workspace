import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Inbox, Star, Clock, Send, File, AlertCircle, MessageCircle, Calendar, Users, Mail, AlertTriangle, Paperclip, Check, X, Search, MoreVertical, Trash2, Archive } from 'lucide-react';
import Avatar from '../components/Avatar';

const Email = () => {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', bcc: '', subject: '', body: '' });
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [authRequired, setAuthRequired] = useState(false);
  const [viewingEmail, setViewingEmail] = useState(null);

  useEffect(() => {
    fetchWorkspace();
  }, [user]);

  useEffect(() => {
    if (workspace) {
      fetchEmails();
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
      setAuthRequired(false);
      const res = await axios.get(`/workspaces/${workspace._id}/emails?folder=${activeFolder}`);
      setEmails(res.data);
    } catch (error) {
      if (error.response?.status === 401 && error.response?.data?.authRequired) {
        setAuthRequired(true);
      }
      console.error('Failed to fetch emails', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const res = await axios.get('/auth/google/url');
      window.location.href = res.data.url;
    } catch (error) {
      console.error('Failed to get auth URL', error);
      alert('Failed to initialize Google Authentication');
    }
  };

  const handleConnectMicrosoft = async () => {
    try {
      const res = await axios.get('/auth/microsoft/url');
      window.location.href = res.data.url;
    } catch (error) {
      console.error('Failed to get Microsoft auth URL', error);
      alert('Failed to initialize Microsoft Authentication');
    }
  };

  const handleDisconnectGmail = async () => {
    if(!window.confirm('Are you sure you want to disconnect your Google account?')) return;
    try {
      await axios.delete('/auth/google/revoke');
      setAuthRequired(true);
      setEmails([]);
    } catch (error) {
      console.error('Failed to disconnect Google', error);
      alert('Failed to disconnect Google account');
    }
  };

  const handleDisconnectMicrosoft = async () => {
    if(!window.confirm('Are you sure you want to disconnect your Microsoft account?')) return;
    try {
      await axios.delete('/auth/microsoft/revoke');
      setAuthRequired(true);
      setEmails([]);
    } catch (error) {
      console.error('Failed to disconnect Microsoft', error);
      alert('Failed to disconnect Microsoft account');
    }
  };

  // Removed workspace members fetch

  const handleSendEmail = async (isDraft = false) => {
    if (!composeData.to && !composeData.bcc) return alert('Please specify a recipient');
    try {
      await axios.post(`/workspaces/${workspace._id}/emails`, {
        recipients: composeData.to.split(',').map(e => e.trim()).filter(e => e),
        bcc: composeData.bcc ? [composeData.bcc] : [],
        subject: composeData.subject,
        body: composeData.body, // Google API uses body
        isDraft
      });
      setIsComposing(false);
      setComposeData({ to: '', bcc: '', subject: '', body: '' });
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
    <div className="absolute inset-6 flex flex-col font-sans bg-bg-primary">
      <div className="mb-6 flex justify-between items-center shrink-0">
        <h1 className="text-2xl font-bold text-text-primary">Email</h1>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex flex-col shrink-0">
          <button 
            onClick={() => setIsComposing(true)}
            className="w-full bg-accent-blue hover:bg-green-600 text-white py-3 rounded-lg flex items-center justify-center font-medium transition-colors mb-6 shadow-sm"
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
                      onClick={() => { setActiveFolder(folder.id); setIsComposing(false); setViewingEmail(null); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeFolder === folder.id && !isComposing && !viewingEmail ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'}`}
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
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${activeFolder === folder.id && !isComposing ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'}`}
                    >
                      <span className="mr-3 opacity-80">{folder.icon}</span>
                      {folder.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {!authRequired && user?.activeEmailProvider === 'google' && (
              <div className="mt-8 px-2">
                <button 
                  onClick={handleDisconnectGmail}
                  className="w-full flex items-center justify-center px-4 py-2 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Disconnect Gmail
                </button>
              </div>
            )}
            {!authRequired && user?.activeEmailProvider === 'microsoft' && (
              <div className="mt-8 px-2">
                <button 
                  onClick={handleDisconnectMicrosoft}
                  className="w-full flex items-center justify-center px-4 py-2 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Disconnect Microsoft
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-bg-secondary border border-border rounded-xl flex flex-col overflow-hidden shadow-sm">
          {isComposing ? (
            // Compose View
            <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
              <h2 className="text-lg font-bold text-text-primary mb-6">New Message</h2>
              
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">From *</label>
                  <select disabled className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue appearance-none">
                    <option>{user.email}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">To *</label>
                  <input 
                    type="text"
                    placeholder="example@gmail.com, team@company.com"
                    value={composeData.to}
                    onChange={(e) => setComposeData({...composeData, to: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">BCC</label>
                  <input 
                    type="text"
                    placeholder="hidden@company.com"
                    value={composeData.bcc}
                    onChange={(e) => setComposeData({...composeData, bcc: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Subject *</label>
                  <input 
                    type="text" 
                    value={composeData.subject}
                    onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Message</label>
                <textarea 
                  placeholder="Type Here"
                  value={composeData.body}
                  onChange={(e) => setComposeData({...composeData, body: e.target.value})}
                  className="flex-1 w-full bg-bg-primary border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-accent-blue resize-none custom-scrollbar"
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
                  className="flex items-center px-6 py-2 bg-accent-blue hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Send size={16} className="mr-2" /> Send Email
                </button>
              </div>
            </div>
          ) : !viewingEmail ? (
            // Email List View
            <div className="flex-1 flex flex-col min-h-0">
              {/* Toolbar */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-bg-secondary">
                <div className="flex items-center gap-2 text-text-secondary">
                  <div className="w-10 flex justify-center">
                    <input 
                      type="checkbox" 
                      className="accent-accent-blue"
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
                    className="pl-9 pr-4 py-1.5 bg-bg-primary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue w-64"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {authRequired ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 bg-bg-secondary text-center animate-fade-in">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                      <Mail size={40} className="text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary mb-3">Connect your Email Workspace</h2>
                    <p className="text-text-secondary max-w-md mb-8">
                      To read and send real emails from this module, you need to authorize Madhura Workspace to access your email provider.
                    </p>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleConnectGmail}
                        className="px-6 py-3 bg-[#4285f4] text-white font-medium rounded-lg hover:bg-[#1b2b4c]/90 transition-colors shadow-md flex items-center"
                      >
                        <svg className="w-5 h-5 mr-3 bg-white rounded-full p-1" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Sign in with Google
                      </button>
                      <button 
                        onClick={handleConnectMicrosoft}
                        className="px-6 py-3 bg-[#00a4ef] text-white font-medium rounded-lg hover:bg-[#1b2b4c]/90 transition-colors shadow-md flex items-center"
                      >
                        <svg className="w-5 h-5 mr-3 bg-white rounded-full p-1" viewBox="0 0 24 24"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#7fba00" d="M12 1h10v10H12z"/><path fill="#00a4ef" d="M1 12h10v10H1z"/><path fill="#ffb900" d="M12 12h10v10H12z"/></svg>
                        Sign in with Microsoft
                      </button>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="p-8 flex justify-center text-text-secondary">Loading emails...</div>
                ) : emails.length === 0 ? (
                  <div className="p-12 flex flex-col items-center justify-center text-text-secondary">
                    <Mail size={48} className="mb-4 opacity-20" />
                    <p>No emails in {activeFolder}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {emails.map((email) => {
                      const isUnread = !email.isRead;
                      const isStarred = false; // Starred feature would need actual Gmail label modifications
                      const isSelected = selectedEmails.includes(email._id);
                      const displayUser = activeFolder === 'sent' ? email.to : email.from;
                      
                      return (
                        <div 
                          key={email._id} 
                          className={`flex items-center px-4 py-3 hover:shadow-md transition-all cursor-pointer border-l-2 ${isSelected ? 'bg-bg-primary border-accent-blue' : isUnread ? 'bg-bg-primary/50 border-accent-blue/50' : 'bg-transparent border-transparent'}`}
                        >
                          <div className="flex items-center gap-4 w-48 shrink-0 text-text-secondary">
                            <input 
                              type="checkbox" 
                              className="accent-accent-blue"
                              checked={isSelected}
                              onChange={() => toggleSelectEmail(email._id)}
                            />
                            <button onClick={(e) => { e.stopPropagation(); toggleStar(email._id); }} className="hover:text-warning transition-colors">
                              <Star size={18} className={isStarred ? 'fill-warning text-warning' : ''} />
                            </button>
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar user={{ name: displayUser ? displayUser.split('<')[0].trim() : '?' }} size="w-6 h-6" textClass="text-xs" showStatus={false} className="shrink-0" />
                              <span className={`text-sm truncate ${isUnread ? 'text-text-primary font-bold' : 'text-text-primary'}`}>
                                {displayUser ? displayUser.split('<')[0].trim() : 'Unknown'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex-1 flex items-center min-w-0 pr-4" onClick={() => setViewingEmail(email)}>
                            <span className={`text-sm truncate ${isUnread ? 'text-text-primary font-bold' : 'text-text-secondary'}`}>
                              {email.subject || '(No Subject)'} 
                              <span className="font-normal opacity-70 ml-2">
                                - {email.snippet ? email.snippet.replace(/&quot;/g, '"').substring(0, 50) + '...' : ''}
                              </span>
                            </span>
                          </div>
                          
                          <div className="text-xs text-text-secondary shrink-0">
                            {new Date(email.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : viewingEmail ? (
            // Read Email View
            <div className="flex-1 flex flex-col h-full bg-bg-secondary min-h-0">
              <div className="p-4 border-b border-border flex items-center gap-4 bg-bg-primary shrink-0">
                <button onClick={() => setViewingEmail(null)} className="text-text-secondary hover:text-text-primary font-medium text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-bg-secondary transition-colors">
                  &larr; Back to {activeFolder}
                </button>
                <div className="flex gap-2">
                  <button className="p-1.5 hover:bg-bg-secondary text-text-secondary rounded-lg transition-colors border border-transparent"><Archive size={18} /></button>
                  <button className="p-1.5 hover:bg-bg-secondary text-text-secondary rounded-lg transition-colors border border-transparent"><Trash2 size={18} /></button>
                </div>
              </div>
              
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <h2 className="text-2xl font-bold text-text-primary mb-6">{viewingEmail.subject || '(No Subject)'}</h2>
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <Avatar user={{ name: viewingEmail.from ? viewingEmail.from.split('<')[0].trim() : '?' }} size="w-12 h-12" textClass="text-lg" showStatus={false} className="shrink-0" />
                    <div>
                      <div className="font-bold text-text-primary">{viewingEmail.from}</div>
                      <div className="text-sm text-text-secondary">to {viewingEmail.to}</div>
                    </div>
                  </div>
                  <div className="text-sm text-text-secondary">
                    {new Date(viewingEmail.date).toLocaleString()}
                  </div>
                </div>
                
                <div className="text-text-primary leading-relaxed whitespace-pre-wrap font-sans bg-bg-primary p-6 rounded-xl border border-border shadow-sm min-h-[300px]">
                  {/* Google snippet since we don't have full body fetched in list yet. This gives the user enough to see the email content for now. */}
                  {viewingEmail.snippet.replace(/&quot;/g, '"')}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Email;
