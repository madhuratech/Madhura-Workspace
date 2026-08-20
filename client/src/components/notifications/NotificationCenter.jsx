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
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useContext(NotificationContext);
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
        className="relative p-2 rounded-full text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 transition-colors shadow-sm"
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
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-[420px] bg-bg-secondary/95 backdrop-blur-2xl border border-border/40 shadow-[0_12px_48px_rgba(0,0,0,0.25)] rounded-[24px] overflow-hidden z-50 flex flex-col max-h-[85vh] origin-top-right"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex flex-col gap-3 bg-gradient-to-b from-bg-primary/80 to-transparent">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-text-primary text-[19px] tracking-tight">Notifications</h3>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-[12px] font-bold text-danger hover:text-white hover:bg-danger px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={14} strokeWidth={3} /> Clear all
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[12px] font-bold text-accent-blue hover:text-accent-indigo hover:bg-accent-blue/10 px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                    >
                      <Check size={14} strokeWidth={3} /> Mark all read
                    </button>
                  )}
                </div>
              </div>
              
              {/* iOS style Segmented Control Tabs */}
              <div className="flex p-1 bg-border/20 rounded-xl">
                {['all', 'unread', 'mentions', 'tasks'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-[12px] font-bold tracking-wide rounded-lg transition-all duration-200 ${
                      activeTab === tab 
                        ? 'bg-bg-secondary text-text-primary shadow-sm' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="capitalize">{tab}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-16 h-16 bg-bg-primary/50 rounded-full flex items-center justify-center mb-5 border border-border/50 shadow-inner">
                    <Bell size={24} className="text-text-secondary/40" />
                  </div>
                  <p className="text-[15px] font-bold text-text-primary mb-1 tracking-tight">You're all caught up!</p>
                  <p className="text-[13px] text-text-secondary font-medium">No {activeTab !== 'all' ? activeTab : ''} notifications to show.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1 mt-2">
                  {filteredNotifications.map((notif) => (
                    <div
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`relative p-3.5 flex items-start gap-3.5 cursor-pointer transition-all duration-200 hover:bg-bg-primary/60 rounded-xl group pr-10 ${!notif.read ? 'bg-accent-blue/[0.04]' : ''}`}
                    >
                      {/* Avatar / Icon */}
                      <div className="shrink-0 relative">
                        <div className="w-11 h-11 rounded-full overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.1)] border border-border/40 flex items-center justify-center bg-gradient-to-tr from-bg-primary to-bg-secondary">
                          {notif.sender?.avatar ? (
                            <img src={notif.sender.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getIconForType(notif.type)
                          )}
                        </div>
                        {/* Unread subtle dot instead of left bar */}
                        {!notif.read && (
                          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-secondary bg-accent-blue"></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5 flex flex-col justify-center">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-[14px] font-bold text-text-primary tracking-tight truncate pr-3">
                            {notif.title}
                          </span>
                          <span className="text-[11px] font-semibold text-text-secondary/70 shrink-0">
                            {formatTimeAgo(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-[13.5px] font-medium text-text-secondary/90 leading-[1.3] mt-0.5 line-clamp-2 pr-2">
                          {notif.message}
                        </p>
                      </div>

                      {/* Delete Button (visible on hover) */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                        className="opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-3 p-1.5 rounded-full text-text-secondary hover:text-danger hover:bg-danger/10 transition-all z-10"
                        title="Delete notification"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-3 border-t border-border/30 bg-bg-primary/40 text-center">
              <button 
                onClick={() => { navigate('/activity-logs'); setIsOpen(false); }}
                className="text-[12px] font-bold text-text-secondary hover:text-text-primary transition-colors py-1 px-4 rounded-full hover:bg-bg-secondary"
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
