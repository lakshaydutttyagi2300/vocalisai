// Verbal Reasoning bank, part 2 (large). Hand-written for this platform in
// everyday Indian and workplace contexts - not copied from any exam paper.
// Plus a fact-vs-opinion set built from two hand-checked lists. Every wrong
// option carries the reason it is wrong.
import { makeKit } from "./gen-kit.mjs";

const q = (skillId, level, prompt, answer, wrong, explanation, hint) => ({
  skillId,
  level,
  prompt,
  correctAnswer: answer,
  options: [answer, ...Object.keys(wrong)],
  distractorReasons: wrong,
  explanation,
  hint,
  timeLimitSeconds: 75 + level * 15,
});

// ------------------------------------------------ True / False / Cannot say
const TFCS_WHY = {
  True: "The passage doesn't state or directly imply this.",
  False: "Nothing in the passage contradicts this.",
  "Cannot say": "The passage does settle this - reread it carefully.",
};
const PASSAGES = [
  ["The city metro runs from 6 a.m. to 11 p.m. on weekdays and from 7 a.m. to 10 p.m. on Sundays. Trains arrive every 4 minutes during peak hours and every 10 minutes at other times. A single-journey token costs between ₹10 and ₹60, depending on distance.", [
    ["The metro runs for fewer hours on Sundays than on weekdays.", "True", "Weekdays: 17 hours (6 a.m.-11 p.m.). Sundays: 15 hours (7 a.m.-10 p.m.)."],
    ["Trains come more often in the evening than in the afternoon.", "Cannot say", "The passage doesn't say which hours are peak hours."],
    ["A single-journey token can cost ₹75.", "False", "Tokens cost at most ₹60."],
  ]],
  ["Under the new leave policy, every permanent employee gets 24 days of paid leave a year. Up to 6 unused days can be carried forward to the next year. Contract staff are covered by a separate policy.", [
    ["A permanent employee who used 15 days this year can carry 9 days forward.", "False", "At most 6 unused days can be carried forward."],
    ["Contract staff get fewer paid leave days than permanent employees.", "Cannot say", "Contract staff have a separate policy that the passage doesn't describe."],
    ["Permanent employees get an average of 2 paid leave days per month.", "True", "24 days ÷ 12 months = 2."],
  ]],
  ["Riya's support team handled 1,200 calls in March with 10 agents, and 1,500 calls in April with 12 agents.", [
    ["On average, each agent handled more calls in April than in March.", "True", "March: 120 calls per agent. April: 125 per agent."],
    ["The team's total calls rose by 25% from March to April.", "True", "300 more calls on 1,200 is a 25% rise."],
    ["Customer satisfaction was higher in April.", "Cannot say", "The passage gives call numbers only, nothing about satisfaction."],
  ]],
  ["All visitors to the office must sign in at reception and wear a visitor badge. Badges must be returned before leaving. Visitors may not enter the server room under any circumstances.", [
    ["A visitor may enter the server room if an employee goes with them.", "False", "Visitors may not enter 'under any circumstances'."],
    ["Employees must also sign in at reception.", "Cannot say", "The rules in the passage are only about visitors."],
    ["A visitor who leaves with their badge is breaking the rules.", "True", "Badges must be returned before leaving."],
  ]],
  ["The library is open from 9 a.m. to 8 p.m., Monday to Saturday. It is closed on Sundays and public holidays. Members can borrow up to four books at a time, for two weeks.", [
    ["A member can borrow five books at once.", "False", "The limit is four books at a time."],
    ["On a Wednesday that isn't a public holiday, the library is open for 11 hours.", "True", "9 a.m. to 8 p.m. is 11 hours."],
    ["Most members borrow four books at a time.", "Cannot say", "The passage gives the limit, not how many books members usually take."],
  ]],
  ["Solar panels were installed on the office roof in January. Since then, the electricity bill has fallen by 30%. During the same period the office also switched to LED lighting.", [
    ["The solar panels alone caused the 30% fall in the bill.", "Cannot say", "The LED lighting changed at the same time, so the cause can't be pinned on the panels alone."],
    ["The electricity bill is lower now than it was before January.", "True", "It has fallen by 30% since January."],
    ["The office still uses its old lighting.", "False", "It switched to LED lighting."],
  ]],
  ["To join the trainee programme, candidates must be graduates aged 21 to 28 and must pass an online test. Candidates with work experience are given preference, but experience is not required.", [
    ["A 30-year-old graduate can apply.", "False", "The age limit is 21 to 28."],
    ["A candidate with no work experience cannot be selected.", "False", "Experience is preferred but 'not required'."],
    ["Most trainees selected last year had work experience.", "Cannot say", "The passage says nothing about last year's selections."],
  ]],
  ["In a staff survey, 60% of employees said they prefer coming to the office three days a week. 25% prefer working fully from home, and the rest prefer being in the office every day.", [
    ["15% of employees prefer being in the office every day.", "True", "100% − 60% − 25% = 15%."],
    ["Most employees prefer working fully from home.", "False", "Only 25% prefer that; 60% prefer three office days."],
    ["Managers were more likely than others to prefer the office.", "Cannot say", "The survey results aren't broken down by role."],
  ]],
  ["The warehouse dispatches orders placed before 2 p.m. on the same day. Orders placed after 2 p.m. are dispatched on the next working day. The warehouse does not work on Sundays.", [
    ["An order placed at 3 p.m. on a Saturday is dispatched on Monday.", "True", "After 2 p.m. → next working day; Sunday isn't a working day, so Monday."],
    ["An order placed at 1 p.m. on a Tuesday is dispatched the same day.", "True", "It was placed before 2 p.m."],
    ["Every order is delivered within two days of dispatch.", "Cannot say", "The passage covers dispatch, not delivery times."],
  ]],
  ["Anil earns more than Bina. Bina earns more than Chirag. Deepa earns less than Anil.", [
    ["Chirag earns less than Anil.", "True", "Anil > Bina > Chirag."],
    ["Deepa earns more than Bina.", "Cannot say", "We only know Deepa earns less than Anil - she could be above or below Bina."],
    ["Anil earns the most of the four.", "True", "Anil earns more than Bina (and so Chirag) and more than Deepa."],
  ]],
  ["The training course has five modules. Trainees must complete them in order and pass a quiz at the end of each module before starting the next. The certificate is awarded only after all five quizzes are passed.", [
    ["A trainee can start module 3 without passing the module 2 quiz.", "False", "Each quiz must be passed before the next module."],
    ["A trainee who has passed four quizzes has earned the certificate.", "False", "All five quizzes must be passed."],
    ["Each quiz has ten questions.", "Cannot say", "The passage doesn't describe the quizzes."],
  ]],
  ["The region produced 40,000 tonnes of mangoes in 2024, which was 20% more than in 2023. Unusually heavy rain is expected to reduce the 2025 crop.", [
    ["Mango production went up from 2023 to 2024.", "True", "2024 was 20% higher than 2023."],
    ["The 2023 crop was 32,000 tonnes.", "False", "40,000 is 120% of the 2023 figure, so 2023 was about 33,333 tonnes, not 32,000."],
    ["The 2025 crop will definitely be smaller than the 2024 crop.", "Cannot say", "A reduction is only expected, not certain."],
  ]],
  ["The café gives students a 10% discount on weekdays. This discount cannot be combined with any other offer. On weekends, every customer gets a free cookie with any coffee.", [
    ["A student can combine the student discount with another offer.", "False", "The discount 'cannot be combined with any other offer'."],
    ["Anyone who buys a coffee on a Sunday gets a free cookie.", "True", "On weekends every customer gets a cookie with any coffee."],
    ["The café is busier on weekends than on weekdays.", "Cannot say", "The passage says nothing about how busy it is."],
  ]],
  ["Ravi joined the company in 2019. Two years later he was promoted to team leader, and he has held that position ever since. He now leads a team of eight.", [
    ["Ravi became a team leader in 2021.", "True", "Two years after 2019."],
    ["Ravi's team has more than ten members.", "False", "He leads a team of eight."],
    ["Ravi is the youngest team leader in the company.", "Cannot say", "Nothing is said about his age or other team leaders."],
  ]],
  ["A shuttle bus leaves the depot every 15 minutes, starting at 6:00 a.m. The first bus reaches the airport at 6:50 a.m., and every bus takes the same time for the journey.", [
    ["The third bus reaches the airport at 7:20 a.m.", "True", "The third bus leaves at 6:30 and the journey takes 50 minutes."],
    ["The journey takes less than 45 minutes.", "False", "6:00 to 6:50 is 50 minutes."],
    ["The buses are usually full.", "Cannot say", "The passage doesn't mention how busy the buses are."],
  ]],
  ["The hospital's outpatient department sees patients from 8 a.m. to 2 p.m. Patients must register at least 30 minutes before their appointment. Emergency cases are seen at any time and do not need to register first.", [
    ["A patient with a 9 a.m. outpatient appointment should register by 8:30 a.m.", "True", "Registration is needed at least 30 minutes before."],
    ["The outpatient department is open in the evening.", "False", "It closes at 2 p.m."],
    ["Emergency cases are seen by senior doctors.", "Cannot say", "The passage doesn't say who sees emergency cases."],
  ]],
  ["Priya scored 78 in the written test and 85 in the interview. To be selected, a candidate needs at least 70 in each round and an average of at least 80.", [
    ["Priya meets the minimum score in each round.", "True", "78 and 85 are both at least 70."],
    ["Priya's average is at least 80, so she meets that condition.", "True", "(78 + 85) ÷ 2 = 81.5."],
    ["Priya had the highest interview score of all candidates.", "Cannot say", "Other candidates' scores aren't given."],
  ]],
  ["The software update will be released in three phases. Phase 1 goes to 10% of users, phase 2 to 40%, and phase 3 to everyone else. Each phase starts only if the previous one has no serious problems.", [
    ["Phase 3 reaches 50% of users.", "True", "Everyone else = 100% − 10% − 40% = 50%."],
    ["Phase 2 can start even if phase 1 has serious problems.", "False", "Each phase starts only if the previous one has no serious problems."],
    ["The whole update will be released within a month.", "Cannot say", "No timeline is given."],
  ]],
  ["A shop sells notebooks at ₹40 each. Anyone buying 10 or more gets 15% off the whole purchase. Delivery is free for orders above ₹500 after discounts.", [
    ["12 notebooks cost ₹408.", "True", "12 × ₹40 = ₹480; 15% off gives ₹408."],
    ["An order of 12 notebooks gets free delivery.", "False", "After the discount it's ₹408, which is not above ₹500."],
    ["The shop also sells pens.", "Cannot say", "The passage only mentions notebooks."],
  ]],
  ["Kiran is older than Lata but younger than Mohan. Nisha is older than Mohan.", [
    ["Nisha is older than Kiran.", "True", "Nisha > Mohan > Kiran."],
    ["Lata is the youngest of the four.", "True", "Lata < Kiran < Mohan < Nisha."],
    ["Mohan is more than five years older than Kiran.", "Cannot say", "No ages or age gaps are given."],
  ]],
];
const tfcsQuestions = PASSAGES.flatMap(([passage, statements], pi) =>
  statements.map(([statement, answer, why], si) =>
    q(
      "VRB.PAS.TFCS",
      answer === "Cannot say" ? 4 : pi % 3 === 0 ? 2 : 3,
      `Read the passage, then decide whether the statement is True, False, or Cannot say from the passage alone.\n\nPassage: ${passage}\n\nStatement: ${statement}`,
      answer,
      Object.fromEntries(Object.entries(TFCS_WHY).filter(([k]) => k !== answer)),
      why,
      si === 0 ? "Use only what the passage says - not what you know or assume." : "True = stated or follows directly; False = contradicted; Cannot say = not settled."
    )
  )
);

