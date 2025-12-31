
import React, { useState, useEffect } from 'react';
import { Settings, GeminiPauseSensitivity } from '../types';
import { getElevenLabsVoices, ElevenLabsVoice, isElevenLabsConfigured } from '../services/elevenLabs';
import { hasApiKey } from '../services/ai';

interface SettingsModalProps {
  currentSettings: Settings;
  voices: SpeechSynthesisVoice[];
  onSave: (settings: Settings) => void;
  onClose: () => void;
  initialEndPhrase: string;
}

const GEMINI_VOICES = ['Zephyr', 'Echo', 'Nova', 'Aurora', 'Fable', 'Onyx'];
const AVAILABLE_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
    { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ currentSettings, voices, onSave, onClose, initialEndPhrase }) => {
  const [settings, setSettings] = useState<Settings>(currentSettings);
  const [endPhrase, setEndPhrase] = useState(initialEndPhrase);
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  // API Key State
  const [geminiKey, setGeminiKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');

  useEffect(() => {
    setSettings(currentSettings);
    setEndPhrase(initialEndPhrase);
    setGeminiKey(localStorage.getItem('gemini_api_key') || '');
    setElevenLabsKey(localStorage.getItem('elevenlabs_api_key') || '');
  }, [currentSettings, initialEndPhrase]);

  useEffect(() => {
    // Check if we have an ElevenLabs key either in state (just typed) or configured in env
    const hasElevenLabsAccess = !!elevenLabsKey || isElevenLabsConfigured();

    if (settings.voiceService === 'elevenlabs' && hasElevenLabsAccess && elevenLabsVoices.length === 0) {
        setIsLoadingVoices(true);
        setVoiceError(null);
        
        // If the user just entered a key, we need to temporarily save it to localstorage so the service can use it immediately for the fetch
        // Or we assume the user hits save first. 
        // Better UX: If they type it, we can't fetch until they save? 
        // Actually, let's try to fetch if we have a key.
        
        // Note: The service reads from localStorage. We haven't saved yet.
        // We will defer fetching voices until after save OR if key exists.
        if (isElevenLabsConfigured() || localStorage.getItem('elevenlabs_api_key')) {
             getElevenLabsVoices()
                .then(voices => {
                    setElevenLabsVoices(voices);
                    if (!settings.elevenLabsVoiceId && voices.length > 0) {
                        setSettings(prev => ({ ...prev, elevenLabsVoiceId: voices[0].voice_id }));
                    }
                })
                .catch(err => setVoiceError(err.message))
                .finally(() => setIsLoadingVoices(false));
        } else {
             setIsLoadingVoices(false);
        }
    }
  }, [settings.voiceService, settings.elevenLabsVoiceId, elevenLabsVoices.length, elevenLabsKey]);

  const handleSave = () => {
    const trimmedPhrase = endPhrase.trim();
    if (trimmedPhrase) {
        localStorage.setItem('ai-chat-end-phrase', trimmedPhrase);
    }
    
    if (geminiKey.trim()) {
        localStorage.setItem('gemini_api_key', geminiKey.trim());
    } else if (geminiKey === '') {
        // If explicitly cleared, remove it (allows falling back to env var if exists, or clearing it)
        localStorage.removeItem('gemini_api_key');
    }

    if (elevenLabsKey.trim()) {
        localStorage.setItem('elevenlabs_api_key', elevenLabsKey.trim());
    } else if (elevenLabsKey === '') {
        localStorage.removeItem('elevenlabs_api_key');
    }

    onSave(settings);
  };

  const handleVoiceServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newService = e.target.value as 'browser' | 'gemini' | 'elevenlabs';
    setSettings(prev => ({ ...prev, voiceService: newService }));
  };
  
  const handleBrowserVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, selectedVoiceURI: e.target.value || null }));
  };

  const handleGeminiVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, geminiVoice: e.target.value }));
  };

  const handleElevenLabsVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, elevenLabsVoiceId: e.target.value }));
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSettings(prev => ({ ...prev, selectedModel: e.target.value }));
  };

  const handleGroundingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, useGrounding: e.target.checked }));
  };

  const handleVisualizerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, showVisualizer: e.target.checked }));
  };
  
  const handlePauseSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSensitivity = e.target.value as GeminiPauseSensitivity;
    setSettings(prev => ({ ...prev, geminiPauseSensitivity: newSensitivity }));
  };
  
  const handleSystemInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSettings(prev => ({ ...prev, systemInstruction: e.target.value }));
  };

  const HelpLink: React.FC<{href: string, children: React.ReactNode}> = ({ href, children }) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
    >
        {children}
    </a>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-2xl p-6 w-full max-w-md relative pb-12 transition-colors duration-300 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
            
            {/* API Key Configuration Section */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 text-sm uppercase tracking-wider">API Configuration (Stored Locally)</h3>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Google Gemini API Key
                    </label>
                    <input 
                        type="password" 
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder={hasApiKey() && !geminiKey ? "Loaded from env variable" : "Enter API Key"}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 text-sm"
                    />
                     <div className="mt-1 flex justify-end">
                         <HelpLink href="https://aistudio.google.com/apikey">Get Key</HelpLink>
                     </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ElevenLabs API Key
                    </label>
                    <input 
                        type="password" 
                        value={elevenLabsKey}
                        onChange={(e) => setElevenLabsKey(e.target.value)}
                        placeholder={isElevenLabsConfigured() && !elevenLabsKey ? "Loaded from env variable" : "Enter API Key"}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 text-sm"
                    />
                    <div className="mt-1 flex justify-end">
                         <HelpLink href="https://elevenlabs.io/">Get Key</HelpLink>
                     </div>
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Voice Experience</label>
              <div className="flex flex-col gap-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                      <div className="relative flex items-center justify-center">
                          <input type="radio" name="voice-service" value="browser" checked={settings.voiceService === 'browser'} onChange={handleVoiceServiceChange} className="sr-only peer"/>
                          <div className="w-5 h-5 rounded-full border-2 bg-white dark:bg-gray-800 border-gray-900 dark:border-gray-400 peer-checked:border-indigo-600 transition-colors"></div>
                          <div className="absolute w-2.5 h-2.5 rounded-full bg-indigo-600 scale-0 peer-checked:scale-100 transition-transform"></div>
                      </div>
                      <span>Browser (Default)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                      <div className="relative flex items-center justify-center">
                          <input type="radio" name="voice-service" value="gemini" checked={settings.voiceService === 'gemini'} onChange={handleVoiceServiceChange} className="sr-only peer"/>
                          <div className="w-5 h-5 rounded-full border-2 bg-white dark:bg-gray-800 border-gray-900 dark:border-gray-400 peer-checked:border-indigo-600 transition-colors"></div>
                          <div className="absolute w-2.5 h-2.5 rounded-full bg-indigo-600 scale-0 peer-checked:scale-100 transition-transform"></div>
                      </div>
                      <span>Gemini Live (Real-time Audio)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                      <div className="relative flex items-center justify-center">
                          <input type="radio" name="voice-service" value="elevenlabs" checked={settings.voiceService === 'elevenlabs'} onChange={handleVoiceServiceChange} className="sr-only peer"/>
                          <div className="w-5 h-5 rounded-full border-2 bg-white dark:bg-gray-800 border-gray-900 dark:border-gray-400 peer-checked:border-indigo-600 transition-colors"></div>
                          <div className="absolute w-2.5 h-2.5 rounded-full bg-indigo-600 scale-0 peer-checked:scale-100 transition-transform"></div>
                      </div>
                      <span>ElevenLabs (Premium TTS)</span>
                  </label>
              </div>
            </div>

          <div>
              <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI Model
              </label>
              <select
                  id="model-select"
                  value={settings.selectedModel || 'gemini-2.5-flash'}
                  onChange={handleModelChange}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
              >
                  {AVAILABLE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                          {model.name}
                      </option>
                  ))}
              </select>
          </div>

          {(settings.voiceService === 'browser' || settings.voiceService === 'elevenlabs') && (
            <div>
                 <label htmlFor="end-phrase-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Phrase
                    <p className="text-xs text-gray-500 dark:text-gray-400">The keyword to end your voice input.</p>
                </label>
                <input
                    id="end-phrase-input"
                    type="text"
                    value={endPhrase}
                    onChange={(e) => setEndPhrase(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
                />
            </div>
          )}

          {settings.voiceService === 'browser' && (
                <div>
                  <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Browser AI Voice
                  </label>
                  <select
                    id="voice-select"
                    value={settings.selectedVoiceURI || ''}
                    onChange={handleBrowserVoiceChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
                  >
                    <option value="">Browser Default</option>
                    {voices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>
          )}
          
          {settings.voiceService === 'elevenlabs' && (
              <div>
                  <label htmlFor="eleven-voice-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ElevenLabs Voice
                    {(!elevenLabsKey && !isElevenLabsConfigured()) && <span className="text-red-500 text-xs ml-2">(API Key Missing)</span>}
                  </label>
                  
                  {isLoadingVoices ? (
                      <div className="text-sm text-gray-500 animate-pulse">Loading voices...</div>
                  ) : voiceError ? (
                      <div className="text-sm text-red-500">{voiceError}</div>
                  ) : (
                      <select
                        id="eleven-voice-select"
                        value={settings.elevenLabsVoiceId || ''}
                        onChange={handleElevenLabsVoiceChange}
                        disabled={!elevenLabsKey && !isElevenLabsConfigured()}
                        className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
                      >
                        <option value="">Select a Voice</option>
                        {elevenLabsVoices.map((voice) => (
                          <option key={voice.voice_id} value={voice.voice_id}>
                            {voice.name}
                          </option>
                        ))}
                      </select>
                  )}
                  {(!elevenLabsKey && !isElevenLabsConfigured()) && <p className="text-xs text-red-500 mt-1">Please enter your API Key above.</p>}
              </div>
          )}

          {settings.voiceService === 'gemini' && (
             <>
                <div>
                  <label htmlFor="gemini-voice-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gemini AI Voice
                  </label>
                  <select
                    id="gemini-voice-select"
                    value={settings.geminiVoice}
                    onChange={handleGeminiVoiceChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
                  >
                    {GEMINI_VOICES.map((voice) => (
                      <option key={voice} value={voice}>
                        {voice}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Pause Detection</label>
                    <div className="flex justify-around p-1 rounded-lg bg-gray-200 dark:bg-gray-700">
                        {(['Quick', 'Medium', 'Relaxed'] as const).map(level => {
                            const value = level === 'Quick' ? 'HIGH' : level === 'Medium' ? 'MEDIUM' : 'LOW';
                            return (
                                <label key={value} className="flex-1 text-center">
                                    <input type="radio" name="pause-sensitivity" value={value} checked={settings.geminiPauseSensitivity === value} onChange={handlePauseSensitivityChange} className="sr-only peer" />
                                    <span className="block px-4 py-1.5 rounded-md text-sm cursor-pointer transition-colors peer-checked:bg-indigo-600 peer-checked:text-white text-gray-600 dark:text-gray-300">
                                        {level}
                                    </span>
                                </label>
                            )
                        })}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">"Relaxed" waits longer for pauses before responding.</p>
                </div>
             </>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Web Search
                <p className="text-xs text-gray-500 dark:text-gray-400">Uses Google Search for up-to-date answers.</p>
            </span>
            <label htmlFor="grounding-toggle" className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id="grounding-toggle" 
                className="sr-only peer" 
                checked={settings.useGrounding}
                onChange={handleGroundingChange}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Show Audio Visualizer
                <p className="text-xs text-gray-500 dark:text-gray-400">Display the graphical audio feed.</p>
            </span>
            <label htmlFor="visualizer-toggle" className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id="visualizer-toggle" 
                className="sr-only peer" 
                checked={settings.showVisualizer}
                onChange={handleVisualizerChange}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          <div>
            <label htmlFor="system-instruction-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                System Instruction
                <p className="text-xs text-gray-500 dark:text-gray-400">Guides the AI's personality and responses. e.g., "Act as a pirate."</p>
            </label>
            <textarea
                id="system-instruction-input"
                rows={3}
                value={settings.systemInstruction}
                onChange={handleSystemInstructionChange}
                className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 resize-y"
                placeholder="e.g., You are a helpful AI assistant."
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">
                      Support the developer or learn more.
                  </p>
                  <div className="flex flex-col items-start space-y-2 pt-2">
                     <HelpLink href="https://coff.ee/iammultiman">Support the Developer</HelpLink>
                  </div>
              </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Save
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500 absolute bottom-4 left-0 right-0">
          App Version 1.7.0
        </p>
      </div>
    </div>
  );
};

export default SettingsModal;
