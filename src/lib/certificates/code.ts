import { randomBytes } from "node:crypto";

// Public certificate IDs: "VAI-" + 12 Crockford base32 characters in three
// groups (60 random bits), e.g. VAI-7K2M-9Q4X-T8RD. Unguessable, easy to read
// out or type, and with no 0/O or 1/I/L to confuse.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_RE = /^VAI-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

export function generateCertificateCode(): string {
  const bytes = randomBytes(12);
  const chars = [...bytes].map((b) => ALPHABET[b % 32]).join("");
  return `VAI-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/** Normalises what someone typed or scanned (any case, missing dashes) to a code, or null. */
export function normalizeCertificateCode(raw: string): string | null {
  const upper = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = (upper.startsWith("VAI") ? upper.slice(3) : upper).replace(/O/g, "0").replace(/[IL]/g, "1");
  if (body.length !== 12) return null;
  const code = `VAI-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
  return CODE_RE.test(code) ? code : null;
}
