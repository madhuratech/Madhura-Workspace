import React from 'react';

const AnimatedLoader = ({ fullScreen = false }) => {
  return (
    <div className={`flex flex-col items-center justify-center w-full ${fullScreen ? 'min-h-screen' : 'py-16'}`}>
      <div className="relative group flex items-center justify-center">
        {/* Ambient Glow */}
        <div className="absolute inset-[-10px] rounded-full bg-gradient-to-r from-accent-blue to-purple-500 opacity-30 blur-md animate-pulse"></div>
        
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Spinning dashed border */}
          <div className="absolute inset-0 border-2 border-dashed border-accent-blue/40 rounded-full animate-[spin_4s_linear_infinite]"></div>
          <div className="absolute inset-0 border-2 border-dashed border-purple-500/30 rounded-full animate-[spin_6s_linear_infinite_reverse]"></div>
          
          {/* Logo container pulsing */}
          <div className="w-12 h-12 bg-white dark:bg-bg-secondary rounded-full flex items-center justify-center shadow-lg animate-pulse overflow-hidden p-2">
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
      <p className="mt-4 text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-purple-500 uppercase tracking-widest animate-pulse">
        Loading...
      </p>
    </div>
  );
};

export default AnimatedLoader;
