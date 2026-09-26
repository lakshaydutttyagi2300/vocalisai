// Original, computer-generated starter questions for Numerical Aptitude
// (QNT) and parts of Logical Reasoning (REA). Every answer is COMPUTED from
// the question's own numbers, and every wrong option is a specific common
// mistake with its reason recorded (distractor reasons), so a drill can say
// WHY an answer was wrong. Deterministic: a fixed seed gives the same bank.

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 20260926;
let R = rng(SEED);
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const lcm = (a, b) => (a * b) / gcd(a, b);
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
const rupees = (n) => `₹${fmt(n)}`;

// Builds one MCQ. `wrong` = [{ value, reason }]; duplicates of the answer or
// each other are dropped, and it needs at least 2 real distractors.
function mcq({ skillId, level, prompt, answer, wrong, explanation, hint, time }) {
  const seen = new Set([answer]);
  const distractors = [];
  const add = (w) => {
    // No duplicates, and no negative numbers unless the answer is negative.
    if (seen.has(w.value) || (/^-/.test(w.value) && !/^-/.test(answer))) return;
    seen.add(w.value);
    distractors.push(w);
  };
  for (const w of wrong) add(w);
  // Top up to three wrong options with a near miss of a numeric answer.
  const num = answer.match(/^(₹?)(\d+(?:\.\d+)?)(.*)$/);
  for (const step of [1, -1, 2, 10]) {
    if (distractors.length >= 3 || !num) break;
    const v = Number(num[2]) + step;
    if (v > 0) add({ value: `${num[1]}${fmt(v)}${num[3]}`, reason: "A near miss - recheck each step of the working." });
  }
  if (distractors.length < 2) return null;
  const opts = distractors.slice(0, 3);
  return {
    skillId,
    level,
    prompt,
    options: shuffle([answer, ...opts.map((d) => d.value)]),
    correctAnswer: answer,
    explanation,
    hint,
    distractorReasons: Object.fromEntries(opts.map((d) => [d.value, d.reason])),
    timeLimitSeconds: time ?? 60 + level * 15,
  };
}

function take(n, factory) {
  const out = [];
  const prompts = new Set();
  for (let i = 0; i < n * 20 && out.length < n; i++) {
    const q = factory(i);
    if (!q || prompts.has(q.prompt)) continue;
    prompts.add(q.prompt);
    out.push(q);
  }
  return out;
}

// ---------------------------------------------------------------- QNT ----

const percent = () => [
  ...take(3, () => {
    const p = pick([10, 20, 25, 50, 75]);
    const n = pick([80, 120, 160, 240, 360, 480, 640]);
    const ans = (p * n) / 100;
    return mcq({
      skillId: "QNT.COM.PERCENT", level: 2,
      prompt: `What is ${p}% of ${n}?`,
      answer: fmt(ans),
      wrong: [
        { value: fmt((p * n) / 10), reason: "Divided by 10 instead of 100." },
        { value: fmt(n - ans), reason: "Gave the remaining part, not the percentage asked for." },
        { value: fmt(ans + p), reason: "Added the percentage figure instead of multiplying." },
      ],
      explanation: `${p}% of ${n} = ${p}/100 × ${n} = ${fmt(ans)}.`,
      hint: "Percent means 'out of 100': multiply by the percentage, then divide by 100.",
    });
  }),
  ...take(3, () => {
    const b = pick([40, 50, 80, 120, 200, 250]);
    const pct = pick([15, 20, 25, 30, 40, 60, 75]);
    const a = (b * pct) / 100;
    if (!Number.isInteger(a)) return null;
    return mcq({
      skillId: "QNT.COM.PERCENT", level: 3,
      prompt: `${a} is what percent of ${b}?`,
      answer: `${pct}%`,
      wrong: [
        { value: `${fmt(100 - pct)}%`, reason: "Worked out the percentage of the remainder instead." },
        { value: `${fmt((b / a) * 100)}%`, reason: "Divided the wrong way round (whole ÷ part)." },
        { value: `${fmt(pct / 10)}%`, reason: "Missed a factor of 10 when converting to a percentage." },
      ],
      explanation: `${a} ÷ ${b} × 100 = ${pct}%.`,
      hint: "Part ÷ whole × 100.",
    });
  }),
  ...take(2, () => {
    const x = pick([80, 120, 160, 200, 240, 400]);
    const inc = pick([15, 20, 25, 30, 40]);
    const y = (x * (100 + inc)) / 100;
    if (!Number.isInteger(y)) return null;
    return mcq({
      skillId: "QNT.COM.PERCENT", level: 4,
      prompt: `The price of a headset rises from ₹${x} to ₹${y}. What is the percentage increase?`,
      answer: `${inc}%`,
      wrong: [
        { value: `${fmt(((y - x) / y) * 100)}%`, reason: "Divided the increase by the NEW price instead of the original." },
        { value: `${fmt(y - x)}%`, reason: "Gave the rupee increase, not the percentage." },
        { value: `${inc + 5}%`, reason: "Arithmetic slip - recheck (increase ÷ original) × 100." },
      ],
      explanation: `Increase = ${y - x}. ${y - x} ÷ ${x} × 100 = ${inc}%.`,
      hint: "Percentage change is always measured against the original value.",
    });
  }),
  ...take(2, () => {
    const a = pick([10, 20, 30]);
    const net = (a * a) / 100;
    return mcq({
      skillId: "QNT.COM.PERCENT", level: 5,
      prompt: `A salary is increased by ${a}% and the new salary is then reduced by ${a}%. What is the overall change?`,
      answer: `${fmt(net)}% decrease`,
      wrong: [
        { value: "No change", reason: "Assumed an increase and a decrease of the same % cancel out - they apply to different bases." },
        { value: `${fmt(net)}% increase`, reason: "Right size, wrong direction: the decrease applies to a bigger number." },
        { value: `${fmt(a / 10)}% decrease`, reason: "Used a/10 instead of a²/100." },
      ],
      explanation: `(1 + ${a}/100) × (1 − ${a}/100) = 1 − (${a}/100)² → a ${fmt(net)}% decrease overall.`,
      hint: "Try it with 100: increase, then decrease the new amount.",
    });
  }),
];

