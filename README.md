
# Walkie Talkie AI Chat

A voice-enabled, turn-based AI chat assistant that simulates a walkie-talkie experience using the Gemini API and optional ElevenLabs integration.

## Features

- **Voice Interaction**: Talk to the AI naturally using your microphone.
- **Wake/End Word**: Use customizable phrases like "over" to signal the end of your turn.
- **Gemini Live**: Low-latency, real-time voice conversations using Gemini's native audio capabilities.
- **ElevenLabs Integration**: Use premium, high-quality AI voices for responses.
- **Chat History**: Visual chat interface with Markdown support and history management.
- **Audio Visualizer**: Real-time visual feedback for audio input and output.
- **Bring Your Own Key**: Securely input API keys directly in the settings or via environment variables.

## Configuration

### API Key Setup

You can configure API keys in two ways:

#### Option 1: In App Settings (Recommended for quick start)
1. Open the app in your browser.
2. Click the **Gear Icon** (Settings) in the top right.
3. Paste your keys into the "API Configuration" section.
   - **Google Gemini API Key**: Required for intelligence.
   - **ElevenLabs API Key**: Optional, for premium voices.
4. Keys are stored securely in your browser's local storage and are never sent to a backend server (this app is client-only).

#### Option 2: Environment Variables (Recommended for deployment)
Create a `.env` file in the root directory:
```bash
API_KEY=your_google_ai_studio_key
ELEVEN_LABS_API_KEY=your_eleven_labs_key
```

1. **Obtain Google Key**: [Google AI Studio](https://aistudio.google.com/apikey).
2. **Obtain ElevenLabs Key**: [ElevenLabs](https://elevenlabs.io/).

## Installation & Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## Requirements

- Node.js installed on your machine.
- A supported browser (Chrome, Edge, Safari) for Web Speech API and AudioContext support.

## 👨‍💻 Developer & Architect

**Matthew Anorkplim Loh**  
*Solutions Architect*  
[Contact via Gravatar](https://gravatar.com/iammultiman)

Matthew designed this app to aid persons that are partially speech impaired to interact effectively with the AI via voice chat. It also works excellently for any regular voice chat user. The code can also be extended as the voice chat component of a larger app with more functionality.

## Documentation

- [User Guide](USER_GUIDE.md)
- [Technical Specification](SPECIFICATION.md)
