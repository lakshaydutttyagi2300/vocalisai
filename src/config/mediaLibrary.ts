// The site's media library: every photo and clip, and the ONE place each is used.
//
// A "scene" is one piece of footage or one photo. A clip and the still made
// from it are the same scene, so a scene appears in exactly one placement on
// the whole site (tests/unit/media-library.test.ts enforces it). To use a new
// picture, add it to LIBRARY (and its credit to docs/MEDIA_SOURCES.md), then
// give it a placement. Never point two placements at the same scene.
//
// Files: clips  -> /media/cine/<name>-1280.{webm,mp4}, -640.{webm,mp4}, posters <name>.webp / <name>-640.webp
//        stills -> /media/stills/<name>.webp (1600 px), <name>-800.webp, <name>.jpg

export type AssetKind = "clip" | "still";

export interface MediaAsset {
  kind: AssetKind;
  alt: string;
  /** Pexels id, for the credit in docs/MEDIA_SOURCES.md. */
  pexels: string;
}

export const LIBRARY = {
  // Clips from the first library (Sept-Oct 2026).
  "reading-mic": { kind: "clip", alt: "A woman with headphones reading aloud into a microphone", pexels: "4540151" },
  interviewer: { kind: "clip", alt: "An interviewer on a laptop screen during a video interview", pexels: "8512946" },
  "mic-macro": { kind: "clip", alt: "A close-up of a studio microphone", pexels: "39118276" },
  office: { kind: "clip", alt: "A young professional working at a laptop in a bright office", pexels: "5944692" },
  agent: { kind: "clip", alt: "A customer-service agent listening on a headset", pexels: "7682757" },
  portrait: { kind: "clip", alt: "A woman speaking to the camera with a warm smile", pexels: "8048249" },
  presenting: { kind: "clip", alt: "A professional presenting with a microphone", pexels: "8716788" },
  interview: { kind: "clip", alt: "A candidate smiling during a job interview", pexels: "7426752" },
  teacher: { kind: "clip", alt: "A teacher helping a student at a desk", pexels: "6672045" },
  graduates: { kind: "clip", alt: "Graduates in caps and gowns smiling together", pexels: "8060941" },
  videocall: { kind: "clip", alt: "A woman talking on a video call at her laptop", pexels: "8993403" },
  callcentre: { kind: "clip", alt: "A call-centre agent speaking into a headset", pexels: "7706876" },
  meeting: { kind: "clip", alt: "A man in an online meeting on a laptop", pexels: "7643346" },
  headphones: { kind: "clip", alt: "A man with headphones reading and speaking at his desk", pexels: "6671228" },

  // Clips added 5 Oct 2026.
  "podcast-loft": { kind: "clip", alt: "A woman with headphones recording her voice at home", pexels: "4912138" },
  "speaker-studio": { kind: "clip", alt: "A young man speaking confidently to the camera", pexels: "9709787" },
  "support-home": { kind: "clip", alt: "A support agent with a headset working from home", pexels: "7682895" },
  "headphones-desk": { kind: "clip", alt: "A man with headphones practising at his desk", pexels: "11887132" },
  "laptop-notebook": { kind: "clip", alt: "A study session with a laptop and a notebook", pexels: "7583758" },
  "home-study": { kind: "clip", alt: "A learner following a lesson on a laptop at home", pexels: "4017223" },
  "campus-walk": { kind: "clip", alt: "Students walking across a sunny campus", pexels: "7683333" },
  "campus-stairs": { kind: "clip", alt: "Students with backpacks on the campus stairs", pexels: "7969488" },
  "exam-classroom": { kind: "clip", alt: "Students concentrating during a test in a bright classroom", pexels: "6671806" },
  "exam-hall": { kind: "clip", alt: "A student thinking through a written exam", pexels: "8196796" },
  "interview-sofa": { kind: "clip", alt: "Two people in an interview on a bright sofa", pexels: "8454305" },
  "video-interview": { kind: "clip", alt: "A woman smiling during a video interview", pexels: "5442623" },
  "interview-lounge": { kind: "clip", alt: "A job interview in a bright office lounge", pexels: "7652008" },
  "interviewer-office": { kind: "clip", alt: "A manager conducting an interview in his office", pexels: "4434067" },
  "presenter-work": { kind: "clip", alt: "A woman presenting to colleagues at work", pexels: "7692781" },
  "cafe-friends": { kind: "clip", alt: "Friends talking and laughing in a cafe", pexels: "9761945" },
  "coffee-chat": { kind: "clip", alt: "Two colleagues chatting over coffee", pexels: "7278333" },
  "interview-prep": { kind: "clip", alt: "A young man preparing notes at his desk", pexels: "4841405" },
  "office-celebration": { kind: "clip", alt: "Two colleagues celebrating good news in the office", pexels: "8631872" },
  "warm-smile": { kind: "clip", alt: "A woman smiling in warm light", pexels: "6706804" },
  "library-celebration": { kind: "clip", alt: "Students celebrating together in a library", pexels: "8199326" },
  "team-brainstorm": { kind: "clip", alt: "A team brainstorming around laptops", pexels: "7534730" },
  "team-meeting": { kind: "clip", alt: "Young professionals discussing a chart in a meeting", pexels: "6561429" },
  "whiteboard-planning": { kind: "clip", alt: "Colleagues planning together at a whiteboard", pexels: "6563890" },
  "colleagues-desk": { kind: "clip", alt: "Colleagues working through a task at a desk", pexels: "7693405" },
  "tutor-books": { kind: "clip", alt: "A tutor going through a book with a student", pexels: "5649610" },
  "graduation-caps": { kind: "clip", alt: "Graduates throwing their caps in the air", pexels: "7712354" },
  "notes-phone": { kind: "clip", alt: "A person taking notes beside a phone", pexels: "7657527" },
  "maths-notebook": { kind: "clip", alt: "Writing maths working in a notebook", pexels: "6245715" },
  "manager-talk": { kind: "clip", alt: "A manager and an employee talking in an office", pexels: "7640695" },
  "accounts-desk": { kind: "clip", alt: "Accounts and receipts on a desk", pexels: "5981287" },
  "waveform-screen": { kind: "clip", alt: "An audio waveform on a computer screen", pexels: "6892725" },
  "chart-laptop": { kind: "clip", alt: "Reviewing a chart on a laptop", pexels: "7252683" },
  "airport-travel": { kind: "clip", alt: "A traveller with a suitcase in an airport", pexels: "4684101" },
  "laptops-class": { kind: "clip", alt: "Students typing on laptops in a classroom", pexels: "31575745" },
  "campus-aerial": { kind: "clip", alt: "An aerial view of a university campus", pexels: "31033176" },
  "window-reading": { kind: "clip", alt: "A woman reading by a window", pexels: "8588097" },

  // Photos added 5 Oct 2026.
  "phone-recording": { kind: "still", alt: "A woman recording herself with a phone and a ring light", pexels: "6347558" },
  "headphones-notes": { kind: "still", alt: "A man with headphones taking notes at a laptop", pexels: "5554277" },
  "call-laptop": { kind: "still", alt: "A man laughing on a video call", pexels: "3799821" },
  "earphones-study": { kind: "still", alt: "A student with earphones studying outdoors", pexels: "5538618" },
  "calculator-notebook": { kind: "still", alt: "A notebook, calculator and pen", pexels: "8250947" },
  "sticky-supplies": { kind: "still", alt: "Sticky notes and highlighters", pexels: "6192519" },
  "support-office": { kind: "still", alt: "A customer-support team at work", pexels: "5453841" },
  "desk-interview": { kind: "still", alt: "A job interview at a desk", pexels: "5668863" },
  "candidate-interview": { kind: "still", alt: "A candidate answering in an interview", pexels: "5439143" },
  "graph-laptop": { kind: "still", alt: "A progress graph on a laptop", pexels: "3912976" },
  "chart-screen": { kind: "still", alt: "A chart on a laptop screen", pexels: "7109291" },
  "exam-paper": { kind: "still", alt: "A person writing answers on an exam paper", pexels: "6684209" },
  "headset-agent": { kind: "still", alt: "An agent with a headset helping a customer", pexels: "7681286" },
  "sofa-study": { kind: "still", alt: "A woman studying on the sofa with a laptop", pexels: "4492160" },
  "book-notes": { kind: "still", alt: "A book marked with sticky notes", pexels: "3832033" },
  "planner-tabs": { kind: "still", alt: "A planner with coloured tabs", pexels: "760720" },
  "library-reader": { kind: "still", alt: "A woman reading in a library", pexels: "2065490" },
  "library-friends": { kind: "still", alt: "Two friends reading a book together", pexels: "9490421" },
  "calculator-worksheets": { kind: "still", alt: "A calculator on worksheets", pexels: "7580753" },
  "team-room": { kind: "still", alt: "A team meeting in a bright room", pexels: "1181622" },
  "students-talking": { kind: "still", alt: "Students walking and talking", pexels: "7972658" },
  "podcast-mic": { kind: "still", alt: "A microphone set up for recording", pexels: "6953928" },
  "home-video-call": { kind: "still", alt: "A woman on a video call at home", pexels: "4474047" },
  "passport-laptop": { kind: "still", alt: "A traveller with a passport and a laptop", pexels: "4173241" },
  "whiteboard-diagram": { kind: "still", alt: "A plan drawn on a whiteboard", pexels: "1181311" },
  "chart-review": { kind: "still", alt: "Reviewing results on a printed chart", pexels: "7876456" },
  "weekly-planner": { kind: "still", alt: "A weekly planner", pexels: "7428866" },
  "desk-supplies": { kind: "still", alt: "A notebook, calculator and pens on a desk", pexels: "6368842" },
  "open-planner": { kind: "still", alt: "An open planner on a white desk", pexels: "4110453" },
  "planner-pens": { kind: "still", alt: "A planner and pens", pexels: "12911169" },
  "laptop-call": { kind: "still", alt: "A man talking on a video call", pexels: "6937837" },
  "waving-laptop": { kind: "still", alt: "A woman waving at her laptop", pexels: "8546749" },
  "waving-office": { kind: "still", alt: "A woman waving on a video call in her office", pexels: "12912121" },
  "sofa-call": { kind: "still", alt: "A woman on a video call on the sofa", pexels: "7606078" },
  "hourglass-books": { kind: "still", alt: "An hourglass beside a stack of books", pexels: "5357099" },
  "highlighting-notes": { kind: "still", alt: "Highlighting notes while studying", pexels: "8553917" },
  dictionary: { kind: "still", alt: "An open dictionary", pexels: "13752245" },
  "kitchen-recording": { kind: "still", alt: "A woman recording herself with a phone at home", pexels: "7669738" },
  "tablet-analytics": { kind: "still", alt: "Analytics on a tablet", pexels: "10020092" },
  "coffee-desk": { kind: "still", alt: "A laptop, phone and coffee on a desk", pexels: "8251149" },
  "charts-presenter": { kind: "still", alt: "A woman holding printed charts", pexels: "8424935" },
} as const satisfies Record<string, MediaAsset>;

