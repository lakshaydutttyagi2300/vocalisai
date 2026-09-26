// Logical Reasoning bank, part 2 (large). Computer-generated and correct by
// construction: series are computed, puzzles (seating, floors, schedules)
// are solved by trying every arrangement and only kept when the clues give
// exactly one answer, and syllogisms are checked against every possible
// Venn diagram. Every wrong option carries the reason it is wrong.
import { isPrime, makeKit, ordinal } from "./gen-kit.mjs";

const MALE = ["Rahul", "Amit", "Suresh", "Vikram", "Arjun", "Karan", "Rohan", "Manoj", "Deepak", "Nikhil", "Imran", "Joseph"];
const FEMALE = ["Priya", "Neha", "Anjali", "Kavya", "Meera", "Pooja", "Sneha", "Ritu", "Divya", "Asha", "Fatima", "Grace"];
const PEOPLE = ["Asha", "Bilal", "Chitra", "Dev", "Esha", "Farhan", "Gita", "Harsh", "Isha", "Jatin", "Kiran", "Lata"];
const L = (i) => String.fromCharCode(65 + i);

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  arr.forEach((x, i) => {
    for (const p of permutations([...arr.slice(0, i), ...arr.slice(i + 1)])) out.push([x, ...p]);
  });
  return out;
}

