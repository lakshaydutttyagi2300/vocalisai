// P1-H demo exam content: an IELTS-STYLE Academic practice paper.
//
// Every word here is ORIGINAL placeholder content written for this demo -
// no passage, script, task or question is copied or adapted from any real
// exam paper, past paper or official practice material. The structure
// (4 listening parts / 3 reading passages / 2 writing tasks / 3 speaking
// parts, and their timings) follows the publicly described shape of that
// style of test; the content does not. Named people and places are
// fictional.
//
// Shape of each part:
//   { key, name, instructions, prepSeconds?, responseSeconds?,
//     questionCount,            // how many the template section asks for
//     groups: [{ type, title, text?, transcript?, playLimit?, asset?, questions: [...] }],
//     questions: [...]           // ungrouped questions (writing/speaking)
//   }
// A question is { type, prompt, options?, correctAnswer?, explanation?, timeLimitSeconds }.

export const DEMO_FAMILY_SLUG = "IELTS_STYLE";
export const DEMO_VARIANT_SLUG = "ACADEMIC_DEMO";
export const DEMO_VARIANT_NAME = "Academic (demo)";
export const DEMO_SCORE_SCALE = "IELTS_STYLE_BAND";
export const DEMO_TEMPLATE_NAME = "IELTS-style Academic (demo)";
export const DEMO_DIFFICULTY = "ADVANCED";

const gap = (answers) => JSON.stringify([answers]);

// ---------------------------------------------------------------------------
// Listening - 4 parts, one recording each, heard ONCE (playLimit 1).
// Scripts are spoken by the built-in Windows voices when the seed is run
// with assets (see assets.mjs): F = female voice, M = male voice.
// ---------------------------------------------------------------------------

const LISTENING_1_SCRIPT = [
  ["F", "Good morning, Harbourside Community Centre. How can I help?"],
  ["M", "Hi. I'd like to book a place on the beginners' pottery course, please."],
  ["F", "Of course. We run it on Tuesday evenings and on Thursday afternoons. The Tuesday group is full, I'm afraid."],
  ["M", "Thursday afternoon is fine. That suits me better anyway."],
  ["F", "Lovely. The Thursday class is taught by Mr Okafor. That's O, K, A, F, O, R."],
  ["M", "Thanks. And how much is it?"],
  ["F", "Each session is twelve pounds, but if you pay for the full course of seven sessions up front, it's eighty-four pounds, and that includes all the clay."],
  ["M", "I'll pay for the full course, then."],
  ["F", "Perfect. Please bring an apron, and wear shoes you don't mind getting dirty."],
];

const LISTENING_2_SCRIPT = [
  ["M", "Welcome to Fenbrook Mill, everyone. Before we start, a few practical points."],
  ["M", "Our guided tours leave every hour. Please meet your guide by the water wheel, not at the ticket desk, which gets very busy."],
  ["M", "The big news this year is our new bakery. It uses flour ground here in the mill, so do try the bread before you leave."],
  ["M", "Photographs are welcome everywhere, and dogs on leads are allowed inside. However, please do not touch the grinding stones. They are over two hundred years old, and very fragile."],
  ["M", "Also, food and drink must stay in the cafe. Please don't eat in the gallery upstairs."],
  ["M", "The stairs to the gallery are steep, so there is a lift at the back of the building."],
];

const LISTENING_3_SCRIPT = [
  ["F", "So, Daniel, how is the research for our project on city beekeeping going?"],
  ["M", "Really well. What surprised me most was the honey. The rooftop hives in the city centre actually produced more honey than the hives out in the countryside."],
  ["F", "Because of all the different flowers in parks and gardens, I suppose. Farms often grow just one crop."],
  ["M", "Exactly. So what should we do next?"],
  ["F", "I think we should interview a local beekeeper. There's one who keeps hives on the library roof."],
  ["M", "Good idea. For sources, let's use the council's survey of green spaces, and the university's pollen study."],
  ["F", "Agreed. We can leave out the old newspaper articles. They're too out of date."],
];

const LISTENING_4_SCRIPT = [
  ["F", "In today's lecture I want to look at how desert plants survive with so little water."],
  ["F", "Take the cactus. Its stem is folded into ridges, and after rain it can swell up, much like an accordion, to hold the extra water."],
  ["F", "Many cacti have no ordinary leaves at all. Instead, their leaves have become spines, which lose far less water to the air, and also keep hungry animals away."],
  ["F", "Finally, a group of desert plants keep their pores tightly closed during the heat of the day. They open them only at night, when the air is cooler, and they take in carbon dioxide then."],
];

