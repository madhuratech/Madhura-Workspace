import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, MessageSquare, CheckSquare, AlertCircle, X, Check, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const getIconForType = (type) => {
  switch (type) {
    case 'message': return <MessageSquare size={16} className="text-blue-500" />;
    case 'mention': return <AlertCircle size={16} className="text-purple-500" />;
    case 'task': return <CheckSquare size={16} className="text-green-500" />;
    case 'leave': return <FileText size={16} className="text-orange-500" />;
    default: return <Bell size={16} className="text-gray-400" />;
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

const NotificationToast = () => {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleInAppNotification = (e) => {
      const notification = e.detail;
      setToasts(prev => {
        // Prevent duplicate toasts
        if (prev.find(t => t._id === notification._id)) return prev;
        return [...prev, notification];
      });

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t._id !== notification._id));
      }, 5000);
    };

    window.addEventListener('in_app_notification', handleInAppNotification);
    return () => window.removeEventListener('in_app_notification', handleInAppNotification);
  }, []);

  const removeToast = (id, e) => {
    if (e) e.stopPropagation();
    setToasts(prev => prev.filter(t => t._id !== id));
  };

  const handleToastClick = (notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
    removeToast(notification._id);
  };

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-[400px] w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast._id}
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            whileHover={{ scale: 1.02 }}
            layout
            onClick={() => handleToastClick(toast)}
            className="pointer-events-auto cursor-pointer relative flex items-start gap-3.5 bg-bg-secondary/95 backdrop-blur-2xl border border-border/40 shadow-2xl rounded-[20px] p-4 overflow-hidden group"
          >
            {/* Glossy Avatar / Icon */}
            <div className="shrink-0 relative">
              <div className="w-11 h-11 rounded-full overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-border/30 flex items-center justify-center bg-gradient-to-tr from-bg-primary to-bg-secondary">
                {toast.sender?.avatar ? (
                  <img src={toast.sender.avatar} alt="Sender" className="w-full h-full object-cover" />
                ) : (
                  getIconForType(toast.type)
                )}
              </div>
              {/* Type indicator badge */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-bg-secondary bg-bg-primary flex items-center justify-center shadow-sm">
                {getIconForType(toast.type)}
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 min-w-0 pt-0.5 flex flex-col justify-center">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[14px] font-bold text-text-primary tracking-tight truncate pr-4">
                  {toast.title}
                </span>
                <span className="text-[11px] font-semibold text-text-secondary/70 shrink-0">
                  {formatTimeAgo(toast.createdAt)}
                </span>
              </div>
              <span className="text-[13px] text-text-secondary leading-snug line-clamp-2 pr-2 font-medium">
                {toast.message}
              </span>
            </div>

            {/* Hover Close Button */}
            <button 
              onClick={(e) => removeToast(toast._id, e)}
              className="absolute top-3 right-3 shrink-0 p-1.5 rounded-full bg-border/20 text-text-secondary hover:text-text-primary hover:bg-border/50 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md"
            >
              <X size={12} strokeWidth={3} />
            </button>
            
            {/* Subtle Unread Dot instead of large bar */}
            {!toast.read && (
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToast;
