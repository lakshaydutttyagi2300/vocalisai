// Situational-judgement MCQs and open prompts (read-aloud, fluency,
// supervisor, conversation, customer service, interview, writing).
// Hand-written for this platform - original, workplace and everyday Indian
// contexts. Open prompts have no single right answer: they're scored by the
// existing speech/writing analysis, exactly like the questions already in
// those practice modes.

const LEVEL = { BEGINNER: 2, INTERMEDIATE: 3, ADVANCED: 4, EXPERT: 5 };
const DIFFS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];

// ------------------------------------------------ Situational judgement (MCQ)
const sjt = (skillId, difficulty, prompt, best, wrong, why) => ({
  skillId,
  level: LEVEL[difficulty],
  category: "SITUATIONAL_JUDGEMENT",
  difficulty,
  type: "MULTIPLE_CHOICE",
  prompt,
  options: [best, ...Object.keys(wrong)],
  correctAnswer: best,
  distractorReasons: wrong,
  explanation: why,
  hint: "Choose the action that solves the problem while staying honest, respectful and within your role.",
  scoringCriteria: "Single correct option; full credit only for the exact correct choice.",
  timeLimitSeconds: { BEGINNER: 45, INTERMEDIATE: 60, ADVANCED: 75, EXPERT: 90 }[difficulty],
});

