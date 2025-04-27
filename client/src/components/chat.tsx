import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface ChatMessage {
  id: number | string;
  sessionId: number;
  userId: number;
  content: string;
  sentAt: Date;
  user?: {
    id: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface Participant {
  id: number;
  sessionId: number;
  userId: number;
  joinedAt: Date;
  user?: {
    id: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface User {
  id: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface ChatProps {
  messages: ChatMessage[];
  participants: Participant[];
  currentUser: User;
  onSendMessage: (message: string) => void;
}

export default function Chat({ messages, participants, currentUser, onSendMessage }: ChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
      setShowEmojis(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  // Get partner user for display
  const partner = participants.find(p => p.userId !== currentUser.id)?.user;

  // Format time for messages
  const formatMessageTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  return (
    <div className="flex-grow flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="relative">
            {partner ? (
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={partner.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.username}`} 
                  alt={partner.displayName || partner.username} 
                />
                <AvatarFallback>{partner.displayName?.[0] || partner.username[0]}</AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-8 w-8">
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
            )}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
          <div className="ml-2">
            <p className="text-sm font-medium">{partner ? (partner.displayName || partner.username) : 'Waiting for partner...'}</p>
            <p className="text-xs text-green-500">Online</p>
          </div>
        </div>
        <div>
          <button className="text-gray-500 hover:text-primary p-1">
            <i className="fas fa-video"></i>
          </button>
          <button className="text-gray-500 hover:text-primary p-1 ml-2">
            <i className="fas fa-phone"></i>
          </button>
        </div>
      </div>
      
      <ScrollArea className="flex-grow mb-4 h-[calc(100vh-300px)]" ref={scrollAreaRef}>
        <div className="flex flex-col" data-bind="messages">
          {messages.map((message, index) => {
            const isCurrentUser = message.userId === currentUser.id;
            const userName = message.user?.displayName || message.user?.username || 'Unknown';
            
            // Check if we need to show a day separator
            const showDateSeparator = index === 0 || (
              index > 0 && 
              new Date(messages[index-1].sentAt).toDateString() !== new Date(message.sentAt).toDateString()
            );
            
            // Check if we need to show a system message
            const isSystemMessage = typeof message.id === 'string' && message.id.startsWith('system-');
            
            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <div className="text-center text-xs text-gray-500 my-2">
                    {format(new Date(message.sentAt), 'MMMM d, yyyy')}
                  </div>
                )}
                
                {isSystemMessage ? (
                  <div className="text-center text-xs text-gray-500 my-4">
                    <span>{message.content}</span>
                  </div>
                ) : (
                  <div className={`message-bubble ${isCurrentUser ? 'right' : 'left'}`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs ${isCurrentUser ? 'text-white text-opacity-70' : 'text-gray-500'} mt-1`}>
                      {formatMessageTime(new Date(message.sentAt))}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          
          {messages.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <i className="fas fa-comments text-gray-400 text-2xl"></i>
              </div>
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <form onSubmit={handleSendMessage} className="relative">
        <Input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="w-full bg-gray-100 rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          ref={inputRef}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          <button 
            type="button"
            className="text-gray-500 hover:text-primary p-1 emoji-button"
            onClick={() => setShowEmojis(!showEmojis)}
          >
            <i className="far fa-smile"></i>
          </button>
          <Button 
            type="submit" 
            size="icon"
            className="bg-primary hover:bg-opacity-90 text-white p-2 rounded-full h-8 w-8"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </Button>
          
          {showEmojis && (
            <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-lg p-2 flex flex-wrap w-56">
              {['😊', '😂', '❤️', '👍', '🎉', '🍕', '🍿', '🎬', '🎵', '🎮', '🤔', '😍'].map((emoji) => (
                <button 
                  key={emoji}
                  type="button"
                  className="p-1 text-xl hover:bg-gray-100 rounded"
                  onClick={() => addEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
