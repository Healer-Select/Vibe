
import React, { useEffect, useRef, useState } from 'react';
import { Contact, UserProfile, ChatMessage } from '../types';
import { Send, Trash2, Smile, X, MessageCircle, Sparkles } from 'lucide-react';

interface Props {
  contact: Contact;
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClear: () => void;
}

const COMMON_EMOJIS = ['❤️', '😘', '🥺', '🫂', '✨', '🔥', '💖', '🥰', '🌙', '🏠', '🔐', '🌊'];

const ChatDrawer: React.FC<Props> = ({ contact, user, isOpen, onClose, messages, onSendMessage, onClear }) => {
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100); // Slight delay to ensure transition doesn't interfere with focus on mobile
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setShowEmojis(false);
    inputRef.current?.focus(); // Keep focus after sending
  };

  const addEmoji = (emoji: string) => setInputText(prev => prev + emoji);

  return (
    <>
        {/* Backdrop */}
        <div 
            className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[100] transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />

        {/* Drawer */}
        <div className={`fixed top-0 bottom-0 right-0 w-[90%] max-w-md bg-zinc-950/95 border-l border-white/5 z-[110] shadow-2xl transform transition-transform duration-500 cubic-bezier(0.2, 0.8, 0.2, 1) flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 pt-12 border-b border-white/5 bg-gradient-to-b from-zinc-900/50 to-transparent backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${contact.color} flex items-center justify-center text-sm font-bold shadow-lg shadow-white/5`}>
                        {contact.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white tracking-wide">{contact.name}</h2>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium flex items-center gap-1">
                           <Sparkles size={10} className="text-emerald-400" /> Encrypted
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => { if(confirm('Clear history?')) onClear(); }} className="p-3 text-zinc-500 hover:text-rose-400 rounded-full hover:bg-white/5 transition-colors">
                        <Trash2 size={18} />
                    </button>
                    <button onClick={onClose} className="p-3 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                        <X size={22} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" onClick={() => setShowEmojis(false)}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-4 opacity-60">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                             <MessageCircle size={32} strokeWidth={1} />
                        </div>
                        <p className="text-xs tracking-widest uppercase">Our shared silence</p>
                    </div>
                )}
                
                {messages.map((msg, index) => {
                    // System Message (Invites)
                    if (msg.type === 'system') {
                        return (
                            <div key={msg.id} className="flex justify-center py-4">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold bg-white/5 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                                    {msg.text}
                                </span>
                            </div>
                        );
                    }

                    // Whispers (Touch Echoes)
                    if (msg.type === 'whisper') {
                        return (
                            <div key={msg.id} className="flex justify-center py-2 animate-in fade-in zoom-in duration-700">
                                <span className="text-xs italic text-zinc-500/60 font-medium px-4">
                                    ~ {msg.text} ~
                                </span>
                            </div>
                        );
                    }

                    // User Messages
                    const isMe = msg.senderId === user.pairCode;
                    const showAvatar = !isMe && (index === 0 || messages[index-1].senderId !== msg.senderId);

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                            <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                                isMe 
                                ? 'bg-zinc-800/80 text-white rounded-br-sm border border-white/5' 
                                : 'bg-zinc-900/60 text-zinc-200 rounded-bl-sm border border-white/10'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-zinc-950/80 border-t border-white/5 backdrop-blur-lg pb-8">
                {showEmojis && (
                    <div className="absolute bottom-24 left-4 right-4 p-4 bg-zinc-900/95 border border-white/10 rounded-3xl grid grid-cols-6 gap-2 shadow-2xl z-20 animate-in slide-in-from-bottom-2 fade-in">
                        {COMMON_EMOJIS.map(e => <button key={e} onClick={() => addEmoji(e)} className="p-3 text-2xl hover:bg-white/10 rounded-xl transition-colors">{e}</button>)}
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowEmojis(!showEmojis)} className={`p-3 rounded-full transition-colors ${showEmojis ? 'text-amber-300 bg-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <Smile size={24} strokeWidth={1.5} />
                    </button>
                    <div className="flex-1 relative">
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={inputText} 
                            onChange={(e) => setInputText(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                            className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-5 pr-12 text-white focus:outline-none focus:border-zinc-700 focus:bg-white/10 transition-all placeholder-zinc-700 text-sm" 
                            placeholder="Whisper to them..." 
                        />
                        {inputText.trim() && (
                            <button onClick={handleSend} className="absolute right-1.5 top-1.5 p-2 bg-white text-black rounded-full hover:bg-zinc-200 transition-colors">
                                <Send size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};

export default ChatDrawer;