const SJT = [
  // Teamwork
  sjt("SJT.TEAM.TEAMWORK", "BEGINNER", "A new colleague keeps asking you how to use the ticketing tool, and it is slowing you down. What should you do?",
    "Show them the main steps once properly and share the user guide.", {
      "Ignore their questions so they learn by themselves.": "Leaving a new colleague stuck hurts the team.",
      "Complain to the manager that they are slow.": "Helping first is more constructive than complaining.",
      "Do their tickets for them.": "They won't learn, and your own work suffers.",
    }, "A short, proper walkthrough plus a guide helps them become independent quickly."),
  sjt("SJT.TEAM.TEAMWORK", "BEGINNER", "Your team has to finish a report today, but one member has not sent their part. What should you do first?",
    "Politely ask them how it is going and whether they need help.", {
      "Write their part yourself without telling them.": "This can duplicate work and cause confusion.",
      "Tell everyone they are holding up the team.": "Public blame damages trust.",
      "Submit the report without their part.": "An incomplete report may not meet the goal.",
    }, "A friendly check-in finds the problem early and keeps respect in the team."),
  sjt("SJT.TEAM.TEAMWORK", "INTERMEDIATE", "In a team meeting, a quieter colleague shares an idea that others talk over. What is the best response?",
    "Bring the conversation back to their idea and ask them to explain it.", {
      "Stay quiet - it isn't your idea.": "Good teamwork includes making sure every voice is heard.",
      "Present the idea later as your own.": "That is dishonest and unfair.",
      "Tell the others they are rude.": "Confrontation in the meeting isn't necessary to fix this.",
    }, "Inviting them to speak again makes sure a useful idea isn't lost."),
  sjt("SJT.TEAM.TEAMWORK", "INTERMEDIATE", "You finish your tasks early while a teammate is struggling with a deadline. What should you do?",
    "Offer to help with part of their work, after checking with your lead if needed.", {
      "Leave early since your work is done.": "The team goal matters, not just your own tasks.",
      "Wait to be asked before offering anything.": "Offering proactively is better teamwork.",
      "Start on next week's work instead.": "Helping meet today's deadline is more useful.",
    }, "Supporting a teammate helps the whole team hit its deadline."),
  sjt("SJT.TEAM.TEAMWORK", "ADVANCED", "Two teammates disagree about how to split a project, and the work has stopped. You are not the lead. What should you do?",
    "Suggest a short meeting to list the tasks and agree on who does what, and involve the lead if they still can't agree.", {
      "Pick a side with the teammate you like more.": "Taking sides based on friendship isn't fair.",
      "Do the whole project yourself.": "Not realistic, and it doesn't solve the disagreement.",
      "Wait until the lead notices the delay.": "Waiting lets the deadline slip.",
    }, "A structured discussion gets work moving; escalating only if needed respects roles."),
  sjt("SJT.TEAM.TEAMWORK", "EXPERT", "Your team's success is judged on shared targets, but one member regularly takes credit for group work in front of the manager. What is the best approach?",
    "Speak to them privately about giving credit fairly, and make sure future updates list who did what.", {
      "Take credit for their work in return.": "That makes the problem worse.",
      "Complain about them to other teammates.": "Gossip damages the team.",
      "Say nothing to avoid conflict.": "The unfairness will continue and hurt morale.",
    }, "A private conversation plus a clear record of contributions fixes the issue without drama."),
  sjt("SJT.TEAM.TEAMWORK", "EXPERT", "Your team's process is slower than another team's, but some members resist any change. As a senior member, what should you do?",
    "Show the team the difference with data and invite them to test one small change together.", {
      "Force the change without discussion.": "Imposed change often meets more resistance.",
      "Drop the idea to keep everyone happy.": "The team stays less effective.",
      "Ask the manager to punish those who resist.": "Punishment isn't a good first step.",
    }, "Evidence plus a small, shared trial builds buy-in for change."),
  // Prioritisation
  sjt("SJT.PRIO.PRIORITISE", "BEGINNER", "You have three tasks: a report due tomorrow, an urgent customer escalation, and tidying your desk. What should you do first?",
    "Handle the urgent customer escalation.", {
      "Tidy your desk so you can think clearly.": "It isn't urgent or important right now.",
      "Start the report because it's due tomorrow.": "It's due tomorrow; the escalation needs action now.",
      "Do whichever is easiest first.": "Easiest isn't the same as most important.",
    }, "Urgent and important comes first."),
  sjt("SJT.PRIO.PRIORITISE", "BEGINNER", "Your manager gives you a new task, but you are already busy with another one due at the same time. What should you do?",
    "Tell your manager about the clash and ask which should come first.", {
      "Accept it and hope you manage both.": "You may miss both deadlines.",
      "Refuse the new task.": "Refusing outright isn't helpful.",
      "Quietly drop the first task.": "Someone may be depending on it.",
    }, "Raising the clash early lets your manager set the priority."),
  sjt("SJT.PRIO.PRIORITISE", "INTERMEDIATE", "You keep getting interrupted by chat messages while writing an important proposal. What is the best approach?",
    "Set your status to busy for a set time and reply to messages in one batch afterwards.", {
      "Answer every message immediately.": "Constant switching slows the proposal down.",
      "Turn off chat for the whole day.": "Too extreme - urgent messages could be missed.",
      "Ask colleagues to stop messaging you.": "Unrealistic and unfriendly.",
    }, "Focused blocks with batched replies balance deep work and responsiveness."),
  sjt("SJT.PRIO.PRIORITISE", "INTERMEDIATE", "At 5 p.m., you realise you cannot finish a task promised for today. What should you do?",
    "Tell the person now, explain why, and give a realistic new time.", {
      "Say nothing and finish it tomorrow.": "The other person may be relying on it today.",
      "Submit it unfinished without comment.": "Hiding the problem damages trust.",
      "Blame another team for the delay.": "Blame doesn't help and may be unfair.",
    }, "Early, honest updates with a new commitment protect trust."),
  sjt("SJT.PRIO.PRIORITISE", "ADVANCED", "Two senior managers each ask you for urgent work due at the same time. What is the best action?",
    "Tell both about the clash and ask them to agree on the order, or ask your own manager to decide.", {
      "Do the work for the more senior manager.": "Seniority alone may not reflect business priority.",
      "Split your time and deliver both late.": "Both deadlines are missed.",
      "Pick the more interesting task.": "Interest isn't a valid priority rule.",
    }, "Making the conflict visible lets the right person decide."),
  sjt("SJT.PRIO.PRIORITISE", "EXPERT", "You lead a small team during a busy month. A client asks for an extra feature that would delay the main delivery. What should you do?",
    "Explain the trade-off to the client and agree whether to delay the main delivery or schedule the feature later.", {
      "Agree to everything to keep the client happy.": "You'll likely miss the main delivery.",
      "Refuse the feature outright.": "The client may genuinely need it; discuss options.",
      "Ask the team to work every weekend.": "Unsustainable and harms the team.",
    }, "Transparent trade-offs let the client choose with full information."),
  // Ethics & integrity
  sjt("SJT.ETH.INTEGRITY", "BEGINNER", "A customer offers you a small gift for solving their problem quickly. Company rules don't allow gifts. What should you do?",
    "Thank them politely and explain that you can't accept gifts.", {
      "Accept it - it's only small.": "It breaks the company rule.",
      "Accept it but don't tell anyone.": "Hiding it makes it worse.",
      "Tell the customer they are being inappropriate.": "They meant well; a polite refusal is enough.",
    }, "Following the rule politely keeps both integrity and goodwill."),
  sjt("SJT.ETH.INTEGRITY", "BEGINNER", "You notice a colleague has left their computer unlocked with customer data on screen. What should you do?",
    "Lock the screen and remind them gently later.", {
      "Read the data out of curiosity.": "That is a privacy breach.",
      "Leave it - it's not your problem.": "Customer data could be exposed.",
      "Report them to HR immediately.": "A reminder is the right first step.",
    }, "Protecting data and giving a friendly reminder fixes the risk."),
  sjt("SJT.ETH.INTEGRITY", "INTERMEDIATE", "You realise the sales figure you sent to your manager yesterday was wrong and made the team look better than it did. What should you do?",
    "Tell your manager straight away and send the corrected figure.", {
      "Leave it - the difference is small.": "Decisions may be made on the wrong number.",
      "Fix it quietly in next month's report.": "That hides the mistake.",
      "Wait to see if anyone notices.": "Honesty shouldn't depend on being caught.",
    }, "Correcting mistakes promptly is essential for trust."),
  sjt("SJT.ETH.INTEGRITY", "INTERMEDIATE", "A friend asks you to share the questions from the company's recruitment test that you helped prepare. What should you do?",
    "Refuse and explain that the questions are confidential.", {
      "Share just a few questions.": "Any sharing is unfair to other candidates.",
      "Share them if your friend promises secrecy.": "Still a breach of confidentiality.",
      "Give hints instead of the actual questions.": "Hints still give an unfair advantage.",
    }, "Confidential test content must stay confidential for fairness."),
  sjt("SJT.ETH.INTEGRITY", "ADVANCED", "Your team lead asks you to mark calls as 'resolved' even when customers still have problems, to improve the numbers. What should you do?",
    "Explain your concern to the lead and, if it continues, raise it through the proper channel.", {
      "Do as told - the lead is responsible.": "You'd be taking part in misreporting.",
      "Mark only some calls falsely.": "Still dishonest.",
      "Tell customers the company is dishonest.": "Not the right way to raise an internal issue.",
    }, "Raise concerns respectfully first, then escalate properly if needed."),
  sjt("SJT.ETH.INTEGRITY", "EXPERT", "You discover that a supplier your company uses has given a manager expensive gifts, and the manager keeps choosing that supplier. What is the most appropriate action?",
    "Report what you know, with facts, through the company's ethics or compliance channel.", {
      "Confront the manager in front of the team.": "Public confrontation isn't appropriate or safe.",
      "Post about it on social media.": "That breaches confidentiality and due process.",
      "Ignore it - it might be allowed.": "A possible conflict of interest should be checked by the right people.",
    }, "Factual reporting through the proper channel lets it be investigated fairly."),
  // Ownership & accountability
  sjt("SJT.OWN.OWNERSHIP", "BEGINNER", "You sent an email to the wrong customer by mistake. What should you do?",
    "Tell your lead immediately and follow the steps to fix it.", {
      "Hope the customer doesn't notice.": "It may be a data issue that needs quick action.",
      "Delete your sent email and forget it.": "Deleting your copy doesn't recall theirs.",
      "Blame the system for auto-filling the address.": "Taking ownership comes before blame.",
    }, "Owning mistakes quickly limits the damage."),
  sjt("SJT.OWN.OWNERSHIP", "BEGINNER", "A customer's problem is not in your area, but they are upset and waiting. What should you do?",
    "Stay with the customer, find the right team and hand over clearly.", {
      "Tell them it's not your job.": "They're left without help.",
      "Give them the other team's number and end the call.": "A warm handover is better service.",
      "Try to fix it yourself without the right access.": "You could make things worse.",
    }, "Owning the customer's experience means making sure they reach the right help."),
  sjt("SJT.OWN.OWNERSHIP", "INTERMEDIATE", "You notice a recurring error in a shared spreadsheet that nobody owns. What should you do?",
    "Fix it if you can, tell the team, and suggest someone takes ownership of the sheet.", {
      "Ignore it - it isn't your sheet.": "The error will keep causing problems.",
      "Fix it silently every time.": "The root problem isn't solved.",
      "Complain in the team chat.": "Complaining doesn't fix it.",
    }, "Fixing it and arranging an owner solves it now and later."),
  sjt("SJT.OWN.OWNERSHIP", "ADVANCED", "A project you led finished late. In the review meeting, what is the best approach?",
    "Explain what went wrong, including your own part, and suggest changes for next time.", {
      "Point out which team members caused the delay.": "Blame damages trust and learning.",
      "Say the deadline was unrealistic from the start.": "Even if partly true, it avoids learning.",
      "Stay quiet and let others explain.": "As the lead, you should own the review.",
    }, "Owning outcomes and proposing improvements shows accountability."),
  sjt("SJT.OWN.OWNERSHIP", "EXPERT", "You promised a client a delivery date, but a supplier problem means you will miss it by a week. What should you do?",
    "Tell the client now, explain the cause, give the new date, and offer something to reduce the impact.", {
      "Wait until the original date, then explain.": "Late notice leaves the client no time to plan.",
      "Blame the supplier and move on.": "The client relationship is yours to manage.",
      "Promise the original date anyway.": "Promising what you can't deliver breaks trust.",
    }, "Early, honest communication with a mitigation plan protects the relationship."),
  // Conflict
  sjt("SJT.CONF.CONFLICT", "BEGINNER", "A colleague often talks loudly on calls near your desk, and you can't concentrate. What should you do first?",
    "Politely mention it to them and ask if they could lower their voice.", {
      "Complain to the manager straight away.": "A friendly word should come first.",
      "Put on music loudly to block them out.": "That disturbs others too.",
      "Post about it in the team chat.": "Public complaints embarrass people.",
    }, "A polite, direct request usually solves small issues."),
  sjt("SJT.CONF.CONFLICT", "INTERMEDIATE", "Your manager criticises your work in a way you think is unfair. What is the best response?",
    "Ask for a private conversation to understand the feedback and share your view calmly.", {
      "Argue with them immediately in front of others.": "Public arguments rarely help.",
      "Accept it silently and feel upset.": "You miss the chance to clear up a misunderstanding.",
      "Complain to colleagues about the manager.": "Gossip doesn't resolve anything.",
    }, "A calm private discussion helps you understand and be understood."),
  sjt("SJT.CONF.CONFLICT", "INTERMEDIATE", "Two teammates are arguing about whose turn it is to cover the late shift. What should you do if you are their team lead?",
    "Check the rota, decide fairly and explain the reason to both.", {
      "Let them sort it out themselves.": "As lead, you should resolve it.",
      "Cover the shift yourself every time.": "Avoids the issue but isn't sustainable.",
      "Pick whoever complains less.": "Unfair and encourages more conflict.",
    }, "A fair decision based on the rota, clearly explained, settles it."),
  sjt("SJT.CONF.CONFLICT", "ADVANCED", "A colleague from another department keeps missing handover deadlines, which affects your team's work. What should you do?",
    "Talk to them to understand why, agree on a realistic process, and involve both managers if it continues.", {
      "Stop relying on them and do their part.": "Not sustainable, and the process stays broken.",
      "Report them to their manager immediately.": "Talking first is fairer and often faster.",
      "Warn your team not to work with them.": "Spreads conflict rather than fixing it.",
    }, "Understanding causes and agreeing a process fixes the root problem."),
  sjt("SJT.CONF.CONFLICT", "EXPERT", "In a meeting, a senior colleague dismisses your proposal rudely. Others look uncomfortable. What is the best approach?",
    "Stay calm, respond to the points raised, and follow up privately with the colleague afterwards.", {
      "Reply rudely to show you won't be bullied.": "Escalates the conflict in public.",
      "Leave the meeting.": "Walking out damages your credibility.",
      "Withdraw your proposal immediately.": "A good idea shouldn't be dropped because of rudeness.",
    }, "Calm, professional handling in the room and a private follow-up keeps respect on both sides."),
  // Customer first
  sjt("SJT.CUST.CUSTFIRST", "BEGINNER", "A customer is confused by technical words you used. What should you do?",
    "Explain again in simple words and check they understood.", {
      "Repeat the same explanation more slowly.": "The words are the problem, not the speed.",
      "Tell them to read the manual.": "Unhelpful when they're asking you.",
      "Move on to the next step.": "They'll get lost further.",
    }, "Plain language and checking understanding is good service."),
  sjt("SJT.CUST.CUSTFIRST", "BEGINNER", "A customer asks for something you know is against company policy. What is the best response?",
    "Explain politely that you can't do it and offer the best alternative you can.", {
      "Do it anyway to keep them happy.": "Breaks the policy.",
      "Just say 'no' and end the call.": "Leaves the customer without help.",
      "Pretend you don't understand the request.": "Dishonest and unhelpful.",
    }, "A polite no with an alternative keeps the customer supported."),
  sjt("SJT.CUST.CUSTFIRST", "INTERMEDIATE", "A customer has called three times about the same problem. They are frustrated. What should you do?",
    "Apologise, take ownership of the case, and give them a clear next step and time.", {
      "Ask them to explain everything from the start again.": "Read the history first - repeating adds frustration.",
      "Transfer them to another team straight away.": "Another handover may frustrate them more.",
      "Tell them other customers have the same issue.": "That doesn't solve their problem.",
    }, "Owning a repeat problem and setting clear expectations rebuilds trust."),
  sjt("SJT.CUST.CUSTFIRST", "ADVANCED", "You can solve a customer's issue faster by skipping a verification step. The customer is in a hurry. What should you do?",
    "Complete the verification quickly and explain why it's needed.", {
      "Skip verification to save time.": "Verification protects the customer's account.",
      "Ask them to call back when they have more time.": "Loses the chance to help now.",
      "Tell them verification is optional.": "It isn't - and that's untrue.",
    }, "Security steps protect the customer; explaining them keeps goodwill."),
  sjt("SJT.CUST.CUSTFIRST", "EXPERT", "A loyal customer's problem was caused by your company's mistake, but the fix they ask for is more generous than the standard policy allows. What is the best approach?",
    "Acknowledge the mistake, offer the best option within policy, and ask a supervisor about an exception if it seems fair.", {
      "Give them whatever they ask for.": "You may not have the authority.",
      "Offer only the standard policy and nothing else.": "Ignores that the company caused the problem.",
      "Tell them it wasn't the company's fault.": "That's untrue.",
    }, "Owning the mistake and seeking a fair exception balances the customer and the rules."),
  // Adaptability
  sjt("SJT.ADAPT.ADAPTABILITY", "BEGINNER", "Your team moves to a new software tool you have never used. What should you do?",
    "Take the training and practise with it early, asking questions when stuck.", {
      "Keep using the old tool as long as possible.": "You'll fall behind the team.",
      "Complain that the old tool was better.": "Complaining doesn't help you learn.",
      "Wait for someone to do your tasks in it.": "You need to learn it yourself.",
    }, "Learning early and asking questions makes the change easier."),
  sjt("SJT.ADAPT.ADAPTABILITY", "INTERMEDIATE", "Your shift timing is changed from next week due to business needs. What is the best response?",
    "Accept the change if you can, and raise any genuine difficulty with your manager early.", {
      "Refuse to work the new shift.": "Business needs may require flexibility.",
      "Say nothing and arrive at the old time.": "You'd miss your shift.",
      "Ask colleagues to swap every week without telling the manager.": "Unofficial swaps can cause gaps.",
    }, "Flexibility plus early, honest communication about problems works best."),
  sjt("SJT.ADAPT.ADAPTABILITY", "ADVANCED", "Halfway through a project, the client changes the requirements. What should you do?",
    "Understand the new needs, re-plan with the team, and agree new timelines with the client.", {
      "Continue with the original plan.": "The client would get something they no longer want.",
      "Stop work until the client decides everything.": "Unnecessary delay.",
      "Tell the client changes are not allowed.": "Too rigid - discuss the impact instead.",
    }, "Re-planning openly keeps the project useful and on track."),
  sjt("SJT.ADAPT.ADAPTABILITY", "EXPERT", "Your company is merging with another, and your role may change. Several teammates are anxious. As a senior team member, what should you do?",
    "Share accurate information you have, avoid rumours, and keep the team focused on current work.", {
      "Tell the team you've heard jobs will be cut.": "Spreading unconfirmed rumours raises anxiety.",
      "Start looking for another job during work hours.": "Unprofessional and unsettling for the team.",
      "Refuse to discuss the merger at all.": "Silence can increase worry.",
    }, "Calm, accurate communication helps the team through uncertainty."),
];