// ------------------------------------------------ Sentence completion
const SC = [
  [2, "The printer was out of paper, so the report could not be ______.", "printed", { signed: "Paper affects printing, not signing.", typed: "Typing doesn't need paper.", emailed: "Emailing doesn't need paper." }, "No paper stops printing."],
  [2, "Please ______ your seat belt before the plane takes off.", "fasten", { open: "You open a seat belt when you get up, not before take-off.", remove: "You remove your seat belt after landing, not before take-off.", tie: "Seat belts are fastened, not tied." }, "The fixed phrase is 'fasten your seat belt'."],
  [2, "She was so ______ after the long shift that she fell asleep on the bus.", "exhausted", { energetic: "An energetic person wouldn't fall asleep.", excited: "Excitement keeps people awake.", curious: "Curiosity doesn't make you fall asleep." }, "Falling asleep after a long shift means she was very tired."],
  [2, "The meeting was ______ because the manager was ill.", "postponed", { attended: "An ill manager is a reason NOT to hold it.", celebrated: "Meetings aren't celebrated because someone is ill.", extended: "Illness would shorten or delay a meeting, not extend it." }, "Illness is a reason to put the meeting off."],
  [2, "Drink plenty of water in summer to avoid ______.", "dehydration", { hydration: "Drinking water gives hydration - the sentence says 'avoid'.", sunshine: "Water doesn't help you avoid sunshine.", appetite: "Water isn't linked to avoiding appetite here." }, "Water prevents dehydration."],
  [3, "The new app is very ______; even first-time users can find their way around it easily.", "intuitive", { complicated: "A complicated app would confuse first-time users.", expensive: "Price has nothing to do with finding your way around.", outdated: "An outdated app isn't necessarily easy to use." }, "Easy for first-time users = intuitive."],
  [3, "Despite the heavy traffic, he arrived ______ for the interview.", "punctually", { late: "'Despite' signals a contrast - traffic would make him late, but he wasn't.", angrily: "'Despite' needs a contrast with being delayed.", slowly: "Doesn't contrast with heavy traffic." }, "'Despite' sets up a contrast with being delayed."],
  [3, "The customer's complaint was ______, so the agent apologised and fixed the error immediately.", "valid", { baseless: "A baseless complaint wouldn't lead to an apology and a fix.", funny: "Humour isn't a reason to fix an error.", anonymous: "Being anonymous doesn't explain the apology." }, "An apology and fix show the complaint was justified."],
  [3, "The two reports were so ______ that the manager asked for a single, combined version.", "similar", { different: "Very different reports are harder to combine into one.", long: "Length alone isn't a reason to combine them.", late: "Lateness isn't a reason to combine them." }, "Near-identical reports can be merged."],
  [3, "Our office is ______ located: it is just two minutes from the metro station.", "conveniently", { remotely: "Two minutes from the metro is not remote.", poorly: "Being near the metro is a good location.", secretly: "Location isn't secret here." }, "Close to transport = convenient."],
  [3, "He tends to ______ problems until they become too big to ignore.", "postpone", { solve: "Solving problems early would stop them becoming too big.", report: "Reporting problems prevents them growing unnoticed.", predict: "Predicting doesn't explain letting them grow." }, "'Until they become too big' tells you he delays dealing with them."],
  [3, "The instructions were ______, so everyone completed the form correctly.", "clear", { vague: "Vague instructions would cause mistakes.", missing: "Missing instructions wouldn't lead to correct forms.", printed: "Being printed doesn't explain everyone getting it right." }, "Everyone got it right because the instructions were easy to follow."],
  [4, "The speaker's argument was ______: every point was supported by data.", "compelling", { flimsy: "Data-backed points make an argument strong, not flimsy.", irrelevant: "Nothing suggests the points were off-topic.", brief: "Length isn't what the colon explains." }, "The colon explains why: well supported = convincing."],
  [4, "The manager praised her ______ approach; she checked every figure twice before submitting.", "meticulous", { careless: "Checking twice is the opposite of careless.", hasty: "Checking twice takes time, not haste.", casual: "Double-checking is not casual." }, "Checking every figure twice = very careful."],
  [4, "Although the product was ______ at first, it became popular once people understood its benefits.", "unpopular", { successful: "'Although … it became popular' needs a contrast.", famous: "Doesn't contrast with 'became popular'.", cheap: "Price doesn't contrast with popularity." }, "'Although' signals a contrast with 'became popular'."],
  [4, "The two departments were ______ over the budget and could not agree on a single figure.", "at odds", { "in agreement": "They 'could not agree'.", "at ease": "Being relaxed doesn't fit a disagreement.", "on time": "Timing has nothing to do with disagreement." }, "'Could not agree' = in conflict."],
  [4, "The instructions were deliberately ______ so that trainees would have to think for themselves.", "open-ended", { detailed: "Detailed instructions would do the thinking for them.", printed: "Printing doesn't force independent thinking.", repeated: "Repetition doesn't make them think for themselves." }, "Instructions that leave room for thought are open-ended."],
  [4, "Her feedback was ______ but kind: she pointed out every weakness without being harsh.", "candid", { vague: "She 'pointed out every weakness', which is not vague.", cruel: "'But kind' rules this out.", flattering: "Pointing out weaknesses isn't flattery." }, "Honest (every weakness) but kind."],
  [4, "The company's profits were ______ by a sudden rise in fuel costs.", "eroded", { boosted: "A rise in costs reduces profit, not increases it.", unaffected: "A sudden cost rise would affect profits.", doubled: "Higher costs don't double profits." }, "Higher costs eat into profit."],
  [5, "The committee's decision was ______; no one could find any reason for it.", "arbitrary", { justified: "'No one could find any reason' contradicts justified.", unanimous: "Unanimity is about agreement, not reasons.", reversible: "Doesn't match 'no reason for it'." }, "A decision without any reason is arbitrary."],
  [5, "The negotiator remained ______ even when the other side became aggressive.", "composed", { hostile: "The contrast with 'aggressive' needs calmness.", aggressive: "'Even when the other side became aggressive' sets up a contrast - the negotiator stayed calm.", confused: "Nothing suggests confusion." }, "'Even when the other side became aggressive' → she stayed calm."],
  [5, "His explanation was so ______ that it took three readings to understand.", "convoluted", { concise: "A concise explanation would be quick to understand.", lucid: "Lucid means clear.", accurate: "Accuracy doesn't make something hard to follow." }, "Hard to follow = convoluted."],
  [5, "The new rules are meant to ______ fraud, not merely to detect it after it happens.", "prevent", { encourage: "Rules against fraud don't encourage it.", report: "Reporting is closer to detecting, which the sentence contrasts with.", ignore: "Rules aren't meant to ignore fraud." }, "'Not merely to detect it after it happens' → stop it beforehand."],
  [5, "The results were ______: some tests improved while others got worse.", "mixed", { conclusive: "Some better and some worse is not conclusive.", excellent: "Some got worse.", disastrous: "Some improved." }, "Some up, some down = mixed."],
];
const scQuestions = SC.map(([level, sentence, answer, wrong, why]) =>
  q("VRB.SCP.COMPLETE", level, `Choose the best word or phrase to complete the sentence:\n"${sentence}"`, answer, wrong, why, "Look for the clue in the sentence that points to the missing word.")
);

