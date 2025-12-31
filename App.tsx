
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppStatus, ChatMessage, ChatSession, Settings, Citation, ISpeechRecognition } from './types';
import { generateResponseStream, generateChatTitle, generateSpeech } from './services/geminiService';
import { GeminiLiveManager } from './services/geminiLiveService';
import { generateElevenLabsSpeech, isElevenLabsConfigured } from './services/elevenLabs';
import ChatHistory from './components/ChatHistory';
import InputBar from './components/InputBar';
import WakeWordModal from './components/WakeWordModal';
import AudioVisualizer from './components/AudioVisualizer';
import SidePanel from './components/SidePanel';
import SettingsModal from './components/SettingsModal';
import HelpPanel from './components/HelpPanel';
import { HelpIcon, DayIcon, NightIcon, ChevronLeftIcon, HistoryIcon, LogoIcon, GearIcon } from './components/Icons';
import { GenerateContentResponse } from '@google/genai';
import { levenshteinDistance, base64ToUint8Array, pcmToAudioBuffer } from './utils';
import { getAiClient, hasApiKey, resetAiClient } from './services/ai';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({ 
      selectedVoiceURI: null, 
      selectedModel: 'gemini-2.5-flash',
      useGrounding: true,
      voiceService: 'browser',
      geminiVoice: 'Zephyr',
      elevenLabsVoiceId: '',
      geminiPauseSensitivity: 'HIGH',
      showVisualizer: true,
      systemInstruction: "You are a helpful AI assistant. Keep your responses concise and conversational.",
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const [currentAiResponse, setCurrentAiResponse] = useState<string>('');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const [showEndPhraseModal, setShowEndPhraseModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showHelpPanel, setShowHelpPanel] = useState<boolean>(false);
  const [showSidePanel, setShowSidePanel] = useState<boolean>(false); // For mobile overlay
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState<boolean>(false); // For desktop collapse
  
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState<boolean>(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const speechRecognitionRef = useRef<ISpeechRecognition | null>(null);
  const finalizedTranscriptRef = useRef<string>('');
  const sentenceQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  
  // Audio Contexts
  const audioContextRef = useRef<AudioContext | null>(null); // For input microphone
  const playbackAudioContextRef = useRef<AudioContext | null>(null); // For output playback (ElevenLabs/TTS)
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const isVoiceSessionActiveRef = useRef(isVoiceSessionActive);
  useEffect(() => { isVoiceSessionActiveRef.current = isVoiceSessionActive; }, [isVoiceSessionActive]);
  
  const sendMessageRef = useRef<((message: string) => Promise<void>) | null>(null);

  const geminiLiveManagerRef = useRef<GeminiLiveManager | null>(null);
  
  const handleNewChat = useCallback(() => {
    if (geminiLiveManagerRef.current) {
        geminiLiveManagerRef.current.stopSession();
        geminiLiveManagerRef.current = null;
    }
    setIsVoiceSessionActive(false); 
    window.speechSynthesis.cancel(); 
    isSpeakingRef.current = false;
    sentenceQueueRef.current = []; 
    setStatus(AppStatus.IDLE); 
    setCurrentAiResponse(''); 
    setErrorMessage(''); 
    setLiveTranscript('');
    setInputText('');
    finalizedTranscriptRef.current = '';

    const newSession: ChatSession = {
        id: `chat-${Date.now()}`,
        title: "New Chat",
        timestamp: Date.now(),
        history: [],
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);
  
  const stopListening = useCallback(() => {
    if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onresult = null; 
        speechRecognitionRef.current.onerror = null; 
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.stop(); 
        speechRecognitionRef.current = null;
    }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(track => track.stop()); mediaStreamRef.current = null; }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') { audioContextRef.current.close(); audioContextRef.current = null; }
    // Only clear analyser if not speaking (because playback might use it)
    if (status !== AppStatus.SPEAKING) {
       setAnalyserNode(null); 
    }
  }, [status]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition || !isVoiceSessionActiveRef.current) return;

    const recognition: ISpeechRecognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => { // Using 'any' for broader compatibility
        let interimTranscript = '';
        let finalTranscriptChunk = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscriptChunk += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        if(finalTranscriptChunk) {
          finalizedTranscriptRef.current += finalTranscriptChunk + ' ';
        }

        setLiveTranscript(finalizedTranscriptRef.current + interimTranscript);

        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
            const keyword = (localStorage.getItem('ai-chat-end-phrase') || 'over').toLowerCase().trim();
            const fullTranscript = finalizedTranscriptRef.current.toLowerCase().trim();
            const wordsInTranscript = fullTranscript.split(/\s+/);
            const wordsInKeyword = keyword.split(/\s+/);

            if (wordsInTranscript.length >= wordsInKeyword.length) {
                const potentialEndPhrase = wordsInTranscript.slice(-wordsInKeyword.length).join(' ');

                if (levenshteinDistance(potentialEndPhrase, keyword) <= 2) {
                    const prompt = finalizedTranscriptRef.current.substring(0, finalizedTranscriptRef.current.toLowerCase().lastIndexOf(potentialEndPhrase)).trim();

                    if (isVoiceSessionActiveRef.current) {
                        stopListening(); // Stop current listening instance
                        if (sendMessageRef.current) {
                            sendMessageRef.current(prompt);
                        }
                    }
                }
            }
        }
    };

    recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setErrorMessage(`Speech recognition error: ${event.error}`); 
          setStatus(AppStatus.ERROR); 
          setIsVoiceSessionActive(false);
        }
    };
    
    recognition.onend = () => {
        if (isVoiceSessionActiveRef.current) {
             startListening();
        }
    };
    recognition.start();
  }, [stopListening]);

  const initializeAndStartListening = useCallback(() => {
    if (!isVoiceSessionActiveRef.current) return;

    setStatus(AppStatus.LISTENING);
    finalizedTranscriptRef.current = '';
    setLiveTranscript('');
    setInputText('');
    
    // Close any previous playback context to free resources
    if (playbackAudioContextRef.current && playbackAudioContextRef.current.state !== 'closed') {
        playbackAudioContextRef.current.close();
        playbackAudioContextRef.current = null;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaStreamRef.current = stream;
        const context = new AudioContext();
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        setAnalyserNode(analyser);
        startListening();
    }).catch(err => {
        console.error('Failed to get user media', err);
        setErrorMessage('Could not access microphone. Please grant permission and refresh.');
        setStatus(AppStatus.ERROR);
        setIsVoiceSessionActive(false);
    });
  }, [startListening]);

  // --- Initialization & Theming ---
  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem('ai-chat-theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    
    // API and Speech Recognition checks
    if (!SpeechRecognition) {
        setErrorMessage("Speech Recognition API is not supported in this browser.");
        setStatus(AppStatus.ERROR);
    }
    if (!hasApiKey()) {
        setErrorMessage("Welcome! Please configure your API Keys in Settings to get started.");
        setStatus(AppStatus.ERROR);
    }

    // Load voices for settings
    const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            setVoices(availableVoices);
        }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    const savedEndPhrase = localStorage.getItem('ai-chat-end-phrase');
    if (!savedEndPhrase) {
      setShowEndPhraseModal(true);
    }
    
    try {
        const savedSessions = localStorage.getItem('ai-chat-sessions');
        const initialSessions = savedSessions ? JSON.parse(savedSessions) : [];
        setSessions(initialSessions);
        
        const savedActiveId = localStorage.getItem('ai-chat-active-session-id');
        if (savedActiveId && initialSessions.some((s: ChatSession) => s.id === savedActiveId)) {
            setActiveSessionId(savedActiveId);
        } else if (initialSessions.length > 0) {
            setActiveSessionId(initialSessions[0].id);
        } else {
            handleNewChat();
        }

        const savedSettings = localStorage.getItem('ai-chat-settings');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            // Ensure new settings have defaults
            setSettings(prev => ({...prev, ...parsedSettings}));
        }

    } catch (e) {
        console.error("Failed to parse saved data", e);
        handleNewChat();
    }

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      geminiLiveManagerRef.current?.stopSession();
      if (playbackAudioContextRef.current) playbackAudioContextRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
    }
  }, [handleNewChat]);

  // Effect to apply theme class to HTML element
  useEffect(() => {
      const root = window.document.documentElement;
      if (theme === 'dark') {
          root.classList.add('dark');
      } else {
          root.classList.remove('dark');
      }
      localStorage.setItem('ai-chat-theme', theme);
  }, [theme]);
  
  // Effect to handle responsive state changes for the side panel
  useEffect(() => {
    const handleResize = () => {
        const isMobile = window.innerWidth < 768;
        if (!isMobile) {
            setShowSidePanel(false);
        } else if (!showSidePanel) {
            setIsSidePanelCollapsed(false);
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [showSidePanel]);

  // --- Data Persistence ---
  useEffect(() => {
    if (sessions.length > 0) {
        localStorage.setItem('ai-chat-sessions', JSON.stringify(sessions));
    }
  }, [sessions]);
  
  useEffect(() => {
    if (activeSessionId) {
        localStorage.setItem('ai-chat-active-session-id', activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem('ai-chat-settings', JSON.stringify(settings));
  }, [settings]);


  const activeSession = sessions.find(s => s.id === activeSessionId);
  const endPhrase = localStorage.getItem('ai-chat-end-phrase') || 'over';

  // Voice session effect (for browser/elevenlabs speech which share input mechanism)
  useEffect(() => {
    if (isVoiceSessionActive && (settings.voiceService === 'browser' || settings.voiceService === 'elevenlabs')) {
        initializeAndStartListening();
        return () => {
            stopListening();
        }
    }
  }, [isVoiceSessionActive, settings.voiceService, initializeAndStartListening, stopListening]);


  const speakNextSentence = useCallback(async () => {
    if (isSpeakingRef.current || sentenceQueueRef.current.length === 0) {
        if (!isSpeakingRef.current) { // Done speaking all sentences
            if (isVoiceSessionActiveRef.current && (settings.voiceService === 'browser' || settings.voiceService === 'elevenlabs')) {
                initializeAndStartListening();
            } else if (settings.voiceService === 'browser' || settings.voiceService === 'elevenlabs') {
                setStatus(AppStatus.IDLE);
            }
        }
        return;
    }
    
    isSpeakingRef.current = true;
    setStatus(AppStatus.SPEAKING);

    const sentence = sentenceQueueRef.current.shift();
    if (!sentence) { isSpeakingRef.current = false; speakNextSentence(); return; };

    // ElevenLabs TTS
    if (settings.voiceService === 'elevenlabs') {
        if (!settings.elevenLabsVoiceId) {
            setErrorMessage("ElevenLabs selected but no voice ID configured.");
            isSpeakingRef.current = false;
            setStatus(AppStatus.ERROR);
            return;
        }
        
        try {
            const audioData = await generateElevenLabsSpeech(sentence, settings.elevenLabsVoiceId);
            
            // Set up playback audio context
            if (!playbackAudioContextRef.current || playbackAudioContextRef.current.state === 'closed') {
                playbackAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = playbackAudioContextRef.current;
            const audioBuffer = await ctx.decodeAudioData(audioData);
            
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            currentAudioSourceRef.current = source;
            
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            setAnalyserNode(analyser); // Connect to visualizer
            
            source.connect(analyser);
            analyser.connect(ctx.destination);
            
            source.onended = () => {
                currentAudioSourceRef.current = null;
                isSpeakingRef.current = false;
                speakNextSentence();
            };
            source.start();
        } catch (e: any) {
             const errorMsg = `ElevenLabs error: ${e.message}`;
             console.error(errorMsg, e);
             setErrorMessage(errorMsg);
             setStatus(AppStatus.ERROR);
             isSpeakingRef.current = false;
             sentenceQueueRef.current = [];
        }
        return;
    }

    // Browser TTS (Default)
    const utterance = new SpeechSynthesisUtterance(sentence);
    const selectedVoice = voices.find(v => v.voiceURI === settings.selectedVoiceURI);
    utterance.voice = selectedVoice || voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) || voices[0];
    
    utterance.onend = () => { isSpeakingRef.current = false; speakNextSentence(); };
    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
            const errorMsg = `Speech synthesis error: ${e.error}`;
            console.error(errorMsg, e);
            setErrorMessage(errorMsg);
            setStatus(AppStatus.ERROR);

            sentenceQueueRef.current = [];
            
            if(isVoiceSessionActiveRef.current) {
                setIsVoiceSessionActive(false);
            }
        } else {
            console.log(`Speech synthesis event: ${e.error}`);
        }
        
        isSpeakingRef.current = false;
    };
    window.speechSynthesis.speak(utterance);
  }, [voices, settings, initializeAndStartListening]);

  // --- Core Actions ---
  const sendMessage = useCallback(async (message: string) => {
    if (!hasApiKey()) {
        setErrorMessage("Please configure your API Keys in Settings.");
        setShowSettingsModal(true);
        setStatus(AppStatus.ERROR);
        return;
    }
    
    if (!message.trim()) {
        if (isVoiceSessionActiveRef.current && (settings.voiceService === 'browser' || settings.voiceService === 'elevenlabs')) {
            initializeAndStartListening();
        } else {
            setStatus(AppStatus.IDLE);
        }
        setLiveTranscript('');
        finalizedTranscriptRef.current = '';
        return;
    }

    if (!activeSessionId) return;
    
    const ai = getAiClient();
    if (!ai) {
        setErrorMessage("API Client not initialized. Please check your API Key.");
        setShowSettingsModal(true);
        setStatus(AppStatus.ERROR);
        return;
    }

    if (settings.voiceService === 'gemini' && geminiLiveManagerRef.current) {
        setStatus(AppStatus.THINKING);
        setCurrentAiResponse('');
        setErrorMessage('');
        
        const userMessage: ChatMessage = { role: 'user', parts: [{ text: message }] };
        
        setSessions(prevSessions =>
            prevSessions.map(s => s.id === activeSessionId ? { ...s, history: [...s.history, userMessage] } : s)
        );
        
        const currentSession = sessions.find(s => s.id === activeSessionId);
        if (currentSession?.title === "New Chat" && currentSession.history.length === 0) {
            generateChatTitle(message)
                .then(title => {
                    if (title) {
                        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: title.replace(/"/g, '') } : s));
                    }
                })
                .catch(err => console.error("Failed to generate title:", err));
        }
        
        geminiLiveManagerRef.current.sendTextPrompt(message);
        return;
    }

    setStatus(AppStatus.THINKING);
    setCurrentAiResponse('');
    setErrorMessage('');
    
    const userMessage: ChatMessage = { role: 'user', parts: [{ text: message }] };
    
    let currentSession = sessions.find(s => s.id === activeSessionId);
    if (!currentSession) {
        const newSession: ChatSession = { id: `chat-${Date.now()}`, title: "New Chat", timestamp: Date.now(), history: [] };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        currentSession = newSession;
    }
    
    const historyForApiCall = [...currentSession.history, userMessage];

    setSessions(prevSessions =>
        prevSessions.map(s => s.id === activeSessionId ? { ...s, history: historyForApiCall } : s)
    );
    
    if (currentSession.title === "New Chat" && historyForApiCall.length === 1) {
        generateChatTitle(message)
            .then(title => {
                if (title) {
                    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: title.replace(/"/g, '') } : s));
                }
            })
            .catch(err => console.error("Failed to generate title:", err));
    }

    try {
        const stream = await generateResponseStream(historyForApiCall, settings);
      
        let fullResponseText = "";
        let accumulatedText = "";
        let finalChunk: GenerateContentResponse | null = null;
        sentenceQueueRef.current = [];
        isSpeakingRef.current = false;
        
        setLiveTranscript(''); 
        finalizedTranscriptRef.current = '';

        for await (const chunk of stream) {
            const chunkText = chunk.text;
            if (typeof chunkText === 'string') {
                fullResponseText += chunkText;
                if (settings.voiceService === 'browser' || settings.voiceService === 'elevenlabs') {
                    accumulatedText += chunkText;
                }
                setCurrentAiResponse(prev => prev + chunkText);
                
                if (settings.voiceService === 'browser' || settings.voiceService === 'elevenlabs') {
                    const sentences = accumulatedText.match(/[^.!?]+[.!?]+/g);
                    if (sentences) {
                        for (const sentence of sentences) {
                            sentenceQueueRef.current.push(sentence.trim());
                        }
                        accumulatedText = accumulatedText.substring(sentences.join('').length);
                        if (!isSpeakingRef.current) speakNextSentence();
                    }
                }
            }
            finalChunk = chunk;
        }
      
        if ((settings.voiceService === 'browser' || settings.voiceService === 'elevenlabs') && accumulatedText.trim()) {
            sentenceQueueRef.current.push(accumulatedText.trim());
            if (!isSpeakingRef.current) speakNextSentence();
        }

        const groundingMetadata = finalChunk?.candidates?.[0]?.groundingMetadata;
        const citations: Citation[] = [];
        if (groundingMetadata?.groundingChunks) {
            groundingMetadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web) citations.push({ uri: chunk.web.uri, title: chunk.web.title });
            });
        }
        
        if (fullResponseText.trim()) {
            const modelMessage: ChatMessage = { role: 'model', parts: [{ text: fullResponseText }], citations };
            setSessions(prevSessions => prevSessions.map(s => 
                s.id === activeSessionId 
                    ? { ...s, history: [...historyForApiCall, modelMessage] } 
                    : s
            ));
        } else {
             if (isVoiceSessionActiveRef.current && (settings.voiceService === 'browser' || settings.voiceService === 'elevenlabs')) {
                initializeAndStartListening();
            } else {
                setStatus(AppStatus.IDLE);
            }
        }
    } catch (e: any) {
        console.error(e);
        const errorMessage = e.message || "An error occurred while communicating with the AI.";
        setErrorMessage(errorMessage);
        setStatus(AppStatus.ERROR);
        setSessions(prevSessions => prevSessions.map(s => 
            s.id === activeSessionId
                ? { ...s, history: s.history.slice(0, -1) }
                : s
        ));
    } finally {
        setCurrentAiResponse('');
        if (settings.voiceService === 'gemini') {
            setStatus(AppStatus.IDLE);
        }
    }
  }, [activeSessionId, sessions, settings, speakNextSentence, initializeAndStartListening]);
  
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);


  const handleGeminiTranscript = useCallback((transcript: string, isFinal: boolean) => {
    setLiveTranscript(transcript);
    // When the transcript is final and not empty, it's a user message.
    if (isFinal && transcript.trim() && activeSessionId) {
        const prompt = transcript.trim();
        const userMessage: ChatMessage = { role: 'user', parts: [{ text: prompt }] };

        setSessions(prevSessions => {
            const sessionToUpdate = prevSessions.find(s => s.id === activeSessionId);
            
            if (sessionToUpdate && sessionToUpdate.history.length === 0 && sessionToUpdate.title === "New Chat") {
                generateChatTitle(prompt).then(title => {
                    if (title) {
                        setSessions(latestSessions => latestSessions.map(s => 
                            s.id === activeSessionId ? { ...s, title: title.replace(/"/g, '') } : s
                        ));
                    }
                });
            }
            
            return prevSessions.map(s => 
                s.id === activeSessionId 
                    ? { ...s, history: [...s.history, userMessage] } 
                    : s
            );
        });
        
        setLiveTranscript('');
        setStatus(AppStatus.THINKING);
    }
  }, [activeSessionId]);
  
  const handleGeminiAudio = useCallback((isSpeaking: boolean, fullResponseText: string | null) => {
    setStatus(isSpeaking ? AppStatus.SPEAKING : AppStatus.LISTENING);
    if (isSpeaking) {
        setCurrentAiResponse('');
    } else if (!isSpeaking && fullResponseText && activeSessionId) {
        const modelMessage: ChatMessage = { role: 'model', parts: [{ text: fullResponseText }] };
        setSessions(prev => prev.map(s => s.id === activeSessionId ? {...s, history: [...s.history, modelMessage]} : s));
    }
  }, [activeSessionId]);

  const handleGeminiError = useCallback((error: string) => {
    setErrorMessage(error);
    setStatus(AppStatus.ERROR);
    setIsVoiceSessionActive(false);
    if (geminiLiveManagerRef.current) {
        geminiLiveManagerRef.current.stopSession();
        geminiLiveManagerRef.current = null;
    }
  }, []);

  const handleGeminiUserActivity = useCallback((isActive: boolean) => {}, []);

  const handleGeminiTextChunk = useCallback((text: string) => {
    setCurrentAiResponse((prev: string) => prev + text);
  }, []);

  const handleToggleListening = useCallback(async () => {
    if (!isVoiceSessionActive) { // Turning ON
        if (!hasApiKey()) {
            setErrorMessage("Please configure your API Keys in Settings.");
            setStatus(AppStatus.ERROR);
            setShowSettingsModal(true);
            return;
        }
        
        if (settings.voiceService === 'elevenlabs' && !isElevenLabsConfigured()) {
             setErrorMessage("Please configure your ElevenLabs API Key in Settings.");
             setStatus(AppStatus.ERROR);
             setShowSettingsModal(true);
             return;
        }

        const savedEndPhrase = localStorage.getItem('ai-chat-end-phrase');
        if (!savedEndPhrase) {
          setShowEndPhraseModal(true); 
          return;
        }
        setIsVoiceSessionActive(true);
        if (settings.voiceService === 'gemini') {
            const ai = getAiClient();
            if (!ai) {
                handleGeminiError("Gemini AI client not initialized. Please check your API key.");
                return;
            }
            
            setStatus(AppStatus.LISTENING);
            setLiveTranscript('');
            setCurrentAiResponse('');
            const manager = new GeminiLiveManager(ai, {
                onTranscript: handleGeminiTranscript,
                onAudioStateChange: handleGeminiAudio,
                onError: handleGeminiError,
                onAnalyserNode: setAnalyserNode,
                onTextChunk: handleGeminiTextChunk,
                onUserActivity: handleGeminiUserActivity,
            });
            geminiLiveManagerRef.current = manager;
            try {
                await manager.startSession({
                    voiceName: settings.geminiVoice,
                    systemInstruction: settings.systemInstruction,
                    pauseSensitivity: settings.geminiPauseSensitivity,
                    useGrounding: settings.useGrounding,
                });
            } catch(e: any) {
                handleGeminiError(e.message);
            }
        }
    } else { // Turning OFF
        setIsVoiceSessionActive(false);
        if (settings.voiceService === 'gemini') {
            geminiLiveManagerRef.current?.stopSession();
            geminiLiveManagerRef.current = null;
            setAnalyserNode(null);
        }
        setCurrentAiResponse(''); 
        setLiveTranscript('');
        finalizedTranscriptRef.current = '';
        setStatus(AppStatus.IDLE);
    }
  }, [isVoiceSessionActive, settings, handleGeminiTranscript, handleGeminiAudio, handleGeminiError, handleGeminiTextChunk]);

  const handleCorrectTranscript = (transcript: string) => {
    setIsVoiceSessionActive(false);
    if (settings.voiceService === 'gemini') {
        geminiLiveManagerRef.current?.stopSession();
        geminiLiveManagerRef.current = null;
        setAnalyserNode(null);
    }
    setCurrentAiResponse(''); 
    setLiveTranscript('');
    finalizedTranscriptRef.current = '';
    setInputText(transcript);
  };

  const handleEndPhraseSave = (newWord: string) => {
    const trimmedWord = newWord.trim();
    if (trimmedWord) {
      localStorage.setItem('ai-chat-end-phrase', trimmedWord);
      setShowEndPhraseModal(false);
    }
  };
  
  const handleNewChatWithCleanup = useCallback(() => {
    if (isVoiceSessionActive && settings.voiceService === 'gemini') {
        geminiLiveManagerRef.current?.stopSession();
        geminiLiveManagerRef.current = null;
    }
    setIsVoiceSessionActive(false); 
    handleNewChat();
  }, [handleNewChat, isVoiceSessionActive, settings.voiceService]);

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => {
        const remainingSessions = prev.filter(s => s.id !== sessionId);
        if (activeSessionId === sessionId) {
            if (remainingSessions.length > 0) {
                setActiveSessionId(remainingSessions[0].id);
            } else {
                setActiveSessionId(null); 
                handleNewChat();
            }
        }
        if (remainingSessions.length === 0) {
            localStorage.removeItem('ai-chat-sessions');
            localStorage.removeItem('ai-chat-active-session-id');
        }
        return remainingSessions;
    });
  };

  const handleUpdateSessionTitle = (sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(session => 
        session.id === sessionId 
            ? { ...session, title: newTitle }
            : session
    ));
  };

  const handleSaveSettings = (newSettings: Settings) => {
    if (isVoiceSessionActive) {
      const hasCriticalChange = settings.voiceService !== newSettings.voiceService || 
            settings.geminiVoice !== newSettings.geminiVoice ||
            settings.geminiPauseSensitivity !== newSettings.geminiPauseSensitivity ||
            settings.selectedVoiceURI !== newSettings.selectedVoiceURI ||
            settings.elevenLabsVoiceId !== newSettings.elevenLabsVoiceId ||
            settings.selectedModel !== newSettings.selectedModel;
      
      if (hasCriticalChange) {
        handleToggleListening();
      }
    }
    
    // Refresh API Client to pick up potential key changes from localStorage
    resetAiClient();
    
    // Clear error if API key is now present
    if (hasApiKey() && errorMessage.includes("API Key")) {
        setErrorMessage('');
        if (status === AppStatus.ERROR) {
            setStatus(AppStatus.IDLE);
        }
    }

    setSettings(newSettings);
    setShowSettingsModal(false);
  }
  
  const handlePanelToggle = () => {
    if (window.innerWidth < 768) { // Mobile
      setShowSidePanel(prev => !prev);
    } else { // Desktop
      setIsSidePanelCollapsed(prev => !prev);
    }
  };
  
  const handleStopSpeaking = () => {
      if (status !== AppStatus.SPEAKING) return;

      // Stop browser TTS
      window.speechSynthesis.cancel();
      
      // Stop ElevenLabs / Playback audio
      if (currentAudioSourceRef.current) {
          try { currentAudioSourceRef.current.stop(); } catch(e) {}
          currentAudioSourceRef.current = null;
      }
      
      sentenceQueueRef.current = [];
      isSpeakingRef.current = false;
      
      // Stop Gemini Live TTS and finalize partial response
      if (settings.voiceService === 'gemini' && geminiLiveManagerRef.current) {
          geminiLiveManagerRef.current.interrupt();
      }
      
      // Determine the next logical state
      if (isVoiceSessionActiveRef.current) {
          if (settings.voiceService === 'browser' || settings.voiceService === 'elevenlabs') {
              initializeAndStartListening();
          } else {
              setStatus(AppStatus.LISTENING);
          }
      } else {
          setStatus(AppStatus.IDLE);
      }
  };
  
  const handleReplayAudio = async (text: string) => {
      // Stop any other speech first
      window.speechSynthesis.cancel();
      if (currentAudioSourceRef.current) {
         try { currentAudioSourceRef.current.stop(); } catch(e) {}
         currentAudioSourceRef.current = null;
      }
      isSpeakingRef.current = false;
      sentenceQueueRef.current = [];
      
      // Handle ElevenLabs Replay
      if (settings.voiceService === 'elevenlabs') {
          if (!isElevenLabsConfigured()) {
              setErrorMessage("API Key required for ElevenLabs TTS.");
              setStatus(AppStatus.ERROR);
              return;
          }
           if (!settings.elevenLabsVoiceId) {
              setErrorMessage("No ElevenLabs voice selected.");
              setStatus(AppStatus.ERROR);
              return;
          }
          
          try {
              setStatus(AppStatus.SPEAKING);
              const audioData = await generateElevenLabsSpeech(text, settings.elevenLabsVoiceId);
              
              if (!playbackAudioContextRef.current || playbackAudioContextRef.current.state === 'closed') {
                playbackAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
              }
              const ctx = playbackAudioContextRef.current;
              const audioBuffer = await ctx.decodeAudioData(audioData);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              currentAudioSourceRef.current = source;

              const analyser = ctx.createAnalyser();
              analyser.fftSize = 512;
              setAnalyserNode(analyser);
              
              source.connect(analyser);
              analyser.connect(ctx.destination);
              
              source.onended = () => {
                  currentAudioSourceRef.current = null;
                  setAnalyserNode(null);
                  if (isVoiceSessionActiveRef.current) {
                      initializeAndStartListening();
                  } else {
                      setStatus(AppStatus.IDLE);
                  }
              };
              source.start();
          } catch (e: any) {
             setErrorMessage(`ElevenLabs Replay Error: ${e.message}`);
             setStatus(AppStatus.ERROR);
          }
          return;
      }
      
      if (settings.voiceService === 'gemini') {
         if (!hasApiKey()) {
             setErrorMessage("API Key required for Gemini TTS.");
             setStatus(AppStatus.ERROR);
             return;
         }

         try {
             setStatus(AppStatus.SPEAKING);
             const base64Audio = await generateSpeech(text, settings.geminiVoice);
             const audioBytes = base64ToUint8Array(base64Audio);
             
             if (!playbackAudioContextRef.current || playbackAudioContextRef.current.state === 'closed') {
                playbackAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
             }
             const ctx = playbackAudioContextRef.current;
             const audioBuffer = await pcmToAudioBuffer(audioBytes, ctx);
             
             const source = ctx.createBufferSource();
             source.buffer = audioBuffer;
             currentAudioSourceRef.current = source;
             
             const analyser = ctx.createAnalyser();
             analyser.fftSize = 512;
             setAnalyserNode(analyser);
             
             source.connect(analyser);
             analyser.connect(ctx.destination);
             
             source.onended = () => {
                 currentAudioSourceRef.current = null;
                 setAnalyserNode(null);
                 if (isVoiceSessionActiveRef.current && settings.voiceService === 'gemini') {
                     setStatus(AppStatus.LISTENING);
                 } else {
                     setStatus(AppStatus.IDLE);
                 }
             };
             source.start();
             
         } catch (e: any) {
             console.error("Gemini TTS Error:", e);
             setErrorMessage(`Gemini TTS Error: ${e.message}`);
             setStatus(AppStatus.ERROR);
         }
         return;
      }
      
      // Fallback to Browser TTS
      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = voices.find(v => v.voiceURI === settings.selectedVoiceURI);
      utterance.voice = selectedVoice || voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) || voices[0];
      
      let didErrorOccur = false;
      
      utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
           if (e.error !== 'canceled' && e.error !== 'interrupted') {
              didErrorOccur = true;
              const errorMsg = `Speech synthesis replay error: ${e.error}`;
              console.error(errorMsg, e);
              setErrorMessage(errorMsg);
              setStatus(AppStatus.ERROR);
           }
      };

      utterance.onend = () => {
          if (!didErrorOccur) {
              if (isVoiceSessionActiveRef.current && settings.voiceService === 'browser') {
                  initializeAndStartListening();
              } else {
                  setStatus(AppStatus.IDLE);
              }
          }
      };
      
      setStatus(AppStatus.SPEAKING);
      window.speechSynthesis.speak(utterance);
  };

  const getStatusText = () => {
      switch (status) {
          case AppStatus.LISTENING: return liveTranscript ? '...' : `Listening... Say your prompt followed by "${endPhrase}".`;
          case AppStatus.THINKING: return 'Thinking...';
          case AppStatus.SPEAKING: return 'AI is speaking...';
          case AppStatus.ERROR: return `Error: ${errorMessage}`;
          default: return hasApiKey() ? 'Ready. Click the mic or start typing.' : 'Please configure API Keys in Settings.';
      }
  }

  return (
    <div className="flex h-screen w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-sans transition-colors duration-300">
      {showEndPhraseModal && <WakeWordModal onSave={handleEndPhraseSave} initialWakeWord={endPhrase} />}
      {showSettingsModal && <SettingsModal 
        currentSettings={settings} 
        voices={voices} 
        onSave={handleSaveSettings} 
        onClose={() => setShowSettingsModal(false)}
        initialEndPhrase={endPhrase}
      />}
      {showHelpPanel && <HelpPanel isOpen={showHelpPanel} onClose={() => setShowHelpPanel(false)} />}
      
      <SidePanel 
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
            setActiveSessionId(id);
            if (window.innerWidth < 768) {
              setShowSidePanel(false); // Close panel on mobile after selection
            }
        }}
        onDeleteSession={handleDeleteSession}
        onUpdateSessionTitle={handleUpdateSessionTitle}
        isOpen={showSidePanel}
        isCollapsed={isSidePanelCollapsed}
        onClose={() => setShowSidePanel(false)}
      />

      <div className="flex flex-col flex-1 h-screen min-w-0">
          <header className="relative flex items-center justify-between p-2 md:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-indigo-700 dark:to-blue-600 flex-shrink-0 text-white shadow-md">
              <div className="flex items-center space-x-1 z-10">
                  <button 
                      onClick={handlePanelToggle} 
                      className="p-2 rounded-md hover:bg-white/10 transition-colors" 
                      title="Toggle Chat History"
                      aria-label="Toggle chat history"
                  >
                      {isSidePanelCollapsed ? <HistoryIcon className="h-6 w-6" /> : <ChevronLeftIcon className="h-6 w-6 hidden md:block" />}
                      {!isSidePanelCollapsed && <HistoryIcon className="h-6 w-6 md:hidden"/>}
                  </button>
                  <button
                      onClick={handleNewChatWithCleanup}
                      className="p-2 rounded-md hover:bg-white/10 transition-colors"
                      title="New Chat"
                      aria-label="Start new chat"
                  >
                      <svg className="h-6 w-6" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                          <polygon fill="currentColor" points="15,7 9,7 9,1 7,1 7,7 1,7 1,9 7,9 7,15 9,15 9,9 15,9" />
                      </svg>
                  </button>
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center flex justify-center items-center gap-2 pointer-events-none">
                <LogoIcon className="h-8 w-8 text-white"/>
                <h1 className="text-xl font-bold leading-tight truncate">Walkie Talkie AI Chat</h1>
              </div>

              <div className="flex items-center space-x-1 z-10">
                 <button 
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="p-2 rounded-md hover:bg-white/10 transition-colors" 
                    title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                  >
                    {theme === 'light' ? <NightIcon className="w-6 h-6" /> : <DayIcon className="w-6 h-6" />}
                  </button>
                  <button 
                    onClick={() => setShowHelpPanel(true)}
                    className="p-2 rounded-md hover:bg-white/10 transition-colors" 
                    title="Help"
                    aria-label="Open help panel"
                  >
                    <HelpIcon className="w-6 h-6"/>
                  </button>
                   <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="p-2 rounded-md hover:bg-white/10 transition-colors" 
                    title="Settings"
                    aria-label="Open settings"
                  >
                    <GearIcon className="w-6 h-6"/>
                  </button>
              </div>
          </header>

          <main className="flex-grow flex flex-col overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300">
              <div className="flex flex-col items-center justify-center p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
                  {settings.showVisualizer && (
                    <AudioVisualizer 
                      analyserNode={analyserNode} 
                      isSpeaking={status === AppStatus.SPEAKING} 
                      theme={theme}
                    />
                  )}
                  <p className={`text-sm text-gray-500 dark:text-gray-400 h-5 text-center ${settings.showVisualizer ? 'mt-2' : ''}`}>{getStatusText()}</p>
              </div>
              <ChatHistory 
                messages={activeSession?.history || []} 
                currentAiResponse={currentAiResponse} 
                liveTranscript={liveTranscript} 
                onCorrectTranscript={handleCorrectTranscript} 
                onReplayAudio={handleReplayAudio}
              />
              <InputBar 
                  text={inputText}
                  onTextChange={setInputText}
                  status={status}
                  isVoiceSessionActive={isVoiceSessionActive}
                  onSendMessage={sendMessage} 
                  onToggleListening={handleToggleListening}
                  onStopSpeaking={handleStopSpeaking}
              />
          </main>
      </div>
    </div>
  );
};

export default App;