// ------------------------------------------------ Open prompts
const open = (skillId, category, difficulty, prompt, extra) => ({
  skillId,
  level: LEVEL[difficulty],
  category,
  difficulty,
  type: "SHORT_ANSWER",
  prompt,
  options: null,
  correctAnswer: null,
  distractorReasons: null,
  explanation: null,
  hint: null,
  ...extra,
});
const byLevel = (lists, make) => DIFFS.flatMap((d) => lists[d].map((item) => make(d, item)));

const READ_ALOUD = {
  BEGINNER: [
    "Thank you for calling. How may I help you today?",
    "Please hold for a moment while I check your order.",
    "Our office is open from nine in the morning to six in the evening.",
    "I have sent the details to your email address.",
    "Could you please spell your full name for me?",
    "Your parcel will reach you by Friday afternoon.",
    "I am sorry for the trouble this has caused you.",
    "The meeting has been moved to three o'clock.",
    "Please remember to bring your identity card tomorrow.",
    "We will call you back within two hours.",
  ],
  INTERMEDIATE: [
    "I can see that your payment was received on Monday, and your account has now been updated.",
    "Before we continue, I need to confirm a few details to keep your account secure.",
    "The new schedule starts next week, so please check your updated shift timings on the portal.",
    "If the problem happens again, restart the app and clear the cache before logging in.",
    "Our team will visit your home between ten and twelve to install the new connection.",
    "I understand how frustrating a delayed refund can be, and I will make sure it is processed today.",
    "Please read the safety instructions carefully before using the equipment for the first time.",
    "The training session covers customer greetings, active listening, and closing a call politely.",
    "We have upgraded your plan, and the new benefits will start from your next billing cycle.",
    "Could you describe exactly what happened when you tried to make the payment?",
  ],
  ADVANCED: [
    "Although the delivery was scheduled for yesterday, a technical issue at our warehouse delayed several orders. Yours has now been dispatched and should arrive within two working days.",
    "To protect your personal information, we never ask for your full password or one-time code over the phone. If anyone asks for these details, please end the call and contact us directly.",
    "The quarterly review showed a steady improvement in customer satisfaction, particularly in how quickly complaints were resolved and how clearly agents explained the next steps.",
    "Effective communication is not only about speaking clearly; it also involves listening carefully, asking the right questions, and confirming that the other person has understood.",
    "Your insurance claim has been approved in principle. However, we still need a copy of the repair invoice before the final amount can be transferred to your account.",
    "Many customers prefer chat support because it allows them to multitask, while others value the reassurance of speaking to a real person on the phone.",
    "The company has introduced a hybrid working policy, which allows employees to work from home two days a week, provided their responsibilities can be managed remotely.",
    "If you would like to cancel your subscription, you can do so at any time from the account settings page, and you will not be charged for the following month.",
    "Punctuality, preparation, and a positive attitude often make a stronger impression in an interview than a long list of qualifications.",
    "Our records indicate that the last three bills were paid on time, so the late fee applied this month appears to be an error, which I will reverse immediately.",
  ],
  EXPERT: [
    "Following a thorough investigation, we have identified the cause of the intermittent outages as a configuration error introduced during last week's maintenance. The issue has been corrected, and additional monitoring is now in place to prevent a recurrence.",
    "While the proposal is financially attractive, its long-term viability depends on several assumptions about customer behaviour that have not yet been tested. I would therefore recommend a limited pilot before committing the entire budget.",
    "Particularly in customer-facing roles, the ability to remain composed under pressure, acknowledge a customer's frustration sincerely, and propose a practical resolution distinguishes an exceptional professional from an adequate one.",
    "The regulatory authority has issued revised guidelines on data protection, which require organisations to obtain explicit consent before collecting personal information and to delete it once it is no longer necessary.",
    "Despite considerable uncertainty in the global economy, the organisation achieved its annual targets, largely because of disciplined cost management, diversified revenue streams, and sustained investment in employee development.",
    "An effective apology acknowledges the specific inconvenience caused, avoids shifting responsibility elsewhere, and is accompanied by concrete action; otherwise, it can sound rehearsed and insincere.",
    "The committee reviewed the preliminary findings thoroughly and concluded that, although the methodology was sound, the sample size was insufficient to support the broader generalisations made in the report.",
    "Customers increasingly expect seamless experiences across channels, meaning that a query begun on social media should be resolvable by phone without the customer having to repeat every detail.",
    "Negotiating successfully requires understanding not only what the other party is asking for, but why they are asking for it, since the underlying interests often reveal room for a mutually beneficial agreement.",
    "Sustainable growth in the technology sector will depend less on rapid expansion and more on building trustworthy products, protecting user privacy, and maintaining transparent relationships with regulators.",
  ],
};

