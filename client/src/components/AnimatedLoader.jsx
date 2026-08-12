import React from 'react';

const AnimatedLoader = ({ fullScreen = false }) => {
  return (
    <div className={`flex flex-col items-center justify-center w-full ${fullScreen ? 'min-h-screen' : 'py-16'}`}>
      <div className="relative group flex items-center justify-center">
        {/* Ambient Glow */}
        <div className="absolute inset-[-10px] rounded-full bg-gradient-to-r from-accent-blue to-purple-500 opacity-30 blur-md animate-pulse"></div>
        
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Spinning dashed border */}
          <div className="absolute inset-0 border-[3px] border-dashed border-accent-blue/40 rounded-full animate-[spin_4s_linear_infinite]"></div>
          <div className="absolute inset-0 border-[3px] border-dashed border-purple-500/30 rounded-full animate-[spin_6s_linear_infinite_reverse]"></div>
          
          {/* Logo container pulsing */}
          <div className="w-24 h-24 bg-white dark:bg-bg-secondary rounded-full flex items-center justify-center shadow-2xl animate-pulse overflow-hidden p-3">
            <img 
              src="/Madhura-logo.webp" 
              alt="Loading..." 
              className="w-full h-full object-contain drop-shadow-sm"
              onError={(e) => {
                // Fallback to M if logo fails to load for some reason
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<span class="text-accent-blue font-bold text-xl">M</span>';
              }}
            />
          </div> 
        </div>
      </div>
      <p className="mt-8 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-purple-500 uppercase tracking-[0.3em] animate-pulse">
        Loading...
      </p>
    </div>
  );
};

export default AnimatedLoader;
