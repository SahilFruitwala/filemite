# Filemite — Product Hunt launch kit

## Listing

**Name:** Filemite

**Tagline** (60 chars max) — pick one:
- `25 free PDF & image tools. No sign-up, nothing stored.` (53)
- `Private PDF and image tools that run in your browser` (52)
- `Compress, merge, sign & redact files — privately, free` (54)

**Description** (260 chars max):
> Filemite is 25 small tools for images and PDFs: compress, convert, crop, watermark, merge, split, sign, redact and more. PDFs never leave your device (MuPDF in WebAssembly). Images are processed in memory and never stored. Free, no account, open source.

(250 chars)

**Topics:** Productivity, Privacy, Design Tools, Open Source, Developer Tools

**Links:** https://www.filemite.com · https://github.com/SahilFruitwala/filemite

**Pricing:** Free

**Thumbnail:** `public/logo.png` (240×240, square; a GIF of the mascot blinking would stand out more)

## Gallery (1270×760, captured @2x in `launch/gallery/`)

1. `01-home.png` — hero: "25 tools · free · no sign-up · nothing stored"
2. `03-image-compress.png` — image compress
3. `04-pdf-merge.png` — PDF merge
4. `05-pdf-sign.png` — sign PDF (dark mode)
5. `06-screenshot-beautifier.png` — screenshot beautifier
6. `02-home-dark.png` — dark theme
7. `07-privacy.png` — privacy page

These show empty states. Before launch, replace 2–4 with shots that have real files loaded
(before/after size on Compress, a signed page on Sign, a redacted page on Redact).
Add a 30–60 s video: drop a 4 MB HEIC → 600 KB JPG, merge 3 PDFs, sign, redact.

## Maker's first comment

> Hey Product Hunt 👋 I'm Sahil.
>
> Every time I needed to shrink a PDF or convert a HEIC, I ended up on a site that wanted
> an account, added a watermark, or uploaded my bank statement to who-knows-where.
> So I built Filemite: 25 small tools that each do one job well.
>
> **What makes it different**
> - 🔒 **PDFs never leave your device.** Merge, split, compress, sign and redact run in your
>   browser with MuPDF compiled to WebAssembly.
> - 🧠 **Image tools run in memory.** Files sent to the server are processed with Sharp
>   and never written to disk. Many image tools are browser-only.
> - ✂️ **Real redaction.** Redacted text and images are deleted from the PDF, not just
>   covered with a black box.
> - 🆓 **Free, no sign-up, no watermarks.** And it's open source (AGPL), so you can check.
>
> I'd love to hear which tool you'd want next and anything that felt slow or confusing.

## Checklist

**2+ weeks before**
- [ ] Create a "coming soon" page on Product Hunt; share it to collect followers
- [ ] Be active on PH (comment on other launches) so the account isn't brand new
- [ ] Line up a hunter, or self-hunt (fine today)
- [ ] Make the demo video and the "files loaded" screenshots

**Week of**
- [ ] Schedule for 12:01 AM PT, Tue–Thu
- [ ] Test every tool on mobile Safari and Chrome; check HEIC and 100+ page PDFs
- [ ] Check load: the server image endpoints are rate limited (100 images/hour/IP, 2 concurrent).
      Shared NAT (offices, conferences) can hit this — consider raising `RATE_LIMIT_PER_HOUR`
      for launch day and confirm the Upstash env vars are set on Vercel
- [ ] Confirm the OG image renders: paste the URL into X, LinkedIn and Slack
- [ ] Add a "Featured on Product Hunt" badge to the footer once live (optional `?ref=producthunt`
      tracking is already possible with PostHog)
- [ ] Prepare posts for X, LinkedIn, Reddit (r/SideProject, r/opensource, r/privacy), Hacker News (Show HN, a different day)

**Launch day**
- [ ] Post the first comment right away
- [ ] Reply to every comment within the hour
- [ ] Share the link (don't ask for upvotes; ask for feedback)
- [ ] Watch PostHog and server logs for 429/503s

**After**
- [ ] Thank-you post with numbers
- [ ] Turn feature requests into GitHub issues