const FLUENCY = {
  BEGINNER: ["your daily routine", "your favourite festival", "your home town", "your favourite food", "what you like to do on weekends", "a friend you admire", "your favourite place in your city", "how you usually travel to work or college", "a film you enjoyed", "your favourite season"],
  INTERMEDIATE: ["a skill you would like to learn and why", "the best advice you have ever received", "a challenge you faced at school or work", "how technology has changed your daily life", "a memorable trip you have taken", "why teamwork is important", "your ideal job", "a book, film or series you would recommend", "how you manage stress", "a person who influenced your career choice"],
  ADVANCED: ["the advantages and disadvantages of working from home", "how social media affects the way people communicate", "why customer service matters to a company's success", "whether online learning can replace classroom learning", "how cities can reduce traffic", "the qualities of a good team leader", "why learning English is useful for your career", "how you would improve your local area", "the role of feedback in personal growth", "the impact of smartphones on young people"],
  EXPERT: ["whether artificial intelligence will create more jobs than it removes", "how companies should balance profit with social responsibility", "the importance of data privacy in everyday life", "whether work-life balance is a realistic goal", "how you would handle a disagreement with a senior colleague", "what makes communication effective across different cultures", "the long-term effects of remote work on company culture", "whether exams are the best way to measure ability", "how businesses can build customer loyalty", "the skills young professionals will need in the next ten years"],
};
const FLUENCY_SECONDS = { BEGINNER: 30, INTERMEDIATE: 45, ADVANCED: 60, EXPERT: 90 };

