// Test runs reach the Neon test branch over the internet; from a slow
// connection, opening a connection can take longer than Prisma's 5-second
// default and fail at random. Tests wait longer instead. Only used by the
// test setups (tests/setup.ts, playwright.config.ts) - never the app.
export function patientDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const parsed = new URL(url);
  if (!parsed.searchParams.has("connect_timeout")) parsed.searchParams.set("connect_timeout", "30");
  if (!parsed.searchParams.has("pool_timeout")) parsed.searchParams.set("pool_timeout", "30");
  return parsed.toString();
}