// ------------------------------------------------ Sentence ordering
const PJ = [
  [3, ["First, log in with your employee ID.", "Then, open the 'Leave' tab.", "Next, choose the dates and the type of leave.", "Finally, click Submit and wait for approval."], "Sequence words: First, Then, Next, Finally."],
  [3, ["The customer called about a late delivery.", "The agent apologised and checked the order.", "She found that the parcel had been sent to the wrong city.", "She arranged a free replacement for the next day."], "Follow the story: problem → check → cause → fix."],
  [3, ["Our team set a goal to reduce waiting times.", "We studied which calls took the longest.", "Most long calls turned out to be password resets.", "So we added a self-service reset option, and waiting times fell."], "Goal → investigation → finding → action and result."],
  [4, ["Water is essential for all living things.", "However, only a small part of the Earth's water is fresh.", "Much of that fresh water is frozen in ice caps.", "This is why saving water matters so much."], "'However', 'that fresh water' and 'This' refer back to earlier sentences."],
  [4, ["Many people find public speaking frightening.", "One reason is the fear of being judged.", "Practising in front of friends can reduce this fear.", "With time, speaking to a large group becomes easier."], "'One reason' and 'this fear' need something before them."],
  [4, ["A good email has a clear subject line.", "It starts with a short greeting.", "The main point comes in the first paragraph.", "It ends with a polite closing and the sender's name."], "Follow the order of an email from top to bottom."],
  [4, ["Last year the company opened a new office in Pune.", "At first, only ten people worked there.", "Within six months the team had grown to fifty.", "Now the Pune office is the company's second largest."], "Time order: last year → at first → within six months → now."],
  [4, ["Rohan wanted to improve his English.", "He decided to read one newspaper article every day.", "He wrote down every new word and its meaning.", "After a few months, his vocabulary had improved noticeably."], "Aim → plan → method → result."],
  [5, ["Plastic bags were once seen as a convenient invention.", "They were cheap, light and waterproof.", "But these same qualities made them a problem.", "Because they last so long, they now pollute rivers and oceans."], "'They' needs 'plastic bags' first; 'But these same qualities' refers to the list of benefits."],
  [5, ["The meeting was scheduled for 10 a.m.", "By 10:15, only half the team had joined.", "The manager decided to start anyway.", "Those who joined late were sent the notes afterwards."], "Clock times and 'anyway' show the order."],
  [5, ["Some people believe multitasking saves time.", "Research suggests the opposite is often true.", "Switching between tasks costs attention and increases mistakes.", "Doing one thing at a time is usually faster overall."], "Claim → counter-evidence → explanation → conclusion."],
  [5, ["The festival season brings a rush of online orders.", "To cope, the warehouse hires extra staff every October.", "These temporary workers are trained for a week before the rush.", "As a result, deliveries stay on time even at the busiest point."], "'To cope' responds to the rush; 'These temporary workers' refers to the extra staff."],
];
const { shuffle: pjShuffle } = makeKit(31_2026);
const pjQuestions = PJ.map(([level, sentences, why]) => {
  const labels = ["P", "Q", "R", "S"];
  const order = pjShuffle([0, 1, 2, 3]); // order[i] = which sentence gets label i
  const labelOf = (sentenceIndex) => labels[order.indexOf(sentenceIndex)];
  const correct = [0, 1, 2, 3].map(labelOf).join("");
  const swap = (s, i, j) => { const a = s.split(""); [a[i], a[j]] = [a[j], a[i]]; return a.join(""); };
  const wrongSeqs = [...new Set([swap(correct, 0, 1), swap(correct, 2, 3), swap(correct, 1, 2), correct.split("").reverse().join("")])].filter((x) => x !== correct).slice(0, 3);
  const listed = labels.map((l, i) => `${l}: ${sentences[order[i]]}`).join("\n");
  return q(
    "VRB.PJM.ORDER",
    level,
    `Arrange the sentences in the most logical order:\n${listed}`,
    correct,
    Object.fromEntries(wrongSeqs.map((w) => [w, "The links between sentences (sequence words, pronouns, cause and effect) don't work in this order."])),
    `Correct order: ${correct}. ${why}`,
    "Find the opening sentence first - the one that doesn't depend on any other."
  );
});

