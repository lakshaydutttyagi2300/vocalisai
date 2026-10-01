// Types for sql.mjs so TypeScript tests can import it.
export function catalogueStatements(mode: "create" | "sync"): string[];
export function runCatalogueSql(db: unknown, mode: "create" | "sync"): Promise<{ categories: number; exams: number; subjects: number; skills: number; links: number }>;
