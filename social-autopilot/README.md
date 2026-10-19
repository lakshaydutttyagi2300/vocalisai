# Social Autopilot

Your own free social media autopilot for **@jobreadyindia2026**. It runs on GitHub's servers twice a
day (about 10:07 and 19:07 India time): it designs a reel or carousel, posts it to Instagram and
replies to new comments every 3 hours. Your laptop does not need to be on.

- **Cost:** ₹0. It uses free GitHub Actions (the repo is public), your existing Gemini key and your
  existing Cloudflare R2 storage.
- **What it posts:** the ready-made posts in `content/queue/` in date order. If the queue runs out,
  Gemini writes a new post so the page never skips a day.
- **Comments:** if someone comments the post's keyword (e.g. INTERVIEW), it replies with the
  VocalisAi link. Other genuine comments get a short, friendly AI reply. Spam is ignored.
- **Never:** auto-follows, auto-likes, buys followers or comments on other accounts.

## One-time setup (about 30 minutes)

### Step 1 - Get your Instagram access token (Meta developer app, free)
Meta changes button names often; if something looks slightly different, look for the closest match.

1. Make sure @jobreadyindia2026 is a **Professional account** (Creator or Business) in the Instagram
   app: Settings, Account type and tools.
2. On your computer, open https://developers.facebook.com and log in with Facebook.
   If asked, register as a developer (free).
3. Click **My Apps**, then **Create app**.
4. App name: `Job Ready Autopilot`. Contact email: your Gmail. Click **Next**.
5. Use case: choose **Manage messaging & content on Instagram**. Click **Next**.
6. Business portfolio: choose **I don't want to connect a business portfolio yet**. Click **Next**,
   then **Create app** (enter your Facebook password if asked).
7. In the app's left menu, open **Instagram**, then **API setup with Instagram login**.
8. Under **Generate access tokens**, click **Add account** and log in as **@jobreadyindia2026**.
   Allow all the permissions it asks for.
9. Click **Generate token** next to the account and copy the long token. Keep it private (it's like a
   password). Do not paste it into chat.

### Step 2 - Add the secrets to GitHub (so only the robot can see them)
1. Open https://github.com/lakshaydutttyagi2300/vocalisai
2. Click **Settings**, then **Secrets and variables**, then **Actions**, then **New repository secret**.
3. Add these one by one (name exactly as written, value from where it says):

| Name | Value comes from |
|---|---|
| `IG_ACCESS_TOKEN` | The token from Step 1 |
| `GEMINI_API_KEY` | Same value as in Vercel (vocalisai project, Settings, Environment Variables) |
| `R2_ACCOUNT_ID` | Same value as in Vercel |
| `R2_ACCESS_KEY_ID` | Same value as in Vercel |
| `R2_SECRET_ACCESS_KEY` | Same value as in Vercel |
| `R2_BUCKET_NAME` | Same value as in Vercel |

### Step 3 - Test it
1. In the repo, click **Actions**, then **Social Autopilot** on the left.
2. Click **Run workflow**, choose task **check**, click **Run workflow**. Open the run: the last
   line should say `Instagram token=yes, R2 storage=yes, Gemini=yes`.
3. Run it again with task **post** and **Dry run** ticked. Open the run, scroll to **Artifacts** and
   download **rendered-media** to see the reel exactly as it would be posted.
4. Run **post** with **Dry run** unticked to publish the first real post. Check Instagram.

### Step 4 - Bio link
Set your Instagram bio link to `https://vocalisai.vercel.app` - every keyword reply says "link in bio".

After that, it runs by itself. The token renews itself every week, so you shouldn't need to repeat
Step 1 unless you change your Instagram password or remove the app.

## Adding your own music to reels (optional)
Put royalty-free tracks you have the rights to (mp3) in `assets/music/`. Each reel picks one and
plays it quietly. Without music, reels have silent audio and you can still add a trending sound
from the Instagram app.

## For Claude / developers
See `CLAUDE.md` in this folder. Commands (run inside `social-autopilot/`):

```
pip install -r requirements.txt
python -m autopilot.run check
python -m autopilot.run render next
python -m unittest discover -s tests
```