// ------------------------------------------------ Critical reasoning
const CR = [
  ["VRB.CRT.STRENGTHEN", 3, "Argument: \"Teams that take a 10-minute break every two hours make fewer errors, so all teams should take such breaks.\"\nWhich statement, if true, most STRENGTHENS the argument?",
    "Teams that started taking breaks made fewer errors than they had before.", {
      "Breaks are popular with employees.": "Popularity doesn't show that breaks reduce errors.",
      "Some teams already take longer lunch breaks.": "Irrelevant to whether short breaks cut errors.",
      "Teams with breaks were also given newer computers.": "This WEAKENS it - the computers might explain the fewer errors.",
    }, "A before-and-after drop in the same teams supports breaks being the cause."],
  ["VRB.CRT.STRENGTHEN", 4, "Argument: \"Customers who use our chat support are more satisfied than those who phone us, so we should move everyone to chat.\"\nWhich statement, if true, most WEAKENS the argument?",
    "Customers with complicated problems usually choose to phone.", {
      "Chat support is cheaper to run.": "This gives another reason FOR chat, not against the argument.",
      "Chat customers get replies within two minutes.": "This supports chat rather than weakening the argument.",
      "Most customers own a smartphone.": "Irrelevant to satisfaction differences.",
    }, "If phone callers have harder problems, their lower satisfaction may be due to the problems, not the channel."],
  ["VRB.CRT.STRENGTHEN", 4, "Argument: \"Since the company began offering free English classes, staff turnover has fallen. The classes must be making staff more likely to stay.\"\nWhich statement, if true, most WEAKENS the argument?",
    "At the same time, the company raised salaries for all staff.", {
      "The classes are held after working hours.": "Timing of classes doesn't explain the fall in turnover.",
      "Staff who attend the classes enjoy them.": "Enjoyment slightly supports the argument, if anything.",
      "English skills are useful in many jobs.": "This doesn't weaken the link to turnover.",
    }, "A salary rise at the same time offers another explanation for staff staying."],
  ["VRB.CRT.STRENGTHEN", 3, "Argument: \"Our new website layout has increased online sales.\"\nWhich statement, if true, most STRENGTHENS this?",
    "Sales rose only after the new layout launched, while prices and advertising stayed the same.", {
      "The new layout uses brighter colours.": "Describes the layout but not its effect on sales.",
      "Competitors also redesigned their websites.": "Doesn't show our layout caused our sales rise.",
      "The designers were very experienced.": "Experience doesn't prove the effect.",
    }, "Ruling out other changes (prices, advertising) makes the layout the likely cause."],
  ["VRB.CRT.ASSUMPTION", 3, "Argument: \"We should hold the training online, because then more employees will attend.\"\nWhich assumption does this depend on?",
    "Some employees who can't attend in person would be able to attend online.", {
      "Online training is cheaper.": "Cost isn't part of the reasoning.",
      "All employees prefer online training.": "The argument only needs SOME extra attendees, not all.",
      "Trainers prefer teaching online.": "The argument is about attendance, not trainers."
    }, "More attendance online only follows if online removes a barrier for some people."],
  ["VRB.CRT.ASSUMPTION", 4, "Argument: \"Meena has five years of sales experience, so she will be a good sales manager.\"\nWhich assumption does this depend on?",
    "Experience in sales prepares someone to manage a sales team.", {
      "Meena wants to be a manager.": "Wanting the job isn't the link the argument relies on.",
      "Meena is the most experienced person in the team.": "Being the most experienced isn't needed for the argument.",
      "Sales managers earn more.": "Pay is irrelevant to the reasoning."
    }, "The argument jumps from doing sales to managing sales - it assumes one leads to the other."],
  ["VRB.CRT.ASSUMPTION", 4, "Argument: \"Put the notice on the canteen wall - that way, everyone will see it.\"\nWhich assumption does this depend on?",
    "Everyone visits the canteen.", {
      "The notice is important.": "Importance isn't what makes everyone see it.",
      "The canteen wall is large.": "Size doesn't guarantee everyone sees it.",
      "People read notices carefully.": "The claim is that everyone will SEE it, not read it carefully."
    }, "Everyone will see it only if everyone goes to the canteen."],
  ["VRB.CRT.ASSUMPTION", 3, "Argument: \"Let's advertise the job on social media. Young graduates spend a lot of time there.\"\nWhich assumption does this depend on?",
    "The company wants to attract young graduates for this job.", {
      "Social media advertising is free.": "Cost isn't part of the reasoning.",
      "Older candidates don't use social media.": "Not needed - the argument is about reaching graduates.",
      "Graduates never read newspapers.": "Too strong and not needed."
    }, "Advertising where graduates are only makes sense if graduates are the target."],
  ["VRB.CRT.INFERENCE", 3, "Statement: \"Every order above ₹999 gets free delivery. Rahul paid a delivery charge on his order.\"\nWhich conclusion MUST be true?",
    "Rahul's order was ₹999 or less.", {
      "Rahul's order was very small.": "It was at most ₹999 - not necessarily very small.",
      "Rahul will not order again.": "Nothing supports this.",
      "Only orders above ₹999 are delivered.": "Smaller orders are delivered too - with a charge."
    }, "Above ₹999 means free delivery; he paid, so his order wasn't above ₹999."],
  ["VRB.CRT.INFERENCE", 4, "Statement: \"All the trainees passed the first test. Some of the trainees also passed the advanced test.\"\nWhich conclusion MUST be true?",
    "Some people who passed the first test also passed the advanced test.", {
      "All the trainees passed the advanced test.": "Only 'some' did.",
      "The advanced test was harder.": "The statements don't compare difficulty.",
      "Nobody failed the advanced test.": "Some trainees may have failed it."
    }, "The trainees who passed the advanced test had also passed the first test."],
  ["VRB.CRT.INFERENCE", 4, "Statement: \"The shop is open only on days when it isn't raining. The shop was open yesterday.\"\nWhich conclusion MUST be true?",
    "It did not rain yesterday.", {
      "It will not rain today.": "Yesterday tells us nothing certain about today.",
      "The shop is open every day.": "It's closed on rainy days.",
      "The shop was busy yesterday.": "Nothing is said about how busy it was."
    }, "It opens only on dry days, so an open day was a dry day."],
  ["VRB.CRT.INFERENCE", 5, "Statement: \"No one in the finance team works on weekends. Sunil worked last Saturday.\"\nWhich conclusion MUST be true?",
    "Sunil is not in the finance team.", {
      "Sunil works every weekend.": "One Saturday doesn't mean every weekend.",
      "Sunil is in the sales team.": "He could be in any team other than finance.",
      "The finance team was short-staffed.": "Nothing supports this."
    }, "If he were in finance, he wouldn't work weekends."],
  ["VRB.CRT.FLAW", 4, "Argument: \"Our top salesperson drinks green tea every morning. If everyone drank green tea, sales would rise.\"\nWhat is the main flaw?",
    "It assumes one person's habit is the cause of their success.", {
      "It relies on too many statistics.": "No statistics are used.",
      "It attacks the salesperson personally.": "No one is attacked.",
      "It ignores the price of green tea.": "Price isn't the reasoning error."
    }, "A habit shared by one successful person doesn't show it causes success."],
  ["VRB.CRT.FLAW", 4, "Argument: \"Either we cut staff or the company will close. We can't let the company close, so we must cut staff.\"\nWhat is the main flaw?",
    "It pretends there are only two options when there may be others.", {
      "It uses a small sample.": "No sample is involved.",
      "It confuses cause and effect.": "The problem is the limited choice, not cause and effect.",
      "It relies on an expert's opinion.": "No expert is quoted."
    }, "Other options (cutting costs elsewhere, raising sales) are ignored - a false choice."],
  ["VRB.CRT.FLAW", 5, "Argument: \"Most people who buy our premium plan renew it, so the premium plan must be the best value.\"\nWhat is the main flaw?",
    "High renewal doesn't show value compared with other plans.", {
      "It uses emotional language.": "The wording isn't emotional.",
      "It relies on one customer's opinion.": "It refers to most buyers, not one.",
      "It assumes renewal rates never change.": "That isn't the central error."
    }, "People may renew out of habit or need; 'best value' needs a comparison with other plans."],
  ["VRB.CRT.FLAW", 5, "Argument: \"Nobody has proved that the new software is unsafe, so it must be safe.\"\nWhat is the main flaw?",
    "It treats a lack of evidence against something as proof for it.", {
      "It uses a biased sample.": "No sample is involved.",
      "It attacks the people who made the software.": "No one is attacked.",
      "It assumes the software is expensive.": "Cost isn't mentioned."
    }, "Not proven unsafe is not the same as proven safe."],
];
const crQuestions = CR.map(([skillId, level, prompt, answer, wrong, why]) => q(skillId, level, prompt, answer, wrong, why, skillId.endsWith("FLAW") ? "Ask: does the evidence really prove the conclusion?" : "Link the evidence to the conclusion - what fills the gap?"));

