// Draws a certificate as a print-ready, vector A4-landscape PDF from its
// saved facts, using the same SVG design as the on-screen preview.
// Server only (Node: reads the font files).

import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import path from "node:path";
import { readFileSync } from "node:fs";
import { FONT_FILES, PAGE, PDF_FONTS, renderCertificateSvg, type CertificateView, type FontKey } from "./designs";

const FONT_DIR = path.join(process.cwd(), "src", "lib", "certificates", "fonts");
let fontCache: Map<FontKey, Buffer> | null = null;
function fonts(): Map<FontKey, Buffer> {
  fontCache ??= new Map((Object.entries(FONT_FILES) as [FontKey, string][]).map(([k, file]) => [k, readFileSync(path.join(FONT_DIR, file))]));
  return fontCache;
}

export async function renderCertificatePdf(view: CertificateView, designId: string): Promise<Buffer> {
  const doc = new PDFDocument({
    size: [PAGE.width, PAGE.height],
    margin: 0,
    info: {
      Title: `VocalisAi certificate ${view.code}`,
      Author: "VocalisAi",
      Subject: `${view.testName} - ${view.recipientName}`,
      Creator: "VocalisAi",
    },
  });
  for (const [key, data] of fonts()) doc.registerFont(key, data);

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  SVGtoPDF(doc, renderCertificateSvg(view, designId, PDF_FONTS), 0, 0, {
    width: PAGE.width,
    height: PAGE.height,
    assumePt: true,
    fontCallback: (family: string) => (family in FONT_FILES ? family : "inter"),
  });
  doc.end();
  return done;
}
