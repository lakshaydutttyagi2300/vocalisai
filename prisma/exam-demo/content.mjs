// IELTS-STYLE Academic practice tests (P1-H demo, extended to 3 tests).
//
// Every word here is ORIGINAL content written for VocalisAi - no passage,
// script, task or question is copied or adapted from any real exam paper,
// past paper or official practice material. The structure (4 listening
// parts / 3 reading passages / 2 writing tasks / 3 speaking parts, and
// their timings) follows the publicly described shape of that style of
// test; the content does not. All named people and places are fictional.
//
// Each practice test is its own ExamVariant + template (see seed.mjs), so
// a sitting always gets one coherent test - e.g. Speaking Part 3 always
// discusses the same theme as that test's Part 2.
//
// Shape of a part:
//   { key, name, instructions, prepSeconds?, responseSeconds?,
//     questionCount,
//     groups: [{ type, title, text?, transcript?, script?, chart?, playLimit?, questions }],
//     questions: [...] }   // ungrouped (writing/speaking)
// A question is { type, prompt, options?, correctAnswer?, scoringCriteria?, timeLimitSeconds }.

export const DEMO_FAMILY_SLUG = "IELTS_STYLE";
export const DEMO_SCORE_SCALE = "IELTS_STYLE_BAND";
export const DEMO_DIFFICULTY = "ADVANCED";

const gap = (answers) => JSON.stringify([answers]);
const pick = (answers) => JSON.stringify(answers);
const transcriptOf = (script) => script.map(([who, line]) => `${who === "F" ? "Woman" : "Man"}: ${line}`).join("\n");
const chartAsText = (c) =>
  [c.title, `Year: ${c.categories.join(" | ")}`, ...c.series.map((s) => `${s.name}: ${s.values.join(" | ")}`)].join("\n");

const WRITING_TASK1_TAIL = "Describe the main features of the chart and compare the figures where it makes sense. Write at least 150 words.";

// ---------------------------------------------------------------------------
// Builders - turn one test's raw content into the 4-paper structure.
// ---------------------------------------------------------------------------

const LISTENING_INSTRUCTIONS = [
  "A conversation about an everyday arrangement. Write ONE WORD AND/OR A NUMBER for each answer.",
  "A talk to visitors or members of the public. Choose the correct answers.",
  "Two students discuss a project. Choose the correct answers.",
  "Part of a lecture. Write ONE WORD ONLY for each answer.",
];

function listeningPaper(tag, parts) {
  return {
    key: "listening",
    name: "Listening",
    category: "LISTENING",
    durationSeconds: 30 * 60,
    navigationMode: "LOCKED_SEQUENTIAL",
    allowReview: false,
    instructions: "There are four parts. You will hear each recording ONCE. Answer the questions as you listen. Answers are checked for spelling.",
    parts: parts.map((p, i) => ({
      key: `l${i + 1}`,
      name: `Part ${i + 1}`,
      instructions: p.instructions ?? LISTENING_INSTRUCTIONS[i],
      questionCount: p.questions.length,
      groups: [
        {
          type: "AUDIO",
          title: `${tag} Listening Part ${i + 1} - ${p.title}`,
          script: p.script,
          transcript: transcriptOf(p.script),
          playLimit: 1,
          questions: p.questions,
        },
      ],
    })),
  };
}

const READING_INSTRUCTIONS = [
  "Do the statements agree with the information in the passage? Choose True, False or Not given.",
  "Answer the questions about the writer's views.",
  "Complete the sentences with NO MORE THAN TWO WORDS from the passage, and answer the question.",
];

function readingPaper(tag, passages) {
  return {
    key: "reading",
    name: "Reading",
    category: "READING_COMPREHENSION",
    durationSeconds: 60 * 60,
    navigationMode: "FREE_WITHIN_SECTION",
    allowReview: true,
    instructions: "There are three passages. You may move between questions and change your answers until you submit the paper.",
    parts: passages.map((p, i) => ({
      key: `r${i + 1}`,
      name: `Passage ${i + 1}`,
      instructions: READING_INSTRUCTIONS[i],
      questionCount: p.questions.length,
      groups: [{ type: "PASSAGE", title: `${tag} ${p.text.split("\n")[0]}`, text: p.text, questions: p.questions }],
    })),
  };
}

