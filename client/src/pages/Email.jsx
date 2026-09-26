import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { 
  Inbox, Star, Clock, Send, File, AlertCircle, MessageCircle, 
  Calendar, Mail, AlertTriangle, Paperclip, Check, X, Search, 
  MoreVertical, Trash2, Archive, Menu, ChevronDown, ChevronRight, 
  ChevronLeft, RotateCw, Reply, Forward, CheckCheck, Tag, 
  Maximize2, Minimize2, Minus, ExternalLink, Sparkles, SlidersHorizontal,
  Info, CornerUpLeft, CornerUpRight
} from 'lucide-react';
import Avatar from '../components/Avatar';

const Email = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext) || { showToast: (msg) => console.log(msg) };
  
  const [workspace, setWorkspace] = useState(null);
  const [emails, setEmails] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [inboxCategory, setInboxCategory] = useState('primary'); // primary, promotions, social, updates
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Collapsible sidebar
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [moreFoldersOpen, setMoreFoldersOpen] = useState(false);

  // Pagination states
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [tokenMap, setTokenMap] = useState({ 1: '' });
  
  // Selection & Actions
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [showSelectMenu, setShowSelectMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const selectMenuRef = useRef(null);
  const moreMenuRef = useRef(null);

  // Real Gmail Compose Popup (Docked at bottom-right)
  const [isComposing, setIsComposing] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [composeMaximized, setComposeMaximized] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', cc: '', bcc: '', subject: '', body: '' });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  // Reading Email
  const [viewingEmail, setViewingEmail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectMenuRef.current && !selectMenuRef.current.contains(e.target)) setShowSelectMenu(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial workspace
  useEffect(() => {
    fetchWorkspace();
  }, [user]);

  const fetchWorkspace = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data && wsRes.data.length > 0) {
        const wsId = wsRes.data[0]._id;
        const detailRes = await axios.get(`/workspaces/${wsId}`);
        const ws = detailRes.data;
        setWorkspace(ws);
        fetchFolderEmails(ws, 'inbox', 1, '', '');
      }
    } catch (error) {
      console.error('Failed to fetch workspace', error);
    }
  };

  // Main Email Fetcher
  const fetchFolderEmails = async (ws, folder, page, token, search, isManual = false) => {
    const currentWs = ws || workspace;
    if (!currentWs) return;

    if (isManual) setRefreshing(true);
    else setLoading(true);
    setAuthRequired(false);

    try {
      const skip = (page - 1) * pageSize;
      const res = await axios.get(`/workspaces/${currentWs._id}/emails`, {
        params: {
          folder,
          search,
          maxResults: pageSize,
          pageToken: token || '',
          skip
        }
      });

      let rawEmails = [];
      let nextTok = null;
      let totalEst = 0;

      if (Array.isArray(res.data)) {
        rawEmails = res.data;
        totalEst = res.data.length;
      } else if (res.data && res.data.emails) {
        rawEmails = res.data.emails;
        nextTok = res.data.nextPageToken || null;
        totalEst = res.data.resultSizeEstimate || rawEmails.length;
      }

      setEmails(rawEmails);
      setNextPageToken(nextTok);
      setTotalCount(totalEst);

      if (nextTok) {
        setTokenMap(prev => ({ ...prev, [page + 1]: nextTok }));
      }
      setSelectedEmails([]);
    } catch (error) {
      if (error.response?.status === 401 && error.response?.data?.authRequired) {
        setAuthRequired(true);
      }
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounced Search Handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== debouncedSearch) {
        setDebouncedSearch(searchQuery);
        setCurrentPage(1);
        setTokenMap({ 1: '' });
        if (workspace) {
          fetchFolderEmails(workspace, activeFolder, 1, '', searchQuery);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Folder Selection
  const handleSelectFolder = (folderId) => {
    setActiveFolder(folderId);
    if (folderId === 'inbox') setInboxCategory('primary');
    setCurrentPage(1);
    setTokenMap({ 1: '' });
    setSearchQuery('');
    setDebouncedSearch('');
    setViewingEmail(null);
    fetchFolderEmails(workspace, folderId, 1, '', '');
  };

  // Category Tab Selection (Primary, Promotions, Social, Updates)
  const handleSelectCategory = (categoryId) => {
    setInboxCategory(categoryId);
    setCurrentPage(1);
    setTokenMap({ 1: '' });
    setSearchQuery('');
    setDebouncedSearch('');
    setViewingEmail(null);
    fetchFolderEmails(workspace, categoryId, 1, '', '');
  };

  // Next Page
  const handleNextPage = () => {
    if (!nextPageToken && emails.length < pageSize) return;
    const nextPage = currentPage + 1;
    const token = tokenMap[nextPage] || nextPageToken || '';
    setCurrentPage(nextPage);
    fetchFolderEmails(workspace, activeFolder, nextPage, token, debouncedSearch);
  };

  // Prev Page
  const handlePrevPage = () => {
    if (currentPage <= 1) return;
    const prevPage = currentPage - 1;
    const token = tokenMap[prevPage] || '';
    setCurrentPage(prevPage);
    fetchFolderEmails(workspace, activeFolder, prevPage, token, debouncedSearch);
  };

  // Open Full Email
  const openEmail = async (email) => {
    setViewingEmail(email);
    setLoadingDetail(true);
    try {
      const res = await axios.get(`/workspaces/${workspace._id}/emails/${email._id}`);
      setViewingEmail(res.data);
      // Mark as read locally
      setEmails(prev => prev.map(e => e._id === email._id ? { ...e, isRead: true } : e));
    } catch (err) {
      console.error('Failed to load email body', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Star / Unstar
  const handleToggleStar = async (emailId, e) => {
    if (e) e.stopPropagation();
    const email = emails.find(item => item._id === emailId) || viewingEmail;
    const isCurrentlyStarred = email?.isStarred;
    const action = isCurrentlyStarred ? 'unstar' : 'star';

    // Optimistic UI update
    setEmails(prev => prev.map(item => item._id === emailId ? { ...item, isStarred: !isCurrentlyStarred } : item));
    if (viewingEmail && viewingEmail._id === emailId) {
      setViewingEmail(prev => ({ ...prev, isStarred: !isCurrentlyStarred }));
    }

    try {
      await axios.put(`/workspaces/${workspace._id}/emails/${emailId}/status`, { action });
    } catch (err) {
      console.error('Failed to star email', err);
    }
  };

  // Selection helpers
  const handleToggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedEmails(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSelectType = (type) => {
    setShowSelectMenu(false);
    if (type === 'all') setSelectedEmails(emails.map(e => e._id));
    else if (type === 'none') setSelectedEmails([]);
    else if (type === 'read') setSelectedEmails(emails.filter(e => e.isRead).map(e => e._id));
    else if (type === 'unread') setSelectedEmails(emails.filter(e => !e.isRead).map(e => e._id));
    else if (type === 'starred') setSelectedEmails(emails.filter(e => e.isStarred).map(e => e._id));
    else if (type === 'unstarred') setSelectedEmails(emails.filter(e => !e.isStarred).map(e => e._id));
  };

  // Bulk Actions
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
      fetchFolderEmails(workspace, activeFolder, currentPage, tokenMap[currentPage] || '', debouncedSearch);
    } catch (err) {
      showToast('Failed to archive', 'error');
    }
  };

  const handleTrash = async () => {
    const targets = viewingEmail ? [viewingEmail._id] : selectedEmails;
    if (targets.length === 0) return;
    try {
      for (const id of targets) {
        await axios.put(`/workspaces/${workspace._id}/emails/${id}/status`, { action: 'trash' });
      }
      showToast(`${targets.length} email(s) moved to Trash`, 'success');
      setSelectedEmails([]);
      if (viewingEmail) setViewingEmail(null);
      fetchFolderEmails(workspace, activeFolder, currentPage, tokenMap[currentPage] || '', debouncedSearch);
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  const handleMarkRead = async (isRead = true) => {
    const targets = viewingEmail ? [viewingEmail._id] : selectedEmails;
    if (targets.length === 0) return;
    const action = isRead ? 'mark_read' : 'mark_unread';
    try {
      for (const id of targets) {
        await axios.put(`/workspaces/${workspace._id}/emails/${id}/status`, { action });
      }
      setEmails(prev => prev.map(e => targets.includes(e._id) ? { ...e, isRead } : e));
      showToast(`Marked ${targets.length} as ${isRead ? 'read' : 'unread'}`, 'success');
      setSelectedEmails([]);
      setShowMoreMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Reply / Forward
  const handleReply = (emailToReply = viewingEmail) => {
    if (!emailToReply) return;
    const sender = emailToReply.from?.includes('<') 
      ? emailToReply.from.match(/<([^>]+)>/)?.[1] || emailToReply.from 
      : emailToReply.from;
    setComposeData({
      to: sender,
      cc: '',
      bcc: '',
      subject: emailToReply.subject?.startsWith('Re:') ? emailToReply.subject : `Re: ${emailToReply.subject || ''}`,
      body: `\n\n\n---------- On ${new Date(emailToReply.date).toLocaleString()}, ${emailToReply.from} wrote ----------\n${emailToReply.snippet || ''}`
    });
    setIsComposing(true);
    setComposeMinimized(false);
  };

  const handleForward = (emailToForward = viewingEmail) => {
    if (!emailToForward) return;
    setComposeData({
      to: '',
      cc: '',
      bcc: '',
      subject: emailToForward.subject?.startsWith('Fwd:') ? emailToForward.subject : `Fwd: ${emailToForward.subject || ''}`,
      body: `\n\n\n---------- Forwarded message ---------\nFrom: ${emailToForward.from}\nDate: ${new Date(emailToForward.date).toLocaleString()}\nSubject: ${emailToForward.subject}\nTo: ${emailToForward.to}\n\n${emailToForward.body || emailToForward.snippet || ''}`
    });
    setIsComposing(true);
    setComposeMinimized(false);
  };

  const handleSend = async () => {
    if (!composeData.to && !composeData.bcc) return alert('Please enter at least one recipient');
    try {
      await axios.post(`/workspaces/${workspace._id}/emails`, {
        recipients: composeData.to.split(',').map(e => e.trim()).filter(Boolean),
        cc: composeData.cc ? composeData.cc.split(',').map(e => e.trim()).filter(Boolean) : [],
        bcc: composeData.bcc ? composeData.bcc.split(',').map(e => e.trim()).filter(Boolean) : [],
        subject: composeData.subject,
        body: composeData.body,
        isDraft: false
      });
      showToast('Email sent successfully!', 'success');
      setIsComposing(false);
      setComposeData({ to: '', cc: '', bcc: '', subject: '', body: '' });
      fetchFolderEmails(workspace, activeFolder, 1, '', debouncedSearch, true);
    } catch (err) {
      showToast('Failed to send email', 'error');
    }
  };

  // Formatted Date
  const formatGmailDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Folders definition
  const primaryFolders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: activeFolder === 'inbox' ? emails.filter(e => !e.isRead).length : 0 },
    { id: 'starred', label: 'Starred', icon: Star },
    { id: 'snoozed', label: 'Snoozed', icon: Clock },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'drafts', label: 'Drafts', icon: File },
  ];

  const secondaryFolders = [
    { id: 'important', label: 'Important', icon: AlertCircle },
    { id: 'chats', label: 'Chats', icon: MessageCircle },
    { id: 'scheduled', label: 'Scheduled', icon: Calendar },
    { id: 'all', label: 'All Mail', icon: Mail },
    { id: 'spam', label: 'Spam', icon: AlertTriangle },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = startIndex + emails.length - 1;

  if (!workspace) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary text-text-secondary text-sm">
        <RotateCw size={20} className="animate-spin mr-2 text-accent-blue" /> Initializing mailbox...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-sans bg-bg-primary select-none overflow-hidden">
      
      {/* ════════════════ TOP GMAIL SEARCH HEADER ════════════════ */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-4 bg-bg-primary shrink-0">
        
        {/* Left: Brand & Menu Toggle */}
        <div className="flex items-center gap-3 w-56 shrink-0">
          <button 
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Main menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center font-bold">
              <Mail size={18} className="text-red-500" />
            </div>
            <span className="text-lg font-bold text-text-primary tracking-tight font-outfit">Gmail</span>
          </div>
        </div>

        {/* Center: Google Search Bar */}
        <div className="flex-1 max-w-2xl relative">
          <div className="flex items-center bg-bg-secondary hover:bg-bg-secondary/80 focus-within:bg-bg-primary focus-within:shadow-md focus-within:ring-1 focus-within:ring-accent-blue/30 rounded-full px-4 py-2 transition-all border border-border/50">
            <Search size={18} className="text-text-secondary shrink-0 mr-3" />
            <input 
              type="text" 
              placeholder="Search in mail"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm text-text-primary placeholder:text-text-secondary/70"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-bg-primary rounded-full text-text-secondary cursor-pointer mr-1">
                <X size={16} />
              </button>
            )}
            <button className="p-1 hover:bg-bg-primary rounded-full text-text-secondary cursor-pointer" title="Search options">
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Right: Workspace Badge / Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-text-primary leading-tight">{user?.name}</span>
            <span className="text-[11px] text-text-secondary leading-tight">{user?.email}</span>
          </div>
          <Avatar user={user} size="w-8 h-8" textClass="text-xs font-bold" showStatus={false} />
        </div>
      </div>

      {/* ════════════════ MAIN BODY CONTAINER ════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ── GMAIL LEFT NAVIGATION SIDEBAR ── */}
        <div className={`transition-all duration-200 flex flex-col shrink-0 bg-bg-primary border-r border-border/40 ${sidebarExpanded ? 'w-60 p-3' : 'w-18 p-2 items-center'}`}>
          
          {/* Gmail Floating Pill "Compose" Button */}
          <button 
            onClick={() => { setIsComposing(true); setComposeMinimized(false); }}
            className={`flex items-center gap-3 bg-accent-blue hover:bg-accent-indigo text-white font-semibold shadow-md hover:shadow-lg rounded-2xl transition-all cursor-pointer mb-4 ${
              sidebarExpanded ? 'px-6 py-3.5 w-auto self-start text-sm' : 'w-12 h-12 justify-center p-0 rounded-2xl'
            }`}
          >
            <Sparkles size={20} />
            {sidebarExpanded && <span>Compose</span>}
          </button>

          {/* Folder List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 pr-1 w-full">
            {primaryFolders.map(folder => {
              const Icon = folder.icon;
              const isActive = activeFolder === folder.id && !viewingEmail;
              return (
                <button
                  key={folder.id}
                  onClick={() => handleSelectFolder(folder.id)}
                  className={`w-full flex items-center justify-between rounded-r-full text-xs font-medium transition-all cursor-pointer ${
                    sidebarExpanded ? 'px-4 py-2.5' : 'p-3 justify-center rounded-xl'
                  } ${
                    isActive 
                      ? 'bg-red-500/10 text-red-600 font-bold dark:bg-red-500/20 dark:text-red-400' 
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  }`}
                  title={folder.label}
                >
                  <div className="flex items-center gap-4">
                    <Icon size={18} className={isActive ? 'text-red-600 dark:text-red-400' : 'text-text-secondary'} />
                    {sidebarExpanded && <span>{folder.label}</span>}
                  </div>
                  {sidebarExpanded && folder.count > 0 && (
                    <span className="text-[11px] font-bold text-text-primary">{folder.count}</span>
                  )}
                </button>
              );
            })}

            {/* More / Less Toggle */}
            <button
              onClick={() => setMoreFoldersOpen(!moreFoldersOpen)}
              className={`w-full flex items-center gap-4 rounded-r-full text-xs font-medium text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-all cursor-pointer ${
                sidebarExpanded ? 'px-4 py-2' : 'p-3 justify-center rounded-xl'
              }`}
            >
              {moreFoldersOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              {sidebarExpanded && <span>{moreFoldersOpen ? 'Less' : 'More'}</span>}
            </button>

            {moreFoldersOpen && secondaryFolders.map(folder => {
              const Icon = folder.icon;
              const isActive = activeFolder === folder.id && !viewingEmail;
              return (
                <button
                  key={folder.id}
                  onClick={() => handleSelectFolder(folder.id)}
                  className={`w-full flex items-center justify-between rounded-r-full text-xs font-medium transition-all cursor-pointer ${
                    sidebarExpanded ? 'px-4 py-2.5' : 'p-3 justify-center rounded-xl'
                  } ${
                    isActive 
                      ? 'bg-red-500/10 text-red-600 font-bold dark:bg-red-500/20 dark:text-red-400' 
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  }`}
                  title={folder.label}
                >
                  <div className="flex items-center gap-4">
                    <Icon size={18} className={isActive ? 'text-red-600 dark:text-red-400' : 'text-text-secondary'} />
                    {sidebarExpanded && <span>{folder.label}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── GMAIL MAIN CONTENT AREA ── */}
        <div className="flex-1 bg-bg-secondary/40 flex flex-col overflow-hidden">
          
          {/* ════════ VIEW 1: READ EMAIL THREAD ════════ */}
          {viewingEmail ? (
            <div className="flex-1 flex flex-col bg-bg-primary overflow-hidden">
              
              {/* Reading Top Toolbar */}
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-bg-primary shrink-0">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setViewingEmail(null)}
                    className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    title={`Back to ${activeFolder}`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="w-px h-5 bg-border mx-1" />
                  <button onClick={handleArchive} className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary cursor-pointer" title="Archive">
                    <Archive size={17} />
                  </button>
                  <button onClick={handleTrash} className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-danger cursor-pointer" title="Delete">
                    <Trash2 size={17} />
                  </button>
                  <button onClick={() => handleMarkRead(false)} className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary cursor-pointer" title="Mark as unread">
                    <Mail size={17} />
                  </button>
                  <button onClick={(e) => handleToggleStar(viewingEmail._id, e)} className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-amber-500 cursor-pointer" title="Star">
                    <Star size={17} className={viewingEmail.isStarred ? 'fill-amber-400 text-amber-500' : ''} />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span>{formatGmailDate(viewingEmail.date)}</span>
                </div>
              </div>

              {/* Email Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {loadingDetail ? (
                  <div className="flex items-center justify-center p-12 text-sm text-text-secondary">
                    <RotateCw size={20} className="animate-spin mr-2 text-accent-blue" /> Loading message...
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* Subject Header */}
                    <div className="flex items-center justify-between gap-4">
                      <h1 className="text-xl font-bold text-text-primary font-outfit">
                        {viewingEmail.subject || '(No Subject)'}
                      </h1>
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-bg-secondary border border-border text-text-secondary">
                        {activeFolder}
                      </span>
                    </div>

                    {/* Sender Header Card */}
                    <div className="flex items-start justify-between gap-4 pt-2">
                      <div className="flex items-start gap-3">
                        <Avatar 
                          user={{ name: viewingEmail.from ? viewingEmail.from.split('<')[0].trim() : '?' }} 
                          size="w-10 h-10" 
                          textClass="text-sm font-bold" 
                          showStatus={false} 
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-text-primary">
                              {viewingEmail.from?.split('<')[0].trim() || 'Unknown'}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {viewingEmail.from?.includes('<') ? `<${viewingEmail.from.split('<')[1]}` : viewingEmail.from}
                            </span>
                          </div>
                          <div className="text-xs text-text-secondary mt-0.5">
                            to {viewingEmail.to || 'me'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleReply(viewingEmail)}
                          className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary cursor-pointer"
                          title="Reply"
                        >
                          <CornerUpLeft size={17} />
                        </button>
                        <button 
                          onClick={() => handleForward(viewingEmail)}
                          className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary cursor-pointer"
                          title="Forward"
                        >
                          <CornerUpRight size={17} />
                        </button>
                      </div>
                    </div>

                    {/* Message Body Render */}
                    <div className="bg-bg-secondary/30 p-6 rounded-2xl border border-border/60 text-text-primary text-sm leading-relaxed min-h-[220px]">
                      {viewingEmail.body ? (
                        viewingEmail.body.includes('<') && viewingEmail.body.includes('>') ? (
                          <div dangerouslySetInnerHTML={{ __html: viewingEmail.body }} className="email-html-content" />
                        ) : (
                          <div className="whitespace-pre-wrap">{viewingEmail.body}</div>
                        )
                      ) : (
                        <div className="whitespace-pre-wrap">{viewingEmail.snippet?.replace(/&quot;/g, '"') || 'No body content'}</div>
                      )}
                    </div>

                    {/* Bottom Quick Action Box */}
                    <div className="flex items-center gap-3 pt-4 border-t border-border">
                      <button 
                        onClick={() => handleReply(viewingEmail)}
                        className="px-5 py-2 rounded-full border border-border bg-bg-primary hover:bg-bg-secondary text-text-primary text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                      >
                        <CornerUpLeft size={15} /> Reply
                      </button>
                      <button 
                        onClick={() => handleForward(viewingEmail)}
                        className="px-5 py-2 rounded-full border border-border bg-bg-primary hover:bg-bg-secondary text-text-primary text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                      >
                        <CornerUpRight size={15} /> Forward
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            
            /* ════════ VIEW 2: REAL GMAIL EMAIL LIST ════════ */
            <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary m-2 rounded-2xl border border-border shadow-sm">
              
              {/* ── GMAIL TOP LIST TOOLBAR ── */}
              <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-bg-primary shrink-0 gap-2">
                
                {/* Left Action Buttons */}
                <div className="flex items-center gap-1 text-text-secondary">
                  
                  {/* Select Dropdown */}
                  <div className="relative flex items-center" ref={selectMenuRef}>
                    <input 
                      type="checkbox"
                      checked={emails.length > 0 && selectedEmails.length === emails.length}
                      onChange={(e) => handleSelectType(e.target.checked ? 'all' : 'none')}
                      className="accent-accent-blue w-4 h-4 cursor-pointer"
                    />
                    <button 
                      onClick={() => setShowSelectMenu(!showSelectMenu)}
                      className="p-1 hover:bg-bg-secondary rounded text-text-secondary hover:text-text-primary cursor-pointer ml-0.5"
                    >
                      <ChevronDown size={13} />
                    </button>
                    
                    {showSelectMenu && (
                      <div className="absolute left-0 top-full mt-1 w-32 bg-bg-primary border border-border rounded-xl shadow-xl z-50 py-1 text-xs">
                        {['all', 'none', 'read', 'unread', 'starred', 'unstarred'].map(type => (
                          <button
                            key={type}
                            onClick={() => handleSelectType(type)}
                            className="w-full text-left px-3 py-1.5 hover:bg-bg-secondary text-text-primary capitalize cursor-pointer"
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Refresh */}
                  <button 
                    onClick={() => fetchFolderEmails(workspace, activeFolder, currentPage, tokenMap[currentPage] || '', debouncedSearch, true)}
                    className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    title="Refresh"
                  >
                    <RotateCw size={16} className={refreshing ? 'animate-spin text-accent-blue' : ''} />
                  </button>

                  {selectedEmails.length > 0 && (
                    <>
                      <button onClick={handleArchive} className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary cursor-pointer" title="Archive">
                        <Archive size={16} />
                      </button>
                      <button onClick={handleTrash} className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-danger cursor-pointer" title="Delete">
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => handleMarkRead(true)} className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary cursor-pointer" title="Mark as read">
                        <CheckCheck size={16} />
                      </button>
                      <button onClick={() => handleMarkRead(false)} className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary cursor-pointer" title="Mark as unread">
                        <Mail size={16} />
                      </button>
                    </>
                  )}
                </div>

                {/* Right: Pagination */}
                <div className="flex items-center gap-3 text-xs text-text-secondary select-none">
                  {emails.length > 0 && (
                    <span>
                      {startIndex}–{endIndex} {totalCount > 0 ? `of ${totalCount}` : ''}
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={handlePrevPage}
                      disabled={currentPage <= 1 || loading}
                      className="p-1.5 rounded-full hover:bg-bg-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Newer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={handleNextPage}
                      disabled={(!nextPageToken && emails.length < pageSize) || loading}
                      className="p-1.5 rounded-full hover:bg-bg-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Older"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── GMAIL CATEGORY TABS (For Inbox) ── */}
              {activeFolder === 'inbox' && (
                <div className="flex items-center border-b border-border bg-bg-primary px-2 text-xs font-bold shrink-0">
                  {[
                    { id: 'primary', label: 'Primary', icon: Inbox, color: 'text-red-500 border-red-500' },
                    { id: 'promotions', label: 'Promotions', icon: Tag, color: 'text-emerald-500 border-emerald-500' },
                    { id: 'social', label: 'Social', icon: MessageCircle, color: 'text-blue-500 border-blue-500' },
                    { id: 'updates', label: 'Updates', icon: Info, color: 'text-amber-500 border-amber-500' },
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isTabActive = inboxCategory === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleSelectCategory(tab.id)}
                        className={`flex items-center gap-3 px-6 py-3 border-b-2 transition-all cursor-pointer ${
                          isTabActive 
                            ? `${tab.color} bg-bg-secondary/40 font-bold` 
                            : 'border-transparent text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                        }`}
                      >
                        <Icon size={16} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── GMAIL EMAIL LIST ROWS ── */}
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/50">
                {authRequired ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-4">
                      <Mail size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">Connect Gmail Account</h3>
                    <p className="text-xs text-text-secondary max-w-sm mb-6">
                      Authorize access to fetch real Gmail messages, sent items, and custom labels directly into Madhura Workspace.
                    </p>
                    <button 
                      onClick={handleConnectGmail} 
                      className="px-6 py-2.5 bg-accent-blue hover:bg-accent-indigo text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                    >
                      Sign in with Google
                    </button>
                  </div>
                ) : loading ? (
                  <div className="p-12 flex flex-col items-center justify-center text-xs text-text-secondary gap-3">
                    <RotateCw size={22} className="animate-spin text-accent-blue" />
                    <span>Loading {activeFolder}...</span>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="p-16 flex flex-col items-center justify-center text-text-secondary text-center">
                    <Mail size={48} className="mb-3 opacity-20" />
                    <p className="text-sm font-bold text-text-primary">Your {activeFolder} is empty</p>
                    <p className="text-xs text-text-secondary mt-1">Messages for this category will appear here.</p>
                  </div>
                ) : (
                  <div>
                    {emails.map(email => {
                      const isUnread = !email.isRead;
                      const isSelected = selectedEmails.includes(email._id);
                      
                      // For Sent folder, display recipient; for others, display sender
                      const displayTitle = activeFolder === 'sent' 
                        ? (email.to ? `To: ${email.to.split('<')[0].trim()}` : 'To: (Recipient)')
                        : (email.from ? email.from.split('<')[0].trim() : 'Unknown');

                      return (
                        <div
                          key={email._id}
                          onClick={() => openEmail(email)}
                          className={`group flex items-center px-4 py-2 hover:shadow-md transition-all cursor-pointer select-none text-xs border-l-3 ${
                            isSelected 
                              ? 'bg-blue-500/10 border-accent-blue' 
                              : isUnread 
                                ? 'bg-bg-secondary/70 border-red-500 font-bold' 
                                : 'bg-transparent border-transparent hover:bg-bg-secondary/40'
                          }`}
                        >
                          {/* Checkbox & Star */}
                          <div className="flex items-center gap-3 w-14 shrink-0 text-text-secondary" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelect(email._id, e)}
                              className="accent-accent-blue w-3.5 h-3.5 cursor-pointer"
                            />
                            <button 
                              onClick={(e) => handleToggleStar(email._id, e)}
                              className="hover:text-amber-500 transition-colors cursor-pointer"
                            >
                              <Star size={15} className={email.isStarred ? 'fill-amber-400 text-amber-500' : 'text-text-secondary/50'} />
                            </button>
                          </div>

                          {/* Sender / Recipient */}
                          <div className="w-48 md:w-56 shrink-0 truncate pr-4">
                            <span className={isUnread ? 'text-text-primary font-bold' : 'text-text-primary font-normal'}>
                              {displayTitle}
                            </span>
                          </div>

                          {/* Subject & Snippet */}
                          <div className="flex-1 min-w-0 pr-4 truncate">
                            <span className={isUnread ? 'text-text-primary font-bold' : 'text-text-primary font-normal'}>
                              {email.subject || '(No Subject)'}
                            </span>
                            {email.snippet && (
                              <span className="text-text-secondary font-normal ml-2 opacity-70">
                                — {email.snippet.replace(/&quot;/g, '"')}
                              </span>
                            )}
                          </div>

                          {/* Hover Action Buttons or Date */}
                          <div className="shrink-0 text-right">
                            {/* Hover Quick Actions */}
                            <div className="hidden group-hover:flex items-center gap-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleArchive(); }}
                                className="p-1.5 hover:bg-bg-primary rounded-full text-text-secondary hover:text-text-primary cursor-pointer"
                                title="Archive"
                              >
                                <Archive size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleTrash(); }}
                                className="p-1.5 hover:bg-bg-primary rounded-full text-text-secondary hover:text-danger cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleMarkRead(!email.isRead); }}
                                className="p-1.5 hover:bg-bg-primary rounded-full text-text-secondary hover:text-text-primary cursor-pointer"
                                title={email.isRead ? 'Mark as unread' : 'Mark as read'}
                              >
                                <Mail size={14} />
                              </button>
                            </div>

                            {/* Normal Date Display */}
                            <span className={`group-hover:hidden text-[11px] ${isUnread ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
                              {formatGmailDate(email.date)}
                            </span>
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

      {/* ════════════════ DOCKED REAL GMAIL COMPOSE POPUP ════════════════ */}
      {isComposing && (
        <div 
          className={`fixed z-50 bg-bg-primary border border-border shadow-2xl rounded-t-2xl flex flex-col transition-all duration-200 overflow-hidden ${
            composeMaximized 
              ? 'inset-6 rounded-2xl' 
              : composeMinimized 
                ? 'bottom-0 right-10 w-72 h-11' 
                : 'bottom-0 right-10 w-[560px] h-[520px]'
          }`}
        >
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-bg-secondary border-b border-border flex items-center justify-between shrink-0 select-none">
            <span className="text-xs font-bold text-text-primary font-outfit">New Message</span>
            <div className="flex items-center gap-1 text-text-secondary">
              <button 
                onClick={() => setComposeMinimized(!composeMinimized)} 
                className="p-1 hover:bg-bg-primary rounded hover:text-text-primary cursor-pointer"
                title={composeMinimized ? 'Expand' : 'Minimize'}
              >
                <Minus size={14} />
              </button>
              <button 
                onClick={() => { setComposeMaximized(!composeMaximized); setComposeMinimized(false); }} 
                className="p-1 hover:bg-bg-primary rounded hover:text-text-primary cursor-pointer"
                title={composeMaximized ? 'Restore' : 'Maximize'}
              >
                {composeMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button 
                onClick={() => setIsComposing(false)} 
                className="p-1 hover:bg-bg-primary rounded hover:text-danger cursor-pointer"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!composeMinimized && (
            <div className="flex-1 flex flex-col p-4 bg-bg-primary overflow-y-auto custom-scrollbar">
              
              {/* To field */}
              <div className="flex items-center border-b border-border py-1.5 gap-2">
                <span className="text-xs text-text-secondary font-medium w-8">To</span>
                <input 
                  type="text" 
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  placeholder="Recipients"
                  className="flex-1 bg-transparent border-none outline-none text-xs text-text-primary font-medium"
                />
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <button type="button" onClick={() => setShowCc(!showCc)} className="hover:underline cursor-pointer">Cc</button>
                  <button type="button" onClick={() => setShowBcc(!showBcc)} className="hover:underline cursor-pointer">Bcc</button>
                </div>
              </div>

              {showCc && (
                <div className="flex items-center border-b border-border py-1.5 gap-2">
                  <span className="text-xs text-text-secondary font-medium w-8">Cc</span>
                  <input 
                    type="text" 
                    value={composeData.cc}
                    onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
                    className="flex-1 bg-transparent border-none outline-none text-xs text-text-primary font-medium"
                  />
                </div>
              )}

              {showBcc && (
                <div className="flex items-center border-b border-border py-1.5 gap-2">
                  <span className="text-xs text-text-secondary font-medium w-8">Bcc</span>
                  <input 
                    type="text" 
                    value={composeData.bcc}
                    onChange={(e) => setComposeData({ ...composeData, bcc: e.target.value })}
                    className="flex-1 bg-transparent border-none outline-none text-xs text-text-primary font-medium"
                  />
                </div>
              )}

              {/* Subject */}
              <div className="flex items-center border-b border-border py-1.5">
                <input 
                  type="text" 
                  placeholder="Subject"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  className="w-full bg-transparent border-none outline-none text-xs font-bold text-text-primary"
                />
              </div>

              {/* Message Body */}
              <textarea 
                placeholder="Compose email"
                value={composeData.body}
                onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                className="flex-1 w-full bg-transparent border-none outline-none text-xs text-text-primary resize-none py-3 leading-relaxed custom-scrollbar"
              />

              {/* Bottom Send Toolbar */}
              <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleSend}
                    className="px-5 py-2 bg-accent-blue hover:bg-accent-indigo text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <span>Send</span>
                  </button>
                  <button type="button" className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary cursor-pointer" title="Attach files">
                    <Paperclip size={16} />
                  </button>
                </div>

                <button 
                  onClick={() => setIsComposing(false)}
                  className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary hover:text-danger cursor-pointer"
                  title="Discard draft"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Email;