export function generatedReaQuestions() {
  const { R, pick, int, mcq, take, sample, shuffle } = makeKit(7_2026_0926);
  const PERMS5 = permutations([0, 1, 2, 3, 4]);
  const PERMS6 = permutations([0, 1, 2, 3, 4, 5]);
  const Q = [];
  const add = (list) => Q.push(...list.filter(Boolean));

  // ------------------------------------------------ Series
  const seriesQ = (skillId, level, seq, next, rule, wrongExtra = []) =>
    mcq({
      skillId, level,
      prompt: `What comes next in the series? ${seq.join(", ")}, ?`,
      answer: next,
      wrong: [
        ...wrongExtra,
        { value: seq[seq.length - 1] + (seq[seq.length - 1] - seq[seq.length - 2]), reason: "Repeated the last gap - check whether the gaps themselves follow a pattern." },
        { value: next + 1, reason: "Off by one - test the rule on every step." },
        { value: next - 2, reason: "Close, but it doesn't fit every term." },
      ],
      explanation: `Rule: ${rule}. Next term: ${next}.`,
      hint: "Write the differences (or ratios) between terms.",
      time: 60 + level * 10,
    });
  add(take(12, () => {
    const a = int(1, 6);
    const s = [a];
    for (let i = 1; i < 5; i++) s.push(s[i - 1] * 2 + 1);
    return seriesQ("REA.SER.NUM", 3, s, s[4] * 2 + 1, "double the previous term and add 1");
  }));
  add(take(10, () => {
    const primes = [];
    for (let n = 2; primes.length < 30; n++) if (isPrime(n)) primes.push(n);
    const i = int(0, 20);
    return seriesQ("REA.SER.NUM", 3, primes.slice(i, i + 5), primes[i + 5], "consecutive prime numbers", [
      { value: primes[i + 4] + 2, reason: "Added 2 - but not every odd number is prime." },
    ]);
  }));
  add(take(12, () => {
    const s = [int(1, 5), int(2, 8)];
    for (let i = 2; i < 6; i++) s.push(s[i - 1] + s[i - 2]);
    return seriesQ("REA.SER.NUM", 4, s, s[4] + s[5], "each term is the sum of the two before it");
  }));
  add(take(10, () => {
    const st = int(1, 6);
    const c = pick([1, -1, 2]);
    const s = [0, 1, 2, 3, 4].map((k) => (st + k) ** 2 + c);
    return seriesQ("REA.SER.NUM", 3, s, (st + 5) ** 2 + c, `squares ${c > 0 ? "plus" : "minus"} ${Math.abs(c)}: ${st}² ${c > 0 ? "+" : "−"} ${Math.abs(c)}, ${st + 1}² ${c > 0 ? "+" : "−"} ${Math.abs(c)}, …`);
  }));
  add(take(12, () => {
    const [a, d] = [int(2, 20), int(2, 6)];
    const [b, e] = [int(30, 60), -int(2, 5)];
    const s = [a, b, a + d, b + e, a + 2 * d, b + 2 * e];
    return mcq({
      skillId: "REA.SER.NUM", level: 4,
      prompt: `What comes next in the series? ${s.join(", ")}, ?`,
      answer: a + 3 * d,
      wrong: [
        { value: b + 3 * e, reason: "That's the next term of the OTHER interleaved series." },
        { value: s[5] + (s[5] - s[4]), reason: "Treated it as one series - it's two series taking turns." },
        { value: a + 3 * d + 1, reason: "Off by one - check the odd-position terms." },
      ],
      explanation: `Two series alternate: ${a}, ${a + d}, ${a + 2 * d}, … (+${d}) and ${b}, ${b + e}, ${b + 2 * e}, … (${e}). The 7th term continues the first: ${a + 3 * d}.`,
      hint: "Look at every other term.",
      time: 90,
    });
  }));
  add(take(12, () => {
    const k = pick([2, 3]);
    const c = int(1, 4);
    const s = [int(2, 6)];
    for (let i = 1; i < 5; i++) s.push(s[i - 1] * k - c);
    if (s[4] > 5000) return null;
    return seriesQ("REA.SER.NUM", 4, s, s[4] * k - c, `multiply by ${k}, then subtract ${c}`);
  }));
  add(take(10, () => {
    const st = int(0, 3);
    const s = [0, 1, 2, 3, 4].map((i) => L(25 - (st + i * 2)));
    const nxt = 25 - (st + 5 * 2);
    return mcq({
      skillId: "REA.SER.LETTER", level: 2,
      prompt: `What comes next? ${s.join(", ")}, ?`,
      answer: L(nxt),
      wrong: [
        { value: L(nxt + 1), reason: "One letter short - count backwards carefully." },
        { value: L(nxt - 1), reason: "One letter too far." },
        { value: L(25 - st - 6), reason: "Went forwards (+2) - this series goes backwards through the alphabet." },
      ],
      explanation: `The letters go backwards, skipping one each time (−2). Next: ${L(nxt)}.`,
      hint: "Number the letters (A = 1 … Z = 26).",
    });
  }));
  add(take(10, () => {
    const st = int(0, 4);
    const s = [0, 1, 2, 3].map((i) => L(st + i) + L(25 - st - i));
    return mcq({
      skillId: "REA.SER.LETTER", level: 3,
      prompt: `What comes next? ${s.join(", ")}, ?`,
      answer: L(st + 4) + L(21 - st),
      wrong: [
        { value: L(st + 4) + L(22 - st), reason: "The second letter moves back one each time too." },
        { value: L(21 - st) + L(st + 4), reason: "Swapped the two letters." },
        { value: L(st + 5) + L(20 - st), reason: "Skipped a step." },
      ],
      explanation: `First letters go forward (${s.map((x) => x[0]).join(", ")}, …); second letters go backward from Z. Next: ${L(st + 4) + L(21 - st)}.`,
      hint: "Treat each letter position as its own series.",
    });
  }));
  add(take(12, () => {
    const st = int(0, 5);
    const n0 = int(1, 4);
    const step = pick([2, 3]);
    const terms = [0, 1, 2, 3].map((i) => `${L(st + i * step)}${n0 + i * step}`);
    const ans = `${L(st + 4 * step)}${n0 + 4 * step}`;
    if (st + 4 * step > 25) return null;
    return mcq({
      skillId: "REA.SER.ALNUM", level: 2,
      prompt: `What comes next? ${terms.join(", ")}, ?`,
      answer: ans,
      wrong: [
        { value: `${L(st + 4 * step)}${n0 + 3 * step}`, reason: "The number changes too." },
        { value: `${L(st + 3 * step + 1)}${n0 + 4 * step}`, reason: "The letter jumps by the same step as the number." },
        { value: `${L(st + 4 * step)}${n0 + 4 * step + 1}`, reason: "Off by one on the number." },
      ],
      explanation: `Letters go +${step} and numbers go +${step}: next is ${ans}.`,
      hint: "Handle the letters and the numbers separately.",
    });
  }));
  add(take(10, () => {
    const st = int(0, 6);
    const terms = [0, 1, 2, 3].map((i) => `${L(st + 2 * i)}${2 ** (i + 1)}`);
    const ans = `${L(st + 8)}${2 ** 5}`;
    return mcq({
      skillId: "REA.SER.ALNUM", level: 3,
      prompt: `What comes next? ${terms.join(", ")}, ?`,
      answer: ans,
      wrong: [
        { value: `${L(st + 8)}${2 ** 4 + 2}`, reason: "The numbers double; they don't go up by 2." },
        { value: `${L(st + 7)}${2 ** 5}`, reason: "The letters skip one each time (+2)." },
        { value: `${L(st + 8)}${2 ** 6}`, reason: "Doubled twice." },
      ],
      explanation: `Letters +2; numbers double. Next: ${ans}.`,
      hint: "Letters and numbers each follow their own rule.",
    });
  }));
  add(take(12, () => {
    const a = int(2, 15);
    const d = int(3, 9);
    const s = [0, 1, 2, 3, 4].map((k) => a + k * d);
    const miss = int(1, 3);
    const shown = s.map((x, i) => (i === miss ? "?" : x));
    return mcq({
      skillId: "REA.SER.MISSING", level: 2,
      prompt: `Find the missing number: ${shown.join(", ")}`,
      answer: s[miss],
      wrong: [
        { value: s[miss] + 1, reason: "Off by one - the gap is the same everywhere." },
        { value: s[miss] - d + 1, reason: "Used the wrong gap." },
        { value: s[miss] + d, reason: "Skipped a step." },
      ],
      explanation: `Each term is ${d} more than the one before, so the missing term is ${s[miss]}.`,
      hint: "Find the constant gap from the terms you have.",
    });
  }));
  add(take(10, () => {
    const a = pick([2, 3, 5]);
    const r = pick([2, 3]);
    const s = [0, 1, 2, 3, 4].map((k) => a * r ** k);
    const miss = int(1, 3);
    const shown = s.map((x, i) => (i === miss ? "?" : x));
    return mcq({
      skillId: "REA.SER.MISSING", level: 3,
      prompt: `Find the missing number: ${shown.join(", ")}`,
      answer: s[miss],
      wrong: [
        { value: (s[miss - 1] + s[miss + 1]) / 2, reason: "Took the average of the neighbours - this series multiplies, it doesn't add." },
        { value: s[miss] + r, reason: "Added instead of multiplying." },
        { value: s[miss] * r, reason: "Skipped a step." },
      ],
      explanation: `Each term is ${r} × the previous one, so the missing term is ${s[miss]}.`,
      hint: "Check the ratio between neighbouring terms.",
    });
  }));
  add(take(12, () => {
    const kind = pick(["prime", "square", "multiple", "cube"]);
    let good;
    let odd;
    let rule;
    if (kind === "prime") {
      good = sample([11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61], 3);
      odd = pick([21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 91]);
      rule = "prime numbers";
    } else if (kind === "square") {
      good = sample([16, 25, 36, 49, 64, 81, 100, 121, 144, 169], 3);
      odd = pick([18, 27, 45, 50, 72, 90, 110, 130, 150]);
      rule = "perfect squares";
    } else if (kind === "cube") {
      good = sample([8, 27, 64, 125, 216, 343], 3);
      odd = pick([36, 81, 100, 144, 196, 250]);
      rule = "perfect cubes";
    } else {
      const k = pick([7, 9, 11, 13]);
      good = sample([2, 3, 4, 5, 6, 7, 8, 9].map((m) => k * m), 3);
      odd = k * int(3, 8) + pick([1, 2, 3]);
      rule = `multiples of ${k}`;
    }
    if (good.includes(odd)) return null;
    const all = shuffle([...good, odd]);
    return mcq({
      skillId: "REA.SER.ODD", level: kind === "cube" ? 3 : 2,
      prompt: `Which number is the odd one out? ${all.join(", ")}`,
      answer: odd,
      wrong: good.map((g) => ({ value: g, reason: `${g} is one of the ${rule}, like the others.` })),
      explanation: `${good.join(", ")} are ${rule}; ${odd} is not.`,
      hint: "Look for a property three of them share.",
    });
  }));

  // ------------------------------------------------ Inductive
  const CATS = {
    fruits: ["apple", "mango", "banana", "guava", "papaya", "grapes", "pineapple", "pomegranate"],
    vegetables: ["carrot", "potato", "cabbage", "spinach", "onion", "cauliflower", "radish", "brinjal"],
    "wild animals": ["lion", "tiger", "elephant", "zebra", "giraffe", "bear", "wolf", "leopard"],
    birds: ["sparrow", "parrot", "eagle", "pigeon", "crow", "peacock", "owl", "kingfisher"],
    "musical instruments": ["guitar", "violin", "flute", "drum", "sitar", "tabla", "piano", "trumpet"],
    vehicles: ["car", "bus", "truck", "bicycle", "scooter", "tractor", "van", "motorbike"],
    furniture: ["chair", "table", "sofa", "bed", "cupboard", "stool", "bench", "wardrobe"],
    professions: ["doctor", "teacher", "engineer", "lawyer", "nurse", "pilot", "carpenter", "plumber"],
    metals: ["iron", "copper", "silver", "gold", "zinc", "aluminium", "tin", "nickel"],
    planets: ["Mars", "Venus", "Jupiter", "Saturn", "Mercury", "Neptune", "Uranus", "Earth"],
  };
  const catNames = Object.keys(CATS);
  add(take(40, () => {
    const [c1, c2] = sample(catNames, 2);
    if ((c1 === "fruits" && c2 === "vegetables") || (c1 === "vegetables" && c2 === "fruits")) return null;
    const good = sample(CATS[c1], 3);
    const odd = pick(CATS[c2]);
    const all = shuffle([...good, odd]);
    return mcq({
      skillId: "REA.IND.CLASSIFY", level: 1,
      prompt: `Which word does not belong with the others? ${all.join(", ")}`,
      answer: odd,
      wrong: good.map((g) => ({ value: g, reason: `${g} belongs with the others - they are all ${c1}.` })),
      explanation: `${good.join(", ")} are ${c1}; ${odd} is not (it belongs to ${c2}).`,
      hint: "Find the group three of them belong to.",
      time: 45,
    });
  }));
  const RELS = {
    "works in": [["doctor", "hospital"], ["teacher", "school"], ["chef", "kitchen"], ["pilot", "cockpit"], ["farmer", "field"], ["judge", "court"], ["scientist", "laboratory"], ["mechanic", "garage"], ["librarian", "library"], ["actor", "stage"]],
    "is the young of": [["puppy", "dog"], ["kitten", "cat"], ["calf", "cow"], ["cub", "lion"], ["foal", "horse"], ["lamb", "sheep"], ["chick", "hen"], ["kid", "goat"]],
    "is used by a": [["brush", "painter"], ["scissors", "tailor"], ["stethoscope", "doctor"], ["hammer", "carpenter"], ["camera", "photographer"], ["spade", "gardener"], ["whistle", "referee"]],
    "lives in a": [["bird", "nest"], ["lion", "den"], ["dog", "kennel"], ["horse", "stable"], ["bee", "hive"], ["rabbit", "burrow"], ["spider", "web"]],
    "is the opposite of": [["hot", "cold"], ["early", "late"], ["rich", "poor"], ["strong", "weak"], ["buy", "sell"], ["arrive", "depart"], ["success", "failure"], ["increase", "decrease"]],
    "measures": [["thermometer", "temperature"], ["clock", "time"], ["ruler", "length"], ["barometer", "pressure"], ["speedometer", "speed"], ["odometer", "distance"]],
  };
  const PHRASE = {
    "works in": (a, b) => `A ${a} works in a ${b}`,
    "is the young of": (a, b) => `A ${a} is a young ${b}`,
    "is used by a": (a, b) => `A ${a} is used by a ${b}`,
    "lives in a": (a, b) => `A ${a} lives in a ${b}`,
    "is the opposite of": (a, b) => `"${a}" is the opposite of "${b}"`,
    "measures": (a, b) => `A ${a} measures ${b}`,
  };
  add(take(40, () => {
    const rel = pick(Object.keys(RELS));
    const [p1, p2, ...others] = sample(RELS[rel], RELS[rel].length);
    const wrong = sample(others, 3).map(([, b]) => ({ value: b, reason: `${p2[0]} doesn't go with "${b}" in the same way - that pairs with ${RELS[rel].find(([, y]) => y === b)[0]}.` }));
    return mcq({
      skillId: "REA.IND.ANALOGIES", level: 2,
      prompt: `${p1[0][0].toUpperCase() + p1[0].slice(1)} : ${p1[1]} :: ${p2[0]} : ?`,
      answer: p2[1],
      wrong,
      explanation: `${PHRASE[rel](p1[0], p1[1])}; in the same way, ${PHRASE[rel](p2[0], p2[1]).replace(/^A /, "a ")}.`,
      hint: "State the link between the first pair in a sentence, then apply it.",
      time: 45,
    });
  }));
  add(take(20, () => {
    const rule = pick([
      { f: (n) => n * n, d: "square" },
      { f: (n) => n ** 3, d: "cube" },
      { f: (n) => n * n + 1, d: "square plus 1" },
      { f: (n) => 2 * n + 1, d: "double plus 1" },
      { f: (n) => n * (n + 1), d: "n × (n + 1)" },
    ]);
    const [a, b] = sample([2, 3, 4, 5, 6, 7, 8, 9, 11, 12], 2);
    return mcq({
      skillId: "REA.IND.ANALOGIES", level: 3,
      prompt: `${a} : ${rule.f(a)} :: ${b} : ?`,
      answer: rule.f(b),
      wrong: [
        { value: rule.f(b) + 1, reason: "Off by one - check the rule on the first pair exactly." },
        { value: b + (rule.f(a) - a), reason: "Added the same difference - the rule depends on the number itself." },
        { value: b * (rule.f(a) / a), reason: "Multiplied by the same factor - the rule is not a fixed multiple." },
      ],
      explanation: `Rule: ${rule.d}. ${a} → ${rule.f(a)}, so ${b} → ${rule.f(b)}.`,
      hint: "Test squares, cubes and simple '× then +' rules.",
      time: 60,
    });
  }));
  add(take(20, () => {
    const rule = pick([
      { f: (n) => 3 * n + 1, d: "multiply by 3, add 1" },
      { f: (n) => 2 * n + 3, d: "multiply by 2, add 3" },
      { f: (n) => n * n - 1, d: "square it, subtract 1" },
      { f: (n) => 4 * n - 2, d: "multiply by 4, subtract 2" },
      { f: (n) => 5 * n - 3, d: "multiply by 5, subtract 3" },
    ]);
    const xs = sample([2, 3, 4, 5, 6, 7, 8, 9, 10], 4);
    const [x1, x2, x3, x4] = xs;
    return mcq({
      skillId: "REA.IND.RULES", level: 3,
      prompt: `The same rule turns each number into the next: ${x1} → ${rule.f(x1)}, ${x2} → ${rule.f(x2)}, ${x3} → ${rule.f(x3)}. What does ${x4} become?`,
      answer: rule.f(x4),
      wrong: [
        { value: rule.f(x4) + 2, reason: "Close - apply the rule exactly." },
        { value: x4 + (rule.f(x3) - x3), reason: "Added a fixed amount - the rule multiplies first." },
        { value: rule.f(x4) - 1, reason: "Off by one - check the rule on all three examples." },
      ],
      explanation: `Rule: ${rule.d}. ${x4} → ${rule.f(x4)}.`,
      hint: "Find one rule that works for all three examples.",
    });
  }));

  // ------------------------------------------------ Coding-decoding
  const WORDS = ["CALL", "DESK", "FILE", "HELP", "MAIL", "PLAN", "TEAM", "NOTE", "BOOK", "CODE", "DATA", "FORM", "LINK", "SHOP", "TASK", "WORD", "CHAT", "SALE", "GOAL", "RISK", "LAMP", "BLUE", "GIFT", "JUMP"];
  const pos = (w) => w.split("").map((c) => c.charCodeAt(0) - 64);
  add(take(16, () => {
    const [w1, w2] = sample(WORDS, 2);
    const s1 = pos(w1).reduce((a, b) => a + b, 0);
    const s2 = pos(w2).reduce((a, b) => a + b, 0);
    return mcq({
      skillId: "REA.COD.CODING", level: 3,
      prompt: `If A = 1, B = 2, … Z = 26, then ${w1} = ${s1} (the sum of its letters). What is ${w2}?`,
      answer: s2,
      wrong: [
        { value: s2 + 1, reason: "Off by one - recheck each letter's position." },
        { value: s2 - 2, reason: "One letter's value is wrong." },
        { value: pos(w2).reduce((a, b) => a * b, 1) > 9999 ? s2 + 10 : pos(w2).reduce((a, b) => a * b, 1), reason: "Multiplied the letter values instead of adding them." },
      ],
      explanation: `${w2}: ${w2.split("").map((c, i) => `${c}=${pos(w2)[i]}`).join(", ")} → ${s2}.`,
      hint: "Write each letter's position in the alphabet.",
    });
  }));
  add(take(16, () => {
    const pool = ["BAD", "CAB", "FACE", "BEAD", "DEAF", "CAFE", "HIDE", "JADE", "BIKE", "FIGHT", "EIGHT"];
    const [w1, w2] = sample(pool, 2);
    const code = (w) => pos(w).join("");
    return mcq({
      skillId: "REA.COD.CODING", level: 2,
      prompt: `If ${w1} is written as ${code(w1)}, how is ${w2} written in the same code?`,
      answer: code(w2),
      wrong: [
        { value: code(w2).split("").reverse().join(""), reason: "Reversed the digits - the code keeps the letter order." },
        { value: pos(w2).map((n) => n + 1).join(""), reason: "Shifted every letter by one." },
        { value: pos(w2).map((n) => 27 - n).join(""), reason: "Used positions counted from Z." },
      ],
      explanation: `Each letter becomes its position in the alphabet: ${w2.split("").map((c, i) => `${c}=${pos(w2)[i]}`).join(", ")} → ${code(w2)}.`,
      hint: "A = 1, B = 2, C = 3 …",
    });
  }));
  add(take(16, () => {
    const [w1, w2] = sample(WORDS, 2);
    const opp = (w) => w.split("").map((c) => L(25 - (c.charCodeAt(0) - 65))).join("");
    return mcq({
      skillId: "REA.COD.CODING", level: 4,
      prompt: `In a code, ${w1} is written as ${opp(w1)}. How is ${w2} written in that code?`,
      answer: opp(w2),
      wrong: [
        { value: opp(w2).split("").reverse().join(""), reason: "Reversed the word as well - this code keeps the order." },
        { value: w2.split("").map((c) => L((c.charCodeAt(0) - 65 + 1) % 26)).join(""), reason: "Shifted each letter by one - the code swaps each letter with its opposite (A↔Z, B↔Y …)." },
        { value: w2.split("").map((c) => L(24 - (c.charCodeAt(0) - 65) < 0 ? 0 : 24 - (c.charCodeAt(0) - 65))).join(""), reason: "Off by one in the opposite-letter pairing." },
      ],
      explanation: `Each letter is swapped with its 'opposite' (A↔Z, B↔Y, C↔X …). ${w2} → ${opp(w2)}.`,
      hint: "Compare the first letter of the word and of its code.",
    });
  }));

  // ------------------------------------------------ Blood relations
  const BLOOD = [
    { q: (m, f, x, y) => `${m[0]} is the father of ${m[1]}. ${m[1]} is the brother of ${y}. How is ${m[0]} related to ${y}?`, a: "Father", w: ["Uncle", "Grandfather", "Brother"], why: (m) => `${m[1]} and the other person are siblings, so ${m[0]} is the father of both.` },
    { q: (m, f, x, y) => `${f[0]} is the sister of ${m[0]}. ${m[0]} is the father of ${y}. How is ${f[0]} related to ${y}?`, a: "Aunt", w: ["Mother", "Sister", "Grandmother"], why: (m, f) => `${f[0]} is the sister of the child's father - a paternal aunt.` },
    { q: (m, f) => `${m[0]} is the son of ${f[0]}. ${f[0]} is the daughter of ${m[1]}. How is ${m[1]} related to ${m[0]}?`, a: "Grandfather", w: ["Father", "Uncle", "Brother"], why: (m, f) => `${m[1]} is the father of ${m[0]}'s mother - his maternal grandfather.` },
    { q: (m, f) => `${f[0]} is the wife of ${m[0]}. ${m[0]} is the brother of ${m[1]}. How is ${f[0]} related to ${m[1]}?`, a: "Sister-in-law", w: ["Sister", "Wife", "Aunt"], why: (m, f) => `${f[0]} is married to ${m[1]}'s brother, so she is his sister-in-law.` },
    { q: (m, f, x, y) => `${m[1]} is the brother of ${f[0]}. ${f[0]} is the mother of ${m[0]}. How is ${m[1]} related to ${m[0]}?`, a: "Uncle", w: ["Father", "Brother", "Grandfather"], why: (m, f) => `${m[1]} is the brother of ${m[0]}'s mother - a maternal uncle.` },
    { q: (m, f) => `${f[0]} is the daughter of ${m[0]}. ${m[0]} is the only son of ${f[1]}. How is ${f[1]} related to ${f[0]}?`, a: "Grandmother", w: ["Mother", "Aunt", "Sister"], why: (m, f) => `${f[1]} is the mother of ${f[0]}'s father.` },
    { q: (m, f) => `${m[0]}'s father is ${m[1]}. ${m[1]}'s only sister is ${f[0]}. How is ${f[0]} related to ${m[0]}?`, a: "Aunt", w: ["Mother", "Sister", "Grandmother"], why: (m, f) => `${f[0]} is the sister of ${m[0]}'s father.` },
    { q: (m, f) => `${m[0]} is the son of ${m[1]}. ${f[0]} is the daughter of ${m[1]}. How is ${m[0]} related to ${f[0]}?`, a: "Brother", w: ["Father", "Cousin", "Uncle"], why: (m, f) => `Both are children of ${m[1]}, so ${m[0]} is ${f[0]}'s brother.` },
    { q: (m, f, x, y) => `${f[0]} is the mother of ${m[0]}. ${m[0]} is the father of ${y}. How is ${f[0]} related to ${y}?`, a: "Grandmother", w: ["Mother", "Aunt", "Sister"], why: (m, f) => `${f[0]} is the mother of the child's father.` },
    { q: (m, f) => `${m[0]} is the brother of ${m[1]}. ${m[1]} is the son of ${f[0]}. How is ${f[0]} related to ${m[0]}?`, a: "Mother", w: ["Aunt", "Sister", "Grandmother"], why: (m, f) => `${m[0]} and ${m[1]} are brothers, so ${f[0]} is the mother of both.` },
    { q: (m, f) => `${f[0]} is the only daughter of ${m[0]}. ${m[1]} is the son of ${f[0]}. How is ${m[0]} related to ${m[1]}?`, a: "Grandfather", w: ["Father", "Uncle", "Brother"], why: (m, f) => `${m[0]} is the father of ${m[1]}'s mother.` },
    { q: (m, f) => `${m[0]} is the husband of ${f[0]}. ${f[1]} is the sister of ${f[0]}. How is ${m[0]} related to ${f[1]}?`, a: "Brother-in-law", w: ["Brother", "Husband", "Uncle"], why: (m, f) => `${m[0]} is married to ${f[1]}'s sister.` },
  ];
  add(take(60, (i) => {
    const t = BLOOD[i % BLOOD.length];
    const m = sample(MALE, 2);
    const f = sample(FEMALE, 2);
    const y = pick([...sample(MALE.filter((n) => !m.includes(n)), 1), ...sample(FEMALE.filter((n) => !f.includes(n)), 1)]);
    return mcq({
      skillId: "REA.REL.BLOOD", level: 3,
      prompt: t.q(m, f, null, y),
      answer: t.a,
      wrong: t.w.map((w) => ({ value: w, reason: `Not ${w.toLowerCase()} - trace the relationship one step at a time.` })),
      explanation: t.why(m, f),
      hint: "Draw a small family tree as you read.",
      time: 75,
    });
  }));

  // ------------------------------------------------ Directions & ranking
  const DIRS = ["north", "east", "south", "west"];
  add(take(24, () => {
    const start = int(0, 3);
    const turns = Array.from({ length: int(2, 4) }, () => pick(["right", "left", "right", "left", "around"]));
    let d = start;
    for (const t of turns) d = (d + (t === "right" ? 1 : t === "left" ? 3 : 2)) % 4;
    const words = turns.map((t) => (t === "around" ? "turns around" : `turns ${t}`));
    let mirror = start;
    for (const t of turns) mirror = (mirror + (t === "right" ? 3 : t === "left" ? 1 : 2)) % 4;
    return mcq({
      skillId: "REA.REL.DIRECTION", level: 2,
      prompt: `Neha is facing ${DIRS[start]}. She ${words.slice(0, -1).join(", ")}${words.length > 1 ? " and then " : ""}${words[words.length - 1]}. Which direction is she facing now?`,
      answer: DIRS[d][0].toUpperCase() + DIRS[d].slice(1),
      wrong: [
        { value: DIRS[mirror][0].toUpperCase() + DIRS[mirror].slice(1), reason: "Swapped left and right - a right turn from north faces east." },
        { value: DIRS[(d + 2) % 4][0].toUpperCase() + DIRS[(d + 2) % 4].slice(1), reason: "Exactly the opposite - one turn was counted the wrong way." },
        { value: DIRS[start][0].toUpperCase() + DIRS[start].slice(1), reason: "The turns don't bring her back to where she started." },
        { value: DIRS[(d + 1) % 4][0].toUpperCase() + DIRS[(d + 1) % 4].slice(1), reason: "One extra right turn." },
      ],
      explanation: `Track each turn: right = clockwise, left = anticlockwise, turn around = 180°. She ends up facing ${DIRS[d]}.`,
      hint: "Turn a pen on the table as you read each step.",
    });
  }));
  add(take(24, () => {
    const names = sample(PEOPLE, 5);
    // names[0] tallest … names[4] shortest; give the four adjacent comparisons, shuffled and varied.
    const clues = [0, 1, 2, 3].map((i) =>
      pick([true, false]) ? `${names[i]} is taller than ${names[i + 1]}.` : `${names[i + 1]} is shorter than ${names[i]}.`
    );
    const ask = pick(["tallest", "shortest", "middle"]);
    const ans = ask === "tallest" ? names[0] : ask === "shortest" ? names[4] : names[2];
    return mcq({
      skillId: "REA.REL.RANKING", level: 3,
      prompt: `${shuffle(clues).join(" ")} Who is ${ask === "middle" ? "third tallest (in the middle)" : `the ${ask}`}?`,
      answer: ans,
      wrong: names.filter((n) => n !== ans).slice(0, 3).map((n) => ({ value: n, reason: `Order them: ${names.join(" > ")}. ${n} isn't ${ask === "middle" ? "in the middle" : `the ${ask}`}.` })),
      explanation: `Tallest to shortest: ${names.join(", ")}.`,
      hint: "Chain the comparisons into one line from tallest to shortest.",
      time: 90,
    });
  }));

  // ------------------------------------------------ Arrangements (brute-force checked)
  const solveUnique = (items, slots, clues) => {
    const sols = (slots === 5 ? PERMS5 : permutations([...Array(slots).keys()])).filter((p) => clues.every((c) => c.ok((name) => p[items.indexOf(name)])));
    return sols;
  };
  const buildPuzzle = ({ items, slots, makeClues, minClues = 3, maxClues = 7 }) => {
    const truth = shuffle([...Array(slots).keys()]); // truth[i] = slot of items[i]
    const at = (name) => truth[items.indexOf(name)];
    const pool = shuffle(makeClues(at).filter((c) => c.ok(at)));
    const chosen = [];
    for (const c of pool) {
      chosen.push(c);
      if (chosen.length >= minClues && solveUnique(items, slots, chosen).length === 1) break;
      if (chosen.length >= maxClues) return null;
    }
    const sols = solveUnique(items, slots, chosen);
    if (sols.length !== 1) return null;
    // Drop any clue that isn't needed, so every clue matters.
    for (let i = chosen.length - 1; i >= 0 && chosen.length > minClues; i--) {
      const without = chosen.filter((_, j) => j !== i);
      if (solveUnique(items, slots, without).length === 1) chosen.splice(i, 1);
    }
    return { truth, at, clues: chosen };
  };

  // Linear row, facing north (left = lower seat number).
  add(take(24, () => {
    const items = sample(PEOPLE, 5);
    const pz = buildPuzzle({
      items,
      slots: 5,
      makeClues: (at) => {
        const cs = [];
        for (const x of items) {
          cs.push({ t: `${x} sits at the left end.`, ok: (p) => p(x) === 0 });
          cs.push({ t: `${x} sits at the right end.`, ok: (p) => p(x) === 4 });
          cs.push({ t: `${x} does not sit at either end.`, ok: (p) => p(x) !== 0 && p(x) !== 4 });
          for (const y of items) {
            if (x === y) continue;
            cs.push({ t: `${x} sits immediately to the left of ${y}.`, ok: (p) => p(x) === p(y) - 1 });
            cs.push({ t: `${x} sits second to the right of ${y}.`, ok: (p) => p(x) === p(y) + 2 });
            cs.push({ t: `${x} sits somewhere to the left of ${y}.`, ok: (p) => p(x) < p(y) });
            const gap = Math.abs(at(x) - at(y)) - 1;
            if (gap >= 1 && x < y) cs.push({ t: `Exactly ${gap} ${gap === 1 ? "person sits" : "people sit"} between ${x} and ${y}.`, ok: (p) => Math.abs(p(x) - p(y)) - 1 === gap });
          }
        }
        return cs;
      },
    });
    if (!pz) return null;
    const order = [...items].sort((a, b) => pz.at(a) - pz.at(b));
    const ask = pick(["middle", "right end", "left end", "right of"]);
    let question;
    let ans;
    if (ask === "right of") {
      const i = int(0, 3);
      question = `Who sits immediately to the right of ${order[i]}?`;
      ans = order[i + 1];
    } else {
      question = `Who sits ${ask === "middle" ? "in the middle" : `at the ${ask}`}?`;
      ans = ask === "middle" ? order[2] : ask === "right end" ? order[4] : order[0];
    }
    return mcq({
      skillId: "REA.ARR.LINEAR", level: 4,
      prompt: `${items.join(", ").replace(/, ([^,]*)$/, " and $1")} sit in a row, all facing north. ${pz.clues.map((c) => c.t).join(" ")} ${question}`,
      answer: ans,
      wrong: items.filter((n) => n !== ans).slice(0, 3).map((n) => ({ value: n, reason: "That doesn't fit all the clues - place the fixed positions first, then the 'immediately next to' clues." })),
      explanation: `The only order that fits every clue (left to right): ${order.join(", ")}.`,
      hint: "Draw five seats and fill in the definite clues first.",
      time: 150,
    });
  }));

  // Circular table of 6 (only reflection-proof questions: who is opposite / next to whom).
  add(take(20, () => {
    const items = sample(PEOPLE, 6);
    const truth = shuffle([0, 1, 2, 3, 4, 5]);
    const at = (n) => truth[items.indexOf(n)];
    const opp = (a, b) => (a - b + 6) % 6 === 3;
    const next = (a, b) => (a - b + 6) % 6 === 1 || (b - a + 6) % 6 === 1;
    const pool = [];
    for (const x of items)
      for (const y of items) {
        if (x >= y) continue;
        pool.push({ t: `${x} sits opposite ${y}.`, ok: (p) => opp(p(x), p(y)) });
        pool.push({ t: `${x} sits next to ${y}.`, ok: (p) => next(p(x), p(y)) });
        pool.push({ t: `${x} does not sit next to ${y}.`, ok: (p) => !next(p(x), p(y)) });
      }
    const target = pick(items);
    const answerOf = (p) => items.find((n) => n !== target && opp(p(n), p(target)));
    const clues = [];
    for (const c of shuffle(pool.filter((c) => c.ok(at)))) {
      if (c.t.startsWith(`${target} sits opposite`) || c.t.endsWith(`opposite ${target}.`)) continue; // don't give the answer away
      clues.push(c);
      if (clues.length < 3) continue;
      const sols = PERMS6.filter((perm) => clues.every((cl) => cl.ok((n) => perm[items.indexOf(n)])));
      const answers = new Set(sols.map((perm) => answerOf((n) => perm[items.indexOf(n)])));
      if (answers.size === 1) break;
      if (clues.length >= 6) return null;
    }
    const sols = PERMS6.filter((perm) => clues.every((cl) => cl.ok((n) => perm[items.indexOf(n)])));
    const answers = new Set(sols.map((perm) => answerOf((n) => perm[items.indexOf(n)])));
    if (answers.size !== 1) return null;
    const ans = [...answers][0];
    return mcq({
      skillId: "REA.ARR.CIRCULAR", level: 5,
      prompt: `${items.join(", ").replace(/, ([^,]*)$/, " and $1")} sit around a round table with six equally spaced seats. ${clues.map((c) => c.t).join(" ")} Who sits opposite ${target}?`,
      answer: ans,
      wrong: items.filter((n) => n !== ans && n !== target).slice(0, 3).map((n) => ({ value: n, reason: "Doesn't fit every clue - with six seats, each person has exactly one person opposite and two neighbours." })),
      explanation: `Every seating that fits the clues puts ${ans} opposite ${target}.`,
      hint: "Place one person, then use the 'opposite' clues - they fix pairs of seats.",
      time: 180,
    });
  }));

  // Floors of a building (1 = ground floor … 5 = top).
  add(take(24, () => {
    const items = sample(PEOPLE, 5);
    const pz = buildPuzzle({
      items,
      slots: 5,
      makeClues: (at) => {
        const cs = [];
        for (const x of items) {
          cs.push({ t: `${x} lives on the top floor.`, ok: (p) => p(x) === 4 });
          cs.push({ t: `${x} lives on the ground floor.`, ok: (p) => p(x) === 0 });
          cs.push({ t: `${x} lives on an even-numbered floor.`, ok: (p) => (p(x) + 1) % 2 === 0 });
          cs.push({ t: `${x} lives on an odd-numbered floor.`, ok: (p) => (p(x) + 1) % 2 === 1 });
          for (const y of items) {
            if (x === y) continue;
            cs.push({ t: `${x} lives on the floor immediately above ${y}.`, ok: (p) => p(x) === p(y) + 1 });
            cs.push({ t: `${x} lives somewhere below ${y}.`, ok: (p) => p(x) < p(y) });
            const gap = Math.abs(at(x) - at(y)) - 1;
            if (gap >= 1 && x < y) cs.push({ t: `There ${gap === 1 ? "is exactly one floor" : `are exactly ${gap} floors`} between ${x} and ${y}.`, ok: (p) => Math.abs(p(x) - p(y)) - 1 === gap });
          }
        }
        return cs;
      },
    });
    if (!pz) return null;
    const byFloor = [...items].sort((a, b) => pz.at(a) - pz.at(b));
    const askFloor = int(0, 1) === 1;
    const f = int(1, 5);
    const who = pick(items);
    return mcq({
      skillId: "REA.ARR.PUZZLES", level: 4,
      prompt: `${items.join(", ").replace(/, ([^,]*)$/, " and $1")} each live on a different floor of a five-floor building (floor 1 is the lowest, floor 5 the top). ${pz.clues.map((c) => c.t).join(" ")} ${askFloor ? `On which floor does ${who} live?` : `Who lives on floor ${f}?`}`,
      answer: askFloor ? `Floor ${pz.at(who) + 1}` : byFloor[f - 1],
      wrong: askFloor
        ? [1, 2, 3, 4, 5].filter((n) => n !== pz.at(who) + 1).slice(0, 3).map((n) => ({ value: `Floor ${n}`, reason: "Doesn't fit every clue - fix the definite floors first." }))
        : items.filter((n) => n !== byFloor[f - 1]).slice(0, 3).map((n) => ({ value: n, reason: "Doesn't fit every clue - fix the definite floors first." })),
      explanation: `From floor 1 up: ${byFloor.join(", ")}.`,
      hint: "Draw five floors and fill in the definite clues first.",
      time: 150,
    });
  }));

  // Weekly schedule (Monday–Friday).
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const MEETINGS = ["Sales", "HR", "Finance", "Training", "Audit", "Marketing", "IT", "Quality"];
  add(take(24, () => {
    const items = sample(MEETINGS, 5);
    const pz = buildPuzzle({
      items,
      slots: 5,
      makeClues: (at) => {
        const cs = [];
        for (const x of items) {
          cs.push({ t: `The ${x} meeting is on ${DAYS[at(x)]}.`, ok: (p) => p(x) === at(x) });
          cs.push({ t: `The ${x} meeting is not on Monday or Friday.`, ok: (p) => p(x) !== 0 && p(x) !== 4 });
          for (const y of items) {
            if (x === y) continue;
            cs.push({ t: `The ${x} meeting is the day after the ${y} meeting.`, ok: (p) => p(x) === p(y) + 1 });
            cs.push({ t: `The ${x} meeting is earlier in the week than the ${y} meeting.`, ok: (p) => p(x) < p(y) });
            const gap = Math.abs(at(x) - at(y)) - 1;
            if (gap >= 1 && x < y) cs.push({ t: `There ${gap === 1 ? "is exactly one day" : `are exactly ${gap} days`} between the ${x} and ${y} meetings.`, ok: (p) => Math.abs(p(x) - p(y)) - 1 === gap });
          }
        }
        return cs.filter((c) => !/is on (Monday|Tuesday|Wednesday|Thursday|Friday)\./.test(c.t) || R() < 0.15);
      },
    });
    if (!pz) return null;
    const byDay = [...items].sort((a, b) => pz.at(a) - pz.at(b));
    const askDay = int(0, 1) === 1;
    const d = int(0, 4);
    const which = pick(items);
    return mcq({
      skillId: "REA.ARR.SCHEDULING", level: 4,
      prompt: `Five meetings - ${items.join(", ").replace(/, ([^,]*)$/, " and $1")} - are held on different days from Monday to Friday of one week. ${pz.clues.map((c) => c.t).join(" ")} ${askDay ? `On which day is the ${which} meeting?` : `Which meeting is on ${DAYS[d]}?`}`,
      answer: askDay ? DAYS[pz.at(which)] : byDay[d],
      wrong: askDay
        ? DAYS.filter((x) => x !== DAYS[pz.at(which)]).slice(0, 3).map((x) => ({ value: x, reason: "Doesn't fit every clue - place the 'day after' pairs first." }))
        : items.filter((x) => x !== byDay[d]).slice(0, 3).map((x) => ({ value: x, reason: "Doesn't fit every clue - place the 'day after' pairs first." })),
      explanation: `Monday to Friday: ${byDay.join(", ")}.`,
      hint: "Write the five days in a row and slot in the linked pairs.",
      time: 150,
    });
  }));

  // ------------------------------------------------ Syllogisms (checked against every Venn diagram)
  const NOUNS = ["pens", "books", "chairs", "tables", "cups", "bags", "phones", "clocks", "keys", "boxes", "lamps", "files", "bottles", "caps", "shoes", "rings"];
  // Venn regions for sets A,B,C = bitmasks 1..7 (bit0 = A, bit1 = B, bit2 = C).
  const models = [];
  for (let m = 0; m < 128; m++) {
    const regions = [1, 2, 3, 4, 5, 6, 7].filter((_, i) => m & (1 << i));
    const nonEmpty = (bit) => regions.some((r) => r & bit);
    if (nonEmpty(1) && nonEmpty(2) && nonEmpty(4)) models.push(regions);
  }
  const holds = (st, regions) => {
    const [x, y] = [st.x, st.y];
    if (st.kind === "all") return !regions.some((r) => r & x && !(r & y));
    if (st.kind === "no") return !regions.some((r) => r & x && r & y);
    if (st.kind === "some") return regions.some((r) => r & x && r & y);
    return regions.some((r) => r & x && !(r & y)); // some-not
  };
  const say = (st, names) => {
    const n = { 1: names[0], 2: names[1], 4: names[2] };
    return { all: `All ${n[st.x]} are ${n[st.y]}.`, no: `No ${n[st.x]} are ${n[st.y]}.`, some: `Some ${n[st.x]} are ${n[st.y]}.`, "some-not": `Some ${n[st.x]} are not ${n[st.y]}.` }[st.kind];
  };
  const KINDS = ["all", "no", "some", "some-not"];
  add(take(48, () => {
    const names = sample(NOUNS, 3);
    const p1 = { kind: pick(["all", "all", "some", "no"]), x: pick([1, 2]) };
    p1.y = p1.x === 1 ? 2 : 1;
    const p2 = { kind: pick(["all", "all", "some", "no"]), x: pick([2, 4]) };
    p2.y = p2.x === 2 ? 4 : 2;
    const valid = models.filter((m) => holds(p1, m) && holds(p2, m));
    if (valid.length === 0) return null;
    const concl = () => {
      const kind = pick(KINDS);
      const x = pick([1, 4]);
      return { kind, x, y: x === 1 ? 4 : 1 };
    };
    const c1 = concl();
    let c2 = concl();
    if (say(c1, names) === say(c2, names)) c2 = { kind: pick(KINDS.filter((k) => k !== c1.kind)), x: c1.x, y: c1.y };
    const f1 = valid.every((m) => holds(c1, m));
    const f2 = valid.every((m) => holds(c2, m));
    // Skip complementary pairs ("either/or" cases) where neither definitely follows.
    if (!f1 && !f2 && valid.every((m) => holds(c1, m) || holds(c2, m))) return null;
    const ans = f1 && f2 ? "Both I and II follow" : f1 ? "Only I follows" : f2 ? "Only II follows" : "Neither I nor II follows";
    const all = ["Only I follows", "Only II follows", "Both I and II follow", "Neither I nor II follows"];
    return mcq({
      skillId: "REA.DED.SYL", level: f1 && f2 ? 3 : 4,
      prompt: `Statements: ${say(p1, names)} ${say(p2, names)}\nConclusions: I. ${say(c1, names)} II. ${say(c2, names)}\nWhich conclusion(s) definitely follow?`,
      answer: ans,
      wrong: all.filter((a) => a !== ans).map((a) => ({
        value: a,
        reason: `Conclusion I ${f1 ? "does" : "does not"} definitely follow and conclusion II ${f2 ? "does" : "does not"} - check each against every diagram that fits the statements.`,
      })),
      explanation: `Draw every Venn diagram the two statements allow. Conclusion I is ${f1 ? "true in all of them" : "false in at least one"}; conclusion II is ${f2 ? "true in all of them" : "false in at least one"}.`,
      hint: "A conclusion follows only if it is true in EVERY diagram the statements allow.",
      time: 120,
    });
  }));

  // ------------------------------------------------ Analytical
  add(take(16, () => {
    const n = int(3, 6);
    const kinds = [
      { k: "exactly three faces", v: 8 },
      { k: "exactly two faces", v: 12 * (n - 2) },
      { k: "exactly one face", v: 6 * (n - 2) ** 2 },
      { k: "no face", v: (n - 2) ** 3 },
    ];
    const ask = pick(kinds);
    return mcq({
      skillId: "REA.ANA.CUBES", level: ask.k === "exactly three faces" ? 2 : 4,
      prompt: `A large cube is painted on all six faces and then cut into ${n ** 3} equal small cubes (${n} × ${n} × ${n}). How many small cubes have ${ask.k} painted?`,
      answer: ask.v,
      wrong: kinds.filter((x) => x !== ask).map((x) => ({ value: x.v, reason: `${x.v} is the number with ${x.k} painted.` })),
      explanation: `Corners: 8 (three faces). Edges: 12 × (n − 2) (two faces). Face centres: 6 × (n − 2)² (one face). Inside: (n − 2)³ (none). With n = ${n}: ${ask.v}.`,
      hint: "Think corners, edges, face centres and the hidden inside.",
    });
  }));
  add(take(6, () => {
    const f = int(1, 6);
    return mcq({
      skillId: "REA.ANA.CUBES", level: 1,
      prompt: `On a standard dice, opposite faces always add up to 7. Which number is opposite ${f}?`,
      answer: 7 - f,
      wrong: [1, 2, 3, 4, 5, 6].filter((x) => x !== 7 - f && x !== f).slice(0, 3).map((x) => ({ value: x, reason: `${f} + ${x} = ${f + x}, not 7.` })),
      explanation: `Opposite faces add up to 7, so the face opposite ${f} is 7 − ${f} = ${7 - f}.`,
      hint: "Opposite faces sum to 7.",
      time: 30,
    });
  }));
  add(take(20, () => {
    const N = pick([40, 50, 60, 80, 100, 120]);
    const both = int(4, 15);
    const a = int(both + 5, Math.floor(N * 0.6));
    const b = int(both + 5, Math.floor(N * 0.6));
    const neither = N - (a + b - both);
    if (neither < 0) return null;
    const [s1, s2] = pick([["cricket", "football"], ["tea", "coffee"], ["Hindi", "Tamil"], ["email", "chat"], ["the morning shift", "the evening shift"]]);
    return mcq({
      skillId: "REA.ANA.VENN", level: 3,
      prompt: `In a group of ${N} people, ${a} like ${s1}, ${b} like ${s2}, and ${both} like both. How many like neither?`,
      answer: neither,
      wrong: [
        { value: N - a - b > 0 ? N - a - b : neither + both + 1, reason: "Forgot that the people who like both were counted twice." },
        { value: a + b - both, reason: "That's the number who like at least one." },
        { value: N - both, reason: "Subtracted only the 'both' group." },
      ],
      explanation: `At least one = ${a} + ${b} − ${both} = ${a + b - both}. Neither = ${N} − ${a + b - both} = ${neither}.`,
      hint: "Add the two groups, subtract the overlap once.",
    });
  }));
  add(take(20, () => {
    const k = int(2, 6);
    const c = int(1, 15);
    const sub = pick([true, false]);
    const f = (x) => (sub ? k * x - c : k * x + c);
    const x = int(3, 20);
    const reverse = pick([true, false]);
    const desc = `multiplies it by ${k} and then ${sub ? "subtracts" : "adds"} ${c}`;
    return reverse
      ? mcq({
          skillId: "REA.ANA.MACHINE", level: 3,
          prompt: `A machine takes a number, ${desc}. The output is ${f(x)}. What was the input?`,
          answer: x,
          wrong: [
            { value: sub ? (f(x) - c) / k === x ? x + 1 : (f(x) - c) / k : (f(x) + c) / k === x ? x + 1 : (f(x) + c) / k, reason: `Undid the ${sub ? "subtraction" : "addition"} the wrong way.` },
            { value: f(f(x)) > 999 ? x + 2 : f(x) * k, reason: "Ran the machine forwards instead of backwards." },
            { value: Math.round(f(x) / k), reason: `Only divided by ${k} - undo the ${sub ? "subtraction" : "addition"} first.` },
          ].filter((w) => Number.isFinite(w.value) && Number.isInteger(w.value)),
          explanation: `Work backwards: ${f(x)} ${sub ? "+" : "−"} ${c} = ${sub ? f(x) + c : f(x) - c}, then ÷ ${k} = ${x}.`,
          hint: "Undo the steps in reverse order.",
        })
      : mcq({
          skillId: "REA.ANA.MACHINE", level: 2,
          prompt: `A machine takes a number, ${desc}. What is the output when the input is ${x}?`,
          answer: f(x),
          wrong: [
            { value: sub ? k * (x - c) : k * (x + c), reason: `${sub ? "Subtracted" : "Added"} before multiplying - the order matters.` },
            { value: sub ? k * x + c : k * x - c, reason: `${sub ? "Added" : "Subtracted"} instead of ${sub ? "subtracting" : "adding"}.` },
            { value: f(x) + k, reason: "Arithmetic slip." },
          ],
          explanation: `${x} × ${k} = ${k * x}, then ${sub ? "−" : "+"} ${c} = ${f(x)}.`,
          hint: "Follow the steps in order.",
        });
  }));
  const DS_OPTIONS = [
    "Statement 1 alone is sufficient",
    "Statement 2 alone is sufficient",
    "Either statement alone is sufficient",
    "Both statements together are needed",
    "Both statements together are not sufficient",
  ];
  const ds = (level, question, s1, s2, answer, why) =>
    mcq({
      skillId: "REA.ANA.SUFFICIENCY", level,
      prompt: `${question}\n(1) ${s1}\n(2) ${s2}\nWhich is true?`,
      answer,
      wrong: shuffle(DS_OPTIONS.filter((o) => o !== answer)).map((o) => ({ value: o, reason: why })),
      explanation: why,
      hint: "Test each statement on its own first, then together.",
      time: 120,
    });
  add(take(12, () => {
    const x = int(3, 20);
    const a = int(2, 7);
    const b = int(1, 20);
    return ds(3, "What is the value of x?", `${a}x + ${b} = ${a * x + b}`, `x is a whole number less than ${x + int(3, 10)}.`, DS_OPTIONS[0], `Statement 1 gives x = ${x} on its own; statement 2 only gives a range.`);
  }));
  add(take(12, () => {
    const [x, y] = [int(10, 40), int(1, 9)];
    return ds(3, "What is the value of x?", `x + y = ${x + y}`, `x − y = ${x - y}`, DS_OPTIONS[3], `Neither equation alone fixes x (each has two unknowns), but together they give x = ${x}.`);
  }));
  add(take(8, () => {
    const k = pick([1, 3, 5, 7, 9]);
    const m = pick([2, 4, 6, 8]);
    return ds(3, `Is the whole number n even?`, `n = ${m} × q for some whole number q.`, `n + ${k} is odd.`, DS_OPTIONS[2], `Each statement alone proves n is even: a multiple of ${m} is even, and if n + ${k} (odd k) is odd then n is even.`);
  }));
  add(take(10, () => {
    const [a, b] = sample(PEOPLE, 2);
    const c = pick(PEOPLE.filter((p) => p !== a && p !== b));
    const k = int(2, 9);
    return ds(3, `How old is ${a}?`, `${a} is ${k} years older than ${b}.`, `${b} is twice as old as ${c}.`, DS_OPTIONS[4], `Even together, no actual age is given - only comparisons.`);
  }));
  add(take(12, () => {
    const girls = pick([12, 18, 24, 27, 36]);
    const pct = pick([30, 40, 45, 60]);
    const total = girls / (pct / 100);
    if (!Number.isInteger(total)) return null;
    return ds(4, "How many students are in the class?", `There are ${girls} girls in the class.`, `Girls make up ${pct}% of the class.`, DS_OPTIONS[3], `Neither alone gives the total, but together: ${girls} ÷ ${pct}% = ${total}.`);
  }));
  add(take(12, () => {
    const pen = pick([10, 12, 15, 20, 25]);
    const n = pick([3, 4, 5]);
    const diff = pick([5, 8, 10]);
    return ds(3, "What is the price of one pen?", `${n} pens cost ₹${n * pen}.`, `A pen costs ₹${diff} more than a pencil.`, DS_OPTIONS[0], `Statement 1 gives ₹${pen} directly; statement 2 needs the pencil's price.`);
  }));
  add(take(12, () => {
    const l = int(5, 20);
    const w = int(3, l);
    return ds(4, "What is the area of the rectangle?", `Its length is ${l} m.`, `Its perimeter is ${2 * (l + w)} m.`, DS_OPTIONS[3], `Length alone isn't enough; with the perimeter, width = ${w} m, so area = ${l * w} sq m.`);
  }));

  // Calendars: exact weekdays from a reference date.
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  add(take(30, () => {
    const y = int(2024, 2031);
    const d1 = new Date(Date.UTC(y, int(0, 11), int(1, 28)));
    const d2 = new Date(d1.getTime() + int(20, 330) * 86_400_000);
    const show = (d) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    const w2 = d2.getUTCDay();
    const days = Math.round((d2 - d1) / 86_400_000);
    const leapIn = (d1.getUTCFullYear() % 4 === 0 && d1.getUTCMonth() <= 1) || (d2.getUTCFullYear() % 4 === 0 && d2.getUTCMonth() >= 2 && d2.getUTCFullYear() !== d1.getUTCFullYear());
    return mcq({
      skillId: "REA.ANA.CLOCKS", level: 4,
      prompt: `If ${show(d1)} is a ${WEEK[d1.getUTCDay()]}, what day of the week is ${show(d2)}?`,
      answer: WEEK[w2],
      wrong: [
        { value: WEEK[(w2 + 6) % 7], reason: leapIn ? "One day short - did you count 29 days for February in the leap year?" : "One day short - count the days carefully (months have 28-31 days)." },
        { value: WEEK[(w2 + 1) % 7], reason: "One day too far - count the days from the day AFTER the given date." },
        { value: WEEK[(w2 + 2) % 7], reason: "Two days out - recheck the number of days in each month." },
      ],
      explanation: `From ${show(d1)} to ${show(d2)} is ${days} days. ${days} ÷ 7 leaves ${days % 7}, so move ${days % 7} day${days % 7 === 1 ? "" : "s"} on from ${WEEK[d1.getUTCDay()]}: ${WEEK[w2]}.`,
      hint: "Count the days between the dates, then use the remainder after dividing by 7.",
      time: 120,
    });
  }));
  add(take(14, () => {
    const mins = pick([10, 15, 20, 25, 30, 40, 45, 50]);
    const hours = int(1, 5);
    const total = hours * 60 + mins;
    return mcq({
      skillId: "REA.ANA.CLOCKS", level: 3,
      prompt: `Through how many degrees does the hour hand of a clock turn in ${hours} hour${hours > 1 ? "s" : ""} ${mins} minutes?`,
      answer: `${total / 2}°`,
      wrong: [
        { value: `${total * 6}°`, reason: "That's how far the MINUTE hand turns (6° per minute)." },
        { value: `${hours * 30}°`, reason: `Forgot the extra ${mins} minutes (½° per minute).` },
        { value: `${hours * 30 + mins}°`, reason: "The hour hand moves ½° per minute, not 1°." },
      ],
      explanation: `The hour hand turns 30° per hour = ½° per minute. ${total} minutes × ½ = ${total / 2}°.`,
      hint: "360° in 12 hours → 30° per hour.",
    });
  }));

  return Q;
}
