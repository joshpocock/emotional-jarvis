# Emotional Jarvis

A voice assistant dashboard for your business that picks its own tone for every reply.
Calm when the numbers are good, urgent when something breaks, dry when you're putting off that invoice, and the orb changes colour with the mood.
Speak Spanish or French and it answers in the same voice. Hit one button and two hosts brief you on your day like a podcast.
And it does things: ask it to send an invoice, move a meeting or tick off a task, and the dashboard changes in front of you.

Built with **Fish Audio Drama 3** (voice and speech to text), **Claude** (the brain) and **Next.js**.

## What it does

- **Your business on one screen.** Revenue, leads, tickets, alerts, today's calendar and the tasks you promised and haven't done, all from `data/business.json`.
- **Talk to it.** Hold the button (or the space bar), speak, let go. Fish Audio transcribes you, Claude answers, Drama 3 speaks.
- **It directs its own voice.** Claude writes Drama 3 directions like `[dry, deadpan]` or `[alert, fast, serious]` into every reply, and can change them mid-sentence. You see them as chips under each reply.
- **It hears how you sound.** Fish Audio's speech to text tags how you said it (`[sigh]`, `[excited]`), and Jarvis reacts.
- **Any language, same voice.** Switch languages mid-conversation; Jarvis follows.
- **Brief me like a podcast.** Two hosts, one Drama 3 request.
- **Voice spend meter.** See exactly what the voice costs as you go.
- **It takes actions.** "Send the Brightside invoice", "move my four thirty to tomorrow", "tick off the walkthrough": Jarvis does it with Claude tool use and the dashboard updates live.
- **It preps you for meetings.** "Prep me for my two o'clock with Shopify": a real browser window opens the company's website, Jarvis reads it and briefs you on what they do, what to bring up and one sharp question to ask.
- **Start my day.** One click and Jarvis greets you and briefs you on what matters most, in the right mood.

## Setup (2 minutes)

You need Node.js 20 or newer.

1. Get a Fish Audio API key: sign up at fish.audio, then API Keys.
2. Get an Anthropic API key: console.anthropic.com.
3. In this folder:

```bash
npm install
npx playwright install chromium   # the browser Jarvis uses for meeting prep
cp .env.example .env.local    # then paste both keys into .env.local
npm run dev
```

4. Open http://localhost:3000, allow the microphone, and hold the space bar to talk.

## Make it yours

- **Your business data:** edit `data/business.json` and refresh. Jarvis only states facts from this file.
- **Jarvis's voice:** set `JARVIS_VOICE_ID` in `.env.local` to any Fish Audio voice ID, including a clone of your own voice.
- **Second podcast host:** `COHOST_VOICE_ID`.
- **Jarvis's personality:** the first lines of `systemPrompt()` in `lib/brain.ts` (a dry, loyal butler by default).
- **How Jarvis picks its tone:** the `HOW YOU SOUND` section in `lib/brain.ts`.
- **Orb colours:** `PALETTE` in `components/Orb.tsx`, and which directions map to which mood in `MOODS` in `components/Dashboard.tsx`.
- **Real email:** set `RESEND_API_KEY` and `EMAIL_FROM` (a sender on your verified Resend domain) and Jarvis's emails go out for real. To test safely, set `EMAIL_REDIRECT_TO` and every email goes to you instead, with the real recipient in the subject. Without a key, emails just land in the demo outbox. Each Outbox card says "sent for real" or "demo".
- **More actions:** add a tool to `tools` in `lib/actions.ts` and handle it in `act()`.

## How it works

```
mic -> Fish Audio speech to text (transcribe-1-pro, keeps emotion cues)
    -> Claude (writes the reply plus Drama 3 directions)
    -> Fish Audio Drama 3 (streams the voice back while it's still generating)
```

| File | Job |
|---|---|
| `components/Dashboard.tsx` | The dashboard, hold-to-talk, transcript and meter |
| `components/Orb.tsx` | The orb that follows the voice and takes the colour of the mood |
| `lib/fish.ts` | Fish Audio speech to text and Drama 3 |
| `lib/brain.ts` | Claude: replies and the podcast script |
| `lib/store.ts` | Conversation, queued audio and the cost meter |
| `lib/actions.ts` | What Jarvis can do: the tools, and the live copy of your data they change |
| `lib/browser.ts` | Opens a real, visible browser and reads a website (Playwright) |
| `app/api/*` | `talk`, `audio/[id]`, `podcast`, `greet`, `reset` |
| `data/business.json` | Your business data |

## The build, step by step

Each step is a git tag, so you can see exactly what changed:

| Tag | Adds |
|---|---|
| `step-0-start` | The dashboard, and talking to Jarvis: speech to text, Claude (a dry butler), Drama 3 voice |
| `step-1-moods` | Jarvis directs its own voice, reacts to how you sound, replies in your language, and the orb takes on each mood's colour |
| `step-2-podcast` | Two-host podcast briefing in one request |
| `step-3-meter` | Live voice spend meter |
| `step-4-actions` | Jarvis sends emails, moves meetings and ticks off tasks |
| `step-5-start-my-day` | Start my day: Jarvis briefs you first |
| `step-6-meeting-prep` | Jarvis opens a real browser, researches who you're meeting and briefs you |

`git checkout step-1-moods` to see any stage.

## Notes

- The `model: drama-3` header in `lib/fish.ts` matters: without it, Fish Audio silently falls back to an older model.
- Changes Jarvis makes live in memory. Restart the server to get `data/business.json` back.
- Mid-line language switching tags are experimental in Drama 3; plain replies in another language work well.

MIT licensed.