// ------------------------------------------------ Argument evaluation
const AE = [
  [3, "Should employees be allowed to choose their own working hours?", "Yes - people work best at different times of day, so flexible hours can raise productivity.", "Strong", "A relevant, important reason directly linked to the question."],
  [3, "Should the office canteen stop serving fried food?", "No - some people like fried food.", "Weak", "Liking something doesn't address whether it should be served; it's a minor, personal reason."],
  [4, "Should all customer calls have a time limit of five minutes?", "No - some genuine problems need longer to solve, and cutting them short would harm customers.", "Strong", "A relevant, serious consequence directly linked to the question."],
  [4, "Should the company plant trees around the office?", "Yes - trees look nice.", "Weak", "Looks alone is a trivial reason compared with cost, space or environmental benefit."],
  [4, "Should mobile phones be banned during team meetings?", "Yes - phones distract people and meetings take longer.", "Strong", "A relevant, practical effect on the meeting itself."],
  [4, "Should the company stop hiring freshers?", "Yes - freshers are young.", "Weak", "Age alone isn't a reason; it doesn't address skill, cost or performance."],
  [5, "Should all training be moved online?", "No - hands-on skills like equipment handling are hard to learn without practice in person.", "Strong", "Points to a real limitation directly relevant to the question."],
  [5, "Should the company give every employee a laptop?", "Yes - every other company does it.", "Weak", "'Everyone else does it' isn't a reason about this company's needs."],
];
const aeQuestions = AE.map(([level, question, argument, answer, why]) =>
  q(
    "VRB.ARG.EVALUATE",
    level,
    `Question: ${question}\nArgument: "${argument}"\nIs this a strong or a weak argument?`,
    answer === "Strong" ? "Strong - it gives a relevant, important reason" : "Weak - the reason is trivial or not really relevant",
    answer === "Strong"
      ? { "Weak - the reason is trivial or not really relevant": "The reason is directly relevant and important.", "Weak - it doesn't mention cost": "An argument can be strong without covering every factor.", "Strong - because it's a popular view": "Strength comes from relevance and importance, not popularity." }
      : { "Strong - it gives a relevant, important reason": why, "Strong - because it answers yes or no clearly": "A clear yes/no doesn't make the reason strong.", "Weak - because it is too long": "Length isn't what makes an argument weak." },
    why,
    "Strong = relevant and important. Weak = trivial, unrelated, or just a personal preference."
  )
);

