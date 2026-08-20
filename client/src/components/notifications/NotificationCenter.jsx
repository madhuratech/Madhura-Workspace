import React, { useState, useContext, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, MessageSquare, CheckSquare, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { NotificationContext } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const getIconForType = (type) => {
  switch (type) {
    case 'message': return <MessageSquare size={14} className="text-blue-500" />;
    case 'mention': return <AlertCircle size={14} className="text-purple-500" />;
    case 'task': return <CheckSquare size={14} className="text-green-500" />;
    case 'leave': return <FileText size={14} className="text-orange-500" />;
    default: return <Bell size={14} className="text-gray-400" />;
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const NotificationCenter = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useContext(NotificationContext);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, unread, mentions, tasks
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'mentions') return n.type === 'mention';
    if (activeTab === 'tasks') return n.type === 'task';
    return true; // all
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-bg-primary shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[400px] bg-bg-secondary/95 backdrop-blur-xl border border-border/60 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-bg-primary/50">
              <h3 className="font-bold text-text-primary text-base">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-accent-blue hover:text-accent-indigo transition-colors flex items-center gap-1"
                >
                  <Check size={14} /> Mark all as read
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex px-2 border-b border-border/50 bg-bg-primary/20">
              {['all', 'unread', 'mentions', 'tasks'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === tab 
                      ? 'border-accent-blue text-accent-blue' 
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-bg-secondary">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 bg-bg-primary rounded-full flex items-center justify-center mb-4 border border-border">
                    <Bell size={24} className="text-text-secondary/50" />
                  </div>
                  <p className="text-sm font-bold text-text-primary mb-1">You're all caught up!</p>
                  <p className="text-xs text-text-secondary">No {activeTab !== 'all' ? activeTab : ''} notifications to show.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {filteredNotifications.map((notif) => (
                    <div
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`relative p-4 flex gap-4 cursor-pointer transition-colors hover:bg-bg-primary/50 group ${!notif.read ? 'bg-accent-blue/5' : ''}`}
                    >
                      {/* Unread Indicator */}
                      {!notif.read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-blue"></div>
                      )}

                      {/* Avatar / Icon */}
                      <div className="shrink-0 w-10 h-10 rounded-full bg-bg-primary border border-border flex items-center justify-center overflow-hidden shadow-sm self-start">
                        {notif.sender?.avatar ? (
                          <img src={notif.sender.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getIconForType(notif.type)
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary mb-1 leading-snug">
                          <span className="font-bold mr-1">{notif.title}</span>
                          <span className="text-text-secondary">{notif.message}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-accent-blue uppercase tracking-wider flex items-center gap-1">
                            {getIconForType(notif.type)} {notif.type}
                          </span>
                          <span className="text-text-secondary/30">•</span>
                          <span className="text-[11px] font-medium text-text-secondary">{formatTimeAgo(notif.createdAt)}</span>
                        </div>
                      </div>

                      {/* Hover action (optional) */}
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-text-secondary self-center">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-3 border-t border-border/50 bg-bg-primary/80 text-center">
              <button 
                onClick={() => { navigate('/activity-logs'); setIsOpen(false); }}
                className="text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
              >
                View Activity Logs →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
