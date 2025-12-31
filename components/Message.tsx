import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../types';
import { SpeakerIcon, CopyIcon, MarkdownIcon } from './Icons';

interface MessageProps {
  message: ChatMessage;
  onReplayAudio: (text: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, onReplayAudio }) => {
  const isModel = message.role === 'model';
  const messageContent = message.parts[0]?.text || '';
  const contentRef = useRef<HTMLDivElement>(null);
  const [copyFeedback, setCopyFeedback] = useState<'text' | 'md' | null>(null);

  const handleCopyRichText = () => {
    if (!contentRef.current) return;
    
    // We try to copy as HTML (Rich Text)
    const html = contentRef.current.innerHTML;
    const text = contentRef.current.innerText;
    
    const blobHtml = new Blob([html], { type: "text/html" });
    const blobText = new Blob([text], { type: "text/plain" });
    
    try {
        const data = [new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })];
        navigator.clipboard.write(data).then(() => {
            setCopyFeedback('text');
            setTimeout(() => setCopyFeedback(null), 2000);
        });
    } catch (e) {
        // Fallback for browsers without ClipboardItem support
        navigator.clipboard.writeText(text).then(() => {
            setCopyFeedback('text');
            setTimeout(() => setCopyFeedback(null), 2000);
        });
    }
  };

  const handleCopyMarkdown = () => {
      navigator.clipboard.writeText(messageContent).then(() => {
          setCopyFeedback('md');
          setTimeout(() => setCopyFeedback(null), 2000);
      });
  };

  return (
    <div className={`flex ${isModel ? 'justify-start' : 'justify-end'} mb-4 group`}>
      <div
        className={`relative max-w-prose rounded-2xl px-4 py-3 whitespace-pre-wrap break-words transition-colors duration-300 shadow-sm ${
          isModel
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none'
            : 'bg-indigo-600 text-white rounded-br-none shadow'
        }`}
      >
        <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {isModel && (
                <>
                {copyFeedback && (
                    <span className="text-xs font-bold text-green-600 dark:text-green-400 mr-1 bg-white/80 dark:bg-black/50 px-1.5 py-0.5 rounded">
                        Copied!
                    </span>
                )}
                <button 
                    onClick={handleCopyMarkdown}
                    className={`p-1.5 rounded-full ${copyFeedback === 'md' ? 'bg-green-100 text-green-600' : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/20'}`}
                    title="Copy as Markdown"
                >
                    <MarkdownIcon className="w-3.5 h-3.5" />
                </button>
                <button 
                    onClick={handleCopyRichText}
                    className={`p-1.5 rounded-full ${copyFeedback === 'text' ? 'bg-green-100 text-green-600' : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/20'}`}
                    title="Copy as Rich Text"
                >
                    <CopyIcon className="w-3.5 h-3.5" />
                </button>
                <button 
                    onClick={() => onReplayAudio(messageContent)}
                    className="p-1.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/20"
                    title="Read this aloud"
                >
                    <SpeakerIcon className="w-3.5 h-3.5" />
                </button>
                </>
            )}
        </div>
        
        <div ref={contentRef} className={`markdown-content ${isModel ? 'pr-2' : ''}`}>
             {isModel ? (
                 <ReactMarkdown remarkPlugins={[remarkGfm]}>
                     {messageContent}
                 </ReactMarkdown>
             ) : (
                 <p>{messageContent}</p>
             )}
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
            <h4 className="text-xs font-semibold text-inherit opacity-70 mb-2">Sources:</h4>
            <div className="flex flex-col space-y-1">
              {message.citations.map((citation, index) => (
                <a
                  href={citation.uri}
                  key={index}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-inherit opacity-90 hover:opacity-100 underline truncate block"
                  title={citation.uri}
                >
                  {index + 1}. {citation.title || citation.uri}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;