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
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            whileHover={{ scale: 1.02 }}
            layout
            onClick={() => handleToastClick(toast)}
            className="pointer-events-auto cursor-pointer flex flex-col bg-bg-secondary/90 backdrop-blur-xl border border-border/60 shadow-xl rounded-2xl p-4 overflow-hidden group"
          >
            <div className="flex items-start gap-3">
              {/* Icon / Avatar */}
              <div className="shrink-0 w-10 h-10 rounded-full bg-bg-primary border border-border flex items-center justify-center overflow-hidden shadow-sm">
                {toast.sender?.avatar ? (
                  <img src={toast.sender.avatar} alt="Sender" className="w-full h-full object-cover" />
                ) : (
                  getIconForType(toast.type)
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex justify-between items-start mb-0.5">
                  <h4 className="text-sm font-bold text-text-primary truncate pr-2">
                    {toast.title}
                  </h4>
                  <button 
                    onClick={(e) => removeToast(toast._id, e)}
                    className="shrink-0 p-1 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                  {toast.message}
                </p>
                
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-blue flex items-center gap-1">
                    {getIconForType(toast.type)}
                    {toast.type}
                  </span>
                  <span className="text-text-secondary/30">•</span>
                  <span className="text-[10px] font-semibold text-text-secondary">
                    {formatTimeAgo(toast.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Unread Indicator Bar */}
            {!toast.read && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-blue rounded-l-2xl"></div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToast;
