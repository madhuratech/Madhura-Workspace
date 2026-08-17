import React, { useContext, useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { LayoutDashboard, FolderKanban, LogOut, Settings, Users, CalendarDays, FileText, Search, Bell, Mail, Sun, Moon, BarChart3, Clock, CheckSquare, Circle, MessageSquare, Menu, X, Activity, Ticket, Megaphone, StickyNote, ChevronRight, Check, ExternalLink, UserCircle2 } from 'lucide-react';
import GlobalQuickNotes from './GlobalQuickNotes';
import Avatar from './Avatar';

const Layout = () => {
  const { user, logout, notifications, unreadCount, markAsRead, markAllAsRead, deleteAllNotifications, socket, updateUserStatus } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ projects: [], tasks: [], members: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const [toastNotif, setToastNotif] = useState(null);
  const toastTimerRef = React.useRef(null);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
        setShowStatusSubmenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ projects: [], tasks: [], members: [] });
        return;
      }
      setIsSearching(true);
      try {
        const wsRes = await axios.get('/workspaces');
        if (wsRes.data.length > 0) {
          const workspaceId = wsRes.data[0]._id;
          const res = await axios.get(`/workspaces/${workspaceId}/search?q=${searchQuery}`);
          setSearchResults(res.data);
          setIsSearchOpen(true);
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchSearch();
    }, 400); // debounce 400ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Base64 simple pop sound to avoid external dependencies
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Soft volume
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.log('Audio play failed', e);
    }
  };

  const showToast = (title, message) => {
    setToastNotif({ title, message });
    playNotificationSound();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastNotif(null), 4000);
  };



  React.useEffect(() => {
    if (socket && user) {
      const handleActivity = (msg) => {
        showToast(msg.title, msg.message);
      };
      const handleNotification = (msg) => {
        showToast(msg.title, msg.message);
      };
      const handleNewMessage = (msg) => {
        if (msg.sender && (msg.sender._id === user._id || msg.sender === user._id)) return;
        showToast('New Message', msg.text || 'Sent an attachment');
      };
      const handleTaskCreated = (task) => {
        showToast('New Task Assigned', task.title);
      };
      const handleMeetingCreated = (meeting) => {
        showToast('New Meeting Scheduled', meeting.title);
      };
      const handleTicketCreated = (ticket) => {
        showToast('New Ticket Created', ticket.title);
      };
      const handleProjectCreated = (project) => {
        showToast('New Project Created', project.title);
      };
      
      socket.on('activity', handleActivity);
      socket.on('new_notification', handleNotification);
      socket.on('new_message', handleNewMessage);
      socket.on('taskCreated', handleTaskCreated);
      socket.on('meetingCreated', handleMeetingCreated);
      socket.on('ticketCreated', handleTicketCreated);
      socket.on('projectCreated', handleProjectCreated);
      
      return () => {
        socket.off('activity', handleActivity);
        socket.off('new_notification', handleNotification);
        socket.off('new_message', handleNewMessage);
        socket.off('taskCreated', handleTaskCreated);
        socket.off('meetingCreated', handleMeetingCreated);
        socket.off('ticketCreated', handleTicketCreated);
        socket.off('projectCreated', handleProjectCreated);
      };
    }
  }, [socket, user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Teams-style status definitions
  const teamsStatuses = [
    {
      key: 'Active',
      label: 'Available',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <circle cx="8" cy="8" r="7.5" fill="#92C353" stroke="#92C353" />
          <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: 'Busy',
      label: 'Busy',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <circle cx="8" cy="8" r="7.5" fill="#C4314B" stroke="#C4314B" />
          <circle cx="8" cy="8" r="3" fill="white" />
        </svg>
      ),
    },
    {
      key: 'Break',
      label: 'Do not disturb',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <circle cx="8" cy="8" r="7.5" fill="#C4314B" stroke="#C4314B" />
          <rect x="4" y="7" width="8" height="2" rx="1" fill="white" />
        </svg>
      ),
    },
    {
      key: 'Lunch',
      label: 'Be right back',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <circle cx="8" cy="8" r="7.5" fill="#F8B739" stroke="#F8B739" />
          <path d="M8 4.5v3.75l2.25 2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: 'Away',
      label: 'Appear away',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <circle cx="8" cy="8" r="7.5" fill="#F8B739" stroke="#F8B739" />
          <path d="M8 4.5v3.75l2.25 2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3.5" fill="#605E5C" stroke="white" strokeWidth="1" />
          <rect x="11" y="11" width="2" height="2" rx="0.5" fill="white" />
        </svg>
      ),
    },
    {
      key: 'Leave',
      label: 'Appear offline',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <circle cx="8" cy="8" r="7.5" fill="none" stroke="#8A8886" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="4" fill="#8A8886" />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const getCurrentStatusDef = () => {
    return teamsStatuses.find(s => s.key === user?.presenceStatus) || teamsStatuses[0];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-500';
      case 'Busy': return 'bg-red-500';
      case 'Break': return 'bg-red-500';
      case 'Lunch': return 'bg-yellow-500';
      case 'Leave': return 'bg-gray-500';
      case 'Away': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusDotStyle = (status) => {
    switch (status) {
      case 'Active': return { background: '#92C353' };
      case 'Busy': return { background: '#C4314B' };
      case 'Break': return { background: '#C4314B' };
      case 'Lunch': return { background: '#F8B739' };
      case 'Leave': return { background: '#8A8886' };
      case 'Away': return { background: '#F8B739' };
      default: return { background: '#92C353' };
    }
  };

  const handleStatusChange = (statusKey) => {
    updateUserStatus(statusKey);
    setShowStatusSubmenu(false);
    setShowProfileMenu(false);
  };

  const primaryNavItems = [
    { icon: <LayoutDashboard size={22} />, label: 'Home', path: '/', hoverAnim: 'group-hover:animate-pulse' },
    { icon: <MessageSquare size={22} />, label: 'Chat', path: '/chat', hoverAnim: 'group-hover:scale-125 group-hover:-translate-y-1 transition-all duration-300' },
    { icon: <FolderKanban size={22} />, label: 'Projects', path: '/projects', hoverAnim: 'group-hover:rotate-12 group-hover:scale-110 transition-all duration-300' },
    { icon: <CheckSquare size={22} />, label: 'Tasks', path: '/my-tasks', hoverAnim: 'group-hover:translate-x-1 group-hover:-rotate-6 transition-all duration-300' },
    { icon: <CalendarDays size={22} />, label: 'Calendar', path: '/meetings', hoverAnim: 'group-hover:animate-bounce' },
  ];

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden font-sans text-text-primary transition-colors duration-300">
      
      {/* Global Top Bar */}
      <header className="h-14 bg-bg-sidebar border-b border-border flex items-center justify-between px-4 z-40 shrink-0 text-white shadow-md relative">
        {/* Mobile Hamburger */}
        <button 
          className="md:hidden mr-3 p-1 rounded-md hover:bg-white/10 transition-colors"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={22} />
        </button>

        {/* Logo area */}
        <div className="flex items-center md:w-[240px]">
          <div className="bg-white rounded-xl flex items-center justify-center hidden sm:flex px-2 py-1 w-fit shadow-sm">
            <img src="/Madhura-logo.webp" alt="Madhura Logo" className="h-9 w-auto object-contain" />
          </div>
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-xl mx-4 relative hidden sm:block" ref={searchRef}>
          <div className="relative w-full bg-white/10 focus-within:bg-white/20 transition-colors border border-white/10 focus-within:border-white/30 rounded-md h-8 flex items-center px-3 cursor-text shadow-inner">
            <Search size={14} className="text-white/70 mr-2 shrink-0" />
            <input 
              type="text"
              placeholder="Search Projects, Tasks, or Members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchQuery.trim()) setIsSearchOpen(true); }}
              className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-white/50"
            />
            {isSearching && (
              <div className="absolute right-3 top-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-10 left-0 w-full bg-bg-secondary border border-border shadow-2xl rounded-xl z-50 max-h-96 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
              {!isSearching && searchResults.projects?.length === 0 && searchResults.tasks?.length === 0 && searchResults.members?.length === 0 ? (
                <div className="p-6 text-center text-text-secondary text-sm">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="p-2 space-y-3">
                  {searchResults.members?.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-text-secondary uppercase px-2 mb-1">Members</h4>
                      {searchResults.members.map(member => (
                        <div 
                          key={member._id}
                          onClick={() => { setIsSearchOpen(false); navigate('/team'); }}
                          className="flex items-center px-2 py-2 hover:bg-bg-primary rounded-lg cursor-pointer transition-colors"
                        >
                          <Avatar user={member} size="w-6 h-6" textClass="text-xs" showStatus={false} className="mr-3" />
                          <div>
                            <p className="text-xs font-bold text-text-primary leading-tight">{member.name}</p>
                            <p className="text-[10px] text-text-secondary">{member.role.replace('_', ' ')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.projects?.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-text-secondary uppercase px-2 mb-1">Projects</h4>
                      {searchResults.projects.map(project => (
                        <div 
                          key={project._id}
                          onClick={() => { setIsSearchOpen(false); navigate(`/projects`); }}
                          className="flex items-center px-2 py-2 hover:bg-bg-primary rounded-lg cursor-pointer transition-colors"
                        >
                          <FolderKanban size={14} className="text-accent-indigo mr-3 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-text-primary leading-tight">{project.name}</p>
                            <p className="text-[10px] text-text-secondary truncate max-w-[250px]">{project.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.tasks?.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-text-secondary uppercase px-2 mb-1">Tasks</h4>
                      {searchResults.tasks.map(task => (
                        <div 
                          key={task._id}
                          onClick={() => { setIsSearchOpen(false); navigate(`/my-tasks`); }}
                          className="flex items-center px-2 py-2 hover:bg-bg-primary rounded-lg cursor-pointer transition-colors"
                        >
                          <CheckSquare size={14} className="text-success mr-3 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-text-primary leading-tight">{task.title}</p>
                            <p className="text-[10px] text-text-secondary">Priority: <span className="capitalize">{task.priority}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile & Notifications */}
        <div className="flex items-center space-x-4 ml-auto">
          <button 
            onClick={() => setShowQuickNote(!showQuickNote)}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
            title="Quick Notes Scratchpad"
          >
            <StickyNote size={18} />
          </button>
          <button onClick={toggleTheme} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white" title="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white relative"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-danger rounded-full border-2 border-bg-sidebar"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-bg-secondary border border-border rounded-xl shadow-2xl z-50 flex flex-col max-h-[400px]">
                <div className="p-3 border-b border-border flex justify-between items-center bg-bg-secondary rounded-t-xl shrink-0">
                  <h3 className="font-bold text-text-primary text-sm">Notifications</h3>
                  <div className="flex space-x-3">
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-[10px] text-accent-blue font-semibold hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button 
                        onClick={deleteAllNotifications}
                        className="text-[10px] text-danger font-semibold hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar bg-bg-secondary rounded-b-xl">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-text-secondary text-sm">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif._id} 
                        className={`p-3 rounded-lg text-left transition-colors flex items-start space-x-3 relative group ${
                          notif.read ? 'bg-transparent hover:bg-bg-primary' : 'bg-accent-blue/5 border border-accent-blue/10 hover:bg-accent-blue/10'
                        }`}
                      >
                        <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${notif.read ? 'bg-transparent' : 'bg-accent-blue'}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${notif.read ? 'text-text-primary' : 'text-text-primary font-bold'}`}>{notif.title}</p>
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] text-text-secondary mt-1 opacity-70">
                            {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                        {!notif.read && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif._id);
                            }}
                            className="text-xs text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent-blue absolute right-2 top-2 bg-bg-secondary px-2 rounded-md shadow-sm"
                          >
                            Read
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            {/* Avatar trigger button */}
            <button
              id="profile-menu-trigger"
              className="relative flex items-center justify-center focus:outline-none ml-2"
              onClick={(e) => {
                e.preventDefault();
                setShowProfileMenu(!showProfileMenu);
                setShowStatusSubmenu(false);
              }}
            >
              <Avatar
                user={user}
                size="w-8 h-8"
                textClass="text-xs text-white"
                className="shadow-sm border-2 border-white/20 hover:border-white/50 transition-all duration-200"
                showStatus={true}
                onClick={(e) => {
                  e.preventDefault();
                  setShowProfileMenu(!showProfileMenu);
                  setShowStatusSubmenu(false);
                }}
              />
            </button>

            {/* ── Teams-style Profile Dropdown ── */}
            {showProfileMenu && (
              <div
                id="profile-dropdown"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 10px)',
                  width: '300px',
                  background: 'var(--color-bg-sidebar, #1f2937)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                  zIndex: 9999,
                  overflow: 'hidden',
                  animation: 'teamsDropdownIn 0.18s ease-out',
                }}
              >
                {/* ── Header: Personal + Sign out ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.02em' }}>Personal</span>
                  <button
                    id="profile-signout-btn"
                    onClick={handleLogout}
                    style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = 'white'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.55)'}
                  >
                    Sign out
                  </button>
                </div>

                {/* ── User Info Card ── */}
                <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => { setShowProfileMenu(false); navigate(`/profile/${user?._id || user?.id}`); }}
                  >
                    <Avatar
                      user={user}
                      size="w-14 h-14"
                      textClass="text-xl"
                      className="shadow-md border-2 border-white/10"
                      showStatus={false}
                    />
                    {/* Status dot on avatar */}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 1,
                        right: 1,
                        width: 13,
                        height: 13,
                        borderRadius: '50%',
                        border: '2px solid #1f2937',
                        ...getStatusDotStyle(user?.presenceStatus),
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '15px', color: 'white', margin: 0, lineHeight: 1.2 }}>{user?.name}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '3px 0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                    <button
                      id="profile-myaccount-btn"
                      onClick={() => { setShowProfileMenu(false); navigate(`/profile/${user?._id || user?.id}`); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11px', color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      My account
                      <ExternalLink size={10} />
                    </button>
                  </div>
                </div>

                {/* ── Current Status Row (Teams main button) ── */}
                <div style={{ padding: '8px' }}>
                  <button
                    id="profile-status-toggle"
                    onClick={() => setShowStatusSubmenu(!showStatusSubmenu)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 6,
                      background: showStatusSubmenu ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
                      border: showStatusSubmenu ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (!showStatusSubmenu) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                    onMouseLeave={e => { if (!showStatusSubmenu) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  >
                    {getCurrentStatusDef().icon}
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: 'white' }}>
                      {getCurrentStatusDef().label}
                    </span>
                    <ChevronRight
                      size={16}
                      style={{
                        color: 'rgba(255,255,255,0.4)',
                        transform: showStatusSubmenu ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>

                  {/* ── Status Submenu (animated slide-down) ── */}
                  <div
                    style={{
                      maxHeight: showStatusSubmenu ? '300px' : '0px',
                      overflow: 'hidden',
                      transition: 'max-height 0.22s ease',
                    }}
                  >
                    <div style={{ paddingTop: 4 }}>
                      {teamsStatuses.map((s) => {
                        const isActive = (user?.presenceStatus || 'Active') === s.key;
                        return (
                          <button
                            key={s.key}
                            id={`status-option-${s.key.toLowerCase()}`}
                            onClick={() => handleStatusChange(s.key)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '9px 12px',
                              borderRadius: 6,
                              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                          >
                            {s.icon}
                            <span
                              style={{
                                flex: 1,
                                fontSize: '13px',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'white' : 'rgba(255,255,255,0.75)',
                              }}
                            >
                              {s.label}
                            </span>
                            {isActive && (
                              <Check size={14} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {showQuickNote && <GlobalQuickNotes onClose={() => setShowQuickNote(false)} />}

      {/* Main Content Area with Sidebars */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Primary Sidebar (Activity Bar) - Hidden on Mobile */}
        <aside className="hidden md:flex w-[68px] bg-bg-sidebar border-r border-border flex-col items-center py-4 z-20 shrink-0 shadow-sm transition-all">
          <div className="flex-1 flex flex-col space-y-4 w-full px-2">
            {primaryNavItems.map((item) => {
              const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
              return (
                <Link 
                  key={item.label}
                  to={item.path} 
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 group relative ${
                    isActive 
                      ? 'text-white' 
                      : 'text-text-sidebar/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#ffca22] rounded-r-full shadow-[0_0_8px_rgba(255,202,34,0.6)]"></div>
                  )}
                  <div className={`mb-1 origin-center ${item.hoverAnim || ''} ${isActive ? 'text-[#ffca22]' : ''}`}>{item.icon}</div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-[#ffca22]' : ''}`}>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="w-full px-2 pt-4 border-t border-white/10 flex flex-col space-y-4 mt-auto">
            <button 
              onClick={handleLogout}
              className="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 group text-text-sidebar/70 hover:text-danger hover:bg-danger/10"
            >
              <div className="group-hover:translate-x-1 transition-transform duration-300 origin-center mb-1">
                <LogOut size={22} className="group-hover:text-danger transition-colors" />
              </div>
              <span className="text-[10px] font-medium mt-1">Logout</span>
            </button>
            <Link 
              to="/settings" 
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 group ${
                location.pathname.startsWith('/settings') 
                  ? 'text-white' 
                  : 'text-text-sidebar/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="group-hover:rotate-90 transition-transform duration-500 origin-center mb-1">
                <Settings size={22} className={`${location.pathname.startsWith('/settings') ? 'text-[#ffca22]' : ''}`} />
              </div>
              <span className={`text-[10px] font-medium mt-1 ${location.pathname.startsWith('/settings') ? 'text-[#ffca22]' : ''}`}>Settings</span>
            </Link>
          </div>
        </aside>

        {/* Mobile Overlay Backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Secondary Sidebar (Context Menu / Mobile Drawer) */}
        <aside className={`fixed inset-y-0 left-0 bg-bg-secondary w-72 md:relative md:w-[240px] transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 z-50 md:z-10 flex flex-col shrink-0 border-r border-border shadow-2xl md:shadow-none`}>
          <div className="p-4 border-b border-border/50 flex justify-between items-center">
            <h2 className="font-bold text-text-primary text-sm tracking-wide font-outfit uppercase">Navigation</h2>
            <button 
              className="md:hidden p-1.5 rounded-lg text-text-secondary hover:bg-bg-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 px-3">Overview</p>
            <Link to="/" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname === '/' ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>
            
            { (user?.role === 'super_admin' || user?.role === 'hr') && (
              <>
                <Link to="/analytics" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname === '/analytics' ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
                  <BarChart3 size={16} />
                  <span>Analytics & Reports</span>
                </Link>
                <Link to="/activity-logs" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname === '/activity-logs' ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
                  <Activity size={16} />
                  <span>Activity Logs</span>
                </Link>
              </>
            )}

            <div className="h-px bg-border my-3 mx-2"></div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 px-3">Workspace</p>
            
            {user?.role === 'super_admin' && (
              <Link to="/team" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/team') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
                <Users size={16} />
                <span>Team Management</span>
              </Link>
            )}
            {user?.role === 'team_leader' && (
              <Link to="/tl-dashboard" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/tl-dashboard') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
                <BarChart3 size={16} />
                <span>TL Overview</span>
              </Link>
            )}
            <Link to="/projects" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/project') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
              <FolderKanban size={16} />
              <span>Projects</span>
            </Link>
            <Link to="/my-tasks" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/my-tasks') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
              <CheckSquare size={16} />
              <span>My Tasks</span>
            </Link>

            <div className="h-px bg-border my-3 mx-2"></div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 px-3">Apps & Comms</p>
            
            <Link to="/chat" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/chat') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
              <MessageSquare size={16} />
              <span>Chat</span>
            </Link>
            <Link to="/attendance" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/attendance') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
              <Clock size={16} />
              <span>Attendance</span>
            </Link>
            <Link to="/meetings" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/meeting') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
              <CalendarDays size={16} />
              <span>Meetings</span>
            </Link>
            <Link to="/email" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/email') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
              <Mail size={16} />
              <span>Email</span>
            </Link>
            <Link to="/documents" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/document') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
              <FileText size={16} />
              <span>Documents</span>
            </Link>
            <Link to="/tickets" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/ticket') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
              <Ticket size={16} />
              <span>Support Tickets</span>
            </Link>
            <Link to="/announcements" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/announcement') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
              <Megaphone size={16} />
              <span>Notice Board</span>
            </Link>
            <Link to="/notes" className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${location.pathname.startsWith('/notes') ? 'bg-[#ffca22] text-[#1b2b4c] font-bold shadow-sm' : 'text-text-primary/80 hover:bg-bg-primary hover:text-text-primary'}`}>
              <StickyNote size={16} />
              <span>Quick Notes</span>
            </Link>
          </nav>
        </aside>

        {/* Page Content — Chat gets full screen flush, other pages get padded card */}
        <main className={`flex-1 overflow-hidden relative flex flex-col transition-all pb-[env(safe-area-inset-bottom)] md:pb-0 mb-14 md:mb-0 ${
          ['/chat', '/attendance', '/meetings', '/tickets'].includes(location.pathname)
            ? 'bg-bg-secondary'
            : 'bg-bg-primary sm:rounded-tl-2xl shadow-[inset_0_4px_6px_rgba(0,0,0,0.02)] border-l border-t border-border/50 sm:mt-1 sm:ml-1'
        }`}>
          {['/chat', '/attendance', '/meetings', '/tickets'].includes(location.pathname) ? (
            <div className="flex-1 overflow-hidden h-full">
              <Outlet />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4 md:p-8">
              <Outlet />
            </div>
          )}

          {/* Real-time Toast Popup */}
          {toastNotif && (
            <div className="fixed top-6 right-6 bg-bg-secondary border border-border shadow-2xl rounded-xl p-4 pr-10 min-w-[300px] animate-bounce-in z-[9999] group cursor-pointer hover:shadow-accent-blue/10">
              <div className="flex items-center space-x-3 mb-1">
                <div className="h-2 w-2 rounded-full bg-accent-blue shadow-[0_0_8px_rgba(66,133,244,0.6)] animate-pulse"></div>
                <h4 className="font-bold text-text-primary text-sm">{toastNotif.title}</h4>
              </div>
              <p className="text-xs text-text-secondary line-clamp-2 ml-5">{toastNotif.message}</p>
              <button 
                onClick={(e) => { e.stopPropagation(); setToastNotif(null); }}
                className="absolute top-2 right-2 text-text-secondary hover:text-text-primary p-1 bg-bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-sidebar border-t border-border shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-14">
          {primaryNavItems.map((item) => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <Link 
                key={item.label}
                to={item.path} 
                className={`flex flex-col items-center justify-center w-full h-full relative transition-colors ${
                  isActive ? 'text-white' : 'text-text-sidebar/70 hover:text-white'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-accent-blue rounded-b-full"></div>
                )}
                <div className={`mb-0.5 ${isActive ? 'text-accent-blue scale-110' : ''} transition-transform`}>
                  {React.cloneElement(item.icon, { size: 20 })}
                </div>
                <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default Layout;