const scriptToTranscript = (script) => script.map(([who, line]) => `${who === "F" ? "Woman" : "Man"}: ${line}`).join("\n");

// ---------------------------------------------------------------------------
// Reading - 3 passages.
// ---------------------------------------------------------------------------

const READING_1_PASSAGE = `The Return of the Night Train

For much of the late twentieth century, overnight sleeper trains seemed to be disappearing. Cheap flights were faster, and many rail companies decided that running carriages with beds was too expensive. Route after route was quietly closed.

In recent years, however, several countries have begun to bring night trains back. Part of the reason is environmental: a passenger travelling a long distance by rail is usually responsible for far less carbon than one who flies. Another reason is convenience. A traveller who boards in the evening and arrives in a city centre the next morning saves the cost of a hotel room and avoids the long journey out to an airport.

The new trains are not simply copies of the old ones. Many offer small private cabins with their own washbasin, and some allow passengers to book a single bed in a shared compartment at a lower price. Operators say that demand is strongest among younger travellers and families.

Challenges remain. Night trains need tracks that are free overnight, when engineers often carry out repairs, and each carriage carries far fewer people than a daytime train.`;

const READING_2_PASSAGE = `Why We Doodle

Most of us have drawn aimless patterns in the margin of a notebook during a long meeting. For years, doodling was treated as a sign of boredom or poor concentration, something a good student or employee should avoid.

I believe this view is mistaken. When people doodle, they are usually not drifting away from what they hear; they are keeping just enough of the mind busy to stop it from wandering somewhere else entirely. In my own experience of teaching, the students who sketch quietly during a lecture are often the ones who remember it best.

That said, doodling is not a magic tool for learning. A simple pattern is one thing, but drawing a detailed picture demands real attention, and at that point it competes with listening rather than supporting it.

Schools should therefore stop telling children off for doodling. Instead, teachers might simply explain the difference between a relaxed doodle and a drawing that takes over. Whether workplaces need official policies on the matter is another question, and one I will not try to answer here.`;

const READING_3_PASSAGE = `Mapping the Ocean Floor

It is often said that we have better maps of the Moon than of the bottom of our own oceans. Light and radio waves cannot travel far through seawater, so satellites cannot photograph the sea bed directly.

Instead, most detailed maps are made using sound. A ship sends pulses of sound down towards the sea floor and measures how long the echoes take to return. The longer the delay, the deeper the water. Modern systems send out a wide fan of these pulses, so a single ship can map a strip of sea bed several kilometres wide as it sails.

Even so, the task is enormous. A ship moves slowly, and the oceans are vast. For this reason, researchers are now testing small robot boats that can work for weeks at a time without a crew, sharing the data they collect over satellite links.

The results matter for more than curiosity. Accurate maps help ships navigate safely, show where underwater cables can be laid, and help scientists predict how waves from undersea earthquakes might travel.`;

// ---------------------------------------------------------------------------
// Writing - Task 1 (150 words) and Task 2 (250 words); two alternatives each,
// one of which is picked per sitting.
// ---------------------------------------------------------------------------

export const CHART_LIBRARIES = {
  title: "Visitors to three city libraries (thousands)",
  categories: ["2019", "2020", "2021", "2022", "2023"],
  series: [
    { name: "Central", values: [120, 60, 75, 110, 130] },
    { name: "Riverside", values: [45, 30, 40, 55, 70] },
    { name: "Northgate", values: [80, 35, 50, 60, 58] },
  ],
};

export const CHART_TRANSPORT = {
  title: "How households in Eastwick travel to work (%)",
  categories: ["2000", "2010", "2020"],
  series: [
    { name: "Car", values: [62, 55, 41] },
    { name: "Bus/train", values: [28, 30, 33] },
    { name: "Bicycle", values: [10, 15, 26] },
  ],
};

const chartAsText = (c) =>
  [`${c.title}`, `Year: ${c.categories.join(" | ")}`, ...c.series.map((s) => `${s.name}: ${s.values.join(" | ")}`)].join("\n");