function writingPaper(tag, { chart, chartIntro, essay }) {
  return {
    key: "writing",
    name: "Writing",
    category: "WRITING",
    durationSeconds: 60 * 60,
    navigationMode: "FREE_WITHIN_SECTION",
    allowReview: true,
    instructions: "There are two tasks. Spend about 20 minutes on Task 1 and about 40 minutes on Task 2. Writing is not marked automatically.",
    parts: [
      {
        key: "w1",
        name: "Task 1",
        instructions: "Write at least 150 words.",
        questionCount: 1,
        groups: [
          {
            type: "CHART",
            title: `${tag} Chart - ${chart.title}`,
            text: `Bar chart: ${chart.title}.`,
            chart,
            questions: [
              {
                type: "LONG_WRITING",
                prompt: `${chartIntro}\n\n${chartAsText(chart)}\n\n${WRITING_TASK1_TAIL}`,
                scoringCriteria: "Target: at least 150 words. Not auto-marked.",
                timeLimitSeconds: 300,
              },
            ],
          },
        ],
      },
      {
        key: "w2",
        name: "Task 2",
        instructions: "Write at least 250 words.",
        questionCount: 1,
        questions: [{ type: "LONG_WRITING", prompt: `${essay} Write at least 250 words.`, scoringCriteria: "Target: at least 250 words. Not auto-marked.", timeLimitSeconds: 300 }],
      },
    ],
  };
}

function speakingPaper({ part1, cueCard, part3, theme }) {
  const speak = (prompt, timeLimitSeconds) => ({ type: "TIMED_SPEAKING", prompt, timeLimitSeconds });
  return {
    key: "speaking",
    name: "Speaking",
    category: "SPEAKING",
    durationSeconds: 15 * 60,
    navigationMode: "LOCKED_SEQUENTIAL",
    allowReview: false,
    instructions: "Three parts. Each answer is recorded once your speaking time starts. Speaking is not marked automatically.",
    parts: [
      {
        key: "s1",
        name: "Part 1",
        instructions: "Short questions about everyday topics. Answer each in about 30 seconds.",
        prepSeconds: 0,
        responseSeconds: 30,
        questionCount: part1.length,
        questions: part1.map((q) => speak(q, 30)),
      },
      {
        key: "s2",
        name: "Part 2",
        instructions: "You have 1 minute to prepare, then speak for up to 2 minutes.",
        prepSeconds: 60,
        responseSeconds: 120,
        questionCount: 1,
        questions: [speak(cueCard, 180)],
      },
      {
        key: "s3",
        name: "Part 3",
        instructions: `A discussion linked to the Part 2 topic of ${theme}. Answer each in about 45 seconds.`,
        prepSeconds: 0,
        responseSeconds: 45,
        questionCount: part3.length,
        questions: part3.map((q) => speak(q, 45)),
      },
    ],
  };
}

function practiceTest(number, { listening, reading, writing, speaking }) {
  const tag = `PT${number} ·`;
  return {
    number,
    variantSlug: `ACADEMIC_PT${number}`,
    variantName: `Academic - Practice Test ${number}`,
    templateName: `IELTS-style Academic - Practice Test ${number}`,
    papers: [listeningPaper(tag, listening), readingPaper(tag, reading), writingPaper(tag, writing), speakingPaper(speaking)],
  };
}

const mcq = (prompt, options, correct, timeLimitSeconds = 60) => ({ type: "MATCHING", prompt, options, correctAnswer: correct, timeLimitSeconds });
const two = (prompt, options, correct, timeLimitSeconds = 60) => ({ type: "MULTI_SELECT", prompt, options, correctAnswer: pick(correct), timeLimitSeconds });
const fill = (prompt, answers, timeLimitSeconds = 60) => ({ type: "GAP_FILL", prompt, correctAnswer: gap(answers), timeLimitSeconds });
const tfng = (prompt, answer) => ({ type: "TRUE_FALSE_NOT_GIVEN", prompt, correctAnswer: answer, timeLimitSeconds: 120 });
const ynng = (prompt, answer) => ({ type: "YES_NO_NOT_GIVEN", prompt, correctAnswer: answer, timeLimitSeconds: 120 });

// ===========================================================================
// PRACTICE TEST 1
// ===========================================================================

export const CHART_LIBRARIES = {
  title: "Visitors to three city libraries (thousands)",
  categories: ["2019", "2020", "2021", "2022", "2023"],
  series: [
    { name: "Central", values: [120, 60, 75, 110, 130] },
    { name: "Riverside", values: [45, 30, 40, 55, 70] },
    { name: "Northgate", values: [80, 35, 50, 60, 58] },
  ],
};

