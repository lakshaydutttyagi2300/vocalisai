// Typing test passages: original customer-service emails, chat replies and
// ticket notes, the kind of text chat, email and back-office staff type all
// day. No imports on purpose: the typing page shows them and the server
// re-scores against the same text.

export interface TypingPassage {
  key: string;
  kind: "Email" | "Chat" | "Ticket note";
  text: string;
}

export const TYPING_PASSAGES: readonly TypingPassage[] = [
  {
    key: "email-refund",
    kind: "Email",
    text: "Dear Ms Fernandes, thank you for writing to us about your recent order. I am sorry to hear that the blender arrived with a cracked jar. I have arranged a full refund of Rs 2,499 to your original payment method, and you should see it in your account within five to seven working days. There is no need to return the damaged item. If there is anything else I can help you with, please reply to this email and I will be happy to assist. Kind regards, Customer Care Team",
  },
  {
    key: "chat-delivery",
    kind: "Chat",
    text: "Hi Rahul, thanks for waiting. I have checked your order and it left our warehouse this morning. The courier expects to deliver it tomorrow between 10 am and 2 pm. You will get a text message with a tracking link in the next hour. If you will not be at home, you can choose a new delivery date from that link. Is there anything else I can help you with today?",
  },
  {
    key: "ticket-password",
    kind: "Ticket note",
    text: "Customer called because she could not log in to her account after changing her phone number. Verified her identity with date of birth and the last four digits of her registered card. Updated the phone number on the account and sent a password reset link to her email address. Customer confirmed she received the link and logged in successfully. No further action needed. Ticket closed.",
  },
  {
    key: "email-billing",
    kind: "Email",
    text: "Hello Mr Thomas, thank you for contacting us about your March bill. I have looked into your account and can see that you were charged twice for the same data pack. I am sorry for the confusion this has caused. The extra charge of Rs 399 has now been reversed, and the credit will appear on your next bill. I have also added a note to your account so this does not happen again. Best wishes, Billing Support",
  },
  {
    key: "chat-plan",
    kind: "Chat",
    text: "Good evening Priya, I can help you with that. Your current plan gives you 2 GB of data per day for 28 days. The plan you asked about gives you 3 GB per day for the same price for the first three months, and then it costs Rs 50 more each month. Would you like me to switch your plan now, or would you prefer to think about it and come back later?",
  },
  {
    key: "ticket-replacement",
    kind: "Ticket note",
    text: "Customer reported that his washing machine stops in the middle of the spin cycle. Took him through the basic checks: the load was balanced, the drain filter was clean and the door was closed properly. The fault continued. Booked an engineer visit for Thursday between 9 am and 1 pm. Shared the booking reference and told the customer to keep the warranty card ready for the visit.",
  },
  {
    key: "email-delay",
    kind: "Email",
    text: "Dear Customer, we are writing to let you know that your order has been delayed because of heavy rain in your area. We now expect to deliver it on Saturday, two days later than planned. We understand how frustrating this is, and we have added a discount voucher worth Rs 200 to your account as an apology. You can use it on your next order at any time in the next ninety days. Thank you for your patience.",
  },
  {
    key: "chat-cancel",
    kind: "Chat",
    text: "I completely understand, Anjali, and I am sorry the service has not met your needs. Before I cancel your subscription, may I ask what made you decide to leave? If it is the price, I can offer you three months at half the cost. If you would still like to cancel, I can do that for you right now, and you will keep access until the end of this billing month.",
  },
  {
    key: "ticket-card",
    kind: "Ticket note",
    text: "Customer called to report a lost debit card. Confirmed identity with security questions. Blocked the card immediately and checked recent transactions with the customer; no unknown payments were found. Ordered a replacement card to the registered address, which should arrive within seven working days. Advised the customer to update the card details on any automatic payments once the new card arrives.",
  },
  {
    key: "email-feedback",
    kind: "Email",
    text: "Hi Arjun, thank you so much for your kind feedback about our support team. I have shared your message with Neha, who helped you last week, and she was delighted to hear it. We are always trying to improve, so comments like yours really help us. If you ever need anything else, you can reach us by chat, by email or by phone at any time of the day. Warm regards, Customer Experience Team",
  },
];

export function getTypingPassage(key: string): TypingPassage | undefined {
  return TYPING_PASSAGES.find((p) => p.key === key);
}
