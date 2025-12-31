import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import Message from './Message';

interface ChatHistoryProps {
  messages: ChatMessage[];
  currentAiResponse: string;
  liveTranscript: string;
  onCorrectTranscript: (transcript: string) => void;
  onReplayAudio: (text: string) => void;
}

const CorrectIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a.5.5 0 0 0 0 .707l3.005 3.006a.5.5 0 0 0 .707 0L19.513 8.2Z" />
    </svg>
);


const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, currentAiResponse, liveTranscript, onCorrectTranscript, onReplayAudio }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentAiResponse, liveTranscript]);

  const lastMessage = messages[messages.length - 1];
  const isDuplicateResponse = lastMessage && 
    lastMessage.role === 'model' && 
    currentAiResponse && 
    lastMessage.parts[0]?.text === currentAiResponse;

  return (
    <div ref={scrollRef} className="flex-grow p-4 overflow-y-auto bg-white dark:bg-gray-900 transition-colors duration-300">
      {messages.map((msg, index) => (
        <Message key={index} message={msg} onReplayAudio={onReplayAudio}/>
      ))}
      {currentAiResponse && !isDuplicateResponse && (
        <Message message={{ role: 'model', parts: [{ text: currentAiResponse }] }} onReplayAudio={onReplayAudio}/>
      )}
      {liveTranscript && (
        <div className="flex justify-end mb-4 items-center group">
             <button 
                onClick={() => onCorrectTranscript(liveTranscript)}
                className="mr-2 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                title="Correct this text"
            >
                <CorrectIcon className="w-4 h-4" />
            </button>
            <div className="max-w-prose rounded-2xl px-4 py-3 whitespace-pre-wrap break-words bg-indigo-500 dark:bg-indigo-600 text-white dark:text-gray-100 rounded-br-none italic shadow">
                {liveTranscript}
            </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;