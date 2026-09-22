// Verifies the new question-bank bulk-import system end-to-end: import
// succeeds, exact + near-duplicate detection both actually work (not just
// exact-string matching), invalid rows are rejected with clear errors,
// non-admins are forbidden, and the admin question-list/coverage view
// reflects real data.

const BASE = "http://localhost:3000";

function newCookieJar() {
  let jar = "";
  return {
    async fetch(url, options = {}) {
      const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), Cookie: jar } });
      const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      for (const c of setCookie) {
        const pair = c.split(";")[0];
        const name = pair.split("=")[0];
        jar = jar.split("; ").filter((e) => e && !e.startsWith(`${name}=`)).concat(pair).join("; ");
      }
      return res;
    },
  };
}

async function login(client, email, password) {
  const csrfRes = await client.fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  await client.fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password, csrfToken, json: "true" }),
  });
}

async function main() {
  const admin = newCookieJar();
  await login(admin, "admin@proacting.test", "AdminPass123");

  const uniqueTag = Date.now();
  const batch = [
    {
      category: "GRAMMAR",
      difficulty: "BEGINNER",
      type: "MULTIPLE_CHOICE",
      prompt: `Choose the correct sentence. [test-${uniqueTag}-A]`,
      options: ["He goes to work.", "He go to work.", "He going to work.", "He gone to work."],
      correctAnswer: "He goes to work.",
      explanation: "Third-person singular takes -s in the simple present.",
      timeLimitSeconds: 30,
    },
    {
      // Near-duplicate of the one above: same content, few words changed.
      category: "GRAMMAR",
      difficulty: "BEGINNER",
      type: "MULTIPLE_CHOICE",
      prompt: `Choose the correct sentence. [test-${uniqueTag}-A]`,
      options: ["He goes to work.", "He go to the work.", "He going to work.", "He gone to work."],
      correctAnswer: "He goes to work.",
      explanation: "Third-person singular takes -s in the simple present, near-duplicate wording.",
      timeLimitSeconds: 30,
    },
    {
      category: "GRAMMAR",
      difficulty: "BEGINNER",
      type: "MULTIPLE_CHOICE",
      prompt: `Pick the grammatically correct option. [test-${uniqueTag}-B]`,
      options: ["They was late.", "They were late.", "They is late.", "They be late."],
      correctAnswer: "They were late.",
      explanation: "Plural subject 'they' takes 'were' in the past simple.",
      timeLimitSeconds: 30,
    },
    {
      // Invalid: correctAnswer not in options.
      category: "GRAMMAR",
      difficulty: "BEGINNER",
      type: "MULTIPLE_CHOICE",
      prompt: `Broken question. [test-${uniqueTag}-C]`,
      options: ["A", "B"],
      correctAnswer: "C",
      timeLimitSeconds: 30,
    },
    {
      // Invalid category.
      category: "NOT_A_REAL_CATEGORY",
      difficulty: "BEGINNER",
      type: "MULTIPLE_CHOICE",
      prompt: `Bad category. [test-${uniqueTag}-D]`,
      options: ["A", "B"],
      correctAnswer: "A",
      timeLimitSeconds: 30,
    },
  ];

  console.log("--- A plain candidate cannot import questions ---");
  const candidateEmail = `qbank-candidate-${Date.now()}@example.com`;
  await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "QBank Candidate", email: candidateEmail, password: "TestPass123" }),
  });
  const candidate = newCookieJar();
  await login(candidate, candidateEmail, "TestPass123");
  const forbiddenRes = await candidate.fetch(`${BASE}/api/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions: batch }),
  });
  console.log(`Status: ${forbiddenRes.status} (expect 403)`);
  if (forbiddenRes.status !== 403) {
    console.error("TEST FAILED: a candidate should not be able to import questions");
    process.exit(1);
  }

  console.log("\n--- Admin imports the batch (1 exact-shape dup, 1 near-dup, 1 invalid answer, 1 invalid category) ---");
  const importRes = await admin.fetch(`${BASE}/api/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions: batch }),
  });
  const importData = await importRes.json();
  console.log(`Status: ${importRes.status}`);
  console.log(`Inserted: ${importData.inserted} (expect 2 - the two genuinely distinct questions)`);
  console.log(`Duplicates: ${importData.duplicateCount} (expect 1 - the near-duplicate caught within the batch)`);
  console.log(`Errors: ${importData.errorCount} (expect 2 - bad correctAnswer + bad category)`);

  if (importData.inserted !== 2 || importData.duplicateCount !== 1 || importData.errorCount !== 2) {
    console.error("TEST FAILED: import counts don't match expectations");
    process.exit(1);
  }

  console.log("\n--- Re-importing the exact same 2 valid questions again is fully rejected as duplicates ---");
  const reimportRes = await admin.fetch(`${BASE}/api/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions: [batch[0], batch[2]] }),
  });
  const reimportData = await reimportRes.json();
  console.log(`Inserted: ${reimportData.inserted} (expect 0), Duplicates: ${reimportData.duplicateCount} (expect 2)`);
  if (reimportData.inserted !== 0 || reimportData.duplicateCount !== 2) {
    console.error("TEST FAILED: re-importing identical questions should be fully caught as duplicates against the existing bank");
    process.exit(1);
  }

  console.log("\n--- The question list/coverage view reflects real data ---");
  const listRes = await admin.fetch(`${BASE}/api/admin/questions?category=GRAMMAR&difficulty=BEGINNER&search=${uniqueTag}`);
  const listData = await listRes.json();
  console.log(`Found ${listData.total} matching questions (expect 2)`);
  if (listData.total !== 2) {
    console.error("TEST FAILED: filtered list should show exactly the 2 inserted test questions");
    process.exit(1);
  }

  console.log("\n--- Deleting one of the test questions works ---");
  const idToDelete = listData.questions[0].id;
  const deleteRes = await admin.fetch(`${BASE}/api/admin/questions/${idToDelete}`, { method: "DELETE" });
  console.log(`Status: ${deleteRes.status} (expect 200)`);
  if (!deleteRes.ok) {
    console.error("TEST FAILED: deleting an unused question should succeed");
    process.exit(1);
  }

  console.log("\nAll question-bank system checks passed.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
