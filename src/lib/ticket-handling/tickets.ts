// Ticket handling tasks: an original support ticket with the customer's
// account details. The candidate picks a category and priority, then writes
// the reply to the customer and an internal note for a colleague. There is
// no answer key in this public repo: the AI judges the choices against the
// ticket (src/lib/ticket-handling/review.ts). No imports on purpose: the
// page shows the tickets and the server marks against them.

export const TICKET_CATEGORIES = ["Billing", "Technical issue", "Account access", "Delivery", "Refund or return", "Complaint", "Product question", "Cancellation"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface SupportTicket {
  key: string;
  channel: "Email" | "Web form" | "App";
  customerName: string;
  subject: string;
  message: string;
  /** What the agent can see on the account. */
  accountInfo: string[];
}

export const TICKETS: readonly SupportTicket[] = [
  {
    key: "no-internet-wfh",
    channel: "Web form",
    customerName: "Ritu Sharma",
    subject: "Internet down since morning",
    message: "My broadband has not worked since 7 am. The router shows a red light. I work from home and have an important client call at 3 pm today. I have already restarted the router twice.",
    accountInfo: ["Plan: Fibre 100 Mbps, paid up to date.", "A fault is reported in her area; engineers expect it fixed by 1 pm.", "A free 4G dongle can be couriered within 3 hours in her city."],
  },
  {
    key: "duplicate-emi",
    channel: "Email",
    customerName: "Sanjay Kulkarni",
    subject: "EMI deducted twice",
    message: "My loan EMI of Rs 8,450 was taken twice from my account on 5th. Now my balance is low and my rent cheque may bounce. Please return the extra money.",
    accountInfo: ["Two debits of Rs 8,450 on the 5th are visible; one is a system duplicate.", "Reversals take 2-3 working days once raised.", "A no-bounce letter can be issued for his bank if needed."],
  },
  {
    key: "change-delivery-address",
    channel: "App",
    customerName: "Aisha Khan",
    subject: "Change address please",
    message: "Hi, I placed an order an hour ago (order KT-20931) but I have moved house. Can you change the delivery address to my new flat? It's not urgent, delivery is next week.",
    accountInfo: ["Order KT-20931 has not been packed yet.", "Address can be changed until packing starts.", "She must confirm the new address in the app or by replying with it in full."],
  },
  {
    key: "account-hacked",
    channel: "Email",
    customerName: "Vivek Menon",
    subject: "Someone else is using my account!!",
    message: "I got an email that my password was changed but I did not do it. I can't log in now. My card is saved in the account. Please help me fast.",
    accountInfo: ["Password changed 20 minutes ago from a new device in another city.", "One order was placed 10 minutes ago and is not yet shipped.", "Security process: lock the account, cancel unshipped orders, send a verified reset link to the registered email. Never ask for his password or card details."],
  },
  {
    key: "warranty-question",
    channel: "Web form",
    customerName: "Lakshmi Iyer",
    subject: "Is the battery covered?",
    message: "I bought your laptop 8 months ago. The battery now lasts only 2 hours. Is this covered under warranty, and how do I get it checked?",
    accountInfo: ["Purchase date confirms 8 months ago; standard warranty is 12 months.", "Battery is covered if health is below 80% within the warranty.", "She can book a free diagnosis at a service centre or a home pickup."],
  },
  {
    key: "rude-delivery-agent",
    channel: "Email",
    customerName: "Harpreet Gill",
    subject: "Very bad behaviour",
    message: "Your delivery man shouted at my elderly father today and threw the parcel at the door. The item is fine but this is unacceptable. I want action taken.",
    accountInfo: ["Delivery was today at 11:40 am by a partner courier.", "Complaints about courier staff go to the partner-quality team, who respond within 48 hours.", "You may add a Rs 200 goodwill credit."],
  },
  {
    key: "gym-cancel",
    channel: "App",
    customerName: "Karan Malhotra",
    subject: "Cancel membership",
    message: "I'm moving to another city next month so I want to cancel my gym membership from the 1st. Please confirm I won't be charged after that.",
    accountInfo: ["Monthly plan, renews on the 1st.", "Cancellation needs 7 days' notice; he is giving 12 days.", "No cancellation fee; he can pause instead if he may come back."],
  },
  {
    key: "wrong-medicine",
    channel: "Email",
    customerName: "Meenakshi Rao",
    subject: "Wrong medicine delivered",
    message: "The pharmacy order I got today has the wrong blood pressure tablets - a different strength from my prescription. My mother takes them every evening. What should I do?",
    accountInfo: ["Order shows the prescribed strength was 5 mg; 10 mg was packed by mistake.", "A correct replacement can reach her by 7 pm today by express delivery.", "Medical safety guidance: tell the customer not to take the wrong strength and to contact her doctor if a dose was already taken."],
  },
];

export function getTicket(key: string): SupportTicket | undefined {
  return TICKETS.find((t) => t.key === key);
}

export const REPLY_WORDS = { min: 30, max: 250 };
export const NOTE_WORDS = { min: 8, max: 120 };

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
