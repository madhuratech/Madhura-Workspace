import React from 'react';
import LogoIntro from './LogoIntro';

const SplashScreen = ({ onFinish }) => {
  return (
    <LogoIntro
      onClose={onFinish}
      autoDismissAfter={5000}
    />
  );
};

export default SplashScreen;