export type SceneName = keyof typeof LIBRARY;

/**
 * Where each scene is used. The key names the page and section; the value is
 * the scene (or, for a page hero, the scenes it rotates through). Every scene
 * appears in exactly one placement.
 */
export const PLACEMENTS = {
  // Home: the strongest, most cinematic footage.
  "home.hero.speaking": ["reading-mic"],
  "home.hero.interviews": ["interviewer"],
  "home.hero.analysis": ["mic-macro"],
  "home.hero.companyTests": ["office"],
  "home.hero.customerService": ["agent"],
  "home.hero.spokenEnglish": ["portrait"],
  "home.voice": ["presenting"],
  "home.interviews": ["interview"],
  "home.practice": ["teacher"],
  "home.final": ["graduates"],
  "home.feature.speak": ["phone-recording"],
  "home.feature.partner": ["call-laptop"],
  "home.feature.listen": ["headphones-notes"],
  "home.feature.test": ["laptops-class"],
  "home.useCase.campus-placements": ["campus-walk"],
  "home.useCase.company-assessments": ["exam-classroom"],
  "home.useCase.interviews": ["interview-lounge"],
  "home.useCase.customer-service": ["headset-agent"],
  "home.useCase.professionals": ["presenter-work"],
  "home.useCase.spoken-english": ["cafe-friends"],

  // Product pages.
  "speaking.hero": ["podcast-loft"],
  "speaking.analysis": ["podcast-mic"],
  "speaking.presenting": ["speaker-studio"],
  "speaking.final": ["headphones"],
  "interviews.hero": ["interview-sofa"],
  "interviews.conversation": ["videocall"],
  "interviews.scenario.job": ["desk-interview"],
  "interviews.scenario.customer": ["callcentre"],
  "interviews.scenario.manager": ["meeting"],
  "interviews.scenario.casual": ["coffee-chat"],
  "interviews.prep": ["interview-prep"],
  "interviews.final": ["office-celebration"],
  "personalised.hero": ["home-study"],
  "personalised.progress": ["graph-laptop"],
  "personalised.final": ["library-celebration"],

  // Use cases: different scenes from the home page's use-case cards.
  "useCases.hero": ["team-brainstorm"],
  "useCases.campus-placements": ["campus-stairs"],
  "useCases.company-assessments": ["exam-paper"],
  "useCases.interviews": ["waving-office"],
  "useCases.customer-service": ["support-office"],
  "useCases.professionals": ["team-meeting"],
  "useCases.spoken-english": ["library-friends"],
  "useCases.final": ["warm-smile"],

  // Company pages and sign-in.
  "pricing.final": ["sofa-study"],
  "about.hero": ["whiteboard-planning"],
  "about.feedback": ["book-notes"],
  "about.realThing": ["hourglass-books"],
  "about.honest": ["library-reader"],
  "about.howItWorks": ["sofa-call"],
  "about.final": ["graduation-caps"],
  "contact.hero": ["support-home"],
  "auth.panel": ["waving-laptop"],

  // App page heroes.
  "app.dashboard": ["headphones-desk", "earphones-study"],
  "app.practice": ["laptop-notebook", "calculator-notebook", "sticky-supplies"],
  "app.explore": ["interviewer-office", "colleagues-desk", "candidate-interview"],
  "app.exploreSkills": ["notes-phone", "highlighting-notes"],
  "app.category.company-hiring-assessments": ["video-interview"],
  "app.category.aptitude-reasoning": ["maths-notebook", "calculator-worksheets"],
  "app.category.english-communication": ["window-reading", "dictionary"],
  "app.category.workplace-assessments": ["manager-talk", "team-room"],
  "app.category.career-entrance": ["campus-aerial", "students-talking"],
  "app.category.professional-certification": ["accounts-desk", "charts-presenter"],
  "app.mockTests": ["exam-hall"],
  "app.mockHistory": ["chart-review"],
  "app.speechAnalysis": ["waveform-screen", "kitchen-recording"],
  "app.progress": ["chart-laptop", "chart-screen"],
  "app.performance": ["tablet-analytics"],
  "app.coach": ["tutor-books", "home-video-call"],
  "app.goal": ["airport-travel", "passport-laptop"],
  "app.goalChoose": ["planner-pens"],
  "app.skills": ["whiteboard-diagram"],
  "app.bookmarks": ["planner-tabs"],
  "app.testHistory": ["weekly-planner"],
  "app.account": ["open-planner"],
  "app.billing": ["desk-supplies"],
  "app.quickPractice": ["coffee-desk"],
  "app.conversation": ["laptop-call"],
} as const satisfies Record<string, readonly SceneName[]>;

export type PlacementKey = keyof typeof PLACEMENTS;

/** Where a scene's files live, without the size/extension suffix. */
export function sceneSrc(name: SceneName): string {
  return `${LIBRARY[name].kind === "clip" ? "/media/cine" : "/media/stills"}/${name}`;
}

/** The single scene of a one-scene placement (a section's clip or photo). */
export function scene(key: PlacementKey): SceneName {
  return PLACEMENTS[key][0];
}

/** A placement's scenes, as MediaHero items. */
export function placed(key: PlacementKey): { type: "video" | "image"; src: string; alt: string; scene: SceneName }[] {
  return PLACEMENTS[key].map((name: SceneName) => ({
    type: LIBRARY[name].kind === "clip" ? ("video" as const) : ("image" as const),
    src: sceneSrc(name),
    alt: LIBRARY[name].alt,
    scene: name,
  }));
}
