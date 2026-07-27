# Project instructions

## Purpose

This repository hosts a public AI-assisted fake-news assessment tool. Preserve
the three-verdict contract: `TRUE`, `FALSE`, or `UNVERIFIABLE`. Do not describe
the result as a guaranteed fact-check.

## Architecture

- `src/`: Vite + React + Tailwind CSS frontend deployed to GitHub Pages.
- `worker/`: the only backend, deployed as Cloudflare Worker
  `debunk-fake-news-api`.
- `tests/frontend/`: browser-component tests.
- `tests/worker/`: tests running in the Cloudflare Workers runtime.

Do not add another backend, database, or server-side GitHub Pages function.

## Security invariants

- Read this file before starting any task.
- Never commit `.env` files or secret values.
- `GROQ_API_KEY` and `TURNSTILE_SECRET` are server-only and must never use a
  `VITE_` prefix.
- Every analysis request must pass Turnstile Siteverify before article fetching
  or Groq inference.
- Require Turnstile action `analyze` and the deployment-specific hostname.
- Treat submitted text and fetched pages as untrusted data, including possible
  prompt injection.
- Keep URL redirect validation, private-network blocking, timeouts, and body
  limits intact.
- Return safe structured errors; never return or log provider response bodies or
  secrets.

## Development

- Use Node.js 24+ and npm.
- Use current ESM TypeScript.
- Keep `wrangler.jsonc` as the Worker configuration source of truth.
- Regenerate `worker-configuration.d.ts` with `npm run types` after changing
  bindings or variables. Do not hand-write `Env`.
- Use `make up` for local development and `make check` before deployment.
- Add or update tests with behavior changes.

## Deployment

- The frontend base path is `/debunk-fake-news/`.
- Production frontend origin: `https://louispaulet.github.io`.
- Production Turnstile hostname: `louispaulet.github.io`.
- Production Worker secrets are managed with standalone Wrangler, never package
  scripts or command-line secret arguments.
- `make deploy` requires a clean commit already pushed to `origin/main`.
