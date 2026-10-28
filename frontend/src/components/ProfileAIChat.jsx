import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot, User, Loader2 } from 'lucide-react';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export default function ProfileAIChat({ profileData, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      generateInitialSuggestions();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateInitialSuggestions = async () => {
    setIsLoading(true);
    const systemPrompt = `You are an expert professional profile optimizer for SyncUp. 
    Analyze the provided profile data and provide 3 very short, bulleted suggestions.
    Keep your total response under 100 words. Be extremely concise.
    Profile Data Context: ${JSON.stringify(profileData)}`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Scan my profile and give 3 quick tips.' }
          ],
          temperature: 0.6,
          max_tokens: 512
        })
      });

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;
      // Ensure at least 2.5s of "Thinking/Searching" visibility
      await new Promise(resolve => setTimeout(resolve, 2500));
      setMessages([{ role: 'assistant', content: aiMessage }]);
    } catch (error) {
      console.error('AI Suggestion error:', error);
      setMessages([{ role: 'assistant', content: 'I apologize, but I encountered an error while analyzing your profile. How can I help you today?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `You are an AI assistant for SyncUp. Analyze this profile: ${JSON.stringify(profileData)}. Give very short, direct, bulleted answers. Max 100 words.` },
            ...messages,
            { role: 'user', content: userMessage }
          ],
          temperature: 0.6,
          max_tokens: 512
        })
      });

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;
      // Minimum delay for realistic feel
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const [loadingMsg, setLoadingMsg] = useState('Reading profile data...');

  useEffect(() => {
    let interval;
    if (isLoading) {
      const msgs = ['Reading profile data...', 'Thinking...', 'Searching professional patterns...', 'Formulating tips...'];
      let i = 0;
      setLoadingMsg(msgs[0]);
      interval = setInterval(() => {
        i++;
        if (i < msgs.length) {
          setLoadingMsg(msgs[i]);
        }
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-[400px] border-l border-[rgba(91,97,110,0.12)] bg-white shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(91,97,110,0.08)] bg-[#0a0b0d] p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#0052ff] p-2">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Profile AI Optimizer</h3>
              <p className="text-[10px] text-white/60">Powered by Groq • Llama 3</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8fafc]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-[#0052ff] text-white' : 'bg-[#0a0b0d] text-white'}`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-[#0052ff] text-white rounded-tr-none' 
                    : 'bg-white text-[#0a0b0d] border border-[rgba(91,97,110,0.08)] rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#0a0b0d] text-white">
                  <Bot size={14} />
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-[rgba(91,97,110,0.08)] flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin text-[#0052ff]" />
                  <span className="text-xs font-medium text-[#5b616e] animate-pulse">{loadingMsg}</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-[rgba(91,97,110,0.08)] p-4 bg-white">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask AI about your profile..."
              className="w-full rounded-full border border-[rgba(91,97,110,0.2)] bg-[#f8fafc] px-5 py-3 pr-12 text-sm outline-none focus:border-[#0052ff] focus:bg-white transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 rounded-full bg-[#0052ff] p-2 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-[#5b616e]">
            AI suggestions can vary. Review changes before applying.
          </p>
        </div>
      </div>
    </div>
  );
}
