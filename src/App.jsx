import React, { useState, useEffect, useRef } from 'react';
import { User, Settings, Pin, MoreVertical, Search, Plus, ArrowUp, Pencil, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, FileText, LayoutDashboard, Brain, Share, Share2, Sparkles, LogOut, Sun, Moon, Palette, PenLine, MessageSquare, Menu, X, Crown, ChevronRight, Cpu, Key, Loader2, Camera, BookOpen, FolderKanban, Sliders, ArrowLeft, Bookmark, BookmarkPlus, Mic, Send, Code2, Mail, MessageCircle, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { useUser, SignOutButton, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import Preloader from './components/Preloader';
import MicDock from './components/MicDock';
import ResponseContainer from './components/ResponseContainer';
import Aurora from './components/Aurora';
import BorderGlow from './components/BorderGlow';
import { generateLisaResponseStream } from './services/aiService';
import { promptTemplates } from './data/templates'; 

const exportUtils = {
  txt: (item) => {
    let chatText = `Lisa Pro Chat Export: ${item.title}\n\n`;
    item.messages.forEach(msg => {
      const role = msg.role === 'user' ? 'You' : 'Lisa Pro';
      chatText += `${role}:\n${msg.content}\n\n`;
    });
    const blob = new Blob([chatText], { type: 'text/plain' });
    saveAs(blob, `${item.title.replace(/\s+/g, '_')}_LisaPro.txt`);
  },
  pdf: (item) => {
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(16);
    doc.text(`Lisa Pro Chat Export: ${item.title}`, 10, y);
    y += 10;
    doc.setFontSize(12);
    item.messages.forEach(msg => {
      const role = msg.role === 'user' ? 'You' : 'Lisa Pro';
      const lines = doc.splitTextToSize(`${role}:\n${msg.content}`, 180);
      if (y + lines.length * 7 > 280) {
        doc.addPage();
        y = 10;
      }
      doc.text(lines, 10, y);
      y += lines.length * 7 + 5;
    });
    doc.save(`${item.title.replace(/\s+/g, '_')}_LisaPro.pdf`);
  },
  docx: async (item) => {
    const children = [
      new Paragraph({
        children: [new TextRun({ text: `Lisa Pro Chat Export: ${item.title}`, bold: true, size: 32 })],
      }),
      new Paragraph({ text: "" })
    ];
    
    item.messages.forEach(msg => {
      const role = msg.role === 'user' ? 'You' : 'Lisa Pro';
      children.push(new Paragraph({
        children: [new TextRun({ text: role, bold: true })]
      }));
      msg.content.split('\n').forEach(line => {
        children.push(new Paragraph({ text: line }));
      });
      children.push(new Paragraph({ text: "" }));
    });
    
    const doc = new Document({
      sections: [{ properties: {}, children }]
    });
    
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${item.title.replace(/\s+/g, '_')}_LisaPro.docx`);
  }
};

const PROVIDER_MODELS = {
  Google: ["gemini 2.5 flash", "Gemini 3.1 Pro", "Gemini 3 Flash", "Gemini 3.1 Flash Lite"],
  OpenAI: ["GPT-5.5", "GPT-5.5 Pro", "GPT-5.4", "GPT-5.4 Mini", "GPT-5.4 Nano"],
  Anthropic: ["Claude Opus 4.6", "Claude Sonnet 4.6", "Claude Haiku 4.5"],
  xAI: ["Grok 4.5", "Grok 4.1"],
  DeepSeek: ["DeepSeek V3", "DeepSeek R1"],
  Mistral: ["Mistral Medium", "Mistral Small", "Codestral"],
  Meta: ["Llama 4 Maverick", "Llama 4 Scout"]
};

const colors = {
  blue: 'bg-lisaBlue',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500',
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  yellow: 'bg-amber-500'
};

function App() {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // New States
  const [isDark, setIsDark] = useState(() => localStorage.getItem('lisaDark') === 'true');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('main');
  const [activeDocument, setActiveDocument] = useState(null);
  const [savedPrompts, setSavedPrompts] = useState(() => {
    const saved = localStorage.getItem('lisaPromptVault');
    return saved ? JSON.parse(saved) : [];
  });
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  
  const isProMode = true;
  const [activeFlow, setActiveFlow] = useState(null);
  const [customKey, setCustomKey] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFormat, setShareFormat] = useState('pdf');
  const [chatToShare, setChatToShare] = useState(null);
  const [isTechMode, setIsTechMode] = useState(false);
  const [proModifier, setProModifier] = useState('Standard');
  const [customName, setCustomName] = useState(() => localStorage.getItem('lisaCustomName') || '');
  const [customContext, setCustomContext] = useState(() => localStorage.getItem('lisaCustomContext') || '');
  const [input, setInput] = useState('');
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const chatInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setAttachedFile(file);
    
    // Read the file content
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleMicClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice recognition not supported in this browser.', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev ? prev + " " + transcript : transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  const [showPreloader, setShowPreloader] = useState(
    !sessionStorage.getItem('lisaPreloaderSeen')
  );
  
  const getAppBranding = () => isProMode ? "Lisa Pro" : "Lisa";
  
  const [selectedProvider, setSelectedProvider] = useState("OpenAI");
  const [selectedModel, setSelectedModel] = useState("GPT-5.5");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(() => localStorage.getItem('lisaMemory') !== 'false');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('lisaAccent') || 'blue');
  const colors = { blue: 'bg-blue-500', purple: 'bg-purple-500', green: 'bg-green-500', orange: 'bg-orange-500', pink: 'bg-pink-500' };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };
  
  // Chat History
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('lisaHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTemplate, setActiveTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [editPromptTarget, setEditPromptTarget] = useState(null);

  // Dark Mode effect
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('lisaDark', isDark);
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('lisaMemory', memoryEnabled);
  }, [memoryEnabled]);



  useEffect(() => {
    localStorage.setItem('lisaCustomName', customName);
    localStorage.setItem('lisaCustomContext', customContext);
  }, [customName, customContext]);

  useEffect(() => {
    localStorage.setItem('lisaAccent', accentColor);
  }, [accentColor]);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('lisaHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('lisaPromptVault', JSON.stringify(savedPrompts));
  }, [savedPrompts]);

  const handleSavePrompt = (promptText) => {
    if (!savedPrompts.some(p => p.text === promptText)) {
      setSavedPrompts([{ text: promptText, date: new Date().toISOString() }, ...savedPrompts]);
      showToast('Prompt saved to Vault!', 'success');
    } else {
      showToast('Prompt already in Vault!', 'info');
    }
  };

  const handleDeletePrompt = (index) => {
    const newPrompts = [...savedPrompts];
    newPrompts.splice(index, 1);
    setSavedPrompts(newPrompts);
  };

  const profileMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveToHistory = (msgs) => {
    if (msgs.length < 2) return;
    const title = msgs[0].content.substring(0, 30) + '...';
    // Add isPinned: false by default
    setHistory(prev => [{ id: Date.now(), title, messages: msgs, isPinned: false }, ...prev]);
  };

  const loadHistoryItem = (item) => {
    setMessages(item.messages);
    setIsSidebarOpen(false);
  };

  const handleNewSession = () => {
    if (messages.length > 0) saveToHistory(messages);
    setMessages([]);
    setActiveTemplate(null);
    setEditPromptTarget(null);
    setIsLoading(false);
    setIsSidebarOpen(false);
  };

  const openShareModal = (item, e) => {
    e.stopPropagation();
    setChatToShare(item);
    setShareFormat('pdf');
    setShowShareModal(true);
    setActiveMenuId(null);
  };

  const startGuidedFlow = (flow) => {
    setActiveFlow(flow);
    let initialMessage = "";

    if (flow === 'code') {
      initialMessage = "Code Builder initialized. What is the primary domain?\n\n[A] Web Frontend\n[B] Backend / API\n[C] Hardware / IoT\n[D] AI / Data Processing\n[E] Custom";
    } else if (flow === 'prompt') {
      initialMessage = "Prompt Architect initialized. What visual tone best fits your idea?\n\n[A] Cinematic Vintage\n[B] Retro Film-like\n[C] Neon Cyberpunk\n[D] Gritty Realism\n[E] Custom";
    } else if (flow === 'mail') {
      initialMessage = "Mail & Docs initialized. What are we drafting today?\n\n[A] Formal Business Email\n[B] Casual Team Update\n[C] Technical Documentation\n[D] Cover Letter\n[E] Custom";
    }

    setMessages([{ role: 'assistant', content: initialMessage }]);
  };

  // Helper: Generate File Blob & Name
  const getExportFileDetails = () => {
    const messagesToExport = chatToShare ? chatToShare.messages : messages;
    const content = messagesToExport.map(m => m.content).join('\n\n');
    let blob, fileName;

    if (shareFormat === 'pdf') {
      const doc = new jsPDF();
      doc.text(content, 10, 10);
      blob = doc.output('blob');
      fileName = 'Lisa-Export.pdf';
    } else if (shareFormat === 'docx') {
      const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body>${content.replace(/\n/g, '<br>')}</body></html>`;
      blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      fileName = 'Lisa-Export.doc';
    } else {
      blob = new Blob([content], { type: 'text/plain' });
      fileName = 'Lisa-Export.txt';
    }
    return { blob, fileName };
  };

  // Action: Trigger Direct Download
  const triggerDownload = () => {
    const { blob, fileName } = getExportFileDetails();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setShowShareModal(false);
    setTimeout(() => setChatToShare(null), 300);
  };

  // Action: Trigger Native OS Share
  const triggerShare = async () => {
    const { blob, fileName } = getExportFileDetails();
    const file = new File([blob], fileName, { type: blob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Lisa PRO Document',
          text: 'Here is my exported document.'
        });
      } catch (err) {
        console.error("User cancelled or share failed.", err);
      }
    } else {
      alert("Direct file sharing is not supported on this browser. Downloading instead.");
      triggerDownload();
    }
  };

  const handleSend = async (text, isRefiner = false) => {
    let finalMessage = text;
    if (fileContent && !isRefiner) {
      finalMessage += `\n\n[ATTACHED DOCUMENT CONTENT]:\n${fileContent}`;
    }

    if (!finalMessage.trim()) return;

    if (!isRefiner) {
      setInput('');
      setAttachedFile(null);
      setFileContent('');
    }

    let newMessages;
    
    if (isRefiner && editPromptTarget !== null) {
      newMessages = [
        ...messages, 
        { role: 'user', content: `Refine the previous response. Instruction: ${finalMessage}` }
      ];
    } else {
      newMessages = [...messages, { role: 'user', content: finalMessage }];
    }
    
    setMessages(newMessages);
    setIsLoading(true);
    setEditPromptTarget(null);

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    let finalMessages = [...newMessages];
    if (isProMode && proModifier !== 'Standard') {
      let sysContent = "";
      if (proModifier === "Visual Director") sysContent = "Generates highly detailed cinematic and ultra-realistic visual prompts.";
      else if (proModifier === "Hardware Copilot") sysContent = "Answers strictly with C++ code, component pin-mapping, and IoT flowchart logic.";
      else if (proModifier === "Academic Simplifier") sysContent = "Explains topics using extreme simplicity, breaking down engineering concepts into easy one-line points.";
      
      finalMessages.unshift({
        role: "system",
        content: sysContent
      });
    }

    try {
      await generateLisaResponseStream(
        finalMessages,
        (chunkText) => {
          setIsLoading(false);
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: updated[lastIndex].content + chunkText
            };
            return updated;
          });
        },
        activeFlow
      );
    } catch (error) {
      console.error("Chat Error:", error);
      
      // 1. Remove the AI's loading bubble completely
      setMessages(prev => prev.slice(0, -1));
      
      // 2. Show a professional toast notification
      const errorMsg = error.message.includes("API key") 
        ? "System offline: API key missing or invalid. Please check configuration." 
        : "Connection unstable. Please try again later.";
        
      showToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = () => {
    const masterPrompt = activeTemplate.generatePrompt(formData);
    setActiveTemplate(null);
    setFormData({}); 
    handleSend(masterPrompt);
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const openTemplate = (template) => {
    const initialData = {};
    template.fields.forEach(field => {
      if (field.type === 'select') initialData[field.id] = field.options[0];
      else initialData[field.id] = '';
    });
    setFormData(initialData);
    setActiveTemplate(template);
  };

  const triggerRefiner = () => {
    setEditPromptTarget(messages.length - 1);
  };

  const filteredHistory = history.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const pinnedItems = filteredHistory.filter(item => item.isPinned);
  
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  const todayItems = filteredHistory.filter(item => !item.isPinned && (now - item.id) < ONE_DAY);
  const previous7DaysItems = filteredHistory.filter(item => !item.isPinned && (now - item.id) >= ONE_DAY && (now - item.id) < 7 * ONE_DAY);
  const olderItems = filteredHistory.filter(item => !item.isPinned && (now - item.id) >= 7 * ONE_DAY);

  const renderHistoryItem = (item) => (
    <div 
      key={item.id} 
      className="relative rounded-xl px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer group flex items-center justify-between mb-1"
    >
      <div onClick={() => loadHistoryItem(item)} className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate pr-2">{item.title}</p>
      </div>
      
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Don't trigger chat load
            setChatToShare(item);
            setShareFormat('text'); // Default format for history
            setShowShareModal(true);
          }}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors"
        >
          <Share2 size={14} className="text-gray-500 dark:text-gray-400" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }}
          className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {activeMenuId === item.id && (
        <div className="absolute top-10 right-2 w-32 bg-white/60 dark:bg-black/50 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-lg rounded-xl overflow-hidden z-50 animate-fade-in">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isPinned: !h.isPinned } : h)); 
              setActiveMenuId(null); 
            }} 
            className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 transition-colors"
          >
            <Pin size={12} /><span>{item.isPinned ? "Unpin" : "Pin"}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); alert('Renamed!'); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 transition-colors">
            <Pencil size={12} /><span>Rename</span>
          </button>
          <button onClick={(e) => openShareModal(item, e)} className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 transition-colors">
            <Download size={12} /><span>Download</span>
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              setHistory(prev => prev.filter(h => h.id !== item.id));
              setActiveMenuId(null);
            }} 
            className="w-full text-left px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 flex items-center space-x-2 transition-colors"
          >
            <Trash2 size={12} /><span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <SignedOut>
        <div className="flex h-[100dvh] w-full items-center justify-center bg-[#f8f9fa] dark:bg-[#0a0a0a]">
          <SignIn routing="hash" appearance={{ elements: { formButtonPrimary: 'bg-lisaBlue hover:bg-blue-600 text-sm normal-case' } }} />
        </div>
      </SignedOut>
      
      <SignedIn>
        {showPreloader && <Preloader isProMode={isProMode} />}
        <div className={`relative h-[100dvh] w-full overflow-hidden transition-colors duration-700 ${isProMode ? 'bg-[#050B14] text-white' : 'bg-[#f8f9fa] dark:bg-[#0a0a0a] text-lisaBlack dark:text-white/90'}`}>
          {/* 1. AURORA LAYER (Fixed Bottom) */}
          {isProMode && (
            <div className="fixed inset-0 z-0 opacity-60 pointer-events-none mix-blend-screen overflow-hidden">
              <Aurora 
                colorStops={["#00D8FF", "#0A66C2", "#7CFF67"]} 
                blend={0.5} 
                amplitude={1.2} 
                speed={1.0} 
              />
            </div>
          )}
          
          {/* 2. APP CONTENT LAYER (Relative Top) */}
          <div className="relative z-10 flex flex-col h-full">
      
      {/* Toast Notification */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-xl border shadow-lg ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-md z-[90] transition-all"
          onClick={() => { setIsSidebarOpen(false); setActiveMenuId(null); }}
        />
      )}

      {/* Slide-out Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-80 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-2xl border-r border-gray-200 dark:border-white/10 z-[100] transform transition-transform duration-500 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex flex-col h-[75%] overflow-hidden">
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-gray-300 dark:focus:border-white/20 rounded-2xl outline-none text-sm text-gray-800 dark:text-white transition-all font-medium placeholder-gray-400"
              />
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-2 mt-2 hide-scrollbar">
              {filteredHistory.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 px-2 text-center mt-10">No results.</p>
              ) : (
                <>
                  {pinnedItems.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-[10px] font-bold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-2 px-2 flex items-center"><Pin size={10} className="mr-1"/> Pinned</h3>
                      {pinnedItems.map(item => renderHistoryItem(item))}
                    </div>
                  )}
                  {todayItems.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-[10px] font-bold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-2 px-2">Today</h3>
                      {todayItems.map(item => renderHistoryItem(item))}
                    </div>
                  )}
                  {previous7DaysItems.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-[10px] font-bold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-2 px-2">Previous 7 Days</h3>
                      {previous7DaysItems.map(item => renderHistoryItem(item))}
                    </div>
                  )}
                  {olderItems.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-[10px] font-bold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-2 px-2">Older</h3>
                      {olderItems.map(item => renderHistoryItem(item))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Bottom Actions */}
          <div className="flex items-center justify-between space-x-3 w-full mt-auto pb-4 pt-2">
            <button 
              onClick={handleNewSession}
              className="flex-1 h-12 rounded-full flex items-center justify-center space-x-2 text-sm font-bold transition-all duration-300 bg-black text-white dark:bg-white dark:text-black active:scale-95 shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
            >
              <Plus size={16} />
              <span>Prompt</span>
            </button>
            <button 
              onClick={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }}
              className="w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] active:scale-95 text-lisaBlack dark:text-white"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full relative h-full">
        
        {/* Floating Top Pills */}
        <div className="fixed top-6 left-0 right-0 z-50 pointer-events-none flex justify-between items-center w-full px-4 py-3">
          {/* Top Left: Menu and Logo */}
          <div className="flex space-x-3 pointer-events-auto">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="rounded-full px-4 py-2 bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] active:scale-95 transition-all duration-300 text-lisaBlack dark:text-white/90 flex items-center justify-center"
            >
              <Menu size={18} />
            </button>
            <div 
              onClick={() => {
                if (!isProMode && (!instaClicked || !linkedInClicked)) {
                  setShowProUnlock(true);
                } else {
                  setIsProMode(!isProMode);
                }
              }}
              className="flex items-center gap-2 cursor-pointer select-none group"
            >
              <Brain className={`w-6 h-6 transition-colors ${isProMode ? 'text-cyan-400' : 'text-gray-800 dark:text-white'}`} />
              <span className="font-bold text-lg">
                <span className={isProMode ? 'text-white' : 'text-gray-900 dark:text-white'}>Lisa</span>
                {isProMode && <span className="text-cyan-400 ml-1 font-extrabold tracking-wide">PRO</span>}
              </span>
            </div>
          </div>
          
          {/* Top Right: Vault Icon */}
          <div className="pointer-events-auto flex items-center">
            {isProMode && (
              <button 
                onClick={() => setIsVaultOpen(true)}
                className="p-2 rounded-full transition-all duration-300 bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-cyan-500 dark:hover:text-cyan-400 mr-2"
                title="Open Prompt Vault"
              >
                <Bookmark size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Center Area */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center w-full max-w-2xl mx-auto h-full mt-20">
            
            {!activeTemplate ? (
              <div className="flex flex-col items-center justify-center h-full w-full max-w-2xl mx-auto p-6 animate-in fade-in zoom-in duration-700 mt-20">
                <h1 className={`text-4xl font-bold tracking-tight mb-3 text-center ${isProMode ? 'text-white drop-shadow-md' : 'text-gray-800 dark:text-white'}`}>
                  Hello, {user?.firstName || 'there'}.
                </h1>
                <p className={`text-lg text-center font-medium ${isProMode ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                  {isProMode ? 'How can I assist you with your projects today?' : 'How can I help you today?'}
                </p>
              </div>
            ) : (
              /* Template Form */
              <div className="w-full bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] p-8 rounded-3xl text-left transition-all duration-300">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{activeTemplate.title}</h3>
                
                <div className="space-y-5">
                  {activeTemplate.fields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{field.label}</label>
                      {field.type === 'text' ? (
                        <input 
                          type="text" 
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:bg-white/80 dark:focus:bg-black/80 focus:border-white/50 dark:focus:border-white/20 shadow-inner rounded-xl outline-none transition-all text-gray-800 dark:text-white backdrop-blur-sm"
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        />
                      ) : (
                        <select 
                          className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:bg-white/80 dark:focus:bg-black/80 focus:border-white/50 dark:focus:border-white/20 shadow-inner rounded-xl outline-none transition-all text-gray-800 dark:text-white backdrop-blur-sm"
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        >
                          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      )}
                    </div>
                  ))}

                  <div className="pt-4">
                    <button onClick={handleFormSubmit} className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] active:scale-95 transition-all duration-300">
                      Craft Prompt
                    </button>
                    <button onClick={() => setActiveTemplate(null)} className="w-full py-3 mt-2 text-gray-500 dark:text-gray-400 font-semibold hover:text-gray-800 dark:hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div 
            className="flex-1 w-full overflow-y-auto pt-24 pb-48 relative flex flex-col items-center"
            style={{ maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)' }}
          >
            <ResponseContainer 
              messages={messages} 
              isLoading={isLoading} 
              triggerRefiner={triggerRefiner}
              editPromptTarget={editPromptTarget}
              handleSend={handleSend}
              handleSavePrompt={handleSavePrompt}
              setInput={setInput}
              chatInputRef={chatInputRef}
              activeFlow={activeFlow}
              setShowShareModal={setShowShareModal}
            />
          </div>
        )}

        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 w-[90%] max-w-3xl z-50 pointer-events-none flex justify-center transition-opacity duration-300 ${isSidebarOpen ? 'opacity-0' : 'opacity-100'}`}>
          <div className="pointer-events-auto w-full flex flex-col items-center">
            {editPromptTarget ? (
              <div className="w-full bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-2xl p-2 rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl flex items-center animate-water-pulse transition-all duration-300 ease-in-out text-lisaBlack dark:text-white">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="What changes do you want? (e.g. 'Make it shorter')" 
                  className="flex-1 bg-transparent px-6 py-4 outline-none placeholder-gray-500 dark:placeholder-white/50 text-gray-800 dark:text-white/90"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend(e.target.value, true);
                  }}
                />
                <button 
                  onClick={(e) => handleSend(e.currentTarget.previousSibling.value, true)}
                  className="p-3 bg-lisaBlue text-white rounded-full shadow-md hover:bg-blue-600 transition-colors"
                >
                  Apply
                </button>
                <button 
                  onClick={() => setEditPromptTarget(null)}
                  className="p-3 ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-300 ease-out"
                >
                  Cancel
                </button>
              </div>
            ) : (
              (!activeTemplate && messages.length === 0) || messages.length > 0 ? (
                <div className="w-full max-w-4xl mx-auto px-4 pb-6 relative z-20 flex flex-col justify-end">
                  
                  {/* Floating Attached File Indicator */}
                  {attachedFile && (
                    <div className="self-start mb-2 bg-white/10 dark:bg-black/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs shadow-sm animate-in slide-in-from-bottom-2">
                      <FileText size={14} className={isProMode ? "text-cyan-400" : "text-gray-600"} />
                      <span className={`truncate max-w-[150px] font-medium ${isProMode ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {attachedFile.name}
                      </span>
                      <button onClick={() => setAttachedFile(null)} className="hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Command Menu Overlay */}
                  {showCommandMenu && (
                    <div className="absolute bottom-[4.5rem] left-4 bg-[#1a1a1a] border border-white/10 rounded-xl p-2 shadow-2xl z-50 animate-in slide-in-from-bottom-2 fade-in">
                      {['prompt', 'code', 'mail'].map(cmd => (
                        <button 
                          key={cmd}
                          onClick={() => {
                            startGuidedFlow(cmd);
                            setShowCommandMenu(false);
                            setInput('');
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-gray-300 transition-colors"
                        >
                          /{cmd}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`relative flex items-end w-full transition-all duration-500 overflow-hidden ${
                      isProMode 
                        ? 'bg-white/10 dark:bg-black/20 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-full p-2 hover:bg-white/20' 
                        : 'bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-3xl p-2 shadow-sm'
                    }`}
                  >
                    
                    {/* LEFT: File Upload (+ Button) */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".txt,.pdf,.doc,.docx,.c,.cpp,.ino,.py,.js,.json" 
                      onChange={handleFileChange} 
                    />
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className={`p-3 rounded-full flex-shrink-0 transition-colors ${isProMode ? 'text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                      <Plus size={22} />
                    </button>

                    {/* CENTER: Text Input */}
                    <textarea
                      ref={chatInputRef}
                      value={input}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInput(val);
                        if (val === '/') setShowCommandMenu(true);
                        else if (val.length === 0 || !val.startsWith('/')) setShowCommandMenu(false);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); setAttachedFile(null); } }}
                      placeholder={isProMode ? "Ask Lisa Pro..." : "Message Lisa..."}
                      className={`w-full max-h-32 bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-3 px-2 mx-1 overflow-y-auto min-h-[44px] ${
                        isProMode ? 'text-white placeholder:text-white/50' : 'text-gray-900 dark:text-white placeholder:text-gray-400'
                      }`}
                      rows={1}
                    />

                    {/* RIGHT: Controls Hub */}
                    <div className="flex items-center gap-1 pl-2 pr-1 pb-1">
                      
                      

                      {/* Mic Button */}
                      <button 
                        onClick={handleMicClick}
                        className={`p-2.5 rounded-full transition-colors ${
                          isRecording 
                            ? 'text-red-500 bg-red-500/20 animate-pulse' 
                            : (isProMode ? 'text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800')
                        }`}
                      >
                        <Mic size={20} />
                      </button>

                      {/* Transparent Send Button */}
                      <button 
                        onClick={() => { handleSend(input); setAttachedFile(null); }}
                        disabled={!input.trim() && !attachedFile}
                        className={`p-2.5 rounded-full transition-all flex-shrink-0 disabled:opacity-40 disabled:scale-100 bg-transparent ${
                          isProMode 
                            ? 'text-white hover:text-cyan-400 hover:bg-white/10' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Send size={18} className={((input.trim() || attachedFile) && isProMode) ? "translate-x-0.5 text-cyan-300" : ""} />
                      </button>
                    </div>

                  </div>
                </div>
              ) : null
            )}
            <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500/80 font-medium tracking-wide text-center">Lisa is AI and can make mistakes.</p>
          </div>
        </div>

      </div>

      {/* Premium Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden animate-fade-in relative mx-4">
            <button onClick={() => { setIsSettingsOpen(false); setActiveSettingsTab('main'); }} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10 text-gray-500 dark:text-gray-400">
              <X size={20} />
            </button>
            <div className="p-6 overflow-y-auto max-h-[80vh] hide-scrollbar">
              
              {activeSettingsTab === 'main' && (
                <div className="space-y-4">
                  {/* Header (Profile) */}
                  <div className="flex items-center space-x-4 pb-6 border-b border-gray-200 dark:border-white/10">
                    <div className="relative">
                      {user?.imageUrl ? (
                        <img src={user.imageUrl} alt="Profile" className="w-16 h-16 rounded-full shadow-lg object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-lisaBlue to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                          {user?.fullName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <button onClick={() => showToast("Profile image syncs with Clerk Dashboard", "success")} className="absolute bottom-0 right-0 p-1.5 bg-black dark:bg-white text-white dark:text-black rounded-full border-2 border-white dark:border-[#121212] hover:scale-110 transition-transform">
                        <Pencil size={10} />
                      </button>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.fullName || 'User'}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user?.primaryEmailAddress?.emailAddress || 'No Email provided'}</p>
                    </div>
                  </div>

                  {/* Account Section */}
                  <div className="py-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Account</h3>
                      <div className="flex items-center space-x-2">
                        {isProMode ? (
                          <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-600 rounded-lg text-xs font-bold">Pro</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold">Standard</span>
                        )}
                      </div>
                    </div>
                    {!isProMode && (
                      <button onClick={() => { setShowProUnlock(true); setIsSettingsOpen(false); setActiveSettingsTab('main'); }} className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all">
                        Try Pro
                      </button>
                    )}
                  </div>

                  {/* Personalization Section */}
                  <div className="py-6 border-b border-gray-200 dark:border-white/10 space-y-5">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Personalization</h3>
                    <div className="flex items-center justify-between cursor-pointer group" onClick={() => setMemoryEnabled(!memoryEnabled)}>
                      <div className="flex items-center space-x-3">
                        <Brain size={18} className="text-gray-400 group-hover:text-lisaBlue transition-colors" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Memory</span>
                      </div>
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${memoryEnabled ? colors[accentColor] : 'bg-gray-200 dark:bg-white/10'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${memoryEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>
                    {isProMode && (
                      <div className="flex items-center justify-between cursor-pointer group" onClick={() => setActiveSettingsTab('customize')}>
                        <div className="flex items-center space-x-3">
                          <Crown size={18} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Customize {getAppBranding()}</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </div>

                  {/* Theme Section */}
                  <div className="py-6 border-b border-gray-200 dark:border-white/10 space-y-5">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Theme</h3>
                    <div className="flex items-center justify-between cursor-pointer group" onClick={() => { setIsDark(!isDark); showToast("Theme updated", "success"); }}>
                      <div className="flex items-center space-x-3">
                        {isDark ? <Moon size={18} className="text-gray-400 group-hover:text-lisaBlue transition-colors" /> : <Sun size={18} className="text-gray-400 group-hover:text-lisaBlue transition-colors" />}
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Appearance</span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-md">{isDark ? "Dark" : "Light"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Settings size={18} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Accent Color</span>
                      </div>
                      <div className="flex space-x-2">
                        {Object.entries(colors).map(([key, colorValue]) => (
                          <button 
                            key={key} 
                            onClick={() => setAccentColor(key)}
                            className={`w-5 h-5 rounded-full ${colorValue} border-2 ${accentColor === key ? 'border-gray-800 dark:border-white shadow-md transform scale-110' : 'border-transparent'}`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Support & About Section */}
                  <div className="py-6 border-b border-gray-200 dark:border-white/10 space-y-5">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">About</h3>
                    {[
                      { name: 'Help Center', action: () => { setIsSettingsOpen(false); setActiveSettingsTab('main'); setActiveDocument('help'); } }, 
                      { name: 'Terms of Use', action: () => { setIsSettingsOpen(false); setActiveSettingsTab('main'); setActiveDocument('terms'); } }, 
                      { name: 'Privacy Policy', action: () => { setIsSettingsOpen(false); setActiveSettingsTab('main'); setActiveDocument('privacy'); } }
                    ].map(link => (
                      <button key={link.name} onClick={link.action} className="w-full flex items-center justify-between cursor-pointer group transition-colors text-sm font-medium text-gray-800 dark:text-gray-200 hover:opacity-70">
                        <span>{link.name}</span>
                        <ChevronRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                      </button>
                    ))}
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                      <span>Version</span>
                      <span>1.0.0-beta</span>
                    </div>
                  </div>

                  {/* Footer Section */}
                  <div className="pt-6 pb-2 text-center">
                    <SignOutButton>
                      <button className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors px-6 py-2 rounded-full hover:bg-red-500/10">
                        Log Out
                      </button>
                    </SignOutButton>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'customize' && (
                <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                  {/* Header with Back Button */}
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                    <button 
                      onClick={() => setActiveSettingsTab('main')}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Customize Lisa Pro</h2>
                  </div>



                  {/* About User (Generic Placeholders) */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">How should I address you?</label>
                    <input 
                      type="text" 
                      value={customName} 
                      onChange={(e) => setCustomName(e.target.value)} 
                      placeholder="e.g. Alex" 
                      className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-cyan-500 transition-colors" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">What are your primary interests/goals?</label>
                    <textarea 
                      value={customContext} 
                      onChange={(e) => setCustomContext(e.target.value)} 
                      placeholder="e.g. I am a software engineer focused on building React applications..." 
                      className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-cyan-500 resize-none h-20 transition-colors" 
                    />
                  </div>

                  {/* AI Behavior */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">AI Behavior Modifier</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['Standard', 'Visual Director', 'Hardware Copilot', 'Academic Simplifier'].map(mode => (
                        <label key={mode} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5 cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors border border-transparent hover:border-cyan-500/30">
                          <input 
                            type="radio" 
                            name="proModifier" 
                            checked={proModifier === mode} 
                            onChange={() => setProModifier(mode)} 
                            className="accent-cyan-500 w-4 h-4" 
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{mode}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Unified Document Modal */}
      {activeDocument && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden animate-fade-in relative mx-4">
            <button onClick={() => setActiveDocument(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10 text-gray-500 dark:text-gray-400">
              <X size={20} />
            </button>
            <div className="p-6">
              <div className="pb-4 border-b border-gray-200 dark:border-white/10 flex items-center space-x-3">
                <Brain size={24} className="text-lisaBlue" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {activeDocument === 'help' && `${getAppBranding()} Help Center`}
                  {activeDocument === 'terms' && "Terms of Use"}
                  {activeDocument === 'privacy' && "Privacy Policy"}
                </h2>
              </div>
              <div className="py-6 space-y-4 text-sm text-gray-600 dark:text-gray-300">
                {activeDocument === 'help' && (
                  <p>Welcome to {getAppBranding()} support. For assistance with AI models, API keys, or billing, please contact <strong>support@lisapro.ai</strong>.</p>
                )}
                {activeDocument === 'terms' && (
                  <p>By using {getAppBranding()}, you agree to our standard terms. You are responsible for the API keys provided. Abuse of the service will result in account termination.</p>
                )}
                {activeDocument === 'privacy' && (
                  <>
                    <p><strong>Your data is stored securely.</strong> {getAppBranding()} respects your privacy and uses end-to-end encryption for API keys. We do not train models on your personal inputs.</p>
                    <p>When using third-party providers (OpenAI, Anthropic, Google), your prompts are subject to their respective privacy policies.</p>
                    <p>All local history is stored directly on your device via `localStorage` and is never synced to external servers without explicit consent.</p>
                  </>
                )}
              </div>
              <div className="pt-4 flex justify-end">
                <button 
                  onClick={() => setActiveDocument(null)}
                  className={`px-6 py-2 rounded-full text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all ${colors[accentColor]}`}
                >
                  I Understand
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden animate-fade-in relative mx-4">
            <button onClick={() => setShareModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10 text-gray-500 dark:text-gray-400">
              <X size={20} />
            </button>
            <div className="p-6">
              <div className="pb-4 border-b border-gray-200 dark:border-white/10 flex items-center space-x-3">
                <Share size={24} className="text-lisaBlue" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">Share Chat: {chatToShare?.title}</h2>
              </div>
              
              <div className="py-6 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Export as Document</h3>
                  <div className="flex space-x-2">
                    <button onClick={() => { exportUtils.txt(chatToShare); showToast("Exported as .TXT", "success"); }} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white font-bold text-xs hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95 shadow-sm">
                      .TXT
                    </button>
                    <button onClick={() => { exportUtils.pdf(chatToShare); showToast("Exported as .PDF", "success"); }} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white font-bold text-xs hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95 shadow-sm">
                      .PDF
                    </button>
                    <button onClick={async () => { await exportUtils.docx(chatToShare); showToast("Exported as .DOCX", "success"); }} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white font-bold text-xs hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95 shadow-sm">
                      .DOCX
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Invite to Collaborate</h3>
                  <div className="flex items-center space-x-2 bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/10">
                    <input 
                      type="text" 
                      readOnly 
                      value={`https://lisapro.ai/chat/${chatToShare?.id}`}
                      className="flex-1 bg-transparent px-3 py-2 text-xs text-gray-600 dark:text-gray-300 outline-none truncate"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://lisapro.ai/chat/${chatToShare?.id}`);
                        showToast("Link copied! (Live collaboration requires backend)", "success");
                      }}
                      className={`px-4 py-2 rounded-lg text-white font-bold text-xs shadow-md active:scale-95 transition-all ${colors[accentColor]}`}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isVaultOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <Bookmark className="text-cyan-500 w-5 h-5" />
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Prompt Vault</h2>
                <span className="bg-cyan-500/10 text-cyan-500 text-xs px-2 py-0.5 rounded-full ml-2">{savedPrompts.length} Saved</span>
              </div>
              <button onClick={() => setIsVaultOpen(false)} className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-gray-50 dark:bg-black/20">
              {savedPrompts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p>Your vault is empty.</p>
                  <p className="text-sm mt-1">Save your favorite prompts to access them here.</p>
                </div>
              ) : (
                savedPrompts.map((prompt, index) => (
                  <div key={index} className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:border-cyan-500/30 transition-colors">
                    <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-3 font-mono text-left whitespace-pre-wrap">{prompt.text}</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{new Date(prompt.date).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setInput(prompt.text);
                            setIsVaultOpen(false);
                          }} 
                          className="px-3 py-1.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs rounded-md hover:bg-cyan-500/20 transition-colors font-medium"
                        >
                          Use Prompt
                        </button>
                        <button 
                          onClick={() => handleDeletePrompt(index)} 
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

            </div>
        {/* Export & Share Modal (AI Message) */}
        {showShareModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#111111]/90 border border-white/10 backdrop-blur-2xl p-6 rounded-3xl w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <h3 className="text-white font-semibold text-lg mb-6 tracking-tight">Export & Share</h3>
              
              {/* Format Selection Pills */}
              <div className="flex justify-center gap-2 mb-6">
                {['Text', 'Docx', 'PDF'].map((fmt) => (
                  <button 
                    key={fmt}
                    onClick={() => setShareFormat(fmt.toLowerCase())}
                    className={`px-6 py-2 rounded-full text-xs font-semibold transition-all ${shareFormat === fmt.toLowerCase() ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              {/* Primary Download Button */}
              <button 
                onClick={triggerDownload}
                className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg shadow-cyan-500/30"
              >
                <Download size={18} />
                Download {shareFormat.toUpperCase()}
              </button>

              {/* Native OS Share Section */}
              {/* Beautiful Flex Divider */}
              <div className="flex items-center gap-3 my-5 opacity-70">
                <div className="flex-1 border-t border-white/10"></div>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                  Or Share Via
                </span>
                <div className="flex-1 border-t border-white/10"></div>
              </div>
              <button 
                onClick={triggerShare}
                className="w-full flex justify-center items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-gray-300 hover:text-white"
              >
                <Share2 size={16} />
                <span className="text-sm font-medium">Open Share Menu</span>
              </button>
              
              <button onClick={() => { setShowShareModal(false); setTimeout(() => setChatToShare(null), 300); }} className="mt-6 w-full text-gray-500 text-sm hover:text-white transition-colors">Cancel</button>
            </div>
          </div>
        )}

      </SignedIn>
    </>
  );
}

export default App;