import React from 'react';
import { useNavigate } from 'react-router-dom';

const Avatar = ({ user, size = 'w-10 h-10', textClass = 'text-sm', showStatus = true, className = '', onClick }) => {
  const navigate = useNavigate();

  if (!user) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    } else if (user._id || user.id) {
      navigate(`/profile/${user._id || user.id}`);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Active':
        return <svg viewBox="0 0 16 16" fill="none" className="w-full h-full"><circle cx="8" cy="8" r="7.5" fill="#92C353" stroke="#92C353" /><path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
      case 'Busy':
        return <svg viewBox="0 0 16 16" fill="none" className="w-full h-full"><circle cx="8" cy="8" r="7.5" fill="#C4314B" stroke="#C4314B" /><circle cx="8" cy="8" r="3" fill="white" /></svg>;
      case 'Break':
        return <svg viewBox="0 0 16 16" fill="none" className="w-full h-full"><circle cx="8" cy="8" r="7.5" fill="#C4314B" stroke="#C4314B" /><rect x="4" y="7" width="8" height="2" rx="1" fill="white" /></svg>;
      case 'Lunch':
        return <svg viewBox="0 0 16 16" fill="none" className="w-full h-full"><circle cx="8" cy="8" r="7.5" fill="#F8B739" stroke="#F8B739" /><path d="M8 4.5v3.75l2.25 2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
      case 'Away':
        return <svg viewBox="0 0 16 16" fill="none" className="w-full h-full"><circle cx="8" cy="8" r="7.5" fill="#F8B739" stroke="#F8B739" /><path d="M8 4.5v3.75l2.25 2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3.5" fill="#605E5C" stroke="white" strokeWidth="1" /><rect x="11" y="11" width="2" height="2" rx="0.5" fill="white" /></svg>;
      case 'Leave':
        return <svg viewBox="0 0 16 16" fill="none" className="w-full h-full"><circle cx="8" cy="8" r="7.5" fill="none" stroke="#8A8886" strokeWidth="1.5" /><circle cx="8" cy="8" r="4" fill="#8A8886" /><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" /></svg>;
      default:
        return <svg viewBox="0 0 16 16" fill="none" className="w-full h-full"><circle cx="8" cy="8" r="7.5" fill="#92C353" stroke="#92C353" /><path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    }
  };

  return (
    <div 
      className={`relative inline-block cursor-pointer rounded-full ${className}`}
      onClick={handleClick}
      title={user.name || 'User Profile'}
    >
      {user.avatar ? (
        <img 
          src={user.avatar} 
          alt={user.name} 
          className={`${size} rounded-full object-cover border border-border/50`}
        />
      ) : (
        <div className={`${size} rounded-full bg-gradient-to-br from-accent-blue/20 to-accent-indigo/20 flex items-center justify-center text-accent-blue font-bold ${textClass} border border-accent-blue/10`}>
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
      )}
      
      {showStatus && (
        <div className={`absolute bottom-0 right-0 h-[32%] w-[32%] min-w-[12px] min-h-[12px] rounded-full border-[1.5px] border-bg-primary flex items-center justify-center bg-bg-primary`}>
          {getStatusIcon(user.presenceStatus)}
        </div>
      )}
    </div>
  );
};

export default Avatar;
