import React from 'react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpLink: React.FC<{href: string, children: React.ReactNode}> = ({ href, children }) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="block w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-semibold transition-colors duration-200 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
    >
        {children}
    </a>
);


const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose }) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
      >
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h2 id="help-panel-title" className="text-xl font-bold">Help & Information</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Close help panel">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <section>
                    <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">About This App</h3>
                    <p className="text-base text-gray-600 dark:text-gray-300">
                        Walkie Talkie AI Chat is a user-friendly, turn-based chat app designed for a relaxed and improved voice conversation experience with AI. Speak naturally, and the AI will listen and respond in turn, just like a real walkie-talkie.
                    </p>
                </section>
                
                <section>
                    <h3 className="text-lg font-semibold mb-3 text-indigo-600 dark:text-indigo-400">How to Use</h3>
                    <ul className="space-y-4">
                        <li className="flex items-start">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-sm mr-3 flex-shrink-0">1</span>
                            <div className="text-gray-600 dark:text-gray-300">
                                <strong className="font-semibold text-gray-800 dark:text-gray-100">Start Voice Chat:</strong> Click the microphone icon. It will glow red when active.
                            </div>
                        </li>
                         <li className="flex items-start">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-sm mr-3 flex-shrink-0">2</span>
                             <div className="text-gray-600 dark:text-gray-300">
                                <strong className="font-semibold text-gray-800 dark:text-gray-100">Speak Your Prompt:</strong> Say what's on your mind. The app will show a live transcript of your words.
                            </div>
                        </li>
                         <li className="flex items-start">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-sm mr-3 flex-shrink-0">3</span>
                             <div className="text-gray-600 dark:text-gray-300">
                                <strong className="font-semibold text-gray-800 dark:text-gray-100">End Your Turn:</strong> When using "Browser" voice mode, say your chosen end-phrase (e.g., "over") to signal the AI. In "Gemini AI" mode, it detects when you've paused.
                            </div>
                        </li>
                         <li className="flex items-start">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-sm mr-3 flex-shrink-0">4</span>
                             <div className="text-gray-600 dark:text-gray-300">
                                <strong className="font-semibold text-gray-800 dark:text-gray-100">Mute AI:</strong> Click the stop button (square icon) to instantly silence the AI if it is speaking.
                            </div>
                        </li>
                         <li className="flex items-start">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-sm mr-3 flex-shrink-0">5</span>
                            <div className="text-gray-600 dark:text-gray-300">
                                <strong className="font-semibold text-gray-800 dark:text-gray-100">Type Instead:</strong> If you prefer, you can always type your message in the input box and press Enter to send.
                            </div>
                        </li>
                         <li className="flex items-start">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-sm mr-3 flex-shrink-0">6</span>
                            <div className="text-gray-600 dark:text-gray-300">
                                <strong className="font-semibold text-gray-800 dark:text-gray-100">Access History:</strong> Click the history icon (on mobile) or use the panel on the left (on desktop) to view, manage, and switch between past conversations.
                            </div>
                        </li>
                         <li className="flex items-start">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-sm mr-3 flex-shrink-0">7</span>
                            <div className="text-gray-600 dark:text-gray-300">
                                <strong className="font-semibold text-gray-800 dark:text-gray-100">Customize:</strong> Click the gear icon to change voice settings, enable web search, and more.
                            </div>
                        </li>
                    </ul>
                </section>
            </div>

            <footer className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-3 flex-shrink-0">
                <HelpLink href="https://aistudio.google.com/apikey">Get a Google API Key</HelpLink>
                <HelpLink href="https://coff.ee/iammultiman">Support the Developer</HelpLink>
                <HelpLink href="https://x.com/iam_multiman">Contact the Developer</HelpLink>
            </footer>
        </div>
      </aside>
    </>
  );
};

export default HelpPanel;