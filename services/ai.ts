
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

export const getStoredGeminiKey = () => localStorage.getItem('gemini_api_key') || process.env.API_KEY;

export function initializeAi() {
    const key = getStoredGeminiKey();
    if (key) {
        try {
            ai = new GoogleGenAI({ apiKey: key });
            console.log("Gemini AI client initialized.");
        } catch (e) {
            console.error("Failed to initialize Gemini Client", e);
            ai = null;
        }
    } else {
        ai = null;
    }
}

// Initialize on load
initializeAi();

export function getAiClient(): GoogleGenAI | null {
    if (!ai) {
        initializeAi();
    }
    return ai;
}

export function hasApiKey(): boolean {
    return !!getStoredGeminiKey();
}

export function resetAiClient() {
    ai = null;
    initializeAi();
}
