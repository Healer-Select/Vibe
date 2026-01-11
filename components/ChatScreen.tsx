
import React, { useState, useEffect, useRef } from 'react';
import { Contact, UserProfile, VibeSignal } from '../types';
import { ChevronLeft, Send, ShieldCheck, Trash2, Clock } from 'lucide-react';
import { decryptMessage } from '../constants';

interface Props {
  contact: Contact;
  user: UserProfile;
  onBack: () => void;
  onSendMessage: (text: string) => void;
  incomingMessage: VibeSignal | null;
}

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

const ChatScreen: React.FC<Props> = ({ contact, user, onBack, onSendMessage, incomingMessage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-delete timer (Run every 10 seconds to prune messages older than 5 mins)
  useEffect(() => {
    const interval = setInterval(() => {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        setMessages(prev => {
            const remaining = prev.filter(m => m.timestamp > fiveMinutesAgo);
            if (remaining.length !== prev.length) {
                return remaining;
            }
            return prev;
        });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Handle incoming encrypted messages
  useEffect(() => {
    if (incomingMessage && incomingMessage.type === 'chat' && incomingMessage.text) {
        // Decrypt the message
        decryptMessage(incomingMessage.text, user.pairCode, contact.pairCode).then(decryptedText => {
            const newMessage: ChatMessage = {
                id: incomingMessage.id,
                senderId: incomingMessage.senderId,
                text: decryptedText,
                timestamp: incomingMessage.timestamp
            };
            setMessages(prev => [...prev, newMessage]);
        });
    }
  }, [incomingMessage, user.pairCode, contact.pairCode]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    // Add locally immediately
    const textToSend = inputText.trim();
    const localMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: user.pairCode,
        text: textToSend,
        timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, localMessage]);
    setInputText('');
    
    // Trigger parent to encrypt and send
    onSendMessage(textToSend);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 animate-in slide-in-from-right duration-300">
      <header className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-950 z-10">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 active:scale-90 transition-transform">
            <ChevronLeft size={28} />
            </button>
            <div>
                <h1 className="text-lg font-outfit font-semibold text-white">{contact.name}</h1>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <ShieldCheck size={10} className="text-emerald-500" />
                        <span className="text-[9px] uppercase tracking-widest text-emerald-500/80 font-bold">Encrypted</span>
                    </div>
                    <span className="text-zinc-700 text-[9px]">•</span>
                    <div className="flex items-center gap-1">
                        <Clock size={10} className="text-rose-500" />
                        <span className="text-[9px] uppercase tracking-widest text-rose-500/80 font-bold">5m Auto-Delete</span>
                    </div>
                </div>
            </div>
        </div>
        
        <button 
            onClick={() => { if(confirm('Clear chat history?')) setMessages([]); }} 
            className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"
        >
            <Trash2 size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {messages.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none">
                <ShieldCheck size={64} className="text-zinc-600 mb-4" />
                <p className="text-zinc-500 text-sm text-center max-w-xs">Messages are encrypted and not stored on any server.</p>
                <p className="text-rose-500/70 text-xs mt-2 font-mono">History clears every 5 mins</p>
            </div>
        )}
        
        {messages.map((msg) => {
            const isMe = msg.senderId === user.pairCode;
            return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                        isMe 
                        ? 'bg-rose-600 text-white rounded-br-none' 
                        : 'bg-zinc-800 text-zinc-200 rounded-bl-none'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-zinc-950 border-t border-white/5">
        <div className="flex items-center gap-3">
            <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a secret message..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full py-3 px-5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all"
            />
            <button 
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="bg-rose-600 text-white p-3 rounded-full disabled:opacity-50 disabled:scale-90 active:scale-95 transition-all shadow-lg shadow-rose-900/20"
            >
                <Send size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
