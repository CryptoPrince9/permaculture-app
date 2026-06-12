"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Terminal } from 'lucide-react';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Project context initialized. I am your Permaculture Design Assistant. Paste coordinates, upload soil tests, or ask for specific site parameters!' }
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    const currentInput = input;
    setInput('');
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'system', 
        text: `Synthesized context: "${currentInput}". I have updated the localized permaculture parameters. The generated single-document report sections will now dynamically prioritize these strategies.` 
      }]);
    }, 1000);
  };

  return (
    <section className="glass-panel rounded-2xl border border-white/40 flex flex-col h-[450px] shadow-xl overflow-hidden">
      {/* Header / Display Screen Status */}
      <div className="p-4 border-b border-white/30 bg-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-accent rounded-full animate-ping"></div>
          <h2 className="text-sm font-bold text-primary font-mono tracking-tight flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-accent" />
            CORE WORKFLOW INTERFACE
          </h2>
        </div>
        <span className="text-[9px] font-mono font-bold tracking-wider text-primary border border-primary/20 bg-primary/5 px-2.5 py-0.5 rounded-full uppercase">
          Gemini Nano (Banana)
        </span>
      </div>
      
      {/* Messages Display Screen */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/5 backdrop-blur-md shadow-inner sovereign-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && (
              <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            
            <div className={`max-w-[78%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-br-none font-medium' 
                : 'bg-white text-gray-800 rounded-bl-none border border-slate-100'
            }`}>
              {msg.text}
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-accent text-white flex items-center justify-center shrink-0 shadow-md">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Styled Chat Box Input Panel */}
      <div className="p-4 border-t border-white/30 bg-white/50 backdrop-blur-md">
        <div className="relative flex items-center bg-white border border-gray-200 focus-within:border-accent rounded-xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-accent/20 overflow-hidden pr-1.5">
          <input 
            type="text" 
            placeholder="Type design question or upload coordinates..." 
            className="w-full bg-transparent px-4 py-3 text-xs outline-none text-gray-800 placeholder-gray-400 font-medium"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            className="bg-primary text-white p-2.5 rounded-lg font-bold hover:bg-opacity-95 transition-all shadow-md active:scale-95 flex items-center justify-center shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[9px] text-gray-400 text-center mt-2 font-mono">
          Context syncs locally via real-time Edge Ingestion Layer cache.
        </p>
      </div>
    </section>
  );
}
