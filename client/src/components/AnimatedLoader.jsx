import React, { useState, useEffect } from 'react';

const SplashScreen = ({ onFinish }) => {
  const [phase, setPhase] = useState('show'); // 'show' | 'fadeout'

  useEffect(() => {
    // Show for 1.6s then fade out
    const t1 = setTimeout(() => setPhase('fadeout'), 1600);
    // After fade (600ms), notify parent
    const t2 = setTimeout(() => onFinish?.(), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        transition: 'opacity 600ms ease',
        opacity: phase === 'fadeout' ? 0 : 1,
        pointerEvents: phase === 'fadeout' ? 'none' : 'all',
      }}
    >
      {/* Logo — scales up gently then stays */}
      <img
        src="/Madhura-logo.webp"
        alt="Madhura Workspace"
        style={{
          width: 200,
          height: 'auto',
          objectFit: 'contain',
          animation: 'splashLogoIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML =
            '<span style="font-size:2.5rem;font-weight:800;color:#1b2b4c;letter-spacing:-1px;">Madhura</span>';
        }}
      />

      <style>{`
        @keyframes splashLogoIn {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
