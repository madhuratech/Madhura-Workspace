import React, { useContext, useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { LayoutDashboard, FolderKanban, LogOut, Settings, Users, CalendarDays, FileText, Search, Bell, Mail, Sun, Moon, BarChart3, Clock, CheckSquare, Circle, MessageSquare, Menu, X, Activity, Ticket, Megaphone, StickyNote } from 'lucide-react';
import GlobalQuickNotes from './GlobalQuickNotes';
import Avatar from './Avatar';

const Layout = () => {
  const { user, logout, notifications, unreadCount, markAsRead, markAllAsRead, deleteAllNotifications, socket, updateUserStatus } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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
      
      socket.on('activity', handleActivity);
      socket.on('new_notification', handleNotification);
      
      return () => {
        socket.off('activity', handleActivity);
        socket.off('new_notification', handleNotification);
      };
    }
  }, [socket, user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-success';
      case 'Busy': return 'bg-danger';
      case 'Break': return 'bg-warning';
      case 'Lunch': return 'bg-purple-500';
      case 'Leave': return 'bg-gray-500';
      case 'Away': return 'bg-orange-400';
      default: return 'bg-success';
    }
  };

  const handleStatusChange = (status) => {
    updateUserStatus(status);
    setShowProfileMenu(false);
  };

  const primaryNavItems = [
    { icon: <LayoutDashboard size={22} />, label: 'Home', path: '/' },
    { icon: <MessageSquare size={22} />, label: 'Chat', path: '/chat' },
    { icon: <FolderKanban size={22} />, label: 'Projects', path: '/projects' },
    { icon: <CheckSquare size={22} />, label: 'Tasks', path: '/my-tasks' },
    { icon: <CalendarDays size={22} />, label: 'Calendar', path: '/meetings' },
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
            <button className="relative flex items-center justify-center focus:outline-none ml-2">
              <Avatar 
                user={user} 
                size="w-8 h-8" 
                textClass="text-xs text-white" 
                className="shadow-sm border border-white/20 hover:opacity-90 transition-opacity" 
                onClick={(e) => {
                  e.preventDefault();
                  setShowProfileMenu(!showProfileMenu);
                }}
              />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-64 bg-bg-secondary border border-border rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-5 border-b border-border flex flex-col items-center">
                  <div 
                    className="relative mb-3 group cursor-pointer"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate(`/profile/${user._id || user.id}`);
                    }}
                  >
                    <Avatar user={user} size="w-16 h-16" textClass="text-2xl" className="shadow-sm transition-transform group-hover:scale-105" />
                  </div>
                  <h3 className="font-bold text-base font-outfit text-text-primary">{user?.name}</h3>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">{user?.role?.replace('_', ' ')}</p>
                </div>
                
                <div className="p-2.5">
                  <p className="px-3 py-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Set Status</p>
                  {['Active', 'Busy', 'Break', 'Lunch', 'Leave', 'Away'].map(status => (
                    <button 
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full text-left px-3 py-2.5 text-sm rounded-xl flex items-center space-x-3 transition-all duration-200 ${user?.presenceStatus === status ? 'bg-accent-blue/10' : 'hover:bg-bg-primary'}`}
                    >
                      <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(status)} shadow-sm`}></div>
                      <span className={user?.presenceStatus === status ? 'font-bold text-accent-blue' : 'font-medium text-text-secondary hover:text-text-primary'}>{status}</span>
                      {user?.presenceStatus === status && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-blue"></div>
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="p-2.5 border-t border-border bg-bg-primary/30">
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2.5 text-sm text-danger hover:bg-danger hover:text-white rounded-xl flex items-center space-x-3 transition-all duration-200 font-semibold group"
                  >
                    <LogOut size={16} className="text-danger group-hover:text-white transition-colors" />
                    <span>Logout</span>
                  </button>
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
                  <div className={`mb-1 ${isActive ? 'text-[#ffca22]' : ''}`}>{item.icon}</div>
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
              <LogOut size={22} className="group-hover:text-danger transition-colors" />
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
              <Settings size={22} className={`${location.pathname.startsWith('/settings') ? 'text-[#ffca22]' : ''}`} />
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

        {/* Page Content — Chat gets full screen, other pages get padding */}
        <main className="flex-1 overflow-hidden bg-bg-primary relative flex flex-col sm:rounded-tl-2xl shadow-[inset_0_4px_6px_rgba(0,0,0,0.02)] border-l border-t border-border/50 sm:mt-1 sm:ml-1 transition-all pb-[env(safe-area-inset-bottom)] md:pb-0 mb-14 md:mb-0">
          {location.pathname === '/chat' ? (
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
            <div className="absolute bottom-6 right-6 bg-bg-secondary border border-border shadow-2xl rounded-xl p-4 pr-10 min-w-[300px] animate-bounce-in z-50">
              <div className="flex items-center space-x-3 mb-1">
                <div className="h-2 w-2 rounded-full bg-accent-blue"></div>
                <h4 className="font-bold text-text-primary text-sm">{toastNotif.title}</h4>
              </div>
              <p className="text-xs text-text-secondary line-clamp-2 ml-5">{toastNotif.message}</p>
              <button 
                onClick={() => setToastNotif(null)}
                className="absolute top-2 right-2 text-text-secondary hover:text-text-primary"
              >
                &times;
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