const SUPERVISOR = {
  BEGINNER: [
    ["I see you were ten minutes late today. Is everything okay?", "SJT.OWN.OWNERSHIP"],
    ["Can you tell me how your first week has gone?", "SJT.ADAPT.ADAPTABILITY"],
    ["Please give me a quick update on the calls you handled this morning.", "SJT.PRIO.PRIORITISE"],
    ["You forgot to update the ticket notes yesterday. What happened?", "SJT.OWN.OWNERSHIP"],
    ["Can you cover the evening shift on Friday?", "SJT.ADAPT.ADAPTABILITY"],
    ["A customer praised you in their feedback. What do you think went well?", "SJT.CUST.CUSTFIRST"],
    ["Do you need any help with the new system?", "SJT.ADAPT.ADAPTABILITY"],
    ["Why is this report not finished yet?", "SJT.PRIO.PRIORITISE"],
    ["How are you getting along with the rest of the team?", "SJT.TEAM.TEAMWORK"],
    ["Can you explain why you transferred that last call?", "SJT.CUST.CUSTFIRST"],
  ],
  INTERMEDIATE: [
    ["Your average handling time has gone up this week. What do you think is causing it?", "SJT.PRIO.PRIORITISE"],
    ["A customer complained that you sounded rushed. Tell me about that call.", "SJT.CUST.CUSTFIRST"],
    ["Two people have asked to swap shifts with you. How would you like to handle it?", "SJT.TEAM.TEAMWORK"],
    ["I need someone to train the new joiners next week. Are you interested, and how would you approach it?", "SJT.TEAM.TEAMWORK"],
    ["You missed the quality target last month. What is your plan to improve?", "SJT.OWN.OWNERSHIP"],
    ["I noticed some tension between you and a teammate in the meeting. Do you want to talk about it?", "SJT.CONF.CONFLICT"],
    ["The client wants the report a day early. Is that possible?", "SJT.PRIO.PRIORITISE"],
    ["Walk me through how you handled the angry customer this afternoon.", "SJT.CUST.CUSTFIRST"],
    ["You sent the wrong file to the client. How are we going to fix this?", "SJT.OWN.OWNERSHIP"],
    ["What feedback do you have for me as your supervisor?", "SJT.CONF.CONFLICT"],
  ],
  ADVANCED: [
    ["Our team's customer satisfaction dropped by 5% this month. What do you think we should change?", "SJT.OWN.OWNERSHIP"],
    ["You promised the customer a callback that didn't happen. Talk me through what went wrong.", "SJT.OWN.OWNERSHIP"],
    ["I'm thinking of moving you to the escalations team. How do you feel about that?", "SJT.ADAPT.ADAPTABILITY"],
    ["A teammate says you are not sharing information with them. What's your side of the story?", "SJT.CONF.CONFLICT"],
    ["We need to cut the training budget. Which parts of the training do you think are essential?", "SJT.PRIO.PRIORITISE"],
    ["The customer asked for a refund outside policy and you approved it. Why?", "SJT.ETH.INTEGRITY"],
    ["We have a big product launch next month. How should the team prepare?", "SJT.PRIO.PRIORITISE"],
    ["I've heard you have an idea for improving our call scripts. Explain it to me.", "SJT.TEAM.TEAMWORK"],
    ["Your attendance has been irregular lately. Is there something I should know?", "SJT.OWN.OWNERSHIP"],
    ["The client says our reports are hard to read. How would you improve them?", "SJT.CUST.CUSTFIRST"],
  ],
  EXPERT: [
    ["Senior management wants to reduce average call time by 20% without hurting quality. How would you approach this?", "SJT.PRIO.PRIORITISE"],
    ["A key client is threatening to leave because of repeated errors. Prepare me for the call with them.", "SJT.CUST.CUSTFIRST"],
    ["Two of your team members have complained about each other formally. How do you plan to handle it?", "SJT.CONF.CONFLICT"],
    ["I want you to present our team's results to the regional director. Give me a two-minute version now.", "SJT.OWN.OWNERSHIP"],
    ["We found that some agents were skipping verification steps. What should we do about it?", "SJT.ETH.INTEGRITY"],
    ["Our biggest competitor has launched a cheaper plan. How should our team respond to customers who mention it?", "SJT.CUST.CUSTFIRST"],
    ["You disagreed with my decision in yesterday's meeting. Explain your reasoning to me now.", "SJT.CONF.CONFLICT"],
    ["The company is merging two teams, and you may lead the combined team. What would your first month look like?", "SJT.ADAPT.ADAPTABILITY"],
    ["A project you led has gone over budget. Explain what happened and what you recommend.", "SJT.OWN.OWNERSHIP"],
    ["We need to choose between hiring more staff or investing in automation. What would you recommend and why?", "SJT.PRIO.PRIORITISE"],
  ],
};

