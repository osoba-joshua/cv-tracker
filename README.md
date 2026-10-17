# CV Tracker

Upload your CV (PDF or text) and get live job postings ranked by how well they fit you.

- Reads skills, roles and years of experience from your CV
- Pulls current postings from public job APIs (Remotive, Arbeitnow)
- Scores each posting against your CV and shows what matched
- Optional: add an Anthropic API key to get a one-line "why this fits" for the top results

Your CV is processed in memory and is never stored.

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/osoba-joshua/cv-tracker.git
cd cv-tracker
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

Open http://localhost:3000, upload your CV, and click **Find jobs**.

The app works with no API keys at all.

## Configuration

Edit `.env` (it is gitignored, so your keys are never committed):

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | No | Adds AI-written match explanations. Get a key at https://console.anthropic.com |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint the code |

## How it works

1. `lib/cv.ts` extracts text from the uploaded file.
2. `lib/profile.ts` detects skills, job titles and experience.
3. `lib/jobs.ts` fetches postings from the job APIs.
4. `lib/match.ts` scores and ranks them.
5. `lib/explain.ts` (optional) asks Claude why each top job fits.

The API lives at `POST /api/match` (multipart form field `cv`), so other clients such as a mobile app can use it too.

## Contributing

Issues and pull requests are welcome. Never commit real API keys.

## License

MIT, see [LICENSE](LICENSE).
