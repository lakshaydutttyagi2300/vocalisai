// SpeechProvider contract. Every implementation (Groq, Google STT, Deepgram,
// Azure) must return this same shape so the assessment engine never contains
// provider-specific branching.
//
// @typedef {Object} TranscriptionResult
// @property {string} transcript
// @property {string|null} language
// @property {number|null} durationSeconds  - from the provider's own response, if available
// @property {string} providerName
// @property {string} model
// @property {number} latencyMs
// @property {unknown} raw - full raw provider response, kept for debugging/audit

/**
 * @param {{ audioBuffer: Buffer, filename: string, mimeType: string }} input
 * @returns {Promise<TranscriptionResult>}
 */
export async function transcribe(input) {
  throw new Error("transcribe() must be implemented by a concrete SpeechProvider");
}