const profitLoss = () => [
  ...take(4, () => {
    const cp = pick([200, 250, 400, 500, 800]);
    const pr = pick([10, 20, 25, -10, -20]);
    const sp = (cp * (100 + pr)) / 100;
    const word = pr > 0 ? "profit" : "loss";
    const other = pr > 0 ? "loss" : "profit";
    return mcq({
      skillId: "QNT.COM.PROFITLOSS", level: 2,
      prompt: `A trader buys a lamp for ₹${cp} and sells it for ₹${sp}. What is the ${pr > 0 ? "profit" : "loss"} percentage?`,
      answer: `${Math.abs(pr)}% ${word}`,
      wrong: [
        { value: `${fmt(Math.abs(((sp - cp) / sp) * 100))}% ${word}`, reason: "Calculated on the selling price - profit/loss % is on the cost price." },
        { value: `${Math.abs(pr)}% ${other}`, reason: "Right size, wrong direction: compare selling price with cost price." },
        { value: `${Math.abs(sp - cp)}% ${word}`, reason: "Gave the rupee amount as a percentage." },
      ],
      explanation: `${word[0].toUpperCase() + word.slice(1)} = ₹${Math.abs(sp - cp)}. ${Math.abs(sp - cp)} ÷ ${cp} × 100 = ${Math.abs(pr)}%.`,
      hint: "Profit or loss % = (difference ÷ cost price) × 100.",
    });
  }),
  ...take(3, () => {
    const cp = pick([200, 400, 500, 600, 800, 1000]);
    const p = pick([10, 20, 25, 50]);
    const sp = (cp * (100 + p)) / 100;
    return mcq({
      skillId: "QNT.COM.PROFITLOSS", level: 3,
      prompt: `A phone cover is sold for ₹${sp} at a profit of ${p}%. What was its cost price?`,
      answer: rupees(cp),
      wrong: [
        { value: rupees((sp * (100 - p)) / 100), reason: `Took ${p}% off the selling price - the profit % is on the cost price.` },
        { value: rupees((sp * (100 + p)) / 100), reason: "Added the profit again instead of removing it." },
        { value: rupees(sp - p), reason: "Subtracted the percentage figure as if it were rupees." },
      ],
      explanation: `SP = CP × (100 + ${p})/100, so CP = ${sp} × 100/${100 + p} = ₹${cp}.`,
      hint: "Selling price = cost price × (100 + profit%)/100. Work backwards.",
    });
  }),
  ...take(3, () => {
    const [m, d] = pick([[20, 10], [25, 20], [40, 20], [50, 20], [40, 10], [50, 10]]);
    const net = ((100 + m) * (100 - d)) / 100 - 100;
    return mcq({
      skillId: "QNT.COM.PROFITLOSS", level: 4,
      prompt: `A shopkeeper marks goods ${m}% above cost price and then gives a ${d}% discount on the marked price. What is the profit percentage?`,
      answer: net === 0 ? "No profit, no loss" : `${fmt(net)}%`,
      wrong: [
        { value: `${m - d}%`, reason: "Subtracted the percentages - the discount applies to the marked price, not the cost." },
        { value: `${m}%`, reason: "Ignored the discount." },
        { value: `${fmt(net + 2)}%`, reason: "Arithmetic slip - try it with a cost price of 100." },
      ],
      explanation: `With cost 100: marked = ${100 + m}, after ${d}% off = ${fmt(((100 + m) * (100 - d)) / 100)}, so profit = ${fmt(net)}%.`,
      hint: "Assume the cost price is ₹100.",
    });
  }),
];

