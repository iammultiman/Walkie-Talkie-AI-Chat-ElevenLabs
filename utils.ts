/**
 * Calculates the Levenshtein distance between two strings.
 * This is a measure of the difference between two sequences.
 * @param a The first string.
 * @param b The second string.
 * @returns The Levenshtein distance.
 */
export const levenshteinDistance = (a: string, b: string): number => {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = new Array(bn + 1);
  for (let i = 0; i <= bn; ++i) {
    matrix[i] = new Array(an + 1);
  }
  for (let i = 0; i <= an; ++i) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= bn; ++j) {
    matrix[j][0] = j;
  }
  for (let j = 1; j <= bn; ++j) {
    for (let i = 1; i <= an; ++i) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  return matrix[bn][an];
};

// --- Audio Utilities ---

export const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

export const convertFloat32ToInt16 = (buffer: Float32Array): ArrayBuffer => {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
        buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
    }
    return buf.buffer;
};

export async function pcmToAudioBuffer(audioBytes: Uint8Array, audioContext: AudioContext): Promise<AudioBuffer> {
    // Ensure 16-bit alignment
    const int16Array = new Int16Array(audioBytes.buffer, audioBytes.byteOffset, audioBytes.length / 2);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }
    const audioBuffer = audioContext.createBuffer(1, float32Array.length, audioContext.sampleRate);
    audioBuffer.copyToChannel(float32Array, 0);
    return audioBuffer;
}