const TEST_1 = practiceTest(1, {
  listening: [
    {
      title: "booking a pottery class",
      instructions: "A man phones a community centre to book a class. Write ONE WORD AND/OR A NUMBER for each answer.",
      script: [
        ["F", "Good morning, Harbourside Community Centre. How can I help?"],
        ["M", "Hi. I'd like to book a place on the beginners' pottery course, please."],
        ["F", "Of course. We run it on Tuesday evenings and on Thursday afternoons. The Tuesday group is full, I'm afraid."],
        ["M", "Thursday afternoon is fine. That suits me better anyway."],
        ["F", "Lovely. The Thursday class is taught by Mr Okafor. That's O, K, A, F, O, R."],
        ["M", "Thanks. And how much is it?"],
        ["F", "Each session is twelve pounds, but if you pay for the full course of seven sessions up front, it's eighty-four pounds, and that includes all the clay."],
        ["M", "I'll pay for the full course, then."],
        ["F", "Perfect. Please bring an apron, and wear shoes you don't mind getting dirty."],
      ],
      questions: [
        fill("Class day: ______", ["Thursday", "Thursdays"]),
        fill("Teacher's surname: Mr ______", ["Okafor"]),
        fill("Cost of the full course: £______", ["84", "£84", "eighty-four", "eighty four"]),
      ],
    },
    {
      title: "Fenbrook Mill",
      instructions: "A guide talks to visitors at a museum. Choose the correct answers.",
      script: [
        ["M", "Welcome to Fenbrook Mill, everyone. Before we start, a few practical points."],
        ["M", "Our guided tours leave every hour. Please meet your guide by the water wheel, not at the ticket desk, which gets very busy."],
        ["M", "The big news this year is our new bakery. It uses flour ground here in the mill, so do try the bread before you leave."],
        ["M", "Photographs are welcome everywhere, and dogs on leads are allowed inside. However, please do not touch the grinding stones. They are over two hundred years old, and very fragile."],
        ["M", "Also, food and drink must stay in the cafe. Please don't eat in the gallery upstairs."],
        ["M", "The stairs to the gallery are steep, so there is a lift at the back of the building."],
      ],
      questions: [
        mcq("Where should visitors meet their guide?", ["By the water wheel", "At the ticket desk", "In the cafe", "At the car park gate"], "By the water wheel"),
        mcq("What is new at the mill this year?", ["A children's play area", "A bakery using the mill's flour", "Audio guides in six languages", "An evening lantern tour"], "A bakery using the mill's flour"),
        two("Which TWO things are visitors asked NOT to do?", ["Touch the grinding stones", "Take photographs", "Bring dogs inside", "Eat in the gallery", "Use the stairs"], ["Touch the grinding stones", "Eat in the gallery"]),
      ],
    },
    {
      title: "city beekeeping project",
      script: [
        ["F", "So, Daniel, how is the research for our project on city beekeeping going?"],
        ["M", "Really well. What surprised me most was the honey. The rooftop hives in the city centre actually produced more honey than the hives out in the countryside."],
        ["F", "Because of all the different flowers in parks and gardens, I suppose. Farms often grow just one crop."],
        ["M", "Exactly. So what should we do next?"],
        ["F", "I think we should interview a local beekeeper. There's one who keeps hives on the library roof."],
        ["M", "Good idea. For sources, let's use the council's survey of green spaces, and the university's pollen study."],
        ["F", "Agreed. We can leave out the old newspaper articles. They're too out of date."],
      ],
      questions: [
        mcq("What surprised Daniel about the city hives?", ["They produced more honey than country hives", "The bees were less active", "They needed more care", "They were cheaper to keep"], "They produced more honey than country hives"),
        mcq("What will the students do next?", ["Visit a farm", "Interview a local beekeeper", "Build their own hive", "Write to the council"], "Interview a local beekeeper"),
        two("Which TWO sources will the students use?", ["The council's survey of green spaces", "Old newspaper articles", "The university's pollen study", "A television documentary"], ["The council's survey of green spaces", "The university's pollen study"]),
      ],
    },
    {
      title: "desert plants lecture",
      instructions: "Part of a lecture on desert plants. Write ONE WORD ONLY for each answer.",
      script: [
        ["F", "In today's lecture I want to look at how desert plants survive with so little water."],
        ["F", "Take the cactus. Its stem is folded into ridges, and after rain it can swell up, much like an accordion, to hold the extra water."],
        ["F", "Many cacti have no ordinary leaves at all. Instead, their leaves have become spines, which lose far less water to the air, and also keep hungry animals away."],
        ["F", "Finally, a group of desert plants keep their pores tightly closed during the heat of the day. They open them only at night, when the air is cooler, and they take in carbon dioxide then."],
      ],
      questions: [
        fill("After rain, a cactus stem swells like an ______.", ["accordion"]),
        fill("Many cacti have leaves that have become ______.", ["spines"]),
        fill("Some desert plants open their pores only at ______.", ["night", "nighttime", "night-time"]),
      ],
    },
  ],
  reading: [
    {
      text: `The Return of the Night Train

For much of the late twentieth century, overnight sleeper trains seemed to be disappearing. Cheap flights were faster, and many rail companies decided that running carriages with beds was too expensive. Route after route was quietly closed.

In recent years, however, several countries have begun to bring night trains back. Part of the reason is environmental: a passenger travelling a long distance by rail is usually responsible for far less carbon than one who flies. Another reason is convenience. A traveller who boards in the evening and arrives in a city centre the next morning saves the cost of a hotel room and avoids the long journey out to an airport.

The new trains are not simply copies of the old ones. Many offer small private cabins with their own washbasin, and some allow passengers to book a single bed in a shared compartment at a lower price. Operators say that demand is strongest among younger travellers and families.

Challenges remain. Night trains need tracks that are free overnight, when engineers often carry out repairs, and each carriage carries far fewer people than a daytime train.`,
      questions: [
        tfng("Many sleeper train routes closed in the late twentieth century.", "TRUE"),
        tfng("Night trains are now cheaper than flying on every route.", "NOT_GIVEN"),
        tfng("Each night-train carriage carries more passengers than a daytime carriage.", "FALSE"),
      ],
    },
    {
      text: `Why We Doodle

Most of us have drawn aimless patterns in the margin of a notebook during a long meeting. For years, doodling was treated as a sign of boredom or poor concentration, something a good student or employee should avoid.

I believe this view is mistaken. When people doodle, they are usually not drifting away from what they hear; they are keeping just enough of the mind busy to stop it from wandering somewhere else entirely. In my own experience of teaching, the students who sketch quietly during a lecture are often the ones who remember it best.

That said, doodling is not a magic tool for learning. A simple pattern is one thing, but drawing a detailed picture demands real attention, and at that point it competes with listening rather than supporting it.

Schools should therefore stop telling children off for doodling. Instead, teachers might simply explain the difference between a relaxed doodle and a drawing that takes over. Whether workplaces need official policies on the matter is another question, and one I will not try to answer here.`,
      questions: [
        ynng("The writer thinks doodling usually shows that a person is bored.", "NO"),
        ynng("The writer believes workplaces should introduce rules about doodling.", "NOT_GIVEN"),
        two(
          "Which TWO recommendations or claims does the writer make?",
          ["Simple doodles can help people stay focused", "Detailed drawings always improve memory", "Teachers should stop punishing children for doodling", "Students should draw during every lesson"],
          ["Simple doodles can help people stay focused", "Teachers should stop punishing children for doodling"],
          120
        ),
      ],
    },
    {
      text: `Mapping the Ocean Floor

It is often said that we have better maps of the Moon than of the bottom of our own oceans. Light and radio waves cannot travel far through seawater, so satellites cannot photograph the sea bed directly.

Instead, most detailed maps are made using sound. A ship sends pulses of sound down towards the sea floor and measures how long the echoes take to return. The longer the delay, the deeper the water. Modern systems send out a wide fan of these pulses, so a single ship can map a strip of sea bed several kilometres wide as it sails.

Even so, the task is enormous. A ship moves slowly, and the oceans are vast. For this reason, researchers are now testing small robot boats that can work for weeks at a time without a crew, sharing the data they collect over satellite links.

The results matter for more than curiosity. Accurate maps help ships navigate safely, show where underwater cables can be laid, and help scientists predict how waves from undersea earthquakes might travel.`,
      questions: [
        fill("Most detailed sea-bed maps are made using ______.", ["sound", "sound pulses"], 120),
        fill("Researchers are testing small ______ that can work for weeks without a crew.", ["robot boats", "boats"], 120),
        mcq(
          "According to the passage, why can't satellites photograph the sea bed directly?",
          ["Light and radio waves cannot travel far through seawater", "The oceans are too large", "Satellites move too quickly", "The sea bed is too dark"],
          "Light and radio waves cannot travel far through seawater",
          120
        ),
      ],
    },
  ],
  writing: {
    chart: CHART_LIBRARIES,
    chartIntro: "The chart shows how many people visited three city libraries each year from 2019 to 2023.",
    essay:
      "Some people think city centres should be closed to private cars completely. Others say this would hurt local shops and workers. Discuss both views and give your own opinion, with reasons and examples.",
  },
  speaking: {
    theme: "learning skills",
    part1: [
      "Where do you usually go to relax at the weekend?",
      "Do you prefer mornings or evenings? Why?",
      "How often do you use public transport, and what do you think of it?",
    ],
    cueCard:
      "Describe a practical skill you learned outside school.\nYou should say:\n- what the skill was\n- who helped you learn it\n- how long it took\nand explain how you feel about this skill now.",
    part3: [
      "Is it better to learn practical skills from family members or from trained professionals?",
      "How might technology change the way people learn new skills in the future?",
      "Should employers pay for their staff to learn new skills? Why or why not?",
    ],
  },
});