const ratio = () => [
  ...take(4, () => {
    const [a, b] = pick([[2, 3], [3, 5], [1, 4], [4, 5], [3, 7], [5, 3]]);
    const t = (a + b) * pick([60, 80, 100, 120, 150]);
    return mcq({
      skillId: "QNT.COM.RATIO", level: 2,
      prompt: `₹${t} is shared between Anu and Bala in the ratio ${a}:${b}. How much does Anu get?`,
      answer: rupees((t * a) / (a + b)),
      wrong: [
        { value: rupees((t * b) / (a + b)), reason: "Gave Bala's share instead of Anu's." },
        { value: rupees(t / a), reason: "Divided by Anu's part alone instead of the total parts." },
        { value: rupees((t * a) / b), reason: "Divided by Bala's part instead of the total number of parts." },
      ],
      explanation: `Total parts = ${a + b}. One part = ${t} ÷ ${a + b} = ${t / (a + b)}. Anu = ${a} × ${t / (a + b)} = ₹${(t * a) / (a + b)}.`,
      hint: "Add the ratio parts first.",
    });
  }),
  ...take(3, () => {
    const [a, b, c, d] = pick([[2, 3, 4, 5], [3, 4, 2, 5], [1, 2, 3, 4], [5, 6, 3, 2], [4, 3, 6, 5]]);
    const x = a * c;
    const y = b * d;
    const g = gcd(x, y);
    return mcq({
      skillId: "QNT.COM.RATIO", level: 3,
      prompt: `If A:B = ${a}:${b} and B:C = ${c}:${d}, what is A:C?`,
      answer: `${x / g}:${y / g}`,
      wrong: [
        { value: `${a}:${d}`, reason: "Linked the ratios without making B the same in both." },
        { value: `${a + c}:${b + d}`, reason: "Added the ratios - they must be multiplied." },
        { value: `${y / g}:${x / g}`, reason: "Right numbers, but upside down." },
      ],
      explanation: `A/C = (A/B) × (B/C) = ${a}/${b} × ${c}/${d} = ${x}/${y} = ${x / g}:${y / g}.`,
      hint: "Multiply A/B by B/C - the Bs cancel.",
    });
  }),
];

const averages = () => [
  ...take(3, () => {
    const nums = Array.from({ length: 5 }, () => 10 + Math.floor(R() * 40));
    const sum = nums.reduce((s, n) => s + n, 0);
    if (sum % 5 !== 0) return null;
    const sorted = [...nums].sort((x, y) => x - y);
    return mcq({
      skillId: "QNT.COM.AVERAGES", level: 2,
      prompt: `What is the average of ${nums.join(", ")}?`,
      answer: fmt(sum / 5),
      wrong: [
        { value: fmt(sum), reason: "Gave the total without dividing by how many numbers there are." },
        { value: fmt(sorted[2]), reason: "Gave the middle value (median), not the average." },
        { value: fmt((nums[0] + nums[4]) / 2), reason: "Averaged only the first and last numbers." },
      ],
      explanation: `Sum = ${sum}. ${sum} ÷ 5 = ${fmt(sum / 5)}.`,
      hint: "Average = total ÷ number of values.",
    });
  }),
  ...take(4, () => {
    const x = pick([20, 24, 30, 36, 40]);
    const y = pick([18, 22, 25, 28, 32, 35]);
    const removed = 5 * x - 4 * y;
    if (removed <= 0 || y === x) return null;
    return mcq({
      skillId: "QNT.COM.AVERAGES", level: 3,
      prompt: `The average of five numbers is ${x}. When one number is removed, the average of the remaining four is ${y}. Which number was removed?`,
      answer: fmt(removed),
      wrong: [
        { value: fmt(Math.abs(x - y)), reason: "Subtracted the averages - you need to compare the totals." },
        { value: fmt(5 * x - 5 * y), reason: "Used five numbers for the second total instead of four." },
        { value: fmt(4 * y - x), reason: "Mixed up the two totals." },
      ],
      explanation: `Total of five = ${5 * x}. Total of four = ${4 * y}. Removed = ${5 * x} − ${4 * y} = ${removed}.`,
      hint: "Turn each average back into a total.",
    });
  }),
  ...take(3, () => {
    const [n1, a1, n2, a2] = pick([[20, 60, 30, 70], [10, 50, 40, 75], [30, 80, 20, 55], [25, 64, 25, 72], [40, 45, 10, 70]]);
    const avg = (n1 * a1 + n2 * a2) / (n1 + n2);
    return mcq({
      skillId: "QNT.COM.AVERAGES", level: 4,
      prompt: `Team A has ${n1} agents with an average quality score of ${a1}. Team B has ${n2} agents averaging ${a2}. What is the average score of all ${n1 + n2} agents?`,
      answer: fmt(avg),
      wrong: [
        { value: fmt((a1 + a2) / 2), reason: "Averaged the two averages without weighting by team size." },
        { value: fmt(n1 * a1 + n2 * a2), reason: "Gave the combined total, not the average." },
        { value: fmt(avg + 1.5), reason: "Arithmetic slip - recheck the weighted total." },
      ],
      explanation: `(${n1}×${a1} + ${n2}×${a2}) ÷ ${n1 + n2} = ${n1 * a1 + n2 * a2} ÷ ${n1 + n2} = ${fmt(avg)}.`,
      hint: "Weight each average by its team size.",
    });
  }),
];

