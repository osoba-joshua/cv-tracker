# CV Tracker

Upload your CV and get live job postings ranked by how well they fit you, filtered to jobs you can actually take from where you live. Then track your applications. Free, no account, and no API keys needed to start.

## Features

- **Reads your CV** (PDF, text, or pasted). Skills, roles and seniority are detected locally. You can edit anything it got wrong and results re-rank instantly.
- **Location aware.** Your country is detected from your browser (and you can change it). By default you see jobs in your country plus remote jobs open to you. A toggle shows jobs outside your country too.
- **Ranked matches.** Every job gets a 0-100 score, the skills you have, and the gaps to close.
- **Live jobs** from Remote OK, Remotive, Jobicy, Himalayas, Working Nomads and Arbeitnow. Duplicates across boards are merged. Optional Jooble and Adzuna keys add local on-site jobs.
- **Free AI tools** (optional): smarter CV reading, an honest fit check, a tailored cover letter, likely interview questions with answer tips, and CV tailoring. Works with free Gemini, Groq, OpenRouter or a local Ollama.
- **Smart search**: type `react developer` (both words), `"product manager"` (exact phrase) or `-senior` (exclude). Spelling variants match (`front-end` = `frontend`, `developer` = `engineer`). Press Enter to search the job boards for anything, even outside your CV.
- **Filters**: remote only, minimum match, salary listed, posted within, location, level, source and "new since your last visit". Active filters show as removable chips and are remembered. Sort by match, newest or salary.
- **Fast**: job lists are lightweight (full descriptions load when you open a job) and feeds are cached.
- **Keyboard friendly**: `j`/`k` move between jobs, `Enter` opens, `s` saves, `x` hides, `/` searches, `?` shows help.
- **Installable**: add it to your phone or desktop home screen (it ships a web app manifest).
- **Application tracker**: Saved, Applied, Interviewing, Offer, Rejected. Drag cards between columns, add notes, set follow-up reminders, export to CSV.
- **Light and dark themes**, keyboard shortcuts (`/` to search, `Esc` to close), and a mobile layout.

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/osoba-joshua/cv-tracker.git
cd cv-tracker
npm install
npm run dev
```

Open http://localhost:3000 and upload your CV, or click **Try a sample CV**.

## Free AI setup (2 minutes, optional)

1. Copy `.env.example` to `.env` (`cp .env.example .env`, or `Copy-Item .env.example .env` in PowerShell).
2. Get a free key from **one** of these and paste it into `.env`:
   - **Google Gemini**: https://aistudio.google.com/apikey -> `GEMINI_API_KEY`
   - **Groq**: https://console.groq.com/keys -> `GROQ_API_KEY`
   - **OpenRouter**: https://openrouter.ai/keys -> `OPENROUTER_API_KEY`
   - **Ollama** (runs on your computer, fully private): install from https://ollama.com, run `ollama pull llama3.2`, then set `OLLAMA_MODEL=llama3.2`
3. Restart `npm run dev`. AI buttons appear in each job's panel.

You can set several. If one is rate limited or down, the next is tried automatically. Free tiers have daily limits, so results are remembered for the session and the AI only runs when you press a button.

**Privacy:** with AI on, your CV text and the job text are sent to the provider you chose when you press a button or upload a CV. Nothing is stored on this app's server. Without AI, nothing leaves the app except job searches. Model names and free limits change over time; override the model with `GEMINI_MODEL`, `GROQ_MODEL` or `OPENROUTER_MODEL` if a default stops working.

## Local jobs in your country

Most free job APIs only list remote work. For on-site jobs near you, add a free key:

- **Jooble** (covers Nigeria and 70+ countries): https://jooble.org/api/about -> `JOOBLE_KEY`
- **Adzuna** (UK, US, Canada, Australia, Germany, France, India, South Africa and more): https://developer.adzuna.com -> `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`

Himalayas is queried with your country, so it already returns remote jobs that accept applicants from there.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint the code |

## How it works

1. `lib/cv.ts` extracts text from the uploaded file.
2. `lib/skills.ts` and `lib/profile.ts` detect skills, roles, years and seniority.
3. `lib/jobs.ts` fetches and normalises postings from every source, removes duplicates and caches feeds for an hour.
4. `lib/geo.ts` parses where each job can be done and classifies it as local, remote-open-to-you or abroad.
5. `lib/match.ts` scores each job: skill coverage (weighted higher when a skill is in the title), breadth, title fit, seniority and a small bonus for local jobs.
6. `lib/ai.ts` and `lib/prompts.ts` talk to any OpenAI-compatible free API for the AI tools.

### API

The UI uses these JSON endpoints, so other clients (for example a mobile app) can reuse them.

| Endpoint | Body | Returns |
| --- | --- | --- |
| `POST /api/parse` | multipart field `cv`, or JSON `{ "text": "..." }` | `{ profile, text }` |
| `POST /api/search` | JSON `{ skills, titles, years, level, location: { country, city }, query? }` | `{ total, sources, localSources, results }` |
| `GET /api/job?id=...` | | `{ description }` (full text of a cached job) |
| `GET /api/ai/status` | | `{ enabled, providers }` |
| `POST /api/ai/profile` | JSON `{ text }` | `{ profile, provider }` |
| `POST /api/ai/job` | JSON `{ task: "fit" \| "cover" \| "prep" \| "tweak", cv, job, tone? }` | `{ result, provider }` |

## Job sources and attribution

Listings come from [Remote OK](https://remoteok.com), [Remotive](https://remotive.com), [Jobicy](https://jobicy.com), [Himalayas](https://himalayas.app), [Working Nomads](https://www.workingnomads.com) and [Arbeitnow](https://www.arbeitnow.com), plus [Jooble](https://jooble.org) and [Adzuna](https://www.adzuna.com) if you add keys. Their terms ask for credit and a link to the original posting, so every job links back to its source and the app names the sources. Feeds are cached for an hour to stay within rate limits. If you deploy this publicly, review each provider's current terms.

## Contributing

Issues and pull requests are welcome. Never commit real API keys.

## License

MIT, see [LICENSE](LICENSE).
