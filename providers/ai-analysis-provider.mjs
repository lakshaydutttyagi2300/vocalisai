// AIAnalysisProvider contract. Used ONLY for judgment tasks that genuinely
// need a language model: grammar, vocabulary, response quality/relevance,
// customer handling, empathy, professionalism, coaching suggestions.
//
// Never used for anything the application can calculate deterministically
// (duration, word count, WPM, filler/repetition counts, silence/pause
// metrics) - those live in application code, not here.
//
// @typedef {Object} AnalysisResult
// @property {object} result - structured JSON matching the assessment schema
// @property {{input: number, output: number, total: number}} tokenUsage - real counts from the provider response
// @property {string} providerName
// @property {string} model
// @property {number} latencyMs

/**
 * @param {{ transcript: string, context?: string }} input
 * @returns {Promise<AnalysisResult>}
 */
export async function analyzeSpeakingResponse(input) {
  throw new Error("analyzeSpeakingResponse() must be implemented by a concrete AIAnalysisProvider");
}
