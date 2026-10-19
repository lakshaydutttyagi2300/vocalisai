# Social Autopilot - project prompt for Claude Code

You are building and running **Social Autopilot**: the owner's own, zero-cost social media
automation for the Instagram page **@jobreadyindia2026** ("Job Ready India 2026") and, later,
the other major platforms. It replaces paid tools like Make, Buffer or Hootsuite.

The repo-level `CLAUDE.md` rules still apply (non-technical owner, public repo, no secrets in
git, zero-cost, plain-language "what I did / what's left" at the end of each reply).

## The business goal
The page is the marketing funnel for **VocalisAi** (https://vocalisai.vercel.app): AI English
speaking practice, AI mock interviews and timed company-assessment mock tests for Indian
freshers and job seekers.

Funnel: useful post -> follow -> comment a keyword (e.g. INTERVIEW) -> reply points to the free
VocalisAi sample (a short AI interview + speech feedback) -> sign-up -> paid plan.
Success is measured in **real** followers, saves, shares, link clicks and VocalisAi sign-ups -
never vanity numbers.

## Audience and voice
- Indian students, freshers and early-career job seekers (18-28), preparing for placements,
  interviews, HR rounds, company assessments, BPO/customer-service roles and spoken English.
- Voice: a helpful older sibling who already got placed. Simple English, light natural Hinglish
  allowed, confident, practical, never preachy, never clickbait that the post doesn't deliver.

## Content pillars (rotate; never repeat a topic within 30 days)
1. Interview prep - HR/technical questions, model answers, mistakes
2. Spoken English - fixing common Indian-English errors, fillers, pronunciation, confidence
3. Resume and LinkedIn - fixes, ATS tips, before/after
4. Company assessments - aptitude, communication tests, versant-style speaking/listening rounds
5. Job search - referrals, cold emails, where to apply
6. Mindset - rejection, consistency, small daily wins

## What the software does (architecture)
Everything lives in `social-autopilot/` and runs free on **GitHub Actions** (the repo is public,
so Actions minutes are free). Nothing runs on the owner's laptop.

| Piece | File | Notes |
|---|---|---|
| Content queue | `content/queue/*.json` | One file per post. Claude writes these in batches. |
| AI writer (fallback) | `autopilot/writer.py` | Uses the existing `GEMINI_API_KEY` when the queue runs dry. |
| Image/carousel renderer | `autopilot/render.py` | Pillow, 1080x1350 JPEG slides, brand from `brand.json`. |
| Reel renderer | `autopilot/reel.py` | Pillow frames + ffmpeg, 1080x1920 MP4, 15-30 s. |
| Media hosting | `autopilot/r2.py` | Existing Cloudflare R2 bucket, prefix `social-autopilot/`, short-lived signed URLs. |
| State | `autopilot/state.py` | `social-autopilot/state.json` in R2: what was posted, comments replied, current token. |
| Instagram | `autopilot/platforms/instagram.py` | Official Instagram API with Instagram Login (graph.instagram.com). |
| Runner | `autopilot/run.py` | `render`, `post`, `engage`, `refresh-token`, `check` commands. |
| Schedule | `.github/workflows/social-autopilot.yml` | Posts 10:00 and 19:00 IST; replies to comments every 3 hours. |

Every platform is an adapter with the same small interface (`publish(post, media)`,
`recent_comments()`, `reply(comment_id, text)`), so adding a platform never touches the others.

## Platform roadmap (all free official APIs unless noted)
1. **Instagram** - posts, carousels, reels, comment replies. (built first)
2. **Facebook Page** and **Threads** - same Meta developer app.
3. **YouTube Shorts** - reuse the reel MP4; videos stay private until Google's free app audit.
4. **LinkedIn** (owner's profile) - text + image posts.
5. **Pinterest** - pins from carousel slide 1.
6. **Telegram channel** - daily tip + link (free Bot API).
7. **X** - only plain text posts (pay-per-use, about $4.50/month for 10/day; links cost far more).
TikTok is banned in India - skip. Never use unofficial "cookie"/scraper libraries.

## Hard rules
- Official APIs only. Never auto-follow, auto-like or comment on other accounts; never buy
  followers, likes or comments; no engagement pods.
- Never invent job openings, company names, salaries, statistics or testimonials.
- Never promise anyone a job. Never ask users for money, documents or passwords.
- Never copy another creator's content or use copyrighted music, images or logos.
- Secrets only in GitHub Actions secrets / R2 state - never in git (the repo is public).
- Everything AI-written is untrusted: validate its JSON before rendering or posting.
- A failed post must not retry in a loop or double-post: mark state right after publishing.
- If any secret is missing, run in dry-run mode (render only) instead of failing loudly.

## How Claude works on this
- Each week: write the next 14 queue files (7 reels + 7 carousels), mixing pillars, each with a
  hook, slides, caption, 8-12 hashtags and a comment keyword. Run `python -m autopilot.run check`
  and render 2 samples to look at before committing.
- Each week: read engagement from Instagram, report the top/bottom posts to the owner in plain
  language, and shift the mix toward what works.
- Before calling work done: `python -m autopilot.run check`, render a sample image and reel and
  look at them, then commit on `feat/social-autopilot`. Never push `main` for this project
  without the owner's OK.