const interest = () => [
  ...take(4, () => {
    const p = pick([2000, 5000, 8000, 10000, 12000]);
    const r = pick([5, 8, 10, 12]);
    const t = pick([2, 3, 4]);
    const si = (p * r * t) / 100;
    return mcq({
      skillId: "QNT.COM.INTEREST", level: 3,
      prompt: `What is the simple interest on ₹${p} at ${r}% per year for ${t} years?`,
      answer: rupees(si),
      wrong: [
        { value: rupees((p * r) / 100), reason: "Calculated one year's interest only." },
        { value: rupees(p + si), reason: "Gave the total amount (principal + interest), not the interest." },
        { value: rupees(p * Math.pow(1 + r / 100, t) - p), reason: "Used compound interest - the question asks for simple interest." },
      ],
      explanation: `SI = P × R × T / 100 = ${p} × ${r} × ${t} / 100 = ₹${fmt(si)}.`,
      hint: "Simple interest = principal × rate × time ÷ 100.",
    });
  }),
  ...take(3, () => {
    const p = pick([5000, 8000, 10000, 20000]);
    const r = pick([5, 10, 20]);
    const ci = p * Math.pow(1 + r / 100, 2) - p;
    return mcq({
      skillId: "QNT.COM.INTEREST", level: 4,
      prompt: `What is the compound interest on ₹${p} at ${r}% per year for 2 years, compounded yearly?`,
      answer: rupees(ci),
      wrong: [
        { value: rupees((2 * p * r) / 100), reason: "Used simple interest - compound interest also earns interest on the first year's interest." },
        { value: rupees(p + ci), reason: "Gave the final amount, not the interest." },
        { value: rupees((p * r) / 100), reason: "Calculated only the first year." },
      ],
      explanation: `Amount = ${p} × (1 + ${r}/100)² = ₹${fmt(p + ci)}. Interest = ₹${fmt(ci)}.`,
      hint: "Amount = P × (1 + r/100)ⁿ; interest = amount − P.",
    });
  }),
  ...take(2, () => {
    const p = pick([5000, 10000, 20000]);
    const r = pick([5, 10]);
    const diff = (p * r * r) / 10000;
    return mcq({
      skillId: "QNT.COM.INTEREST", level: 5,
      prompt: `What is the difference between compound interest and simple interest on ₹${p} at ${r}% per year for 2 years?`,
      answer: rupees(diff),
      wrong: [
        { value: rupees((p * r) / 100), reason: "Gave one year's interest, not the difference." },
        { value: rupees(0), reason: "Assumed they are equal - they differ from the second year on." },
        { value: rupees(diff * 2), reason: "Doubled the difference - over 2 years it is P × (r/100)²." },
      ],
      explanation: `For 2 years, CI − SI = P × (r/100)² = ${p} × (${r}/100)² = ₹${fmt(diff)}.`,
      hint: "The difference is the interest earned on the first year's interest.",
    });
  }),
];

const work = () => [
  ...take(5, () => {
    const [a, b] = pick([[10, 15], [12, 24], [20, 30], [6, 12], [15, 30], [12, 18], [9, 18], [8, 24]]);
    const t = (a * b) / (a + b);
    return mcq({
      skillId: "QNT.TIM.WORK", level: 3,
      prompt: `Asha can finish a task in ${a} days and Bilal can finish it in ${b} days. How many days will they take working together?`,
      answer: `${fmt(t)} days`,
      wrong: [
        { value: `${fmt((a + b) / 2)} days`, reason: "Averaged the days - together they work faster than either alone." },
        { value: `${a + b} days`, reason: "Added the days - working together should take LESS time." },
        { value: `${fmt(t + 1)} days`, reason: "Arithmetic slip - add their daily rates: 1/a + 1/b." },
      ],
      explanation: `Daily work = 1/${a} + 1/${b} = ${a + b}/${a * b}. Time = ${a * b}/${a + b} = ${fmt(t)} days.`,
      hint: "Add the fractions of work each does in one day.",
    });
  }),
  ...take(4, () => {
    const [a, t] = pick([[12, 8], [15, 10], [20, 12], [10, 6], [30, 20], [24, 16]]);
    const b = (a * t) / (a - t);
    return mcq({
      skillId: "QNT.TIM.WORK", level: 4,
      prompt: `Asha and Bilal together finish a task in ${t} days. Asha alone takes ${a} days. How long would Bilal take alone?`,
      answer: `${fmt(b)} days`,
      wrong: [
        { value: `${a - t} days`, reason: "Subtracted the days - subtract the daily RATES instead." },
        { value: `${a + t} days`, reason: "Added the days." },
        { value: `${2 * t} days`, reason: "Assumed both work at the same speed." },
      ],
      explanation: `Bilal's daily rate = 1/${t} − 1/${a} = ${a - t}/${a * t}, so he takes ${a * t}/${a - t} = ${fmt(b)} days.`,
      hint: "Bilal's rate = combined rate − Asha's rate.",
    });
  }),
];