// ------------------------------------------------ Fact vs opinion (built from two hand-checked lists)
const FACTS = [
  "The office opens at 9 a.m. on weekdays.",
  "Mumbai is on the west coast of India.",
  "The meeting room has twelve chairs.",
  "Water boils at 100 °C at sea level.",
  "The company was founded in 2012.",
  "This laptop weighs 1.4 kg.",
  "The train to Delhi leaves from platform 3.",
  "Our team handled 540 calls last week.",
  "A week has seven days.",
  "The new policy starts on 1 April.",
  "The report is 18 pages long.",
  "The canteen serves lunch from 1 p.m. to 2:30 p.m.",
  "The course has five modules.",
  "The Earth goes around the Sun.",
  "There are 24 hours in a day.",
  "The parcel was delivered on Tuesday.",
];
const OPINIONS = [
  "Our office has the friendliest people in the city.",
  "Working from home is better than working in the office.",
  "The new logo looks far more modern.",
  "Monday is the worst day of the week.",
  "This is the most useful training course we have ever had.",
  "Summer is the best season for a holiday.",
  "The manager's speech was inspiring.",
  "Online classes are more boring than classroom classes.",
  "The canteen's food is delicious.",
  "Our app is easier to use than any other app.",
  "Cricket is more exciting than football.",
  "The new office chairs are very comfortable.",
  "Blue is a calming colour for an office.",
  "The old website was ugly.",
];
const { sample: foSample, shuffle: foShuffle, take: foTake } = makeKit(41_2026);
const foQuestions = [
  ...foTake(24, () => {
    const fact = foSample(FACTS, 1)[0];
    const ops = foSample(OPINIONS, 3);
    return {
      skillId: "VRB.ARG.FACTOPINION",
      level: 2,
      prompt: `Which of these statements is a FACT rather than an opinion?\n${foShuffle([fact, ...ops]).map((s) => `• ${s}`).join("\n")}`,
      options: foShuffle([fact, ...ops]),
      correctAnswer: fact,
      distractorReasons: Object.fromEntries(ops.map((o) => [o, "This is a judgement people could disagree with - an opinion."])),
      explanation: `"${fact}" can be checked and proved true or false; the others are personal judgements.`,
      hint: "A fact can be checked; an opinion is a judgement (best, worst, boring, beautiful …).",
      timeLimitSeconds: 60,
    };
  }),
  ...foTake(24, () => {
    const op = foSample(OPINIONS, 1)[0];
    const facts = foSample(FACTS, 3);
    return {
      skillId: "VRB.ARG.FACTOPINION",
      level: 2,
      prompt: `Which of these statements is an OPINION rather than a fact?\n${foShuffle([op, ...facts]).map((s) => `• ${s}`).join("\n")}`,
      options: foShuffle([op, ...facts]),
      correctAnswer: op,
      distractorReasons: Object.fromEntries(facts.map((f) => [f, "This can be checked and proved - it's a fact."])),
      explanation: `"${op}" is a personal judgement; the others can be checked.`,
      hint: "Look for judgement words like better, worst, delicious, boring.",
      timeLimitSeconds: 60,
    };
  }),
];

