# Difficulty levels

Every practice mode, role-play and mock exam offers four levels. A level has its own questions: the same question never appears at two levels (checked on production, 30 Sep 2026), and practice sessions never borrow questions from another level. Skill drills and "My skills" deliberately mix the levels a plan allows, because mastery weights harder answers more (`src/lib/skills/mastery.ts`).

Levels are defined once in `src/lib/practice-taxonomy.ts` (`DIFFICULTIES`); plan access is `PLAN_DIFFICULTY_ACCESS` in `src/lib/entitlements.ts` (Free: Beginner and Intermediate; paid plans: all four), enforced on the server.

| Level | CEFR guide | What it tests |
|---|---|---|
| Beginner | A1–A2 | Fundamental concepts, straightforward questions, basic application |
| Intermediate | B1 | More varied questions that need understanding and moderate application |
| Advanced | B2–C1 | Complex, multi-step questions that need deeper reasoning and stronger knowledge |
| Expert | C1–C2 | Exam-level questions testing advanced reasoning, nuance and difficult application |

Use the descriptors below when writing, generating or reviewing questions: each question must match the descriptor for its level.

## Reading

| Level | Passage | Questions |
|---|---|---|
| Beginner | 80–150 words, everyday topics, short simple sentences | Direct facts, true/false, answer stated explicitly |
| Intermediate | 200–350 words, familiar general topics | Main idea, simple inference, vocabulary in context, paraphrased answers |
| Advanced | 400–600 words, academic or professional topics | Multi-paragraph inference, author's purpose, matching headings, close distractors |
| Expert | 700–900+ words, abstract or technical argument | Tone and attitude, evaluating arguments, synthesis, very close distractors |

## Listening

| Level | Audio | Questions |
|---|---|---|
| Beginner | Slow (~110 wpm), one speaker, 30–60 s | Stated facts: names, numbers, times |
| Intermediate | Natural pace (~140 wpm), two speakers, 1–2 min | Gist and details, simple inference |
| Advanced | Fast (~160 wpm), several accents, 2–4 min | Attitude, opinion vs fact, following an argument |
| Expert | 170+ wpm, overlapping speakers, lecture or debate, 4–6 min | Implied meaning, hedging, note completion, synthesis |

## Writing

| Level | Task | Expectation |
|---|---|---|
| Beginner | 50–80 words: short message, simple description | Basic sentences, correct simple tenses |
| Intermediate | 120–180 words: informal or semi-formal email, simple opinion | Paragraphs, linking words, clear purpose |
| Advanced | ~250 words: formal email, report, argumentative essay | Structured argument, range of grammar, formal register |
| Expert | 300–400 words: complex essay, data plus evaluation, proposal | Nuanced argument, precise vocabulary, error-free control |

## Speaking (Speaking, Pronunciation, Fluency, Read Aloud)

| Level | Task | Expectation |
|---|---|---|
| Beginner | Personal questions; read aloud 1–2 simple sentences; 20–30 s answers | Intelligible basic speech |
| Intermediate | Experiences and familiar topics; a short paragraph; 45–60 s | Connected speech, some fluency |
| Advanced | Opinions, comparisons, abstract topics; hard sound clusters and numbers; 1–2 min | Fluent, organised, good intonation |
| Expert | Debate, hypotheticals, persuasion; technical text; 2–3 min, less preparation | Near-native fluency, precise stress, idiom |

## Grammar and vocabulary

| Level | Grammar | Vocabulary |
|---|---|---|
| Beginner | Present/past simple, articles, plurals, basic prepositions | Everyday high-frequency words |
| Intermediate | Perfect tenses, comparatives, modals, 1st/2nd conditionals | Common collocations, phrasal verbs |
| Advanced | Passive, reported speech, 3rd/mixed conditionals, relative clauses | Academic and professional words, word forms, synonym nuance |
| Expert | Inversion, cleft sentences, subjunctive, subtle aspect and modality | Idiomatic and low-frequency words, register, connotation |

## Aptitude and reasoning

| Level | Numerical | Logical / verbal | Situational judgement |
|---|---|---|---|
| Beginner | One-step arithmetic, simple percentages | Simple sequences, direct analogies | Obvious best response |
| Intermediate | Two-step problems, ratios, simple tables | Pattern series, syllogisms, straightforward inference | Two plausible options |
| Advanced | Multi-step, charts and tables, time/speed/work | Multi-rule puzzles, assumptions and conclusions | Several plausible options, trade-offs |
| Expert | Several data sources, compound calculations, tight time | Complex puzzles, strengthen/weaken, subtle flaws | Ambiguous situations, competing priorities |

## Role-play

The AI character's behaviour changes by level: `LEVEL_BEHAVIOUR` in `src/lib/conversation-roles.ts`, added to every reply's instructions.

| Level | AI behaviour |
|---|---|
| Beginner | Patient, slow and simple, gives hints, one simple request |
| Intermediate | Normal pace, some follow-up questions, a mild complication |
| Advanced | Fast, unclear or changing requests, pushes back, expects professional phrasing |
| Expert | Irate customer or demanding interviewer, several issues at once, curveballs, no hints |

## Level suggestions

After a typed or multiple-choice practice session, `GET /api/practice/level-suggestion` looks at the candidate's last three sessions in that area and level (answers under 30 minutes apart count as one session; `src/lib/level-suggestion.ts`). An average of 80% or more, with the latest session also at 80% or more, suggests the next level; under 40%, with the latest session also under 40%, suggests the level below. It is only a suggestion, and a level the plan doesn't include links to billing instead. The chosen level is shown as a badge beside "Question N of M" in every practice session.