// ===========================================================================
// PRACTICE TEST 2
// ===========================================================================

export const CHART_TRANSPORT = {
  title: "How households in Eastwick travel to work (%)",
  categories: ["2000", "2010", "2020"],
  series: [
    { name: "Car", values: [62, 55, 41] },
    { name: "Bus/train", values: [28, 30, 33] },
    { name: "Bicycle", values: [10, 15, 26] },
  ],
};

const TEST_2 = practiceTest(2, {
  listening: [
    {
      title: "renting a holiday cottage",
      instructions: "A woman phones to rent a holiday cottage. Write ONE WORD AND/OR A NUMBER for each answer.",
      script: [
        ["M", "Hello, Kestrel Bay Cottages. Martin speaking."],
        ["F", "Hi. I'd like to rent Heron Cottage for a week in August, if it's free."],
        ["M", "Let me check. Yes, it's free from the ninth. Our weeks start on a Saturday, so you'd arrive on Saturday the ninth."],
        ["F", "That's perfect. Can I give you my name? It's Mrs Petrakis. P, E, T, R, A, K, I, S."],
        ["M", "Thank you. The cottage costs four hundred and twenty pounds for the week. To hold the booking, we ask for a deposit of ninety pounds today."],
        ["F", "Fine. And is there parking?"],
        ["M", "Yes, one space right beside the cottage. And the beach is only a five-minute walk away."],
      ],
      questions: [
        fill("Day of arrival: ______", ["Saturday"]),
        fill("Customer's surname: Mrs ______", ["Petrakis"]),
        fill("Deposit to pay today: £______", ["90", "£90", "ninety"]),
      ],
    },
    {
      title: "Millbrook Park clean-up day",
      instructions: "A volunteer coordinator talks about a park clean-up. Choose the correct answers.",
      script: [
        ["F", "Thank you all for coming to the Millbrook Park clean-up. Let me explain how today will work."],
        ["F", "First, please collect your gloves and a litter picker from the green tent next to the lake, not from the car park, where we were last year."],
        ["F", "This year we're doing something new. Everything we collect will be sorted, and the plastic will be sent to a local company that turns it into garden benches."],
        ["F", "For your safety, please don't pick up any broken glass with your hands. Mark the spot with one of our yellow flags instead, and a team leader will deal with it. Also, please stay out of the lake itself. The water is deeper than it looks."],
        ["F", "You're very welcome to bring children, and to take breaks whenever you like. Hot drinks are free at the tent all morning."],
      ],
      questions: [
        mcq("Where should volunteers collect their equipment?", ["The car park", "The green tent by the lake", "The park cafe", "The main gate"], "The green tent by the lake"),
        mcq("What is new this year?", ["Free lunch for volunteers", "Plastic will be made into garden benches", "Prizes for the most litter collected", "The event will last all day"], "Plastic will be made into garden benches"),
        two("Which TWO things are volunteers told NOT to do?", ["Bring children", "Pick up broken glass by hand", "Go into the lake", "Take breaks", "Drink the free hot drinks"], ["Pick up broken glass by hand", "Go into the lake"]),
      ],
    },
    {
      title: "food waste presentation",
      script: [
        ["M", "Priya, have you looked at the results from our food waste survey?"],
        ["F", "I have, and the biggest surprise was bread. More bread was thrown away than any other food, even more than fruit and vegetables."],
        ["M", "Interesting. I think that's because people buy large loaves and can't finish them before they go stale."],
        ["F", "Right. For our presentation, I'd like to include a short video of the student canteen at the end of lunch."],
        ["M", "Good idea. That will make the point better than a table of numbers."],
        ["F", "For the practical tips section, let's recommend freezing bread in slices, and planning meals for the week before shopping."],
        ["M", "Yes. I'd leave out the tip about composting. Most students live in flats without gardens."],
      ],
      questions: [
        mcq("What surprised Priya in the survey results?", ["Bread was the most wasted food", "Students wasted very little food", "Fruit was wasted most often", "Most waste came from the canteen"], "Bread was the most wasted food"),
        mcq("What will the students add to their presentation?", ["A table of numbers", "A short video of the canteen", "Interviews with chefs", "A cooking demonstration"], "A short video of the canteen"),
        two("Which TWO tips will the students recommend?", ["Freezing bread in slices", "Composting food scraps", "Planning meals before shopping", "Buying larger loaves"], ["Freezing bread in slices", "Planning meals before shopping"]),
      ],
    },
    {
      title: "bridges and wind lecture",
      instructions: "Part of a lecture on bridge design. Write ONE WORD ONLY for each answer.",
      script: [
        ["M", "Today we're looking at one of the biggest dangers to long bridges: the wind."],
        ["M", "Engineers found that a flat bridge deck can start to twist in strong wind. So many modern decks are shaped rather like an aircraft wing, which lets the air flow smoothly over and under them."],
        ["M", "The long cables that hold a bridge up can also shake in wind and rain. One simple answer is to wrap a thin line around each cable in a spiral, which breaks up the moving air."],
        ["M", "Before any of this is built, a small model of the bridge is tested in a wind tunnel, so that problems are found while they are still cheap to fix."],
      ],
      questions: [
        fill("Many modern bridge decks are shaped like an aircraft ______.", ["wing"]),
        fill("A thin line is wrapped around each cable in a ______.", ["spiral"]),
        fill("A small model of the bridge is tested in a wind ______.", ["tunnel"]),
      ],
    },
  ],
  reading: [
    {
      text: `The Rise of Community Fridges

In a growing number of towns, a refrigerator now stands on the street or in the entrance of a public building, and anyone may take food from it free of charge. These community fridges are usually run by volunteers, and they are filled by local shops, cafes and households with food that would otherwise be thrown away.

Supporters say the fridges tackle two problems at once. They reduce food waste, and they help people who are struggling to pay for groceries, without asking them to fill in forms or explain their situation.

Most fridges have simple rules. Food must be clearly labelled with the date it was made or bought, and raw meat and fish are not accepted, because they are harder to store safely. Volunteers check the fridges every day and remove anything that has passed its date.

The idea is not without difficulties. Finding a place with a power supply can be hard, and some fridges have closed because too few volunteers were available to check them.`,
      questions: [
        tfng("Community fridges are usually run by volunteers.", "TRUE"),
        tfng("People must explain why they need food before taking any.", "FALSE"),
        tfng("Community fridges receive money from the national government.", "NOT_GIVEN"),
      ],
    },
    {
      text: `Should Homework Be Abolished?

Every few years, someone calls for homework to be banned altogether. I understand the frustration. Many families find that evenings are swallowed up by tasks that seem to exist only because they are expected.

Yet I think banning homework would be a mistake. The problem is not homework itself, but homework that has no clear purpose. Twenty minutes of reading, or practising a skill that was taught that day, can make a real difference. Pages of copying cannot.

For younger children, I would keep homework very short, and make most of it reading for pleasure. Older students, preparing for important examinations, genuinely need time to review on their own.

What matters most is that teachers ask themselves a simple question before setting any task: what will the student learn from doing this at home that they could not learn in class? Whether schools should also limit homework by law is a separate debate, and one I have not considered here.`,
      questions: [
        ynng("The writer believes homework should be banned completely.", "NO"),
        ynng("The writer thinks the government should limit homework by law.", "NOT_GIVEN"),
        two(
          "Which TWO recommendations does the writer make?",
          ["Younger children's homework should be short and mostly reading", "Copying exercises are useful for older students", "Teachers should check the purpose of every task", "Homework should last at least an hour"],
          ["Younger children's homework should be short and mostly reading", "Teachers should check the purpose of every task"],
          120
        ),
      ],
    },
    {
      text: `How Birds Find Their Way

Every year, many birds fly thousands of kilometres between their summer and winter homes, often returning to the very same tree or cliff. How they do this has puzzled people for centuries.

Scientists now believe that birds use several senses together. During the day, many species steer by the position of the sun, adjusting for the time of day. At night, some birds that migrate in darkness learn the patterns of the stars around the point in the sky that appears not to move.

Birds also seem able to sense the Earth's magnetic field, which acts like a built-in compass even when the sky is covered in cloud. Closer to home, familiar landmarks such as coastlines, rivers and mountains help them find their final destination, and some seabirds may even use their sense of smell.

Because young birds on their first journey have had little chance to learn, researchers think at least part of this ability must be inherited.`,
      questions: [
        fill("During the day, many birds steer by the position of the ______.", ["sun"], 120),
        fill("The Earth's magnetic field acts like a built-in ______.", ["compass"], 120),
        mcq(
          "Why do researchers think part of this ability is inherited?",
          ["Young birds on their first journey have had little chance to learn", "All birds use exactly the same method", "Birds never use landmarks", "Adult birds teach their young"],
          "Young birds on their first journey have had little chance to learn",
          120
        ),
      ],
    },
  ],
  writing: {
    chart: CHART_TRANSPORT,
    chartIntro: "The chart shows how households in the town of Eastwick travelled to work in 2000, 2010 and 2020.",
    essay:
      "More people now work from home for at least part of the week. Do the advantages of this change outweigh the disadvantages? Give reasons and examples from your own knowledge or experience.",
  },
  speaking: {
    theme: "teaching and learning",
    part1: [
      "Can you describe the area where you live?",
      "What kind of food do you enjoy cooking or eating?",
      "Do you prefer hot or cold weather? Why?",
    ],
    cueCard:
      "Describe a person who taught you something useful.\nYou should say:\n- who the person was\n- what they taught you\n- how they taught it\nand explain why it was useful to you.",
    part3: [
      "What makes someone a good teacher?",
      "Do you think teachers will still be needed in the future, or could computers replace them?",
      "Is it easier to learn something as a child or as an adult? Why?",
    ],
  },
});

