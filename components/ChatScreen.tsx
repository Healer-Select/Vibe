
import React, { useState, useEffect, useRef } from 'react';
import { Contact, UserProfile, VibeSignal } from '../types';
import { ChevronLeft, Send, ShieldCheck, Trash2, Clock, Smile } from 'lucide-react';
import { decryptMessage } from '../constants';

interface Props {
  contact: Contact;
  user: UserProfile;
  onBack: () => void;
  onSendMessage: (text: string) => void;
  incomingMessage: VibeSignal | null;
  onDeleteHistory: () => void;
}

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

const COMMON_EMOJIS = ['❤️', '😘', '🥺', '🫂', '✨', '🔥', '💖', '🥰', '🌙', '🏠', '🔐', '🌊'];

const ChatScreen: React.FC<Props> = ({ contact, user, onBack, onSendMessage, incomingMessage, onDeleteHistory }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        setMessages(prev => prev.filter(m => m.timestamp > fiveMinutesAgo));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (incomingMessage) {
        if (incomingMessage.category === 'chat') {
            if (incomingMessage.action === 'text' && incomingMessage.payload) {
                decryptMessage(incomingMessage.payload, user.pairCode, contact.pairCode).then(decryptedText => {
                    setMessages(prev => [...prev, {
                        id: incomingMessage.id,
                        senderId: incomingMessage.senderId,
                        text: decryptedText,
                        timestamp: incomingMessage.timestamp
                    }]);
                });
            } else if (incomingMessage.action === 'clear') {
                setMessages([]);
            }
        }
    }
  }, [incomingMessage, user.pairCode, contact.pairCode]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setMessages(prev => [...prev, {
        id: Date.now().toString(),
        senderId: user.pairCode,
        text: textToSend,
        timestamp: Date.now()
    }]);
    setInputText('');
    setShowEmojis(false);
    onSendMessage(textToSend);
  };

  const addEmoji = (emoji: string) => setInputText(prev => prev + emoji);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 animate-in slide-in-from-right duration-300">
      <header className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-950 z-10">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 active:scale-90 transition-transform"><ChevronLeft size={28} /></button>
            <div>
                <h1 className="text-lg font-outfit font-semibold text-white">{contact.name}</h1>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold">E2E Encrypted</span>
                    <span className="text-[9px] uppercase tracking-widest text-rose-500 font-bold">5m Delete</span>
                </div>
            </div>
        </div>
        <button onClick={() => { if(confirm('Clear?')) { setMessages([]); onDeleteHistory(); } }} className="p-2 text-zinc-600 hover:text-rose-500"><Trash2 size={18} /></button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" onClick={() => setShowEmojis(false)}>
        {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === user.pairCode ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${msg.senderId === user.pairCode ? 'bg-rose-600 text-white rounded-br-none' : 'bg-zinc-800 text-zinc-200 rounded-bl-none'}`}>
                    {msg.text}
                </div>
            </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-zinc-950 border-t border-white/5 relative z-20">
        {showEmojis && (
            <div className="absolute bottom-full left-4 mb-2 p-2 bg-zinc-900 border border-white/10 rounded-2xl grid grid-cols-6 gap-2 shadow-xl">
                {COMMON_EMOJIS.map(e => <button key={e} onClick={() => addEmoji(e)} className="p-2 text-xl">{e}</button>)}
            </div>
        )}
        <div className="flex items-center gap-3">
            <button onClick={() => setShowEmojis(!showEmojis)} className="p-3 text-zinc-500"><Smile size={24} /></button>
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="flex-1 bg-zinc-900 border-none rounded-full py-3 px-5 text-white" placeholder="Secret message..." />
            <button onClick={handleSend} disabled={!inputText.trim()} className="bg-rose-600 text-white p-3 rounded-full"><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
