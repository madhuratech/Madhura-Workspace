import React, { useContext, useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { LayoutDashboard, FolderKanban, LogOut, Settings, Users, CalendarDays, FileText, Search, Bell, Mail, Sun, Moon, BarChart3, Clock, CheckSquare, Circle } from 'lucide-react';

const Layout = () => {
  const { user, logout, notifications, unreadCount, markAsRead, markAllAsRead, deleteAllNotifications, socket, updateUserStatus } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [toastNotif, setToastNotif] = useState(null);
  const toastTimerRef = React.useRef(null);

  // Base64 simple pop sound to avoid external dependencies
  const popSound = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + 'A'.repeat(50)); // We will use a lightweight pop sound
  // Note: For a real pop sound, it's better to use a tiny silent mp3/wav if base64 is too long, but we'll use a reliable HTML5 beep approach.

  const playNotificationSound = () => {
    try {
      // Create a short beep using Web Audio API for a reliable, dependency-free notification sound
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

  // Show a toast when a new notification comes in
  React.useEffect(() => {
    if (notifications.length > 0 && !notifications[0].read) {
      // Check if it was created in the last 5 seconds (roughly real-time)
      const diff = new Date() - new Date(notifications[0].createdAt);
      if (diff < 5000) {
        showToast(notifications[0].title, notifications[0].message);
      }
    }
  }, [notifications]);

  // Show a toast when a new chat message comes in (redundant manual handlers removed, now driven purely by notifications array)
  React.useEffect(() => {
    if (socket && user) {
      const handleActivity = (msg) => {
        showToast(msg.title, msg.message);
      };
      
      socket.on('activity', handleActivity);
      
      return () => {
        socket.off('activity', handleActivity);
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
      case 'Away': return 'bg-orange-400';
      default: return 'bg-success';
    }
  };

  const handleStatusChange = (status) => {
    updateUserStatus(status);
    setShowProfileMenu(false);
  };

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden font-sans text-text-primary transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-[260px] bg-bg-sidebar text-text-sidebar hidden md:flex flex-col z-20 shadow-2xl transition-all duration-300">
        <div className="p-6 flex items-center space-x-3 border-b border-white/5">
          <div className="h-10 w-10 bg-gradient-to-br from-accent-blue to-accent-indigo rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
            M
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide font-outfit">MadhuraWS</h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 mt-6 overflow-y-auto custom-scrollbar">
          <p className="text-[0.65rem] font-bold text-text-sidebar/50 uppercase tracking-wider mb-3 mt-4 px-3 font-outfit">Main</p>
          <Link to="/" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname === '/' ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
            <LayoutDashboard size={18} className={`${location.pathname === '/' ? 'text-accent-blue' : 'group-hover:text-accent-blue transition-colors'}`} />
            <span className="text-sm">Dashboard</span>
          </Link>
          { (user?.role === 'super_admin' || user?.role === 'hr') && (
            <Link to="/analytics" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname === '/analytics' ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
              <BarChart3 size={18} className={`${location.pathname === '/analytics' ? 'text-accent-blue' : 'group-hover:text-accent-blue transition-colors'}`} />
              <span className="text-sm">Analytics & Reports</span>
            </Link>
          )}
          {user?.role === 'super_admin' && (
            <Link to="/team" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname.startsWith('/team') ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
              <Users size={18} className={`${location.pathname.startsWith('/team') ? 'text-accent-blue' : 'group-hover:text-accent-blue transition-colors'}`} />
              <span className="text-sm">Team Management</span>
            </Link>
          )}
          {user?.role === 'team_leader' && (
            <Link to="/tl-dashboard" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname.startsWith('/tl-dashboard') ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
              <BarChart3 size={18} className={`${location.pathname.startsWith('/tl-dashboard') ? 'text-accent-blue' : 'group-hover:text-accent-blue transition-colors'}`} />
              <span className="text-sm">TL Overview</span>
            </Link>
          )}
          <Link to="/projects" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname.startsWith('/project') ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
            <FolderKanban size={18} className={`${location.pathname.startsWith('/project') ? 'text-accent-blue' : 'group-hover:text-accent-blue transition-colors'}`} />
            <span className="text-sm">Projects</span>
          </Link>
          <Link to="/my-tasks" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname.startsWith('/my-tasks') ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
            <CheckSquare size={18} className={`${location.pathname.startsWith('/my-tasks') ? 'text-accent-blue' : 'group-hover:text-accent-blue transition-colors'}`} />
            <span className="text-sm">My Tasks</span>
          </Link>
          <Link to="/chat" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname.startsWith('/chat') ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
            <Mail size={18} className={`${location.pathname.startsWith('/chat') ? 'text-accent-blue' : 'group-hover:text-accent-blue transition-colors'}`} />
            <span className="text-sm">Chat & Comms</span>
          </Link>
          <Link to="/attendance" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname.startsWith('/attendance') ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
            <Clock size={18} className={`${location.pathname.startsWith('/attendance') ? 'text-accent-blue' : 'group-hover:text-accent-blue transition-colors'}`} />
            <span className="text-sm">Attendance</span>
          </Link>
          <Link to="/meetings" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname.startsWith('/meeting') ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
            <CalendarDays size={18} className={`${location.pathname.startsWith('/meeting') ? 'text-accent-blue' : 'group-hover:text-accent-blue transition-colors'}`} />
            <span className="text-sm">Meetings</span>
          </Link>
          <Link to="/email" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname.startsWith('/email') ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
            <Mail size={18} className={`${location.pathname.startsWith('/email') ? 'text-accent-blue' : 'group-hover:text-accent-blue transition-colors'}`} />
            <span className="text-sm">Email</span>
          </Link>
          <Link to="/documents" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname.startsWith('/document') ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
            <FileText size={18} className={`${location.pathname.startsWith('/document') ? 'text-accent-blue' : 'group-hover:text-accent-blue transition-colors'}`} />
            <span className="text-sm">Documents</span>
          </Link>
        </nav>

        {(user?.role === 'super_admin' || user?.role === 'hr' || user?.role === 'team_leader') && (
          <div className="p-4 border-t border-white/5">
            <Link to="/settings" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${location.pathname.startsWith('/settings') ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-text-sidebar/80 hover:bg-bg-sidebar-hover hover:text-white font-medium'}`}>
              <Settings size={18} className={`group-hover:rotate-90 transition-transform duration-300 ${location.pathname.startsWith('/settings') ? 'text-accent-blue' : 'group-hover:text-accent-blue'}`} />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        )}
        <div className="p-4">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3 py-2.5 w-full text-left text-danger hover:bg-danger/10 rounded-lg transition-colors font-medium"
          >
            <LogOut size={18} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-bg-primary relative">
        {/* Floating Top Navbar */}
        <header className="mx-6 mt-6 h-16 glass rounded-2xl flex items-center justify-between px-6 z-40 relative shrink-0 shadow-soft">
          <div className="flex-1">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Welcome back,</p>
            <p className="text-sm font-bold text-text-primary font-outfit">{user?.name || 'User'}</p>
          </div>
          
          <div className="flex items-center space-x-4 text-text-secondary">
            <button onClick={toggleTheme} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-danger rounded-full border-2 border-bg-secondary">
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 flex flex-col max-h-[400px]">
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
            <button className="hover:text-text-primary transition-colors"><Mail size={18} /></button>
            <div className="relative ml-2">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="relative flex items-center justify-center focus:outline-none"
              >
                <div className="h-9 w-9 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-sm shadow-sm border border-accent-blue/20 hover:bg-accent-blue/20 transition-colors">
                  {user?.name?.substring(0, 2).toUpperCase() || 'AA'}
                </div>
                <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg-secondary ${getStatusColor(user?.presenceStatus)}`}></div>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-64 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-border bg-bg-primary/30 flex flex-col items-center">
                    <div className="relative mb-2">
                      <div className="h-16 w-16 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-2xl shadow-sm border-2 border-accent-blue/20">
                        {user?.name?.substring(0, 2).toUpperCase() || 'AA'}
                      </div>
                      <div className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-bg-primary ${getStatusColor(user?.presenceStatus)}`}></div>
                    </div>
                    <h3 className="font-bold text-text-primary text-base font-outfit">{user?.name}</h3>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mt-0.5">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  
                  <div className="p-2">
                    <p className="px-3 py-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Set Status</p>
                    {['Active', 'Busy', 'Break', 'Away'].map(status => (
                      <button 
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-primary rounded-lg flex items-center space-x-3 transition-colors"
                      >
                        <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(status)}`}></div>
                        <span className={user?.presenceStatus === status ? 'font-bold' : 'font-medium'}>{status}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div className="p-2 border-t border-border">
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg flex items-center space-x-3 transition-colors font-medium"
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6 relative">
          <Outlet />
        </div>

        {/* Real-time Toast Popup */}
        {toastNotif && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-bg-secondary border border-border shadow-2xl rounded-xl p-4 pr-10 min-w-[300px] animate-bounce-in z-50">
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
  );
};

export default Layout;
