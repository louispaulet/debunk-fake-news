# Debunk Fake News

A small public website that gives an AI-assisted assessment of a claim, pasted
article, public article URL, or YouTube video. It returns `TRUE`, `FALSE`, or
`UNVERIFIABLE` with a short explanation.

The frontend is a Vite + React + Tailwind CSS application hosted on GitHub
Pages. A single Cloudflare Worker validates Turnstile, safely reads submitted
article pages or retrieves YouTube captions, and calls Groq once for the verdict.

> This is an AI assessment, not an authoritative fact-check. Confirm important
> claims with primary sources and reputable fact-checkers.

## Architecture

```text
GitHub Pages (React)
        |
        | detect YouTube URL + POST /api/analyze + Turnstile token
        v
Cloudflare Worker
   |
   +--> public article page ---------+
   |                                 |
   +--> YouTube caption transcript --+--> random chunk sampling (if long)
                                             |
                                             +--> Groq: verdict + reason only
```

Production:

- Frontend: <https://louispaulet.github.io/debunk-fake-news/>
- API: <https://debunk-fake-news-api.louispaulet13.workers.dev>
- Worker name: `debunk-fake-news-api`

## Requirements

- Node.js 24 or newer
- npm
- GNU Make
- Wrangler 4
- GitHub CLI (`gh`) for frontend deployment
- A Groq API key

## Local setup

Install dependencies:

```bash
npm install
```

Create `.env` from the example and fill in the values:

```bash
cp .env.example .env
```

The file contains:

```dotenv
GROQ_API_KEY=...
TURNSTILE_SECRET=...
VITE_API_URL=http://localhost:8787
VITE_TURNSTILE_SITEKEY=...
```

`GROQ_API_KEY` and `TURNSTILE_SECRET` are server-only. They must never use a
`VITE_` prefix because Vite intentionally exposes such variables to browser
code.

Run the frontend and Worker together:

```bash
make up
```

The frontend runs at <http://localhost:5173/debunk-fake-news/> and proxies API
requests to the Worker at <http://localhost:8787>.

## API

### `POST /api/analyze`

Request:

```json
{
  "content": "A claim, article text, one exact public URL, or one exact YouTube URL",
  "turnstileToken": "single-use-token",
  "youtubeVideoId": "optional 11-character ID detected from an exact YouTube URL"
}
```

The frontend includes `youtubeVideoId` only for recognized `youtube.com` or
`youtu.be` video URLs. The Worker validates that the ID matches `content`, then
uses the dependency-free `youtube-transcript` package to retrieve available
captions without a paid YouTube API or an LLM call. Videos without accessible
captions return a structured error.

Success:

```json
{
  "verdict": "TRUE",
  "reason": "A concise explanation of the assessment."
}
```

The verdict is one of `TRUE`, `FALSE`, or `UNVERIFIABLE`. Errors use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "A safe user-facing message."
  }
}
```

### `GET /health`

Returns the Worker status and configured model without exposing credentials.

## Commands

```bash
make help             # List targets
make up               # Start frontend and Worker
make test             # Run frontend and Worker tests
make lint             # Run ESLint
make typecheck        # Check TypeScript and Worker bindings
make build            # Build frontend and dry-run Worker bundle
make check            # Run every local quality gate
make deploy-worker    # Deploy the Worker
make deploy-frontend  # Deploy GitHub Pages through Actions
make deploy           # Check and deploy both
make tail             # Stream Worker logs
make clean            # Remove generated local artifacts
```

## Deployment

### One-time Worker secrets

Set production secrets with the standalone Wrangler CLI:

```bash
wrangler secret put GROQ_API_KEY
wrangler secret put TURNSTILE_SECRET
```

Do not put secrets in `wrangler.jsonc`.

### GitHub Pages variables

The Pages workflow expects these repository variables:

- `VITE_API_URL`: the deployed Worker origin
- `VITE_TURNSTILE_SITEKEY`: the public Turnstile sitekey

GitHub Pages must use **GitHub Actions** as its build source. After the source
commit is pushed to `main`, `make deploy` deploys the Worker and dispatches the
Pages workflow.

## Security and limits

- Turnstile is verified server-side and tokens are single-use.
- Production verifies action `analyze` and hostname `louispaulet.github.io`.
- The production CORS allowlist contains only `https://louispaulet.github.io`.
- URL submissions allow public HTTP(S) article pages only.
- Redirects are revalidated; local/private targets and unusual ports are
  rejected.
- Article downloads are limited to 512 KiB. Each YouTube response is limited to
  2 MiB, must remain on an HTTPS `youtube.com` host, and has a timeout.
- YouTube transcript retrieval happens only after successful Turnstile
  verification.
- Article text, captions, and user content are explicitly treated as untrusted
  data in the model prompt.
- There is no account system, database, claim history, or live web search.

## Long articles and transcripts

The model-input budget is 20,000 characters. Longer article text and YouTube
transcripts are split into roughly 1,800-character chunks. The Worker randomly
selects whole chunks that fit the budget and then restores those excerpts to
their original source order. This avoids always judging only the beginning of a
long source.

This preparation is deterministic code except for the random selection. It
does not use an LLM to detect URLs, retrieve transcripts, choose chunks, or
summarize content. The only LLM request produces the `TRUE`, `FALSE`, or
`UNVERIFIABLE` assessment and its reason.

The Worker unit tests cover the YouTube flow with
`https://www.youtube.com/watch?v=_neA7v3ulPU`, including Turnstile-first request
ordering and long-transcript sampling.

The Groq key originally used to bootstrap this repository was shared through a
chat. Rotate it after initial deployment, then update both the ignored `.env`
file and the Worker secret.

## Model

The application uses `openai/gpt-oss-20b` through Groq. The model ID is kept in
`wrangler.jsonc` so it can be updated without changing application logic.