// ===========================================================================
// PRACTICE TEST 3
// ===========================================================================

export const CHART_SCREEN_TIME = {
  title: "Teenagers' average daily screen time in Greenfield, by activity (minutes)",
  categories: ["2015", "2019", "2023"],
  series: [
    { name: "Video", values: [70, 95, 120] },
    { name: "Gaming", values: [60, 65, 55] },
    { name: "Social media", values: [40, 80, 105] },
  ],
};

const TEST_3 = practiceTest(3, {
  listening: [
    {
      title: "joining a sports centre",
      instructions: "A man phones a sports centre about membership. Write ONE WORD AND/OR A NUMBER for each answer.",
      script: [
        ["F", "Westfield Sports Centre, good afternoon."],
        ["M", "Hello. I'm thinking of joining the gym. What do I need to do?"],
        ["F", "Every new member comes to a short introduction session first. The next one is on Monday at six in the evening."],
        ["M", "Monday works for me. Who runs it?"],
        ["F", "That will be our instructor, Ms Lindqvist. That's L, I, N, D, Q, V, I, S, T."],
        ["M", "Got it. And what does membership cost?"],
        ["F", "It's thirty-two pounds a month, and that includes the swimming pool. Classes like yoga are extra."],
        ["M", "Great. Do I need to bring anything?"],
        ["F", "Just sports clothes, a towel, and some photo identification."],
      ],
      questions: [
        fill("Day of introduction session: ______", ["Monday"]),
        fill("Instructor's surname: Ms ______", ["Lindqvist"]),
        fill("Monthly fee: £______", ["32", "£32", "thirty-two", "thirty two"]),
      ],
    },
    {
      title: "Ashford food festival",
      instructions: "A radio presenter talks about a local festival. Choose the correct answers.",
      script: [
        ["M", "And now some news for this weekend. The Ashford Food Festival returns on Saturday, with more than eighty stalls."],
        ["M", "The main cooking stage has moved this year. You'll find it in the old market hall, rather than on the town square, so demonstrations can go ahead whatever the weather."],
        ["M", "Also new this year is a free cookery school for children, running every hour in the library."],
        ["M", "Organisers have asked visitors not to bring their own glass bottles, which have caused accidents in the past, and not to park on Station Road, which will be closed to traffic. Instead, a free bus will run from the leisure centre."],
        ["M", "Dogs are welcome, and entry to the festival is free."],
      ],
      questions: [
        mcq("Where is the main cooking stage this year?", ["On the town square", "In the old market hall", "In the library", "At the leisure centre"], "In the old market hall"),
        mcq("What is new at the festival this year?", ["More than eighty stalls", "A free cookery school for children", "Free entry", "A free bus"], "A free cookery school for children"),
        two("Which TWO things does the presenter ask festival-goers NOT to do?", ["Bring their own glass bottles", "Bring dogs", "Park on Station Road", "Use the free bus", "Visit the library"], ["Bring their own glass bottles", "Park on Station Road"]),
      ],
    },
    {
      title: "noise in open-plan offices",
      script: [
        ["F", "Hello Tom. How is your research on noise in open-plan offices going?"],
        ["M", "Quite well, thanks. The main finding so far is that people complained far more about nearby conversations than about machines like printers."],
        ["F", "That matches other studies. Speech is hard to ignore because we can't help trying to understand it."],
        ["M", "So what would you suggest I do next?"],
        ["F", "I'd observe one office for a full week. Questionnaires only tell you what people remember, not what actually happens."],
        ["M", "Right. And for my recommendations section?"],
        ["F", "I'd focus on quiet rooms that staff can book, and on soft panels that absorb sound. I wouldn't recommend headphones for everyone. It can make people feel cut off from their team."],
      ],
      questions: [
        mcq("What did Tom's research find so far?", ["Printers caused the most complaints", "People complained most about nearby conversations", "Most staff liked open-plan offices", "Noise had no effect on work"], "People complained most about nearby conversations"),
        mcq("What does the tutor suggest Tom does next?", ["Send out more questionnaires", "Observe one office for a week", "Interview managers", "Read more studies"], "Observe one office for a week"),
        two("Which TWO recommendations does the tutor support?", ["Quiet rooms that staff can book", "Headphones for all staff", "Soft panels that absorb sound", "Moving printers outside"], ["Quiet rooms that staff can book", "Soft panels that absorb sound"]),
      ],
    },
    {
      title: "honeybee communication lecture",
      instructions: "Part of a lecture on how honeybees share information. Write ONE WORD ONLY for each answer.",
      script: [
        ["F", "When a honeybee finds a good patch of flowers, she returns to the hive and tells the other bees where it is. She does this with a special movement, often called the waggle dance."],
        ["F", "The direction of the dance is the clever part. The angle of the dance, compared with straight up, shows the angle between the flowers and the sun."],
        ["F", "The length of each waggle tells the other bees the distance to the flowers. A longer waggle means the flowers are further away."],
        ["F", "Remarkably, the bees watching the dance never see the flowers themselves, yet they can fly straight to them."],
      ],
      questions: [
        fill("A bee shares the location of flowers with a special ______.", ["dance", "waggle dance"]),
        fill("The angle of the dance shows the direction compared with the ______.", ["sun"]),
        fill("The length of each waggle shows the ______ to the flowers.", ["distance"]),
      ],
    },
  ],
  reading: [
    {
      text: `The Return of Repair Cafés

A few decades ago, most towns had a shop that could mend a radio, a pair of shoes or a broken chair. As new goods became cheaper, many of these businesses closed, and throwing things away became normal.

Repair cafés are an attempt to reverse that trend. Once or twice a month, volunteers with practical skills gather in a hall or library, and members of the public bring along items that no longer work. Repairs are free, although visitors are encouraged to leave a small donation.

The volunteers do not simply fix items and hand them back. Owners are asked to sit beside them and watch, so that they can learn to do simple repairs themselves in future. Organisers say that around two-thirds of the items brought in leave in working order.

Some manufacturers have been less enthusiastic, and a number of products are designed in ways that make them very hard to open without special tools.`,
      questions: [
        tfng("Visitors to repair cafés must pay a fixed fee for each repair.", "FALSE"),
        tfng("Owners are encouraged to watch their items being repaired.", "TRUE"),
        tfng("Most repair-café volunteers are retired engineers.", "NOT_GIVEN"),
      ],
    },
    {
      text: `In Defence of Boredom

We have become experts at avoiding boredom. A queue, a bus journey or a quiet evening can be filled instantly with a phone. Most people regard this as progress, but I am not so sure.

Boredom, in my view, is not simply an unpleasant feeling to be removed. It is often the moment when the mind, having nothing to react to, starts to wander, to plan and to invent. Many of my own best ideas arrived while I was staring out of a window.

This is not to say that all boredom is good. Children stuck in a lesson that is far too easy for them are not being creative; they are being wasted.

I would encourage adults, and parents in particular, to leave some empty time in the day, without screens, and to resist filling every silence for their children. Whether schools should build "boredom time" into the timetable is something I leave to teachers to decide.`,
      questions: [
        ynng("The writer agrees that avoiding boredom is clearly a sign of progress.", "NO"),
        ynng("The writer thinks schools should add boredom time to the timetable.", "NOT_GIVEN"),
        two(
          "Which TWO claims or recommendations does the writer make?",
          ["Boredom can lead to new ideas", "All boredom is useful", "Parents should leave some empty time without screens", "Children should never be bored in lessons"],
          ["Boredom can lead to new ideas", "Parents should leave some empty time without screens"],
          120
        ),
      ],
    },
    {
      text: `Why Some Deserts Bloom

For most of the year, certain deserts look almost lifeless: bare ground, scattered rocks and a few tough shrubs. Yet after an unusually heavy rainfall, the same landscape can be covered with flowers within weeks.

The explanation lies under the surface. Many desert plants survive the dry years not as plants at all, but as seeds buried in the soil. Some seeds can wait for many years, protected by a hard outer coat.

Rain alone is not always enough to wake them. Some seeds contain chemicals that stop them growing, and these must be washed away by a large amount of water. This prevents a light shower from tricking the seeds into growing when there is not enough moisture for the plants to survive.

Once they appear, the plants race to flower and produce new seeds before the ground dries out again, sometimes completing their whole life in just a few weeks.`,
      questions: [
        fill("During dry years, many desert plants survive as ______ in the soil.", ["seeds"], 120),
        fill("Some seeds are protected by a hard outer ______.", ["coat"], 120),
        mcq(
          "Why do some seeds need a large amount of water before they grow?",
          ["Chemicals that stop growth must be washed away", "The hard coat needs to soften for months", "The soil must turn completely to mud", "Insects must first leave the area"],
          "Chemicals that stop growth must be washed away",
          120
        ),
      ],
    },
  ],
  writing: {
    chart: CHART_SCREEN_TIME,
    chartIntro: "The chart shows the average number of minutes per day that teenagers in the town of Greenfield spent on three screen activities in 2015, 2019 and 2023.",
    essay:
      "Some people believe that museums and galleries should be free for everyone. Others think visitors should pay for entry. Discuss both views and give your own opinion, with reasons and examples.",
  },
  speaking: {
    theme: "travel and tourism",
    part1: [
      "What kind of music do you like to listen to?",
      "How much time do you spend reading each week?",
      "Do you enjoy shopping? Why or why not?",
    ],
    cueCard:
      "Describe a place you have visited that you would like to go back to.\nYou should say:\n- where it is\n- when you went there\n- what you did there\nand explain why you would like to return.",
    part3: [
      "Why do you think some people prefer to visit the same place again rather than somewhere new?",
      "What are the benefits and problems of tourism for local communities?",
      "How might the way people travel for holidays change in the future?",
    ],
  },
});

export const PRACTICE_TESTS = [TEST_1, TEST_2, TEST_3];
