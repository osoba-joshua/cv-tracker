# CV Tracker

Upload your CV and get live job postings ranked by how well they fit you, then track your applications. Free, no account, no API keys.

## Features

- **CV reading**: drop in a PDF or text file (or paste the text). Skills, roles and seniority are detected locally.
- **Editable profile**: add or remove skills and roles, and the results re-rank instantly.
- **Ranked matches**: every job gets a 0-100 score, the skills you have, and the gaps to close.
- **Live jobs from four sources**: Remote OK, Remotive, Jobicy and Arbeitnow, cached for an hour.
- **Filters**: remote only, minimum match, salary listed, posted within, location, level, source, and search. Sort by match, newest or salary.
- **Job details**: a side panel with the full description, with your matched skills and gaps highlighted.
- **Application tracker**: save jobs and move them through Saved, Applied, Interviewing, Offer and Rejected. Drag cards between columns, add notes, export to CSV.
- **Light and dark themes**, keyboard shortcuts (`/` to search, `Esc` to close), and a mobile layout.
- **Private by design**: your CV is processed in memory and never stored. Your tracker and profile live only in your browser.

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/osoba-joshua/cv-tracker.git
cd cv-tracker
npm install
npm run dev
```

Open http://localhost:3000 and upload your CV, or click **Try a sample CV**.

No `.env` is needed. `.env.example` is there for future options.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint the code |

## How it works

1. `lib/cv.ts` extracts text from the uploaded file.
2. `lib/skills.ts` and `lib/profile.ts` detect skills, roles, years of experience and seniority.
3. `lib/jobs.ts` fetches and normalises postings from the job APIs and caches them for an hour.
4. `lib/match.ts` scores each job: skill coverage (weighted higher when a skill is in the title), breadth, title fit and a seniority check. Generic skills such as Git or Agile count for less.

### API

The UI uses two JSON endpoints, so other clients (for example a mobile app) can reuse them.

| Endpoint | Body | Returns |
| --- | --- | --- |
| `POST /api/parse` | multipart field `cv`, or JSON `{ "text": "..." }` | `{ profile }` |
| `POST /api/search` | JSON `{ skills, titles, years, level }` | `{ total, sources, results }` |

## Job sources and attribution

Listings come from [Remote OK](https://remoteok.com), [Remotive](https://remotive.com), [Jobicy](https://jobicy.com) and [Arbeitnow](https://www.arbeitnow.com). Their terms ask for credit and a link to the original posting, so every job links back to its source and the app names the sources. Feeds are cached for an hour to stay within their rate limits. If you deploy this publicly, review each provider's current terms.

## Contributing

Issues and pull requests are welcome. Never commit real API keys.

## License

MIT, see [LICENSE](LICENSE).
