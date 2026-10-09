// Email writing tasks: an original customer email, the facts the agent has,
// and what a good reply must do. The candidate writes the reply; the AI marks
// it against these points (src/lib/email-writing/review.ts). No imports on
// purpose: the page shows the tasks and the server marks against them.

export interface EmailTask {
  key: string;
  title: string;
  /** The customer's email, as the candidate sees it. */
  customerEmail: string;
  /** What the agent knows or may offer (shown to the candidate). */
  facts: string[];
  /** What a strong reply must do (shown to the candidate and used for marking). */
  mustDo: string[];
}

export const EMAIL_TASKS: readonly EmailTask[] = [
  {
    key: "late-delivery",
    title: "A late delivery",
    customerEmail:
      "Subject: Where is my order?\n\nHi, I ordered a study table 9 days ago (order VK-48213). Your website said 5 days. I have called twice and nobody told me anything useful. I need it before my son's exams start on Monday. Please tell me what is going on.\n\nSunita Rao",
    facts: ["The table is at the local delivery hub.", "It is booked for delivery this Saturday between 10 am and 2 pm.", "You may offer free delivery on her next order."],
    mustDo: ["Apologise for the delay and the unhelpful calls", "Give the delivery day and time slot", "Offer free delivery on the next order", "Close politely with a way to get more help"],
  },
  {
    key: "double-charge",
    title: "Charged twice",
    customerEmail:
      "Subject: Charged two times!!\n\nI paid my mobile bill of Rs 649 once but the money has gone from my bank account two times. This is not acceptable. I want my money back today.\n\nImran Sheikh",
    facts: ["The second payment was a bank error, not a second bill.", "A refund of Rs 649 has been started.", "Refunds reach the bank in 5-7 working days."],
    mustDo: ["Acknowledge his frustration", "Confirm the extra Rs 649 will be refunded", "Explain honestly that it takes 5-7 working days (not today)", "Give a reference or a way to follow up"],
  },
  {
    key: "damaged-item",
    title: "A damaged item",
    customerEmail:
      "Subject: Broken mixer jar\n\nHello, my new mixer grinder arrived today and the big jar has a crack in it. I am very disappointed because this was a gift for my mother. What can you do?\n\nKavya Menon",
    facts: ["You can send a free replacement jar in 3 days.", "She does not need to return the cracked jar.", "She can choose a full refund instead if she prefers."],
    mustDo: ["Say sorry and show you understand it was a gift", "Offer the free replacement jar and the refund choice", "Say she does not need to return the cracked jar", "Ask her to reply with her choice"],
  },
  {
    key: "cancel-subscription",
    title: "Cancelling a subscription",
    customerEmail:
      "Subject: Cancel my plan\n\nPlease cancel my video streaming plan. It has become too expensive for me and I hardly watch anything now. Do not charge me again.\n\nRohan Das",
    facts: ["His next payment is due on the 15th.", "You may offer 3 months at half price.", "If he still wants to cancel, access continues until the 14th."],
    mustDo: ["Thank him for being a customer", "Offer 3 months at half price once, without pressure", "Explain how cancelling works and that he will not be charged again", "Say what happens to his access"],
  },
  {
    key: "password-locked",
    title: "Locked out of an account",
    customerEmail:
      "Subject: Can't log in\n\nI changed my phone and now I cannot log in to my banking app. It keeps asking for an OTP on my old number which I don't have anymore. I need to pay my rent tomorrow.\n\nAnil Kumar",
    facts: ["Phone numbers can only be changed at a branch or by video KYC.", "Video KYC takes about 10 minutes and is available 9 am to 9 pm.", "Never ask the customer for his password or OTP by email."],
    mustDo: ["Show you understand the rent is urgent", "Explain the video KYC option and its hours", "Mention the branch as another option", "Do not ask for any password, PIN or OTP"],
  },
  {
    key: "wrong-size",
    title: "Wrong size sent",
    customerEmail:
      "Subject: Wrong size\n\nI ordered size M shoes but you sent size L. I need them for a wedding next week. Please fix this fast.\n\nDeepa Joshi",
    facts: ["A courier can collect the size L pair tomorrow.", "The size M pair can be sent at the same time and will arrive in 2 days.", "There is no charge for the exchange."],
    mustDo: ["Apologise for the mistake", "Explain the free exchange: collection tomorrow and delivery in 2 days", "Reassure her it will arrive before the wedding", "End with a friendly close"],
  },
  {
    key: "refund-delay",
    title: "Waiting for a refund",
    customerEmail:
      "Subject: Refund still not received\n\nI returned a jacket three weeks ago and I still have not got my refund of Rs 2,199. Your message said 7 days. Why is it taking so long?\n\nVikram Singh",
    facts: ["The refund was sent to his bank 10 days ago (reference RF-77120).", "Some banks take up to 7 more working days.", "If it has not arrived in 7 working days, he can reply and you will raise it with the bank."],
    mustDo: ["Apologise for the long wait", "Give the date it was sent and the reference RF-77120", "Explain the bank's extra time honestly", "Tell him exactly what to do if it does not arrive"],
  },
  {
    key: "service-visit",
    title: "A missed service visit",
    customerEmail:
      "Subject: Technician did not come\n\nI took a half day off work yesterday because your technician was supposed to fix my AC between 2 and 6 pm. Nobody came and nobody called. This is the second time.\n\nMeera Pillai",
    facts: ["The technician's earlier job overran and the visit was missed.", "A senior technician can come tomorrow, first slot 9-11 am.", "You may waive the Rs 499 visit charge."],
    mustDo: ["Apologise sincerely and take ownership", "Offer the 9-11 am slot tomorrow with a senior technician", "Waive the Rs 499 visit charge", "Give a way to confirm or change the slot"],
  },
];

export function getEmailTask(key: string): EmailTask | undefined {
  return EMAIL_TASKS.find((t) => t.key === key);
}

export const MIN_REPLY_WORDS = 40;
export const MAX_REPLY_WORDS = 350;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
