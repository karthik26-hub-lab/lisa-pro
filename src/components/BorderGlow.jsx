import React from 'react';
import './BorderGlow.css';

const BorderGlow = ({ children, className }) => {
  return (
    <div className={`border-glow-wrapper p-[1px] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 ${className}`}>
      {children}
    </div>
  );
};

export default BorderGlow;