const CONVERSATION = {
  BEGINNER: ["What did you have for breakfast today?", "Do you prefer tea or coffee? Why?", "What's the weather like where you are today?", "What do you usually do after work or college?", "Do you have any pets?", "What's your favourite kind of music?", "Where would you like to go on holiday?", "What's a dish you can cook well?", "Do you like watching cricket?", "What did you do last weekend?"],
  INTERMEDIATE: ["If you could live in any city in the world, which would you choose and why?", "What's something new you've learned recently?", "Tell me about a festival you celebrate with your family.", "What's the best gift you've ever received?", "Do you prefer shopping online or in shops? Why?", "What's a hobby you'd like to start?", "Tell me about your best friend.", "What's the most interesting place you've visited in India?", "How do you usually relax after a busy day?", "What kind of films do you enjoy most?"],
  ADVANCED: ["Do you think it's better to live in a big city or a small town?", "How has your neighbourhood changed over the last few years?", "What do you think about people spending so much time on their phones?", "Would you rather work for a big company or a small startup?", "What's a tradition you think should be kept alive?", "How do you decide which news sources to trust?", "Is it important to learn to cook? Why or why not?", "What would you change about the education system if you could?", "Do you think people read fewer books these days?", "What's your opinion on online dating?"],
  EXPERT: ["Some people say success is mostly about luck. What do you think?", "Should governments control how much time children spend on screens?", "Is it possible to be truly happy without a lot of money?", "What do you think the world will look like in fifty years?", "Do you think social media brings people closer or pushes them apart?", "Should people be allowed to work from anywhere in the world?", "What makes a city a good place to live?", "Is it more important to be liked or to be respected at work?", "How should society support older people?", "What's a common belief that you disagree with?"],
};

const CUSTOMER = {
  BEGINNER: [
    ["Hi, I forgot my password and can't log in.", "account access", "CSV.CAL.VERIFY"],
    ["My order hasn't arrived yet. Where is it?", "delivery status", "CSV.PRB.PROBING"],
    ["I want to change my delivery address.", "order change", "CSV.CAL.VERIFY"],
    ["How do I check my account balance?", "general query", "CSV.CAL.OPENCLOSE"],
    ["The item I received is the wrong size.", "exchange", "CSV.TRB.TROUBLESHOOT"],
    ["Can I pay my bill in two parts?", "billing query", "CSV.SAL.OBJECTIONS"],
    ["I'd like to cancel my order, please.", "cancellation", "CSV.SAL.OBJECTIONS"],
    ["What time does your store close today?", "general query", "CSV.CAL.OPENCLOSE"],
    ["I didn't get my invoice by email.", "billing query", "CSV.TRB.TROUBLESHOOT"],
    ["My app keeps logging me out.", "technical issue", "CSV.TRB.TROUBLESHOOT"],
  ],
  INTERMEDIATE: [
    ["I was promised a refund two weeks ago and I still haven't received it.", "refund delay", "CSV.DES.DEESCALATE"],
    ["My internet has been very slow every evening this week.", "technical issue", "CSV.TRB.TROUBLESHOOT"],
    ["You sent me a damaged product, and I need it for a gift tomorrow.", "damaged item", "CSV.EMP.EMPATHY"],
    ["I've been charged a late fee but I paid on time.", "billing dispute", "CSV.DES.DEESCALATE"],
    ["Your agent yesterday hung up on me in the middle of the call.", "service complaint", "CSV.DES.DEESCALATE"],
    ["I want to upgrade my plan, but I'm not sure which one is right for me.", "sales enquiry", "CSV.SAL.OBJECTIONS"],
    ["Someone from your company called asking for my OTP. Is that normal?", "security concern", "CSV.CMP.PRIVACY"],
    ["The technician didn't turn up for the appointment.", "missed appointment", "CSV.DES.DEESCALATE"],
    ["My elderly father needs help setting up his account. Can you guide me?", "assisted setup", "CSV.EMP.EMPATHY"],
    ["I want to know what personal data you store about me.", "data request", "CSV.CMP.PRIVACY"],
  ],
  ADVANCED: [
    ["This is the fourth time I'm calling about the same problem. Nobody has fixed it!", "repeat complaint", "CSV.DES.DEESCALATE"],
    ["I'm thinking of switching to another company because your prices went up.", "retention", "CSV.SAL.OBJECTIONS"],
    ["My flight was cancelled and I've been waiting at the airport for five hours.", "service failure", "CSV.EMP.EMPATHY"],
    ["You've charged my card three times for one order!", "billing error", "CSV.DES.DEESCALATE"],
    ["Your app deleted all my saved documents after the update.", "technical failure", "CSV.TRB.TROUBLESHOOT"],
    ["I need to cancel because my mother passed away and the account was in her name.", "bereavement", "CSV.EMP.EMPATHY"],
    ["I didn't sign up for this subscription. Why are you charging me?", "unauthorised charge", "CSV.CMP.PRIVACY"],
    ["The product stopped working one day after the warranty ended.", "warranty dispute", "CSV.SAL.OBJECTIONS"],
    ["I want to speak to your manager right now.", "escalation request", "CSV.CAL.HOLDTRANSFER"],
    ["Your delivery person was rude to my family.", "staff complaint", "CSV.DES.DEESCALATE"],
  ],
  EXPERT: [
    ["I run a small business and your outage today cost me thousands of rupees in lost sales. What are you going to do about it?", "business impact complaint", "CSV.DES.DEESCALATE"],
    ["I've posted about your terrible service on social media, and I'll keep posting until someone fixes this.", "public complaint", "CSV.DES.DEESCALATE"],
    ["A competitor is offering me the same plan for 30% less. Give me one reason to stay.", "retention negotiation", "CSV.SAL.OBJECTIONS"],
    ["I think someone has accessed my account without permission and made purchases.", "account breach", "CSV.CMP.PRIVACY"],
    ["Your policy says no refunds, but your product clearly doesn't do what the advert promised.", "policy dispute", "CSV.SAL.OBJECTIONS"],
    ["I've been transferred five times. If you transfer me again, I'm cancelling everything.", "escalated frustration", "CSV.CAL.HOLDTRANSFER"],
    ["My payment failed but the money has left my bank account. I need that money for rent tomorrow.", "urgent billing issue", "CSV.EMP.EMPATHY"],
    ["I want a written explanation of why my loan application was rejected.", "formal request", "CSV.CMP.SCRIPTING"],
    ["Your system shows I'm a new customer, but I've been with you for eight years.", "data error", "CSV.TRB.TROUBLESHOOT"],
    ["I'm a doctor and I need my prescriptions delivered today. Your delay puts my patients at risk.", "urgent escalation", "CSV.DES.DEESCALATE"],
  ],
};