const tsd = () => [
  ...take(3, () => {
    const v = pick([18, 36, 54, 72, 90, 108]);
    return mcq({
      skillId: "QNT.TIM.TSD", level: 2,
      prompt: `Convert ${v} km/h into metres per second.`,
      answer: `${fmt((v * 5) / 18)} m/s`,
      wrong: [
        { value: `${fmt((v * 18) / 5)} m/s`, reason: "Multiplied by 18/5 - that converts m/s to km/h." },
        { value: `${fmt(v / 60)} m/s`, reason: "Divided by 60 only - an hour has 3,600 seconds." },
        { value: `${fmt(v * 1000)} m/s`, reason: "Converted km to m but forgot to convert hours to seconds." },
      ],
      explanation: `${v} × 1000 ÷ 3600 = ${v} × 5/18 = ${fmt((v * 5) / 18)} m/s.`,
      hint: "Multiply km/h by 5/18.",
    });
  }),
  ...take(4, () => {
    const [len, v] = pick([[150, 54], [200, 72], [120, 36], [300, 90], [180, 54], [250, 90], [240, 72]]);
    const secs = len / ((v * 5) / 18);
    return mcq({
      skillId: "QNT.TIM.TSD", level: 3,
      prompt: `A train ${len} m long runs at ${v} km/h. How long does it take to pass a signal pole?`,
      answer: `${fmt(secs)} seconds`,
      wrong: [
        { value: `${fmt(len / v)} seconds`, reason: "Forgot to convert km/h into m/s first." },
        { value: `${fmt(secs * 2)} seconds`, reason: "Doubled the distance - passing a pole only needs the train's own length." },
        { value: `${fmt(len / ((v * 18) / 5))} seconds`, reason: "Converted the speed the wrong way (×18/5 instead of ×5/18)." },
      ],
      explanation: `Speed = ${v} × 5/18 = ${fmt((v * 5) / 18)} m/s. Time = ${len} ÷ ${fmt((v * 5) / 18)} = ${fmt(secs)} s.`,
      hint: "To pass a pole, a train covers its own length.",
    });
  }),
  ...take(3, () => {
    const [a, b] = pick([[40, 60], [30, 60], [20, 30], [60, 90], [45, 90]]);
    const avg = (2 * a * b) / (a + b);
    return mcq({
      skillId: "QNT.TIM.TSD", level: 4,
      prompt: `A courier rides to a customer at ${a} km/h and returns by the same route at ${b} km/h. What is the average speed for the whole trip?`,
      answer: `${fmt(avg)} km/h`,
      wrong: [
        { value: `${fmt((a + b) / 2)} km/h`, reason: "Averaged the speeds - more time is spent at the slower speed." },
        { value: `${a + b} km/h`, reason: "Added the speeds." },
        { value: `${fmt(avg - 2)} km/h`, reason: "Arithmetic slip - use 2ab/(a + b)." },
      ],
      explanation: `Equal distances: average speed = 2ab/(a + b) = 2×${a}×${b}/${a + b} = ${fmt(avg)} km/h.`,
      hint: "Average speed = total distance ÷ total time, not the average of the speeds.",
    });
  }),
];

const lcmHcf = () => [
  ...take(5, () => {
    const [a, b] = pick([[12, 18], [8, 12], [15, 20], [16, 24], [9, 12], [14, 21], [10, 25], [18, 24]]);
    const askL = R() < 0.5;
    const L = lcm(a, b);
    const H = gcd(a, b);
    return mcq({
      skillId: "QNT.ARI.LCMHCF", level: 2,
      prompt: `What is the ${askL ? "LCM (lowest common multiple)" : "HCF (highest common factor)"} of ${a} and ${b}?`,
      answer: fmt(askL ? L : H),
      wrong: [
        { value: fmt(askL ? H : L), reason: askL ? "Gave the HCF instead of the LCM." : "Gave the LCM instead of the HCF." },
        { value: fmt(a * b), reason: "Multiplied the numbers - that is only the LCM when they share no factors." },
        { value: fmt(a + b), reason: "Added the numbers." },
      ],
      explanation: askL ? `Multiples of ${a} and ${b} first meet at ${L}.` : `The largest number dividing both ${a} and ${b} is ${H}.`,
      hint: "HCF divides both numbers; LCM is divisible by both.",
    });
  }),
  ...take(4, () => {
    const [a, b] = pick([[12, 18], [15, 20], [20, 30], [8, 12], [10, 15], [12, 16]]);
    const L = lcm(a, b);
    const toTime = (m) => {
      const h24 = 9 + Math.floor(m / 60);
      return `${((h24 + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${h24 % 24 < 12 ? "a.m." : "p.m."}`;
    };
    return mcq({
      skillId: "QNT.ARI.LCMHCF", level: 3,
      prompt: `Two reminder alarms ring every ${a} and ${b} minutes. They ring together at 9:00 a.m. When will they next ring together?`,
      answer: toTime(L),
      wrong: [
        { value: toTime(a + b), reason: "Added the intervals - they meet at the LCM." },
        { value: toTime(a * b), reason: "Multiplied the intervals - the LCM is usually smaller." },
        { value: toTime(gcd(a, b)), reason: "Used the HCF - that is too early for both to ring." },
      ],
      explanation: `The LCM of ${a} and ${b} is ${L}, so they next ring together ${L} minutes after 9:00 a.m., at ${toTime(L)}`,
      hint: "They ring together at common multiples of both intervals.",
    });
  }),
];

