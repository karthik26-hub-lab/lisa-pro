import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
const MicDock = ({ onSend, isLoading, accentColor = 'blue', input = '', setInput = () => {} }) => {
  const colors = { blue: 'bg-blue-500', purple: 'bg-purple-500', green: 'bg-green-500', orange: 'bg-orange-500', pink: 'bg-pink-500' };
  const currentColor = colors[accentColor] || colors.blue;

  
  const [sessionTranscript, setSessionTranscript] = useState(''); 
  const [liveInterim, setLiveInterim] = useState('');
  
  const [recordState, setRecordState] = useState('idle'); 
  const [recordingTime, setRecordingTime] = useState(0);
  
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  const isTyping = input.trim().length > 0 && recordState === 'idle';

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSend = (textToSend = input) => {
    const trimmed = textToSend.trim();
    if (trimmed && !isLoading) {
      onSend(trimmed);
      setInput('');
      
      // Reset textarea height
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  };

  const stopRecordingAndSend = () => {
    recognitionRef.current?.stop();
    const finalResult = (input + ' ' + sessionTranscript + ' ' + liveInterim).trim();
    setRecordState('idle');
    setSessionTranscript('');
    setLiveInterim('');
    setRecordingTime(0);
    if (finalResult) {
      handleSend(finalResult);
    }
  };

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; 
      recognitionRef.current.interimResults = true; 
      
      recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.onresult = (event) => {
        let currentInterim = '';
        let currentFinal = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        
        if (currentFinal) {
          setSessionTranscript((prev) => (prev + ' ' + currentFinal).trim());
        }
        setLiveInterim(currentInterim);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        stopRecording(false);
      };
    }
  }, []);

  useEffect(() => {
    if (recordState === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recordState]);

  const startRecording = () => {
    setRecordState('recording');
    setSessionTranscript('');
    setLiveInterim('');
    setRecordingTime(0);
    recognitionRef.current?.start();
  };

  const pauseRecording = () => {
    setRecordState('paused');
    recognitionRef.current?.stop();
    const accumulated = (sessionTranscript + ' ' + liveInterim).trim();
    setInputText((prev) => (prev + ' ' + accumulated).trim());
    setSessionTranscript('');
    setLiveInterim('');
  };

  const resumeRecording = () => {
    setRecordState('recording');
    recognitionRef.current?.start();
  };

  const stopRecording = (save = true) => {
    recognitionRef.current?.stop();
    if (save) {
      const finalResult = (inputText + ' ' + sessionTranscript + ' ' + liveInterim).trim();
      if (finalResult) {
        setInputText(finalResult); 
      }
    } else {
      setInputText('');
    }
    setRecordState('idle');
    setSessionTranscript('');
    setLiveInterim('');
    setRecordingTime(0);
  };

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Floating Live Text Bubble - UPDATED TO GLASSY DARK MODE */}
      {(recordState === 'recording' || recordState === 'paused') && (sessionTranscript || liveInterim || inputText) && (
        <div className="mb-4 bg-black/70 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] max-w-sm text-center transform transition-all duration-300 text-sm font-medium leading-relaxed">
          {inputText && <span className="text-gray-400">{inputText} </span>}
          {sessionTranscript && <span className="text-white">{sessionTranscript} </span>}
          {liveInterim && <span className="text-lisaBlue italic opacity-90">{liveInterim}</span>}
          {!liveInterim && !sessionTranscript && recordState === 'recording' && (
            <span className="text-gray-400 italic">Listening...</span>
          )}
        </div>
      )}

      {/* Dock Container - UPDATED TO FROSTED GLASS WATER DROP */}
      <div className={`flex items-center bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-2xl rounded-3xl p-2 w-full border transition-all duration-500 ease-out text-lisaBlack dark:text-white ${isLoading ? 'animate-water-pulse border-lisaBlue/40 dark:border-white/20' : 'border-gray-200 dark:border-white/10 shadow-2xl'}`}>
        
        {recordState === 'idle' ? (
          <>
            {/* Replace the input tag with this textarea */}
<textarea
  rows="1"
  placeholder="Type or speak your idea..."
  className="flex-1 bg-transparent px-6 py-4 outline-none text-gray-800 dark:text-white/90 placeholder-gray-500 dark:placeholder-white/50 font-medium resize-none overflow-y-auto max-h-32"
  value={input}
  onChange={(e) => {
    setInput(e.target.value);
    // Auto-adjust height logic
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }}
/>
            
            {isTyping ? (
              <button 
                onClick={() => handleSend()}
                disabled={isLoading}
                className={`w-12 h-12 ${currentColor} text-white p-3 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:shadow-[0_0_25px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed animate-water-ripple' : ''}`}
              >
                <ArrowUp strokeWidth={3} className="w-6 h-6" />
              </button>
            ) : (
              <button 
                onClick={startRecording}
                disabled={isLoading}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${currentColor} text-white shadow-pill hover:scale-105 active:scale-95 transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-between px-2 w-full">
            
            <button onClick={() => stopRecording(false)} className="p-3 text-gray-500 hover:text-red-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>

            <div className="flex items-center space-x-2">
              {recordState === 'recording' && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              <span className={`font-mono font-semibold ${recordState === 'recording' ? 'text-red-500' : 'text-gray-500'}`}>
                {formatTime(recordingTime)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {recordState === 'recording' ? (
                <button onClick={pauseRecording} className="p-2 text-gray-700 hover:bg-black/5 rounded-full transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
                </button>
              ) : (
                <button onClick={resumeRecording} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                </button>
              )}

              <button 
                onClick={stopRecordingAndSend}
                disabled={isLoading}
                className={`w-10 h-10 ${currentColor} text-white p-2 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:shadow-[0_0_25px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed animate-water-ripple' : ''}`}
              >
                <ArrowUp strokeWidth={3} className="w-5 h-5" />
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default MicDock;