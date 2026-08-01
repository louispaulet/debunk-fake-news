type SiteHeaderProps = {
  action: {
    href: string
    label: string
  }
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="size-5"
    >
      <path
        d="M12 3 5.5 5.8v5.5c0 4.2 2.7 8 6.5 9.7 3.8-1.7 6.5-5.5 6.5-9.7V5.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9.1 12 1.9 1.9 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SiteHeader({ action }: SiteHeaderProps) {
  return (
    <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
      <a
        href={import.meta.env.BASE_URL}
        className="flex items-center gap-2.5 font-semibold tracking-tight"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-ink text-cream shadow-sm">
          <ShieldIcon />
        </span>
        <span>TruthCheck</span>
      </a>
      <a
        href={action.href}
        className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/55 px-3.5 py-2 text-sm font-semibold text-ink shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-forest/25 hover:text-forest"
      >
        {action.label}
        <span aria-hidden="true">→</span>
      </a>
    </header>
  )
}

export default SiteHeader
