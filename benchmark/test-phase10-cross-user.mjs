const BASE = "http://localhost:3000";
const SESSION_ID = process.argv[2];

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

const getRes = await fw(`${BASE}/api/conversations/${SESSION_ID}`);
console.log("Priya GET Rahul's conversation:", getRes.status, await getRes.json());

const turnRes = await fw(`${BASE}/api/conversations/${SESSION_ID}/turns`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ recordingId: "fake" }),
});
console.log("Priya POST turn to Rahul's conversation:", turnRes.status, await turnRes.json());
