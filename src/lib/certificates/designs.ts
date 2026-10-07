// The certificate designs: 12 original layouts x 5 colour schemes = 60
// choices. Each layout is drawn here as SVG (A4 landscape, 842 x 595 pt),
// the single source for both the on-screen preview and the print-ready PDF
// (rendered by pdf.ts with svg-to-pdfkit). Browser-safe: no Node imports.
//
// Licences: every layout, ornament and colour scheme here is an original
// VocalisAi design made in code - no third-party template or artwork. The
// fonts are SIL Open Font License 1.1 families from Google Fonts; their
// licence files are in ./fonts/licenses and are listed in FONT_LICENCES.

import QRCode from "qrcode";

export const PAGE = { width: 842, height: 595 };

export type FontKey =
  | "cinzel"
  | "cormorant"
  | "dmserif"
  | "greatvibes"
  | "instrument"
  | "inter"
  | "interBold"
  | "baskerville"
  | "baskervilleBold"
  | "montserrat"
  | "montserratBold"
  | "pinyon"
  | "playfair";

/** Font files (in ./fonts) for each key, with the source and licence of every family. */
export const FONT_FILES: Record<FontKey, string> = {
  cinzel: "Cinzel-600.ttf",
  cormorant: "CormorantGaramond-600.ttf",
  dmserif: "DMSerifDisplay-400.ttf",
  greatvibes: "GreatVibes-400.ttf",
  instrument: "InstrumentSerif-400.ttf",
  inter: "Inter-400.ttf",
  interBold: "Inter-600.ttf",
  baskerville: "LibreBaskerville-400.ttf",
  baskervilleBold: "LibreBaskerville-700.ttf",
  montserrat: "Montserrat-500.ttf",
  montserratBold: "Montserrat-700.ttf",
  pinyon: "PinyonScript-400.ttf",
  playfair: "PlayfairDisplay-700.ttf",
};

/** The weight of each font file, so the browser preview picks the same cut as the PDF. */
const FONT_WEIGHTS: Partial<Record<FontKey, number>> = { cinzel: 600, cormorant: 600, interBold: 600, baskervilleBold: 700, montserrat: 500, montserratBold: 700, playfair: 700 };

export const FONT_LICENCES = [
  "Cinzel", "Cormorant Garamond", "DM Serif Display", "Great Vibes", "Instrument Serif", "Inter",
  "Libre Baskerville", "Montserrat", "Pinyon Script", "Playfair Display",
].map((family) => ({ family, licence: "SIL Open Font License 1.1", source: "Google Fonts (fonts.google.com / github.com/google/fonts)" }));

export interface Palette {
  id: string;
  name: string;
  primary: string; // frames, headings
  accent: string; // metallic / highlight
  paper: string;
  soft: string; // tinted panels
  ink: string;
  muted: string;
}

export const PALETTES: Palette[] = [
  { id: "navy", name: "Navy & gold", primary: "#1d2b4f", accent: "#b8862f", paper: "#fffdf8", soft: "#f3ecdf", ink: "#1d2433", muted: "#5b6475" },
  { id: "emerald", name: "Emerald", primary: "#134e3a", accent: "#b0903a", paper: "#fbfdf9", soft: "#e6efe8", ink: "#17261f", muted: "#55675d" },
  { id: "burgundy", name: "Burgundy", primary: "#6b1f2a", accent: "#c19a4b", paper: "#fffaf5", soft: "#f4e6e1", ink: "#2a1a1c", muted: "#6d5a5c" },
  { id: "teal", name: "Slate & teal", primary: "#23313f", accent: "#1f8a8a", paper: "#ffffff", soft: "#e5f1f1", ink: "#1f2a33", muted: "#5c6b77" },
  { id: "vocalis", name: "VocalisAi amber", primary: "#24221f", accent: "#b8862f", paper: "#fffdf9", soft: "#f5ebd7", ink: "#24221f", muted: "#6b645a" },
];

export interface CertificateView {
  recipientName: string;
  testName: string;
  kind: "ACHIEVEMENT" | "COMPLETION";
  score: number | null;
  completedAt: Date | string;
  code: string;
  verifyUrl: string;
}

type Fonts = Record<FontKey, string>;
interface Ctx {
  v: CertificateView;
  p: Palette;
  f: Fonts;
}

// --- Small helpers ------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function formatCertificateDate(d: Date | string): string {
  const x = new Date(d);
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

interface TextOpts {
  font: FontKey;
  size: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
}
function text(c: Ctx, x: number, y: number, s: string, o: TextOpts): string {
  return `<text x="${x}" y="${y}" font-family="${esc(c.f[o.font])}" font-weight="${FONT_WEIGHTS[o.font] ?? 400}" font-size="${o.size.toFixed(1)}" fill="${o.fill}" text-anchor="${o.anchor ?? "middle"}"${o.spacing ? ` letter-spacing="${o.spacing}"` : ""}>${esc(s)}</text>`;
}

