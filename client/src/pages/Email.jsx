import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { 
  Inbox, Star, Clock, Send, File, AlertCircle, MessageCircle, 
  Calendar, Mail, AlertTriangle, Paperclip, Check, X, Search, 
  MoreVertical, Trash2, Archive, Menu, ChevronDown, ChevronRight, 
  ChevronLeft, RotateCw, Reply, Forward, CheckCheck, Eye
} from 'lucide-react';
import Avatar from '../components/Avatar';

const Email = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext) || { showToast: (msg) => console.log(msg) };
  
  const [workspace, setWorkspace] = useState(null);
  const [emails, setEmails] = useState([]);
  const [totalEstimated, setTotalEstimated] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Collapsible sidebar sections
  const [mailOpen, setMailOpen] = useState(true);
  const [othersOpen, setOthersOpen] = useState(true);

  // Pagination states
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [tokenStack, setTokenStack] = useState(['']); // index 0 is page 1 (empty token)
  
  // Selection & Actions
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  // Compose & View
  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', cc: '', bcc: '', subject: '', body: '' });
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [viewingEmail, setViewingEmail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [showMobileFolders, setShowMobileFolders] = useState(false);

  // Close more menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
      setTokenStack(['']);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchWorkspace();
  }, [user]);

  useEffect(() => {
    if (workspace) {
      fetchEmails();
    }
  }, [workspace, activeFolder, debouncedSearch, pageSize, currentPage]);

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

  const fetchEmails = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setAuthRequired(false);

      const currentToken = tokenStack[currentPage - 1] || '';
      const skip = (currentPage - 1) * pageSize;
      
      const res = await axios.get(`/workspaces/${workspace._id}/emails`, {
        params: {
          folder: activeFolder,
          search: debouncedSearch,
          maxResults: pageSize,
          pageToken: currentToken,
          skip: skip
        }
      });

      if (Array.isArray(res.data)) {
        setEmails(res.data);
        setTotalEstimated(res.data.length);
        setNextPageToken(null);
      } else {
        setEmails(res.data.emails || []);
        setNextPageToken(res.data.nextPageToken || null);
        setTotalEstimated(res.data.resultSizeEstimate || (res.data.emails || []).length);
      }
      setSelectedEmails([]);
    } catch (error) {
      if (error.response?.status === 401 && error.response?.data?.authRequired) {
        setAuthRequired(true);
      }
      console.error('Failed to fetch emails', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNextPage = () => {
    if (!nextPageToken && emails.length < pageSize) return;
    if (nextPageToken) {
      const newStack = [...tokenStack];
      newStack[currentPage] = nextPageToken;
      setTokenStack(newStack);
    }
    setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleFolderChange = (folderId) => {
    setActiveFolder(folderId);
    setCurrentPage(1);
    setTokenStack(['']);
    setSearchQuery('');
    setDebouncedSearch('');
    setIsComposing(false);
    setViewingEmail(null);
    setShowMobileFolders(false);
  };

  const openEmailDetail = async (email) => {
    setViewingEmail(email);
    setLoadingDetail(true);
    try {
      const res = await axios.get(`/workspaces/${workspace._id}/emails/${email._id}`);
      setViewingEmail(res.data);
      // Update local read state
      setEmails(prev => prev.map(e => e._id === email._id ? { ...e, isRead: true } : e));
    } catch (error) {
      console.error('Failed to load email details:', error);
    } finally {
      setLoadingDetail(false);
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
    if (!window.confirm('Are you sure you want to disconnect your Google account?')) return;
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
    if (!window.confirm('Are you sure you want to disconnect your Microsoft account?')) return;
    try {
      await axios.delete('/auth/microsoft/revoke');
      setAuthRequired(true);
      setEmails([]);
    } catch (error) {
      console.error('Failed to disconnect Microsoft', error);
      alert('Failed to disconnect Microsoft account');
    }
  };

  const handleSendEmail = async (isDraft = false) => {
    if (!composeData.to && !composeData.bcc) {
      return alert('Please specify at least one recipient');
    }
    try {
      await axios.post(`/workspaces/${workspace._id}/emails`, {
        recipients: composeData.to.split(',').map(e => e.trim()).filter(Boolean),
        cc: composeData.cc ? composeData.cc.split(',').map(e => e.trim()).filter(Boolean) : [],
        bcc: composeData.bcc ? composeData.bcc.split(',').map(e => e.trim()).filter(Boolean) : [],
        subject: composeData.subject,
        body: composeData.body,
        isDraft
      });
      setIsComposing(false);
      setComposeData({ to: '', cc: '', bcc: '', subject: '', body: '' });
      showToast('Email sent successfully!', 'success');
      fetchEmails();
    } catch (error) {
      console.error('Failed to send email', error);
      showToast('Failed to send email. Please check configuration.', 'error');
    }
  };

  const toggleStar = async (emailId, e) => {
    if (e) e.stopPropagation();
    const email = emails.find(e => e._id === emailId) || viewingEmail;
    const isCurrentlyStarred = email?.isStarred;
    const action = isCurrentlyStarred ? 'unstar' : 'star';

    // Optimistic UI update
    setEmails(prev => prev.map(item => item._id === emailId ? { ...item, isStarred: !isCurrentlyStarred } : item));
    if (viewingEmail && viewingEmail._id === emailId) {
      setViewingEmail(prev => ({ ...prev, isStarred: !isCurrentlyStarred }));
    }

    try {
      await axios.put(`/workspaces/${workspace._id}/emails/${emailId}/status`, { action });
    } catch (error) {
      console.error('Failed to star/unstar email', error);
      fetchEmails();
    }
  };

  const toggleSelectEmail = (emailId, e) => {
    if (e) e.stopPropagation();
    if (selectedEmails.includes(emailId)) {
      setSelectedEmails(selectedEmails.filter(id => id !== emailId));
    } else {
      setSelectedEmails([...selectedEmails, emailId]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmails(emails.map(m => m._id));
    } else {
      setSelectedEmails([]);
    }
  };

  const handleArchive = async () => {
    const targets = viewingEmail ? [viewingEmail._id] : selectedEmails;
    if (targets.length === 0) return;
    try {
      for (const id of targets) {
        await axios.put(`/workspaces/${workspace._id}/emails/${id}/status`, { action: 'archive' });
      }
      showToast(`${targets.length} email(s) archived`, 'success');
      setSelectedEmails([]);
      if (viewingEmail) setViewingEmail(null);
      fetchEmails();
    } catch (error) {
      console.error('Failed to archive emails', error);
      showToast('Failed to archive emails', 'error');
    }
  };

  const moveToTrash = async () => {
    const targets = viewingEmail ? [viewingEmail._id] : selectedEmails;
    if (targets.length === 0) return;
    try {
      for (const id of targets) {
        await axios.put(`/workspaces/${workspace._id}/emails/${id}/status`, { action: 'trash' });
      }
      showToast(`${targets.length} email(s) moved to trash`, 'success');
      setSelectedEmails([]);
      if (viewingEmail) setViewingEmail(null);
      fetchEmails();
    } catch (error) {
      console.error('Failed to trash emails', error);
      showToast('Failed to move emails to trash', 'error');
    }
  };

  const handleMarkAsRead = async (isRead = true) => {
    const targets = viewingEmail ? [viewingEmail._id] : selectedEmails;
    if (targets.length === 0) return;
    const action = isRead ? 'mark_read' : 'mark_unread';
    try {
      for (const id of targets) {
        await axios.put(`/workspaces/${workspace._id}/emails/${id}/status`, { action });
      }
      setEmails(prev => prev.map(e => targets.includes(e._id) ? { ...e, isRead } : e));
      showToast(`Marked ${targets.length} email(s) as ${isRead ? 'read' : 'unread'}`, 'success');
      setSelectedEmails([]);
      setShowMoreMenu(false);
    } catch (error) {
      console.error('Failed to update read status', error);
    }
  };

  const handleReply = () => {
    if (!viewingEmail) return;
    const sender = viewingEmail.from?.includes('<') 
      ? viewingEmail.from.match(/<([^>]+)>/)?.[1] || viewingEmail.from 
      : viewingEmail.from;
    setComposeData({
      to: sender,
      cc: '',
      bcc: '',
      subject: viewingEmail.subject?.startsWith('Re:') ? viewingEmail.subject : `Re: ${viewingEmail.subject || ''}`,
      body: `\n\n\n--- On ${new Date(viewingEmail.date).toLocaleString()}, ${viewingEmail.from} wrote ---\n${viewingEmail.snippet || ''}`
    });
    setIsComposing(true);
  };

  const handleForward = () => {
    if (!viewingEmail) return;
    setComposeData({
      to: '',
      cc: '',
      bcc: '',
      subject: viewingEmail.subject?.startsWith('Fwd:') ? viewingEmail.subject : `Fwd: ${viewingEmail.subject || ''}`,
      body: `\n\n\n---------- Forwarded message ---------\nFrom: ${viewingEmail.from}\nDate: ${new Date(viewingEmail.date).toLocaleString()}\nSubject: ${viewingEmail.subject}\nTo: ${viewingEmail.to}\n\n${viewingEmail.body || viewingEmail.snippet || ''}`
    });
    setIsComposing(true);
  };

  const folders = [
    { id: 'inbox', name: 'Inbox', icon: <Inbox size={17} />, count: emails.filter(e => !e.isRead).length },
    { id: 'starred', name: 'Starred', icon: <Star size={17} /> },
    { id: 'snoozed', name: 'Snoozed', icon: <Clock size={17} /> },
    { id: 'sent', name: 'Sent', icon: <Send size={17} /> },
    { id: 'drafts', name: 'Drafts', icon: <File size={17} /> },
    { id: 'important', name: 'Important', icon: <AlertCircle size={17} /> },
    { id: 'chats', name: 'Chats', icon: <MessageCircle size={17} /> },
    { id: 'scheduled', name: 'Scheduled', icon: <Calendar size={17} /> },
  ];

  const others = [
    { id: 'all', name: 'All Emails', icon: <Mail size={17} /> },
    { id: 'spam', name: 'Spam', icon: <AlertTriangle size={17} /> },
    { id: 'trash', name: 'Trash', icon: <Trash2 size={17} /> },
  ];

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = startIndex + emails.length - 1;

  if (!workspace) return <div className="p-8 text-text-secondary">Loading workspace...</div>;

  return (
    <div className="h-full flex flex-col font-sans bg-bg-primary p-3 md:p-6 overflow-hidden">
      
      {/* Header */}
      <div className="mb-3 md:mb-5 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary font-outfit">Email</h1>
          <p className="text-xs text-text-secondary">Connected enterprise mailbox &amp; communications</p>
        </div>
      </div>

      <div className="flex-1 flex gap-0 md:gap-5 overflow-hidden">
        
        {/* ── SIDEBAR ── */}
        <div className={`${!showMobileFolders ? 'hidden md:flex' : 'flex'} w-full md:w-60 flex-col shrink-0 bg-bg-primary`}>
          
          {/* Compose Button */}
          <button 
            onClick={() => { setIsComposing(true); setViewingEmail(null); }}
            className="w-full bg-accent-blue hover:bg-accent-indigo text-white py-2.5 px-4 rounded-xl flex items-center justify-center font-semibold text-sm transition-all mb-4 shadow-sm cursor-pointer"
          >
            <span className="mr-2 text-lg font-light">◇</span> Compose New
          </button>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
            
            {/* Mail Section */}
            <div>
              <div 
                onClick={() => setMailOpen(!mailOpen)}
                className="flex items-center justify-between text-text-secondary text-xs font-bold uppercase tracking-wider mb-1.5 px-3 py-1 cursor-pointer hover:text-text-primary select-none"
              >
                <span>Mail</span>
                {mailOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
              
              {mailOpen && (
                <ul className="space-y-0.5">
                  {folders.map(folder => {
                    const isActive = activeFolder === folder.id && !isComposing && !viewingEmail;
                    return (
                      <li key={folder.id}>
                        <button 
                          onClick={() => handleFolderChange(folder.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                            isActive 
                              ? 'bg-accent-blue/10 text-accent-blue font-bold' 
                              : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={isActive ? 'text-accent-blue' : 'opacity-70'}>{folder.icon}</span>
                            <span>{folder.name}</span>
                          </div>
                          {folder.id === 'inbox' && folder.count > 0 && (
                            <span className="bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {folder.count}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Others Section */}
            <div>
              <div 
                onClick={() => setOthersOpen(!othersOpen)}
                className="flex items-center justify-between text-text-secondary text-xs font-bold uppercase tracking-wider mb-1.5 px-3 py-1 cursor-pointer hover:text-text-primary select-none"
              >
                <span>Others</span>
                {othersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
              
              {othersOpen && (
                <ul className="space-y-0.5">
                  {others.map(folder => {
                    const isActive = activeFolder === folder.id && !isComposing && !viewingEmail;
                    return (
                      <li key={folder.id}>
                        <button 
                          onClick={() => handleFolderChange(folder.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                            isActive 
                              ? 'bg-accent-blue/10 text-accent-blue font-bold' 
                              : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={isActive ? 'text-accent-blue' : 'opacity-70'}>{folder.icon}</span>
                            <span>{folder.name}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Account Status / Disconnect */}
            {!authRequired && user?.activeEmailProvider === 'google' && (
              <div className="pt-3 border-t border-border px-2">
                <button 
                  onClick={handleDisconnectGmail}
                  className="w-full flex items-center justify-center px-3 py-2 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Disconnect Gmail
                </button>
              </div>
            )}
            {!authRequired && user?.activeEmailProvider === 'microsoft' && (
              <div className="pt-3 border-t border-border px-2">
                <button 
                  onClick={handleDisconnectMicrosoft}
                  className="w-full flex items-center justify-center px-3 py-2 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Disconnect Microsoft
                </button>
              </div>
            )}

          </div>
        </div>

        {/* ── MAIN CONTENT CONTAINER ── */}
        <div className={`${showMobileFolders ? 'hidden md:flex' : 'flex'} flex-1 bg-bg-secondary border border-border rounded-2xl flex-col overflow-hidden shadow-sm`}>
          
          {/* ════════ VIEW 1: COMPOSE MESSAGE ════════ */}
          {isComposing ? (
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar bg-bg-primary">
              <div className="pb-3 border-b border-border flex items-center justify-between shrink-0 mb-4">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsComposing(false)} 
                    className="p-1.5 hover:bg-bg-secondary rounded-lg transition-colors text-text-secondary hover:text-text-primary border border-border cursor-pointer"
                    title="Back"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h2 className="text-base font-bold text-text-primary">New Message</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="text-xs font-semibold text-accent-blue hover:underline cursor-pointer"
                >
                  {showCcBcc ? 'Hide CC/BCC' : 'Show CC/BCC'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">From</label>
                  <input 
                    type="text" 
                    disabled 
                    value={user?.email || ''} 
                    className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary opacity-80 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">To *</label>
                  <input 
                    type="text"
                    placeholder="recipient@example.com, colleague@company.com"
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              {showCcBcc && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase mb-1">CC</label>
                    <input 
                      type="text"
                      placeholder="cc@company.com"
                      value={composeData.cc}
                      onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
                      className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase mb-1">BCC</label>
                    <input 
                      type="text"
                      placeholder="hidden@company.com"
                      value={composeData.bcc}
                      onChange={(e) => setComposeData({ ...composeData, bcc: e.target.value })}
                      className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Subject *</label>
                <input 
                  type="text" 
                  placeholder="Subject of the email"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue font-medium"
                />
              </div>

              <div className="flex-1 flex flex-col mb-4 min-h-[220px]">
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Message</label>
                <textarea 
                  placeholder="Type your message here..."
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  className="flex-1 w-full bg-bg-secondary border border-border rounded-xl p-3.5 text-xs text-text-primary focus:outline-none focus:border-accent-blue resize-none custom-scrollbar leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    className="flex items-center bg-bg-secondary hover:bg-bg-primary border border-border text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <Paperclip size={14} className="mr-1.5" /> Attachment
                  </button>
                  <span className="text-[11px] text-text-secondary">Max: 32MB</span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setIsComposing(false); setComposeData({ to: '', cc: '', bcc: '', subject: '', body: '' }); }}
                    className="flex items-center px-3.5 py-1.5 bg-bg-secondary hover:bg-danger/10 text-text-secondary hover:text-danger rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-border"
                  >
                    <X size={14} className="mr-1.5" /> Discard
                  </button>
                  <button 
                    onClick={() => handleSendEmail(false)}
                    className="flex items-center px-5 py-1.5 bg-accent-blue hover:bg-accent-indigo text-white rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                  >
                    <Send size={14} className="mr-1.5" /> Send Email
                  </button>
                </div>
              </div>
            </div>
          ) : viewingEmail ? (
            
            /* ════════ VIEW 2: READ EMAIL DETAIL ════════ */
            <div className="flex-1 flex flex-col h-full bg-bg-secondary min-h-0">
              {/* Top Detail Bar */}
              <div className="p-3 md:p-4 border-b border-border flex items-center justify-between bg-bg-primary shrink-0">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setViewingEmail(null)} 
                    className="text-text-secondary hover:text-text-primary font-semibold text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-bg-secondary transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft size={16} /> Back to {activeFolder}
                  </button>
                  <button 
                    onClick={handleArchive} 
                    title="Archive"
                    className="p-1.5 hover:bg-bg-secondary text-text-secondary hover:text-text-primary rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer"
                  >
                    <Archive size={16} />
                  </button>
                  <button 
                    onClick={moveToTrash} 
                    title="Delete"
                    className="p-1.5 hover:bg-bg-secondary text-text-secondary hover:text-danger rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleMarkAsRead(false)} 
                    title="Mark as Unread"
                    className="p-1.5 hover:bg-bg-secondary text-text-secondary hover:text-text-primary rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer"
                  >
                    <Mail size={16} />
                  </button>
                  <button 
                    onClick={(e) => toggleStar(viewingEmail._id, e)} 
                    title="Star / Unstar"
                    className="p-1.5 hover:bg-bg-secondary text-text-secondary hover:text-amber-500 rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer"
                  >
                    <Star size={16} className={viewingEmail.isStarred ? 'fill-amber-400 text-amber-500' : ''} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleReply}
                    className="px-3 py-1.5 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Reply size={14} /> Reply
                  </button>
                  <button 
                    onClick={handleForward}
                    className="px-3 py-1.5 bg-bg-secondary hover:bg-bg-primary text-text-secondary hover:text-text-primary border border-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Forward size={14} /> Forward
                  </button>
                </div>
              </div>
              
              {/* Detail Content */}
              <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar bg-bg-primary">
                {loadingDetail ? (
                  <div className="p-8 flex items-center justify-center text-xs text-text-secondary">
                    <RotateCw size={18} className="animate-spin mr-2" /> Loading full email content...
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                      <div>
                        <h2 className="text-xl font-bold text-text-primary leading-snug">
                          {viewingEmail.subject || '(No Subject)'}
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-text-secondary">Folder:</span>
                          <span className="text-[11px] font-bold uppercase bg-bg-secondary px-2 py-0.5 rounded border border-border text-text-secondary">
                            {activeFolder}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-text-secondary whitespace-nowrap">
                        {viewingEmail.date ? new Date(viewingEmail.date).toLocaleString() : ''}
                      </span>
                    </div>

                    <div className="flex items-start gap-4">
                      <Avatar 
                        user={{ name: viewingEmail.from ? viewingEmail.from.split('<')[0].trim() : '?' }} 
                        size="w-10 h-10" 
                        textClass="text-sm font-bold" 
                        showStatus={false} 
                        className="shrink-0 shadow-sm" 
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-text-primary leading-tight">
                          {viewingEmail.from}
                        </div>
                        <div className="text-xs text-text-secondary mt-0.5">
                          to {viewingEmail.to || 'me'}
                          {viewingEmail.cc && <span className="ml-2">cc: {viewingEmail.cc}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs md:text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-sans bg-bg-secondary/40 p-5 rounded-2xl border border-border shadow-sm min-h-[260px]">
                      {viewingEmail.body 
                        ? (viewingEmail.body.includes('<') && viewingEmail.body.includes('>') 
                            ? <div dangerouslySetInnerHTML={{ __html: viewingEmail.body }} /> 
                            : viewingEmail.body)
                        : (viewingEmail.snippet?.replace(/&quot;/g, '"') || 'No content provided')}
                    </div>

                    {/* Bottom Quick Reply Bar */}
                    <div className="flex items-center gap-3 pt-2">
                      <button 
                        onClick={handleReply}
                        className="px-4 py-2 bg-accent-blue text-white hover:bg-accent-indigo rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                      >
                        <Reply size={14} /> Reply
                      </button>
                      <button 
                        onClick={handleForward}
                        className="px-4 py-2 bg-bg-secondary hover:bg-bg-primary border border-border text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Forward size={14} /> Forward
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            
            /* ════════ VIEW 3: EMAIL LIST WITH TOOLBAR & PAGINATION ════════ */
            <div className="flex-1 flex flex-col min-h-0 bg-bg-primary">
              
              {/* ── TOOLBAR ── */}
              <div className="p-2.5 md:p-3.5 border-b border-border flex items-center justify-between bg-bg-secondary/50 shrink-0 gap-2 flex-wrap">
                
                {/* Left controls: Select all, Archive, Trash, More */}
                <div className="flex items-center gap-1 text-text-secondary">
                  <button 
                    onClick={() => setShowMobileFolders(true)} 
                    className="md:hidden p-1.5 hover:bg-bg-primary hover:text-text-primary rounded-lg transition-colors border border-border mr-1 cursor-pointer"
                  >
                    <Menu size={16} />
                  </button>
                  
                  {/* Select All Checkbox */}
                  <div className="w-8 flex justify-center items-center">
                    <input 
                      type="checkbox" 
                      className="accent-accent-blue w-4 h-4 cursor-pointer"
                      checked={emails.length > 0 && selectedEmails.length === emails.length}
                      onChange={handleSelectAll}
                      title="Select all emails on page"
                    />
                  </div>

                  {/* Refresh Button */}
                  <button 
                    onClick={() => fetchEmails(true)}
                    className="p-1.5 hover:bg-bg-primary hover:text-text-primary rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer"
                    title="Refresh emails"
                  >
                    <RotateCw size={16} className={refreshing ? 'animate-spin text-accent-blue' : ''} />
                  </button>

                  {/* Archive Button */}
                  <button 
                    onClick={handleArchive}
                    disabled={selectedEmails.length === 0}
                    className={`p-1.5 rounded-lg transition-colors border border-transparent cursor-pointer ${
                      selectedEmails.length > 0 ? 'hover:bg-bg-primary hover:text-text-primary hover:border-border' : 'opacity-40 cursor-not-allowed'
                    }`}
                    title="Archive selected"
                  >
                    <Archive size={16} />
                  </button>

                  {/* Delete Button */}
                  <button 
                    onClick={moveToTrash}
                    disabled={selectedEmails.length === 0}
                    className={`p-1.5 rounded-lg transition-colors border border-transparent cursor-pointer ${
                      selectedEmails.length > 0 ? 'hover:bg-bg-primary hover:text-danger hover:border-border' : 'opacity-40 cursor-not-allowed'
                    }`}
                    title="Move selected to Trash"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* More Dropdown */}
                  <div className="relative" ref={moreMenuRef}>
                    <button 
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="p-1.5 hover:bg-bg-primary hover:text-text-primary rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer"
                      title="More options"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {showMoreMenu && (
                      <div className="absolute left-0 top-full mt-1 w-44 bg-bg-primary border border-border rounded-xl shadow-xl z-50 py-1 text-xs">
                        <button 
                          onClick={() => handleMarkAsRead(true)}
                          disabled={selectedEmails.length === 0}
                          className="w-full text-left px-3 py-2 hover:bg-bg-secondary flex items-center gap-2 text-text-primary disabled:opacity-40 cursor-pointer"
                        >
                          <CheckCheck size={14} /> Mark as Read
                        </button>
                        <button 
                          onClick={() => handleMarkAsRead(false)}
                          disabled={selectedEmails.length === 0}
                          className="w-full text-left px-3 py-2 hover:bg-bg-secondary flex items-center gap-2 text-text-primary disabled:opacity-40 cursor-pointer"
                        >
                          <Mail size={14} /> Mark as Unread
                        </button>
                        <div className="border-t border-border my-1"></div>
                        <button 
                          onClick={() => { fetchEmails(true); setShowMoreMenu(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-bg-secondary flex items-center gap-2 text-text-primary cursor-pointer"
                        >
                          <RotateCw size={14} /> Refresh List
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedEmails.length > 0 && (
                    <span className="text-xs font-semibold text-accent-blue ml-2">
                      {selectedEmails.length} selected
                    </span>
                  )}
                </div>
                
                {/* Right controls: Search Input & Pagination */}
                <div className="flex items-center gap-3">
                  
                  {/* Search Input */}
                  <div className="relative w-40 md:w-56">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input 
                      type="text" 
                      placeholder="Search email..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-7 py-1.5 bg-bg-primary border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-blue w-full font-medium"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Pagination count & controls */}
                  <div className="flex items-center gap-2 text-xs text-text-secondary select-none">
                    {emails.length > 0 ? (
                      <span className="hidden sm:inline font-medium">
                        {startIndex}–{endIndex} {totalEstimated > 0 ? `of ~${totalEstimated}` : ''}
                      </span>
                    ) : null}

                    {/* Page Size Selector */}
                    <select 
                      value={pageSize} 
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                        setTokenStack(['']);
                      }}
                      className="bg-bg-primary border border-border rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none cursor-pointer"
                      title="Items per page"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>

                    {/* Prev / Next Buttons */}
                    <button 
                      onClick={handlePrevPage}
                      disabled={currentPage <= 1 || loading}
                      className="p-1 rounded-lg border border-border bg-bg-primary hover:bg-bg-secondary text-text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous page"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button 
                      onClick={handleNextPage}
                      disabled={(!nextPageToken && emails.length < pageSize) || loading}
                      className="p-1 rounded-lg border border-border bg-bg-primary hover:bg-bg-secondary text-text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Next page"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>

              </div>

              {/* ── EMAIL LIST ── */}
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/60">
                {authRequired ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
                    <div className="w-16 h-16 bg-accent-blue/10 text-accent-blue rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-accent-blue/20">
                      <Mail size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-2 font-outfit">Connect your Work Mailbox</h2>
                    <p className="text-xs text-text-secondary max-w-sm mb-6 leading-relaxed">
                      Authorize your Google or Microsoft email account to securely send, receive, search, and manage emails directly from Madhura Workspace.
                    </p>
                    <div className="flex gap-3 flex-wrap justify-center">
                      <button 
                        onClick={handleConnectGmail}
                        className="px-4 py-2.5 bg-[#4285f4] hover:bg-[#3367d6] text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center cursor-pointer"
                      >
                        <svg className="w-4 h-4 mr-2 bg-white rounded-full p-0.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Sign in with Google
                      </button>
                      <button 
                        onClick={handleConnectMicrosoft}
                        className="px-4 py-2.5 bg-[#00a4ef] hover:bg-[#0082ba] text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center cursor-pointer"
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#7fba00" d="M12 1h10v10H12z"/><path fill="#00a4ef" d="M1 12h10v10H1z"/><path fill="#ffb900" d="M12 12h10v10H12z"/></svg>
                        Sign in with Microsoft
                      </button>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="p-12 flex flex-col items-center justify-center text-xs text-text-secondary gap-3">
                    <RotateCw size={22} className="animate-spin text-accent-blue" />
                    <span>Loading mailbox...</span>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="p-12 flex flex-col items-center justify-center text-text-secondary text-center">
                    <Mail size={42} className="mb-3 opacity-20" />
                    <p className="text-sm font-semibold text-text-primary">No emails found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {searchQuery ? `No emails matching "${searchQuery}"` : `Folder "${activeFolder}" is currently empty.`}
                    </p>
                  </div>
                ) : (
                  <div>
                    {emails.map((email) => {
                      const isUnread = !email.isRead;
                      const isSelected = selectedEmails.includes(email._id);
                      const displayUser = activeFolder === 'sent' ? (email.to || 'Unknown') : (email.from || 'Unknown');
                      const senderName = displayUser.includes('<') ? displayUser.split('<')[0].trim() : displayUser;

                      return (
                        <div 
                          key={email._id} 
                          onClick={() => openEmailDetail(email)}
                          className={`flex items-center px-3 md:px-4 py-2.5 transition-all cursor-pointer border-l-3 select-none ${
                            isSelected 
                              ? 'bg-accent-blue/10 border-accent-blue' 
                              : isUnread 
                                ? 'bg-bg-secondary/70 border-accent-blue font-semibold hover:bg-bg-secondary' 
                                : 'bg-transparent border-transparent hover:bg-bg-secondary/40'
                          }`}
                        >
                          {/* Checkbox, Star & Sender */}
                          <div className="flex items-center gap-2.5 w-44 md:w-56 shrink-0 text-text-secondary">
                            <input 
                              type="checkbox" 
                              className="accent-accent-blue w-3.5 h-3.5 cursor-pointer"
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleSelectEmail(email._id)}
                            />
                            <button 
                              onClick={(e) => toggleStar(email._id, e)} 
                              className="hover:text-amber-500 transition-colors p-0.5 cursor-pointer"
                              title={email.isStarred ? 'Unstar' : 'Star'}
                            >
                              <Star size={15} className={email.isStarred ? 'fill-amber-400 text-amber-500' : 'text-text-secondary'} />
                            </button>
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar 
                                user={{ name: senderName || '?' }} 
                                size="w-6 h-6" 
                                textClass="text-[10px] font-bold" 
                                showStatus={false} 
                                className="shrink-0" 
                              />
                              <span className={`text-xs truncate ${isUnread ? 'text-text-primary font-bold' : 'text-text-primary font-medium'}`}>
                                {senderName || 'Unknown'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Subject & Snippet */}
                          <div className="flex-1 flex items-center min-w-0 px-2 md:px-4">
                            <span className={`text-xs truncate ${isUnread ? 'text-text-primary font-bold' : 'text-text-secondary'}`}>
                              <span className={isUnread ? 'text-text-primary' : 'text-text-primary font-medium'}>
                                {email.subject || '(No Subject)'}
                              </span>
                              {email.snippet && (
                                <span className="font-normal opacity-60 ml-2">
                                  — {email.snippet.replace(/&quot;/g, '"').substring(0, 70)}...
                                </span>
                              )}
                            </span>
                          </div>
                          
                          {/* Date */}
                          <div className="text-[11px] text-text-secondary shrink-0 pl-2">
                            {email.date ? new Date(email.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── FOOTER PAGINATION BAR ── */}
              {!authRequired && emails.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border bg-bg-secondary/40 flex items-center justify-between text-xs text-text-secondary shrink-0">
                  <div className="flex items-center gap-2">
                    <span>Showing</span>
                    <span className="font-bold text-text-primary">{startIndex}–{endIndex}</span>
                    <span>of</span>
                    <span className="font-bold text-text-primary">{totalEstimated > 0 ? `~${totalEstimated}` : emails.length}</span>
                    <span>emails in <strong className="capitalize text-text-primary">{activeFolder}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={handlePrevPage}
                      disabled={currentPage <= 1 || loading}
                      className="px-2.5 py-1 rounded-lg border border-border bg-bg-primary hover:bg-bg-secondary text-text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft size={13} /> Prev
                    </button>
                    <span className="px-2 font-bold text-text-primary">Page {currentPage}</span>
                    <button 
                      onClick={handleNextPage}
                      disabled={(!nextPageToken && emails.length < pageSize) || loading}
                      className="px-2.5 py-1 rounded-lg border border-border bg-bg-primary hover:bg-bg-secondary text-text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default Email;
