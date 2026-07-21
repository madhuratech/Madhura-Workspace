import React, { useContext, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { LayoutDashboard, FolderKanban, LogOut, Settings, Users, CalendarDays, FileText, Search, Bell, Mail, Sun, Moon, BarChart3, Clock } from 'lucide-react';

const Layout = () => {
  const { user, logout, notifications, unreadCount, markAsRead, markAllAsRead, deleteAllNotifications, socket } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
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

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden font-sans text-text-primary transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-secondary border-r border-border hidden md:flex flex-col z-20">
        <div className="p-5 flex items-center space-x-3">
          <div className="h-10 w-10 bg-accent-blue rounded flex items-center justify-center text-white font-bold text-xl">
            M
          </div>
          <h2 className="text-xl font-bold text-text-primary tracking-wide">MadhuraWS</h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
          <p className="text-[0.65rem] font-bold text-text-secondary uppercase tracking-wider mb-2 mt-4 px-2">Main</p>
          <Link to="/" className="flex items-center space-x-3 px-3 py-2.5 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary rounded-lg transition-all duration-300">
            <LayoutDashboard size={18} />
            <span className="font-medium text-sm">Dashboard</span>
          </Link>
          {user?.role === 'super_admin' && (
            <Link to="/team" className="flex items-center space-x-3 px-3 py-2.5 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary rounded-lg transition-all group">
              <Users size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-medium">Team Management</span>
            </Link>
          )}
          {user?.role === 'team_leader' && (
            <Link to="/tl-dashboard" className="flex items-center space-x-3 px-3 py-2.5 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary rounded-lg transition-all group">
              <BarChart3 size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-medium">TL Overview</span>
            </Link>
          )}
          <Link to="/projects" className="flex items-center space-x-3 px-3 py-2.5 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary rounded-lg transition-all duration-300">
            <FolderKanban size={18} />
            <span className="font-medium text-sm">Projects</span>
          </Link>
          <Link to="/chat" className="flex items-center space-x-3 px-3 py-2.5 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary rounded-lg transition-all duration-300">
            <Mail size={18} />
            <span className="font-medium text-sm">Chat & Comms</span>
          </Link>
          <Link to="/attendance" className="flex items-center space-x-3 px-3 py-2.5 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary rounded-lg transition-all duration-300">
            <Clock size={18} />
            <span className="font-medium text-sm">Attendance</span>
          </Link>
          <Link to="/meetings" className="flex items-center space-x-3 px-3 py-2.5 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary rounded-lg transition-all duration-300">
            <CalendarDays size={18} />
            <span className="font-medium text-sm">Meetings</span>
          </Link>
          <Link to="/documents" className="flex items-center space-x-3 px-3 py-2.5 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary rounded-lg transition-all duration-300">
            <FileText size={18} />
            <span className="font-medium text-sm">Documents</span>
          </Link>
        </nav>

        {(user?.role === 'super_admin' || user?.role === 'hr' || user?.role === 'team_leader') && (
          <div className="p-4 border-t border-border">
            <Link to="/settings" className="flex items-center space-x-3 px-3 py-2.5 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary rounded-lg transition-all group">
              <Settings size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-medium">Settings</span>
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
        <header className="mx-6 mt-4 h-16 bg-bg-secondary border border-border rounded-xl flex items-center justify-between px-6 z-40 relative shrink-0 shadow-sm">
          <div className="flex-1">
            <p className="text-xs text-text-secondary">Welcome back,</p>
            <p className="text-sm font-bold text-text-primary">{user?.name || 'ad a'}</p>
          </div>
          
          <div className="flex items-center space-x-5 text-text-secondary">
            <button onClick={toggleTheme} className="hover:text-text-primary transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="hover:text-text-primary transition-colors relative mt-1"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-danger rounded-full flex items-center justify-center text-[9px] text-white font-bold border-2 border-bg-secondary">
                    {unreadCount > 9 ? '9+' : unreadCount}
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
            <div className="h-8 w-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold text-sm shadow-sm ml-2">
              {user?.name?.substring(0, 2).toUpperCase() || 'AA'}
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
