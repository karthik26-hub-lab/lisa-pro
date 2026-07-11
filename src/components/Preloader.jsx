import React, { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';

const Preloader = ({ isProMode }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start the fade-out animation after 2 seconds
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2000);

    // Completely remove the component from the DOM after 2.5 seconds
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-[#0a0a0a] transition-opacity duration-500 ease-in-out ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center animate-fade-in">
        {/* Glowing Logo Container */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
          <div className="relative p-5 bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl">
            <Brain size={48} className="text-gray-900 dark:text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* Dynamic App Name */}
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 tracking-tight mb-3">
          Lisa {isProMode && <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">Pro</span>}
        </h1>

        {/* Tagline */}
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-[0.3em] uppercase">
          Intelligence, Evolved.
        </p>
      </div>
    </div>
  );
};

export default Preloader;