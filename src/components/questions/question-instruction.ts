// One short, plain instruction line shown above every candidate question,
// so each task says what to do (listen, read, record, choose, type)
// instead of leaving the candidate to guess from the prompt alone.

import type { Stimulus } from "@/lib/question-stimulus";

export function questionInstruction(q: { category: string; stimulus?: Stimulus; isVoice: boolean; isChoice: boolean }): string {
  const listen = q.stimulus?.kind === "audio";
  const picture = q.stimulus?.kind === "image";

  if (q.isVoice) {
    if (picture) return "Picture task · Look at the scene, then record your spoken answer";
    switch (q.category) {
      case "READING":
        return "Read aloud · Record yourself reading the text clearly";
      case "PRONUNCIATION":
        return "Pronunciation · Record yourself saying the words clearly";
      case "CUSTOMER_SERVICE":
        return "Customer call · Respond to the customer out loud, as the agent";
      case "SUPERVISOR":
        return "Workplace conversation · Respond out loud to your supervisor";
      case "FLUENCY":
        return "Spontaneous response · Speak on the topic without stopping";
      case "INTERVIEW":
        return "Interview question · Record your spoken answer";
      default:
        return listen ? "Listen, then record your spoken answer" : "Speaking · Record your spoken answer";
    }
  }
  if (listen) return q.isChoice ? "Listening · Play the recording, then choose the best answer" : "Listening · Play the recording, then type your answer";
  if (q.isChoice) {
    switch (q.category) {
      case "GRAMMAR":
        return "Grammar · Choose the correct answer";
      case "VOCABULARY":
        return "Vocabulary · Choose the best word or meaning";
      case "READING_COMPREHENSION":
        return "Reading · Read the passage, then choose the best answer";
      case "SITUATIONAL_JUDGEMENT":
        return "Workplace scenario · Choose the best response";
      default:
        return "Choose the best answer";
    }
  }
  if (q.category === "WRITING") return "Writing · Type your answer in the box";
  if (q.category === "INTERVIEW") return "Interview question · Type your answer as you would say it";
  if (q.category === "CUSTOMER_SERVICE") return "Customer message · Type your reply as the agent";
  if (q.category === "SITUATIONAL_JUDGEMENT") return "Workplace scenario · Type how you would respond";
  return "Type your answer in the box";
}
