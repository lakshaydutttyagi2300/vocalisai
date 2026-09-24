// Rendered on every new exam-family page (IELTS-style, SELT-style, etc.) -
// never on the existing landing page or any current practice/mock-test
// page, since those don't reference any external exam brand today. Exact
// wording is fixed here in one place so it can never drift between pages.
export function TrademarkDisclaimer({ className }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className ?? ""}`.trim()}>
      VocalisAi is not affiliated with or endorsed by IELTS, IDP, British Council, Cambridge,
      Pearson, Trinity, LanguageCert, ETS or Duolingo.
    </p>
  );
}