/** A font size that keeps `s` within `maxWidth` (glyph width estimated per font). */
function fit(s: string, maxWidth: number, base: number, widthPerEm = 0.52): number {
  return Math.max(12, Math.min(base, maxWidth / Math.max(1, s.length * widthPerEm)));
}

const title = (c: Ctx) => (c.v.kind === "ACHIEVEMENT" ? "Achievement" : "Completion");
const statement = (c: Ctx) => (c.v.kind === "ACHIEVEMENT" ? "for outstanding performance in" : "for successfully completing");
const scoreLine = (c: Ctx) => (c.v.score === null ? "" : `with a score of ${c.v.score} / 100`);
const date = (c: Ctx) => formatCertificateDate(c.v.completedAt);
const host = (c: Ctx) => c.v.verifyUrl.replace(/^https?:\/\//, "");

function qr(c: Ctx, x: number, y: number, size: number, dark = c.p.ink, light = "#ffffff"): string {
  const m = QRCode.create(c.v.verifyUrl, { errorCorrectionLevel: "M" }).modules;
  const cell = size / (m.size + 2);
  let d = "";
  for (let r = 0; r < m.size; r++) for (let col = 0; col < m.size; col++) if (m.data[r * m.size + col]) d += `M${(x + (col + 1) * cell).toFixed(2)} ${(y + (r + 1) * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${light}"/><path d="${d}" fill="${dark}"/>`;
}

/** The VocalisAi mark: an amber tile with a microphone, then the wordmark. */
function brand(c: Ctx, x: number, y: number, opts: { anchor?: "start" | "middle"; onDark?: boolean; scale?: number } = {}): string {
  const s = opts.scale ?? 1;
  const word = 104 * s;
  const left = opts.anchor === "middle" ? x - (26 * s + 8 * s + word) / 2 : x;
  const t = 26 * s;
  const ink = opts.onDark ? "#ffffff" : c.p.ink;
  return `<g>
  <rect x="${left}" y="${y - t + 6 * s}" width="${t}" height="${t}" rx="${6 * s}" fill="#b8862f"/>
  <rect x="${left + t / 2 - 3.5 * s}" y="${y - t + 11 * s}" width="${7 * s}" height="${11 * s}" rx="${3.5 * s}" fill="#ffffff"/>
  <path d="M${left + t / 2 - 6.5 * s} ${y - 9 * s} a${6.5 * s} ${6.5 * s} 0 0 0 ${13 * s} 0" fill="none" stroke="#ffffff" stroke-width="${1.6 * s}"/>
  <rect x="${left + t / 2 - 0.8 * s}" y="${y - 3 * s}" width="${1.6 * s}" height="${4 * s}" fill="#ffffff"/>
  ${text(c, left + t + 8 * s, y, "Vocalis", { font: "interBold", size: 19 * s, fill: ink, anchor: "start" })}
  ${text(c, left + t + 8 * s + 68 * s, y, "Ai", { font: "interBold", size: 19 * s, fill: "#b8862f", anchor: "start" })}
</g>`;
}

function signature(c: Ctx, cx: number, y: number, opts: { width?: number; script?: FontKey; ink?: string; line?: string } = {}): string {
  const w = opts.width ?? 190;
  return `${text(c, cx, y - 8, "VocalisAi Assessment Team", { font: opts.script ?? "pinyon", size: 21, fill: opts.ink ?? c.p.primary })}
<line x1="${cx - w / 2}" y1="${y}" x2="${cx + w / 2}" y2="${y}" stroke="${opts.line ?? c.p.muted}" stroke-width="0.8"/>
${text(c, cx, y + 14, "AUTHORISED SIGNATURE", { font: "inter", size: 7.5, fill: opts.ink ?? c.p.muted, spacing: 1.5 })}`;
}

function labelled(c: Ctx, x: number, y: number, label: string, value: string, anchor: "start" | "middle" | "end" = "middle", ink = c.p.ink, muted = c.p.muted): string {
  return `${text(c, x, y, label, { font: "inter", size: 7.5, fill: muted, anchor, spacing: 1.5 })}${text(c, x, y + 16, value, { font: "interBold", size: 11, fill: ink, anchor })}`;
}

function verifyBlock(c: Ctx, x: number, y: number, size = 64, anchor: "start" | "end" = "start", ink = c.p.muted): string {
  const tx = anchor === "start" ? x + size + 10 : x - size - 10;
  const qx = anchor === "start" ? x : x - size;
  return `${qr(c, qx, y, size)}
${text(c, tx, y + size / 2 - 6, "Certificate ID", { font: "inter", size: 7.5, fill: ink, anchor, spacing: 1 })}
${text(c, tx, y + size / 2 + 8, c.v.code, { font: "interBold", size: 10, fill: c.p.ink === ink ? ink : c.p.ink, anchor })}
${text(c, tx, y + size / 2 + 21, `Verify: ${host(c)}`, { font: "inter", size: 6.5, fill: ink, anchor })}`;
}

// --- The 12 layouts ------------------------------------------------------------

type Layout = { id: string; name: string; draw: (c: Ctx) => string };

const W = PAGE.width;
const H = PAGE.height;
const CX = W / 2;

const LAYOUTS: Layout[] = [
  {
    id: "classic",
    name: "Classic border",
    draw: (c) => `
<rect width="${W}" height="${H}" fill="${c.p.paper}"/>
<rect x="22" y="22" width="${W - 44}" height="${H - 44}" fill="none" stroke="${c.p.primary}" stroke-width="4"/>
<rect x="32" y="32" width="${W - 64}" height="${H - 64}" fill="none" stroke="${c.p.accent}" stroke-width="1"/>
${[[32, 32], [W - 32, 32], [32, H - 32], [W - 32, H - 32]].map(([x, y]) => `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="${c.p.accent}" transform="rotate(45 ${x} ${y})"/>`).join("")}
${brand(c, CX, 84, { anchor: "middle" })}
${text(c, CX, 150, "CERTIFICATE", { font: "cinzel", size: 40, fill: c.p.primary, spacing: 6 })}
${text(c, CX, 177, `OF ${title(c).toUpperCase()}`, { font: "cinzel", size: 15, fill: c.p.accent, spacing: 5 })}
${text(c, CX, 222, "This certificate is proudly presented to", { font: "cormorant", size: 16, fill: c.p.muted })}
${text(c, CX, 284, c.v.recipientName, { font: "greatvibes", size: fit(c.v.recipientName, 520, 54, 0.42), fill: c.p.primary })}
<line x1="${CX - 210}" y1="300" x2="${CX + 210}" y2="300" stroke="${c.p.accent}" stroke-width="1"/>
${text(c, CX, 330, statement(c), { font: "cormorant", size: 15, fill: c.p.muted })}
${text(c, CX, 362, c.v.testName, { font: "playfair", size: fit(c.v.testName, 600, 23, 0.55), fill: c.p.ink })}
${text(c, CX, 390, scoreLine(c), { font: "inter", size: 12, fill: c.p.ink })}
${verifyBlock(c, 64, 450)}
${labelled(c, CX, 488, "DATE OF COMPLETION", date(c))}
${signature(c, W - 170, 500)}`,
  },
  {
    id: "band",
    name: "Modern band",
    draw: (c) => `
<rect width="${W}" height="${H}" fill="${c.p.paper}"/>
<rect width="238" height="${H}" fill="${c.p.primary}"/>
<rect x="238" width="6" height="${H}" fill="${c.p.accent}"/>
${brand(c, 34, 64, { onDark: true })}
${c.v.score === null
  ? `<circle cx="119" cy="236" r="62" fill="none" stroke="${c.p.accent}" stroke-width="3"/><path d="M92 238 l18 18 l36 -40" fill="none" stroke="#ffffff" stroke-width="7"/>`
  : `<circle cx="119" cy="236" r="62" fill="none" stroke="${c.p.accent}" stroke-width="3"/>${text(c, 119, 246, String(c.v.score), { font: "montserratBold", size: 44, fill: "#ffffff" })}${text(c, 119, 268, "OUT OF 100", { font: "montserrat", size: 8, fill: "#ffffff", spacing: 2 })}`}
${text(c, 119, 334, title(c).toUpperCase(), { font: "montserratBold", size: 11, fill: c.p.accent, spacing: 3 })}
${qr(c, 79, 430, 80, c.p.primary)}
${text(c, 119, 530, c.v.code, { font: "interBold", size: 9, fill: "#ffffff" })}
${text(c, 119, 544, `Verify: ${host(c)}`, { font: "inter", size: 6.5, fill: "#ffffff" })}
${text(c, 300, 110, `CERTIFICATE OF ${title(c).toUpperCase()}`, { font: "montserratBold", size: 13, fill: c.p.accent, anchor: "start", spacing: 4 })}
${text(c, 300, 168, "Presented to", { font: "montserrat", size: 13, fill: c.p.muted, anchor: "start" })}
${text(c, 300, 222, c.v.recipientName, { font: "playfair", size: fit(c.v.recipientName, 480, 44, 0.55), fill: c.p.ink, anchor: "start" })}
<rect x="300" y="240" width="70" height="4" fill="${c.p.accent}"/>
${text(c, 300, 290, statement(c), { font: "montserrat", size: 13, fill: c.p.muted, anchor: "start" })}
${text(c, 300, 322, c.v.testName, { font: "montserratBold", size: fit(c.v.testName, 480, 21, 0.62), fill: c.p.primary, anchor: "start" })}
${text(c, 300, 350, scoreLine(c), { font: "inter", size: 12, fill: c.p.ink, anchor: "start" })}
${labelled(c, 300, 470, "DATE OF COMPLETION", date(c), "start")}
${signature(c, 660, 500, { width: 200 })}`,
  },
  {
    id: "minimal",
    name: "Minimal",
    draw: (c) => `
<rect width="${W}" height="${H}" fill="#ffffff"/>
<rect x="70" y="60" width="${W - 140}" height="2" fill="${c.p.ink}"/>
${brand(c, 70, 100, { scale: 0.85 })}
${text(c, W - 70, 96, c.v.code, { font: "interBold", size: 10, fill: c.p.muted, anchor: "end", spacing: 1 })}
${text(c, 70, 176, `CERTIFICATE OF ${title(c).toUpperCase()}`, { font: "inter", size: 11, fill: c.p.accent, anchor: "start", spacing: 5 })}
${text(c, 70, 252, c.v.recipientName, { font: "instrument", size: fit(c.v.recipientName, 700, 68, 0.45), fill: c.p.ink, anchor: "start" })}
${text(c, 70, 296, `${statement(c)} ${c.v.testName}`, { font: "inter", size: fit(`${statement(c)} ${c.v.testName}`, 700, 15, 0.5), fill: c.p.muted, anchor: "start" })}
${text(c, 70, 320, scoreLine(c) ? `${scoreLine(c).charAt(0).toUpperCase()}${scoreLine(c).slice(1)}.` : "", { font: "inter", size: 13, fill: c.p.ink, anchor: "start" })}
<rect x="70" y="420" width="${W - 140}" height="0.8" fill="${c.p.muted}"/>
${labelled(c, 70, 452, "COMPLETED", date(c), "start")}
${labelled(c, 250, 452, "RESULT", c.v.score === null ? "Completed" : `${c.v.score} / 100`, "start")}
${signature(c, 470, 486, { width: 170, script: "greatvibes" })}
${qr(c, W - 70 - 76, 440, 76)}
${text(c, W - 70, 532, `Verify: ${host(c)}`, { font: "inter", size: 6.5, fill: c.p.muted, anchor: "end" })}`,
  },
  {
    id: "seal",
    name: "Gold seal",
    draw: (c) => `
<rect width="${W}" height="${H}" fill="${c.p.soft}"/>
<rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="${c.p.paper}" stroke="${c.p.accent}" stroke-width="1.5"/>
${brand(c, CX, 82, { anchor: "middle" })}
${text(c, CX, 146, `Certificate of ${title(c)}`, { font: "playfair", size: 36, fill: c.p.primary })}
${text(c, CX, 190, "This is to certify that", { font: "baskerville", size: 13, fill: c.p.muted })}
${text(c, CX, 244, c.v.recipientName, { font: "playfair", size: fit(c.v.recipientName, 560, 40, 0.55), fill: c.p.ink })}
${text(c, CX, 280, statement(c), { font: "baskerville", size: 13, fill: c.p.muted })}
${text(c, CX, 310, c.v.testName, { font: "baskervilleBold", size: fit(c.v.testName, 600, 19, 0.6), fill: c.p.primary })}
<polygon points="${CX - 34},430 ${CX - 50},520 ${CX - 30},506 ${CX - 18},528 ${CX - 6},440" fill="${c.p.primary}"/>
<polygon points="${CX + 34},430 ${CX + 50},520 ${CX + 30},506 ${CX + 18},528 ${CX + 6},440" fill="${c.p.primary}"/>
${Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2;
  return `<circle cx="${(CX + Math.cos(a) * 52).toFixed(1)}" cy="${(404 + Math.sin(a) * 52).toFixed(1)}" r="8" fill="${c.p.accent}"/>`;
}).join("")}
<circle cx="${CX}" cy="404" r="52" fill="${c.p.accent}"/>
<circle cx="${CX}" cy="404" r="42" fill="none" stroke="#ffffff" stroke-width="1"/>
${c.v.score === null
  ? text(c, CX, 410, "VERIFIED", { font: "cinzel", size: 13, fill: "#ffffff", spacing: 1 })
  : `${text(c, CX, 408, String(c.v.score), { font: "playfair", size: 30, fill: "#ffffff" })}${text(c, CX, 424, "OUT OF 100", { font: "inter", size: 6.5, fill: "#ffffff", spacing: 1.5 })}`}
${verifyBlock(c, 64, 456)}
${labelled(c, W - 150, 424, "DATE OF COMPLETION", date(c))}
${signature(c, W - 150, 506, { width: 160 })}`,
  },
  {
    id: "geometry",
    name: "Corner geometry",
    draw: (c) => `
<rect width="${W}" height="${H}" fill="${c.p.paper}"/>
<polygon points="0,0 230,0 0,190" fill="${c.p.primary}"/>
<polygon points="0,0 150,0 0,124" fill="${c.p.accent}" opacity="0.85"/>
<polygon points="${W},${H} ${W - 260},${H} ${W},${H - 210}" fill="${c.p.primary}"/>
<polygon points="${W},${H} ${W - 170},${H} ${W},${H - 138}" fill="${c.p.accent}" opacity="0.85"/>
${brand(c, W - 60 - 138, 76)}
${text(c, CX, 156, "Certificate", { font: "dmserif", size: 50, fill: c.p.primary })}
${text(c, CX, 186, `OF ${title(c).toUpperCase()}`, { font: "montserratBold", size: 12, fill: c.p.accent, spacing: 6 })}
${text(c, CX, 232, "is awarded to", { font: "montserrat", size: 12, fill: c.p.muted })}
${text(c, CX, 286, c.v.recipientName, { font: "dmserif", size: fit(c.v.recipientName, 560, 44, 0.5), fill: c.p.ink })}
<line x1="${CX - 160}" y1="302" x2="${CX + 160}" y2="302" stroke="${c.p.accent}" stroke-width="2"/>
${text(c, CX, 334, statement(c), { font: "montserrat", size: 12, fill: c.p.muted })}
${text(c, CX, 362, c.v.testName, { font: "montserratBold", size: fit(c.v.testName, 600, 19, 0.62), fill: c.p.primary })}
${text(c, CX, 388, scoreLine(c), { font: "inter", size: 12, fill: c.p.ink })}
${verifyBlock(c, 70, 438, 66)}
${labelled(c, CX, 478, "DATE OF COMPLETION", date(c))}
${signature(c, W - 260, 470, { width: 170 })}`,
  },
  {
    id: "diploma",
    name: "Diploma",
    draw: (c) => `
<rect width="${W}" height="${H}" fill="${c.p.soft}"/>
<rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="${c.p.paper}" stroke="${c.p.primary}" stroke-width="1.5"/>
<rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="${c.p.primary}" stroke-width="0.6"/>
${[[40, 40, 0], [W - 40, 40, 90], [W - 40, H - 40, 180], [40, H - 40, 270]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><path d="M${x} ${y + 46} A46 46 0 0 0 ${x + 46} ${y}" fill="none" stroke="${c.p.accent}" stroke-width="1.5"/><path d="M${x} ${y + 30} A30 30 0 0 0 ${x + 30} ${y}" fill="none" stroke="${c.p.accent}" stroke-width="0.8"/><circle cx="${x + 12}" cy="${y + 12}" r="3" fill="${c.p.accent}"/></g>`).join("")}
${text(c, CX, 124, "Certificate", { font: "pinyon", size: 58, fill: c.p.primary })}
${text(c, CX, 182, `of ${title(c)}`, { font: "cormorant", size: 24, fill: c.p.accent })}
${text(c, CX, 214, "Be it known that", { font: "cormorant", size: 15, fill: c.p.muted })}
${text(c, CX, 264, c.v.recipientName, { font: "cormorant", size: fit(c.v.recipientName, 560, 42, 0.5), fill: c.p.ink })}
<line x1="${CX - 200}" y1="280" x2="${CX + 200}" y2="280" stroke="${c.p.accent}" stroke-width="0.8"/>
${text(c, CX, 310, statement(c), { font: "cormorant", size: 15, fill: c.p.muted })}
${text(c, CX, 340, c.v.testName, { font: "cormorant", size: fit(c.v.testName, 600, 24, 0.5), fill: c.p.primary })}
${text(c, CX, 368, scoreLine(c), { font: "cormorant", size: 15, fill: c.p.ink })}
${brand(c, CX, 420, { anchor: "middle", scale: 0.8 })}
${verifyBlock(c, 78, 446, 62)}
${labelled(c, CX, 478, "GIVEN ON", date(c))}
${signature(c, W - 170, 492, { width: 170 })}`,
  },
  {
    id: "header",
    name: "Header bar",
    draw: (c) => `
<rect width="${W}" height="${H}" fill="${c.p.paper}"/>
<rect width="${W}" height="122" fill="${c.p.primary}"/>
<rect y="122" width="${W}" height="5" fill="${c.p.accent}"/>
${text(c, 60, 74, "CERTIFICATE", { font: "cinzel", size: 34, fill: "#ffffff", anchor: "start", spacing: 5 })}
${text(c, 62, 98, `OF ${title(c).toUpperCase()}`, { font: "montserrat", size: 11, fill: c.p.accent, anchor: "start", spacing: 4 })}
${brand(c, W - 60 - 138, 74, { onDark: true })}
${text(c, 60, 196, "This certifies that", { font: "inter", size: 12, fill: c.p.muted, anchor: "start" })}
${text(c, 60, 250, c.v.recipientName, { font: "playfair", size: fit(c.v.recipientName, 560, 42, 0.55), fill: c.p.ink, anchor: "start" })}
${text(c, 60, 292, statement(c), { font: "inter", size: 12, fill: c.p.muted, anchor: "start" })}
${text(c, 60, 322, c.v.testName, { font: "montserratBold", size: fit(c.v.testName, 560, 20, 0.62), fill: c.p.primary, anchor: "start" })}
${text(c, 60, 350, scoreLine(c), { font: "inter", size: 12, fill: c.p.ink, anchor: "start" })}
${qr(c, W - 60 - 110, 190, 110)}
${text(c, W - 60 - 55, 318, "Scan to verify", { font: "inter", size: 8, fill: c.p.muted })}
${labelled(c, 60, 440, "DATE OF COMPLETION", date(c), "start")}
${signature(c, W - 200, 458, { width: 200 })}
<rect y="${H - 42}" width="${W}" height="42" fill="${c.p.primary}"/>
${text(c, 60, H - 17, `Certificate ID ${c.v.code}`, { font: "interBold", size: 10, fill: "#ffffff", anchor: "start", spacing: 1 })}
${text(c, W - 60, H - 17, `Verify at ${host(c)}`, { font: "inter", size: 9, fill: "#ffffff", anchor: "end" })}`,
  },
  {
    id: "split",
    name: "Split panel",
    draw: (c) => `
<rect width="${W}" height="${H}" fill="${c.p.paper}"/>
<rect x="560" width="${W - 560}" height="${H}" fill="${c.p.soft}"/>
<rect x="560" width="3" height="${H}" fill="${c.p.accent}"/>
${brand(c, 60, 78)}
${text(c, 60, 158, `Certificate of ${title(c)}`, { font: "baskervilleBold", size: 28, fill: c.p.primary, anchor: "start" })}
${text(c, 60, 210, "Awarded to", { font: "baskerville", size: 13, fill: c.p.muted, anchor: "start" })}
${text(c, 60, 258, c.v.recipientName, { font: "baskervilleBold", size: fit(c.v.recipientName, 460, 34, 0.62), fill: c.p.ink, anchor: "start" })}
${text(c, 60, 300, statement(c), { font: "baskerville", size: 13, fill: c.p.muted, anchor: "start" })}
${text(c, 60, 328, c.v.testName, { font: "baskervilleBold", size: fit(c.v.testName, 460, 17, 0.62), fill: c.p.primary, anchor: "start" })}
${labelled(c, 60, 440, "DATE OF COMPLETION", date(c), "start")}
${signature(c, 380, 466, { width: 170 })}
${text(c, 701, 110, c.v.score === null ? "COMPLETED" : "SCORE", { font: "montserratBold", size: 11, fill: c.p.accent, spacing: 4 })}
${c.v.score === null
  ? `<circle cx="701" cy="180" r="44" fill="${c.p.primary}"/><path d="M682 182 l13 13 l26 -29" fill="none" stroke="#ffffff" stroke-width="6"/>`
  : `${text(c, 701, 196, String(c.v.score), { font: "playfair", size: 72, fill: c.p.primary })}${text(c, 701, 220, "out of 100", { font: "inter", size: 10, fill: c.p.muted })}`}
${qr(c, 646, 300, 110)}
${text(c, 701, 436, "Certificate ID", { font: "inter", size: 8, fill: c.p.muted })}
${text(c, 701, 452, c.v.code, { font: "interBold", size: 10.5, fill: c.p.ink })}
${text(c, 701, 470, `Verify: ${host(c)}`, { font: "inter", size: 7, fill: c.p.muted })}`,
  },
  {
    id: "guilloche",
    name: "Guilloche",
    draw: (c) => {
      const wave = (y0: number, amp: number, phase: number, horizontal: boolean, len: number) => {
        let d = "";
        for (let i = 0; i <= 200; i++) {
          const t = (i / 200) * len;
          const off = Math.sin((t / 14) + phase) * amp;
          const [x, y] = horizontal ? [30 + t, y0 + off] : [y0 + off, 30 + t];
          d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        return d;
      };
      const waves = [0, 1.6, 3.2]
        .flatMap((ph) => [wave(42, 6, ph, true, W - 60), wave(H - 42, 6, ph, true, W - 60), wave(42, 6, ph, false, H - 60), wave(W - 42, 6, ph, false, H - 60)])
        .map((d) => `<path d="${d}" fill="none" stroke="${c.p.accent}" stroke-width="0.6" opacity="0.8"/>`)
        .join("");
      return `
<rect width="${W}" height="${H}" fill="${c.p.paper}"/>
${waves}
<rect x="62" y="62" width="${W - 124}" height="${H - 124}" fill="none" stroke="${c.p.primary}" stroke-width="1"/>
${brand(c, CX, 106, { anchor: "middle" })}
${text(c, CX, 168, `CERTIFICATE OF ${title(c).toUpperCase()}`, { font: "baskervilleBold", size: 24, fill: c.p.primary, spacing: 2 })}
${text(c, CX, 208, "presented to", { font: "baskerville", size: 13, fill: c.p.muted })}
${text(c, CX, 264, c.v.recipientName, { font: "greatvibes", size: fit(c.v.recipientName, 520, 52, 0.42), fill: c.p.ink })}
${text(c, CX, 304, statement(c), { font: "baskerville", size: 13, fill: c.p.muted })}
${text(c, CX, 334, c.v.testName, { font: "baskervilleBold", size: fit(c.v.testName, 580, 18, 0.62), fill: c.p.primary })}
${text(c, CX, 362, scoreLine(c), { font: "baskerville", size: 13, fill: c.p.ink })}
${verifyBlock(c, 86, 418, 62)}
${labelled(c, CX, 454, "DATE OF COMPLETION", date(c))}
${signature(c, W - 190, 466, { width: 160 })}`;
    },
  },
  {
    id: "deco",
    name: "Art deco",
    draw: (c) => {
      const step = (x: number, y: number, sx: number, sy: number) =>
        `<path d="M${x} ${y + 60 * sy} V${y + 20 * sy} H${x + 20 * sx} V${y} H${x + 60 * sx}" fill="none" stroke="${c.p.accent}" stroke-width="2"/><path d="M${x + 8 * sx} ${y + 60 * sy} V${y + 28 * sy} H${x + 28 * sx} V${y + 8 * sy} H${x + 60 * sx}" fill="none" stroke="${c.p.accent}" stroke-width="0.8"/>`;
      const rays = Array.from({ length: 13 }, (_, i) => {
        const a = Math.PI + (i / 12) * Math.PI;
        return `<line x1="${CX}" y1="118" x2="${(CX + Math.cos(a) * 70).toFixed(1)}" y2="${(118 + Math.sin(a) * 70).toFixed(1)}" stroke="${c.p.accent}" stroke-width="1"/>`;
      }).join("");
      return `
<rect width="${W}" height="${H}" fill="${c.p.primary}"/>
<rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="${c.p.paper}"/>
${step(40, 40, 1, 1)}${step(W - 40, 40, -1, 1)}${step(40, H - 40, 1, -1)}${step(W - 40, H - 40, -1, -1)}
${rays}
<circle cx="${CX}" cy="118" r="18" fill="${c.p.accent}"/>
${text(c, CX, 160, "CERTIFICATE", { font: "cinzel", size: 36, fill: c.p.primary, spacing: 8 })}
${text(c, CX, 186, `OF ${title(c).toUpperCase()}`, { font: "montserratBold", size: 11, fill: c.p.accent, spacing: 6 })}
${text(c, CX, 230, "PRESENTED TO", { font: "montserrat", size: 10, fill: c.p.muted, spacing: 4 })}
${text(c, CX, 280, c.v.recipientName.toUpperCase(), { font: "cinzel", size: fit(c.v.recipientName, 560, 34, 0.75), fill: c.p.ink, spacing: 2 })}
<line x1="${CX - 180}" y1="298" x2="${CX + 180}" y2="298" stroke="${c.p.accent}" stroke-width="1"/>
${text(c, CX, 328, statement(c).toUpperCase(), { font: "montserrat", size: 9.5, fill: c.p.muted, spacing: 3 })}
${text(c, CX, 356, c.v.testName, { font: "montserratBold", size: fit(c.v.testName, 600, 19, 0.62), fill: c.p.primary })}
${text(c, CX, 382, scoreLine(c), { font: "montserrat", size: 12, fill: c.p.ink })}
${verifyBlock(c, 80, 430, 64)}
${labelled(c, CX, 470, "DATE OF COMPLETION", date(c))}
${signature(c, W - 190, 482, { width: 160, script: "greatvibes" })}
${brand(c, CX, 548, { anchor: "middle", scale: 0.7 })}`;
    },
  },
  {
    id: "laurel",
    name: "Laurel",
    draw: (c) => {
      const leaves = [-1, 1]
        .flatMap((side) =>
          Array.from({ length: 9 }, (_, i) => {
            const a = Math.PI / 2 + side * (0.35 + i * 0.27);
            const x = CX + Math.cos(a) * 58;
            const y = 132 + Math.sin(a) * 58;
            const rot = (a * 180) / Math.PI + (side > 0 ? 60 : -60);
            return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="10" ry="4.2" fill="${c.p.accent}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
          })
        )
        .join("");
      return `
<rect width="${W}" height="${H}" fill="${c.p.paper}"/>
<rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="${c.p.primary}" stroke-width="1" stroke-dasharray="1 3"/>
${leaves}
${c.v.score === null
  ? `<path d="M${CX - 16} 132 l11 11 l22 -24" fill="none" stroke="${c.p.primary}" stroke-width="5"/>`
  : `${text(c, CX, 142, String(c.v.score), { font: "playfair", size: 32, fill: c.p.primary })}${text(c, CX, 158, "/ 100", { font: "inter", size: 8, fill: c.p.muted })}`}
${text(c, CX, 232, `Certificate of ${title(c)}`, { font: "playfair", size: 32, fill: c.p.primary })}
${text(c, CX, 266, "proudly awarded to", { font: "cormorant", size: 15, fill: c.p.muted })}
${text(c, CX, 316, c.v.recipientName, { font: "greatvibes", size: fit(c.v.recipientName, 520, 48, 0.42), fill: c.p.ink })}
${text(c, CX, 352, statement(c), { font: "cormorant", size: 15, fill: c.p.muted })}
${text(c, CX, 380, c.v.testName, { font: "playfair", size: fit(c.v.testName, 600, 19, 0.55), fill: c.p.primary })}
${verifyBlock(c, 64, 446, 64)}
${labelled(c, CX, 484, "DATE OF COMPLETION", date(c))}
${signature(c, W - 170, 494, { width: 170 })}
${brand(c, CX, 548, { anchor: "middle", scale: 0.7 })}`;
    },
  },
  {
    id: "ribbon",
    name: "Corner ribbon",
    draw: (c) => `
<rect width="${W}" height="${H}" fill="${c.p.paper}"/>
<rect width="${W}" height="${H}" fill="none" stroke="${c.p.soft}" stroke-width="36"/>
<polygon points="${W - 250},0 ${W - 160},0 ${W},160 ${W},250" fill="${c.p.primary}"/>
<polygon points="${W - 160},0 ${W - 140},0 ${W},140 ${W},160" fill="${c.p.accent}"/>
<g transform="rotate(45 ${W - 96} 96)">${text(c, W - 96, 102, title(c).toUpperCase(), { font: "montserratBold", size: 13, fill: "#ffffff", spacing: 3 })}</g>
${brand(c, 64, 82)}
${text(c, 64, 158, "CERTIFICATE", { font: "montserratBold", size: 40, fill: c.p.primary, anchor: "start", spacing: 3 })}
${text(c, 64, 186, `of ${title(c).toLowerCase()}`, { font: "greatvibes", size: 30, fill: c.p.accent, anchor: "start" })}
${text(c, 64, 236, "THIS IS PRESENTED TO", { font: "montserrat", size: 10, fill: c.p.muted, anchor: "start", spacing: 3 })}
${text(c, 64, 290, c.v.recipientName, { font: "greatvibes", size: fit(c.v.recipientName, 560, 52, 0.42), fill: c.p.ink, anchor: "start" })}
<rect x="64" y="304" width="380" height="1.2" fill="${c.p.accent}"/>
${text(c, 64, 334, statement(c), { font: "montserrat", size: 12, fill: c.p.muted, anchor: "start" })}
${text(c, 64, 362, c.v.testName, { font: "montserratBold", size: fit(c.v.testName, 560, 19, 0.62), fill: c.p.primary, anchor: "start" })}
${text(c, 64, 388, scoreLine(c), { font: "inter", size: 12, fill: c.p.ink, anchor: "start" })}
${labelled(c, 64, 470, "DATE OF COMPLETION", date(c), "start")}
${signature(c, 372, 492, { width: 170 })}
${verifyBlock(c, W - 64, 440, 72, "end")}`,
  },
];

// --- Public API ------------------------------------------------------------------

export interface DesignInfo {
  id: string; // "<layout>:<palette>"
  layout: string;
  layoutName: string;
  palette: string;
  paletteName: string;
}

export const DESIGNS: DesignInfo[] = LAYOUTS.flatMap((l) => PALETTES.map((p) => ({ id: `${l.id}:${p.id}`, layout: l.id, layoutName: l.name, palette: p.id, paletteName: p.name })));

export function isDesignId(id: string): boolean {
  return DESIGNS.some((d) => d.id === id);
}

/** A design picked from the certificate code, so new certificates vary. */
export function defaultDesignFor(code: string): string {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return DESIGNS[h % DESIGNS.length].id;
}

/** The certificate as an SVG document. `fonts` maps each font key to the family name to use. */
export function renderCertificateSvg(view: CertificateView, designId: string, fonts: Fonts): string {
  const [layoutId, paletteId] = (isDesignId(designId) ? designId : DESIGNS[0].id).split(":");
  const layout = LAYOUTS.find((l) => l.id === layoutId)!;
  const palette = PALETTES.find((p) => p.id === paletteId)!;
  const body = layout.draw({ v: view, p: palette, f: fonts });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>`;
}

/** Font map for the PDF: each key is registered in PDFKit under its own name. */
export const PDF_FONTS = Object.fromEntries(Object.keys(FONT_FILES).map((k) => [k, k])) as Fonts;
