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
  body: new URLSearchParams({ email: "priya.sharma.test@example.com", password: "TestPass123", csrfToken, json: "true" }),
});

const res = await fw(`${BASE}/api/practice/attempts/${ATTEMPT_ID}/analyze`);
console.log("Priya accessing Rahul's attempt analysis:", res.status, await res.json());
