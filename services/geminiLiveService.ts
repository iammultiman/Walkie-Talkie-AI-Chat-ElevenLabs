import { GoogleGenAI, Modality } from "@google/genai";
import { base64ToUint8Array, uint8ArrayToBase64, convertFloat32ToInt16, pcmToAudioBuffer } from "../utils";

interface GeminiLiveManagerCallbacks {
    onTranscript: (text: string, isFinal: boolean) => void;
    onAudioStateChange: (isSpeaking: boolean, fullResponseText: string | null) => void;
    onError: (error: string) => void;
    onAnalyserNode: (node: AnalyserNode | null) => void;
    onTextChunk?: (text: string) => void;
    onUserActivity?: (isActive: boolean) => void;
}

export class GeminiLiveManager {
    private session: any = null;
    private mediaStream: MediaStream | null = null;
    private inputAudioContext: AudioContext | null = null;
    private outputAudioContext: AudioContext | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private nextStartTime: number = 0;
    private audioQueue: AudioBufferSourceNode[] = [];
    private aiFullResponse: string = '';
    private isCurrentlySpeaking: boolean = false;
    private lastUserTranscript: string = '';
    private userTranscriptBuffer: string = '';
    private transcriptTimer: ReturnType<typeof setTimeout> | null = null;
    private isMuted: boolean = false;

    constructor(
        private ai: GoogleGenAI,
        private callbacks: GeminiLiveManagerCallbacks
    ) {}

    async startSession(config: { voiceName: string, systemInstruction: string, pauseSensitivity: 'HIGH' | 'MEDIUM' | 'LOW', useGrounding?: boolean }) {
        if (this.session) {
            this.callbacks.onError("A session is already active.");
            return;
        }
        
        const validVoiceNames = [
            'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede', 'Callirrhoe', 
            'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina', 'Erinome', 
            'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux', 
            'Pulcherrima', 'Achird', 'Zubenelgenubi', 'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
        ];
        const voiceName = validVoiceNames.includes(config.voiceName) ? config.voiceName : 'Zephyr';
        
        if (voiceName !== config.voiceName) {
            console.warn(`Invalid voice name '${config.voiceName}', falling back to '${voiceName}'`);
        }

        try {
            const sessionConfig: any = {
                systemInstruction: { 
                    parts: [{ text: config.systemInstruction || "You are a helpful AI assistant. Keep your responses concise and conversational." }] 
                },
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: voiceName
                        }
                    }
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {}
            };

            if (config.useGrounding) {
                sessionConfig.tools = [{
                    googleSearch: {}
                }];
            }
            
