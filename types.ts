
export enum AppStatus {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
}

export interface Citation {
    uri: string;
    title: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: [{ text: string }];
    citations?: Citation[];
}

export type GeminiPauseSensitivity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Settings {
    selectedVoiceURI: string | null; // For browser TTS
    selectedModel: string; // New field for AI model selection
    useGrounding: boolean;
    voiceService: 'browser' | 'gemini' | 'elevenlabs';
    geminiVoice: string; 
    elevenLabsVoiceId: string; // Voice ID for ElevenLabs
    geminiPauseSensitivity: GeminiPauseSensitivity;
    showVisualizer: boolean;
    systemInstruction: string;
}

export interface ChatSession {
    id: string;
    title: string;
    timestamp: number;
    history: ChatMessage[];
}

// --- Type definitions for Web Speech API ---
interface ISpeechRecognitionResult {
  isFinal: boolean;
  [key: number]: { transcript: string; };
}
interface ISpeechRecognitionResultList extends Array<ISpeechRecognitionResult> {
  item(index: number): ISpeechRecognitionResult;
}
interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: ISpeechRecognitionResultList;
}
interface ISpeechRecognitionErrorEvent {
    error: string;
    message: string;
}
export interface ISpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: ISpeechRecognitionEvent) => void) | null;
    onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}
