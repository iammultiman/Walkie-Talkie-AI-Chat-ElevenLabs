
import { GenerateContentResponse, Modality } from "@google/genai";
import { Settings, ChatMessage } from "../types";
import { getAiClient } from './ai';

const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Generates a streaming response from the AI model.
 * @param history The conversation history.
 * @param settings The user settings, used to determine if grounding should be enabled and which model to use.
 * @returns A promise that resolves to the async generator for the streaming response.
 */
export function generateResponseStream(
    history: ChatMessage[],
    settings: Settings
): Promise<AsyncGenerator<GenerateContentResponse>> {
    const ai = getAiClient();
    if (!ai) {
        throw new Error("Gemini AI client not initialized. Check API_KEY.");
    }
    
    const config: any = {
        // Use setting or a default. Empty string is a valid (no-op) instruction.
        systemInstruction: settings.systemInstruction || "You are a helpful AI assistant. Keep your responses concise and conversational.",
    };

    if (settings.useGrounding) {
        config.tools = [{ googleSearch: {} }];
    }

    // Use the selected model from settings, fallback to default if missing
    const model = settings.selectedModel || DEFAULT_MODEL;

    return ai.models.generateContentStream({
        model: model,
        contents: history,
        config: config,
    });
}

/**
 * Generates a short, descriptive title for a chat session.
 * @param prompt The first user message in the chat.
 * @returns A promise that resolves to the generated title string.
 */
export async function generateChatTitle(prompt: string): Promise<string> {
    const ai = getAiClient();
    if (!ai) return "New Chat";
    try {
        const response = await ai.models.generateContent({
            model: DEFAULT_MODEL, // Use the fast/cheap model for titles
            contents: `Generate a very short, concise title (4 words maximum) for the following user prompt. Do not use quotation marks or any introductory text like "Title:". Just return the title itself.\n\nPrompt: "${prompt}"`,
        });
        return response.text?.trim() || "New Chat";
    } catch (error) {
        console.error("Error generating chat title:", error);
        return "New Chat";
    }
}

/**
 * Generates speech from text using Gemini TTS.
 * @param text The text to speak.
 * @param voiceName The voice to use.
 * @returns The base64 encoded audio data.
 */
export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAiClient();
    if (!ai) throw new Error("AI Client not initialized");

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
                },
            },
        },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("No audio data received from Gemini TTS");
    return audioData;
}
