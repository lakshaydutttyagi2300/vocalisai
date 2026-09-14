const BASE = "http://localhost:3000";
const ATTEMPT_ID = process.argv[2];

let cookieJar = "";
function captureCookies(res) {
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of setCookie) {
    const pair = c.split(";")[0];
    const name = pair.split("=")[0];
    cookieJar = cookieJar.split("; ").filter((e) => e && !e.startsWith(`${name}=`)).concat(pair).join("; ");
  }
}
async function fw(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), Cookie: cookieJar } });
  captureCookies(res);
  return res;
}

const csrfRes = await fw(`${BASE}/api/auth/csrf`);
const { csrfToken } = await csrfRes.json();
await fw(`${BASE}/api/auth/callback/credentials`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ email: "rahul.verma.test@example.com", password: "RahulPass123", csrfToken, json: "true" }),
});

const start = Date.now();
const res = await fw(`${BASE}/api/practice/attempts/${ATTEMPT_ID}/analyze`, { method: "POST" });
const data = await res.json();
console.log(`Second POST /analyze: ${res.status} in ${Date.now() - start}ms (should be fast - no re-analysis)`);
console.log("Same transcript returned:", data.result?.transcript?.slice(0, 40));