            // Using the new native audio preview model
            this.session = await this.ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: sessionConfig,
                callbacks: {
                    onmessage: this.onMessage.bind(this),
                    onerror: (e: any) => this.callbacks.onError(e.message || "An unknown error occurred."),
                }
            });

            if (!this.session) {
                throw new Error("The AI service failed to establish a connection session.");
            }

            await this.setupMicrophone();

        } catch (e: any) {
            console.error('Gemini Live API connection failed:', e);
            this.callbacks.onError(`Failed to start Gemini session: ${e.message}.`);
            this.stopSession();
        }
    }

    private async setupMicrophone() {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);

        const highPassFilter = this.inputAudioContext.createBiquadFilter();
        highPassFilter.type = 'highpass';
        highPassFilter.frequency.value = 100;

        const compressor = this.inputAudioContext.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;

        this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
        this.scriptProcessor.onaudioprocess = this.processAudio.bind(this);
        
        const analyser = this.inputAudioContext.createAnalyser();
        analyser.fftSize = 512;

        source.connect(highPassFilter);
        highPassFilter.connect(compressor);
        compressor.connect(analyser);
        analyser.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.inputAudioContext.destination);

        this.callbacks.onAnalyserNode(analyser);
    }
    
    private processAudio(e: AudioProcessingEvent) {
        if (!this.session || this.isMuted) return;
        const pcmData = e.inputBuffer.getChannelData(0);
        const int16Buffer = convertFloat32ToInt16(pcmData);
        const base64Audio = uint8ArrayToBase64(new Uint8Array(int16Buffer));
        // @ts-ignore
        this.session.sendRealtimeInput({ media: { data: base64Audio, mimeType: 'audio/pcm;rate=16000' } });
    }

    private onMessage(message: any) {
        if (message.serverContent?.interrupted) {
            this.stopAllAudio();
            if (this.aiFullResponse.trim()) {
                this.callbacks.onAudioStateChange(false, this.aiFullResponse);
                this.aiFullResponse = '';
            }
            this.isCurrentlySpeaking = false;
            this.isMuted = false;
            return;
        }

        if (message.serverContent?.turnComplete) {
            this.isCurrentlySpeaking = false;
            this.isMuted = false;
            if (this.aiFullResponse.trim()) {
                this.callbacks.onAudioStateChange(false, this.aiFullResponse);
                this.aiFullResponse = '';
            }
        }

        if (message.serverContent?.inputTranscription) {
            const transcript = message.serverContent.inputTranscription.text?.trim();
            if (transcript) {
                if (this.isCurrentlySpeaking && this.userTranscriptBuffer === '') {
                    if (this.aiFullResponse.trim()) {
                        this.callbacks.onAudioStateChange(false, this.aiFullResponse);
                        this.aiFullResponse = '';
                    }
                    this.isCurrentlySpeaking = false;
                    this.isMuted = false;
                    if (this.callbacks.onUserActivity) {
                        this.callbacks.onUserActivity(true);
                    }
                }
                
                this.userTranscriptBuffer = transcript;
                
                if (this.transcriptTimer) {
                    clearTimeout(this.transcriptTimer);
                }
                
                this.transcriptTimer = setTimeout(() => {
                    if (this.userTranscriptBuffer && this.userTranscriptBuffer !== this.lastUserTranscript) {
                        this.lastUserTranscript = this.userTranscriptBuffer;
                        this.callbacks.onTranscript(this.userTranscriptBuffer, true);
                        this.userTranscriptBuffer = '';
                        if (this.callbacks.onUserActivity) {
                            this.callbacks.onUserActivity(false);
                        }
                    }
                }, 1500);
            }
        }

        if (message.serverContent?.outputTranscription) {
            const transcript = message.serverContent.outputTranscription.text;
            if (transcript && this.callbacks.onTextChunk) {
                if (this.aiFullResponse === '' && !this.isCurrentlySpeaking) {
                    this.isCurrentlySpeaking = true;
                    this.isMuted = true;
                    this.callbacks.onAudioStateChange(true, null);
                }
                
                this.callbacks.onTextChunk(transcript);
                this.aiFullResponse += transcript;
            }
        }

        const modelTurn = message.serverContent?.modelTurn;
        if (modelTurn?.parts) {
            for (const part of modelTurn.parts) {
                if (part.inlineData) {
                    const audioBytes = base64ToUint8Array(part.inlineData.data);
                    this.playAudio(audioBytes);
                    
                    if (!this.isCurrentlySpeaking) {
                        this.isCurrentlySpeaking = true;
                        this.isMuted = true;
                        this.aiFullResponse = '';
                        this.callbacks.onAudioStateChange(true, null);
                    }
                }
            }
        }

        const isTurnComplete = modelTurn?.turnComplete ?? false;
        if (isTurnComplete && this.isCurrentlySpeaking) {
            this.isCurrentlySpeaking = false;
            this.isMuted = false;
            if (this.aiFullResponse.trim()) {
                this.callbacks.onAudioStateChange(false, this.aiFullResponse);
                this.aiFullResponse = '';
            }
        }
    }

    private async playAudio(audioBytes: Uint8Array) {
        if (!this.outputAudioContext) {
            this.isCurrentlySpeaking = true;
            this.callbacks.onAudioStateChange(true, null);
            this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            this.nextStartTime = this.outputAudioContext.currentTime;
        }
        
        try {
            const audioBuffer = await pcmToAudioBuffer(audioBytes, this.outputAudioContext);
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputAudioContext.destination);
            
            const scheduledTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
            source.start(scheduledTime);

            this.nextStartTime = scheduledTime + audioBuffer.duration;
            this.audioQueue.push(source);
            source.onended = () => {
                this.audioQueue.shift();
            };

        } catch (e: any) {
            this.callbacks.onError(`Error playing audio: ${e.message}`);
        }
    }

    sendTextPrompt(prompt: string) {
        if (!this.session) {
            this.callbacks.onError("No active session to send prompt to.");
            return;
        }
        
        if (this.isCurrentlySpeaking && this.aiFullResponse.trim()) {
            this.callbacks.onAudioStateChange(false, this.aiFullResponse);
            this.aiFullResponse = '';
            this.isCurrentlySpeaking = false;
            this.isMuted = false;
        }
        
        // @ts-ignore
        this.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: prompt }] }], turnComplete: true });
        this.aiFullResponse = '';
    }
    
    private stopAllAudio() {
        this.audioQueue.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        this.audioQueue = [];
    }
    
    public interrupt() {
        this.stopAllAudio();
        if (this.isCurrentlySpeaking) {
            if (this.aiFullResponse.trim()) {
               this.callbacks.onAudioStateChange(false, this.aiFullResponse);
            } else {
               this.callbacks.onAudioStateChange(false, null);
            }
            this.aiFullResponse = '';
        }
        this.isCurrentlySpeaking = false;
        this.isMuted = false;
    }

    stopSession() {
        if (this.transcriptTimer) {
            clearTimeout(this.transcriptTimer);
            this.transcriptTimer = null;
        }
        if (this.session) {
            // @ts-ignore
            this.session.close();
            this.session = null;
        }
        if (this.scriptProcessor) {
            this.scriptProcessor.onaudioprocess = null;
            this.scriptProcessor = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
            this.inputAudioContext.close();
            this.inputAudioContext = null;
        }
        if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
            this.outputAudioContext.close();
            this.outputAudioContext = null;
        }
        this.isCurrentlySpeaking = false;
        this.isMuted = false;
        this.lastUserTranscript = '';
        this.userTranscriptBuffer = '';
        this.stopAllAudio();
        this.callbacks.onAnalyserNode(null);
    }
}
