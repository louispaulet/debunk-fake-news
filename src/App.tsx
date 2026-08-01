import { useCallback, useRef, useState, type FormEvent } from 'react'
import { analyzeEndpoint, turnstileSitekey } from './config'
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from './components/TurnstileWidget'
import SiteHeader from './components/SiteHeader'
import type { AnalysisResult, ApiErrorBody, Verdict } from './types'

const MAX_CONTENT_LENGTH = 20_000

const verdictPresentation: Record<
  Verdict,
  { eyebrow: string; symbol: string; panel: string; badge: string }
> = {
  TRUE: {
    eyebrow: 'Likely accurate',
    symbol: '✓',
    panel: 'border-emerald-200 bg-emerald-50/80',
    badge: 'bg-emerald-700 text-white',
  },
  FALSE: {
    eyebrow: 'Likely inaccurate',
    symbol: '×',
    panel: 'border-rose-200 bg-rose-50/80',
    badge: 'bg-rose-700 text-white',
  },
  UNVERIFIABLE: {
    eyebrow: 'Not enough evidence',
    symbol: '?',
    panel: 'border-amber-200 bg-amber-50/80',
    badge: 'bg-amber-700 text-white',
  },
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<AnalysisResult>
  return (
    (candidate.verdict === 'TRUE' ||
      candidate.verdict === 'FALSE' ||
      candidate.verdict === 'UNVERIFIABLE') &&
    typeof candidate.reason === 'string'
  )
}

function App() {
  const [content, setContent] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileError, setTurnstileError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)

  const handleToken = useCallback((token: string | null) => {
    setTurnstileToken(token)
  }, [])

  const handleTurnstileError = useCallback((message: string | null) => {
    setTurnstileError(message)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedContent = content.trim()

    if (normalizedContent.length < 3) {
      setError('Enter a claim, article, or article link first.')
      return
    }

    if (!turnstileToken) {
      setError('Complete the human check before analyzing.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(analyzeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: normalizedContent,
          turnstileToken,
        }),
      })

      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const apiError = payload as ApiErrorBody | null
        throw new Error(
          apiError?.error?.message ??
            'The analysis service is unavailable. Please try again.',
        )
      }

      if (!isAnalysisResult(payload)) {
        throw new Error('The analysis service returned an unexpected response.')
      }

      setResult(payload)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
      setTurnstileToken(null)
      turnstileRef.current?.reset()
    }
  }

  const remainingCharacters = MAX_CONTENT_LENGTH - content.length
  const presentation = result
    ? verdictPresentation[result.verdict]
    : undefined

  return (
    <div className="relative min-h-screen overflow-hidden text-ink">
      <div className="paper-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-40 top-[-15rem] size-[32rem] rounded-full bg-sage/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-52 bottom-[-18rem] size-[38rem] rounded-full bg-coral/10 blur-3xl" />

      <SiteHeader
        action={{
          href: `${import.meta.env.BASE_URL}about.html`,
          label: 'About TruthCheck',
        }}
      />

      <main className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pt-14">
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-forest">
            Pause before you share
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-6xl">
            Is that story true?
            <span className="mt-1 block font-serif font-normal italic text-forest">
              Let&apos;s look closer.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-ink/65 sm:text-lg">
            Paste a claim, article, or public link. We&apos;ll give you a quick
            assessment and explain the reasoning.
          </p>
        </section>

        <section className="mx-auto mt-10 max-w-3xl sm:mt-12">
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="rounded-[1.75rem] border border-ink/10 bg-white/80 p-3 shadow-[0_24px_80px_-36px_rgba(28,36,32,0.38)] backdrop-blur sm:p-4"
          >
            <label htmlFor="content" className="sr-only">
              Claim, article, or public article URL
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(event) => {
                setContent(event.target.value)
                setError(null)
              }}
              minLength={3}
              maxLength={MAX_CONTENT_LENGTH}
              rows={8}
              placeholder="Paste a claim, article, or link here…"
              className="min-h-48 w-full resize-y rounded-2xl border-0 bg-transparent px-4 py-4 text-base leading-7 text-ink outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-forest/30 sm:px-5"
            />

            <div className="flex flex-col gap-4 border-t border-ink/8 px-3 pb-2 pt-4 sm:px-4">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <TurnstileWidget
                  ref={turnstileRef}
                  sitekey={turnstileSitekey}
                  onToken={handleToken}
                  onError={handleTurnstileError}
                />
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    content.trim().length < 3 ||
                    !turnstileToken
                  }
                  className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-forest disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                      Checking…
                    </>
                  ) : (
                    <>
                      Analyze claim
                      <span
                        aria-hidden="true"
                        className="transition-transform group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink/45">
                <span>Links must point to a public HTML article.</span>
                <span
                  className={remainingCharacters < 500 ? 'text-rose-700' : ''}
                >
                  {remainingCharacters.toLocaleString()} characters left
                </span>
              </div>
            </div>
          </form>

          <div aria-live="polite" aria-atomic="true">
            {(error ?? turnstileError) && (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-900"
              >
                {error ?? turnstileError}
              </div>
            )}

            {result && presentation && (
              <article
                className={`result-enter mt-6 rounded-[1.75rem] border p-6 shadow-sm sm:p-8 ${presentation.panel}`}
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div
                    className={`grid size-14 shrink-0 place-items-center rounded-2xl text-2xl font-semibold shadow-sm ${presentation.badge}`}
                    aria-hidden="true"
                  >
                    {presentation.symbol}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/50">
                      {presentation.eyebrow}
                    </p>
                    <h2 className="mt-1.5 text-3xl font-semibold tracking-tight">
                      {result.verdict}
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-ink/75">
                      {result.reason}
                    </p>
                  </div>
                </div>
              </article>
            )}
          </div>
        </section>

        <section className="mx-auto mt-12 grid max-w-3xl gap-3 text-sm text-ink/60 sm:grid-cols-3">
          {[
            ['01', 'Submit', 'Paste the exact claim or its source article.'],
            ['02', 'Assess', 'The model checks clarity and available evidence.'],
            ['03', 'Verify', 'Use the explanation to investigate further.'],
          ].map(([number, title, copy]) => (
            <div
              key={number}
              className="rounded-2xl border border-ink/8 bg-white/35 p-4 backdrop-blur-sm"
            >
              <span className="font-mono text-xs text-forest">{number}</span>
              <h3 className="mt-2 font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 leading-5">{copy}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative border-t border-ink/8 px-5 py-6 text-center text-xs leading-5 text-ink/45">
        AI can make mistakes. Verify consequential claims with primary and
        reputable sources.
      </footer>
    </div>
  )
}

export default App
