import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Copy, BookmarkPlus, Share, Check } from 'lucide-react';

// Custom lightweight markdown renderer to avoid external package issues in React 19
const renderMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeContent = [];
  let codeLanguage = '';
  let listItems = [];

  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="list-disc pl-6 mb-4 space-y-1 text-gray-700 dark:text-white/80 font-medium">
          {listItems.map((item, idx) => (
            <li key={`li-${key}-${idx}`} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const formatInline = (str) => {
    // Escape HTML first
    let escaped = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Bold: **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-lisaBlack dark:text-white/90">$1</strong>');
    
    // Inline code: `code`
    escaped = escaped.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded text-xs font-mono text-lisaBlue dark:text-white/90">$1</code>');
    
    return escaped;
  };

  lines.forEach((line, index) => {
    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        const codeText = codeContent.join('\n');
        elements.push(<CodeBlock key={`code-${index}`} code={codeText} language={codeLanguage} />);
        codeContent = [];
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        // Flush any pending list first
        flushList(index);
        inCodeBlock = true;
        codeLanguage = line.trim().substring(3).trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return;
    }

    // Handle Headings
    if (line.startsWith('# ')) {
      flushList(index);
      elements.push(
        <h1 key={`h1-${index}`} className="text-2xl font-bold tracking-tight mt-6 mb-3 text-lisaBlack dark:text-white/90">
          {line.substring(2)}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      flushList(index);
      elements.push(
        <h2 key={`h2-${index}`} className="text-xl font-bold tracking-tight mt-5 mb-2.5 text-lisaBlack dark:text-white/90">
          {line.substring(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList(index);
      elements.push(
        <h3 key={`h3-${index}`} className="text-lg font-bold tracking-tight mt-4 mb-2 text-lisaBlack dark:text-white/90">
          {line.substring(4)}
        </h3>
      );
    } 
    // Handle List Items
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const cleanLine = line.trim().substring(2);
      listItems.push(cleanLine);
    } 
    // Handle Blank Lines
    else if (line.trim() === '') {
      flushList(index);
      elements.push(<div key={`space-${index}`} className="h-2" />);
    } 
    // Handle Regular Paragraphs
    else {
      flushList(index);
      elements.push(
        <p 
          key={`p-${index}`} 
          className="mb-4 leading-relaxed text-gray-700 dark:text-white/80 font-medium text-base"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    }
  });

  // Flush any final list items
  flushList(lines.length);

  return elements;
};

// Sub-component for syntax-highlighted code blocks with built-in copy functionality
const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm bg-black/95 text-gray-100 flex flex-col font-mono text-sm">
      <div className="bg-black/40 px-4 py-2 flex items-center justify-between border-b border-white/10 text-xs text-gray-400">
        <span>{language || 'code'}</span>
        <button 
          onClick={handleCopy}
          className="flex items-center space-x-1 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto max-h-96 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const ResponseContainer = ({ messages, isLoading, triggerRefiner, editPromptTarget, handleSend, handleSavePrompt, setInput, chatInputRef, activeFlow, setShowShareModal }) => {
  const containerEndRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  // Auto scroll to bottom when messages or loading changes
  useEffect(() => {
    containerEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCopy = async (textToCopy, idx) => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageId(idx);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="w-full max-w-2xl px-6 flex-1 flex flex-col min-h-0 space-y-6 pt-24 pb-4">
      {messages.map((msg, idx) => {
        let options = [];
        let mainText = "";
        
        if (msg.role === 'assistant') {
          const content = msg.content;
          const lines = content.split('\n');
          const mainTextLines = [];
          
          lines.forEach(line => {
            const match = line.match(/[\*\s]*\[([A-E])\]\s*(.*)/);
            if (match) {
              const cleanText = match[2].replace(/[\*:]/g, '').trim();
              options.push({ letter: match[1], text: cleanText });
            } else {
              mainTextLines.push(line);
            }
          });
          mainText = mainTextLines.join('\n').trim();
        }

        return (
          <div 
            key={idx} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
          >
            {msg.role === 'user' ? (
              // User Query
              <div className="bg-lisaBlack text-white dark:bg-white/10 dark:text-white/90 px-5 py-3 rounded-2xl max-w-[85%] shadow-sm font-medium text-sm leading-relaxed dark:backdrop-blur-xl dark:border border-white/5">
                {msg.content}
              </div>
            ) : (
              <div className="w-full max-w-4xl mx-auto my-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="relative overflow-hidden bg-white/60 dark:bg-[#1a1a1a]/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  
                  {/* Card Header: Action Bar */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-gray-800">
                    {/* Left: Apple Mac Style Dots */}
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-sm"></div>
                      <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm"></div>
                      <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-sm"></div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleSavePrompt && handleSavePrompt(mainText)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white text-[11px] font-medium transition-all"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Save</span>
                      </button>
                      <button 
                        onClick={() => handleCopy(mainText, idx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white text-[11px] font-medium transition-all"
                      >
                        {copiedMessageId === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
                            <span className="hidden sm:inline text-green-500 dark:text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Copy</span>
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => setShowShareModal && setShowShareModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white text-[11px] font-medium transition-all"
                      >
                        <Share className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Share</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-col gap-3">
                      {/* Replace the single mainText rendering with this parsing logic */}
                      {mainText && (() => {
                        // Split by markdown code blocks
                        const parts = mainText.split(/(```[\s\S]*?```)/g);

                        return (
                          <div className="text-[15px] font-sans leading-relaxed text-gray-800 dark:text-gray-200">
                            {parts.map((part, i) => {
                              // If it's a code block (Artifact)
                              if (part.startsWith('```') && part.endsWith('```')) {
                                const content = part.replace(/```[a-z]*\n?/i, '').replace(/```$/, '').trim();
                                return (
                                  <div key={i} className="relative w-full bg-[#0b0c10] border border-white/10 rounded-2xl p-4 my-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] font-mono text-[13px] text-gray-200 group">
                                    
                                    {/* Localized Floating Copy Button just for this artifact */}
                                    <button 
                                      onClick={() => handleCopy(content, `artifact-${idx}-${i}`)}
                                      className="absolute top-3 right-3 p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100"
                                      title="Copy Artifact"
                                    >
                                      {copiedMessageId === `artifact-${idx}-${i}` ? (
                                        <Check size={14} className="text-green-400" />
                                      ) : (
                                        <Copy size={14} />
                                      )}
                                    </button>
                                    
                                    <pre className="whitespace-pre-wrap overflow-x-auto pr-12 font-mono">{content}</pre>
                                  </div>
                                );
                              }
                              
                              // Regular conversational text
                              if (part.trim()) {
                                return <p key={i} className="mb-2 whitespace-pre-wrap">{part}</p>;
                              }
                              return null;
                            })}
                          </div>
                        );
                      })()}
                        
                        {options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {options.map((opt, i) => {
                              const isCustomOption = opt.letter === 'E' || opt.text.toLowerCase().includes('custom');
                              
                              return (
                                <button 
                                  key={i}
                                  onClick={() => {
                                    if (isCustomOption) {
                                      setInput && setInput('Custom: '); 
                                      setTimeout(() => chatInputRef?.current?.focus(), 100);
                                    } else {
                                      handleSend && handleSend(`[${opt.letter}] ${opt.text}`);
                                    }
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:shadow-md transition-all group"
                                >
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-black flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400 group-hover:text-white group-hover:bg-cyan-500 transition-colors">
                                    {opt.letter}
                                  </span>
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                                    {opt.text}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                <div className="flex flex-wrap gap-2 px-6 py-4 bg-gray-50/30 dark:bg-black/10 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-400 flex items-center mr-2">Quick Refine:</span>
                  {activeFlow === 'code' && (
                    <>
                      <button 
                        onClick={() => handleSend && handleSend("Explain this code logic simply using one-line points.")}
                        className="px-3 py-1 text-xs rounded-full bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors border border-cyan-100 dark:border-cyan-900/50"
                      >
                        Explain in One-Liners
                      </button>
                      <button 
                        onClick={() => handleSend && handleSend("Add detailed inline comments to this code.")}
                        className="px-3 py-1 text-xs rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-100 dark:border-blue-900/50"
                      >
                        Add Comments
                      </button>
                      <button 
                        onClick={() => handleSend && handleSend("Are there any bugs or optimizations possible here?")}
                        className="px-3 py-1 text-xs rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors border border-orange-100 dark:border-orange-900/50"
                      >
                        Find Bugs
                      </button>
                    </>
                  )}

                  {/* Prompt Architect Options */}
                  {activeFlow === 'prompt' && (
                    <>
                      <button 
                        onClick={() => handleSend && handleSend("Apply a cinematic vintage and retro film-like visual tone to this.")}
                        className="px-3 py-1 text-xs rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors border border-purple-100 dark:border-purple-900/50"
                      >
                        Cinematic Vintage
                      </button>
                      <button 
                        onClick={() => handleSend && handleSend("Make it ultra-realistic with highly detailed 8k textures.")}
                        className="px-3 py-1 text-xs rounded-full bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-colors border border-pink-100 dark:border-pink-900/50"
                      >
                        Ultra Realistic
                      </button>
                    </>
                  )}

                  {/* Mail & Docs Options */}
                  {activeFlow === 'mail' && (
                    <>
                      <button 
                        onClick={() => handleSend && handleSend("Make the tone more formal and professional.")}
                        className="px-3 py-1 text-xs rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors border border-green-100 dark:border-green-900/50"
                      >
                        Make Professional
                      </button>
                      <button 
                        onClick={() => handleSend && handleSend("Shorten this text while keeping the main points.")}
                        className="px-3 py-1 text-xs rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors border border-teal-100 dark:border-teal-900/50"
                      >
                        Shorten
                      </button>
                    </>
                  )}

                  {/* General/Fallback Options */}
                  {!activeFlow && (
                    <>
                      <button 
                        onClick={() => handleSend && handleSend("Simplify this using easy one-line points.")}
                        className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                      >
                        Simplify (One-liners)
                      </button>
                    </>
                  )}
                </div>
                
              </div>
            </div>
          )}
        </div>
      );
      })}

      {/* Shimmer/Pulse Loading for Model */}
      {isLoading && (
        <div className="w-full h-auto min-h-[100px] p-6 bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/5 flex flex-col space-y-4 animate-pulse">
          {/* macOS Title Bar Shimmer */}
          <div className="border-b border-gray-100 dark:border-white/5 pb-3 flex items-center justify-between">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-white/10"></div>
              <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-white/10"></div>
              <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-white/10"></div>
            </div>
          </div>
          {/* Content Shimmer */}
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-md w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-md w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-md w-2/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-md w-1/2 mt-4"></div>
          </div>
        </div>
      )}

      {/* Spacer to fix scroll lock under floating dock */}
      <div className="h-40 w-full flex-shrink-0"></div>

      {/* Reference node to scroll to */}
      <div ref={containerEndRef} />
    </div>
  );
};

export default ResponseContainer;