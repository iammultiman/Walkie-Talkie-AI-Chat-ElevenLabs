
const BASE_URL = 'https://api.elevenlabs.io/v1';

const getApiKey = () => localStorage.getItem('elevenlabs_api_key') || process.env.ELEVEN_LABS_API_KEY;

export const isElevenLabsConfigured = () => !!getApiKey();

export interface ElevenLabsVoice {
    voice_id: string;
    name: string;
    preview_url: string;
}

/**
 * Fetches the list of available voices from ElevenLabs.
 */
export async function getElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("ElevenLabs API Key is missing. Please check settings or environment variables.");
    
    const response = await fetch(`${BASE_URL}/voices`, {
        headers: { 'xi-api-key': apiKey }
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.message || "Failed to fetch ElevenLabs voices");
    }
    
    const data = await response.json();
    return data.voices;
}

/**
 * Generates speech from text using ElevenLabs API.
 * Uses the turbo model for lower latency.
 */
export async function generateElevenLabsSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("ElevenLabs API Key is missing.");
    if (!voiceId) throw new Error("No ElevenLabs voice selected.");

    const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2", // Optimized for latency
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.message || "Failed to generate speech with ElevenLabs");
    }

    return await response.arrayBuffer();
}