const discount = () => [
  ...take(3, () => {
    const m = pick([400, 500, 800, 1200, 1500, 2000]);
    const d = pick([10, 15, 20, 25, 30]);
    const sp = (m * (100 - d)) / 100;
    return mcq({
      skillId: "QNT.COM.DISCOUNT", level: 2,
      prompt: `A jacket is marked at ₹${m} with a ${d}% discount. What is the selling price?`,
      answer: rupees(sp),
      wrong: [
        { value: rupees((m * d) / 100), reason: "Gave the discount amount, not the price after discount." },
        { value: rupees(m + (m * d) / 100), reason: "Added the discount instead of subtracting it." },
        { value: rupees(m - d), reason: "Subtracted the percentage figure as if it were rupees." },
      ],
      explanation: `Discount = ${d}% of ${m} = ₹${(m * d) / 100}. Selling price = ${m} − ${(m * d) / 100} = ₹${sp}.`,
      hint: "Selling price = marked price × (100 − discount%)/100.",
    });
  }),
  ...take(3, () => {
    const m = pick([500, 800, 1000, 1200, 1600]);
    const d = pick([20, 25, 40]);
    const s = (m * (100 - d)) / 100;
    return mcq({
      skillId: "QNT.COM.DISCOUNT", level: 3,
      prompt: `After a ${d}% discount, a shirt costs ₹${s}. What was its marked price?`,
      answer: rupees(m),
      wrong: [
        { value: rupees((s * (100 + d)) / 100), reason: `Added ${d}% to the sale price - the discount was taken from the (larger) marked price.` },
        { value: rupees(s + d), reason: "Added the percentage figure as rupees." },
        { value: rupees((s * 100) / (100 + d)), reason: "Divided by (100 + d) instead of (100 − d)." },
      ],
      explanation: `Sale price = marked × ${100 - d}/100, so marked = ${s} × 100/${100 - d} = ₹${m}.`,
      hint: "Work backwards: divide by (100 − discount%)/100.",
    });
  }),
  ...take(3, () => {
    const [d1, d2] = pick([[10, 10], [20, 10], [20, 20], [25, 20], [30, 10]]);
    const single = d1 + d2 - (d1 * d2) / 100;
    return mcq({
      skillId: "QNT.COM.DISCOUNT", level: 4,
      prompt: `A shop offers ${d1}% off, then a further ${d2}% off the reduced price. What single discount is this equal to?`,
      answer: `${fmt(single)}%`,
      wrong: [
        { value: `${d1 + d2}%`, reason: "Added the discounts - the second one applies to a smaller price." },
        { value: `${fmt((d1 * d2) / 100)}%`, reason: "Multiplied the discounts." },
        { value: `${fmt(single + 3)}%`, reason: "Arithmetic slip - try it with a price of 100." },
      ],
      explanation: `On ₹100: after ${d1}% → ${100 - d1}; after ${d2}% more → ${fmt(((100 - d1) * (100 - d2)) / 100)}. Total discount = ${fmt(single)}%.`,
      hint: "Successive discounts: d1 + d2 − d1×d2/100.",
    });
  }),
];

// ---------------------------------------------------------------- REA ----

const numberSeries = () =>
  take(10, (i) => {
    const kind = i % 5;
    let seq;
    let next;
    let rule;
    let level;
    if (kind === 0) {
      const a = 2 + Math.floor(R() * 10);
      const d = 3 + Math.floor(R() * 8);
      seq = [0, 1, 2, 3, 4].map((k) => a + k * d);
      next = a + 5 * d;
      rule = `add ${d} each time`;
      level = 1;
    } else if (kind === 1) {
      const a = pick([2, 3, 5]);
      const r = pick([2, 3]);
      seq = [0, 1, 2, 3, 4].map((k) => a * r ** k);
      next = a * r ** 5;
      rule = `multiply by ${r} each time`;
      level = 2;
    } else if (kind === 2) {
      const s = 2 + Math.floor(R() * 4);
      seq = [0, 1, 2, 3, 4].map((k) => (s + k) ** 2);
      next = (s + 5) ** 2;
      rule = `squares of ${s}, ${s + 1}, ${s + 2}, ...`;
      level = 3;
    } else if (kind === 3) {
      const a = 3 + Math.floor(R() * 6);
      const d = 1 + Math.floor(R() * 3);
      seq = [a];
      for (let k = 1; k < 5; k++) seq.push(seq[k - 1] + d * k);
      next = seq[4] + d * 5;
      rule = `add ${d}, ${2 * d}, ${3 * d}, ... (the gap grows by ${d})`;
      level = 3;
    } else {
      const s = 2 + Math.floor(R() * 3);
      seq = [0, 1, 2, 3, 4].map((k) => (s + k) ** 3 - 1);
      next = (s + 5) ** 3 - 1;
      rule = `cubes minus 1: ${s}³ − 1, ${s + 1}³ − 1, ...`;
      level = 5;
    }
    const gap = seq[4] - seq[3];
    return mcq({
      skillId: "REA.SER.NUM", level,
      prompt: `What comes next in the series? ${seq.join(", ")}, ?`,
      answer: String(next),
      wrong: [
        { value: String(seq[4] + gap), reason: "Repeated the last gap - check whether the gaps themselves change." },
        { value: String(next + 1), reason: "Off by one - recheck the rule on every step." },
        { value: String(next - 2), reason: "Close, but the rule doesn't fit all the terms." },
      ],
      explanation: `Rule: ${rule}. So the next term is ${next}.`,
      hint: "Write the differences between terms under the series.",
      time: 60,
    });
  });