const INTERVIEW = {
  BEGINNER: [
    ["Tell me about yourself.", "INV.INT.SELFINTRO"],
    ["Why do you want to work in customer service?", "INV.HRQ.HR"],
    ["What are your strengths?", "INV.HRQ.HR"],
    ["What do you know about our company?", "INV.HRQ.HR"],
    ["Are you comfortable working in shifts, including nights?", "INV.HRQ.HR"],
    ["What are your hobbies?", "INV.INT.SELFINTRO"],
    ["Why did you choose your field of study?", "INV.INT.SELFINTRO"],
    ["How would your friends describe you?", "INV.HRQ.HR"],
    ["Where do you see yourself in two years?", "INV.HRQ.HR"],
    ["Do you have any questions for us?", "INV.CLS.CLOSING"],
  ],
  INTERMEDIATE: [
    ["Describe a time you worked in a team to achieve a goal.", "INV.STR.STAR"],
    ["What is your biggest weakness, and how are you working on it?", "INV.HRQ.HR"],
    ["Tell me about a time you had to learn something quickly.", "INV.STR.STAR"],
    ["How do you handle pressure or tight deadlines?", "INV.HRQ.HR"],
    ["Why should we hire you?", "INV.HRQ.HR"],
    ["Describe a time you made a mistake. What did you do?", "INV.STR.STAR"],
    ["What would you do if a customer shouted at you?", "INV.SIT.SITUATIONAL"],
    ["Why are you leaving your current job?", "INV.HRQ.HR"],
    ["What motivates you at work?", "INV.HRQ.HR"],
    ["What are your salary expectations?", "INV.CLS.CLOSING"],
  ],
  ADVANCED: [
    ["Tell me about a time you disagreed with your manager. How did you handle it?", "INV.STR.STAR"],
    ["Describe a situation where you went beyond your job to help a customer.", "INV.STR.STAR"],
    ["What would you do if you saw a colleague breaking company rules?", "INV.SIT.SITUATIONAL"],
    ["Give an example of a goal you set and how you achieved it.", "INV.STR.STAR"],
    ["How would you handle two urgent tasks with the same deadline?", "INV.SIT.SITUATIONAL"],
    ["Tell me about feedback you received that changed how you work.", "INV.STR.STAR"],
    ["How do you stay motivated when doing repetitive work?", "INV.HRQ.HR"],
    ["Describe a time you had to explain something complicated to someone.", "INV.STR.STAR"],
    ["What would you do in your first 30 days in this role?", "INV.SIT.SITUATIONAL"],
    ["There's a gap in your CV. Can you explain it?", "INV.HRQ.HR"],
  ],
  EXPERT: [
    ["Tell me about the most difficult decision you've made at work and how you made it.", "INV.STR.STAR"],
    ["Describe a time you led a team through a change that people resisted.", "INV.STR.STAR"],
    ["If you were given a team with low morale, what would you do first?", "INV.SIT.SITUATIONAL"],
    ["Tell me about a time you failed. What did you learn?", "INV.STR.STAR"],
    ["How would you convince a senior leader to change a decision you believe is wrong?", "INV.SIT.SITUATIONAL"],
    ["What is one thing you would change about how our industry treats customers?", "INV.HRQ.HR"],
    ["Describe a time you had to deliver bad news to a customer or colleague.", "INV.STR.STAR"],
    ["If you had two offers, including ours, how would you decide?", "INV.CLS.CLOSING"],
    ["How do you measure your own success at work?", "INV.HRQ.HR"],
    ["Walk me through how you would improve a process that everyone says 'has always worked'.", "INV.SIT.SITUATIONAL"],
  ],
};

