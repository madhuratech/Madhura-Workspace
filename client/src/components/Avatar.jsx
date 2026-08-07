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

  const getStatusColor = (status) => {
    if (status === 'Active' || !status) return 'bg-success';
    if (status === 'Busy') return 'bg-danger';
    if (status === 'Break') return 'bg-warning';
    if (status === 'Lunch') return 'bg-purple-500';
    if (status === 'Leave') return 'bg-gray-500';
    return 'bg-orange-400';
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
        <div className={`absolute bottom-0 right-0 h-[30%] w-[30%] min-w-[10px] min-h-[10px] rounded-full border-2 border-bg-primary ${getStatusColor(user.presenceStatus)}`}></div>
      )}
    </div>
  );
};

export default Avatar;
