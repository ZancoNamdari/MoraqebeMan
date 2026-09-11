import { notFound } from "next/navigation"
import Link from "next/link"
import { ARTICLES } from "@/lib/articles-data"

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }))
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = ARTICLES.find((a) => a.slug === params.slug)
  if (!article) notFound()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <HexIcon className="h-9 w-9 shrink-0 text-primary-strong" />
            <span className="text-base font-bold text-foreground">مراقب من</span>
          </Link>
          <Link href="/#articles" className="text-sm text-muted-foreground hover:text-foreground">
            بازگشت به مطالب
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
        <div
          className={`mb-8 flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${article.accentFrom} ${article.accentTo}`}
        >
          <HexIcon className="h-20 w-20 text-foreground/20" />
        </div>

        <h1 className="text-2xl font-extrabold leading-relaxed text-foreground sm:text-3xl">
          {article.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {article.summary}
        </p>

        <div className="mt-8 space-y-5 text-base leading-8 text-foreground/90">
          {article.body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </article>

      <footer className="border-t border-deep-border bg-deep">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Link href="/" className="flex items-center gap-2.5">
              <HexIcon className="h-7 w-7 text-deep-foreground/80" />
              <span className="text-sm font-semibold text-deep-foreground">مراقب من</span>
            </Link>
            <p className="text-sm text-deep-muted">پلتفرم تطبیق مراقب و سالمند — بر پایهٔ سازگاری واقعی</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function HexIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 46" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 1 38 12v22L20 45 2 34V12Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  )
}
