// The jobs a candidate can prepare for, each with the practice that matters
// for it. No imports on purpose: browser code may use this. Links point at
// existing practice pages (practice modes, skill areas, AI conversations,
// mock exams), so a role page only arranges what already exists.

export type RoleStep =
  | { kind: "mode"; slug: string; label: string; why: string } // /practice/<slug>
  | { kind: "subject"; slug: string; label: string; why: string } // /explore/skills/<slug>
  | { kind: "talk"; role: "CUSTOMER" | "INTERVIEWER" | "SUPERVISOR"; label: string; why: string } // live AI conversation
  | { kind: "mock"; label: string; why: string } // the mock exam page
  | { kind: "typing"; label: string; why: string }; // /practice/typing

export type JobRole = { slug: string; title: string; group: RoleGroupId; summary: string; steps: RoleStep[] };

export const ROLE_GROUPS = [
  { id: "bpo", name: "Customer service and BPO (voice)" },
  { id: "banking", name: "Banking and finance" },
  { id: "insurance", name: "Insurance" },
  { id: "nonvoice", name: "Non-voice and back office" },
  { id: "accounts", name: "Accounts" },
  { id: "graduate", name: "Freshers and graduates" },
  { id: "communication", name: "Communication-heavy jobs" },
] as const;
export type RoleGroupId = (typeof ROLE_GROUPS)[number]["id"];

export function stepHref(step: RoleStep): string {
  switch (step.kind) {
    case "mode":
      return `/practice/${step.slug}`;
    case "subject":
      return `/explore/skills/${step.slug}`;
    case "talk":
      return `/practice/conversation?role=${step.role}`;
    case "mock":
      return "/mock-tests";
    case "typing":
      return "/practice/typing";
  }
}

// Reusable steps, so every role describes the same practice the same way.
const S = {
  customerCall: { kind: "talk", role: "CUSTOMER", label: "Live call with an AI customer", why: "Handle a real back-and-forth with a customer and get feedback." },
  serviceRoleplay: { kind: "mode", slug: "customer-service", label: "Customer-service role-play", why: "Practise greeting, empathy, solving and closing a call." },
  pronunciation: { kind: "mode", slug: "pronunciation", label: "Pronunciation", why: "Be easy to understand on the phone." },
  fluency: { kind: "mode", slug: "fluency", label: "Fluency", why: "Speak smoothly, without long pauses." },
  readAloud: { kind: "mode", slug: "reading", label: "Read aloud", why: "Voice tests often start with reading sentences aloud." },
  speaking: { kind: "mode", slug: "speaking", label: "Speaking", why: "Answer on the spot, clearly and in full sentences." },
  listening: { kind: "subject", slug: "listening", label: "Listening", why: "Understand customers, accents and instructions first time." },
  judgement: { kind: "subject", slug: "situational-judgement", label: "Situational judgement", why: "Pick the right action in workplace situations, as hiring tests ask." },
  grammar: { kind: "mode", slug: "grammar", label: "Grammar", why: "Correct English for speaking, emails and written tests." },
  vocabulary: { kind: "mode", slug: "vocabulary", label: "Vocabulary", why: "The right word for a professional conversation." },
  writing: { kind: "mode", slug: "writing", label: "Writing", why: "Clear, polite written replies, as emails and chats need." },
  workplaceComms: { kind: "subject", slug: "business-communication", label: "Workplace communication", why: "Tone, register and clear messages at work." },
  detail: { kind: "subject", slug: "attention-to-detail", label: "Attention to detail", why: "Spot errors and mismatches quickly, as back-office tests ask." },
  reading: { kind: "subject", slug: "reading-comprehension", label: "Reading comprehension", why: "Read passages, policies and emails accurately." },
  quant: { kind: "mode", slug: "numerical-aptitude", label: "Quantitative aptitude", why: "The numbers section of most hiring tests." },
  reasoning: { kind: "mode", slug: "logical-reasoning", label: "Logical reasoning", why: "Puzzles, series and arrangements from aptitude rounds." },
  verbal: { kind: "subject", slug: "verbal-ability", label: "Verbal ability", why: "The English section of aptitude rounds." },
  critical: { kind: "subject", slug: "critical-thinking", label: "Critical thinking", why: "Judge arguments and evidence, as graduate tests ask." },
  dataInterp: { kind: "subject", slug: "data-interpretation", label: "Data interpretation", why: "Read tables and charts under time pressure." },
  abstract: { kind: "subject", slug: "abstract-reasoning", label: "Abstract reasoning", why: "Pattern questions used by SHL-style tests." },
  bankingOps: { kind: "subject", slug: "banking-operations", label: "Banking operations", why: "Accounts, payments, KYC and everyday banking." },
  markets: { kind: "subject", slug: "financial-markets", label: "Financial markets", why: "Shares, demat, mutual funds and trading basics." },
  insurance: { kind: "subject", slug: "insurance", label: "Insurance principles", why: "Policies, premiums, claims and insurance terms." },
  accounting: { kind: "subject", slug: "accounting", label: "Accounting", why: "Entries, ledgers and statements." },
  laws: { kind: "subject", slug: "business-laws", label: "Business laws", why: "Contracts and company law basics." },
  economics: { kind: "subject", slug: "business-economics", label: "Business economics", why: "Demand, costs and markets." },
  interviewQs: { kind: "mode", slug: "interview", label: "Interview questions", why: "Practise answers to the questions you will be asked." },
  interview: { kind: "talk", role: "INTERVIEWER", label: "Live AI mock interview", why: "A real interview with an AI interviewer, then feedback." },
  supervisor: { kind: "talk", role: "SUPERVISOR", label: "Conversation with an AI manager", why: "Handle updates, feedback and difficult talks with a manager." },
  mockSupport: { kind: "mock", label: "Customer Support English Assessment", why: "A full timed test like a BPO hiring round, with a score report." },
  mockAptitude: { kind: "mock", label: "Aptitude Screening or Graduate Recruitment Assessment", why: "A full timed aptitude test like a company's first round." },
  typing: { kind: "typing", label: "Typing test", why: "Chat, email and back-office jobs test typing speed and accuracy." },
  mockWorkplace: { kind: "mock", label: "Workplace Communication Assessment", why: "A full timed English test for office jobs, with a score report." },
} satisfies Record<string, RoleStep>;

