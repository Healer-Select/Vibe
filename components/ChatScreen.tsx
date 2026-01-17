
import React, { useEffect, useRef, useState } from 'react';
import { Contact, UserProfile, ChatMessage } from '../types';
import { Send, Trash2, Smile, X, MessageCircle } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setShowEmojis(false);
  };

  const addEmoji = (emoji: string) => setInputText(prev => prev + emoji);

  // If closed, don't render heavy DOM, or just hide it
  return (
    <>
        {/* Backdrop */}
        <div 
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />

        {/* Drawer */}
        <div className={`fixed top-0 bottom-0 right-0 w-[85%] max-w-md bg-zinc-950 border-l border-white/10 z-[110] shadow-2xl transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${contact.color} flex items-center justify-center text-xs font-bold`}>
                        {contact.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">{contact.name}</h2>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Encrypted Chat</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { if(confirm('Clear history?')) onClear(); }} className="p-2 text-zinc-600 hover:text-rose-500 rounded-full hover:bg-white/5">
                        <Trash2 size={16} />
                    </button>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" onClick={() => setShowEmojis(false)}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-700 space-y-2 opacity-50">
                        <MessageCircle size={32} />
                        <p className="text-xs">No messages yet</p>
                    </div>
                )}
                
                {messages.map((msg) => {
                    if (msg.type === 'system') {
                        return (
                            <div key={msg.id} className="flex justify-center py-2">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
                                    {msg.text}
                                </span>
                            </div>
                        );
                    }

                    const isMe = msg.senderId === user.pairCode;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isMe ? 'bg-zinc-800 text-white rounded-br-none' : 'bg-zinc-900 text-zinc-300 rounded-bl-none border border-white/5'}`}>
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-zinc-900 border-t border-white/5">
                {showEmojis && (
                    <div className="absolute bottom-20 left-4 right-4 p-3 bg-zinc-800 border border-white/10 rounded-2xl grid grid-cols-6 gap-2 shadow-xl z-20">
                        {COMMON_EMOJIS.map(e => <button key={e} onClick={() => addEmoji(e)} className="p-2 text-xl hover:bg-white/5 rounded-lg transition-colors">{e}</button>)}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowEmojis(!showEmojis)} className={`p-3 rounded-full transition-colors ${showEmojis ? 'text-amber-400 bg-white/5' : 'text-zinc-500'}`}>
                        <Smile size={24} />
                    </button>
                    <input 
                        type="text" 
                        value={inputText} 
                        onChange={(e) => setInputText(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                        className="flex-1 bg-black/40 border border-white/10 rounded-full py-3 px-5 text-white focus:outline-none focus:border-zinc-500 placeholder-zinc-700" 
                        placeholder="Message..." 
                    />
                    <button onClick={handleSend} disabled={!inputText.trim()} className="bg-white text-black p-3 rounded-full disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500">
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    </>
  );
};

export default ChatDrawer;