const letterSeries = () =>
  take(8, (i) => {
    const L = (n) => String.fromCharCode(65 + n);
    const start = Math.floor(R() * 4);
    let idx;
    let rule;
    let level;
    if (i % 2 === 0) {
      const d = 2 + Math.floor(R() * 2);
      idx = [0, 1, 2, 3, 4].map((k) => start + k * d);
      rule = `skip ${d - 1} letter${d - 1 === 1 ? "" : "s"} each time (+${d})`;
      level = 2;
    } else {
      idx = [start];
      for (let k = 1; k < 5; k++) idx.push(idx[k - 1] + k);
      rule = "the gap grows by one each time (+1, +2, +3, ...)";
      level = 3;
    }
    const nextIdx = i % 2 === 0 ? idx[4] + (idx[4] - idx[3]) : idx[4] + 5;
    if (nextIdx > 25) return null;
    return mcq({
      skillId: "REA.SER.LETTER", level,
      prompt: `What comes next? ${idx.map(L).join(", ")}, ?`,
      answer: L(nextIdx),
      wrong: [
        { value: L(nextIdx - 1), reason: "One letter short - count the gap carefully." },
        { value: nextIdx + 1 <= 25 ? L(nextIdx + 1) : L(nextIdx - 2), reason: "One letter too far - count the gap carefully." },
        { value: L(idx[4] + 1), reason: "Just took the next letter in the alphabet." },
      ],
      explanation: `Rule: ${rule}. Next letter = ${L(nextIdx)}.`,
      hint: "Convert letters to positions (A=1, B=2, ...).",
      time: 60,
    });
  });

const coding = () => {
  const words = ["CAT", "DOG", "SUN", "BOOK", "CALL", "TEAM", "DATA", "HELP", "MAIL", "DESK", "FILE", "PLAN"];
  const shift = (w, k) => [...w].map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + k + 26) % 26) + 65)).join("");
  return take(10, (i) => {
    const [w1, w2] = shuffle(words).slice(0, 2);
    let k;
    let rev = false;
    let level;
    if (i % 3 === 0) {
      k = 1;
      level = 2;
    } else if (i % 3 === 1) {
      k = -pick([1, 2]);
      level = 3;
    } else {
      k = pick([1, 2]);
      rev = true;
      level = 4;
    }
    const enc = (w) => shift(rev ? [...w].reverse().join("") : w, k);
    const desc = `${rev ? "reverse the word, then " : ""}move each letter ${Math.abs(k)} place${Math.abs(k) === 1 ? "" : "s"} ${k > 0 ? "forward" : "back"} in the alphabet`;
    return mcq({
      skillId: "REA.COD.CODING", level,
      prompt: `In a certain code, ${w1} is written as ${enc(w1)}. How is ${w2} written in that code?`,
      answer: enc(w2),
      wrong: [
        { value: shift(rev ? [...w2].reverse().join("") : w2, -k), reason: "Shifted the letters in the wrong direction." },
        { value: shift(rev ? [...w2].reverse().join("") : w2, k + (k > 0 ? 1 : -1)), reason: "Shifted by one place too many." },
        { value: rev ? shift(w2, k) : shift([...w2].reverse().join(""), k), reason: rev ? "Forgot to reverse the word first." : "Reversed the word - this code doesn't." },
      ],
      explanation: `The rule is: ${desc}. Applying it to ${w2} gives ${enc(w2)}.`,
      hint: "Compare each letter of the word with its code letter.",
      time: 75,
    });
  });
};

const direction = () => {
  const triples = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]];
  return take(8, (i) => {
    const [a, b, c] = pick(triples);
    if (i % 2 === 0) {
      return mcq({
        skillId: "REA.REL.DIRECTION", level: 2,
        prompt: `Karan walks ${a} km north, turns right and walks ${b} km. How far is he from his starting point?`,
        answer: `${c} km`,
        wrong: [
          { value: `${a + b} km`, reason: "Added the distances walked - the question asks for the straight-line distance." },
          { value: `${Math.abs(b - a)} km`, reason: "Subtracted the distances." },
          { value: `${c + 1} km`, reason: "Recheck with Pythagoras: √(a² + b²)." },
        ],
        explanation: `North then east makes a right angle: √(${a}² + ${b}²) = ${c} km.`,
        hint: "Draw it: the two legs form a right-angled triangle.",
        time: 75,
      });
    }
    const extra = pick([2, 3, 4]);
    const north = a + extra;
    return mcq({
      skillId: "REA.REL.DIRECTION", level: 4,
      prompt: `Meera walks ${north} km north, turns right and walks ${b} km, then turns right again and walks ${extra} km. How far is she from her starting point, and in which direction?`,
      answer: `${c} km, north-east`,
      wrong: [
        { value: `${north + b + extra} km, north-east`, reason: "Added every leg - you need the straight-line distance." },
        { value: `${c} km, south-east`, reason: "Right distance, wrong direction: she is still north of the start." },
        { value: `${b} km, east`, reason: "Ignored that she is still north of her start." },
      ],
      explanation: `Net north = ${north} − ${extra} = ${a} km; east = ${b} km. Distance = √(${a}² + ${b}²) = ${c} km, towards the north-east.`,
      hint: "Work out net north-south and net east-west movement separately.",
      time: 105,
    });
  });
};

