import SiteHeader from './components/SiteHeader'

const checkerHref = import.meta.env.BASE_URL

function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-hidden text-ink">
      <div className="paper-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-40 top-[-15rem] size-[32rem] rounded-full bg-sage/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-52 bottom-[-18rem] size-[38rem] rounded-full bg-coral/10 blur-3xl" />

      <SiteHeader
        action={{ href: checkerHref, label: 'Back to checker' }}
      />

      <main className="relative mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-forest">
            About TruthCheck
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-6xl">
            A pause before you share.
            <span className="mt-1 block font-serif font-normal italic text-forest">
              A closer look at what you&apos;re reading or watching.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-ink/65 sm:text-lg">
            TruthCheck is an AI-assisted starting point for assessing a claim,
            pasted article, public article link, or YouTube video. It gives you
            a concise explanation so you can decide what deserves a deeper look.
          </p>
        </section>

        <section className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
          {[
            [
              '01',
              'Bring the context',
              'Paste the exact claim, relevant article text, a public HTML article link, or a YouTube URL.',
            ],
            [
              '02',
              'Get a signal',
              'The analysis focuses on the central factual claim and returns a short reason.',
            ],
            [
              '03',
              'Keep investigating',
              'Use the result as a prompt to check primary and reputable sources yourself.',
            ],
          ].map(([number, title, copy]) => (
            <article
              key={number}
              className="rounded-[1.5rem] border border-ink/8 bg-white/50 p-5 backdrop-blur-sm"
            >
              <span className="font-mono text-xs text-forest">{number}</span>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-12 max-w-4xl rounded-[1.75rem] border border-ink/10 bg-white/75 p-6 shadow-[0_24px_80px_-36px_rgba(28,36,32,0.28)] backdrop-blur sm:p-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">
              The three verdicts
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Clear labels, honest uncertainty.
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/65 sm:text-base">
              A result is only as strong as the evidence and context available
              for the claim. That&apos;s why TruthCheck keeps uncertainty visible.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ['TRUE', 'The central claim appears clearly accurate.'],
              ['FALSE', 'The central claim appears clearly inaccurate.'],
              [
                'UNVERIFIABLE',
                'The claim is ambiguous or there is not enough evidence to establish it.',
              ],
            ].map(([verdict, explanation]) => (
              <div
                key={verdict}
                className="rounded-2xl border border-ink/8 bg-cream/70 p-4"
              >
                <p className="text-sm font-bold tracking-[0.08em] text-forest">
                  {verdict}
                </p>
                <p className="mt-2 text-sm leading-5 text-ink/60">
                  {explanation}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">
            A useful starting point, not a final answer
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Slow down for the claims that matter.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-ink/65 sm:text-base">
            AI can miss context, misread a source, or make mistakes. For
            consequential claims, open the original sources and verify the
            evidence before acting or sharing.
          </p>
          <a
            href={checkerHref}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-forest"
          >
            Check a claim
            <span aria-hidden="true">→</span>
          </a>
        </section>
      </main>

      <footer className="relative border-t border-ink/8 px-5 py-6 text-center text-xs leading-5 text-ink/45">
        TruthCheck offers an AI-assisted assessment, not a guaranteed
        fact-check.
      </footer>
    </div>
  )
}

export default AboutPage
