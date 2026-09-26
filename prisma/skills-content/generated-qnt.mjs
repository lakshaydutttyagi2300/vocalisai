// Numerical Aptitude bank, part 2 (large). Computer-generated: every answer
// is computed from the question's own numbers, and every wrong option is a
// specific common mistake with its reason. Covers every QNT skill.
import { factorial, fmt, frac, gcd, makeKit, nCr, par, rupees } from "./gen-kit.mjs";

export function generatedQntQuestions() {
  const { pick, int, mcq, take, sample } = makeKit(9_2026_0926);
  const Q = [];
  const add = (list) => Q.push(...list.filter(Boolean));

  // ------------------------------------------------ Arithmetic
  add(take(14, () => {
    const a = pick([2, 3, 4, 7, 8, 9, 12, 13, 17, 18, 22, 23, 27, 33, 37]);
    const n = int(11, 99);
    let d = 1;
    for (let i = 0; i < n; i++) d = (d * (a % 10)) % 10;
    return mcq({
      skillId: "QNT.ARI.NUMSYS", level: 3,
      prompt: `What is the unit (last) digit of ${a}^${n}?`,
      answer: d,
      wrong: [
        { value: a % 10, reason: "Took the unit digit of the base without applying the power." },
        { value: (a * n) % 10, reason: "Multiplied base by power instead of raising it." },
        { value: (d + 2) % 10, reason: "Off in the cycle - unit digits of powers repeat every 4; use the remainder of the power ÷ 4." },
      ],
      explanation: `Unit digits of powers of ${a % 10} repeat in a cycle of at most 4. ${n} ÷ 4 leaves ${n % 4}${n % 4 === 0 ? " (so use the 4th step of the cycle)" : ""}, giving unit digit ${d}.`,
      hint: "Find the repeating cycle of last digits for small powers.",
    });
  }));
  add(take(12, () => {
    const n = int(12, 150);
    const s = (n * (n + 1)) / 2;
    return mcq({
      skillId: "QNT.ARI.NUMSYS", level: 2,
      prompt: `What is the sum of all whole numbers from 1 to ${n}?`,
      answer: s,
      wrong: [
        { value: n * n, reason: "Used n² instead of n(n + 1)/2." },
        { value: (n * (n - 1)) / 2, reason: "Used n(n − 1)/2 - that stops at n − 1." },
        { value: n * (n + 1), reason: "Forgot to divide by 2." },
      ],
      explanation: `1 + 2 + … + n = n(n + 1)/2 = ${n} × ${n + 1} / 2 = ${s}.`,
      hint: "Pair the first and last numbers.",
    });
  }));
  add(take(12, () => {
    const [p2, p3, p5] = [int(1, 4), int(0, 3), int(0, 2)];
    if (p3 + p5 === 0) return null;
    const N = 2 ** p2 * 3 ** p3 * 5 ** p5;
    const f = (p2 + 1) * (p3 + 1) * (p5 + 1);
    return mcq({
      skillId: "QNT.ARI.NUMSYS", level: 4,
      prompt: `How many factors (divisors) does ${N} have, including 1 and ${N}?`,
      answer: f,
      wrong: [
        { value: p2 + p3 + p5, reason: "Added the powers instead of multiplying (power + 1) terms." },
        { value: Math.max(1, p2 * Math.max(p3, 1) * Math.max(p5, 1)), reason: "Multiplied the powers without adding 1 to each." },
        { value: f - 2, reason: "Left out 1 and the number itself - the question includes them." },
      ],
      explanation: `${N} = ${[`2^${p2}`, p3 ? `3^${p3}` : "", p5 ? `5^${p5}` : ""].filter(Boolean).join(" × ")}. Number of factors = ${[p2 + 1, p3 + 1, p5 + 1].join(" × ")} = ${f}.`,
      hint: "Write the prime factorisation, then multiply (each power + 1).",
    });
  }));
  add(take(12, () => {
    const d = pick([3, 9]);
    let n;
    do n = int(1000, 9999); while (n % d !== 0);
    const [w1, w2, w3] = [n + 1, n + 2, n - 1, n + 4, n - 2, n + 5].filter((x) => x % d !== 0).slice(0, 3);
    if (!w3) return null;
    const ds = (x) => String(x).split("").reduce((s, c) => s + Number(c), 0);
    return mcq({
      skillId: "QNT.ARI.DIVISIBILITY", level: 2,
      prompt: `Which of these numbers is divisible by ${d}?`,
      answer: n,
      wrong: [w1, w2, w3].map((x) => ({ value: x, reason: `Digit sum is ${ds(x)}, which is not a multiple of ${d}.` })),
      explanation: `A number is divisible by ${d} when its digit sum is. ${n}: digit sum ${ds(n)}, a multiple of ${d}.`,
      hint: `Add the digits - the total must be a multiple of ${d}.`,
    });
  }));
  add(take(12, () => {
    const digits = [int(1, 9), int(0, 9), int(0, 9)];
    const pos = int(1, 2);
    const known = digits.reduce((s, x) => s + x, 0);
    const need = (3 - (known % 3)) % 3; // smallest digit making sum a multiple of 3
    const shown = [...digits];
    shown.splice(pos, 0, "*");
    return mcq({
      skillId: "QNT.ARI.DIVISIBILITY", level: 3,
      prompt: `What is the smallest digit that can replace * in ${shown.join("")} so that the number is divisible by 3?`,
      answer: need,
      wrong: [
        { value: need + 3, reason: "Also works, but it isn't the smallest." },
        { value: (need + 1) % 10, reason: "The digit sum would not be a multiple of 3." },
        { value: (need + 2) % 10, reason: "The digit sum would not be a multiple of 3." },
      ],
      explanation: `Known digits add to ${known}. The smallest digit that makes the total a multiple of 3 is ${need} (total ${known + need}).`,
      hint: "Divisible by 3 ⇔ digit sum divisible by 3.",
    });
  }));
  add(take(10, () => {
    let n;
    do n = int(10000, 99999); while (n % 11 !== 0);
    const alt = (x) => String(x).split("").reduce((s, c, i) => s + (i % 2 === 0 ? 1 : -1) * Number(c), 0);
    const wrong = [n + 1, n + 3, n - 2, n + 5].filter((x) => x % 11 !== 0).slice(0, 3);
    return mcq({
      skillId: "QNT.ARI.DIVISIBILITY", level: 4,
      prompt: `Which of these numbers is divisible by 11?`,
      answer: n,
      wrong: wrong.map((x) => ({ value: x, reason: `Alternating digit sum is ${alt(x)}, which is not 0 or a multiple of 11.` })),
      explanation: `Divisible by 11 when the alternating sum of digits (+ − + − …) is 0 or a multiple of 11. For ${n} it is ${alt(n)}.`,
      hint: "Add and subtract the digits alternately.",
    });
  }));

  add(take(14, () => {
    const [a, b, c, d] = [int(1, 5), pick([2, 3, 4, 5, 6, 8]), int(1, 5), pick([3, 4, 6, 8, 10, 12])];
    if (a >= b || c >= d || b === d || gcd(a, b) !== 1 || gcd(c, d) !== 1) return null;
    const p = a * d + c * b;
    const q = b * d;
    const wrongVal = frac(a + c, b + d);
    if (wrongVal === frac(p, q)) return null;
    return mcq({
      skillId: "QNT.ARI.FRACTIONS", level: 2,
      prompt: `What is ${a}/${b} + ${c}/${d}? (Give the simplest form.)`,
      answer: frac(p, q),
      wrong: [
        { value: wrongVal, reason: "Added tops and bottoms separately - you need a common denominator." },
        { value: frac(a * c, b * d), reason: "Multiplied the fractions instead of adding." },
        { value: frac(p + 1, q), reason: "Slip when converting to the common denominator." },
      ],
      explanation: `Common denominator ${q}: ${a * d}/${q} + ${c * b}/${q} = ${p}/${q}${frac(p, q) === `${p}/${q}` ? "" : ` = ${frac(p, q)}`}.`,
      hint: "Rewrite both fractions over the same denominator.",
    });
  }));
  add(take(10, () => {
    const [num, den] = pick([[1, 8], [3, 8], [5, 8], [7, 8], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 20], [3, 20], [7, 20], [9, 25], [3, 16], [5, 16]]);
    const dec = String(num / den);
    const digits = dec.split(".")[1];
    const raw = `${Number(digits)}/${10 ** digits.length}`;
    return mcq({
      skillId: "QNT.ARI.FRACTIONS", level: 2,
      prompt: `Write ${dec} as a fraction in its simplest form.`,
      answer: frac(num, den),
      wrong: [
        { value: raw === frac(num, den) ? frac(num + 1, den) : raw, reason: raw === frac(num, den) ? "Slip when simplifying." : "Not fully simplified - divide top and bottom by their HCF." },
        { value: frac(den, num), reason: "Turned the fraction upside down." },
        { value: frac(num, den * 2), reason: "Halved the value by mistake." },
      ],
      explanation: `${dec} = ${Number(digits)}/${10 ** digits.length} = ${frac(num, den)} after dividing top and bottom by their HCF.`,
      hint: "Write it over 10, 100 or 1000, then simplify.",
    });
  }));
  add(take(12, () => {
    const [n, d] = pick([[2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [3, 8], [5, 8], [7, 10], [2, 7], [5, 9]]);
    const whole = d * int(4, 40);
    const ans = (whole * n) / d;
    return mcq({
      skillId: "QNT.ARI.FRACTIONS", level: 2,
      prompt: `An office has ${whole} employees and ${n}/${d} of them work in customer support. How many work in customer support?`,
      answer: ans,
      wrong: [
        { value: whole - ans, reason: "Gave the number NOT in customer support." },
        { value: whole / d, reason: "Found 1/" + d + " only - multiply by " + n + " too." },
        { value: (whole / d) * (n + 1), reason: "Counted one part too many." },
      ],
      explanation: `${n}/${d} of ${whole} = ${whole} ÷ ${d} × ${n} = ${ans}.`,
      hint: "Divide by the bottom, multiply by the top.",
    });
  }));
  add(take(10, () => {
    const fr = sample([[1, 2], [2, 3], [3, 4], [3, 5], [4, 7], [5, 8], [5, 9], [7, 10], [7, 12], [2, 5], [5, 6], [4, 9]], 4);
    const vals = fr.map(([a, b]) => a / b);
    if (new Set(vals).size < 4) return null;
    const maxI = vals.indexOf(Math.max(...vals));
    const minI = vals.indexOf(Math.min(...vals));
    const askLargest = int(0, 1) === 1;
    const ansI = askLargest ? maxI : minI;
    return mcq({
      skillId: "QNT.ARI.FRACTIONS", level: 3,
      prompt: `Which of these fractions is the ${askLargest ? "largest" : "smallest"}? ${fr.map(([a, b]) => `${a}/${b}`).join(", ")}`,
      answer: `${fr[ansI][0]}/${fr[ansI][1]}`,
      wrong: fr.filter((_, i) => i !== ansI).map(([a, b]) => ({ value: `${a}/${b}`, reason: `${a}/${b} ≈ ${fmt(a / b)} - compare the decimal values.` })),
      explanation: `As decimals: ${fr.map(([a, b]) => `${a}/${b} ≈ ${fmt(a / b)}`).join(", ")}.`,
      hint: "Convert each to a decimal (or a common denominator).",
      keepOrder: false,
    });
  }));

  add(take(14, () => {
    const b = int(2, 9);
    const c = int(2, 9);
    const e = pick([2, 3, 4, 5]);
    const d = e * int(2, 9);
    const a = int(5, 60);
    const ans = a + b * c - d / e;
    const ltr = ((a + b) * c - d) / e;
    return mcq({
      skillId: "QNT.ARI.SIMPLIFY", level: 2,
      prompt: `Simplify: ${a} + ${b} × ${c} − ${d} ÷ ${e}`,
      answer: fmt(ans),
      wrong: [
        { value: fmt(ltr), reason: "Worked left to right - multiplication and division come before addition and subtraction (BODMAS)." },
        { value: fmt(a + b * c - d), reason: `Forgot to divide ${d} by ${e}.` },
        { value: fmt(a + b * (c - d / e)), reason: "Grouped terms that weren't in brackets." },
      ],
      explanation: `× and ÷ first: ${b} × ${c} = ${b * c}, ${d} ÷ ${e} = ${d / e}. Then ${a} + ${b * c} − ${d / e} = ${fmt(ans)}.`,
      hint: "BODMAS: brackets, orders, division/multiplication, addition/subtraction.",
    });
  }));
  add(take(12, () => {
    const a = int(21, 99);
    const b = a - int(2, 12);
    const ans = a * a - b * b;
    return mcq({
      skillId: "QNT.ARI.SIMPLIFY", level: 3,
      prompt: `Find the value of ${a}² − ${b}² (without a calculator).`,
      answer: ans,
      wrong: [
        { value: (a - b) ** 2, reason: "Used (a − b)² - the identity is a² − b² = (a + b)(a − b)." },
        { value: a * a + b * b, reason: "Added the squares instead of subtracting." },
        { value: (a + b) + (a - b), reason: "Added (a + b) and (a − b) instead of multiplying them." },
      ],
      explanation: `a² − b² = (a + b)(a − b) = ${a + b} × ${a - b} = ${ans}.`,
      hint: "Difference of two squares.",
    });
  }));

  add(take(12, () => {
    const base = pick([2, 3, 5, 7]);
    const [a, b, c] = [int(3, 12), int(2, 9), int(1, 6)];
    const ans = a + b - c;
    return mcq({
      skillId: "QNT.ARI.INDICES", level: 3,
      prompt: `If ${base}^${a} × ${base}^${b} ÷ ${base}^${c} = ${base}^x, what is x?`,
      answer: ans,
      wrong: [
        { value: a * b - c, reason: "Multiplied the powers - when multiplying same bases, ADD the powers." },
        { value: a + b + c, reason: "Added the divisor's power - when dividing, SUBTRACT it." },
        { value: a - b + c, reason: "Mixed up which power to add and which to subtract." },
      ],
      explanation: `Same base: add powers when multiplying, subtract when dividing. x = ${a} + ${b} − ${c} = ${ans}.`,
      hint: "aᵐ × aⁿ = aᵐ⁺ⁿ and aᵐ ÷ aⁿ = aᵐ⁻ⁿ.",
    });
  }));
  add(take(10, () => {
    const [x, p, q] = pick([[8, 2, 3], [27, 2, 3], [16, 3, 4], [32, 2, 5], [64, 5, 6], [125, 2, 3], [81, 3, 4], [9, 3, 2], [4, 5, 2], [16, 5, 4], [8, 4, 3], [25, 3, 2]]);
    const root = Math.round(x ** (1 / q));
    const ans = root ** p;
    return mcq({
      skillId: "QNT.ARI.INDICES", level: 4,
      prompt: `Find the value of ${x}^(${p}/${q}).`,
      answer: ans,
      wrong: [
        { value: fmt((x * p) / q), reason: `Multiplied ${x} by ${p}/${q} - a fractional power means root then power.` },
        { value: root, reason: `Took the ${q === 2 ? "square" : q === 3 ? "cube" : `${q}th`} root but forgot to raise it to the power ${p}.` },
        { value: root ** (p + 1), reason: "Raised to one power too many." },
      ],
      explanation: `${x}^(${p}/${q}) = (${q === 2 ? "√" : `${q}th root of `}${x})^${p} = ${root}^${p} = ${ans}.`,
      hint: "The bottom of the fraction is the root; the top is the power.",
    });
  }));
  add(take(10, () => {
    const [a, b] = sample([4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225], 2);
    const ans = Math.sqrt(a) + Math.sqrt(b);
    return mcq({
      skillId: "QNT.ARI.INDICES", level: 2,
      prompt: `What is √${a} + √${b}?`,
      answer: ans,
      wrong: [
        { value: fmt(Math.sqrt(a + b)), reason: "√a + √b is not √(a + b)." },
        { value: a + b, reason: "Forgot to take the square roots." },
        { value: Math.sqrt(a) * Math.sqrt(b), reason: "Multiplied the roots instead of adding." },
      ],
      explanation: `√${a} = ${Math.sqrt(a)}, √${b} = ${Math.sqrt(b)}; sum = ${ans}.`,
      hint: "Find each square root separately.",
    });
  }));

  add(take(10, () => {
    const [a, b] = pick([[12, 18], [24, 36], [15, 25], [16, 40], [18, 27], [20, 50], [21, 35], [28, 42], [36, 48], [45, 60]]);
    const product = a * b;
    const H = gcd(a, b);
    return mcq({
      skillId: "QNT.ARI.LCMHCF", level: 4,
      prompt: `The HCF of two numbers is ${H} and their product is ${product}. What is their LCM?`,
      answer: product / H,
      wrong: [
        { value: product * H, reason: "Multiplied by the HCF - LCM = product ÷ HCF." },
        { value: product / (2 * H), reason: "Divided by twice the HCF." },
        { value: H * 2, reason: "LCM is never smaller than the numbers themselves." },
      ],
      explanation: `For two numbers, HCF × LCM = product, so LCM = ${product} ÷ ${H} = ${product / H}.`,
      hint: "HCF × LCM = product of the two numbers.",
    });
  }));

  // ------------------------------------------------ Commercial maths (more variety)
  add(take(14, () => {
    const p = pick([10, 12.5, 15, 20, 25, 30, 40, 60, 75]);
    const whole = pick([80, 120, 160, 200, 240, 320, 400, 480, 600, 800]);
    const part = (p * whole) / 100;
    if (!Number.isInteger(part)) return null;
    return mcq({
      skillId: "QNT.COM.PERCENT", level: 3,
      prompt: `${part} is ${fmt(p)}% of what number?`,
      answer: whole,
      wrong: [
        { value: fmt((part * p) / 100), reason: `Found ${fmt(p)}% of ${part} instead of working backwards.` },
        { value: fmt(part + p), reason: "Added the percentage to the number." },
        { value: fmt((part * 100) / (100 - p)), reason: "Divided by (100 − p)% - that's for 'after a decrease'." },
      ],
      explanation: `${fmt(p)}% of x = ${part} → x = ${part} × 100 ÷ ${fmt(p)} = ${whole}.`,
      hint: "Part ÷ percentage × 100.",
    });
  }));
  add(take(12, () => {
    const pop = pick([10000, 20000, 25000, 40000, 50000, 80000, 125000]);
    const r = pick([5, 10, 20]);
    const yrs = 2;
    const ans = pop * (1 + r / 100) ** yrs;
    if (!Number.isInteger(ans)) return null;
    return mcq({
      skillId: "QNT.COM.PERCENT", level: 4,
      prompt: `A town has ${pop.toLocaleString("en-IN")} people. The population grows by ${r}% each year. What will it be after ${yrs} years?`,
      answer: ans.toLocaleString("en-IN"),
      wrong: [
        { value: (pop * (1 + (r * yrs) / 100)).toLocaleString("en-IN"), reason: "Added the growth as simple percentage - each year's growth is on the new, bigger population." },
        { value: (pop * (1 + r / 100)).toLocaleString("en-IN"), reason: "Applied only one year of growth." },
        { value: (pop * (1 + r / 100) ** 3).toLocaleString("en-IN"), reason: "Applied three years of growth." },
      ],
      explanation: `${pop.toLocaleString("en-IN")} × (1 + ${r}/100)² = ${ans.toLocaleString("en-IN")}.`,
      hint: "Growth compounds: multiply by (1 + r/100) once per year.",
    });
  }));
  add(take(12, () => {
    const n = pick([10, 12, 15, 20, 25]);
    const gain = pick([2, 3, 4, 5]);
    // Sells n articles for the cost price of n + gain articles.
    const profitPct = (gain / n) * 100;
    return mcq({
      skillId: "QNT.COM.PROFITLOSS", level: 5,
      prompt: `By selling ${n} pens, a shopkeeper earns as much as the cost price of ${n + gain} pens. What is the profit percentage?`,
      answer: `${fmt(profitPct)}%`,
      wrong: [
        { value: `${fmt((gain / (n + gain)) * 100)}%`, reason: "Divided the gain by the larger number - profit % is on cost, i.e. on the pens sold." },
        { value: `${gain}%`, reason: "Gave the number of extra pens as a percentage." },
        { value: `${fmt(profitPct + 5)}%`, reason: "Arithmetic slip - profit % = gain ÷ articles sold × 100." },
      ],
      explanation: `Selling price of ${n} pens = cost of ${n + gain} pens, so the profit is the cost of ${gain} pens on a cost of ${n} pens: ${gain}/${n} × 100 = ${fmt(profitPct)}%.`,
      hint: "Profit = cost of the extra articles; base = cost of the articles sold.",
    });
  }));
  add(take(10, () => {
    const p = pick([10, 20, 25]);
    // Two items sold at the same price: one at p% profit, one at p% loss.
    const loss = (p * p) / 100;
    return mcq({
      skillId: "QNT.COM.PROFITLOSS", level: 5,
      prompt: `Two phones are sold for the same price. One is sold at a ${p}% profit and the other at a ${p}% loss. What is the overall result?`,
      answer: `${fmt(loss)}% loss`,
      wrong: [
        { value: "No profit, no loss", reason: "The two cost prices are different, so the gain and loss don't cancel." },
        { value: `${fmt(loss)}% profit`, reason: "Right size, wrong direction - it's always a loss here." },
        { value: `${p}% loss`, reason: "The overall loss is (p/10)% = p²/100 %, not p%." },
      ],
      explanation: `When two items sell at the same price, one at p% gain and one at p% loss, there is always an overall loss of p²/100 % = ${fmt(loss)}%.`,
      hint: "Try it: pick a selling price and work out both cost prices.",
    });
  }));
  add(take(12, () => {
    const [a, b, c] = [int(1, 6), int(1, 6), int(1, 6)];
    if (new Set([a, b, c]).size < 3) return null;
    const unit = pick([100, 200, 250, 500, 1000]);
    const total = (a + b + c) * unit;
    return mcq({
      skillId: "QNT.COM.RATIO", level: 3,
      prompt: `₹${total.toLocaleString("en-IN")} is divided among Arjun, Bhavna and Chetan in the ratio ${a}:${b}:${c}. What is Chetan's share?`,
      answer: rupees(c * unit),
      wrong: [
        { value: rupees(a * unit), reason: "Gave Arjun's share." },
        { value: rupees(total / 3), reason: "Split equally, ignoring the ratio." },
        { value: rupees((total * c) / (a + b)), reason: "Divided by only two of the parts." },
      ],
      explanation: `Total parts = ${a + b + c}. One part = ₹${unit}. Chetan = ${c} × ${unit} = ₹${c * unit}.`,
      hint: "Add all the ratio parts first.",
    });
  }));
  add(take(10, () => {
    const [a, b] = pick([[3, 5], [2, 7], [4, 9], [5, 8], [7, 11]]);
    const k = int(3, 12);
    const x = a * k;
    const y = b * k;
    const plus = int(2, 10);
    const [na, nb] = [x + plus, y + plus];
    const g = gcd(na, nb);
    return mcq({
      skillId: "QNT.COM.RATIO", level: 4,
      prompt: `Two numbers are in the ratio ${a}:${b}. If ${plus} is added to each, the ratio becomes ${na / g}:${nb / g}. What is the larger number?`,
      answer: y,
      wrong: [
        { value: x, reason: "Gave the smaller number." },
        { value: nb, reason: `Gave the larger number after adding ${plus}.` },
        { value: b * (k + 1), reason: "Slip solving the equation - check with the new ratio." },
      ],
      explanation: `Let the numbers be ${a}k and ${b}k. (${a}k + ${plus}) : (${b}k + ${plus}) = ${na / g}:${nb / g} gives k = ${k}, so the larger is ${b} × ${k} = ${y}.`,
      hint: "Write the numbers as ak and bk, then set up the new ratio.",
    });
  }));
  add(take(12, () => {
    const [x, y] = [pick([20000, 30000, 40000, 50000, 60000]), pick([20000, 30000, 45000, 50000, 75000])];
    const [t1, t2] = [pick([6, 8, 12]), pick([4, 6, 9, 12])];
    const profit = (x * t1 + y * t2) / 1000;
    if (!Number.isInteger(profit) || x * t1 === y * t2) return null;
    const P = profit * pick([10, 20, 30]);
    const aShare = (P * x * t1) / (x * t1 + y * t2);
    if (!Number.isInteger(aShare)) return null;
    return mcq({
      skillId: "QNT.COM.PARTNERSHIP", level: 4,
      prompt: `Anita invests ₹${x.toLocaleString("en-IN")} for ${t1} months and Babu invests ₹${y.toLocaleString("en-IN")} for ${t2} months in a business. The total profit is ₹${P.toLocaleString("en-IN")}. What is Anita's share?`,
      answer: rupees(aShare),
      wrong: [
        { value: rupees(Math.round((P * x) / (x + y))), reason: "Ignored how long each person invested - multiply money by months." },
        { value: rupees(P - aShare), reason: "Gave Babu's share." },
        { value: rupees(P / 2), reason: "Split equally - profit is shared in the ratio of money × time." },
      ],
      explanation: `Ratio = ${x.toLocaleString("en-IN")} × ${t1} : ${y.toLocaleString("en-IN")} × ${t2} = ${x * t1 / gcd(x * t1, y * t2)} : ${y * t2 / gcd(x * t1, y * t2)}. Anita gets ₹${aShare.toLocaleString("en-IN")}.`,
      hint: "Share profit in the ratio of (investment × time).",
    });
  }));
  add(take(10, () => {
    const [a, b] = [pick([2, 3, 4]), pick([3, 5, 7])];
    if (a === b) return null;
    const P = (a + b) * pick([1000, 1500, 2000, 2500, 3000]);
    return mcq({
      skillId: "QNT.COM.PARTNERSHIP", level: 3,
      prompt: `Ravi and Sunita start a shop, investing in the ratio ${a}:${b} for the same period. The year's profit is ₹${P.toLocaleString("en-IN")}. How much does Sunita get?`,
      answer: rupees((P * b) / (a + b)),
      wrong: [
        { value: rupees((P * a) / (a + b)), reason: "Gave Ravi's share." },
        { value: rupees(P / 2), reason: "Split equally, ignoring the ratio." },
        { value: rupees((P * b) / a), reason: "Divided by Ravi's part instead of the total parts." },
      ],
      explanation: `Same period, so profit follows the investment ratio ${a}:${b}. Sunita = ${b}/${a + b} × ${P} = ₹${((P * b) / (a + b)).toLocaleString("en-IN")}.`,
      hint: "Same time → share in the ratio of money invested.",
    });
  }));
  add(take(12, () => {
    const lo = pick([20, 30, 40, 50, 60]);
    const hi = lo + pick([10, 20, 30, 40]);
    const mean = lo + pick([5, 10, 15]) * ((hi - lo) / 10 >= 2 ? 1 : 1);
    if (mean <= lo || mean >= hi) return null;
    const r1 = hi - mean;
    const r2 = mean - lo;
    const g = gcd(r1, r2);
    return mcq({
      skillId: "QNT.COM.MIXTURES", level: 4,
      prompt: `In what ratio must rice costing ₹${lo}/kg be mixed with rice costing ₹${hi}/kg so the mixture costs ₹${mean}/kg?`,
      answer: `${r1 / g}:${r2 / g}`,
      wrong: [
        { value: `${r2 / g}:${r1 / g}`, reason: "Ratio upside down - the cheaper rice pairs with (dearer − mean)." },
        { value: `${lo / gcd(lo, hi)}:${hi / gcd(lo, hi)}`, reason: "Used the prices themselves as the ratio." },
        { value: "1:1", reason: "Equal amounts only give the simple average of the two prices." },
      ],
      explanation: `Alligation: cheaper : dearer = (${hi} − ${mean}) : (${mean} − ${lo}) = ${r1}:${r2} = ${r1 / g}:${r2 / g}.`,
      hint: "Cheaper : dearer = (dearer − mean) : (mean − cheaper).",
    });
  }));
  add(take(10, () => {
    const [m, w] = pick([[3, 1], [4, 1], [5, 2], [7, 3], [3, 2], [5, 3]]);
    const k = int(4, 12);
    const total = (m + w) * k;
    const addW = pick([k, 2 * k, Math.ceil(k / 2)]);
    const nm = m * k;
    const nw = w * k + addW;
    const g = gcd(nm, nw);
    return mcq({
      skillId: "QNT.COM.MIXTURES", level: 4,
      prompt: `A ${total}-litre mixture has milk and water in the ratio ${m}:${w}. If ${addW} litres of water are added, what is the new ratio of milk to water?`,
      answer: `${nm / g}:${nw / g}`,
      wrong: [
        { value: `${m}:${w + addW}`, reason: "Added the litres to the ratio number instead of the actual amount of water." },
        { value: `${nw / g}:${nm / g}`, reason: "Gave water : milk." },
        { value: `${(nm + addW) / gcd(nm + addW, w * k)}:${(w * k) / gcd(nm + addW, w * k)}`, reason: "Added the water to the milk." },
      ],
      explanation: `Milk = ${nm} L, water = ${w * k} L. After adding ${addW} L water: ${nm} : ${nw} = ${nm / g}:${nw / g}.`,
      hint: "Convert the ratio into litres first.",
    });
  }));
  add(take(12, () => {
    const n = pick([4, 5, 6, 8, 10]);
    const avg = int(30, 80);
    const newVal = int(avg + 5, avg + 60);
    const newAvg = (avg * n + newVal) / (n + 1);
    if (!Number.isInteger(newAvg)) return null;
    return mcq({
      skillId: "QNT.COM.AVERAGES", level: 3,
      prompt: `The average score of ${n} agents is ${avg}. A new agent with a score of ${newVal} joins. What is the new average?`,
      answer: newAvg,
      wrong: [
        { value: fmt((avg + newVal) / 2), reason: "Averaged the old average with the new score, ignoring team size." },
        { value: fmt((avg * n + newVal) / n), reason: "Divided by the old team size." },
        { value: avg + 1 === newAvg ? avg + 2 : avg + 1, reason: "Guessed a small change - recompute the total." },
      ],
      explanation: `Old total = ${avg * n}. New total = ${avg * n + newVal}. New average = ${avg * n + newVal} ÷ ${n + 1} = ${newAvg}.`,
      hint: "Work with totals, then divide.",
    });
  }));
  add(take(10, () => {
    const r = pick([8, 10, 12, 15, 20, 25]);
    // Doubling time with simple interest.
    const yrs = 100 / r;
    return mcq({
      skillId: "QNT.COM.INTEREST", level: 3,
      prompt: `At what number of years will a sum of money double itself at ${r}% simple interest per year?`,
      answer: `${fmt(yrs)} years`,
      wrong: [
        { value: `${fmt(yrs * 2)} years`, reason: "Doubling needs interest equal to the principal (100%), not 200%." },
        { value: `${r} years`, reason: "Gave the rate as the time." },
        { value: `${fmt(72 / r)} years`, reason: "Used the rule of 72 - that's for compound interest, and only approximate." },
      ],
      explanation: `The sum doubles when interest = principal, i.e. 100% of it. ${r}% per year × T = 100% → T = ${fmt(yrs)} years.`,
      hint: "Double = interest equal to the principal.",
    });
  }));
  add(take(12, () => {
    const p = pick([1000, 2000, 4000, 5000, 8000, 10000]);
    const r = pick([5, 8, 10, 12]);
    const t = pick([2, 3, 4, 5]);
    const amount = p + (p * r * t) / 100;
    return mcq({
      skillId: "QNT.COM.INTEREST", level: 3,
      prompt: `A sum becomes ₹${amount.toLocaleString("en-IN")} in ${t} years at ${r}% simple interest per year. What was the sum (principal)?`,
      answer: rupees(p),
      wrong: [
        { value: rupees(amount - (amount * r * t) / 100), reason: "Took interest on the final amount - interest is on the principal." },
        { value: rupees((p * r * t) / 100), reason: "Gave the interest, not the principal." },
        { value: rupees(amount / (1 + r / 100)), reason: "Removed only one year of interest." },
      ],
      explanation: `Amount = P(1 + RT/100) → P = ${amount} ÷ (1 + ${r * t}/100) = ₹${p.toLocaleString("en-IN")}.`,
      hint: "Amount = principal × (1 + rate × time / 100).",
    });
  }));
  add(take(10, () => {
    const m = pick([1000, 1500, 2000, 2500, 3000, 4000, 5000]);
    const [d1, d2] = pick([[10, 5], [20, 10], [15, 10], [25, 10], [20, 20], [10, 10]]);
    const final = (m * (100 - d1) * (100 - d2)) / 10000;
    return mcq({
      skillId: "QNT.COM.DISCOUNT", level: 3,
      prompt: `A TV marked at ₹${m.toLocaleString("en-IN")} gets a ${d1}% discount, then a further ${d2}% off the reduced price. What is the final price?`,
      answer: rupees(final),
      wrong: [
        { value: rupees((m * (100 - d1 - d2)) / 100), reason: "Added the discounts - the second one applies to the reduced price." },
        { value: rupees((m * (100 - d1)) / 100), reason: "Applied only the first discount." },
        { value: rupees(m - final), reason: "Gave the total discount, not the price." },
      ],
      explanation: `${m} × ${(100 - d1) / 100} × ${(100 - d2) / 100} = ₹${fmt(final)}.`,
      hint: "Apply the discounts one after the other.",
    });
  }));

  // ------------------------------------------------ Time and work / pipes / boats / trains
  add(take(12, () => {
    const [a, b, c] = pick([[10, 15, 30], [12, 15, 20], [6, 12, 12], [8, 12, 24], [10, 12, 15], [20, 30, 60], [6, 10, 15]]);
    const t = 1 / (1 / a + 1 / b + 1 / c);
    return mcq({
      skillId: "QNT.TIM.WORK", level: 4,
      prompt: `Three agents can clear a backlog alone in ${a}, ${b} and ${c} days respectively. How long will they take working together?`,
      answer: `${fmt(t)} days`,
      wrong: [
        { value: `${fmt((a + b + c) / 3)} days`, reason: "Averaged the days - together they're faster than any one alone." },
        { value: `${a + b + c} days`, reason: "Added the days." },
        { value: `${fmt(Math.min(a, b, c) / 2)} days`, reason: "Guessed from the fastest agent - add all three daily rates." },
      ],
      explanation: `Daily rate = 1/${a} + 1/${b} + 1/${c} = 1/${fmt(t)}, so ${fmt(t)} days.`,
      hint: "Add the fractions of work done per day.",
    });
  }));
  add(take(10, () => {
    const men = pick([4, 6, 8, 10, 12, 15]);
    const days = pick([6, 8, 10, 12, 15, 20]);
    const men2 = pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30].filter((m) => m !== men && (men * days) % m === 0));
    if (!men2) return null;
    return mcq({
      skillId: "QNT.TIM.WORK", level: 3,
      prompt: `${men} people can finish a job in ${days} days. How many days will ${men2} people take for the same job (working at the same rate)?`,
      answer: `${(men * days) / men2} days`,
      wrong: [
        { value: `${fmt((men2 * days) / men)} days`, reason: "Treated it as direct proportion - more people means FEWER days." },
        { value: `${days + (men - men2)} days`, reason: "Added/subtracted the difference in people." },
        { value: `${days} days`, reason: "The number of days changes with the number of people." },
      ],
      explanation: `Total work = ${men} × ${days} = ${men * days} person-days. ${men * days} ÷ ${men2} = ${(men * days) / men2} days.`,
      hint: "People × days stays the same for the same job.",
    });
  }));
  add(take(12, () => {
    const [a, b] = pick([[4, 6], [6, 12], [10, 15], [12, 20], [6, 9], [8, 24], [15, 30], [20, 30]]);
    const t = (a * b) / (a + b);
    return mcq({
      skillId: "QNT.TIM.PIPES", level: 3,
      prompt: `Pipe A fills a tank in ${a} hours and pipe B fills it in ${b} hours. How long will both pipes together take to fill it?`,
      answer: `${fmt(t)} hours`,
      wrong: [
        { value: `${fmt((a + b) / 2)} hours`, reason: "Averaged the times." },
        { value: `${a + b} hours`, reason: "Added the times - two pipes fill faster than one." },
        { value: `${fmt((a * b) / (b - a))} hours`, reason: "Subtracted the rates - that's for a filling pipe and an emptying pipe." },
      ],
      explanation: `Rate = 1/${a} + 1/${b} = ${a + b}/${a * b}. Time = ${a * b}/${a + b} = ${fmt(t)} hours.`,
      hint: "Add the rates (fractions of the tank per hour).",
    });
  }));
  add(take(12, () => {
    const [a, b] = pick([[4, 6], [6, 12], [10, 15], [12, 20], [6, 9], [8, 24], [5, 20], [3, 6], [15, 20], [10, 30]]);
    const t = (a * b) / (b - a);
    return mcq({
      skillId: "QNT.TIM.PIPES", level: 4,
      prompt: `An inlet pipe fills a tank in ${a} hours, but a leak empties the full tank in ${b} hours. With both working, how long will the tank take to fill?`,
      answer: `${fmt(t)} hours`,
      wrong: [
        { value: `${fmt((a * b) / (a + b))} hours`, reason: "Added the rates - the leak works AGAINST the inlet." },
        { value: `${b - a} hours`, reason: "Subtracted the times instead of the rates." },
        { value: `${a + b} hours`, reason: "Added the times." },
      ],
      explanation: `Net rate = 1/${a} − 1/${b} = ${b - a}/${a * b}. Time = ${a * b}/${b - a} = ${fmt(t)} hours.`,
      hint: "Subtract the emptying rate from the filling rate.",
    });
  }));
  add(take(12, () => {
    const still = int(8, 25);
    const stream = int(2, Math.min(6, still - 2));
    const down = still + stream;
    const up = still - stream;
    const askStill = int(0, 1) === 1;
    return mcq({
      skillId: "QNT.TIM.BOATS", level: 3,
      prompt: `A boat goes ${down} km/h downstream and ${up} km/h upstream. What is the speed of the ${askStill ? "boat in still water" : "stream"}?`,
      answer: `${askStill ? still : stream} km/h`,
      wrong: [
        { value: `${askStill ? stream : still} km/h`, reason: askStill ? "Gave the stream's speed." : "Gave the boat's still-water speed." },
        { value: `${down - up} km/h`, reason: "Forgot to halve the difference." },
        { value: `${down + up} km/h`, reason: "Forgot to halve the sum." },
      ],
      explanation: `Still water = (down + up)/2 = ${still} km/h; stream = (down − up)/2 = ${stream} km/h.`,
      hint: "Downstream = boat + stream; upstream = boat − stream.",
    });
  }));
  add(take(10, () => {
    const still = int(8, 20);
    const stream = int(2, 5);
    const up = still - stream;
    const dist = up * int(2, 5);
    return mcq({
      skillId: "QNT.TIM.BOATS", level: 3,
      prompt: `A boat's speed in still water is ${still} km/h and the stream flows at ${stream} km/h. How long does it take to travel ${dist} km upstream?`,
      answer: `${dist / up} hours`,
      wrong: [
        { value: `${fmt(dist / (still + stream))} hours`, reason: "Used the downstream speed." },
        { value: `${fmt(dist / still)} hours`, reason: "Ignored the stream." },
        { value: `${dist / up + 1} hours`, reason: "Arithmetic slip." },
      ],
      explanation: `Upstream speed = ${still} − ${stream} = ${up} km/h. Time = ${dist} ÷ ${up} = ${dist / up} hours.`,
      hint: "Upstream: subtract the stream speed.",
    });
  }));
  add(take(12, () => {
    const [l1, l2] = [pick([100, 120, 150, 180, 200]), pick([100, 130, 150, 200, 250])];
    const [s1, s2] = pick([[36, 54], [45, 63], [54, 72], [60, 48], [72, 36], [40, 50]]);
    const secs = (l1 + l2) / (((s1 + s2) * 5) / 18);
    return mcq({
      skillId: "QNT.TIM.TRAINS", level: 4,
      prompt: `Two trains, ${l1} m and ${l2} m long, run towards each other at ${s1} km/h and ${s2} km/h. How long do they take to cross each other completely?`,
      answer: `${fmt(secs)} seconds`,
      wrong: [
        { value: `${fmt((l1 + l2) / ((Math.abs(s1 - s2) * 5) / 18))} seconds`, reason: "Subtracted the speeds - trains moving towards each other ADD their speeds." },
        { value: `${fmt(l1 / (((s1 + s2) * 5) / 18))} seconds`, reason: "Used only one train's length - they must pass each other's full length." },
        { value: `${fmt((l1 + l2) / (s1 + s2))} seconds`, reason: "Forgot to convert km/h to m/s." },
      ],
      explanation: `Relative speed = ${s1} + ${s2} = ${s1 + s2} km/h = ${fmt(((s1 + s2) * 5) / 18)} m/s. Distance = ${l1} + ${l2} = ${l1 + l2} m. Time = ${fmt(secs)} s.`,
      hint: "Opposite directions: add speeds; distance = sum of lengths.",
    });
  }));
  add(take(12, () => {
    const len = pick([100, 120, 150, 200, 240, 300]);
    const plat = pick([150, 200, 250, 300, 360, 400]);
    const v = pick([36, 54, 72, 90]);
    const secs = (len + plat) / ((v * 5) / 18);
    return mcq({
      skillId: "QNT.TIM.TRAINS", level: 3,
      prompt: `A ${len} m train at ${v} km/h crosses a ${plat} m platform. How long does it take?`,
      answer: `${fmt(secs)} seconds`,
      wrong: [
        { value: `${fmt(len / ((v * 5) / 18))} seconds`, reason: "Left out the platform - the train must cover its own length plus the platform." },
        { value: `${fmt(plat / ((v * 5) / 18))} seconds`, reason: "Left out the train's own length." },
        { value: `${fmt((len + plat) / v)} seconds`, reason: "Didn't convert km/h to m/s." },
      ],
      explanation: `Distance = ${len} + ${plat} = ${len + plat} m. Speed = ${v} × 5/18 = ${fmt((v * 5) / 18)} m/s. Time = ${fmt(secs)} s.`,
      hint: "Crossing a platform: train length + platform length.",
    });
  }));
  add(take(10, () => {
    const d = pick([120, 150, 180, 240, 300, 360]);
    const v = pick([30, 40, 45, 60]);
    const late = pick([10, 15, 20, 30]);
    const t = d / v;
    return mcq({
      skillId: "QNT.TIM.TSD", level: 2,
      prompt: `A bus covers ${d} km at an average of ${v} km/h. How long does the journey take?`,
      answer: `${fmt(t)} hours`,
      wrong: [
        { value: `${fmt(v / d)} hours`, reason: "Divided speed by distance - time = distance ÷ speed." },
        { value: `${fmt(d * v)} hours`, reason: "Multiplied instead of dividing." },
        { value: `${fmt(t + late / 60)} hours`, reason: "Added a delay that isn't in the question." },
      ],
      explanation: `Time = distance ÷ speed = ${d} ÷ ${v} = ${fmt(t)} hours.`,
      hint: "T = D ÷ S.",
    });
  }));

  // ------------------------------------------------ Algebra
  add(take(14, () => {
    const x = int(-6, 15);
    const a = int(2, 9);
    const b = int(-20, 30);
    if (b === 0) return null;
    const c = a * x + b;
    return mcq({
      skillId: "QNT.ALG.LINEAR", level: 2,
      prompt: `Solve for x: ${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${c}`,
      answer: x,
      wrong: [
        { value: fmt((c + b) / a), reason: `Moved ${Math.abs(b)} across without changing its sign.` },
        { value: c - b, reason: `Forgot to divide by ${a}.` },
        { value: fmt(c / a - b), reason: "Divided before moving the constant across." },
      ],
      explanation: `${a}x = ${c} ${b < 0 ? "+" : "−"} ${Math.abs(b)} = ${c - b}, so x = ${par(c - b)} ÷ ${a} = ${x}.`,
      hint: "Undo the + or − first, then divide.",
    });
  }));
  add(take(12, () => {
    const big = int(20, 90);
    const small = int(5, big - 3);
    const S = big + small;
    const D = big - small;
    return mcq({
      skillId: "QNT.ALG.LINEAR", level: 2,
      prompt: `The sum of two numbers is ${S} and their difference is ${D}. What is the larger number?`,
      answer: big,
      wrong: [
        { value: small, reason: "Gave the smaller number." },
        { value: fmt(S / 2), reason: "Halved the sum - that's only right if the difference is 0." },
        { value: S - D, reason: "Forgot to halve (S − D) - and that gives twice the smaller number." },
      ],
      explanation: `Larger = (sum + difference)/2 = (${S} + ${D})/2 = ${big}.`,
      hint: "Add the two equations.",
    });
  }));
  add(take(12, () => {
    const son = int(5, 15);
    const k = pick([3, 4, 5]);
    const father = son * k;
    const n = pick([5, 6, 8, 10, 12, 15]);
    const m = (father + n) / (son + n);
    if (!Number.isInteger(m) || m < 2) return null;
    return mcq({
      skillId: "QNT.ALG.LINEAR", level: 4,
      prompt: `A father is ${k} times as old as his son. In ${n} years, he will be ${m} times as old as his son. How old is the son now?`,
      answer: `${son} years`,
      wrong: [
        { value: `${father} years`, reason: "Gave the father's age." },
        { value: `${son + n} years`, reason: `Gave the son's age in ${n} years.` },
        { value: `${son + 1} years`, reason: "Check it: the ratio wouldn't work out." },
      ],
      explanation: `Let the son be s. ${k}s + ${n} = ${m}(s + ${n}) → s = ${son}. Father = ${father}.`,
      hint: "Write both ages in terms of the son's age now.",
    });
  }));
  add(take(12, () => {
    const adults = int(20, 80);
    const kids = int(10, 60);
    const [pa, pk] = pick([[200, 100], [150, 80], [300, 150], [250, 100], [120, 60]]);
    const total = adults + kids;
    const money = adults * pa + kids * pk;
    return mcq({
      skillId: "QNT.ALG.LINEAR", level: 3,
      prompt: `A theatre sold ${total} tickets for ₹${money.toLocaleString("en-IN")}. Adult tickets cost ₹${pa} and child tickets ₹${pk}. How many adult tickets were sold?`,
      answer: adults,
      wrong: [
        { value: kids, reason: "Gave the number of child tickets." },
        { value: Math.round(money / pa), reason: "Assumed every ticket was an adult ticket." },
        { value: Math.round(total / 2), reason: "Split the tickets evenly." },
      ],
      explanation: `a + c = ${total} and ${pa}a + ${pk}c = ${money}. Replace c = ${total} − a: ${pa - pk}a = ${money - pk * total} → a = ${adults}.`,
      hint: "Two unknowns, two equations: substitute one into the other.",
    });
  }));
  add(take(12, () => {
    const [p, q] = sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2).sort((a, b) => a - b);
    const s = p + q;
    const pr = p * q;
    return mcq({
      skillId: "QNT.ALG.QUADRATIC", level: 3,
      prompt: `What are the roots of x² − ${s}x + ${pr} = 0?`,
      answer: `${p} and ${q}`,
      wrong: [
        { value: `−${p} and −${q}`, reason: "Sign slip: x² − (p+q)x + pq = (x − p)(x − q), so the roots are positive." },
        { value: `${p} and −${q}`, reason: "The product of the roots is +" + pr + ", so both have the same sign." },
        { value: `${s} and ${pr}`, reason: "Gave the sum and product of the roots, not the roots." },
      ],
      explanation: `Find two numbers that add to ${s} and multiply to ${pr}: ${p} and ${q}. So (x − ${p})(x − ${q}) = 0.`,
      hint: "Look for two numbers with the right sum and product.",
    });
  }));
  add(take(10, () => {
    const [a, b, c] = [pick([1, 2, 3]), int(-12, 12), int(-20, 20)];
    if (b === 0 || c === 0 || b * b - 4 * a * c < 0) return null; // real roots only
    const sum = frac(-b, a);
    const prod = frac(c, a);
    const askSum = int(0, 1) === 1;
    const eq = `${a === 1 ? "" : a}x² ${b < 0 ? "−" : "+"} ${Math.abs(b)}x ${c < 0 ? "−" : "+"} ${Math.abs(c)} = 0`;
    const neg = (s) => (s.startsWith("-") ? s.slice(1) : `-${s}`);
    return mcq({
      skillId: "QNT.ALG.QUADRATIC", level: 4,
      prompt: `For ${eq}, what is the ${askSum ? "sum" : "product"} of the roots?`,
      answer: (askSum ? sum : prod).replace(/^-/, "−"),
      wrong: [
        { value: neg(askSum ? sum : prod).replace(/^-/, "−"), reason: askSum ? "Sign slip: sum of roots = −b/a." : "Sign slip: product of roots = c/a." },
        { value: (askSum ? prod : sum).replace(/^-/, "−"), reason: askSum ? "Gave the product (c/a) instead of the sum." : "Gave the sum (−b/a) instead of the product." },
        { value: String(askSum ? b : c).replace(/^-/, "−"), reason: "Read a coefficient straight off without dividing by a (or fixing the sign)." },
      ],
      explanation: `For ax² + bx + c = 0: sum = −b/a = ${sum.replace(/^-/, "−")}, product = c/a = ${prod.replace(/^-/, "−")}.`,
      hint: "Sum = −b/a, product = c/a.",
    });
  }));
  add(take(12, () => {
    const a = int(2, 7);
    const b = int(-10, 15);
    const c = int(5, 60);
    // smallest integer x with ax + b > c
    const x = Math.floor((c - b) / a) + 1;
    return mcq({
      skillId: "QNT.ALG.INEQUALITIES", level: 3,
      prompt: `What is the smallest whole number x for which ${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)} > ${c}?`,
      answer: x,
      wrong: [
        { value: x - 1, reason: "This makes the two sides equal or smaller - the inequality is strict (>)." },
        { value: x + 1, reason: "Works, but isn't the smallest." },
        { value: Math.floor((c + b) / a) + 1 === x ? x + 2 : Math.floor((c + b) / a) + 1, reason: "Moved the constant across without changing its sign." },
      ],
      explanation: `${a}x > ${c} ${b < 0 ? "+" : "−"} ${Math.abs(b)} = ${c - b} → x > ${fmt((c - b) / a)}. Smallest whole number: ${x}.`,
      hint: "Solve like an equation, then pick the first whole number that fits.",
    });
  }));
  add(take(12, () => {
    const a = int(1, 20);
    const d = int(2, 9);
    const n = int(8, 40);
    const t = a + (n - 1) * d;
    return mcq({
      skillId: "QNT.ALG.PROGRESSIONS", level: 2,
      prompt: `What is the ${n}th term of the series ${a}, ${a + d}, ${a + 2 * d}, ${a + 3 * d}, …?`,
      answer: t,
      wrong: [
        { value: a + n * d, reason: "Used a + nd - the nth term is a + (n − 1)d." },
        { value: n * d, reason: "Left out the first term." },
        { value: t - d, reason: "One term short." },
      ],
      explanation: `nth term = a + (n − 1)d = ${a} + ${n - 1} × ${d} = ${t}.`,
      hint: "Start at the first term and add (n − 1) steps.",
    });
  }));
  add(take(12, () => {
    const a = int(1, 10);
    const d = int(1, 6);
    const n = pick([10, 12, 15, 20, 25]);
    const s = (n / 2) * (2 * a + (n - 1) * d);
    return mcq({
      skillId: "QNT.ALG.PROGRESSIONS", level: 3,
      prompt: `What is the sum of the first ${n} terms of ${a}, ${a + d}, ${a + 2 * d}, …?`,
      answer: s,
      wrong: [
        { value: n * (a + (n - 1) * d), reason: "Multiplied the last term by n - use n/2 × (first + last)." },
        { value: (n / 2) * (2 * a + n * d), reason: "Used nd instead of (n − 1)d." },
        { value: a + (n - 1) * d, reason: "Gave the last term, not the sum." },
      ],
      explanation: `Sₙ = n/2 × [2a + (n − 1)d] = ${n}/2 × [${2 * a} + ${(n - 1) * d}] = ${s}.`,
      hint: "Sum = number of terms × average of first and last.",
    });
  }));
  add(take(10, () => {
    const a = pick([1, 2, 3, 5]);
    const r = pick([2, 3]);
    const n = int(5, 8);
    const t = a * r ** (n - 1);
    return mcq({
      skillId: "QNT.ALG.PROGRESSIONS", level: 3,
      prompt: `What is the ${n}th term of the series ${a}, ${a * r}, ${a * r * r}, …?`,
      answer: t,
      wrong: [
        { value: a * r ** n, reason: "Used rⁿ - the nth term is a × r^(n − 1)." },
        { value: a + (n - 1) * r, reason: "Treated it as adding r each time; it multiplies." },
        { value: t / r, reason: "One term short." },
      ],
      explanation: `nth term = a × r^(n − 1) = ${a} × ${r}^${n - 1} = ${t}.`,
      hint: "Each term is the previous one times the same number.",
    });
  }));
  add(take(12, () => {
    const [a, b] = [int(2, 9), int(-10, 10)];
    if (b === 0) return null;
    const k = int(-5, 9);
    const ans = a * k + b;
    return mcq({
      skillId: "QNT.ALG.FUNCTIONS", level: 2,
      prompt: `If f(x) = ${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)}, what is f(${k})?`,
      answer: ans,
      wrong: [
        { value: a + k + b, reason: `Added ${a} and ${k} instead of multiplying.` },
        { value: a * k - b, reason: "Sign slip on the constant." },
        { value: a * (k + b), reason: "Added the constant before multiplying." },
      ],
      explanation: `f(${k}) = ${a} × ${par(k)} ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${ans}.`,
      hint: "Replace x with the number.",
    });
  }));
  add(take(10, () => {
    const [a, b, c, d] = [int(2, 5), int(-5, 5), int(2, 4), int(-4, 6)];
    if (b === 0 || d === 0) return null;
    const k = int(1, 5);
    const g = c * k + d;
    const ans = a * g + b;
    return mcq({
      skillId: "QNT.ALG.FUNCTIONS", level: 4,
      prompt: `If f(x) = ${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)} and g(x) = ${c}x ${d < 0 ? "−" : "+"} ${Math.abs(d)}, what is f(g(${k}))?`,
      answer: ans,
      wrong: [
        { value: c * (a * k + b) + d, reason: "Worked out g(f(x)) - start with the INNER function g." },
        { value: (a * k + b) + (c * k + d), reason: "Added f and g instead of putting g into f." },
        { value: (a * k + b) * (c * k + d), reason: "Multiplied f and g instead of composing them." },
      ],
      explanation: `g(${k}) = ${g}. Then f(${g}) = ${a} × ${g} ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${ans}.`,
      hint: "Work from the inside out.",
    });
  }));

  // ------------------------------------------------ Geometry
  add(take(12, () => {
    const l = int(6, 40);
    const w = int(3, l - 1);
    const askArea = int(0, 1) === 1;
    return mcq({
      skillId: "QNT.GEO.AREA2D", level: 1,
      prompt: `A rectangular room is ${l} m long and ${w} m wide. What is its ${askArea ? "area" : "perimeter"}?`,
      answer: askArea ? `${l * w} sq m` : `${2 * (l + w)} m`,
      wrong: askArea
        ? [
            { value: `${2 * (l + w)} sq m`, reason: "Worked out the perimeter - area = length × width." },
            { value: `${l + w} sq m`, reason: "Added instead of multiplying." },
            { value: `${l * w * 2} sq m`, reason: "Doubled the area." },
          ]
        : [
            { value: `${l * w} m`, reason: "Worked out the area - perimeter = 2 × (length + width)." },
            { value: `${l + w} m`, reason: "Added only two sides." },
            { value: `${4 * l} m`, reason: "Treated it as a square." },
          ],
      explanation: askArea ? `Area = ${l} × ${w} = ${l * w} sq m.` : `Perimeter = 2 × (${l} + ${w}) = ${2 * (l + w)} m.`,
      hint: askArea ? "Area = length × width." : "Perimeter = distance all the way round.",
    });
  }));
  add(take(10, () => {
    const s = int(4, 30);
    return mcq({
      skillId: "QNT.GEO.AREA2D", level: 2,
      prompt: `A square garden has a perimeter of ${4 * s} m. What is its area?`,
      answer: `${s * s} sq m`,
      wrong: [
        { value: `${(4 * s) ** 2} sq m`, reason: "Squared the perimeter - first find one side (perimeter ÷ 4)." },
        { value: `${s * 4} sq m`, reason: "Gave the perimeter." },
        { value: `${(2 * s) ** 2} sq m`, reason: "Divided the perimeter by 2 instead of 4." },
      ],
      explanation: `Side = ${4 * s} ÷ 4 = ${s} m. Area = ${s}² = ${s * s} sq m.`,
      hint: "Find one side first.",
    });
  }));
  add(take(10, () => {
    const b = int(4, 30) * 2;
    const h = int(3, 25);
    return mcq({
      skillId: "QNT.GEO.AREA2D", level: 2,
      prompt: `A triangle has a base of ${b} cm and a height of ${h} cm. What is its area?`,
      answer: `${(b * h) / 2} sq cm`,
      wrong: [
        { value: `${b * h} sq cm`, reason: "Forgot the ½ - a triangle is half of a rectangle." },
        { value: `${b + h} sq cm`, reason: "Added instead of multiplying." },
        { value: `${(b * h) / 4} sq cm`, reason: "Halved twice." },
      ],
      explanation: `Area = ½ × base × height = ½ × ${b} × ${h} = ${(b * h) / 2} sq cm.`,
      hint: "½ × base × height.",
    });
  }));
  add(take(10, () => {
    const l = int(8, 25);
    const w = int(5, 15);
    const rate = pick([40, 50, 60, 75, 80, 100, 120]);
    return mcq({
      skillId: "QNT.GEO.AREA2D", level: 3,
      prompt: `How much will it cost to tile a floor ${l} m by ${w} m at ₹${rate} per square metre?`,
      answer: rupees(l * w * rate),
      wrong: [
        { value: rupees(2 * (l + w) * rate), reason: "Used the perimeter - tiling covers the area." },
        { value: rupees((l + w) * rate), reason: "Added the sides instead of multiplying." },
        { value: rupees(l * w), reason: "Forgot to multiply by the rate." },
      ],
      explanation: `Area = ${l * w} sq m. Cost = ${l * w} × ₹${rate} = ₹${(l * w * rate).toLocaleString("en-IN")}.`,
      hint: "Cost = area × rate.",
    });
  }));
  add(take(10, () => {
    const [l, w, h] = [int(3, 20), int(2, 12), int(2, 10)];
    return mcq({
      skillId: "QNT.GEO.VOLUME3D", level: 2,
      prompt: `A box is ${l} cm long, ${w} cm wide and ${h} cm high. What is its volume?`,
      answer: `${l * w * h} cubic cm`,
      wrong: [
        { value: `${2 * (l * w + w * h + l * h)} cubic cm`, reason: "Worked out the surface area, not the volume." },
        { value: `${l + w + h} cubic cm`, reason: "Added the sides." },
        { value: `${l * w} cubic cm`, reason: "Left out the height." },
      ],
      explanation: `Volume = ${l} × ${w} × ${h} = ${l * w * h} cubic cm.`,
      hint: "Length × width × height.",
    });
  }));
  add(take(10, () => {
    const s = int(2, 15);
    return mcq({
      skillId: "QNT.GEO.VOLUME3D", level: 3,
      prompt: `What is the total surface area of a cube with edges of ${s} cm?`,
      answer: `${6 * s * s} sq cm`,
      wrong: [
        { value: `${s ** 3} sq cm`, reason: "Worked out the volume." },
        { value: `${4 * s * s} sq cm`, reason: "Counted only 4 faces - a cube has 6." },
        { value: `${12 * s} sq cm`, reason: "Added the edges." },
      ],
      explanation: `6 faces × ${s}² = ${6 * s * s} sq cm.`,
      hint: "A cube has 6 equal square faces.",
    });
  }));
  add(take(10, () => {
    const r = pick([7, 14, 21]);
    const h = int(3, 20);
    const v = (22 / 7) * r * r * h;
    return mcq({
      skillId: "QNT.GEO.VOLUME3D", level: 4,
      prompt: `A cylindrical tank has a radius of ${r} m and a height of ${h} m. What is its volume? (Use π = 22/7.)`,
      answer: `${fmt(v)} cubic m`,
      wrong: [
        { value: `${fmt((22 / 7) * 2 * r * h)} cubic m`, reason: "Used 2πrh - that's the curved surface area." },
        { value: `${fmt((22 / 7) * r * h)} cubic m`, reason: "Forgot to square the radius." },
        { value: `${fmt((22 / 7) * (2 * r) ** 2 * h)} cubic m`, reason: "Used the diameter instead of the radius." },
      ],
      explanation: `V = πr²h = 22/7 × ${r}² × ${h} = ${fmt(v)} cubic m.`,
      hint: "Volume of a cylinder = πr²h.",
    });
  }));
  add(take(12, () => {
    const a = int(20, 100);
    const b = int(20, 150 - a);
    const c = 180 - a - b;
    if (c <= 0) return null;
    return mcq({
      skillId: "QNT.GEO.TRIANGLES", level: 1,
      prompt: `Two angles of a triangle are ${a}° and ${b}°. What is the third angle?`,
      answer: `${c}°`,
      wrong: [
        { value: `${360 - a - b}°`, reason: "Used 360° - angles in a triangle add to 180°." },
        { value: `${a + b}°`, reason: "Added the two angles." },
        { value: `${Math.abs(a - b)}°`, reason: "Subtracted the angles." },
      ],
      explanation: `180 − ${a} − ${b} = ${c}°.`,
      hint: "Angles in a triangle add to 180°.",
    });
  }));
  add(take(12, () => {
    const [p, q, r] = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]]);
    const k = pick([1, 2, 3]);
    return mcq({
      skillId: "QNT.GEO.TRIANGLES", level: 2,
      prompt: `A right-angled triangle has shorter sides of ${p * k} cm and ${q * k} cm. How long is the longest side?`,
      answer: `${r * k} cm`,
      wrong: [
        { value: `${(p + q) * k} cm`, reason: "Added the sides - use Pythagoras: √(a² + b²)." },
        { value: `${fmt(Math.sqrt(Math.abs((q * k) ** 2 - (p * k) ** 2)))} cm`, reason: "Subtracted the squares - that finds a shorter side, not the hypotenuse." },
        { value: `${(r + 1) * k} cm`, reason: "Arithmetic slip." },
      ],
      explanation: `√(${p * k}² + ${q * k}²) = √${(p * k) ** 2 + (q * k) ** 2} = ${r * k} cm.`,
      hint: "Pythagoras: c² = a² + b².",
    });
  }));
  add(take(10, () => {
    const apex = pick([20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);
    const base = (180 - apex) / 2;
    return mcq({
      skillId: "QNT.GEO.TRIANGLES", level: 2,
      prompt: `In an isosceles triangle, the angle between the two equal sides is ${apex}°. What is each of the other two angles?`,
      answer: `${fmt(base)}°`,
      wrong: [
        { value: `${180 - apex}°`, reason: "Forgot to share the remaining angle between two equal angles." },
        { value: `${apex}°`, reason: "The equal angles are the other two, not this one." },
        { value: `${fmt((360 - apex) / 2)}°`, reason: "Used 360° - the angles of a triangle add up to 180°." },
      ],
      explanation: `The two base angles are equal: (180 − ${apex}) ÷ 2 = ${fmt(base)}°.`,
      hint: "The two angles opposite the equal sides are equal.",
    });
  }));
  add(take(10, () => {
    const a = int(25, 80);
    const b = int(25, 90);
    return mcq({
      skillId: "QNT.GEO.TRIANGLES", level: 3,
      prompt: `Two interior angles of a triangle are ${a}° and ${b}°. What is the exterior angle at the third corner?`,
      answer: `${a + b}°`,
      wrong: [
        { value: `${180 - a - b}°`, reason: "Gave the third interior angle - the exterior angle is 180° minus that." },
        { value: `${360 - a - b}°`, reason: "Used 360° - the angles of a triangle add up to 180°." },
        { value: `${Math.abs(a - b)}°`, reason: "Subtracted the angles." },
      ],
      explanation: `An exterior angle equals the sum of the two opposite interior angles: ${a} + ${b} = ${a + b}°.`,
      hint: "Exterior angle = sum of the two opposite interior angles.",
    });
  }));
  add(take(12, () => {
    const r = pick([7, 14, 21, 28, 35, 42]);
    const askArea = int(0, 1) === 1;
    const circ = (22 / 7) * 2 * r;
    const area = (22 / 7) * r * r;
    return mcq({
      skillId: "QNT.GEO.CIRCLES", level: askArea ? 3 : 2,
      prompt: `A circle has a radius of ${r} cm. What is its ${askArea ? "area" : "circumference"}? (Use π = 22/7.)`,
      answer: askArea ? `${fmt(area)} sq cm` : `${fmt(circ)} cm`,
      wrong: askArea
        ? [
            { value: `${fmt(circ)} sq cm`, reason: "Used 2πr (circumference) - area is πr²." },
            { value: `${fmt((22 / 7) * (2 * r) ** 2)} sq cm`, reason: "Used the diameter instead of the radius." },
            { value: `${fmt((22 / 7) * r)} sq cm`, reason: "Forgot to square the radius." },
          ]
        : [
            { value: `${fmt(area)} cm`, reason: "Used πr² (area) - circumference is 2πr." },
            { value: `${fmt((22 / 7) * r)} cm`, reason: "Forgot the 2 in 2πr." },
            { value: `${fmt((22 / 7) * 4 * r)} cm`, reason: "Used 2 × diameter." },
          ],
      explanation: askArea ? `Area = πr² = 22/7 × ${r}² = ${fmt(area)} sq cm.` : `Circumference = 2πr = 2 × 22/7 × ${r} = ${fmt(circ)} cm.`,
      hint: askArea ? "Area = πr²." : "Circumference = 2πr.",
    });
  }));
  add(take(8, () => {
    const R = pick([14, 21, 28, 35]);
    const r = R - 7;
    const ring = (22 / 7) * (R * R - r * r);
    return mcq({
      skillId: "QNT.GEO.CIRCLES", level: 4,
      prompt: `A circular garden of radius ${r} m has a path 7 m wide all around it. What is the area of the path? (Use π = 22/7.)`,
      answer: `${fmt(ring)} sq m`,
      wrong: [
        { value: `${fmt((22 / 7) * R * R)} sq m`, reason: "Gave the area of the whole circle including the garden." },
        { value: `${fmt((22 / 7) * 7 * 7)} sq m`, reason: "Treated the path as a circle of radius 7." },
        { value: `${fmt((22 / 7) * (R - r) ** 2 * 2)} sq m`, reason: "Subtracted the radii before squaring." },
      ],
      explanation: `Path = π(R² − r²) = 22/7 × (${R}² − ${r}²) = ${fmt(ring)} sq m.`,
      hint: "Big circle minus small circle.",
    });
  }));
  add(take(12, () => {
    const [dx, dy, d] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]]);
    const [x1, y1] = [int(-5, 6), int(-5, 6)];
    const [x2, y2] = [x1 + dx * pick([1, -1]), y1 + dy * pick([1, -1])];
    const pt = (x, y) => `(${x}, ${y})`;
    return mcq({
      skillId: "QNT.GEO.COORD", level: 3,
      prompt: `What is the distance between the points ${pt(x1, y1)} and ${pt(x2, y2)}?`,
      answer: d,
      wrong: [
        { value: dx + dy, reason: "Added the differences - use √(Δx² + Δy²)." },
        { value: fmt(Math.abs(dx * dx - dy * dy) ** 0.5), reason: "Subtracted the squares." },
        { value: dx * dx + dy * dy, reason: "Forgot the square root." },
      ],
      explanation: `√((${x2} − ${par(x1)})² + (${y2} − ${par(y1)})²) = √(${dx * dx} + ${dy * dy}) = ${d}.`,
      hint: "Distance = √(Δx² + Δy²).",
    });
  }));
  add(take(10, () => {
    const [x1, y1, x2, y2] = [int(-8, 8), int(-8, 8), int(-8, 8), int(-8, 8)];
    if ((x1 + x2) % 2 || (y1 + y2) % 2 || (x1 === x2 && y1 === y2)) return null;
    const m = `(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`;
    return mcq({
      skillId: "QNT.GEO.COORD", level: 2,
      prompt: `What is the midpoint of the line joining (${x1}, ${y1}) and (${x2}, ${y2})?`,
      answer: m,
      wrong: [
        { value: `(${x1 + x2}, ${y1 + y2})`, reason: "Added the coordinates but forgot to halve them." },
        { value: `(${(x2 - x1) / 2}, ${(y2 - y1) / 2})`, reason: "Halved the differences - that's half the step, not the midpoint." },
        { value: `(${(y1 + y2) / 2}, ${(x1 + x2) / 2})`, reason: "Swapped x and y." },
      ],
      explanation: `Midpoint = ((x₁ + x₂)/2, (y₁ + y₂)/2) = ${m}.`,
      hint: "Average the x values and average the y values.",
    });
  }));

  // ------------------------------------------------ Probability & counting
  add(take(12, () => {
    const n = int(3, 7);
    const word = ["TEAM", "CALL", "DESK", "PLANT", "MOUSE", "GRAPH", "CHAIR", "BRICK", "LAMP", "SPORT", "TRAIN"].filter((w) => w.length === n && new Set(w).size === n);
    if (!word.length) return null;
    const w = pick(word);
    return mcq({
      skillId: "QNT.PRB.PERMCOMB", level: 3,
      prompt: `In how many different ways can the letters of the word ${w} be arranged?`,
      answer: factorial(n),
      wrong: [
        { value: n * n, reason: `Used ${n}² - arrangements of ${n} different letters are ${n}!.` },
        { value: factorial(n - 1), reason: `Used (${n} − 1)! - that's for arranging around a circle.` },
        { value: 2 ** n, reason: "Used 2ⁿ - that counts subsets, not arrangements." },
      ],
      explanation: `${n} different letters: ${n}! = ${factorial(n)} arrangements.`,
      hint: "n different items can be arranged in n! ways.",
    });
  }));
  add(take(12, () => {
    const n = int(6, 12);
    const r = int(2, 4);
    return mcq({
      skillId: "QNT.PRB.PERMCOMB", level: 4,
      prompt: `A team of ${r} is to be chosen from ${n} people. In how many ways can this be done?`,
      answer: nCr(n, r),
      wrong: [
        { value: factorial(n) / factorial(n - r), reason: "Counted ordered arrangements (permutations) - a team's order doesn't matter." },
        { value: n * r, reason: "Multiplied n by r." },
        { value: nCr(n, r - 1), reason: `Chose ${r - 1} people instead of ${r}.` },
      ],
      explanation: `Order doesn't matter: ${n}C${r} = ${nCr(n, r)}.`,
      hint: "Choosing (not arranging) → combinations.",
    });
  }));
  add(take(10, () => {
    const n = int(5, 25);
    return mcq({
      skillId: "QNT.PRB.PERMCOMB", level: 3,
      prompt: `At a meeting, each of ${n} people shakes hands with every other person exactly once. How many handshakes are there?`,
      answer: (n * (n - 1)) / 2,
      wrong: [
        { value: n * (n - 1), reason: "Counted each handshake twice - divide by 2." },
        { value: n * n, reason: "Used n² - each pair shakes hands once, so it is n(n − 1)/2." },
        { value: n - 1, reason: "Counted one person's handshakes only." },
      ],
      explanation: `Each pair shakes once: ${n}C2 = ${n} × ${n - 1} / 2 = ${(n * (n - 1)) / 2}.`,
      hint: "Count pairs of people.",
    });
  }));
  add(take(14, () => {
    const [r, b, g] = [int(1, 8), int(1, 8), int(1, 8)];
    const t = r + b + g;
    const col = pick([["red", r], ["blue", b], ["green", g]]);
    return mcq({
      skillId: "QNT.PRB.PROBABILITY", level: 2,
      prompt: `A bag has ${r} red, ${b} blue and ${g} green balls. One ball is picked at random. What is the probability that it is ${col[0]}?`,
      answer: frac(col[1], t),
      wrong: [
        { value: frac(col[1], t - col[1]) === frac(col[1], t) ? `${col[1] + 1}/${t}` : frac(col[1], t - col[1]), reason: "Divided by the OTHER balls only - divide by all the balls." },
        { value: frac(t - col[1], t), reason: `Gave the probability of NOT ${col[0]}.` },
        { value: "1/3", reason: "Three colours doesn't mean each is equally likely - count the balls." },
      ].filter((w) => w.value !== frac(col[1], t)),
      explanation: `${col[1]} ${col[0]} out of ${t} balls: ${col[1]}/${t}${frac(col[1], t) === `${col[1]}/${t}` ? "" : ` = ${frac(col[1], t)}`}.`,
      hint: "Favourable outcomes ÷ total outcomes.",
    });
  }));
  add(take(10, () => {
    const s = int(2, 12);
    let ways = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === s) ways++;
    return mcq({
      skillId: "QNT.PRB.PROBABILITY", level: 4,
      prompt: `Two fair dice are rolled. What is the probability that the total is ${s}?`,
      answer: frac(ways, 36),
      wrong: [
        { value: "1/11", reason: "The 11 possible totals are not equally likely - count the 36 outcomes." },
        { value: frac(ways, 12) === frac(ways, 36) ? "1/6" : frac(ways, 12), reason: "Divided by 12 - there are 6 × 6 = 36 outcomes." },
        { value: frac(Math.min(36, ways + 1), 36), reason: "Miscounted the pairs." },
      ].filter((w) => w.value !== frac(ways, 36)),
      explanation: `${ways} of the 36 equally likely outcomes give ${s}: ${ways}/36${frac(ways, 36) === `${ways}/36` ? "" : ` = ${frac(ways, 36)}`}.`,
      hint: "List the pairs that add up to the total.",
    });
  }));
  add(take(8, () => {
    const n = int(2, 5);
    return mcq({
      skillId: "QNT.PRB.PROBABILITY", level: 3,
      prompt: `A fair coin is tossed ${n} times. What is the probability of getting at least one head?`,
      answer: frac(2 ** n - 1, 2 ** n),
      wrong: [
        { value: frac(1, 2 ** n), reason: "That's the probability of NO heads (all tails)." },
        { value: "1/2", reason: "Each toss is ½, but 'at least one' over several tosses is much more likely." },
        { value: frac(n, 2 ** n), reason: "Counted only exactly-one-head outcomes." },
      ],
      explanation: `P(at least one head) = 1 − P(all tails) = 1 − 1/${2 ** n} = ${frac(2 ** n - 1, 2 ** n)}.`,
      hint: "Use 1 − P(none).",
    });
  }));
  add(take(12, () => {
    const len = pick([5, 7, 9]);
    const nums = Array.from({ length: len }, () => int(10, 99));
    const sorted = [...nums].sort((a, b) => a - b);
    const median = sorted[(len - 1) / 2];
    if (new Set(nums).size < len) return null;
    return mcq({
      skillId: "QNT.PRB.STATS", level: 2,
      prompt: `What is the median of: ${nums.join(", ")}?`,
      answer: median,
      wrong: [
        { value: nums[(len - 1) / 2], reason: "Took the middle value without sorting the list first." },
        { value: fmt(nums.reduce((s, x) => s + x, 0) / len), reason: "Gave the mean (average), not the median." },
        { value: sorted[len - 1] - sorted[0], reason: "Gave the range." },
      ],
      explanation: `Sorted: ${sorted.join(", ")}. The middle value is ${median}.`,
      hint: "Sort first, then take the middle value.",
    });
  }));
  add(take(10, () => {
    const vals = Array.from({ length: 6 }, () => int(1, 9));
    const mode = int(1, 9);
    const list = [...vals, mode, mode, mode];
    const counts = {};
    for (const v of list) counts[v] = (counts[v] ?? 0) + 1;
    const max = Math.max(...Object.values(counts));
    const modes = Object.keys(counts).filter((k) => counts[k] === max);
    if (modes.length > 1) return null;
    const shuffled = sample(list, list.length);
    const sorted = [...list].sort((a, b) => a - b);
    return mcq({
      skillId: "QNT.PRB.STATS", level: 2,
      prompt: `What is the mode of: ${shuffled.join(", ")}?`,
      answer: modes[0],
      wrong: [
        { value: sorted[4], reason: "Gave the median - the mode is the value that appears most often." },
        { value: fmt(list.reduce((s, x) => s + x, 0) / list.length), reason: "Gave the mean." },
        { value: max, reason: "Gave how many times the mode appears, not the value itself." },
      ],
      explanation: `${modes[0]} appears ${max} times - more than any other value.`,
      hint: "The mode is the most frequent value.",
    });
  }));

  // ------------------------------------------------ Mental maths
  add(take(14, () => {
    const a = int(12, 99);
    const b = int(11, 29);
    return mcq({
      skillId: "QNT.MEN.SPEED", level: 2,
      prompt: `Work out ${a} × ${b} in your head.`,
      answer: a * b,
      wrong: [
        { value: a * b + 10, reason: "Carrying slip - check the tens." },
        { value: a * (b - 10) + a, reason: `Multiplied by ${b - 10} and added ${a} once instead of ${a} × 10.` },
        { value: a * b - a, reason: `Multiplied by ${b - 1} instead of ${b}.` },
      ],
      explanation: `${a} × ${b} = ${a} × ${b - (b % 10)} + ${a} × ${b % 10} = ${a * (b - (b % 10))} + ${a * (b % 10)} = ${a * b}.`,
      hint: "Split one number into tens and units.",
    });
  }));
  add(take(10, () => {
    const t = int(2, 19);
    const n = t * 10 + 5;
    return mcq({
      skillId: "QNT.MEN.SPEED", level: 2,
      prompt: `Quickly: what is ${n}²?`,
      answer: n * n,
      wrong: [
        { value: t * t * 100 + 25, reason: `Used ${t} × ${t} - the trick is ${t} × ${t + 1}, then add 25.` },
        { value: n * 2, reason: "Doubled instead of squaring." },
        { value: t * (t + 1) * 100 + 5, reason: "End with 25, not 5." },
      ],
      explanation: `For numbers ending in 5: ${t} × ${t + 1} = ${t * (t + 1)}, then write 25 → ${n * n}.`,
      hint: "Tens digit × (tens digit + 1), then 25.",
    });
  }));
  add(take(12, () => {
    const a = int(20, 90) + pick([-0.2, -0.1, 0.1, 0.2, 0.3]);
    const b = int(10, 60) + pick([-0.2, -0.1, 0.1, 0.2]);
    const est = Math.round(a) * Math.round(b);
    const exact = a * b;
    const spread = Math.max(50, Math.round(est * 0.25 / 10) * 10);
    return mcq({
      skillId: "QNT.MEN.APPROX", level: 2,
      prompt: `Which is the closest approximate value of ${fmt(a)} × ${fmt(b)}?`,
      answer: est,
      wrong: [
        { value: est + spread, reason: "Too high - round each number first, then multiply." },
        { value: Math.max(1, est - spread), reason: "Too low - round each number first, then multiply." },
        { value: Math.round(a) + Math.round(b), reason: "Added instead of multiplying." },
      ],
      explanation: `${fmt(a)} ≈ ${Math.round(a)} and ${fmt(b)} ≈ ${Math.round(b)}; ${Math.round(a)} × ${Math.round(b)} = ${est} (exact: ${fmt(exact)}).`,
      hint: "Round to the nearest whole number first.",
    });
  }));
  add(take(10, () => {
    const q = pick([198, 199, 201, 202, 298, 301, 399, 402, 499, 501]);
    const price = pick([19.5, 24.9, 49.5, 99, 149, 199]);
    const est = Math.round(q / 100) * 100 * Math.round(price / 5) * 5;
    const spread = Math.round(est * 0.3);
    return mcq({
      skillId: "QNT.MEN.ESTIMATE", level: 3,
      prompt: `A shop sells ${q} items at ₹${price} each. Roughly how much money does it take in?`,
      answer: `about ₹${est.toLocaleString("en-IN")}`,
      wrong: [
        { value: `about ₹${(est + spread).toLocaleString("en-IN")}`, reason: "Overestimate - round both numbers to easy values first." },
        { value: `about ₹${Math.max(100, est - spread).toLocaleString("en-IN")}`, reason: "Underestimate - round both numbers to easy values first." },
        { value: `about ₹${(est * 10).toLocaleString("en-IN")}`, reason: "Out by a factor of 10 - check the place values." },
      ],
      explanation: `${q} ≈ ${Math.round(q / 100) * 100} and ₹${price} ≈ ₹${Math.round(price / 5) * 5}, so about ₹${est.toLocaleString("en-IN")} (exact ₹${(q * price).toLocaleString("en-IN")}).`,
      hint: "Round to friendly numbers, then multiply.",
    });
  }));

  // ------------------------------------------------ Expert (L5) multi-step
  add(take(10, () => {
    const p = pick([1000, 2000, 5000, 8000, 10000]);
    const r = pick([10, 20]);
    const ci = p * (1 + r / 100) ** 3 - p;
    return mcq({
      skillId: "QNT.COM.INTEREST", level: 5,
      prompt: `What is the compound interest on ₹${p.toLocaleString("en-IN")} at ${r}% per year for 3 years, compounded yearly?`,
      answer: rupees(Math.round(ci * 100) / 100),
      wrong: [
        { value: rupees((3 * p * r) / 100), reason: "Used simple interest - compound interest earns interest on interest." },
        { value: rupees(Math.round((p + ci) * 100) / 100), reason: "Gave the final amount, not the interest." },
        { value: rupees(Math.round((p * (1 + r / 100) ** 2 - p) * 100) / 100), reason: "Compounded for only 2 years." },
      ],
      explanation: `Amount = ${p.toLocaleString("en-IN")} × (1 + ${r}/100)³ = ${rupees(Math.round((p + ci) * 100) / 100)}. Interest = ${rupees(Math.round(ci * 100) / 100)}.`,
      hint: "Multiply by (1 + r/100) once for each year.",
    });
  }));
  add(take(10, () => {
    const V = pick([40, 50, 60, 80, 100]);
    const x = pick([4, 5, 8, 10, 20].filter((v) => v < V / 2));
    const left = V * (1 - x / V) ** 2;
    return mcq({
      skillId: "QNT.COM.MIXTURES", level: 5,
      prompt: `A container holds ${V} litres of milk. ${x} litres are taken out and replaced with water. This is done once more. How much milk is left?`,
      answer: `${fmt(left)} litres`,
      wrong: [
        { value: `${V - 2 * x} litres`, reason: "Subtracted twice - the second time, what's removed is already part water." },
        { value: `${fmt(V * (1 - x / V))} litres`, reason: "Did the replacement only once." },
        { value: `${fmt(V * (1 - x / V) ** 3)} litres`, reason: "Did the replacement three times." },
      ],
      explanation: `Each round keeps ${V - x}/${V} of the milk: ${V} × (${V - x}/${V})² = ${fmt(left)} litres.`,
      hint: "Milk left = original × (1 − removed/total)^(number of rounds).",
    });
  }));
  add(take(10, () => {
    const [l1, l2] = [pick([100, 120, 150, 200]), pick([80, 100, 150, 180])];
    const [s1, s2] = pick([[72, 36], [90, 54], [108, 72], [54, 36], [81, 45]]);
    const secs = (l1 + l2) / (((s1 - s2) * 5) / 18);
    return mcq({
      skillId: "QNT.TIM.TRAINS", level: 5,
      prompt: `A ${l1} m train at ${s1} km/h overtakes a ${l2} m train moving in the same direction at ${s2} km/h. How long does the overtaking take?`,
      answer: `${fmt(secs)} seconds`,
      wrong: [
        { value: `${fmt((l1 + l2) / (((s1 + s2) * 5) / 18))} seconds`, reason: "Added the speeds - trains going the SAME way use the difference." },
        { value: `${fmt(l1 / (((s1 - s2) * 5) / 18))} seconds`, reason: "Used only the faster train's length." },
        { value: `${fmt((l1 + l2) / (s1 - s2))} seconds`, reason: "Didn't convert km/h to m/s." },
      ],
      explanation: `Relative speed = ${s1} − ${s2} = ${s1 - s2} km/h = ${fmt(((s1 - s2) * 5) / 18)} m/s. Distance = ${l1 + l2} m. Time = ${fmt(secs)} s.`,
      hint: "Same direction: subtract the speeds.",
    });
  }));
  add(take(10, () => {
    const [a, b] = pick([[10, 15], [12, 18], [20, 30], [15, 20], [12, 24], [18, 36]]);
    const k = pick([2, 3, 4, 5]);
    const rem = 1 - k * (1 / a + 1 / b);
    if (rem <= 0) return null;
    const t = rem * b;
    return mcq({
      skillId: "QNT.TIM.WORK", level: 5,
      prompt: `Amit can finish a report in ${a} days and Bina in ${b} days. They work together for ${k} days, then Amit leaves. How many more days does Bina need to finish it?`,
      answer: `${fmt(t)} days`,
      wrong: [
        { value: `${fmt(b - k)} days`, reason: "Subtracted the days worked - but for those days Amit was helping too." },
        { value: `${fmt(rem * a)} days`, reason: "Used Amit's rate for the remaining work." },
        { value: `${fmt((a * b) / (a + b))} days`, reason: "Gave the time for the whole job together." },
      ],
      explanation: `Together they do ${k} × (1/${a} + 1/${b}) = ${frac(k * (a + b), a * b)} of the work, leaving ${frac(a * b - k * (a + b), a * b)}. Bina alone: ${frac(a * b - k * (a + b), a * b)} × ${b} = ${fmt(t)} days.`,
      hint: "Work out how much is left, then use Bina's rate alone.",
    });
  }));
  add(take(10, () => {
    const r = int(3, 7);
    const o = int(2, 7);
    const t = r + o;
    const both = frac(r * (r - 1), t * (t - 1));
    return mcq({
      skillId: "QNT.PRB.PROBABILITY", level: 5,
      prompt: `A box has ${r} red and ${o} white cards. Two cards are drawn one after the other without putting the first back. What is the probability that both are red?`,
      answer: both,
      wrong: [
        { value: frac(r * r, t * t), reason: "Assumed the first card is put back - without replacement, the second draw has one fewer red and one fewer card." },
        { value: frac(r, t), reason: "Gave the probability for one card only." },
        { value: frac(r - 1, t - 1), reason: "Gave only the second draw's chance - multiply by the first draw's chance too." },
      ],
      explanation: `P = ${r}/${t} × ${r - 1}/${t - 1} = ${both}.`,
      hint: "Multiply the chance for the first card by the chance for the second (with one card gone).",
    });
  }));
  add(take(8, () => {
    const w = pick(["PLANET", "MOBILE", "GARDEN", "COURSE", "MONDAY", "SECTOR", "EQUAL", "FRIDGE", "BRAINS", "CLOUDS"]);
    const letters = w.split("");
    if (new Set(letters).size !== letters.length) return null;
    const v = letters.filter((c) => "AEIOU".includes(c)).length;
    const c = letters.length - v;
    const ans = factorial(c + 1) * factorial(v);
    return mcq({
      skillId: "QNT.PRB.PERMCOMB", level: 5,
      prompt: `In how many ways can the letters of ${w} be arranged so that all the vowels stay together?`,
      answer: ans,
      wrong: [
        { value: factorial(letters.length), reason: "Counted every arrangement, without keeping the vowels together." },
        { value: factorial(c + 1), reason: "Treated the vowels as one block but forgot to arrange the vowels inside it." },
        { value: factorial(c) * factorial(v), reason: "Forgot that the vowel block also moves among the consonants: (consonants + 1)!." },
      ],
      explanation: `Treat the ${v} vowels as one block: ${c} consonants + 1 block = ${c + 1} items → ${c + 1}! ways; vowels inside the block → ${v}! ways. Total ${factorial(c + 1)} × ${factorial(v)} = ${ans}.`,
      hint: "Glue the vowels into one block, then arrange.",
    });
  }));
  add(take(10, () => {
    const r = pick([10, 20, 25, 50, 60, 100]);
    const less = (r / (100 + r)) * 100;
    return mcq({
      skillId: "QNT.COM.PERCENT", level: 5,
      prompt: `Priya's salary is ${r}% more than Karan's. By what percentage is Karan's salary less than Priya's?`,
      answer: `${fmt(less)}%`,
      wrong: [
        { value: `${r}%`, reason: "The base changes - 'less than Priya's' is measured against Priya's (bigger) salary." },
        { value: `${fmt((r / (100 - r)) * 100)}%`, reason: "Divided by (100 − r) instead of (100 + r)." },
        { value: `${fmt(r / 2)}%`, reason: "Halved the percentage - there's no such rule." },
      ],
      explanation: `Take Karan = 100, Priya = ${100 + r}. Difference ${r} on a base of ${100 + r}: ${r}/${100 + r} × 100 = ${fmt(less)}%.`,
      hint: "Assume Karan earns 100.",
    });
  }));
  add(take(10, () => {
    const n = pick([9, 11, 13]);
    const half = (n + 1) / 2;
    const avg = int(40, 70);
    const a1 = avg + int(-4, -1);
    const a2 = avg + int(1, 5);
    const mid = half * a1 + half * a2 - n * avg;
    if (mid <= 0) return null;
    return mcq({
      skillId: "QNT.COM.AVERAGES", level: 5,
      prompt: `The average of ${n} results is ${avg}. The average of the first ${half} is ${a1} and the average of the last ${half} is ${a2}. What is the ${half}th (middle) result?`,
      answer: mid,
      wrong: [
        { value: fmt((a1 + a2) / 2), reason: "Averaged the two averages - the middle result is counted in both groups." },
        { value: half * a1 + half * a2, reason: "Forgot to subtract the total of all the results." },
        { value: avg, reason: "The middle result isn't necessarily the overall average." },
      ],
      explanation: `First ${half} total ${half * a1}, last ${half} total ${half * a2}; together ${half * a1 + half * a2}, which counts the middle result twice. All ${n}: ${n * avg}. Middle = ${half * a1 + half * a2} − ${n * avg} = ${mid}.`,
      hint: "The middle result is counted in both groups.",
    });
  }));
  add(take(10, () => {
    const a = int(2, 10);
    const d = int(2, 6);
    const n = int(8, 20);
    const S = (n / 2) * (2 * a + (n - 1) * d);
    return mcq({
      skillId: "QNT.ALG.PROGRESSIONS", level: 5,
      prompt: `How many terms of the series ${a}, ${a + d}, ${a + 2 * d}, … must be added to get a total of ${S}?`,
      answer: n,
      wrong: [
        { value: n + 1, reason: "One term too many - check with Sₙ = n/2 × [2a + (n − 1)d]." },
        { value: n - 1, reason: "One term too few." },
        { value: Math.round(S / a), reason: "Divided the total by the first term - the terms grow." },
      ],
      explanation: `Sₙ = n/2 × [2 × ${a} + (n − 1) × ${d}] = ${S} gives n = ${n}.`,
      hint: "Try the sum formula, or add terms until you reach the total.",
    });
  }));
  add(take(10, () => {
    const [p, q] = pick([[3, 5], [2, 5], [3, 4], [4, 7], [2, 3], [5, 8]]);
    const x = q * int(4, 20);
    const diff = x - (x * p) / q;
    return mcq({
      skillId: "QNT.ALG.LINEAR", level: 3,
      prompt: `A number is ${diff} more than ${p}/${q} of itself. What is the number?`,
      answer: x,
      wrong: [
        { value: fmt((diff * q) / p), reason: `Divided by ${p}/${q} - the gap is (1 − ${p}/${q}) of the number.` },
        { value: fmt((x * p) / q), reason: `Gave ${p}/${q} of the number.` },
        { value: diff * 2, reason: "Doubled the difference." },
      ],
      explanation: `x − ${p}/${q}·x = ${diff} → (${q - p}/${q})x = ${diff} → x = ${x}.`,
      hint: "The difference is (1 − fraction) of the number.",
    });
  }));

  return Q;
}