// ---------------------------------------------------------------------------
// The demo paper
// ---------------------------------------------------------------------------

export const DEMO_PAPERS = [
  {
    key: "listening",
    name: "Listening",
    category: "LISTENING",
    durationSeconds: 30 * 60,
    navigationMode: "LOCKED_SEQUENTIAL",
    allowReview: false,
    instructions:
      "There are four parts. You will hear each recording ONCE. Answer the questions as you listen. Answers are checked for spelling.",
    parts: [
      {
        key: "l1",
        name: "Part 1",
        instructions: "A man phones a community centre to book a class. Write ONE WORD AND/OR A NUMBER for each answer.",
        questionCount: 3,
        groups: [
          {
            type: "AUDIO",
            title: "[Demo] Listening Part 1 - booking a pottery class",
            script: LISTENING_1_SCRIPT,
            transcript: scriptToTranscript(LISTENING_1_SCRIPT),
            playLimit: 1,
            questions: [
              { type: "GAP_FILL", prompt: "Class day: ______", correctAnswer: gap(["Thursday", "Thursdays"]), timeLimitSeconds: 60 },
              { type: "GAP_FILL", prompt: "Teacher's surname: Mr ______", correctAnswer: gap(["Okafor"]), timeLimitSeconds: 60 },
              { type: "GAP_FILL", prompt: "Cost of the full course: £______", correctAnswer: gap(["84", "£84", "eighty-four", "eighty four"]), timeLimitSeconds: 60 },
            ],
          },
        ],
      },
      {
        key: "l2",
        name: "Part 2",
        instructions: "A guide talks to visitors at a museum. Choose the correct answers.",
        questionCount: 3,
        groups: [
          {
            type: "AUDIO",
            title: "[Demo] Listening Part 2 - Fenbrook Mill",
            script: LISTENING_2_SCRIPT,
            transcript: scriptToTranscript(LISTENING_2_SCRIPT),
            playLimit: 1,
            questions: [
              {
                type: "MATCHING",
                prompt: "Where should visitors meet their guide?",
                options: ["By the water wheel", "At the ticket desk", "In the cafe", "At the car park gate"],
                correctAnswer: "By the water wheel",
                timeLimitSeconds: 60,
              },
              {
                type: "MATCHING",
                prompt: "What is new at the mill this year?",
                options: ["A children's play area", "A bakery using the mill's flour", "Audio guides in six languages", "An evening lantern tour"],
                correctAnswer: "A bakery using the mill's flour",
                timeLimitSeconds: 60,
              },
              {
                type: "MULTI_SELECT",
                prompt: "Which TWO things are visitors asked NOT to do?",
                options: ["Touch the grinding stones", "Take photographs", "Bring dogs inside", "Eat in the gallery", "Use the stairs"],
                correctAnswer: JSON.stringify(["Touch the grinding stones", "Eat in the gallery"]),
                timeLimitSeconds: 60,
              },
            ],
          },
        ],
      },
      {
        key: "l3",
        name: "Part 3",
        instructions: "Two students discuss a project. Choose the correct answers.",
        questionCount: 3,
        groups: [
          {
            type: "AUDIO",
            title: "[Demo] Listening Part 3 - city beekeeping project",
            script: LISTENING_3_SCRIPT,
            transcript: scriptToTranscript(LISTENING_3_SCRIPT),
            playLimit: 1,
            questions: [
              {
                type: "MATCHING",
                prompt: "What surprised Daniel about the city hives?",
                options: ["They produced more honey than country hives", "The bees were less active", "They needed more care", "They were cheaper to keep"],
                correctAnswer: "They produced more honey than country hives",
                timeLimitSeconds: 60,
              },
              {
                type: "MATCHING",
                prompt: "What will the students do next?",
                options: ["Visit a farm", "Interview a local beekeeper", "Build their own hive", "Write to the council"],
                correctAnswer: "Interview a local beekeeper",
                timeLimitSeconds: 60,
              },
              {
                type: "MULTI_SELECT",
                prompt: "Which TWO sources will the students use?",
                options: ["The council's survey of green spaces", "Old newspaper articles", "The university's pollen study", "A television documentary"],
                correctAnswer: JSON.stringify(["The council's survey of green spaces", "The university's pollen study"]),
                timeLimitSeconds: 60,
              },
            ],
          },
        ],
      },
      {
        key: "l4",
        name: "Part 4",
        instructions: "Part of a lecture on desert plants. Write ONE WORD ONLY for each answer.",
        questionCount: 3,
        groups: [
          {
            type: "AUDIO",
            title: "[Demo] Listening Part 4 - desert plants lecture",
            script: LISTENING_4_SCRIPT,
            transcript: scriptToTranscript(LISTENING_4_SCRIPT),
            playLimit: 1,
            questions: [
              { type: "GAP_FILL", prompt: "After rain, a cactus stem swells like an ______.", correctAnswer: gap(["accordion"]), timeLimitSeconds: 60 },
              { type: "GAP_FILL", prompt: "Many cacti have leaves that have become ______.", correctAnswer: gap(["spines"]), timeLimitSeconds: 60 },
              { type: "GAP_FILL", prompt: "Some desert plants open their pores only at ______.", correctAnswer: gap(["night", "nighttime", "night-time"]), timeLimitSeconds: 60 },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "reading",
    name: "Reading",
    category: "READING_COMPREHENSION",
    durationSeconds: 60 * 60,
    navigationMode: "FREE_WITHIN_SECTION",
    allowReview: true,
    instructions: "There are three passages. You may move between questions and change your answers until you submit the paper.",
    parts: [
      {
        key: "r1",
        name: "Passage 1",
        instructions: "Do the statements agree with the information in the passage? Choose True, False or Not given.",
        questionCount: 3,
        groups: [
          {
            type: "PASSAGE",
            title: "[Demo] The Return of the Night Train",
            text: READING_1_PASSAGE,
            questions: [
              { type: "TRUE_FALSE_NOT_GIVEN", prompt: "Many sleeper train routes closed in the late twentieth century.", correctAnswer: "TRUE", timeLimitSeconds: 120 },
              { type: "TRUE_FALSE_NOT_GIVEN", prompt: "Night trains are now cheaper than flying on every route.", correctAnswer: "NOT_GIVEN", timeLimitSeconds: 120 },
              { type: "TRUE_FALSE_NOT_GIVEN", prompt: "Each night-train carriage carries more passengers than a daytime carriage.", correctAnswer: "FALSE", timeLimitSeconds: 120 },
            ],
          },
        ],
      },
      {
        key: "r2",
        name: "Passage 2",
        instructions: "Answer the questions about the writer's views.",
        questionCount: 3,
        groups: [
          {
            type: "PASSAGE",
            title: "[Demo] Why We Doodle",
            text: READING_2_PASSAGE,
            questions: [
              { type: "YES_NO_NOT_GIVEN", prompt: "The writer thinks doodling usually shows that a person is bored.", correctAnswer: "NO", timeLimitSeconds: 120 },
              { type: "YES_NO_NOT_GIVEN", prompt: "The writer believes workplaces should introduce rules about doodling.", correctAnswer: "NOT_GIVEN", timeLimitSeconds: 120 },
              {
                type: "MULTI_SELECT",
                prompt: "Which TWO recommendations or claims does the writer make?",
                options: [
                  "Simple doodles can help people stay focused",
                  "Detailed drawings always improve memory",
                  "Teachers should stop punishing children for doodling",
                  "Students should draw during every lesson",
                ],
                correctAnswer: JSON.stringify(["Simple doodles can help people stay focused", "Teachers should stop punishing children for doodling"]),
                timeLimitSeconds: 120,
              },
            ],
          },
        ],
      },
      {
        key: "r3",
        name: "Passage 3",
        instructions: "Complete the sentences with NO MORE THAN TWO WORDS from the passage, and answer the question.",
        questionCount: 3,
        groups: [
          {
            type: "PASSAGE",
            title: "[Demo] Mapping the Ocean Floor",
            text: READING_3_PASSAGE,
            questions: [
              { type: "GAP_FILL", prompt: "Most detailed sea-bed maps are made using ______.", correctAnswer: gap(["sound", "sound pulses"]), timeLimitSeconds: 120 },
              { type: "GAP_FILL", prompt: "Researchers are testing small ______ that can work for weeks without a crew.", correctAnswer: gap(["robot boats", "boats"]), timeLimitSeconds: 120 },
              {
                type: "MATCHING",
                prompt: "According to the passage, why can't satellites photograph the sea bed directly?",
                options: [
                  "Light and radio waves cannot travel far through seawater",
                  "The oceans are too large",
                  "Satellites move too quickly",
                  "The sea bed is too dark",
                ],
                correctAnswer: "Light and radio waves cannot travel far through seawater",
                timeLimitSeconds: 120,
              },
            ],
          },
        ],
      },
    ],
  },
  {
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
            title: "[Demo] Chart - visitors to three city libraries",
            text: "Bar chart: visitors to three city libraries, 2019-2023 (thousands).",
            chart: CHART_LIBRARIES,
            questions: [
              {
                type: "LONG_WRITING",
                prompt: `The chart shows how many people visited three city libraries each year from 2019 to 2023.\n\n${chartAsText(CHART_LIBRARIES)}\n\nDescribe the main features of the chart and compare the figures where it makes sense. Write at least 150 words.`,
                scoringCriteria: "Target: at least 150 words. Not auto-marked.",
                timeLimitSeconds: 300,
              },
            ],
          },
          {
            type: "CHART",
            title: "[Demo] Chart - how Eastwick households travel to work",
            text: "Bar chart: how households in Eastwick travel to work, 2000, 2010 and 2020 (%).",
            chart: CHART_TRANSPORT,
            questions: [
              {
                type: "LONG_WRITING",
                prompt: `The chart shows how households in the town of Eastwick travelled to work in 2000, 2010 and 2020.\n\n${chartAsText(CHART_TRANSPORT)}\n\nDescribe the main features of the chart and compare the figures where it makes sense. Write at least 150 words.`,
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
        questions: [
          {
            type: "LONG_WRITING",
            prompt:
              "Some people think city centres should be closed to private cars completely. Others say this would hurt local shops and workers. Discuss both views and give your own opinion, with reasons and examples. Write at least 250 words.",
            scoringCriteria: "Target: at least 250 words. Not auto-marked.",
            timeLimitSeconds: 300,
          },
          {
            type: "LONG_WRITING",
            prompt:
              "More people now work from home for at least part of the week. Do the advantages of this change outweigh the disadvantages? Give reasons and examples from your own knowledge or experience. Write at least 250 words.",
            scoringCriteria: "Target: at least 250 words. Not auto-marked.",
            timeLimitSeconds: 300,
          },
        ],
      },
    ],
  },
  {
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
        questionCount: 3,
        questions: [
          { type: "TIMED_SPEAKING", prompt: "Where do you usually go to relax at the weekend?", timeLimitSeconds: 30 },
          { type: "TIMED_SPEAKING", prompt: "Do you prefer mornings or evenings? Why?", timeLimitSeconds: 30 },
          { type: "TIMED_SPEAKING", prompt: "How often do you use public transport, and what do you think of it?", timeLimitSeconds: 30 },
        ],
      },
      {
        key: "s2",
        name: "Part 2",
        instructions: "You have 1 minute to prepare, then speak for up to 2 minutes.",
        prepSeconds: 60,
        responseSeconds: 120,
        questionCount: 1,
        questions: [
          {
            type: "TIMED_SPEAKING",
            prompt:
              "Describe a practical skill you learned outside school.\nYou should say:\n- what the skill was\n- who helped you learn it\n- how long it took\nand explain how you feel about this skill now.",
            timeLimitSeconds: 180,
          },
          {
            type: "TIMED_SPEAKING",
            prompt:
              "Describe a person who taught you something useful.\nYou should say:\n- who the person was\n- what they taught you\n- how they taught it\nand explain why it was useful to you.",
            timeLimitSeconds: 180,
          },
        ],
      },
      {
        key: "s3",
        name: "Part 3",
        instructions: "A discussion linked to the Part 2 topic of learning. Answer each in about 45 seconds.",
        prepSeconds: 0,
        responseSeconds: 45,
        questionCount: 3,
        questions: [
          { type: "TIMED_SPEAKING", prompt: "Is it better to learn practical skills from family members or from trained professionals?", timeLimitSeconds: 45 },
          { type: "TIMED_SPEAKING", prompt: "How might technology change the way people learn new skills in the future?", timeLimitSeconds: 45 },
          { type: "TIMED_SPEAKING", prompt: "Should employers pay for their staff to learn new skills? Why or why not?", timeLimitSeconds: 45 },
        ],
      },
    ],
  },
];