const voice = (extra: RoleStep[] = []): RoleStep[] => [S.customerCall, S.serviceRoleplay, ...extra, S.listening, S.pronunciation, S.judgement, S.mockSupport, S.interview];
const graduate = (extra: RoleStep[] = []): RoleStep[] => [S.quant, S.reasoning, S.verbal, ...extra, S.mockAptitude, S.interviewQs, S.interview];
const office = (extra: RoleStep[] = []): RoleStep[] => [...extra, S.typing, S.workplaceComms, S.writing, S.grammar, S.judgement, S.mockWorkplace, S.interview];
const spoken = (extra: RoleStep[] = []): RoleStep[] => [...extra, S.speaking, S.fluency, S.pronunciation, S.judgement, S.interviewQs, S.interview];

export const JOB_ROLES: JobRole[] = [
  // Customer service and BPO
  { slug: "customer-support-executive", title: "Customer Support Executive", group: "bpo", summary: "Answer customer calls, solve problems and keep customers happy.", steps: voice([S.fluency]) },
  { slug: "customer-service-representative", title: "Customer Service Representative", group: "bpo", summary: "The first voice customers hear: questions, orders and complaints.", steps: voice([S.fluency]) },
  { slug: "customer-care-executive", title: "Customer Care Executive", group: "bpo", summary: "Help customers with accounts, orders and service requests by phone.", steps: voice([S.fluency]) },
  { slug: "international-voice-process-associate", title: "International Voice Process Associate", group: "bpo", summary: "Take calls from customers in the US, UK or Australia, with clear neutral English.", steps: voice([S.readAloud, S.fluency, S.vocabulary]) },
  { slug: "technical-support-associate", title: "Technical Support Associate (L1)", group: "bpo", summary: "Walk customers through simple fixes, calmly and step by step.", steps: voice([S.reasoning]) },
  { slug: "retention-specialist", title: "Retention Expert / Retention Specialist", group: "bpo", summary: "Talk customers out of cancelling by understanding and solving their reason.", steps: voice([S.speaking]) },
  { slug: "escalations-executive", title: "Customer Complaints / Escalations Executive", group: "bpo", summary: "Handle upset customers and complaints others could not solve.", steps: voice([S.supervisor]) },
  { slug: "inbound-call-centre-agent", title: "Inbound Call Centre Agent", group: "bpo", summary: "Take incoming calls and solve each one on the first call.", steps: voice() },
  { slug: "help-desk-associate", title: "Help Desk / Service Desk Associate", group: "bpo", summary: "Log, solve and route requests from customers or staff.", steps: voice([S.writing]) },
  { slug: "customer-experience-associate", title: "Customer Experience Associate", group: "bpo", summary: "Make every customer contact smooth, by phone and in writing.", steps: voice([S.writing]) },
  { slug: "telecaller", title: "Telecaller (service and follow-up calls)", group: "bpo", summary: "Make follow-up, reminder and confirmation calls clearly and politely.", steps: voice([S.fluency]) },
  { slug: "bpo-quality-analyst", title: "Quality Analyst, BPO", group: "bpo", summary: "Listen to calls, score them and coach agents to improve.", steps: [S.listening, S.judgement, S.serviceRoleplay, S.writing, S.supervisor, S.mockSupport, S.interview] },
  { slug: "bpo-team-leader", title: "Team Leader, BPO", group: "bpo", summary: "Lead a team of agents: targets, feedback and difficult conversations.", steps: [S.supervisor, S.judgement, S.workplaceComms, S.customerCall, S.speaking, S.mockSupport, S.interview] },
  { slug: "onboarding-executive", title: "Customer Onboarding / Welcome Call Executive", group: "bpo", summary: "Welcome new customers, explain the product and set them up.", steps: voice([S.speaking]) },
  { slug: "ecommerce-support-executive", title: "E-commerce / Order Support Executive", group: "bpo", summary: "Help shoppers with orders, deliveries, returns and refunds.", steps: voice([S.writing]) },
  { slug: "travel-call-centre-agent", title: "Travel and Airline Call Centre Agent", group: "bpo", summary: "Book, change and cancel travel for callers, and handle delays.", steps: voice([S.fluency]) },
  { slug: "telecom-support-executive", title: "Telecom Customer Support Executive", group: "bpo", summary: "Help mobile and broadband customers with plans, bills and faults.", steps: voice([S.reasoning]) },
  { slug: "billing-support-executive", title: "Utility / Billing Support Executive", group: "bpo", summary: "Explain bills, take payments and sort out billing complaints.", steps: voice([S.quant]) },

  // Banking and finance
  { slug: "phone-banking-officer", title: "Phone Banking Officer", group: "banking", summary: "Help bank customers by phone with accounts, cards and transactions.", steps: voice([S.bankingOps]) },
  { slug: "bank-customer-service-officer", title: "Bank Customer Service Officer", group: "banking", summary: "Serve customers at the branch or by phone, from KYC to complaints.", steps: [S.bankingOps, S.customerCall, S.serviceRoleplay, S.listening, S.judgement, S.interview] },
  { slug: "relationship-officer", title: "Relationship Officer / Relationship Executive", group: "banking", summary: "Look after a set of customers and recommend the right products.", steps: [S.markets, S.customerCall, S.speaking, S.judgement, S.interviewQs, S.interview] },
  { slug: "bank-clerk", title: "Bank Clerk / Customer Service Associate", group: "banking", summary: "Everyday branch banking, plus the aptitude test banks use to hire.", steps: [S.bankingOps, S.quant, S.reasoning, S.verbal, S.interview] },
  { slug: "banking-operations-associate", title: "Banking Operations Associate", group: "banking", summary: "Process payments, accounts and checks accurately in the back office.", steps: [S.bankingOps, S.detail, S.quant, S.dataInterp, S.workplaceComms, S.interview] },
  { slug: "credit-card-support-executive", title: "Credit Card Customer Support Executive", group: "banking", summary: "Help card holders with bills, limits, disputes and blocked cards.", steps: voice([S.bankingOps]) },
  { slug: "collections-executive", title: "Collections Executive (soft collections)", group: "banking", summary: "Remind customers about payments politely and agree a plan.", steps: voice([S.speaking]) },
  { slug: "demat-support-executive", title: "Stock-broking / Demat Support Executive", group: "banking", summary: "Help investors with demat accounts, orders and market basics.", steps: voice([S.markets]) },
  { slug: "loan-processing-officer", title: "Loan Processing Officer", group: "banking", summary: "Check loan applications and documents, and keep customers updated.", steps: [S.bankingOps, S.detail, S.quant, S.customerCall, S.writing, S.interview] },
  { slug: "kyc-verification-executive", title: "KYC / Verification Executive", group: "banking", summary: "Verify customer documents and details accurately.", steps: [S.bankingOps, S.detail, S.reading, S.customerCall, S.judgement, S.interview] },
  { slug: "mutual-fund-support-executive", title: "Mutual Fund / Investment Support Executive", group: "banking", summary: "Help investors with SIPs, redemptions and statements.", steps: voice([S.markets]) },
  { slug: "branch-operations-executive", title: "Branch Operations Executive", group: "banking", summary: "Run daily branch work: cash, accounts, records and customers.", steps: [S.bankingOps, S.detail, S.serviceRoleplay, S.workplaceComms, S.judgement, S.interview] },

  // Insurance
  { slug: "insurance-advisor", title: "Insurance Advisor / Agent", group: "insurance", summary: "Explain policies, find the right cover and support clients.", steps: [S.insurance, S.customerCall, S.speaking, S.judgement, S.interviewQs, S.interview] },
  { slug: "insurance-customer-support", title: "Insurance Customer Support Executive", group: "insurance", summary: "Answer policy holders' questions about cover, premiums and renewals.", steps: voice([S.insurance]) },
  { slug: "claims-support-associate", title: "Claims Support Associate", group: "insurance", summary: "Guide customers through claims and check documents carefully.", steps: [S.insurance, S.detail, S.customerCall, S.writing, S.judgement, S.interview] },
  { slug: "policy-servicing-executive", title: "Policy Servicing Executive", group: "insurance", summary: "Update policies, process changes and reply to customers.", steps: [S.insurance, S.detail, S.writing, S.workplaceComms, S.judgement, S.interview] },
  { slug: "health-insurance-support", title: "Health Insurance Support / TPA Executive", group: "insurance", summary: "Help policy holders and hospitals with cashless claims and approvals.", steps: voice([S.insurance]) },
  { slug: "insurance-renewals-executive", title: "Insurance Renewals Executive", group: "insurance", summary: "Call customers before their policy ends and help them renew.", steps: voice([S.insurance, S.speaking]) },

  // Non-voice and back office
  { slug: "email-support-executive", title: "Email Support Executive", group: "nonvoice", summary: "Answer customers by email: clear, correct and polite.", steps: office([S.reading]) },
  { slug: "chat-support-executive", title: "Chat Support Executive", group: "nonvoice", summary: "Help customers by live chat, quickly and in correct English.", steps: office([S.reading, S.vocabulary]) },
  { slug: "back-office-executive", title: "Back-Office Executive", group: "nonvoice", summary: "Process records and requests accurately behind the scenes.", steps: office([S.detail, S.dataInterp]) },
  { slug: "data-entry-operator", title: "Data Entry Operator", group: "nonvoice", summary: "Enter and check data accurately and fast.", steps: [S.typing, S.detail, S.reading, S.grammar, S.quant, S.judgement, S.interview] },
  { slug: "admin-executive", title: "Admin / Office Executive", group: "nonvoice", summary: "Run the office: emails, schedules, records and people.", steps: office([S.detail]) },
  { slug: "front-office-receptionist", title: "Front Office / Receptionist", group: "nonvoice", summary: "Greet visitors, answer calls and keep the front desk running.", steps: spoken([S.customerCall]) },
  { slug: "executive-assistant", title: "Executive Assistant / Personal Assistant", group: "nonvoice", summary: "Manage a manager's emails, calendar, calls and documents.", steps: office([S.detail, S.supervisor]) },
  { slug: "mis-executive", title: "MIS Executive", group: "nonvoice", summary: "Prepare reports from data and spot the numbers that matter.", steps: [S.dataInterp, S.detail, S.typing, S.quant, S.workplaceComms, S.interview] },
  { slug: "content-moderator", title: "Content Moderator", group: "nonvoice", summary: "Review posts and content against rules, quickly and fairly.", steps: [S.reading, S.judgement, S.critical, S.detail, S.writing, S.interview] },

  // Accounts
  { slug: "accounts-assistant", title: "Accounts Assistant / Junior Accountant", group: "accounts", summary: "Keep the books: entries, ledgers, reconciliation and reports.", steps: [S.accounting, S.laws, S.economics, S.quant, S.detail, S.interview] },
  { slug: "accounts-payable-receivable", title: "Accounts Payable / Receivable Associate", group: "accounts", summary: "Process invoices and payments and follow up with vendors and customers.", steps: [S.accounting, S.detail, S.quant, S.writing, S.workplaceComms, S.interview] },

  // Freshers and graduates
  { slug: "graduate-engineer-trainee", title: "Graduate Engineer Trainee (TCS, Infosys, Wipro, Accenture...)", group: "graduate", summary: "The aptitude, English and interview rounds of IT services hiring. Coding rounds are not covered.", steps: graduate([S.reading]) },
  { slug: "big4-associate", title: "Associate / Analyst Trainee (Deloitte, PwC, EY, KPMG)", group: "graduate", summary: "The aptitude and reasoning tests Big 4 firms use, then the interview.", steps: graduate([S.critical, S.dataInterp, S.judgement]) },
  { slug: "management-trainee", title: "Management Trainee", group: "graduate", summary: "Graduate aptitude, judgement and a confident interview.", steps: graduate([S.critical, S.judgement, S.writing]) },
  { slug: "business-analyst-trainee", title: "Business Analyst Trainee", group: "graduate", summary: "Read data, reason clearly and explain what you found.", steps: graduate([S.dataInterp, S.critical]) },
  { slug: "process-associate", title: "Process Associate (Genpact, WNS, EXL...)", group: "graduate", summary: "The aptitude, English and communication rounds of process hiring.", steps: graduate([S.detail, S.workplaceComms]) },
  { slug: "operations-executive", title: "Operations Executive / Associate", group: "graduate", summary: "Keep work moving accurately, with numbers and clear communication.", steps: graduate([S.detail, S.dataInterp]) },
  { slug: "graduate-trainee", title: "Graduate Trainee", group: "graduate", summary: "Any corporate graduate hiring: aptitude, English and interview.", steps: graduate([S.abstract, S.judgement]) },
  { slug: "customer-success-associate", title: "Customer Success Associate", group: "graduate", summary: "Help business customers get value from a software product.", steps: [S.customerCall, S.workplaceComms, S.writing, S.dataInterp, S.judgement, S.interviewQs, S.interview] },

  // Communication-heavy jobs
  { slug: "guest-relations-executive", title: "Hospitality / Guest Relations Executive", group: "communication", summary: "Welcome guests, handle requests and solve problems with a smile.", steps: spoken([S.customerCall]) },
  { slug: "airline-ground-staff", title: "Airline Ground Staff / Customer Service Agent", group: "communication", summary: "Check-in, boarding and passenger questions, often under pressure.", steps: spoken([S.customerCall, S.listening]) },
  { slug: "retail-customer-associate", title: "Retail Store Customer Associate", group: "communication", summary: "Help shoppers find what they need and handle returns.", steps: spoken([S.customerCall]) },
  { slug: "travel-support-executive", title: "Travel Desk / Travel Support Executive", group: "communication", summary: "Book and change travel and help travellers by phone and email.", steps: spoken([S.customerCall, S.writing]) },
  { slug: "patient-support-executive", title: "Healthcare Patient Support / Hospital Front Desk", group: "communication", summary: "Guide patients and families kindly and clearly.", steps: spoken([S.customerCall, S.listening]) },
  { slug: "hr-recruiter", title: "HR Recruiter / HR Executive", group: "communication", summary: "Call, screen and schedule candidates, and write clear messages.", steps: spoken([S.writing, S.workplaceComms]) },
  { slug: "online-english-tutor", title: "Online English Tutor / Spoken English Trainer", group: "communication", summary: "Show strong spoken English and explain grammar simply.", steps: spoken([S.grammar, S.vocabulary, S.readAloud]) },
  { slug: "soft-skills-trainer", title: "Corporate Trainer / Soft-Skills Trainer", group: "communication", summary: "Present confidently and teach communication at work.", steps: spoken([S.workplaceComms, S.supervisor]) },
];

export function getJobRole(slug: string): JobRole | undefined {
  return JOB_ROLES.find((r) => r.slug === slug);
}
