import React, { useRef, useEffect } from 'react';
import { AppStatus } from '../types';
import { StopIcon } from './Icons';

interface InputBarProps {
  text: string;
  onTextChange: (newText: string) => void;
  status: AppStatus;
  isVoiceSessionActive: boolean;
  onSendMessage: (message: string) => void;
  onToggleListening: () => void;
  onStopSpeaking: () => void;
}

const MicIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5a4 4 0 1 1 8 0v6a4 4 0 1 1-8 0V5ZM6 11a1 1 0 1 1 2 0v.035A6.006 6.006 0 0 0 12 17a6.006 6.006 0 0 0 4-5.965V11a1 1 0 1 1 2 0v.035a8.01 8.01 0 0 1-7 7.93V21h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.035A8.01 8.01 0 0 1 4 11.035V11a1 1 0 0 1 1 0Z" />
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
    </svg>
);

const InputBar: React.FC<InputBarProps> = ({ text, onTextChange, status, isVoiceSessionActive, onSendMessage, onToggleListening, onStopSpeaking }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      onTextChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-3 border-t border-gray-200 dark:border-gray-700 flex items-center space-x-3 flex-shrink-0 transition-colors duration-300">
      <button
        onClick={onStopSpeaking}
        className={`p-2 rounded-full transition-all duration-200 focus:outline-none ${
          status === AppStatus.SPEAKING
            ? 'bg-red-500 text-white animate-pulse shadow-lg'
            : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
        }`}
        disabled={status !== AppStatus.SPEAKING}
        aria-label="Mute the AI"
        title="Mute the AI"
      >
        <StopIcon className="w-6 h-6" />
      </button>
      <button
        onClick={onToggleListening}
        className={`p-2 rounded-full transition-all duration-200 focus:outline-none ${
          isVoiceSessionActive ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        }`}
        aria-label={isVoiceSessionActive ? 'Stop voice session' : 'Start voice session'}
        title={isVoiceSessionActive ? 'Stop voice session' : 'Start voice session'}
      >
        <MicIcon className="w-6 h-6" />
      </button>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message or use the mic... (Shift+Enter for new line)"
        disabled={isVoiceSessionActive}
        className="flex-grow px-4 py-2 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed resize-none overflow-hidden min-h-[44px] max-h-[120px] transition-all duration-200 border border-gray-300 dark:border-gray-600"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || isVoiceSessionActive}
        className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none transition-all duration-200 text-white shadow-md transform hover:scale-105 active:scale-95"
        aria-label="Send message"
        title="Send message"
      >
        <SendIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default InputBar;