import React, { useState } from 'react';

interface WakeWordModalProps {
  onSave: (wakeWord: string) => void;
  initialWakeWord?: string;
}

const WakeWordModal: React.FC<WakeWordModalProps> = ({ onSave, initialWakeWord }) => {
  const [endPhrase, setEndPhrase] = useState(initialWakeWord || '');

  const handleSave = () => {
    if (endPhrase.trim()) {
      onSave(endPhrase.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm transition-colors duration-300 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4">Set Your End Phrase</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The AI will process your request after you say this word or phrase, like saying "over" on a walkie-talkie.
        </p>
        <input
          type="text"
          value={endPhrase}
          onChange={(e) => setEndPhrase(e.target.value)}
          placeholder="e.g., 'over'"
          className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
        />
        <button
          onClick={handleSave}
          disabled={!endPhrase.trim()}
          className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default WakeWordModal;