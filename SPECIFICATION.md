
# Technical Specification - Walkie Talkie AI Chat

## 1. Overview
Walkie Talkie AI Chat is a React-based single-page application (SPA) that interfaces with the Google Gemini API to provide a multimodal conversational experience. It prioritizes voice interaction, utilizing both standard Web Speech APIs and the advanced Gemini Live API for real-time audio streaming.

## 2. Architecture

### 2.1 Technology Stack
- **Frontend Framework**: React 18 (TypeScript)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **AI Integration**: `@google/genai` SDK
- **State Management**: React `useState` / `useRef` + `localStorage` for persistence.
- **Audio Processing**: Native Web Audio API (`AudioContext`, `ScriptProcessorNode`, `AnalyserNode`).

### 2.2 Application Structure
The application is client-side only. It does not require a dedicated backend server for logic, relying instead on the Google Gemini API for intelligence and the browser for speech processing.

- **`App.tsx`**: Main controller. Manages global state (sessions, settings, status) and coordinates between components.
- **`services/geminiLiveService.ts`**: Manages the WebSocket connection to Gemini Live. Handles PCM audio encoding/decoding and bi-directional streaming.
- **`services/geminiService.ts`**: Handles standard HTTP-based text generation and TTS requests.
- **`components/`**: UI components for Chat History, Input, Settings, Visualizer, etc.

## 3. Key Modules

### 3.1 Voice Interaction Managers

#### Browser Mode (Web Speech API)
- **Input**: Uses `window.SpeechRecognition` (or `webkitSpeechRecognition`).
- **End-of-Turn**: Implements a Levenshtein distance algorithm to detect a user-defined "wake word" (e.g., "over") at the end of a transcript.
- **Output**: Uses `window.speechSynthesis` for Text-to-Speech (TTS).

#### Gemini Live Mode (Native Audio)
- **Input**: Captures raw PCM audio from `navigator.mediaDevices.getUserMedia`.
- **Processing**: Downsamples audio to 16kHz, converts to 16-bit PCM, and streams via WebSocket.
- **Output**: Receives raw PCM audio chunks from Gemini. Queues them in an `AudioContext` buffer for seamless playback.
- **VAD (Voice Activity Detection)**: Handled server-side by the Gemini model.

### 3.2 Data Persistence
Data is stored in `localStorage` to persist state across reloads:
- `ai-chat-sessions`: JSON array of chat history.
- `ai-chat-settings`: User preferences (voice selection, model, system instructions).
- `ai-chat-theme`: Light/Dark mode preference.
- `ai-chat-end-phrase`: The keyword for Browser Mode.

### 3.3 Security
- **API Key**: The application expects the `API_KEY` to be injected via `process.env`.
- **No User Leakage**: Keys are not stored in `localStorage` or exposed in the UI.

## 4. Data Models

### ChatSession
```typescript
interface ChatSession {
    id: string;
    title: string;
    timestamp: number;
    history: ChatMessage[];
}
```

### ChatMessage
```typescript
interface ChatMessage {
    role: 'user' | 'model';
    parts: [{ text: string }];
    citations?: Citation[]; // For grounded responses
}
```

### Settings
```typescript
interface Settings {
    voiceService: 'browser' | 'gemini';
    selectedModel: string;
    useGrounding: boolean;
    systemInstruction: string;
    // ... specific voice configs
}
```

## 5. Future Extensibility
The modular design allows for future enhancements:
- **Multimodal Input**: Adding image/video upload support to the `geminiService`.
- **Tool Use**: Expanding `tools` configuration to support Function Calling beyond just Google Search.
- **PWA Support**: Adding a service worker for offline UI capability (though API requires network).
