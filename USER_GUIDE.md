
# User Guide - Walkie Talkie AI Chat

Welcome to the Walkie Talkie AI Chat! This application provides a unique, voice-first way to interact with advanced AI models. This guide will help you navigate the features and customize your experience.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Voice Interaction Modes](#voice-interaction-modes)
3. [Using the Interface](#using-the-interface)
4. [Settings & Customization](#settings--customization)
5. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites
- A modern web browser (Google Chrome, Microsoft Edge, or Safari are recommended).
- A microphone connected to your device.
- Speakers or headphones to hear the AI response.

### First Launch
1. Upon loading the app, you may be prompted to allow access to your microphone. Please **Allow** this permission for voice features to work.
2. If this is your first time, you will be asked to set an **End Phrase** (e.g., "over"). This is the magic word you say to tell the app you are done speaking.
3. **API Keys**: You can now enter your API keys directly in the Settings menu without needing to edit code or server files.

---

## Voice Interaction Modes

The app supports two distinct ways to talk to the AI, configurable in **Settings**.

### 1. Browser Mode (Default)
Uses your browser's built-in speech recognition and text-to-speech engines.
- **How it works**: 
  1. Click the microphone icon to start listening.
  2. Speak your prompt.
  3. Say your **End Phrase** (e.g., "What is the weather? Over").
  4. The app detects the end phrase, stops listening, and sends your text to the AI.
  5. The AI responds using a browser voice.
- **Best for**: Lower bandwidth environments, devices with good built-in speech recognition, or when you want specific local voices.

### 2. Gemini AI Mode (High Quality)
Uses Google's Gemini Live API for real-time audio streaming.
- **How it works**:
  1. Click the microphone icon to connect.
  2. Speak naturally. You **do not** need to say the end phrase in this mode.
  3. The AI listens for pauses in your speech (Voice Activity Detection) to determine when to reply.
  4. The AI responds with high-quality, human-like audio generated directly by the model.
- **Best for**: Natural, fluid conversations, complex queries, and experiencing the most realistic AI voices.

---

## Using the Interface

### The Control Bar
Located at the bottom of the screen:
- **Microphone Icon**: Toggles voice listening on/off. Red pulse indicates it is active.
- **Stop (Square) Icon**: Immediately stops audio playback and cancels the current turn. useful if the AI is talking too much.
- **Text Input**: You can type messages here if you prefer not to speak. Press **Enter** to send, or **Shift+Enter** for a new line.

### Chat History
- The main area displays the conversation bubble.
- **User messages** appear on the right (blue/purple).
- **AI responses** appear on the left (gray).
- **Icons on AI messages**: Hover over an AI message to see options:
  - **Copy**: Copy text to clipboard.
  - **Speaker**: Replay the audio for that specific message.

### Side Panel (History)
- **Desktop**: Click the chevron icon in the top-left to expand/collapse the sidebar.
- **Mobile**: Tap the history icon to open the drawer.
- **Features**:
  - **New Chat**: Click the "+" icon to start fresh.
  - **Select Chat**: Click any previous session to load it.
  - **Edit Title**: Click the pencil icon to rename a chat.
  - **Delete**: Click the trash icon to remove a chat.
  - **Export**: Click the arrow icon to copy the entire conversation transcript.

---

## Settings & Customization

Click the **Gear Icon** in the top-right header to access settings.

### API Configuration (New)
- **Google Gemini API Key**: Paste your key here to enable the app functionality.
- **ElevenLabs API Key**: Paste your key here to enable premium voices.
- *Keys are saved securely in your browser's local storage.*

### Voice Experience
- **Voice Service**: Switch between **Browser** and **Gemini AI** modes.
- **AI Model**: Select different Gemini models (e.g., Flash, Pro) depending on your needs for speed vs. intelligence.

### Browser Mode Options
- **Browser AI Voice**: Choose from the voices installed on your operating system.
- **End Phrase**: Change the keyword used to finish your turn (e.g., "done", "finished", "over").

### Gemini AI Mode Options
- **Gemini AI Voice**: Choose from premium voices like "Zephyr", "Nova", "Onyx", etc.
- **AI Pause Detection**: Adjust how quickly the AI responds after you stop speaking (Quick, Medium, Relaxed).

### General
- **Enable Web Search**: Allows the AI to use Google Search to answer questions about current events.
- **Show Audio Visualizer**: Toggles the waveform animation.
- **System Instruction**: Give the AI a persona! (e.g., "You are a pirate", "Explain things like I'm 5").

---

## Troubleshooting

- **"Microphone not found"**: Ensure your browser has permission to access the microphone. Check the address bar for a blocked camera/mic icon.
- **AI cuts me off**: In Gemini Mode, set **AI Pause Detection** to "Relaxed" in settings.
- **No Audio**: Check your device volume. If using Browser mode, try selecting a different voice in settings.
- **Network Errors**: Ensure you have a stable internet connection. If you are the developer, check that your `API_KEY` is valid.

For further assistance, please contact the developer via the links provided in the Help panel.
