# Certificates

Paid users get a certificate for every mock exam they complete in full. Owner decisions (6 Oct 2026): 12 original designs × 5 colours, mock exams only, every question answered, signed "VocalisAi Assessment Team".

## Who gets one (checked on the server only)

`src/lib/certificates/eligibility.ts`. Nothing the browser sends can change the result except which test is asked about.

1. The test belongs to the signed-in user.
2. The user's plan is paid right now (`getEffectivePlan`: an expired paid plan counts as Free).
3. The test finished and **every question has an answer**:
   - Timed exams (v2, including the Customer Support assessment): status COMPLETED, and an answer saved for every question in the plan.
   - Section-by-section exams (v1): ended, with an answer for every question in the template. A timed-out question is saved with an empty answer and doesn't count.
4. The score is final, for tests with an overall score (v1 Readiness score, Customer Support /100).

If the score is 70 or more, it's a **Certificate of Achievement**; otherwise a **Certificate of Completion** (`ACHIEVEMENT_SCORE`). Tests with no overall score (IELTS-style) get Completion with no score printed.

An issued certificate stays with its owner even if the plan later lapses.

## Duplicates

`Certificate.mockTestSessionId` is unique: one certificate per test. `getOrIssueCertificate` returns the existing one, and simultaneous requests still end with one row.

## Where things are

| What | Where |
|---|---|
| Table | `Certificate` (migration `20261006120000_certificates`, additive; `down.sql` removes it) |
| ID format | `VAI-XXXX-XXXX-XXXX`, 60 random bits, Crockford base32 (`code.ts`) |
| Designs | `src/lib/certificates/designs.ts`: one SVG drawing per layout, used for both the preview and the PDF |
| PDF | `pdf.ts` (PDFKit + svg-to-pdfkit, vector, A4 landscape, fonts embedded) |
| API | `POST /api/certificates` (issue or return), `PATCH /api/certificates/{code}` (design only), `GET /api/certificates/{code}/pdf[?download=1]` (owner only) |
| Pages | `/certificates` (mine), `/certificates/{code}` (view, download, choose a design), `/verify` and `/verify/{code}` (public) |
| Results panel | `src/components/certificates/CertificatePanel.tsx`, on all mock exam results pages |

The verification page shows only what is printed on the certificate: name, certificate type, test, score, date and ID. It never shows an email address or other account details.

## Designs, sources and licences

All 12 layouts are **original VocalisAi designs drawn in code** (`designs.ts`). No third-party template, image or ornament is used. Popular "free certificate template" sites (Canva, Freepik and others) mostly forbid commercial reuse or require attribution, so none were used.

| Layout | Look |
|---|---|
| Classic border | Double frame, engraved capitals, script name |
| Modern band | Dark side band with score ring and QR |
| Minimal | White, large serif name, thin rules |
| Gold seal | Rosette seal with ribbons and score |
| Corner geometry | Diagonal corner blocks |
| Diploma | Parchment tint, corner flourishes, script title |
| Header bar | Full-width title bar, ID footer bar |
| Split panel | Content left, score and QR panel right |
| Guilloche | Woven wave border |
| Art deco | Stepped corners and sunburst |
| Laurel | Laurel wreath around the score |
| Corner ribbon | Diagonal sash with the certificate type |

Colours: Navy & gold, Emerald, Burgundy, Slate & teal, VocalisAi amber.

**Fonts** (files in `src/lib/certificates/fonts`, licence texts in `fonts/licenses`): Cinzel, Cormorant Garamond, DM Serif Display, Great Vibes, Instrument Serif, Inter, Libre Baskerville, Montserrat, Pinyon Script, Playfair Display. All are under the **SIL Open Font License 1.1**, which allows commercial use and embedding in PDFs. They come from Google Fonts.

**Libraries:** pdfkit, svg-to-pdfkit and qrcode, all MIT.

## Changing things

- **Signatory:** the `signature()` helper in `designs.ts`. Issued certificates redraw with the new name, because the PDF is drawn on each view.
- **Achievement threshold:** `ACHIEVEMENT_SCORE` in `eligibility.ts`. It only affects new certificates.
- **Withdrawing a certificate:** set `revokedAt` on its row. The verify page then says "withdrawn".
