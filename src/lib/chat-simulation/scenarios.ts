// Live chat simulation scenarios: the customer's opening message, the facts
// the agent has and what a strong chat does. Original situations from
// everyday chat-support work. No imports on purpose: the page shows them.
// How the AI customer behaves is in ./briefs.ts, used only on the server.

export interface ChatScenario {
  key: string;
  title: string;
  customerName: string;
  opening: string;
  facts: string[];
  mustDo: string[];
}

export const CHAT_SCENARIOS: readonly ChatScenario[] = [
  {
    key: "refund-status",
    title: "Where is my refund?",
    customerName: "Neha",
    opening: "hi i returned a dress 12 days back and still no refund. order DR-5521. whats happening??",
    facts: ["The return reached the warehouse 9 days ago.", "Refund of Rs 1,799 was sent to her bank 2 days ago, reference RF-30918.", "Banks take up to 5 working days to show it."],
    mustDo: ["Greet her and say sorry for the wait", "Give the date it was sent, the amount and the reference", "Explain the bank's time honestly", "Check if anything else is needed and close politely"],
  },
  {
    key: "wrong-bill",
    title: "A bill that looks wrong",
    customerName: "Farhan",
    opening: "My broadband bill is Rs 1,180 this month. It is always Rs 999. Why are you overcharging me?",
    facts: ["Rs 999 is the plan price; Rs 180 is 18% GST, which is now shown separately.", "Nothing extra was charged; the total paid last month was also Rs 1,180.", "You can email him a bill breakdown."],
    mustDo: ["Stay calm and polite", "Explain the GST part simply and correctly", "Reassure him he was not overcharged", "Offer the bill breakdown by email"],
  },
  {
    key: "angry-delay",
    title: "An angry customer",
    customerName: "Arjun",
    opening: "This is the THIRD time I'm chatting about my fridge delivery. Nobody does anything. I want to speak to a manager NOW.",
    facts: ["The fridge (order FR-7710) missed two slots because the delivery van was full.", "It is now confirmed on the first van tomorrow, 8-11 am.", "You can add a Rs 500 voucher for the trouble.", "A supervisor can call back within 2 hours if he still wants one."],
    mustDo: ["Apologise and acknowledge his frustration without arguing", "Give the confirmed slot and the voucher", "Offer the supervisor call-back honestly", "Stay calm and professional the whole time"],
  },
  {
    key: "card-blocked",
    title: "Card not working abroad",
    customerName: "Priya",
    opening: "Hello, I'm in Dubai and my debit card is getting declined at every shop. I have no cash. Please help urgently!",
    facts: ["International use is switched off on her card by default.", "She can switch it on herself in the mobile app: Cards > Manage > International use.", "You must never ask for the card number, PIN, CVV or OTP in chat."],
    mustDo: ["Respond quickly and calmly to the urgency", "Explain how to switch on international use in the app", "Do not ask for card number, PIN, CVV or OTP", "Confirm it worked or offer more help"],
  },
  {
    key: "plan-upgrade",
    title: "Choosing a plan",
    customerName: "Rahul",
    opening: "hey, my mobile data finishes in like 10 days every month. which plan should i take?",
    facts: ["He is on the 1.5 GB/day plan at Rs 299 for 28 days.", "The 2.5 GB/day plan costs Rs 349 for 28 days.", "There is a Rs 399 plan with 3 GB/day plus a streaming app."],
    mustDo: ["Ask or check how he uses data before recommending", "Explain the options clearly with prices", "Recommend one plan with a reason, without pushing the most expensive", "Explain how to change the plan"],
  },
  {
    key: "login-otp",
    title: "No OTP arriving",
    customerName: "Mr Iyer",
    opening: "Good afternoon. I am trying to log in to my insurance account but the OTP is not coming to my phone. I need to download my policy today.",
    facts: ["OTPs can take up to 2 minutes; the 'Resend OTP' button appears after 60 seconds.", "His registered number ends in 4471.", "He can also get the policy PDF by email if his registered email is correct (it ends in @gmail.com)."],
    mustDo: ["Be polite and patient (an older, formal customer)", "Confirm the registered number ending only, never the full number", "Give the resend tip and the email option", "Make sure he gets the policy today"],
  },
];

export function getChatScenario(key: string): ChatScenario | undefined {
  return CHAT_SCENARIOS.find((s) => s.key === key);
}

/** The agent's replies per chat; the chat can end earlier. */
export const MAX_AGENT_MESSAGES = 6;
export const MAX_MESSAGE_CHARS = 800;
/** A reply faster than this is good chat-process practice. */
export const TARGET_REPLY_SECONDS = 60;
