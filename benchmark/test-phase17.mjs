// Real end-to-end test of Phase 17 (Admin): confirms a candidate is denied
// admin access, the real admin account can see real platform-wide stats,
// and full template CRUD works against the real database.

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
  const candidate = newCookieJar();
  await login(candidate, "rahul.verma.test@example.com", "RahulPass123");
  console.log("Logged in as candidate.");

  console.log("\n--- Candidate hitting admin API directly (should be 403, not data) ---");
  const forbiddenOverview = await candidate.fetch(`${BASE}/api/admin/overview`);
  console.log(`Status: ${forbiddenOverview.status} (expect 403)`);
  if (forbiddenOverview.status !== 403) {
    console.error("TEST FAILED: candidate should not see admin overview");
    process.exit(1);
  }

  console.log("\n--- Candidate hitting /admin page (middleware should redirect, not render) ---");
  const pageRes = await candidate.fetch(`${BASE}/admin`, { redirect: "manual" });
  console.log(`Status: ${pageRes.status} (expect 307/302 redirect away from /admin)`);
  if (pageRes.status !== 307 && pageRes.status !== 302) {
    console.error("TEST FAILED: candidate should be redirected away from /admin");
    process.exit(1);
  }

  const admin = newCookieJar();
  await login(admin, "admin@proacting.test", "AdminPass123");
  console.log("\nLogged in as admin.");

  console.log("\n--- Real admin overview ---");
  const overviewRes = await admin.fetch(`${BASE}/api/admin/overview`);
  const overview = await overviewRes.json();
  console.log(JSON.stringify(overview, null, 2));
  if (!overviewRes.ok || overview.totalUsers < 2) {
    console.error("TEST FAILED: overview should show real users including the seeded candidate and admin");
    process.exit(1);
  }

  console.log("\n--- Real admin users list ---");
  const usersRes = await admin.fetch(`${BASE}/api/admin/users`);
  const usersData = await usersRes.json();
  const rahul = usersData.users.find((u) => u.email === "rahul.verma.test@example.com");
  console.log(`Found candidate row: ${JSON.stringify(rahul)}`);
  if (!rahul || rahul.mockSessionsCompleted < 1) {
    console.error("TEST FAILED: expected the candidate's real session count in the admin users list");
    process.exit(1);
  }

  console.log("\n--- Creating a new template (real DB write) ---");
  const createRes = await admin.fetch(`${BASE}/api/admin/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Phase 17 Test Template",
      sections: [
        { order: 1, category: "GRAMMAR", difficulty: "BEGINNER", questionCount: 3 },
        { order: 2, category: "READING", difficulty: "ADVANCED", questionCount: 2 },
      ],
    }),
  });
  const created = await createRes.json();
  console.log(JSON.stringify(created, null, 2));
  if (!createRes.ok) {
    console.error("TEST FAILED: template creation failed");
    process.exit(1);
  }

  console.log("\n--- Validation rejects a bad category ---");
  const badRes = await admin.fetch(`${BASE}/api/admin/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Bad", sections: [{ order: 1, category: "NOT_REAL", difficulty: "BEGINNER", questionCount: 2 }] }),
  });
  console.log(`Status: ${badRes.status} (expect 400)`);
  if (badRes.status !== 400) {
    console.error("TEST FAILED: invalid category should be rejected");
    process.exit(1);
  }

  console.log("\n--- Editing the new template ---");
  const editRes = await admin.fetch(`${BASE}/api/admin/templates/${created.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Phase 17 Test Template (edited)",
      sections: [{ order: 1, category: "VOCABULARY", difficulty: "EXPERT", questionCount: 5 }],
    }),
  });
  const edited = await editRes.json();
  console.log(JSON.stringify(edited, null, 2));
  if (!editRes.ok || edited.sections.length !== 1 || edited.sections[0].category !== "VOCABULARY") {
    console.error("TEST FAILED: template edit didn't apply as expected");
    process.exit(1);
  }

  console.log("\n--- Deleting the test template ---");
  const delRes = await admin.fetch(`${BASE}/api/admin/templates/${created.id}`, { method: "DELETE" });
  console.log(`Status: ${delRes.status} (expect 200)`);
  if (!delRes.ok) {
    console.error("TEST FAILED: delete should succeed for an unused template");
    process.exit(1);
  }

  console.log("\n--- Confirming the seeded Standard template can't be deleted (it has real sessions) ---");
  const templatesRes = await admin.fetch(`${BASE}/api/admin/templates`);
  const templatesData = await templatesRes.json();
  const standard = templatesData.templates.find((t) => t.name === "Standard BPO Assessment");
  console.log(`Standard template used by ${standard?.sessionsUsingIt} sessions`);
  const protectedDelRes = await admin.fetch(`${BASE}/api/admin/templates/${standard.id}`, { method: "DELETE" });
  console.log(`Status: ${protectedDelRes.status} (expect 409)`);
  if (protectedDelRes.status !== 409) {
    console.error("TEST FAILED: deleting a template in use should be refused");
    process.exit(1);
  }

  console.log("\nAll Phase 17 checks passed.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
