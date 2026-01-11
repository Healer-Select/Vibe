
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
    if (incomingMessage) {
        if (incomingMessage.type === 'chat' && incomingMessage.text) {
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
        } else if (incomingMessage.type === 'chat-clear') {
            // Partner cleared history
            setMessages([]);
        }
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
    setShowEmojis(false);
    
    // Trigger parent to encrypt and send
    onSendMessage(textToSend);
  };

  const addEmoji = (emoji: string) => {
      setInputText(prev => prev + emoji);
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
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <ShieldCheck size={10} className="text-emerald-500" />
                        <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold">E2E Encrypted</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                        <Clock size={10} className="text-rose-500" />
                        <span className="text-[9px] uppercase tracking-widest text-rose-500 font-bold">5m Delete</span>
                    </div>
                </div>
            </div>
        </div>
        
        <button 
            onClick={() => { if(confirm('Clear chat history for both?')) { setMessages([]); onDeleteHistory(); } }} 
            className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"
        >
            <Trash2 size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" onClick={() => setShowEmojis(false)}>
        {messages.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none px-6">
                <ShieldCheck size={64} className="text-zinc-600 mb-4" />
                <h3 className="text-zinc-400 font-semibold mb-2">Private & Secure</h3>
                <p className="text-zinc-500 text-sm text-center max-w-xs leading-relaxed">
                    Messages are encrypted on your device. Only you and {contact.name} can read them. 
                </p>
                <div className="mt-4 flex flex-col items-center gap-2">
                     <p className="text-rose-500/70 text-xs font-mono bg-rose-500/10 px-3 py-1 rounded-full">Chat history clears every 5 mins</p>
                     <p className="text-emerald-500/70 text-xs font-mono bg-emerald-500/10 px-3 py-1 rounded-full">No server storage</p>
                </div>
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

      <div className="p-4 bg-zinc-950 border-t border-white/5 relative z-20">
        {showEmojis && (
            <div className="absolute bottom-full left-4 mb-2 p-2 bg-zinc-900 border border-white/10 rounded-2xl grid grid-cols-6 gap-2 shadow-xl animate-in slide-in-from-bottom-2">
                {COMMON_EMOJIS.map(emoji => (
                    <button key={emoji} onClick={() => addEmoji(emoji)} className="p-2 hover:bg-white/10 rounded-lg text-xl transition-colors">
                        {emoji}
                    </button>
                ))}
            </div>
        )}

        <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowEmojis(!showEmojis)}
                className={`p-3 rounded-full transition-colors ${showEmojis ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
                <Smile size={24} />
            </button>
            
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