const WRITING = {
  BEGINNER: [
    ["Write a short message to your manager saying you will be 15 minutes late today.", "ENG.WRT.REGISTER"],
    ["Write two or three sentences introducing yourself to a new team.", "ENG.WRT.SENTENCE"],
    ["Write a short message thanking a colleague for their help.", "ENG.WRT.REGISTER"],
    ["Write a message asking a colleague to share a file with you.", "ENG.WRT.REGISTER"],
    ["Write three sentences describing your job or course.", "ENG.WRT.SENTENCE"],
    ["Write a short reply confirming that you will attend a meeting on Monday at 11 a.m.", "ENG.WRT.REGISTER"],
    ["Write a note to a customer saying their order has been shipped.", "ENG.WRT.SENTENCE"],
    ["Rewrite this sentence correctly: 'me and him goes to office daily.'", "ENG.WRT.SENTENCE"],
    ["Write a short message asking for leave on Friday.", "ENG.WRT.REGISTER"],
    ["Write two sentences describing your favourite place.", "ENG.WRT.SENTENCE"],
  ],
  INTERMEDIATE: [
    ["Write an email to a customer apologising for a delayed delivery and giving a new date.", "ENG.WRT.REGISTER"],
    ["Summarise your last working or college day in about 50 words.", "ENG.WRT.SUMMARY"],
    ["Write a short paragraph explaining why teamwork matters at work.", "ENG.WRT.COHERENCE"],
    ["Write an email asking your manager for feedback on a project you finished.", "ENG.WRT.REGISTER"],
    ["Rewrite this informal message formally: 'hey, can u send the report asap? thx'", "ENG.WRT.REGISTER"],
    ["Write a short notice telling staff that the office will be closed next Monday for maintenance.", "ENG.WRT.COHERENCE"],
    ["Write an email to a colleague handing over your pending tasks before your leave.", "ENG.WRT.COHERENCE"],
    ["Write a reply to a customer asking how to reset their password.", "ENG.WRT.COHERENCE"],
    ["Write a short paragraph describing a problem you solved recently.", "ENG.WRT.COHERENCE"],
    ["Summarise the main benefits of your favourite app in 3-4 sentences.", "ENG.WRT.SUMMARY"],
  ],
  ADVANCED: [
    ["Write an email to a customer who is angry about being charged twice. Apologise, explain the fix and the timeline.", "ENG.WRT.REGISTER"],
    ["Write a paragraph arguing for or against working from home.", "ENG.WRT.ESSAY"],
    ["Write a short report (about 100 words) on how your team could reduce customer waiting times.", "ENG.WRT.COHERENCE"],
    ["Write an email declining a meeting request politely and suggesting another time.", "ENG.WRT.REGISTER"],
    ["Summarise a news story you read recently in about 80 words.", "ENG.WRT.SUMMARY"],
    ["Write an email to your team announcing a new process and why it is being introduced.", "ENG.WRT.COHERENCE"],
    ["Write a paragraph on the qualities of a good customer service agent.", "ENG.WRT.ESSAY"],
    ["Write a follow-up email after a job interview, thanking the interviewer.", "ENG.WRT.REGISTER"],
    ["Write a complaint email to a supplier about repeated late deliveries.", "ENG.WRT.REGISTER"],
    ["Write a short proposal (about 100 words) for a team-building activity.", "ENG.WRT.COHERENCE"],
  ],
  EXPERT: [
    ["Write a formal email to a senior client explaining a service outage, its cause, and the steps taken to prevent it happening again.", "ENG.WRT.REGISTER"],
    ["Write an essay paragraph discussing whether technology makes customer service better or worse.", "ENG.WRT.ESSAY"],
    ["Write a persuasive email to your manager recommending a new tool, with benefits and costs.", "ENG.WRT.COHERENCE"],
    ["Summarise the arguments for and against a four-day working week in about 120 words.", "ENG.WRT.SUMMARY"],
    ["Write a response to a negative public review of your company, keeping it professional and constructive.", "ENG.WRT.REGISTER"],
    ["Write a short policy note explaining how employees should handle customer personal data.", "ENG.WRT.COHERENCE"],
    ["Write an email delivering difficult news: a project your team worked hard on has been cancelled.", "ENG.WRT.REGISTER"],
    ["Write a paragraph evaluating the role of artificial intelligence in customer support.", "ENG.WRT.ESSAY"],
    ["Write a formal letter requesting a refund for a faulty product, referring to consumer rights.", "ENG.WRT.REGISTER"],
    ["Write an executive summary (about 120 words) of a plan to improve employee retention.", "ENG.WRT.SUMMARY"],
  ],
};

export const PROMPT_QUESTIONS = [
  ...SJT,
  ...byLevel(READ_ALOUD, (d, text) =>
    open("SPK.PRN.READALOUD", "READING", d, "Read the following passage aloud, clearly and at a natural pace.", {
      passage: text,
      expectedAnswer: text,
      scoringCriteria: "Assess clarity, pace and pronunciation accuracy.",
      timeLimitSeconds: Math.max(20, Math.round(text.split(/\s+/).length * 0.6) + 15),
    })
  ),
  ...byLevel(FLUENCY, (d, topic) =>
    open("SPK.FLU.PAUSES", "FLUENCY", d, `Talk about ${topic}. Speak continuously for ${FLUENCY_SECONDS[d]} seconds without long pauses.`, {
      scoringCriteria: "Assess hesitations, filler words, repetitions and pace. No fixed answer.",
      timeLimitSeconds: FLUENCY_SECONDS[d] + 15,
    })
  ),
  ...byLevel(SUPERVISOR, (d, [line, skillId]) =>
    open(skillId, "SUPERVISOR", d, "Respond to your supervisor.", {
      passage: `Your supervisor says: "${line}"`,
      scoringCriteria: "Look for clear, honest, professional communication and appropriate ownership - not defensiveness.",
      timeLimitSeconds: { BEGINNER: 45, INTERMEDIATE: 60, ADVANCED: 75, EXPERT: 90 }[d],
    })
  ),
  ...byLevel(CONVERSATION, (d, line) =>
    open("SPK.INT.ROLEPLAY", "CONVERSATION_PARTNER", d, "Respond naturally.", {
      passage: `Your conversation partner says: "${line}"`,
      scoringCriteria: "Assess fluency, natural phrasing and engagement. No fixed answer.",
      timeLimitSeconds: { BEGINNER: 45, INTERMEDIATE: 60, ADVANCED: 60, EXPERT: 75 }[d],
    })
  ),
  ...byLevel(CUSTOMER, (d, [line, kind, skillId]) =>
    open(skillId, "CUSTOMER_SERVICE", d, "Respond to this customer as the agent.", {
      passage: line,
      scoringCriteria: `Scenario type: ${kind}. Look for empathy, ownership, and a concrete resolution step - not just an apology.`,
      timeLimitSeconds: { BEGINNER: 60, INTERMEDIATE: 90, ADVANCED: 105, EXPERT: 120 }[d],
    })
  ),
  ...byLevel(INTERVIEW, (d, [question, skillId]) =>
    open(skillId, "INTERVIEW", d, question, {
      scoringCriteria: skillId === "INV.STR.STAR" ? "Look for a clear Situation, Task, Action and Result." : "Look for a clear, relevant, honest and well-structured answer.",
      timeLimitSeconds: { BEGINNER: 90, INTERMEDIATE: 120, ADVANCED: 150, EXPERT: 180 }[d],
    })
  ),
  ...byLevel(WRITING, (d, [task, skillId]) =>
    open(skillId, "WRITING", d, task, {
      scoringCriteria: "Assess grammar, clarity, tone and structure appropriate to the task. No fixed answer.",
      timeLimitSeconds: { BEGINNER: 180, INTERMEDIATE: 240, ADVANCED: 300, EXPERT: 420 }[d],
    })
  ),
];