// ------------------------------------------------ Reasoning: statements & conclusions / assumptions / cause and effect
const RD = [
  ["REA.DED.CONCLUSIONS", 3, "Statement: \"The company has decided to give all employees a laptop so that they can work from home when needed.\"\nConclusions: I. Some employees may need to work from home. II. Employees will no longer come to the office.", "Only I follows", { "Only II follows": "The laptops are for 'when needed' - office work continues.", "Both I and II follow": "II goes too far.", "Neither I nor II follows": "I follows from 'when needed'." }, "The reason given ('when needed') implies working from home will sometimes be needed; it doesn't end office work."],
  ["REA.DED.CONCLUSIONS", 3, "Statement: \"Tickets for the concert sold out within an hour of going on sale.\"\nConclusions: I. The concert was in high demand. II. The concert hall was small.", "Only I follows", { "Only II follows": "A quick sell-out doesn't prove the hall was small.", "Both I and II follow": "II isn't supported.", "Neither I nor II follows": "I follows directly." }, "Selling out fast shows high demand; the hall's size isn't known."],
  ["REA.DED.CONCLUSIONS", 4, "Statement: \"Employees who complete the safety course will be allowed to operate the forklift.\"\nConclusions: I. Anyone who operates the forklift must have completed the course. II. Completing the course is enough to be allowed to operate the forklift.", "Only II follows", { "Only I follows": "The statement says completing the course is enough; it doesn't say it's the only way.", "Both I and II follow": "I isn't stated - there could be other routes.", "Neither I nor II follows": "II follows directly." }, "Completing the course → allowed (II). It doesn't say only course-completers are allowed (I)."],
  ["REA.DED.CONCLUSIONS", 4, "Statement: \"The bridge will be closed for repairs from Monday to Friday. Traffic will be diverted through the old market road.\"\nConclusions: I. The old market road may be busier than usual next week. II. The bridge is unsafe.", "Only I follows", { "Only II follows": "Repairs don't necessarily mean the bridge is unsafe.", "Both I and II follow": "II goes too far.", "Neither I nor II follows": "Diverted traffic makes I a reasonable conclusion." }, "Diverting traffic onto a road will make it busier; 'repairs' doesn't prove the bridge is unsafe."],
  ["REA.DED.ASSUMPTIONS", 3, "Statement: \"Put up signs in Hindi and English at the station so that passengers can find their platform easily.\"\nAssumptions: I. Passengers can read Hindi or English. II. Passengers sometimes find it hard to find their platform.", "Both I and II are implicit", { "Only I is implicit": "II is also assumed - otherwise the signs wouldn't be needed.", "Only II is implicit": "I is also assumed - otherwise the signs wouldn't help.", "Neither is implicit": "Both are needed for the suggestion to make sense." }, "The signs help only if passengers can read them (I) and need help finding platforms (II)."],
  ["REA.DED.ASSUMPTIONS", 4, "Statement: \"Book your tickets early - prices go up as the travel date gets closer.\"\nAssumptions: I. People prefer to pay less. II. Tickets will definitely sell out.", "Only I is implicit", { "Only II is implicit": "Selling out isn't mentioned or needed.", "Both I and II are implicit": "II isn't needed.", "Neither is implicit": "I is needed - the advice relies on people wanting a lower price." }, "The advice only makes sense if people want to pay less; selling out isn't part of it."],
  ["REA.DED.ASSUMPTIONS", 4, "Statement: \"The manager said, 'Send the report by email so the whole team gets it today.'\"\nAssumptions: I. Every team member checks email. II. Email is the only way to share reports.", "Only I is implicit", { "Only II is implicit": "Email being the ONLY way isn't needed.", "Both I and II are implicit": "II isn't needed.", "Neither is implicit": "I is needed for the whole team to get it today." }, "The whole team gets it only if they all check email; other channels may exist."],
  ["REA.DED.CAUSE", 4, "Statements: I. The city had three days of very heavy rain. II. Several low-lying roads were flooded.\nWhat is the relationship?", "I is the cause and II is its effect", { "II is the cause and I is its effect": "Flooded roads can't cause rain.", "Both are effects of a common cause": "Heavy rain is itself the cause here.", "The two statements are unrelated": "Heavy rain clearly explains flooding." }, "Heavy rain (cause) led to flooding (effect)."],
  ["REA.DED.CAUSE", 4, "Statements: I. The company's main server stopped working this morning. II. Customers could not log in to the app today.\nWhat is the relationship?", "I is the cause and II is its effect", { "II is the cause and I is its effect": "Customers failing to log in doesn't break a server.", "Both are effects of a common cause": "The server failure directly explains the login problem.", "The two statements are unrelated": "A server failure commonly stops logins." }, "The server failure (cause) stopped logins (effect)."],
  ["REA.DED.CAUSE", 5, "Statements: I. Sales of umbrellas rose sharply. II. Sales of raincoats rose sharply.\nWhat is the relationship?", "Both are effects of a common cause", { "I is the cause and II is its effect": "Buying umbrellas doesn't make people buy raincoats.", "II is the cause and I is its effect": "Raincoat sales don't cause umbrella sales.", "The two statements are unrelated": "They are clearly linked - probably by rainy weather." }, "Both are likely effects of the same cause, such as the start of the rainy season."],
  ["REA.DED.CAUSE", 5, "Statements: I. Petrol prices rose by 15%. II. Many people started using public transport.\nWhat is the relationship?", "I is the cause and II is its effect", { "II is the cause and I is its effect": "More people on buses doesn't raise petrol prices.", "Both are effects of a common cause": "The price rise itself explains the change.", "The two statements are unrelated": "Higher fuel costs commonly push people to public transport." }, "The price rise (cause) led people to switch (effect)."],
];
const rdQuestions = RD.map(([skillId, level, prompt, answer, wrong, why]) =>
  q(skillId, level, `${prompt}\nWhich option is correct?`, answer, wrong, why, skillId.endsWith("CAUSE") ? "Ask which event could have led to the other." : "Only accept what follows directly - no more, no less.")
);

export const VERBAL_QUESTIONS = [...tfcsQuestions, ...scQuestions, ...pjQuestions, ...crQuestions, ...aeQuestions, ...foQuestions, ...rdQuestions];