const ranking = () =>
  take(8, (i) => {
    if (i % 2 === 0) {
      const t = 5 + Math.floor(R() * 20);
      const b = 5 + Math.floor(R() * 20);
      return mcq({
        skillId: "REA.REL.RANKING", level: 2,
        prompt: `In a row of students, Ravi is ${t}th from the front and ${b}th from the back. How many students are in the row?`,
        answer: String(t + b - 1),
        wrong: [
          { value: String(t + b), reason: "Counted Ravi twice - subtract 1." },
          { value: String(t + b - 2), reason: "Subtracted 2 - Ravi is only counted twice, so subtract 1." },
          { value: String(Math.abs(t - b)), reason: "Subtracted the positions." },
        ],
        explanation: `Total = ${t} + ${b} − 1 = ${t + b - 1} (Ravi is counted in both positions).`,
        hint: "Front position + back position − 1.",
        time: 60,
      });
    }
    const n = 30 + Math.floor(R() * 30);
    const k = 5 + Math.floor(R() * 20);
    return mcq({
      skillId: "REA.REL.RANKING", level: 3,
      prompt: `In a class of ${n} students, Neha ranks ${k}th from the top. What is her rank from the bottom?`,
      answer: String(n - k + 1),
      wrong: [
        { value: String(n - k), reason: "Forgot to add 1 - Neha herself must be counted." },
        { value: String(n - k + 2), reason: "Added one too many." },
        { value: String(n + k), reason: "Added instead of subtracting." },
      ],
      explanation: `Rank from bottom = ${n} − ${k} + 1 = ${n - k + 1}.`,
      hint: "Total − rank from top + 1.",
      time: 60,
    });
  });

const clocksCalendars = () => [
  ...take(5, () => {
    const h = 1 + Math.floor(R() * 11);
    const m = pick([0, 10, 20, 30, 40, 50]);
    let angle = Math.abs(30 * h - 5.5 * m);
    if (angle > 180) angle = 360 - angle;
    return mcq({
      skillId: "REA.ANA.CLOCKS", level: 4,
      prompt: `What is the smaller angle between the hour and minute hands of a clock at ${h}:${String(m).padStart(2, "0")}?`,
      answer: `${fmt(angle)}°`,
      wrong: [
        { value: `${fmt(Math.abs(30 * h - 6 * m) > 180 ? 360 - Math.abs(30 * h - 6 * m) : Math.abs(30 * h - 6 * m))}°`, reason: "Forgot that the hour hand also moves as the minutes pass (½° per minute)." },
        { value: `${fmt(360 - angle)}°`, reason: "Gave the larger (reflex) angle." },
        { value: `${fmt(angle + 5)}°`, reason: "Arithmetic slip - use |30h − 5.5m|." },
      ],
      explanation: `Angle = |30 × ${h} − 5.5 × ${m}| = ${fmt(Math.abs(30 * h - 5.5 * m))}°${Math.abs(30 * h - 5.5 * m) > 180 ? `, and 360 − that = ${fmt(angle)}°` : ""}.`,
      hint: "Hour hand: 30° per hour + 0.5° per minute. Minute hand: 6° per minute.",
      time: 105,
    });
  }),
  ...take(4, () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const d = Math.floor(R() * 7);
    const n = pick([15, 23, 30, 45, 50, 61, 100]);
    return mcq({
      skillId: "REA.ANA.CLOCKS", level: 3,
      prompt: `If today is ${days[d]}, what day of the week will it be ${n} days from today?`,
      answer: days[(d + n) % 7],
      wrong: [
        { value: days[(d + n - 1) % 7], reason: "Counted today as day 1 - start counting from tomorrow." },
        { value: days[(d + n + 1) % 7], reason: "One day too far - recheck the remainder when dividing by 7." },
        { value: days[(d + (n % 5)) % 7], reason: "Used a 5-day week - weeks repeat every 7 days." },
      ],
      explanation: `${n} ÷ 7 leaves a remainder of ${n % 7}, so move ${n % 7} day${n % 7 === 1 ? "" : "s"} on from ${days[d]}: ${days[(d + n) % 7]}.`,
      hint: "Only the remainder after dividing by 7 matters.",
      time: 75,
    });
  }),
];

export function generatedQuestions() {
  R = rng(SEED); // same bank on every call, not just the first
  return [
    ...percent(),
    ...profitLoss(),
    ...ratio(),
    ...averages(),
    ...interest(),
    ...work(),
    ...tsd(),
    ...lcmHcf(),
    ...discount(),
    ...numberSeries(),
    ...letterSeries(),
    ...coding(),
    ...direction(),
    ...ranking(),
    ...clocksCalendars(),
  ].filter(Boolean);
}
